/* ANyONe Extension v2 - Storage Manager */

import { CONFIG } from './config.js';

const Storage = {
  /**
   * Get value from storage
   * @param {string|string[]} keys - Key(s) to retrieve
   * @returns {Promise<object>}
   */
  async get(keys) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.get(keys, (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(result);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * Set value in storage
   * @param {object} data - Data to store
   * @returns {Promise<void>}
   */
  async set(data) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.set(data, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * Remove keys from storage
   * @param {string|string[]} keys - Key(s) to remove
   * @returns {Promise<void>}
   */
  async remove(keys) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.remove(keys, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * Clear all storage
   * @returns {Promise<void>}
   */
  async clear() {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.clear(() => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * Get single value with default
   * @param {string} key - Key to retrieve
   * @param {*} defaultValue - Default value if not found
   * @returns {Promise<*>}
   */
  async getValue(key, defaultValue = null) {
    const result = await this.get(key);
    return result[key] !== undefined ? result[key] : defaultValue;
  },

  /**
   * Set single value
   * @param {string} key - Key to set
   * @param {*} value - Value to store
   * @returns {Promise<void>}
   */
  async setValue(key, value) {
    return this.set({ [key]: value });
  },

  // ============================================
  // Convenience methods for common operations
  // ============================================

  /**
   * Get current connection mode
   * @returns {Promise<string>}
   */
  async getMode() {
    return this.getValue(CONFIG.STORAGE_KEYS.MODE, CONFIG.DEFAULTS.MODE);
  },

  /**
   * Set connection mode
   * @param {string} mode - Mode to set
   * @returns {Promise<void>}
   */
  async setMode(mode) {
    return this.setValue(CONFIG.STORAGE_KEYS.MODE, mode);
  },

  /**
   * Check if proxy is enabled
   * @returns {Promise<boolean>}
   */
  async isProxyEnabled() {
    return this.getValue(CONFIG.STORAGE_KEYS.PROXY_ENABLED, false);
  },

  /**
   * Set proxy enabled state
   * @param {boolean} enabled - Enabled state
   * @returns {Promise<void>}
   */
  async setProxyEnabled(enabled) {
    return this.setValue(CONFIG.STORAGE_KEYS.PROXY_ENABLED, enabled);
  },

  /**
   * Get proxy list
   * @returns {Promise<Array>}
   */
  async getProxyList() {
    return this.getValue(CONFIG.STORAGE_KEYS.PROXY_LIST, []);
  },

  /**
   * Set proxy list
   * @param {Array} list - Proxy list
   * @returns {Promise<void>}
   */
  async setProxyList(list) {
    await this.set({
      [CONFIG.STORAGE_KEYS.PROXY_LIST]: list,
      [CONFIG.STORAGE_KEYS.LAST_UPDATE]: Date.now()
    });
  },

  /**
   * Get current proxy
   * @returns {Promise<object|null>}
   */
  async getCurrentProxy() {
    return this.getValue(CONFIG.STORAGE_KEYS.CURRENT_PROXY, null);
  },

  /**
   * Set current proxy
   * @param {object} proxy - Proxy object
   * @returns {Promise<void>}
   */
  async setCurrentProxy(proxy) {
    return this.setValue(CONFIG.STORAGE_KEYS.CURRENT_PROXY, proxy);
  },

  /**
   * Get custom proxy settings
   * @returns {Promise<{ip: string, port: number, username: string, password: string, exceptions: string[]}>}
   */
  async getCustomProxy() {
    const result = await this.get([
      CONFIG.STORAGE_KEYS.CUSTOM_IP,
      CONFIG.STORAGE_KEYS.CUSTOM_PORT,
      CONFIG.STORAGE_KEYS.CUSTOM_USERNAME,
      CONFIG.STORAGE_KEYS.CUSTOM_PASSWORD,
      CONFIG.STORAGE_KEYS.EXCEPTIONS
    ]);
    return {
      ip: result[CONFIG.STORAGE_KEYS.CUSTOM_IP] || '',
      port: result[CONFIG.STORAGE_KEYS.CUSTOM_PORT] || '',
      username: result[CONFIG.STORAGE_KEYS.CUSTOM_USERNAME] || '',
      password: result[CONFIG.STORAGE_KEYS.CUSTOM_PASSWORD] || '',
      exceptions: result[CONFIG.STORAGE_KEYS.EXCEPTIONS] || []
    };
  },

  /**
   * Set custom proxy settings
   * @param {string} ip - IP address
   * @param {number} port - Port number
   * @param {string[]} exceptions - Exception list
   * @param {string} username - Proxy username (optional)
   * @param {string} password - Proxy password (optional)
   * @returns {Promise<void>}
   */
  async setCustomProxy(ip, port, exceptions = [], username = '', password = '') {
    return this.set({
      [CONFIG.STORAGE_KEYS.CUSTOM_IP]: ip,
      [CONFIG.STORAGE_KEYS.CUSTOM_PORT]: port,
      [CONFIG.STORAGE_KEYS.CUSTOM_USERNAME]: username,
      [CONFIG.STORAGE_KEYS.CUSTOM_PASSWORD]: password,
      [CONFIG.STORAGE_KEYS.EXCEPTIONS]: exceptions
    });
  },

  /**
   * Clear custom proxy settings
   * @returns {Promise<void>}
   */
  async clearCustomProxy() {
    return this.remove([
      CONFIG.STORAGE_KEYS.CUSTOM_IP,
      CONFIG.STORAGE_KEYS.CUSTOM_PORT,
      CONFIG.STORAGE_KEYS.CUSTOM_USERNAME,
      CONFIG.STORAGE_KEYS.CUSTOM_PASSWORD
    ]);
  },

  /**
   * Get all settings for options page
   * @returns {Promise<object>}
   */
  async getAllSettings() {
    const keys = Object.values(CONFIG.STORAGE_KEYS);
    return this.get(keys);
  },

  /**
   * Get last proxy update timestamp
   * @returns {Promise<number|null>}
   */
  async getLastUpdate() {
    return this.getValue(CONFIG.STORAGE_KEYS.LAST_UPDATE, null);
  }
};

// ES Module export
export { Storage };
