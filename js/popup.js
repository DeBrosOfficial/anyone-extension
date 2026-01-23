/* ANyONe Extension v2 - Popup Controller */

// ES Module imports
import { CONFIG } from './config.js';
import { Utils } from './utils.js';

// ============================================
// State
// ============================================

const state = {
  mode: 'public',
  connected: false,
  connecting: false,
  blocked: false,  // Kill switch active
  currentProxy: null,
  proxyCount: 0
};

// ============================================
// DOM Elements
// ============================================

const elements = {
  // Mode tabs
  modeTabs: document.querySelectorAll('.mode-tab'),
  modeContents: document.querySelectorAll('.mode-content'),

  // Public mode
  proxyMode: document.getElementById('proxy-mode'),
  proxyCount: document.getElementById('proxy-count'),
  btnNextProxy: document.getElementById('btn-next-proxy'),

  // Custom mode
  customIp: document.getElementById('custom-ip'),
  customPort: document.getElementById('custom-port'),
  btnTestCustom: document.getElementById('btn-test-custom'),

  // Connect button
  btnConnect: document.getElementById('btn-connect'),

  // Status
  statusCard: document.getElementById('status-card'),
  statusDot: document.getElementById('status-dot'),
  statusText: document.getElementById('status-text'),
  statusIp: document.getElementById('status-ip'),

  // Quick actions
  btnCheckIp: document.getElementById('btn-check-ip'),
  btnRefresh: document.getElementById('btn-refresh'),
  btnSettings: document.getElementById('btn-settings')
};

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', init);

async function init() {
  console.log('[Popup] Initializing...');

  // Prevent scroll
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';
  window.addEventListener('scroll', (e) => {
    window.scrollTo(0, 0);
  });
  document.addEventListener('wheel', (e) => {
    e.preventDefault();
  }, { passive: false });
  document.addEventListener('touchmove', (e) => {
    e.preventDefault();
  }, { passive: false });

  // Setup event listeners
  setupEventListeners();

  // Load initial state
  await loadState();

  // Load custom proxy settings
  await loadCustomProxy();

  // Load proxy info for public mode
  await loadProxyInfo();

  console.log('[Popup] Initialized', state);
}

// ============================================
// Event Listeners
// ============================================

function setupEventListeners() {
  // Mode tabs
  elements.modeTabs.forEach(tab => {
    tab.addEventListener('click', () => switchMode(tab.dataset.mode));
  });

  // Connect button
  elements.btnConnect.addEventListener('click', handleConnect);

  // Public mode
  elements.btnNextProxy.addEventListener('click', handleNextProxy);

  // Custom mode
  elements.btnTestCustom.addEventListener('click', testCustomProxy);

  // Quick actions
  elements.btnCheckIp.addEventListener('click', () => {
    sendMessage({ action: 'openUrl', url: CONFIG.URLS.CHECK_IP });
  });

  elements.btnRefresh.addEventListener('click', refreshProxies);

  elements.btnSettings.addEventListener('click', () => {
    sendMessage({ action: 'openOptions' });
  });

  // Listen for status updates from background
  chrome.runtime.onMessage.addListener(handleBackgroundMessage);
}

// ============================================
// State Management
// ============================================

async function loadState() {
  const response = await sendMessage({ action: 'getStatus' });

  if (response.success) {
    state.mode = response.mode || 'public';
    state.connected = response.enabled;
    state.blocked = response.killSwitchActive || false;
    state.currentProxy = response.currentProxy;

    // Update UI
    updateModeUI();
    updateConnectionUI();
  }
}

async function loadProxyInfo() {
  console.log('[Popup] Loading proxy info...');
  const response = await sendMessage({ action: 'getProxyList' });
  console.log('[Popup] Proxy list response:', response);

  if (response.success) {
    state.proxyCount = response.count || 0;
    updateProxyInfo();

    // Show warning if no proxies available
    if (state.proxyCount === 0 && !state.connected && !state.connecting) {
      showNoProxiesWarning();
    }
  } else {
    console.log('[Popup] Failed to load proxy info:', response.error);
    elements.proxyCount.textContent = 'Error loading';
    showNoProxiesWarning();
  }
}

function updateProxyInfo() {
  elements.proxyMode.textContent = 'Auto (Fastest)';
  elements.proxyCount.textContent = `${state.proxyCount} nodes`;
}

function showNoProxiesWarning() {
  elements.statusText.textContent = 'No proxies';
  elements.statusText.style.color = 'var(--color-warning)';
  elements.statusIp.textContent = 'Click Refresh to load proxy list';
  elements.statusIp.style.display = 'block';
  elements.statusIp.style.color = 'var(--color-text-muted)';
}

