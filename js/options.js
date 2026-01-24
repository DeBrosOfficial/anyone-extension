/* ANyONe Extension v2 - Options Page Controller */

// ES Module imports
import { Utils } from './utils.js';

// ============================================
// DOM Elements
// ============================================

const elements = {
  // General
  autoConnect: document.getElementById('auto-connect'),
  defaultMode: document.getElementById('default-mode'),

  // Privacy
  webrtcProtection: document.getElementById('webrtc-protection'),
  killSwitch: document.getElementById('kill-switch'),
  bypassLocal: document.getElementById('bypass-local'),

  // Public Proxies
  proxySource: document.getElementById('proxy-source'),
  updateInterval: document.getElementById('update-interval'),
  sourceName: document.getElementById('source-name'),
  sourceUrl: document.getElementById('source-url'),
  sourceUpdated: document.getElementById('source-updated'),
  btnRefreshProxies: document.getElementById('btn-refresh-proxies'),

  // Bypass List
  exceptions: document.getElementById('exceptions'),
  btnClearBypass: document.getElementById('btn-clear-bypass'),
  btnSaveBypass: document.getElementById('btn-save-bypass'),

  // Custom Proxy
  customIp: document.getElementById('custom-ip'),
  customPort: document.getElementById('custom-port'),
  customUsername: document.getElementById('custom-username'),
  customPassword: document.getElementById('custom-password'),
  btnClearCustom: document.getElementById('btn-clear-custom'),
  btnTestCustom: document.getElementById('btn-test-custom'),
  btnSaveCustom: document.getElementById('btn-save-custom'),

  // Toast
  toast: document.getElementById('toast'),
  toastIcon: document.getElementById('toast-icon'),
  toastMessage: document.getElementById('toast-message'),

  // Modal
  modalOverlay: document.getElementById('modal-overlay'),
  modalTitle: document.getElementById('modal-title'),
  modalMessage: document.getElementById('modal-message'),
  modalCancel: document.getElementById('modal-cancel'),
  modalConfirm: document.getElementById('modal-confirm')
};

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', init);

async function init() {
  console.log('[Options] Initializing...');

  // Load settings
  await loadSettings();

  // Setup event listeners
  setupEventListeners();

  // Update proxy source info
  await updateProxySourceInfo();

  console.log('[Options] Initialized');
}

// ============================================
// Load Settings
// ============================================

async function loadSettings() {
  const response = await sendMessage({ action: 'getSettings' });

  if (!response.success) {
    console.log('Failed to load settings');
    return;
  }

  const settings = response.settings;

  // General
  elements.autoConnect.checked = settings.autoConnect || false;
  elements.defaultMode.value = settings.connectionMode || 'public';

  // Privacy
  elements.webrtcProtection.checked = settings.webrtcProtection !== false;
  elements.killSwitch.checked = settings.killSwitch || false;
  elements.bypassLocal.checked = settings.bypassLocal !== false;

  // Public Proxies
  elements.proxySource.value = settings.proxySource || 'git';
  elements.updateInterval.value = settings.updateInterval ?? 0;
  updateSourceNameDisplay(settings.proxySource || 'git');

  // Custom Proxy
  elements.customIp.value = settings.proxyIP || '';
  elements.customPort.value = settings.proxyPort || '';
  elements.customUsername.value = settings.proxyUsername || '';
  elements.customPassword.value = settings.proxyPassword || '';
  elements.exceptions.value = Array.isArray(settings.noProxyFor)
    ? settings.noProxyFor.join(', ')
    : settings.noProxyFor || '';
}

// ============================================
// Event Listeners
// ============================================

function setupEventListeners() {
  // Auto-save on toggle changes
  elements.autoConnect.addEventListener('change', saveGeneralSettings);
  elements.defaultMode.addEventListener('change', saveGeneralSettings);
  elements.webrtcProtection.addEventListener('change', savePrivacySettings);
  elements.killSwitch.addEventListener('change', savePrivacySettings);
  elements.bypassLocal.addEventListener('change', handleBypassLocalChange);
  elements.proxySource.addEventListener('change', handleProxySourceChange);
  elements.updateInterval.addEventListener('change', saveProxySourceSettings);

  // Bypass list buttons
  elements.btnClearBypass.addEventListener('click', clearBypassList);
  elements.btnSaveBypass.addEventListener('click', saveBypassList);

  // Buttons
  elements.btnRefreshProxies.addEventListener('click', refreshProxies);
  elements.btnClearCustom.addEventListener('click', clearCustomProxy);
  elements.btnTestCustom.addEventListener('click', testCustomProxy);
  elements.btnSaveCustom.addEventListener('click', saveCustomProxy);
}

