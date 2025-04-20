let proxies = []; // Initially empty, will be populated from local storage or fetched from the server
let currentProxyIndex = 0; // Start with the first proxy
let proxyEnabled = false;

console.log("background.js is running");

function applyProxySettings(host, port, exceptions = []) {
  const proxyConfig = {
    mode: "fixed_servers",
    rules: {
      singleProxy: {
        scheme: "socks5",
        host,
        port,
      },
      bypassList: exceptions.concat([""]),
    },
  };

  chrome.proxy.settings.set({ value: proxyConfig, scope: "regular" }, () => {
    const lastError = chrome.runtime.lastError;
    if (lastError) {
      console.error("Error applying proxy settings:", lastError);
      fallbackToNextProxy(); // Move to the next proxy if the current one fails
    } else {
      console.log(`Proxy applied: ${host}:${port}`);
      proxyEnabled = true;
    }
  });
}

function clearProxySettings() {
  chrome.proxy.settings.clear({}, () => {
    const lastError = chrome.runtime.lastError;
    if (lastError) {
      console.error("Error clearing proxy settings:", lastError);
    } else {
      console.log("Proxy settings cleared.");
      proxyEnabled = false;
      currentProxyIndex = 0; // Reset to the first proxy
    }
  });
}

function fallbackToNextProxy() {
  currentProxyIndex = (currentProxyIndex + 1) % proxies.length; // Move to the next proxy in the list
  if (proxies.length > 0) {
    const { host, port } = proxies[currentProxyIndex];
    console.log(`Falling back to proxy: ${host}:${port}`);
    applyProxySettings(host, port);
  } else {
    console.error("No proxies available to fall back to.");
  }
}