async function loadCustomProxy() {
  const response = await sendMessage({ action: 'getSettings' });

  if (response.success && response.settings) {
    const settings = response.settings;
    if (settings.proxyIP) {
      elements.customIp.value = settings.proxyIP;
    }
    if (settings.proxyPort) {
      elements.customPort.value = settings.proxyPort;
    }
  }
}

// ============================================
// Mode Switching
// ============================================

function switchMode(mode) {
  state.mode = mode;

  // Update tabs
  elements.modeTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.mode === mode);
  });

  // Update content
  elements.modeContents.forEach(content => {
    content.classList.toggle('active', content.id === `mode-${mode}`);
  });

  // Save mode
  sendMessage({ action: 'setMode', mode });
}

function updateModeUI() {
  // Activate correct tab and content
  elements.modeTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.mode === state.mode);
  });

  elements.modeContents.forEach(content => {
    content.classList.toggle('active', content.id === `mode-${state.mode}`);
  });
}

// ============================================
// Next Proxy (Load Balancing)
// ============================================

async function handleNextProxy() {
  if (!state.connected) {
    showError('Connect first to switch proxy');
    return;
  }

  // Show switching state (orange)
  state.connecting = true;
  updateConnectionUI();
  elements.statusText.textContent = 'Switching...';
  elements.statusText.style.color = 'var(--color-warning)';
  elements.statusIp.style.display = 'none';

  elements.btnNextProxy.disabled = true;
  elements.btnNextProxy.textContent = 'Switching...';

  const response = await sendMessage({ action: 'nextProxy' });

  state.connecting = false;
  elements.statusText.style.color = '';

  elements.btnNextProxy.disabled = false;
  elements.btnNextProxy.innerHTML = `
    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
    Next Proxy
  `;

  if (response.success) {
    state.currentProxy = response.proxy;
    showSuccess(`Switched to ${response.proxy?.host || 'next proxy'}`);
    updateConnectionUI();
  } else {
    showError(response.error || 'Failed to switch proxy');
  }
}

// ============================================
// Connection
// ============================================

async function handleConnect() {
  if (state.connecting) return;

  if (state.connected) {
    await disconnect();
  } else {
    await connect();
  }
}

async function connect() {
  state.connecting = true;
  updateConnectionUI();

  // If already connected, disconnect first before switching modes
  if (state.connected) {
    await sendMessage({ action: 'disconnect' });
    state.connected = false;
    state.currentProxy = null;
  }

  const options = {};
  let customIp = null;
  let customPort = null;

  if (state.mode === 'public') {
    options.country = 'auto';
  }

  // Save custom proxy before connecting if in custom mode
  if (state.mode === 'custom') {
    customIp = elements.customIp.value.trim();
    customPort = elements.customPort.value.trim();

    if (!customIp || !customPort) {
      state.connecting = false;
      showError('Please enter host and port');
      return;
    }

    // Validate host and port
    if (!Utils.isValidHost(customIp)) {
      state.connecting = false;
      showError('Invalid IP address or hostname');
      return;
    }

    if (!Utils.isValidPort(customPort)) {
      state.connecting = false;
      showError('Invalid port (1-65535)');
      return;
    }

    // Show testing state with IP:port
    elements.statusText.textContent = 'Connecting...';
    elements.statusText.style.color = 'var(--color-warning)';
    elements.statusIp.textContent = `${customIp}:${customPort}`;
    elements.statusIp.style.display = 'block';

    // Save custom proxy settings
    await sendMessage({
      action: 'saveSettings',
      settings: {
        proxyIP: customIp,
        proxyPort: parseInt(customPort, 10)
      }
    });
  }

  const response = await sendMessage({
    action: 'connect',
    mode: state.mode,
    options
  });

  state.connecting = false;
  elements.statusText.style.color = '';

  if (response.success) {
    state.connected = true;
    state.currentProxy = response.proxy;
  } else {
    if (state.mode === 'custom') {
      state.connected = false;
      state.currentProxy = null;
      showErrorPersistent(`Proxy ${customIp}:${customPort} is not responding`);
      return;
    }
    showError(response.error || 'Connection failed');
  }

  updateConnectionUI();
}

async function disconnect() {
  state.connecting = true;
  updateConnectionUI();

  const response = await sendMessage({ action: 'disconnect' });

  state.connecting = false;
  state.connected = !response.success;
  state.currentProxy = null;

  updateConnectionUI();
}