// ============================================
// Save Settings
// ============================================

async function saveGeneralSettings() {
  await sendMessage({
    action: 'saveSettings',
    settings: {
      autoConnect: elements.autoConnect.checked,
      connectionMode: elements.defaultMode.value
    }
  });
  showToast('General settings saved');
}

async function savePrivacySettings() {
  await sendMessage({
    action: 'saveSettings',
    settings: {
      webrtcProtection: elements.webrtcProtection.checked,
      killSwitch: elements.killSwitch.checked,
      bypassLocal: elements.bypassLocal.checked
    }
  });
  showToast('Privacy settings saved');
}

async function handleBypassLocalChange() {
  if (!elements.bypassLocal.checked) {
    // Revert toggle immediately, wait for confirmation
    elements.bypassLocal.checked = true;

    // Show confirmation modal
    showModal(
      'Disable Local Network Access?',
      'This will make local devices (printers, NAS, router, etc) unreachable while connected to the proxy.',
      async () => {
        // User confirmed - disable local network access
        elements.bypassLocal.checked = false;
        await saveBypassLocalSetting();
        showToast('Local network access disabled', 'error');
      }
    );
  } else {
    // Enabling - no confirmation needed
    await saveBypassLocalSetting();
    showToast('Local network access enabled', 'success');
  }
}

async function saveBypassLocalSetting() {
  await sendMessage({
    action: 'saveSettings',
    settings: {
      webrtcProtection: elements.webrtcProtection.checked,
      killSwitch: elements.killSwitch.checked,
      bypassLocal: elements.bypassLocal.checked
    }
  });
}

function showModal(title, message, onConfirm) {
  elements.modalTitle.textContent = title;
  elements.modalMessage.textContent = message;
  elements.modalOverlay.classList.add('show');

  // Remove old listeners
  const newCancelBtn = elements.modalCancel.cloneNode(true);
  const newConfirmBtn = elements.modalConfirm.cloneNode(true);
  elements.modalCancel.parentNode.replaceChild(newCancelBtn, elements.modalCancel);
  elements.modalConfirm.parentNode.replaceChild(newConfirmBtn, elements.modalConfirm);
  elements.modalCancel = newCancelBtn;
  elements.modalConfirm = newConfirmBtn;

  // Add new listeners
  elements.modalCancel.addEventListener('click', () => {
    elements.modalOverlay.classList.remove('show');
  });

  elements.modalConfirm.addEventListener('click', () => {
    elements.modalOverlay.classList.remove('show');
    if (onConfirm) onConfirm();
  });

  // Close on overlay click
  elements.modalOverlay.addEventListener('click', (e) => {
    if (e.target === elements.modalOverlay) {
      elements.modalOverlay.classList.remove('show');
    }
  });
}

async function saveProxySourceSettings() {
  await sendMessage({
    action: 'saveSettings',
    settings: {
      updateInterval: parseInt(elements.updateInterval.value, 10)
    }
  });

  showToast('Proxy settings saved');
}

async function saveBypassList() {
  const exceptions = elements.exceptions.value
    .split(',')
    .map(e => e.trim())
    .filter(e => e.length > 0);

  await sendMessage({
    action: 'saveSettings',
    settings: {
      noProxyFor: exceptions
    }
  });

  showToast('Bypass list saved', 'success');
}

async function clearBypassList() {
  elements.exceptions.value = '';

  await sendMessage({
    action: 'saveSettings',
    settings: {
      noProxyFor: []
    }
  });

  showToast('Bypass list cleared', 'success');
}

