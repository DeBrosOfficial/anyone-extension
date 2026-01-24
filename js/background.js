/* ANyONe Extension v2 - Background Service Worker */

// ES Module imports
import { CONFIG } from './config.js';
import { Utils } from './utils.js';
import { Storage } from './storage.js';
import { ProxyManager } from './proxy-manager.js';

// ============================================
// Initialization
// ============================================

Utils.log('info', 'Background service worker starting...');

// Initialize on startup
chrome.runtime.onInstalled.addListener(async (details) => {
  Utils.log('info', `Extension ${details.reason}`, { version: CONFIG.VERSION });

  if (details.reason === 'install') {
    // First install
    Utils.log('info', 'First install, setting up defaults...');

    // Set defaults
    await Storage.set({
      [CONFIG.STORAGE_KEYS.MODE]: CONFIG.DEFAULTS.MODE,
      [CONFIG.STORAGE_KEYS.PROXY_ENABLED]: false,
      [CONFIG.STORAGE_KEYS.AUTO_CONNECT]: CONFIG.DEFAULTS.AUTO_CONNECT,
      [CONFIG.STORAGE_KEYS.WEBRTC_PROTECTION]: CONFIG.DEFAULTS.WEBRTC_PROTECTION,
      [CONFIG.STORAGE_KEYS.BYPASS_LOCAL]: CONFIG.DEFAULTS.BYPASS_LOCAL
    });

    // Auto-fetch proxies on first install
    Utils.log('info', 'Fetching initial proxy list...');
    try {
      const source = CONFIG.DEFAULTS.PROXY_SOURCE;
      await handleFetchProxies(source);
      Utils.log('info', 'Initial proxy list fetched successfully');
    } catch (error) {
      Utils.log('error', 'Failed to fetch initial proxy list', error);
    }
  } else if (details.reason === 'update') {
    Utils.log('info', 'Extension updated');
  }
});

// Load state on startup
chrome.runtime.onStartup.addListener(async () => {
  Utils.log('info', 'Browser startup');
  await ProxyManager.init();

  // Check auto-connect setting
  const autoConnect = await Storage.getValue(CONFIG.STORAGE_KEYS.AUTO_CONNECT, false);
  if (autoConnect) {
    Utils.log('info', 'Auto-connect enabled, connecting...');
    const mode = await Storage.getMode();
    await handleConnect(mode);
  }
});

// ============================================
// Message Handlers
// ============================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  Utils.log('debug', 'Message received', message);

  // Handle async responses
  handleMessage(message, sender)
    .then(response => sendResponse(response))
    .catch(error => {
      Utils.log('error', 'Message handler error', error);
      sendResponse({ success: false, error: error.message });
    });

  return true; // Keep channel open for async response
});

/**
 * Handle incoming messages
 * @param {object} message - Message object
 * @param {object} sender - Sender info
 * @returns {Promise<object>}
 */
async function handleMessage(message, sender) {
  switch (message.action) {
    // ============================================
    // Connection Actions
    // ============================================

    case 'connect':
      return handleConnect(message.mode, message.options);

    case 'disconnect':
      return handleDisconnect();

    case 'getStatus':
      return handleGetStatus();

    // ============================================
    // Proxy List Actions
    // ============================================

    case 'fetchProxies':
      return handleFetchProxies(message.source);

    case 'getProxyList':
      return handleGetProxyList();

    case 'testProxy':
      return handleTestProxy(message.proxy);

    // ============================================
    // Settings Actions
    // ============================================

    case 'getSettings':
      return handleGetSettings();

    case 'saveSettings':
      return handleSaveSettings(message.settings);

    case 'clearCustomProxy':
      return handleClearCustomProxy();

    case 'setMode':
      return handleSetMode(message.mode);

    case 'nextProxy':
      return handleNextProxy();

    // ============================================
    // Utility Actions
    // ============================================

    case 'openOptions':
      chrome.runtime.openOptionsPage();
      return { success: true };

    case 'openUrl':
      chrome.tabs.create({ url: message.url });
      return { success: true };

    default:
      Utils.log('warn', 'Unknown action', message.action);
      return { success: false, error: 'Unknown action' };
  }
}

