/* ANyONe Extension v2 - Configuration */

const CONFIG = {
  // Version
  VERSION: '2.0.2',

  // Connection Modes
  MODES: {
    PUBLIC: 'public',
    CUSTOM: 'custom'
  },

  // Default Settings
  DEFAULTS: {
    MODE: 'public',
    PROXY_TIMEOUT: 5000,
    AUTO_CONNECT: false,
    WEBRTC_PROTECTION: false,
    KILL_SWITCH: false,
    BYPASS_LOCAL: true,
    PROXY_SOURCE: 'arweave',
    UPDATE_INTERVAL: 0 // manual only
  },

  // Proxy Sources
  PROXY_SOURCES: {
    arweave: {
      name: 'Arweave',
      url: 'https://arweave.net/FjxfWIbSnZb7EaJWbeuWCsBBFWjTppfS3_KHxUP__B8',
      icon: 'AR'
    },
    git: {
      name: 'GitBros',
      url: 'https://git.debros.io/DeBros/anyone-proxy-list/raw/branch/main/anonproxies.json',
      icon: 'GIT'
    },
    github: {
      name: 'GitHub',
      url: 'https://raw.githubusercontent.com/DeBrosOfficial/anyone-proxy-list/refs/heads/main/anonproxies.json',
      icon: 'GH'
    }
  },

  // External URLs
  URLS: {
    CHECK_IP: 'https://check.en.anyone.tech/',
    DOCS: 'https://docs.anyone.io/',
    GITHUB: 'https://github.com/anyone-protocol',
    WEBSITE: 'https://anyone.io/'
  },

  // Timeouts (ms)
  TIMEOUTS: {
    PROXY_CHECK: 5000,
    FETCH: 10000
  },

  // Storage Keys
  STORAGE_KEYS: {
    MODE: 'connectionMode',
    PROXY_ENABLED: 'proxyEnabled',
    PROXY_LIST: 'proxyList',
    PROXY_SOURCE: 'proxySource',
    CURRENT_PROXY: 'currentProxy',
    CUSTOM_IP: 'proxyIP',
    CUSTOM_PORT: 'proxyPort',
    CUSTOM_USERNAME: 'proxyUsername',
    CUSTOM_PASSWORD: 'proxyPassword',
    EXCEPTIONS: 'noProxyFor',
    AUTO_CONNECT: 'autoConnect',
    WEBRTC_PROTECTION: 'webrtcProtection',
    KILL_SWITCH: 'killSwitch',
    BYPASS_LOCAL: 'bypassLocal',
    LAST_UPDATE: 'lastProxyUpdate',
    UPDATE_INTERVAL: 'updateInterval'
  }
};

// Freeze config to prevent modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.MODES);
Object.freeze(CONFIG.DEFAULTS);
Object.freeze(CONFIG.PROXY_SOURCES);
Object.freeze(CONFIG.URLS);
Object.freeze(CONFIG.TIMEOUTS);
Object.freeze(CONFIG.STORAGE_KEYS);

// ES Module export
export { CONFIG };
