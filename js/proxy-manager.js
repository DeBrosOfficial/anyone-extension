/* ANyONe Extension v2 - Proxy Manager */

import { CONFIG } from './config.js';
import { Utils } from './utils.js';
import { Storage } from './storage.js';

const ProxyManager = {
  // Current state
  _currentProxy: null,
  _isEnabled: false,
  _proxyList: [],
  _currentIndex: 0,

  /**
   * Initialize proxy manager
   */
  async init() {
    Utils.log('info', 'Initializing ProxyManager');

    // Load state from storage
    const [enabled, proxyList, currentProxy] = await Promise.all([
      Storage.isProxyEnabled(),
      Storage.getProxyList(),
      Storage.getCurrentProxy()
    ]);

    this._isEnabled = enabled;
    this._proxyList = proxyList;
    this._currentProxy = currentProxy;

    Utils.log('info', 'ProxyManager initialized', {
      enabled,
      proxyCount: proxyList.length
    });
  },

  /**
   * Create SOCKS5 proxy configuration
   * @param {string} host - Proxy host
   * @param {number} port - Proxy port
   * @param {string[]} exceptions - Bypass list
   * @param {boolean} bypassLocal - Allow local network access
   * @returns {object}
   */
  createProxyConfig(host, port, exceptions = [], bypassLocal = true) {
    // Always include localhost and 127.0.0.1
    let bypassList = exceptions.concat(['localhost', '127.0.0.1']);

    // Add local network ranges if local network access is enabled
    if (bypassLocal) {
      bypassList.push(
        '<local>',           // Simple hostnames (no dots)
        '10.*',              // Class A private network
        '172.16.*',          // Class B private (172.16.0.0 - 172.31.255.255)
        '172.17.*',
        '172.18.*',
        '172.19.*',
        '172.20.*',
        '172.21.*',
        '172.22.*',
        '172.23.*',
        '172.24.*',
        '172.25.*',
        '172.26.*',
        '172.27.*',
        '172.28.*',
        '172.29.*',
        '172.30.*',
        '172.31.*',
        '192.168.*',         // Class C private network
        '169.254.*',         // Link-local
        '*.local'            // mDNS/Bonjour domains (.local TLD)
      );
    }

    Utils.log('info', 'Creating proxy config', { host, port, bypassList, bypassLocal });
    return {
      mode: 'fixed_servers',
      rules: {
        singleProxy: {
          scheme: 'socks5',
          host: host,
          port: parseInt(port, 10)
        },
        bypassList: bypassList
      }
    };
  },

  /**
   * Apply proxy settings
   * @param {string} host - Proxy host
   * @param {number} port - Proxy port
   * @param {string[]} exceptions - Bypass list
   * @param {boolean} bypassLocal - Allow local network access
   * @returns {Promise<boolean>}
   */
  async applyProxy(host, port, exceptions = [], bypassLocal = true) {
    return new Promise((resolve) => {
      const config = this.createProxyConfig(host, port, exceptions, bypassLocal);

      chrome.proxy.settings.set({ value: config, scope: 'regular' }, () => {
        if (chrome.runtime.lastError) {
          Utils.log('error', 'Failed to apply proxy', chrome.runtime.lastError);
          resolve(false);
        } else {
          Utils.log('info', `Proxy applied: ${host}:${port}`);
          this._currentProxy = { host, port };
          this._isEnabled = true;
          resolve(true);
        }
      });
    });
  },

  /**
   * Clear proxy settings
   * @returns {Promise<boolean>}
   */
  async clearProxy() {
    return new Promise((resolve) => {
      chrome.proxy.settings.clear({}, () => {
        if (chrome.runtime.lastError) {
          Utils.log('error', 'Failed to clear proxy', chrome.runtime.lastError);
          resolve(false);
        } else {
          Utils.log('info', 'Proxy cleared');
          this._currentProxy = null;
          this._isEnabled = false;
          this._currentIndex = 0;
          resolve(true);
        }
      });
    });
  },

  /**
   * Test proxy connectivity
   * @param {object} proxy - Proxy object {host, port}
   * @returns {Promise<{working: boolean, latency: number|null}>}
   */
  async testProxy(proxy) {
    Utils.log('debug', `Testing proxy ${proxy.host}:${proxy.port}`);

    // First, set the proxy
    const config = this.createProxyConfig(proxy.host, proxy.port);

    return new Promise((resolve) => {
      chrome.proxy.settings.set({ value: config, scope: 'regular' }, async () => {
        if (chrome.runtime.lastError) {
          Utils.log('error', 'Failed to set proxy for test', chrome.runtime.lastError);
          resolve({ working: false, latency: null });
          return;
        }

        // Longer delay to ensure proxy settings are applied
        await new Promise(r => setTimeout(r, 300));

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUTS.PROXY_CHECK);

          // Measure latency only for the actual request
          const startTime = Date.now();

          // Use HEAD request with cache disabled for reliable test
          const response = await fetch(CONFIG.URLS.CHECK_IP, {
            method: 'HEAD',
            cache: 'no-store',
            signal: controller.signal
          });

          const latency = Date.now() - startTime;
          clearTimeout(timeoutId);

          if (response.ok || response.type === 'opaque') {
            Utils.log('debug', `Proxy ${proxy.host}:${proxy.port} working, latency: ${latency}ms`);
            resolve({ working: true, latency });
          } else {
            Utils.log('debug', `Proxy ${proxy.host}:${proxy.port} returned ${response.status}`);
            // Clear proxy settings on failure
            chrome.proxy.settings.clear({});
            resolve({ working: false, latency: null });
          }
        } catch (error) {
          Utils.log('debug', `Proxy ${proxy.host}:${proxy.port} failed: ${error.name} - ${error.message}`);
          // Clear proxy settings on failure
          chrome.proxy.settings.clear({});
          resolve({ working: false, latency: null });
        }
      });
    });
  },

  /**
   * Test multiple proxies in parallel
   * @param {object[]} proxies - Array of proxy objects
   * @param {number} concurrency - Max concurrent tests
   * @returns {Promise<object[]>}
   */
  async testProxiesParallel(proxies, concurrency = 5) {
    const results = [];
    const chunks = [];

    // Split into chunks
    for (let i = 0; i < proxies.length; i += concurrency) {
      chunks.push(proxies.slice(i, i + concurrency));
    }

    // Process chunks sequentially, proxies within chunk in parallel
    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(async (proxy) => {
          const result = await this.testProxy(proxy);
          return { ...proxy, ...result };
        })
      );
      results.push(...chunkResults);
    }

    return results;
  },

  /**
   * Find and connect to fastest working proxy
   * @param {string} country - Country filter (optional)
   * @param {boolean} bypassLocal - Allow local network access
   * @param {string[]} exceptions - Bypass list
   * @returns {Promise<{success: boolean, proxy: object|null, error: string|null}>}
   */
  async connectToFastest(country = null, bypassLocal = true, exceptions = []) {
    Utils.log('info', 'Finding fastest proxy', { country, exceptions });

    let proxies = this._proxyList;

    // Test proxies in parallel
    const results = await this.testProxiesParallel(proxies);

    // Filter working proxies and sort by latency
    const working = results
      .filter(p => p.working)
      .sort((a, b) => a.latency - b.latency);

    if (working.length === 0) {
      return { success: false, proxy: null, error: 'No working proxies found' };
    }

    // Connect to fastest
    const fastest = working[0];
    const applied = await this.applyProxy(fastest.host, fastest.port, exceptions, bypassLocal);

    if (applied) {
      await Storage.setCurrentProxy(fastest);
      await Storage.setProxyEnabled(true);
      return { success: true, proxy: fastest, error: null };
    }

    return { success: false, proxy: null, error: 'Failed to apply proxy settings' };
  },

  /**
   * Connect using custom proxy
   * @param {string} ip - Proxy IP
   * @param {number} port - Proxy port
   * @param {string[]} exceptions - Bypass list
   * @param {boolean} bypassLocal - Allow local network access
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  async connectCustom(ip, port, exceptions = [], bypassLocal = true) {
    // Validate
    const validation = Utils.validateProxy(ip, port);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Test connection
    const testResult = await this.testProxy({ host: ip, port });
    if (!testResult.working) {
      return { success: false, error: 'Proxy is not responding' };
    }

    // Apply
    const applied = await this.applyProxy(ip, port, exceptions, bypassLocal);
    if (applied) {
      const proxy = { host: ip, port, type: 'custom' };
      // Get existing credentials to preserve them when updating storage
      const existingProxy = await Storage.getCustomProxy();
      await Storage.setCustomProxy(ip, port, exceptions, existingProxy.username, existingProxy.password);
      await Storage.setCurrentProxy(proxy);
      await Storage.setProxyEnabled(true);
      return { success: true, proxy, error: null };
    }

    return { success: false, proxy: null, error: 'Failed to apply proxy settings' };
  },

  /**
   * Disconnect proxy
   * @returns {Promise<boolean>}
   */
  async disconnect() {
    const cleared = await this.clearProxy();
    if (cleared) {
      await Storage.setProxyEnabled(false);
      await Storage.setCurrentProxy(null);
    }
    return cleared;
  },

  /**
   * Fetch proxy list from source with fallback
   * @param {string} source - Source key from CONFIG.PROXY_SOURCES
   * @returns {Promise<{success: boolean, proxies: object[], error: string|null, usedSource: string|null}>}
   */
  async fetchProxyList(source = 'arweave') {
    // Define fallback order
    const fallbackOrder = ['arweave', 'git', 'github'];

    // Start with the requested source, then try others
    const sourcesToTry = [source, ...fallbackOrder.filter(s => s !== source)];

    for (const currentSource of sourcesToTry) {
      const sourceConfig = CONFIG.PROXY_SOURCES[currentSource];
      if (!sourceConfig) continue;

      Utils.log('info', `Fetching proxies from ${currentSource}`);

      try {
        const response = await Utils.fetchWithTimeout(
          sourceConfig.url,
          {},
          CONFIG.TIMEOUTS.FETCH
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        // Normalize data format
        let proxies = Array.isArray(data) ? data : data.proxies || [];

        // Ensure each proxy has required fields
        proxies = proxies.map(p => ({
          host: p.host || p.ip,
          port: parseInt(p.port, 10),
          country: p.country || null,
          country_name: p.country_name || null,
          city: p.city || null,
          latency: null
        }));

        this._proxyList = proxies;
        await Storage.setProxyList(proxies);

        if (currentSource !== source) {
          Utils.log('info', `Fallback: fetched ${proxies.length} proxies from ${currentSource} (${source} failed)`);
        } else {
          Utils.log('info', `Fetched ${proxies.length} proxies from ${currentSource}`);
        }

        return { success: true, proxies, error: null, usedSource: currentSource };

      } catch (error) {
        Utils.log('warn', `Failed to fetch from ${currentSource}: ${error.message}`);
        // Continue to next source
      }
    }

    // All sources failed
    Utils.log('error', 'All proxy sources failed');
    return { success: false, proxies: [], error: 'All proxy sources failed', usedSource: null };
  },

  /**
   * Fallback to next proxy
   * @returns {Promise<{success: boolean, proxy: object|null, error: string|null}>}
   */
  async fallbackToNext() {
    if (this._proxyList.length === 0) {
      return { success: false, proxy: null, error: 'No proxies available. Please refresh the proxy list.' };
    }

    if (this._proxyList.length === 1) {
      return { success: false, proxy: null, error: 'Only one proxy available' };
    }

    this._currentIndex = (this._currentIndex + 1) % this._proxyList.length;
    const proxy = this._proxyList[this._currentIndex];

    Utils.log('info', `Switching to proxy ${this._currentIndex + 1}/${this._proxyList.length}: ${proxy.host}:${proxy.port}`);

    // Test the proxy first to get latency
    const testResult = await this.testProxy(proxy);
    if (!testResult.working) {
      // Try next proxy if this one doesn't work
      Utils.log('warn', `Proxy ${proxy.host}:${proxy.port} not working, trying next...`);
      return this.fallbackToNext();
    }

    // Merge test results (latency) with proxy info
    const proxyWithLatency = { ...proxy, latency: testResult.latency };

    // Get bypass local setting and exceptions
    const bypassLocal = await Storage.getValue(CONFIG.STORAGE_KEYS.BYPASS_LOCAL, true);
    const exceptions = await Storage.getValue(CONFIG.STORAGE_KEYS.EXCEPTIONS, []);

    const applied = await this.applyProxy(proxy.host, proxy.port, exceptions, bypassLocal);
    if (applied) {
      await Storage.setCurrentProxy(proxyWithLatency);
      return { success: true, proxy: proxyWithLatency, error: null };
    }

    return { success: false, proxy: null, error: 'Failed to apply proxy settings' };
  },

  /**
   * Get current status
   * @returns {object}
   */
  getStatus() {
    return {
      enabled: this._isEnabled,
      currentProxy: this._currentProxy,
      proxyCount: this._proxyList.length
    };
  }
};

// ES Module export
export { ProxyManager };