// ============================================
// Action Handlers
// ============================================

/**
 * Handle connect action
 * @param {string} mode - Connection mode
 * @param {object} options - Additional options
 * @returns {Promise<object>}
 */
async function handleConnect(mode, options = {}) {
  Utils.log('info', 'Connecting', { mode, options });

  // Deactivate kill switch if it was active
  const killSwitchActive = await Storage.getValue('killSwitchActive', false);
  if (killSwitchActive) {
    await applyKillSwitch(false);
    Utils.log('info', 'Kill switch deactivated for new connection');
  }

  // Notify popup of loading state
  broadcastMessage({ action: 'statusUpdate', status: 'connecting' });

  // Get local network access setting and exceptions (bypass list)
  const bypassLocal = await Storage.getValue(CONFIG.STORAGE_KEYS.BYPASS_LOCAL, true);
  const exceptions = await Storage.getValue(CONFIG.STORAGE_KEYS.EXCEPTIONS, []);

  let result;

  switch (mode) {
    case CONFIG.MODES.PUBLIC:
      await ProxyManager.init();
      result = await ProxyManager.connectToFastest(options.country, bypassLocal, exceptions);
      break;

    case CONFIG.MODES.CUSTOM:
      const customProxy = await Storage.getCustomProxy();
      Utils.log('info', 'Custom proxy settings loaded', {
        ip: customProxy.ip,
        port: customProxy.port,
        exceptions: customProxy.exceptions,
        bypassLocal
      });
      if (!customProxy.ip || !customProxy.port) {
        result = { success: false, error: 'Custom proxy not configured' };
      } else {
        result = await ProxyManager.connectCustom(
          customProxy.ip,
          customProxy.port,
          customProxy.exceptions,
          bypassLocal
        );
      }
      break;

    default:
      result = { success: false, error: 'Invalid mode' };
  }

  if (result.success) {
    await Storage.setMode(mode);
    await Storage.setProxyEnabled(true);
    broadcastMessage({
      action: 'statusUpdate',
      status: 'connected',
      proxy: result.proxy,
      mode
    });
  } else {
    broadcastMessage({
      action: 'statusUpdate',
      status: 'error',
      error: result.error
    });
  }

  return result;
}

/**
 * Handle disconnect action
 * @returns {Promise<object>}
 */
async function handleDisconnect() {
  Utils.log('info', 'Disconnecting');

  // Check if kill switch should be activated
  const killSwitch = await Storage.getValue(CONFIG.STORAGE_KEYS.KILL_SWITCH, false);

  const success = await ProxyManager.disconnect();

  // If kill switch is enabled, block traffic after disconnect
  if (killSwitch) {
    await applyKillSwitch(true);
    broadcastMessage({
      action: 'statusUpdate',
      status: 'blocked',
      message: 'Kill Switch active - all traffic blocked'
    });
  } else {
    broadcastMessage({
      action: 'statusUpdate',
      status: success ? 'disconnected' : 'error'
    });
  }

  await Storage.setProxyEnabled(false);
  return { success };
}

/**
 * Handle get status action
 * @returns {Promise<object>}
 */
async function handleGetStatus() {
  const [enabled, mode, currentProxy, killSwitchActive] = await Promise.all([
    Storage.isProxyEnabled(),
    Storage.getMode(),
    Storage.getCurrentProxy(),
    Storage.getValue('killSwitchActive', false)
  ]);

  return {
    success: true,
    enabled,
    mode,
    currentProxy,
    killSwitchActive
  };
}

/**
 * Handle next proxy action (load balancing)
 * @returns {Promise<object>}
 */
async function handleNextProxy() {
  Utils.log('info', 'Switching to next proxy');
  await ProxyManager.init();

  // Check if proxy list is empty and fetch if needed
  const status = ProxyManager.getStatus();
  if (status.proxyCount === 0) {
    Utils.log('info', 'Proxy list empty, fetching first...');
    const source = await Storage.getValue(CONFIG.STORAGE_KEYS.PROXY_SOURCE, 'git');
    const fetchResult = await ProxyManager.fetchProxyList(source);
    if (!fetchResult.success || fetchResult.proxies.length === 0) {
      return { success: false, error: 'Failed to fetch proxy list' };
    }
  }

  const result = await ProxyManager.fallbackToNext();

  if (result.success) {
    broadcastMessage({
      action: 'statusUpdate',
      status: 'connected',
      proxy: result.proxy
    });
  }

  return result;
}

