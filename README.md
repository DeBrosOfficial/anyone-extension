# ANyONe Extension - Manage Socks5 Proxy Settings

## Overview
**The ANyONe Proxy Extension** is a powerful Chromium-based browser extension designed to help users manage and switch between different proxy settings effortlessly. It offers:

- **Quick access** through the browser's toolbar.
- **Detailed control** via an options page.

Additionally, the extension features a **dApp Store**, enabling users to access decentralized applications directly from the extension. **This tool also simplifies access to the Socks5 Proxy of your official ANyONe router.** Created by DeBros, it is a community-driven project and **not an official ANyONe product**.

**Note:** It's recommended to leverage local Socks5 Proxies within our internal network for optimal security and performance. Always confirm you are within the ANyONe network by pressing the 'Check ANyONe' button.

## 
<p align="center">
<img src="https://git.debros.io/DeBros/anyone-extension/raw/branch/main/images/screenshot.jpg" alt="Alt Text" width="800">
</p>

## Features

### 1. Quick Proxy Toggle
- **Enable/Disable Proxy**: A toggle switch in the popup allows users to quickly turn the proxy on or off.
- **Public Proxies**: 
  - **Default Activation**: Automatically uses community-contributed public proxy servers when no custom settings are applied.
  - **Dynamic List**: Easily update the proxy list with a dedicated button within the extension.

### 2. Custom Proxy Settings via Options Page

- **Access Custom Settings**: Users can configure custom proxies by navigating to the options page.
- **Host and Port**: Specify the host IP and port number for your custom proxy.
- **No Proxy Exceptions**: Define specific websites or local addresses where the proxy should not be applied.
- **Detailed Configuration**: The options page allows for:
  - Setting up custom proxy configurations.
  - Managing exceptions to proxy use.
  - Saving and applying changes for a tailored browsing experience.

### 3. Proxy Status Indication
- **Status Messages**: The extension provides clear feedback on the current proxy status both in the popup and options page, including:
  - Whether a proxy is enabled or disabled.
  - The type of proxy in use (public or custom).
  - The specific host and port being routed through.

### 4. External Links
- **Check ANyONe**: A button to directly check the external IP and proxy status via the ANyONe service.
- **Credits**: Links to the developer's website and the GitHub repository for the extension.
- **Popup**: Links to the developer's website, X account, GitHub repository for the extension, and ANyONe website.

## Usage

### Enabling/Disabling Proxy
- Click the extension icon to open the popup.
- Use the toggle switch to enable or disable the proxy. 
- The status message will update to reflect the current state.

### Public Proxies:

- **Default Usage**: When no custom settings are specified, the extension automatically uses public proxy servers, which are contributed and maintained by the ANyONe community.
- **Update Mechanism**: You can easily refresh the proxy list directly within the extension using an update button.
- **View Proxies**: To see the current list of community-powered public proxies, visit [https://github.com/DeBrosOfficial/ANyONe-Proxy-List](https://github.com/DeBrosOfficial/ANyONe-Proxy-List).

### Setting a Custom Proxy
- Navigate to the options page by clicking the "Custom Settings" button in the popup.
- Enter the Host IP and Port for your custom proxy.
- Optionally, specify IP addresses or domains that should bypass the proxy in the "No Proxy for" field.
- Click "Save & Enable" to apply your settings.

### Disabling the Proxy
- From the options page, click "Disable" to turn off the proxy settings, or from the popup, turn the toggle off.

### Accessing the dApp Store
- Click the "dApp Store" button in the popup to open the dApp Store page.
- The dApp Store page will display available decentralized applications.

## Installation

### 1. Clone or Download the Repository
You have two options to get the extension on your system:

- **Option A: Clone with Git**
  ```bash
  git clone "https://github.com/DeBrosOfficial/ANyONe-Extension.git" 
  ```

- **Option B: [Download ZIP](https://github.com/DeBrosOfficial/ANyONe-Extension/archive/refs/heads/main.zip)**

### 2. Load Unpacked Extension in Chromium-based Browser
- Open your browser and navigate to the extensions page.
- Enable "Developer mode".
- Depending on your method in step 1:
  - If you cloned the repository, click "Load unpacked" and select the cloned directory containing the `manifest.json` file.
  - If you downloaded and unpacked, drag and drop the unpacked folder into the extensions window.
 
## Contribution
Contributions are welcome! Please fork the repository and submit pull requests for any enhancements or bug fixes.

For questions or further discussion, reach out to us on <a href="https://t.me/debrosportal" target="_blank">Telegram</a>
 
---

# Optional: Enhancing Security with Custom DNS Configuration

Manually configuring your network's DNS can significantly boost your online privacy and security. Below, you'll find a selection of well-regarded, secure DNS servers that provide enhanced protection and privacy features:

## Cloudflare DNS (1.1.1.1)

- **IPv4**: 1.1.1.1 and 1.0.0.1
- **IPv6**: 2606:4700:4700::1111 and 2606:4700:4700::1001
- **Features**: Fast performance, does not log DNS queries, supports DNS over HTTPS (DoH) and DNS over TLS (DoT).
- **Website**: [https://1.1.1.1/dns](https://1.1.1.1/dns)

## Quad9 (9.9.9.9)

- **IPv4**: 9.9.9.9 and 149.112.112.112
- **IPv6**: 2620:fe::9 and 2620:fe::fe:9
- **Features**: Offers protection against malware and phishing, privacy with no logging of DNS queries. Supports DoT.
- **Website**: [https://quad9.net](https://quad9.net)

## Mullvad DNS

- **IPv4**: 194.242.2.1 and 194.242.2.2
- **IPv6**: 2a07:e340::1 and 2a07:e340::2
- **Features**: Complete privacy with no logging, supports DoH and DoT. Ideal for users concerned with anonymity.
- **Website**: [https://mullvad.net/en](https://mullvad.net/en)

## AdGuard DNS

- **IPv4**: 94.140.14.14 and 94.140.15.15 (without filters), 176.103.130.130 and 176.103.130.131 (with filters)
- **IPv6**: 2a10:50c0::ad1:ff and 2a10:50c0::ad2:ff (without filters), 2a10:50c0::bad1:ff and 2a10:50c0::bad2:ff (with filters)
- **Features**: Provides protection against ads, trackers, and phishing, as well as privacy with no logging.
- **Website**: [https://adguard-dns.io](https://adguard-dns.io)

## How to Configure:

- **For Windows**: Go to "Settings" > "Network & Internet" > "Change adapter options", right-click on your connection, select "Properties", then select "Internet Protocol Version 4 (TCP/IPv4)" or "Internet Protocol Version 6 (TCP/IPv6)" and enter the DNS addresses you want.
- **For macOS**: Navigate to "System Preferences" > "Network", select your connection, click on the "Advanced" button, go to the "DNS" tab, and add your DNS addresses.
- **For Linux**: Depending on the distribution, you can usually modify the `/etc/resolv.conf` file to add DNS addresses.
- **For Routers**: You'll typically find DNS settings in the advanced settings of your router. This will change the DNS for all devices connected to the network.

---

# ANyONe Protocol: Connection and Setup Guide

**About ANyONe Protocol**: ANyONe is a decentralized network protocol focused on providing privacy, security, and freedom on the internet. Whether you're looking to browse anonymously or secure your online communications, ANyONe offers versatile solutions for different needs.

Explore multiple ways to interact with the ANyONe, whether you're connecting directly from your OS, setting up your own relay for personalized control, or using dedicated hardware for an optimized experience. Here's your guide:

- **Linux**: Enjoy a seamless one-click setup. Learn more in the [Linux Connection Guide](https://docs.anyone.io/connect/connecting-to-linux).
- **macOS**: Connect easily with or without npm. Check the [macOS Connection Guide](https://docs.anyone.io/connect/connecting-to-macos).
- **Windows**: Benefit from a straightforward one-click setup. See the [Windows Connection Guide](https://docs.anyone.io/connect/connecting-to-windows).

**Setting Up Your Own Relay**: For those interested in customizing your network participation or contributing to the ANyONe ecosystem, follow the [Relay Setup Guide](https://docs.anyone.io/relay).

**Dedicated Hardware**: For a user-friendly, plug-and-play experience, ANyONe offers specialized hardware like the Anyone Router. This hardware is designed for non-technical users to contribute to and use the network seamlessly, offering:

  - **Ease of Use**: Power on, connect to Wi-Fi or Ethernet, and earn tokens for contributing your bandwidth.
  - **Security**: Includes custom components like encryption chips similar to those in hardware wallets.
  - **Diversity**: Enhances network coverage across various ISPs and introduces more independent operators.

  Check out the [Hardware Setup Guide](https://docs.anyone.io/hardware) or visit [Anyone Hardware](https://www.anyone.io/hardware) to learn more and pre-order.

---

###

<br clear="both">

<div align="center">
  <a href="https://linktr.ee/debrosofficial" target="_blank">
    <img src="https://img.shields.io/static/v1?message=Linktree&logo=linktree&label=&color=1de9b6&logoColor=white&labelColor=&style=for-the-badge" height="35" alt="linktree logo" />
  </a>
  <a href="https://x.com/debrosofficial" target="_blank">
    <img src="https://img.shields.io/static/v1?message=Twitter&logo=twitter&label=&color=1DA1F2&logoColor=white&labelColor=&style=for-the-badge" height="35" alt="twitter logo" />
  </a>
  <a href="https://t.me/debrosportal" target="_blank">
    <img src="https://img.shields.io/static/v1?message=Telegram&logo=telegram&label=&color=2CA5E0&logoColor=white&labelColor=&style=for-the-badge" height="35" alt="telegram logo" />
  </a>
  <a href="https://www.youtube.com/@DeBrosOfficial" target="_blank">
    <img src="https://img.shields.io/static/v1?message=Youtube&logo=youtube&label=&color=FF0000&logoColor=white&labelColor=&style=for-the-badge" height="35" alt="youtube logo" />
  </a>
</div>

###