function updateConnectionUI() {
  const btn = elements.btnConnect;
  const card = elements.statusCard;
  const dot = elements.statusDot;
  const statusText = elements.statusText;
  const statusIp = elements.statusIp;

  // Remove all state classes
  btn.classList.remove('connected', 'connecting', 'error', 'blocked');
  card.classList.remove('connected', 'connecting', 'disconnected', 'error', 'blocked');
  dot.classList.remove('online', 'offline', 'connecting', 'error', 'blocked');

  // Reset text styles
  statusText.style.color = '';
  statusIp.style.color = '';

  if (state.connecting) {
    btn.classList.add('connecting');
    card.classList.add('connecting');
    dot.classList.add('connecting');
    statusText.textContent = 'Connecting...';
    statusIp.style.display = 'none';
    btn.disabled = true;
  } else if (state.blocked) {
    // Kill switch is active - traffic blocked
    btn.classList.add('blocked');
    card.classList.add('blocked');
    dot.classList.add('blocked');
    statusText.textContent = 'BLOCKED';
    statusText.style.color = 'var(--color-error)';
    statusIp.textContent = 'Kill Switch active - Connect to unblock';
    statusIp.style.display = 'block';
    statusIp.style.color = 'var(--color-warning)';
    btn.disabled = false;
  } else if (state.connected) {
    btn.classList.add('connected');
    card.classList.add('connected');
    dot.classList.add('online');
    statusText.textContent = 'Connected';
    btn.disabled = false;

    // Show IP
    if (state.currentProxy) {
      statusIp.textContent = state.currentProxy.host || '-';
      statusIp.style.display = 'block';
    }
  } else {
    card.classList.add('disconnected');
    dot.classList.add('offline');
    statusText.textContent = 'Disconnected';
    statusIp.style.display = 'none';
    btn.disabled = false;
  }
}

// ============================================
// Custom Proxy
// ============================================

async function testCustomProxy() {
  const ip = elements.customIp.value.trim();
  const port = elements.customPort.value.trim();

  if (!ip || !port) {
    showError('Please enter host and port');
    return;
  }

  // Validate host and port
  if (!Utils.isValidHost(ip)) {
    showError('Invalid IP address or hostname');
    return;
  }

  if (!Utils.isValidPort(port)) {
    showError('Invalid port (1-65535)');
    return;
  }

  // Save previous state
  const previousConnected = state.connected;
  const previousProxy = state.currentProxy;

  // Set connecting state (orange)
  state.connecting = true;
  updateConnectionUI();
  elements.statusText.textContent = 'Testing...';
  elements.statusText.style.color = 'var(--color-warning)';
  elements.statusIp.textContent = `${ip}:${port}`;
  elements.statusIp.style.display = 'block';

  elements.btnTestCustom.disabled = true;
  elements.btnTestCustom.textContent = 'Testing...';

  const response = await sendMessage({
    action: 'testProxy',
    proxy: { host: ip, port: parseInt(port, 10) }
  });

  // Reset connecting state
  state.connecting = false;
  elements.statusText.style.color = '';

  elements.btnTestCustom.disabled = false;
  elements.btnTestCustom.textContent = 'Test Connection';

  if (response.working) {
    // Proxy is working, now actually connect to it
    showSuccess(`Proxy ${ip}:${port} is working!`);

    // Save custom proxy settings and connect
    await sendMessage({
      action: 'saveSettings',
      settings: {
        proxyIP: ip,
        proxyPort: parseInt(port, 10)
      }
    });

    // Actually connect through the proxy
    const connectResponse = await sendMessage({
      action: 'connect',
      mode: 'custom'
    });

    if (connectResponse.success) {
      state.connected = true;
      state.currentProxy = connectResponse.proxy || { host: ip, port: parseInt(port, 10) };
    }
    updateConnectionUI();
  } else {
    // Stay in error state, don't restore
    state.connected = false;
    state.currentProxy = null;
    showErrorPersistent(`Proxy ${ip}:${port} is not responding`);
  }
}

// ============================================
// Utilities
// ============================================

async function refreshProxies() {
  const refreshIcon = elements.btnRefresh.querySelector('.icon');
  if (refreshIcon) {
    refreshIcon.classList.add('spinning');
  }

  // Get the stored proxy source setting
  const settings = await sendMessage({ action: 'getSettings' });
  const source = settings.settings?.proxySource || 'arweave';

  const response = await sendMessage({ action: 'fetchProxies', source });

  if (refreshIcon) {
    refreshIcon.classList.remove('spinning');
  }

  if (response.success) {
    // Show which source was used (especially if fallback occurred)
    const sourceNames = { arweave: 'Arweave', git: 'GitBros', github: 'GitHub' };
    const usedName = sourceNames[response.usedSource] || response.usedSource;

    if (response.usedSource && response.usedSource !== source) {
      showSuccess(`${response.proxies.length} proxies (fallback: ${usedName})`);
    } else {
      showSuccess(`Updated: ${response.proxies.length} proxies`);
    }
    await loadProxyInfo();
  } else {
    showError('All sources failed');
  }
}