/**
 * Handle fetch proxies action
 * @param {string} source - Proxy source
 * @returns {Promise<object>}
 */
async function handleFetchProxies(source = 'arweave') {
  const result = await ProxyManager.fetchProxyList(source);

  if (result.success) {
    broadcastMessage({
      action: 'proxiesUpdated',
      count: result.proxies.length,
      usedSource: result.usedSource
    });
  }

  return result;
}

/**
 * Handle get proxy list action
 * @returns {Promise<object>}
 */
async function handleGetProxyList() {
  const proxyList = await Storage.getProxyList();
  const lastUpdate = await Storage.getLastUpdate();

  return {
    success: true,
    proxies: proxyList,
    lastUpdate,
    count: proxyList.length
  };
}

/**
 * Handle test proxy action
 * @param {object} proxy - Proxy to test
 * @returns {Promise<object>}
 */
async function handleTestProxy(proxy) {
  const result = await ProxyManager.testProxy(proxy);
  return { success: true, ...result };
}

/**
 * Handle get settings action
 * @returns {Promise<object>}
 */
async function handleGetSettings() {
  const settings = await Storage.getAllSettings();
  return { success: true, settings };
}

/**
 * Handle save settings action
 * @param {object} settings - Settings to save
 * @returns {Promise<object>}
 */
