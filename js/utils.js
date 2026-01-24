/* ANyONe Extension v2 - Utility Functions */

const Utils = {
  /**
   * Validate IP address format
   * @param {string} ip - IP address to validate
   * @returns {boolean}
   */
  isValidIP(ip) {
    if (!ip || typeof ip !== 'string') return false;
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip.trim());
  },

  /**
   * Validate hostname/domain format
   * @param {string} hostname - Hostname to validate
   * @returns {boolean}
   */
  isValidHostname(hostname) {
    if (!hostname || typeof hostname !== 'string') return false;
    const trimmed = hostname.trim();

    // Must have at least one dot for a valid domain
    if (!trimmed.includes('.')) return false;

    // Split by dots and validate each part
    const parts = trimmed.split('.');

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      // Each part must be 1-63 chars
      if (part.length === 0 || part.length > 63) return false;

      // Only alphanumeric and hyphens allowed
      if (!/^[A-Za-z0-9-]+$/.test(part)) return false;

      // Cannot start or end with hyphen
      if (part.startsWith('-') || part.endsWith('-')) return false;
    }

    // TLD must be at least 2 letters (no numbers)
    const tld = parts[parts.length - 1];
    if (!/^[A-Za-z]{2,}$/.test(tld)) return false;

    return true;
  },

  /**
   * Validate host (IP or hostname)
   * @param {string} host - Host to validate (IP or hostname)
   * @returns {boolean}
   */
  isValidHost(host) {
    return this.isValidIP(host) || this.isValidHostname(host);
  },

  /**
   * Validate port number
   * @param {number|string} port - Port to validate
   * @returns {boolean}
   */
  isValidPort(port) {
    const portNum = parseInt(port, 10);
    return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
  },

  /**
   * Validate proxy configuration
   * @param {string} host - IP address or hostname
   * @param {number|string} port - Port number
   * @returns {{valid: boolean, error?: string}}
   */
  validateProxy(host, port) {
    if (!this.isValidHost(host)) {
      return { valid: false, error: 'Invalid IP address or hostname' };
    }
    if (!this.isValidPort(port)) {
      return { valid: false, error: 'Port must be between 1 and 65535' };
    }
    return { valid: true };
  },

  /**
   * Format bytes to human readable size
   * @param {number} bytes - Bytes to format
   * @returns {string}
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Format duration in seconds to human readable
   * @param {number} seconds - Duration in seconds
   * @returns {string}
   */
  formatDuration(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return [hrs, mins, secs]
      .map(v => v.toString().padStart(2, '0'))
      .join(':');
  },

  /**
   * Format timestamp to relative time
   * @param {number} timestamp - Unix timestamp
   * @returns {string}
   */
  formatRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  },

  /**
   * Parse exceptions string to array
   * @param {string} exceptions - Comma or newline separated exceptions
   * @returns {string[]}
   */
  parseExceptions(exceptions) {
    if (!exceptions || typeof exceptions !== 'string') return [];
    return exceptions
      .split(/[,\n]/)
      .map(e => e.trim())
      .filter(e => e.length > 0);
  },

  /**
   * Format exceptions array to string
   * @param {string[]} exceptions - Array of exceptions
   * @returns {string}
   */
  formatExceptions(exceptions) {
    if (!Array.isArray(exceptions)) return '';
    return exceptions.join(', ');
  },

  /**
   * Debounce function calls
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in ms
   * @returns {Function}
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Create a promise that rejects after timeout
   * @param {number} ms - Timeout in milliseconds
   * @returns {Promise}
   */
  timeout(ms) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), ms);
    });
  },

  /**
   * Fetch with timeout
   * @param {string} url - URL to fetch
   * @param {object} options - Fetch options
   * @param {number} timeoutMs - Timeout in ms
   * @returns {Promise<Response>}
   */
  async fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },

  /**
   * Generate unique ID
   * @returns {string}
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  /**
   * Safely parse JSON
   * @param {string} json - JSON string
   * @param {*} fallback - Fallback value on error
   * @returns {*}
   */
  safeParseJSON(json, fallback = null) {
    try {
      return JSON.parse(json);
    } catch {
      return fallback;
    }
  },

  /**
   * Deep clone object
   * @param {*} obj - Object to clone
   * @returns {*}
   */
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  /**
   * Check if running in extension context
   * @returns {boolean}
   */
  isExtensionContext() {
    return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
  },

  /**
   * Log with prefix
   * @param {string} level - Log level
   * @param {string} message - Message
   * @param {*} data - Optional data
   */
  log(level, message, data = null) {
    const prefix = '[ANyONe]';
    const timestamp = new Date().toISOString();
    const logMessage = `${prefix} ${timestamp} [${level.toUpperCase()}] ${message}`;

    switch (level) {
      case 'error':
        console.log(logMessage, data || '');
        break;
      case 'warn':
        console.warn(logMessage, data || '');
        break;
      case 'debug':
        console.debug(logMessage, data || '');
        break;
      default:
        console.log(logMessage, data || '');
    }
  }
};

// ES Module export
export { Utils };