function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response || { success: false, error: 'No response' });
    });
  });
}

function handleBackgroundMessage(message) {
  console.log('[Popup] Background message:', message);

  switch (message.action) {
    case 'statusUpdate':
      if (message.status === 'connected') {
        state.connected = true;
        state.connecting = false;
        state.blocked = false;
        state.currentProxy = message.proxy;
        updateConnectionUI();
      } else if (message.status === 'disconnected') {
        state.connected = false;
        state.connecting = false;
        state.blocked = false;
        state.currentProxy = null;
        updateConnectionUI();
      } else if (message.status === 'connecting') {
        state.connecting = true;
        state.blocked = false;
        updateConnectionUI();
      } else if (message.status === 'blocked') {
        state.connected = false;
        state.connecting = false;
        state.blocked = true;
        state.currentProxy = null;
        updateConnectionUI();
      } else if (message.status === 'error') {
        state.connected = false;
        state.connecting = false;
        state.currentProxy = null;
        // showError handles its own UI update, don't call updateConnectionUI
        showError(message.error || 'Connection error');
      }
      break;

    case 'proxyError':
      showError(`Proxy error: ${message.error}`);
      break;

    case 'proxiesUpdated':
      loadProxyInfo();
      break;
  }
}

function showError(message) {
  console.log('[Popup] Error:', message);

  // Reset state to disconnected
  state.connected = false;
  state.connecting = false;
  state.currentProxy = null;

  // Update status card
  elements.statusCard.classList.remove('connected', 'connecting', 'disconnected');
  elements.statusCard.classList.add('error');

  // "Error" in red
  elements.statusText.textContent = 'Error';
  elements.statusText.style.color = 'var(--color-error)';

  // Message below in default color
  elements.statusIp.textContent = message;
  elements.statusIp.style.display = 'block';
  elements.statusIp.style.color = '';

  // Update dot to error state
  elements.statusDot.classList.remove('online', 'offline', 'connecting');
  elements.statusDot.classList.add('error');

  // Update button to error state
  elements.btnConnect.classList.remove('connected', 'connecting');
  elements.btnConnect.classList.add('error');
  elements.btnConnect.disabled = false;

  // After 3 seconds, just reset the error styling but keep showing "Disconnected" state
  setTimeout(() => {
    elements.statusCard.classList.remove('error');
    elements.statusCard.classList.add('disconnected');
    elements.statusText.textContent = 'Disconnected';
    elements.statusText.style.color = '';
    elements.statusDot.classList.remove('error');
    elements.statusDot.classList.add('offline');
    elements.btnConnect.classList.remove('error');
  }, 3000);
}

function showErrorPersistent(message) {
  console.log('[Popup] Error:', message);

  // Update status card
  elements.statusCard.classList.remove('connected', 'connecting', 'disconnected');
  elements.statusCard.classList.add('error');

  // "Error" in red
  elements.statusText.textContent = 'Error';
  elements.statusText.style.color = 'var(--color-error)';

  // Message below in default color
  elements.statusIp.textContent = message;
  elements.statusIp.style.display = 'block';
  elements.statusIp.style.color = '';

  // Update button
  elements.btnConnect.classList.remove('connected', 'connecting');
  elements.btnConnect.classList.add('error');
  elements.btnConnect.disabled = false;

  // Return to disconnected state after 5 seconds
  setTimeout(() => {
    state.connected = false;
    state.currentProxy = null;
    elements.statusCard.classList.remove('error');
    elements.statusText.style.color = '';
    elements.statusDot.classList.remove('error');
    elements.btnConnect.classList.remove('error');
    updateConnectionUI();
  }, 5000);
}

function showSuccess(message) {
  console.log('[Popup] Success:', message);

  // "Success" in green
  elements.statusText.textContent = 'Success';
  elements.statusText.style.color = 'var(--color-success)';

  // Message below in default color
  elements.statusIp.textContent = message;
  elements.statusIp.style.display = 'block';
  elements.statusIp.style.color = '';

  setTimeout(() => {
    elements.statusText.style.color = '';
    updateConnectionUI();
  }, 3000);
}