async function handleSaveSettings(settings) {
  try {
    await Storage.set(settings);

    // Apply WebRTC protection if changed
    if (settings.webrtcProtection !== undefined) {
      await applyWebRTCProtection(settings.webrtcProtection);
    }

    // Apply Kill Switch if changed
    if (settings.killSwitch !== undefined) {
      const proxyEnabled = await Storage.isProxyEnabled();

      if (settings.killSwitch && !proxyEnabled) {
        // Kill switch enabled while not connected - block traffic
        await applyKillSwitch(true);
        broadcastMessage({
          action: 'statusUpdate',
          status: 'blocked',
          message: 'Kill Switch active - connect to unblock'
        });
      } else if (!settings.killSwitch) {
        // Kill switch disabled - restore normal traffic
        const killSwitchActive = await Storage.getValue('killSwitchActive', false);
        if (killSwitchActive) {
          await applyKillSwitch(false);
          broadcastMessage({
            action: 'statusUpdate',
            status: 'disconnected'
          });
        }
      }
    }

    // Check if custom proxy connection settings changed (IP, port, credentials)
    const customProxyConnectionChanged =
      settings.proxyIP !== undefined ||
      settings.proxyPort !== undefined ||
      settings.proxyUsername !== undefined ||
      settings.proxyPassword !== undefined;

    // Check if bypass settings changed (applies to both public and custom modes)
    const bypassSettingsChanged =
      settings.bypassLocal !== undefined ||
      settings.noProxyFor !== undefined;

    // Handle custom proxy connection changes (only affects custom mode)
    if (customProxyConnectionChanged) {
      const proxyEnabled = await Storage.isProxyEnabled();
      const mode = await Storage.getMode();

      if (proxyEnabled && mode === CONFIG.MODES.CUSTOM) {
        Utils.log('info', 'Custom proxy settings changed while connected, re-applying...');

        // Get the updated custom proxy settings
        const customProxy = await Storage.getCustomProxy();
        const bypassLocal = await Storage.getValue(CONFIG.STORAGE_KEYS.BYPASS_LOCAL, true);
        const exceptions = await Storage.getValue(CONFIG.STORAGE_KEYS.EXCEPTIONS, []);

        // Validate the new settings
        if (!customProxy.ip || !customProxy.port) {
          // Invalid settings - disconnect
          Utils.log('warn', 'Custom proxy settings invalid, disconnecting...');
          await ProxyManager.disconnect();
          await Storage.setProxyEnabled(false);
          broadcastMessage({
            action: 'statusUpdate',
            status: 'error',
            error: 'Custom proxy not configured'
          });
        } else {
          // Try to apply the new proxy settings
          const result = await ProxyManager.applyProxy(
            customProxy.ip,
            customProxy.port,
            exceptions,
            bypassLocal
          );

          if (result) {
            broadcastMessage({
              action: 'statusUpdate',
              status: 'connected',
              proxy: { host: customProxy.ip, port: customProxy.port },
              mode: CONFIG.MODES.CUSTOM
            });
          } else {
            // Failed to apply - disconnect
            await ProxyManager.disconnect();
            await Storage.setProxyEnabled(false);
            broadcastMessage({
              action: 'statusUpdate',
              status: 'error',
              error: 'Failed to apply proxy settings'
            });
          }
        }
      }
    }

    // Handle bypass settings changes (affects both public and custom modes)
    // Skip if custom proxy connection was already re-applied above
    if (bypassSettingsChanged && !customProxyConnectionChanged) {
      const proxyEnabled = await Storage.isProxyEnabled();
      if (proxyEnabled) {
        const mode = await Storage.getMode();
        const currentProxy = await Storage.getCurrentProxy();

        if (currentProxy) {
          const bypassLocal = await Storage.getValue(CONFIG.STORAGE_KEYS.BYPASS_LOCAL, true);
          const exceptions = await Storage.getValue(CONFIG.STORAGE_KEYS.EXCEPTIONS, []);

          Utils.log('info', 'Bypass settings changed, re-applying proxy settings', { bypassLocal, exceptions });

          if (mode === CONFIG.MODES.CUSTOM) {
            const customProxy = await Storage.getCustomProxy();
            await ProxyManager.applyProxy(
              customProxy.ip,
              customProxy.port,
              exceptions,
              bypassLocal
            );
          } else {
            await ProxyManager.applyProxy(
              currentProxy.host,
              currentProxy.port,
              exceptions,
              bypassLocal
            );
          }
        }
      }
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Handle clear custom proxy action
 * @returns {Promise<object>}
 */
async function handleClearCustomProxy() {
  try {
    Utils.log('info', 'Clearing custom proxy settings...');
    await Storage.clearCustomProxy();
    Utils.log('info', 'Custom proxy settings cleared successfully');
    return { success: true };
  } catch (error) {
    Utils.log('error', 'Failed to clear custom proxy settings', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle set mode action
 * @param {string} mode - Mode to set
 * @returns {Promise<object>}
 */
async function handleSetMode(mode) {
  await Storage.setMode(mode);
  return { success: true, mode };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Broadcast message to all extension pages
 * @param {object} message - Message to broadcast
 */
function broadcastMessage(message) {
  chrome.runtime.sendMessage(message).catch(() => {
    // Ignore errors when no listeners
  });
}

/**
 * Handle proxy errors
 */
let lastProxyErrorTime = 0;
const PROXY_ERROR_DEBOUNCE_MS = 5000; // Prevent multiple errors within 5 seconds

chrome.proxy.onProxyError.addListener(async (details) => {
  // Debounce rapid proxy errors (e.g., when network goes down)
  const now = Date.now();
  if (now - lastProxyErrorTime < PROXY_ERROR_DEBOUNCE_MS) {
    Utils.log('debug', 'Proxy error debounced', details);
    return;
  }
  lastProxyErrorTime = now;

  Utils.log('error', 'Proxy error', details);

  // Check current mode - only attempt fallback for public proxies
  const mode = await Storage.getMode();
  const killSwitch = await Storage.getValue(CONFIG.STORAGE_KEYS.KILL_SWITCH, false);

  // For non-fatal errors in public mode, attempt fallback
  if (!details.fatal && mode === CONFIG.MODES.PUBLIC) {
    const result = await ProxyManager.fallbackToNext();
    if (result.success) {
      broadcastMessage({
        action: 'statusUpdate',
        status: 'connected',
        proxy: result.proxy,
        message: 'Switched to backup proxy'
      });
      return; // Successfully switched, no error to report
    }
  }

  // Fallback failed or fatal error or custom mode - handle disconnect
  if (killSwitch) {
    // Kill switch is ON - block all traffic
    await applyKillSwitch(true);
    await Storage.setProxyEnabled(false);
    broadcastMessage({
      action: 'statusUpdate',
      status: 'blocked',
      error: details.fatal ? 'Fatal error - Kill switch activated' : 'Connection lost - Kill switch activated'
    });
  } else {
    // Kill switch is OFF - just disconnect and show error
    await ProxyManager.disconnect();
    await Storage.setProxyEnabled(false);
    broadcastMessage({
      action: 'statusUpdate',
      status: 'error',
      error: details.error || 'Proxy connection error'
    });
  }
});

// ============================================
// Privacy Protection Functions
// ============================================

/**
 * Apply WebRTC Leak Protection
 * @param {boolean} enabled - Whether to enable protection
 */
async function applyWebRTCProtection(enabled) {
  try {
    const value = enabled ? 'disable_non_proxied_udp' : 'default';
    await chrome.privacy.network.webRTCIPHandlingPolicy.set({ value });
    Utils.log('info', `WebRTC protection ${enabled ? 'enabled' : 'disabled'}`, { policy: value });
    return true;
  } catch (error) {
    Utils.log('error', 'Failed to set WebRTC policy', error);
    return false;
  }
}

/**
 * Apply Kill Switch - blocks all traffic when proxy disconnects unexpectedly
 * @param {boolean} activate - Whether to activate (block) or deactivate (unblock)
 */
async function applyKillSwitch(activate) {
  try {
    if (activate) {
      // Kill switch active: block all traffic by setting invalid proxy
      const config = {
        mode: 'fixed_servers',
        rules: {
          singleProxy: {
            scheme: 'socks5',
            host: '127.0.0.1',  // Localhost with closed port - blocks all traffic
            port: 65535
          }
        }
      };
      await chrome.proxy.settings.set({ value: config, scope: 'regular' });
      await Storage.setValue('killSwitchActive', true);
      Utils.log('info', 'Kill switch ACTIVATED - all traffic blocked');

      // Update icon to show blocked state
      try {
        await chrome.action.setBadgeText({ text: '!' });
        await chrome.action.setBadgeBackgroundColor({ color: '#e74c3c' });
      } catch (e) {}
    } else {
      // Deactivate kill switch - clear proxy settings
      await chrome.proxy.settings.clear({ scope: 'regular' });
      await Storage.setValue('killSwitchActive', false);
      Utils.log('info', 'Kill switch DEACTIVATED - traffic restored');

      // Clear badge
      try {
        await chrome.action.setBadgeText({ text: '' });
      } catch (e) {}
    }
    return true;
  } catch (error) {
    Utils.log('error', 'Failed to apply kill switch', error);
    return false;
  }
}

/**
 * Initialize privacy settings on startup
 */
async function initializePrivacySettings() {
  const webrtcProtection = await Storage.getValue(CONFIG.STORAGE_KEYS.WEBRTC_PROTECTION, true);
  await applyWebRTCProtection(webrtcProtection);
  Utils.log('info', 'Privacy settings initialized');
}

// Initialize privacy settings
initializePrivacySettings();

// ============================================
// Proxy Authentication Handler
// ============================================

/**
 * Handle proxy authentication requests
 * This is called when a proxy requires username/password
 */
chrome.webRequest.onAuthRequired.addListener(
  async (details, callback) => {
    Utils.log('info', 'Proxy authentication required', { challenger: details.challenger });

    // Only handle proxy authentication
    if (!details.isProxy) {
      callback({});
      return;
    }

    try {
      // Get stored credentials
      const customProxy = await Storage.getCustomProxy();

      if (customProxy.username && customProxy.password) {
        Utils.log('info', 'Providing proxy credentials');
        callback({
          authCredentials: {
            username: customProxy.username,
            password: customProxy.password
          }
        });
      } else {
        Utils.log('warn', 'No proxy credentials stored');
        callback({});
      }
    } catch (error) {
      Utils.log('error', 'Error handling proxy auth', error);
      callback({});
    }
  },
  { urls: ['<all_urls>'] },
  ['asyncBlocking']
);

Utils.log('info', 'Background service worker ready');