function checkProxyFunctionality(proxy, callback) {
  const proxyConfig = {
    mode: "fixed_servers",
    rules: {
      singleProxy: {
        scheme: "socks5",
        host: proxy.host,
        port: proxy.port
      },
      bypassList: [""]
    }
  };

  chrome.proxy.settings.set({ value: proxyConfig, scope: "regular" }, () => {
    if (chrome.runtime.lastError) {
      console.error("Error setting proxy for check:", chrome.runtime.lastError);
      callback(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    fetch('https://check.en.anyone.tech', { 
      mode: 'no-cors',
      signal: controller.signal
    })
      .then(response => {
        clearTimeout(timeoutId);
        if (response.ok) {
          console.log("Proxy check successful");
          callback(true); // Connection successful
        } else {
          console.log("Proxy check failed");
          callback(false); // Connection failed
        }
      })
      .catch(error => {
        if (error.name === 'AbortError') {
          console.log("Request timed out");
        } else {
          console.error("Error in proxy check:", error);
        }
        callback(false);
      });
  });
}

function enableFirstWorkingProxy(callback) {
  let index = 0;

  function tryNextProxy() {
    if (index >= proxies.length) {
      console.log("No working proxy found");
      callback(false);
      return;
    }

    const proxy = proxies[index];
    console.log("Checking proxy:", proxy.host + ":" + proxy.port);
    checkProxyFunctionality(proxy, (isWorking) => {
      if (isWorking) {
        currentProxyIndex = index; // Update currentProxyIndex
        console.log("Found working proxy:", proxy.host + ":" + proxy.port);
        applyProxySettings(proxy.host, proxy.port);
        chrome.storage.local.set({ proxyEnabled: true, currentProxy: proxy });
        callback(true);
      } else {
        index++;
        tryNextProxy();
      }
    });
  }

  tryNextProxy();
}

function fetchProxies() {
  console.log("Starting to fetch proxies...");
  return fetch('https://git.debros.io/DeBros/anyone-proxy-list/raw/branch/main/anonproxies.json') // list of public proxies
    .then(response => {
      console.log("Response status:", response.status);
      if (!response.ok) {
        console.error("Response not OK");
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      console.log("Data received:", data);
      proxies = data;
      // Save the proxies to local storage
      chrome.storage.local.set({ 'proxyList': proxies }, () => {
        console.log('Proxies updated and saved:', proxies);
      });
    })
    .catch(error => {
      console.error('Failed to fetch proxies:', error);
    });
}

// Load proxies from storage on extension startup if they exist
chrome.storage.local.get('proxyList', function(result) {
  if (result.proxyList) {
    proxies = result.proxyList;
    console.log('Loaded proxies from storage:', proxies);
  } else {
    console.log('No proxies found in local storage, fetch required.');
  }
});

// This event listener runs when the extension is first installed or updated
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("Extension installed for the first time. Fetching proxies...");
    // Fetch proxies automatically on first install but don't enable them
    fetchProxies().then(() => {
      console.log("Proxies updated on first install.");
      // Don't enable proxy automatically, just fetch and store it
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Received message in background:", message);
  if (message.action === "enableProxy") {
    console.log("Enabling proxy...");
    chrome.runtime.sendMessage({ action: "showLoadingMessage", message: "Please wait..." });
    enableFirstWorkingProxy((success) => {
      if (success) {
        console.log("Proxy enabled successfully");
        sendResponse({ status: "enabled", proxy: proxies[currentProxyIndex] });
      } else {
        console.log("Failed to enable proxy");
        sendResponse({ status: "error", message: "No public proxy available at this moment. Please configure a custom proxy in the settings." });
      }
    });
    return true; // For async response
  } else if (message.action === "disableProxy") {
    console.log("Disabling proxy...");
    clearProxySettings();
    chrome.storage.local.set({ proxyEnabled: false, proxyType: null });
    sendResponse({ status: "disabled" });
    chrome.tabs.query({}, function(tabs) {
      for (let tab of tabs) {
        chrome.tabs.sendMessage(tab.id, {action: "disableProxy"}, function(response) {
          if (chrome.runtime.lastError) {
            console.warn("Warning: Could not send message to tab " + tab.id + ". Tab might have been closed.", chrome.runtime.lastError.message);
          }
        });
      }
    });
  } else if (message.action === "updateProxy") {
    console.log("Updating proxy settings...");
    if (message.type === "custom") {
      // Custom proxy enable
      applyProxySettings(message.proxy.host, parseInt(message.proxy.port), message.exceptions || []);
      chrome.storage.local.set({ 
        proxyEnabled: true, 
        proxyType: "custom", 
        proxyIP: message.proxy.host, 
        proxyPort: message.proxy.port 
      });
      sendResponse({ status: "enabled", proxy: message.proxy });
      chrome.tabs.query({}, function(tabs) {
        for (let tab of tabs) {
          chrome.tabs.sendMessage(tab.id, {action: "updatePopupState"}, function(response) {
            if (chrome.runtime.lastError) {
              console.warn("Warning: Could not send message to tab " + tab.id + ". Tab might have been closed.", chrome.runtime.lastError.message);
            }
          });
        }
      });
    } else if (message.type === "public") {
      // Public proxy enable
      chrome.runtime.sendMessage({ action: "showLoadingMessage", message: "Please wait..." });
      enableFirstWorkingProxy((success) => {
        if (success) {
          console.log("Public proxy enabled successfully");
          sendResponse({ status: "enabled", proxy: proxies[currentProxyIndex] });
        } else {
          console.log("Failed to enable public proxy");
          sendResponse({ status: "error", message: "No public proxy available at this moment. Please configure a custom proxy in the settings." });
        }
      });
      return true; // For async response
    } else if (message.type === "disabled") {
      clearProxySettings();
      chrome.storage.local.set({ proxyEnabled: false, proxyType: null });
      sendResponse({ status: "disabled" });
      chrome.tabs.query({}, function(tabs) {
        for (let tab of tabs) {
          chrome.tabs.sendMessage(tab.id, {action: "disableProxy"}, function(response) {
            if (chrome.runtime.lastError) {
              console.warn("Warning: Could not send message to tab " + tab.id + ". Tab might have been closed.", chrome.runtime.lastError.message);
            }
          });
        }
      });
    }
  } else if (message.action === "proxyFailed") {
    console.log("Proxy setup failed:", message.error);
    clearProxySettings();
    chrome.storage.local.set({ proxyEnabled: false, proxyType: null });
    chrome.tabs.query({}, function(tabs) {
      for (let tab of tabs) {
        chrome.tabs.sendMessage(tab.id, {action: "toggleOff"}, function(response) {
          if (chrome.runtime.lastError) {
            console.warn("Warning: Could not send message to tab " + tab.id + ". Tab might have been closed.", chrome.runtime.lastError.message);
          }
        });
      }
    });
  } else if (message.action === "updateProxies") {
    console.log("Attempting to update proxies...");
    fetchProxies().then(() => {
      console.log("Proxies fetched successfully");
      sendResponse({success: true, proxies: proxies});
      chrome.runtime.sendMessage({ action: "updateStatus", message: "Proxy list updated successfully!", color: "#2ecc71" });
    }).catch(error => {
      console.error("Failed to fetch proxies:", error);
      sendResponse({success: false, message: "Failed to update proxy list."});
      chrome.runtime.sendMessage({ action: "updateStatus", message: "Failed to update proxy list.", color: "#e74c3c" });
    });
    return true; // Indicates this is an async response
  } else {
    console.log("Unknown action received:", message.action);
    sendResponse({ status: "error", message: "Unknown action." });
  }
  return true;
});