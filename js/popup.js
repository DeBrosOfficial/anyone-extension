document.addEventListener("DOMContentLoaded", () => {
  const proxyToggle = document.getElementById("proxyToggle");
  const statusMessage = document.getElementById("statusMessage");
  const optionsButton = document.getElementById("optionsButton");
  const checkAnyoneButton = document.getElementById("checkAnyoneButton");
  const dappStoreButton = document.getElementById("dappStoreButton");
  const updateProxiesButton = document.getElementById("updateProxiesButton");

  if (!checkAnyoneButton) {
    checkAnyoneButton = document.createElement("button");
    checkAnyoneButton.id = "checkAnyoneButton";
    checkAnyoneButton.textContent = "Check ANyONe";
    checkAnyoneButton.style.marginBottom = "10px";
    checkAnyoneButton.addEventListener("click", () => {
      window.open("https://check.en.anyone.tech/", "_blank");
    });
  }

  if (!dappStoreButton) {
    dappStoreButton = document.createElement("button");
    dappStoreButton.id = "dappStoreButton";
    dappStoreButton.textContent = "dApp Store";
    dappStoreButton.style.marginBottom = "10px";
    dappStoreButton.addEventListener("click", () => {
      const storeUrl = chrome.runtime.getURL("store.html");
      chrome.tabs.create({ url: storeUrl });
    });
  }

  if (updateProxiesButton) {
    updateProxiesButton.addEventListener("click", () => {
      console.log("Update Proxies button clicked in popup.js");
      statusMessage.textContent = "Updating proxies...";
      statusMessage.style.color = "#f39c12"; // Orange for loading
      chrome.runtime.sendMessage({ action: "updateProxies" }, (response) => {
        if (response && response.success) {
          console.log('Proxy list update was successful');
          statusMessage.textContent = 'Proxies updated successfully!';
          statusMessage.style.color = "#2ecc71"; // Green for success
        } else {
          console.log('Proxy list update failed');
          statusMessage.textContent = 'Failed to update proxies.';
          statusMessage.style.color = "#e74c3c"; // Red for failure
        }
        // Clear the update message after 3 seconds and reinitialize the UI
        setTimeout(() => {
          initializeUI();
        }, 3000);
      });
    });
  }

  const buttonContainer = document.querySelector(".button-container");
  if (buttonContainer) {
    buttonContainer.innerHTML = ''; 
    buttonContainer.appendChild(optionsButton);
    buttonContainer.appendChild(dappStoreButton);
    buttonContainer.appendChild(updateProxiesButton);
  }

  if (statusMessage && !checkAnyoneButton.parentNode) {
    statusMessage.parentNode.insertBefore(checkAnyoneButton, statusMessage.nextSibling);
  }

  function updateStatusMessage(isEnabled, proxyType, proxy) {
    if (isEnabled) {
      if (proxyType === "custom") {
        statusMessage.textContent = `Custom Proxy is ENABLED and routing through ${proxy.host}:${proxy.port}`;
        statusMessage.style.color = "#2ecc71"; // Green for custom
      } else {
        statusMessage.textContent = `Public Proxy is ENABLED and routing through ${proxy.host}:${proxy.port}`;
        statusMessage.style.color = "#03bdc5"; // Blue for public
      }
    } else {
      statusMessage.textContent = "Proxy is DISABLED";
      statusMessage.style.color = "#e74c3c";
    }
  }

  function updateUI(isEnabled, proxyType, proxy) {
    proxyToggle.checked = isEnabled;
    updateStatusMessage(isEnabled, proxyType, proxy);
  }

  function updateStatusFromBackground(data) {
    statusMessage.textContent = data.message;
    statusMessage.style.color = data.color;
    setTimeout(() => {
      statusMessage.textContent = "";
      initializeUI(); // Reinitialize the UI to show the current status
    }, 3000);
  }

  // Initialize the toggle state
  function initializeUI() {
    chrome.storage.local.get(["proxyEnabled", "proxyType", "currentProxy", "proxyIP", "proxyPort"], (data) => {
      const isEnabled = data.proxyEnabled || false;
      const proxyType = data.proxyType || "public";
      const currentProxy = proxyType === "custom" 
        ? { host: data.proxyIP || "127.0.0.1", port: data.proxyPort || 9050 } 
        : (data.currentProxy || { host: "82.208.21.140", port: 9052 }); // Default public Proxy

      updateUI(isEnabled, proxyType, currentProxy);
    });
  }

  initializeUI();

  proxyToggle.addEventListener("change", () => {
    const isEnabled = proxyToggle.checked;

    if (isEnabled) {
      chrome.storage.local.get(["proxyType"], (data) => {
        if (data.proxyType === "custom") {
          chrome.storage.local.get(["proxyIP", "proxyPort"], (settings) => {
            chrome.runtime.sendMessage({ action: "updateProxy", type: "custom", proxy: { host: settings.proxyIP, port: settings.proxyPort } }, (response) => {
              if (response && response.status === "enabled") {
                updateUI(true, "custom", { host: settings.proxyIP, port: settings.proxyPort });
              } else {
                alert("Failed to enable custom proxy. Please try again.");
                proxyToggle.checked = false; 
                initializeUI(); 
              }
            });
          });
        } else {
          chrome.runtime.sendMessage({ action: "enableProxy" }, (response) => {
            if (response && response.status === "enabled" && response.proxy) {
              chrome.storage.local.set({ proxyEnabled: true, currentProxy: response.proxy, proxyType: "public" });
              updateUI(true, "public", response.proxy);
            } else {
              alert(response.message || "Failed to enable public proxy. Please try again.");
              proxyToggle.checked = false; 
              initializeUI(); 
            }
          });
        }
      });
    } else {
      chrome.runtime.sendMessage({ action: "disableProxy" }, (response) => {
        if (response && response.status === "disabled") {
          chrome.storage.local.set({ proxyEnabled: false, proxyType: null });
          updateUI(false);
        } else {
          alert("Failed to disable proxy. Please try again.");
          proxyToggle.checked = true; 
          initializeUI(); 
        }
      });
    }
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "updatePopupState" || message.action === "disableProxy") {
      initializeUI();
    } else if (message.action === "showLoadingMessage") {
      statusMessage.textContent = message.message;
      statusMessage.style.color = "#f39c12"; // Orange for loading
    } else if (message.action === "updateStatus") {
      updateStatusFromBackground(message);
    } else if (message.action === "toggleOff") {
      // This is for when a proxy setup fails
      proxyToggle.checked = false;
      statusMessage.textContent = "Failed to set up proxy. Please check your settings.";
      statusMessage.style.color = "#e74c3c"; // Red for error
      // You might want to clear this message after some time or on interaction
      setTimeout(() => {
        statusMessage.textContent = "";
      }, 5000); // Clear after 5 seconds
    }
  });

  // Open options page
  optionsButton.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  // Open Check Anyone page
  checkAnyoneButton.addEventListener("click", () => {
    window.open("https://check.en.anyone.tech/", "_blank");
  });

  // Open dApp Store page
  dappStoreButton.addEventListener("click", () => {
    const storeUrl = chrome.runtime.getURL("html/store.html");
    chrome.tabs.create({ url: storeUrl });
  });
});