async function handleProxySourceChange() {
  const source = elements.proxySource.value;

  await sendMessage({
    action: 'saveSettings',
    settings: {
      proxySource: source
    }
  });

  updateSourceNameDisplay(source);
  showToast('Proxy source changed');
}

function updateSourceNameDisplay(source) {
  const names = {
    git: 'GitBros',
    github: 'GitHub',
    arweave: 'Arweave'
  };
  const urls = {
    git: 'git.debros.io/DeBros/anyone-proxy-list',
    github: 'github.com/DeBrosOfficial/anyone-proxy-list',
    arweave: 'arweave.net/FjxfWIbS...B8'
  };
  const fullUrls = {
    git: 'https://git.debros.io/DeBros/anyone-proxy-list',
    github: 'https://github.com/DeBrosOfficial/anyone-proxy-list',
    arweave: 'https://arweave.net/FjxfWIbSnZb7EaJWbeuWCsBBFWjTppfS3_KHxUP__B8'
  };
  const externalIcon = `<svg class="icon-external" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>`;
  elements.sourceName.textContent = names[source] || 'GitBros';
  elements.sourceUrl.innerHTML = (urls[source] || urls.git) + ' ' + externalIcon;
  elements.sourceUrl.href = fullUrls[source] || fullUrls.git;
}

async function saveCustomProxy() {
  const ip = elements.customIp.value.trim();
  const port = elements.customPort.value.trim();
  const username = elements.customUsername.value.trim();
  const password = elements.customPassword.value;

  // Validate
  if (!ip) {
    showToast('Please enter host address', 'error');
    return;
  }

  if (!Utils.isValidHost(ip)) {
    showToast('Invalid IP address or hostname', 'error');
    return;
  }

  if (!port || !Utils.isValidPort(port)) {
    showToast('Invalid port number (1-65535)', 'error');
    return;
  }

  // Disable button during save
  elements.btnSaveCustom.disabled = true;
  const originalText = elements.btnSaveCustom.innerHTML;
  elements.btnSaveCustom.innerHTML = '<span>Saving...</span>';

  try {
    // Save settings (bypass list is saved separately in Privacy section)
    await sendMessage({
      action: 'saveSettings',
      settings: {
        proxyIP: ip,
        proxyPort: parseInt(port, 10),
        proxyUsername: username,
        proxyPassword: password
      }
    });

    showToast('Custom proxy settings saved', 'success');

  } finally {
    elements.btnSaveCustom.disabled = false;
    elements.btnSaveCustom.innerHTML = originalText;
  }
}

async function clearCustomProxy() {
  // Disable button during clear
  elements.btnClearCustom.disabled = true;
  const originalText = elements.btnClearCustom.innerHTML;
  elements.btnClearCustom.innerHTML = '<span>Clearing...</span>';

  try {
    // Clear from storage first
    const response = await sendMessage({
      action: 'clearCustomProxy'
    });

    if (response.success) {
      // Clear custom proxy UI fields
      elements.customIp.value = '';
      elements.customPort.value = '';
      elements.customUsername.value = '';
      elements.customPassword.value = '';

      showToast('Custom proxy settings cleared', 'success');
    } else {
      showToast('Failed to clear settings', 'error');
    }
  } catch (error) {
    showToast('Failed to clear settings', 'error');
  } finally {
    elements.btnClearCustom.disabled = false;
    elements.btnClearCustom.innerHTML = originalText;
  }
}

// ============================================
// Proxy Actions
// ============================================

async function refreshProxies() {
  elements.btnRefreshProxies.disabled = true;
  const originalText = elements.btnRefreshProxies.innerHTML;
  elements.btnRefreshProxies.innerHTML = '<span>Refreshing...</span>';

  const source = elements.proxySource.value || 'arweave';
  const response = await sendMessage({ action: 'fetchProxies', source });

  elements.btnRefreshProxies.disabled = false;
  elements.btnRefreshProxies.innerHTML = originalText;

  if (response.success) {
    const sourceNames = { arweave: 'Arweave', git: 'GitBros', github: 'GitHub' };
    const usedName = sourceNames[response.usedSource] || response.usedSource;

    if (response.usedSource && response.usedSource !== source) {
      showToast(`${response.proxies.length} proxies from ${usedName} (fallback)`, 'success');
      // Update dropdown to show actual source used
      elements.proxySource.value = response.usedSource;
      updateSourceNameDisplay(response.usedSource);
    } else {
      showToast(`Updated: ${response.proxies.length} proxies`, 'success');
    }
    await updateProxySourceInfo();
  } else {
    showToast('All proxy sources failed', 'error');
  }
}

async function updateProxySourceInfo() {
  const response = await sendMessage({ action: 'getProxyList' });

  if (response.success) {
    const lastUpdate = response.lastUpdate;
    if (lastUpdate) {
      const relative = Utils.formatRelativeTime(lastUpdate);
      elements.sourceUpdated.textContent = `Last updated: ${relative}`;
    } else {
      elements.sourceUpdated.textContent = 'Last updated: Never';
    }
  }
}

async function testCustomProxy() {
  const ip = elements.customIp.value.trim();
  const port = elements.customPort.value.trim();
  const username = elements.customUsername.value.trim();
  const password = elements.customPassword.value;

  if (!ip || !port) {
    showToast('Please enter IP and port', 'error');
    return;
  }

  elements.btnTestCustom.disabled = true;
  const originalText = elements.btnTestCustom.innerHTML;
  elements.btnTestCustom.innerHTML = '<span>Testing...</span>';

  // Get current connection state BEFORE testing
  const statusBefore = await sendMessage({ action: 'getStatus' });
  const wasConnected = statusBefore.enabled;
  const previousMode = statusBefore.mode;

  // Save credentials temporarily so auth handler can use them
  if (username || password) {
    await sendMessage({
      action: 'saveSettings',
      settings: {
        proxyUsername: username,
        proxyPassword: password
      }
    });
  }

  // Show testing state
  showToast(`Testing ${ip}:${port}...`, 'info');

  const response = await sendMessage({
    action: 'testProxy',
    proxy: { host: ip, port: parseInt(port, 10) }
  });

  elements.btnTestCustom.disabled = false;
  elements.btnTestCustom.innerHTML = originalText;

  if (response.working) {
    // Save the proxy settings
    await sendMessage({
      action: 'saveSettings',
      settings: {
        proxyIP: ip,
        proxyPort: parseInt(port, 10),
        proxyUsername: username,
        proxyPassword: password
      }
    });

    // Connect to the proxy
    const connectResponse = await sendMessage({
      action: 'connect',
      mode: 'custom'
    });

    if (connectResponse.success) {
      showToast(`Connected to ${ip}:${port}`, 'success');
    } else {
      showToast(`Proxy working but failed to connect`, 'error');
    }
  } else {
    // Test failed - handle based on previous connection state
    if (wasConnected && previousMode === 'public') {
      // User was connected to public proxy - restore that connection
      showToast(`Test failed. Restoring public proxy...`, 'info');
      const reconnectResponse = await sendMessage({
        action: 'connect',
        mode: 'public'
      });
      if (reconnectResponse.success) {
        showToast(`Proxy ${ip}:${port} not responding. Reconnected to public proxy.`, 'error');
      } else {
        showToast(`Proxy ${ip}:${port} not responding. Failed to restore connection.`, 'error');
      }
    } else if (wasConnected && previousMode === 'custom') {
      // User was connected to custom proxy - they're testing a different one, disconnect
      await sendMessage({ action: 'disconnect' });
      showToast(`Proxy ${ip}:${port} is not responding`, 'error');
    } else {
      // User was not connected - just show error
      showToast(`Proxy ${ip}:${port} is not responding`, 'error');
    }
  }
}

// ============================================
// Utilities
// ============================================

function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response || { success: false, error: 'No response' });
    });
  });
}

function showToast(message, type = 'success') {
  elements.toastMessage.textContent = message;
  elements.toast.className = `toast show ${type}`;

  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 3000);
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'statusUpdate') {
    if (message.status === 'connected') {
      showToast('Proxy connected', 'success');
    } else if (message.status === 'disconnected') {
      showToast('Proxy disconnected');
    } else if (message.status === 'error') {
      showToast(message.error || 'Connection error', 'error');
    }
  }
});
