# ANyONe Extension v2.0

A privacy-focused Chromium browser extension for managing SOCKS5 proxy connections to the ANyONe network.

## Features

### Connection Modes

#### Public Proxies Mode
- **One-click connect** to community-powered ANyONe proxy servers
- **Auto-selection** of the fastest available proxy
- **Load balancing** with "Next Proxy" button to switch servers
- **Multiple sources**: Arweave, GitBros, or GitHub
- **Automatic fallback**: If one source fails, tries the next automatically

#### Custom Proxy Mode
- **Full SOCKS5 configuration** with IP/hostname and port
- **Authentication support** for proxies requiring username/password
- **Test connection** before connecting

### Privacy & Security

| Feature | Description |
|---------|-------------|
| **WebRTC Leak Protection** | Prevents real IP leaks through WebRTC |
| **Kill Switch** | Blocks all traffic if proxy connection drops unexpectedly |
| **Local Network Access** | Toggle to allow/block access to local devices (printers, NAS, routers) while connected |
| **Bypass List** | Domains and IPs that skip the proxy

### Settings & Customization

- **Auto-connect on startup** - Automatically connect when browser starts
- **Default connection mode** - Choose Public or Custom as default
- **Proxy source selection** - Arweave (default), GitBros, or GitHub with automatic fallback
- **Update interval** - Manual, hourly, or periodic auto-updates of proxy list

### User Interface

- **Modern dark theme** with clean, intuitive design
- **Real-time status** showing connection state and current proxy
- **Quick actions** - Check IP, refresh proxies, access settings
- **Toast notifications** for instant feedback

## Installation

### Option 1: Clone with Git
```bash
git clone "https://git.debros.io/DeBros/anyone-extension.git"
```

### Option 2: Download ZIP
[Download ZIP](https://git.debros.io/DeBros/anyone-extension/archive/main.zip)

### Load in Browser
1. Open your Chromium-based browser (Chrome, Brave, Edge, etc.)
2. Navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked**
5. Select the extension folder containing `manifest.json`

## Usage

### Quick Start
1. Click the extension icon in your browser toolbar
2. Choose **Public** or **Custom** mode
3. Click the **Connect** button

### Public Proxies
- Automatically fetches and connects to community proxies
- Use **Next Proxy** to switch to a different server
- Click **Refresh** to update the proxy list

### Custom Proxy
1. Enter your SOCKS5 proxy IP/hostname and port
2. (Settings/Optional) Add username and password for authentication
3. (Settings/Optional) Configure bypass list for specific domains
4. Click **Test Connection** to verify, then **Connect**

### Check Your Connection
Click **Check IP** to verify your connection is routed through the ANyONe network.

## Proxy Sources

The extension fetches proxy lists from multiple sources with automatic fallback:

| Source | URL | Type |
|--------|-----|------|
| **Arweave** (Default) | [arweave.net/FjxfWIbS...](https://arweave.net/FjxfWIbSnZb7EaJWbeuWCsBBFWjTppfS3_KHxUP__B8) | Decentralized, permanent |
| **GitBros** | [git.debros.io/DeBros/anyone-proxy-list](https://git.debros.io/DeBros/anyone-proxy-list) | Self-hosted Git |
| **GitHub** | [github.com/DeBrosOfficial/anyone-proxy-list](https://github.com/DeBrosOfficial/anyone-proxy-list) | Centralized backup |

**Fallback order:** Arweave → GitBros → GitHub

## Privacy Settings Explained

### WebRTC Leak Protection
WebRTC can expose your real IP even when using a proxy. Enable this to prevent leaks.

### Kill Switch
When enabled, if your proxy connection drops unexpectedly, all internet traffic will be blocked until you reconnect or disable the kill switch. This prevents accidental exposure of your real IP.

### Local Network Access
- **Enabled (default)**: Access local devices (192.168.x.x, 10.x.x.x, .local domains) directly
- **Disabled**: All traffic goes through proxy, local devices unreachable

## Technical Details

- **Manifest V3** compliant
- **SOCKS5** proxy protocol
- **Chrome Proxy API** for system-level proxy configuration
- **Chrome Privacy API** for WebRTC protection

## Contributing

Contributions are welcome! Please fork the repository and submit pull requests.

For questions or discussion, join us on [Telegram](https://t.me/debrosportal).

---

## Optional: Secure DNS Configuration

Enhance your privacy by using secure DNS servers:

### Recommended DNS Providers

| Provider | IPv4 | Features |
|----------|------|----------|
| **Cloudflare** | 1.1.1.1, 1.0.0.1 | Fast, no logging, DoH/DoT |
| **Quad9** | 9.9.9.9, 149.112.112.112 | Malware protection, no logging |
| **Mullvad** | 194.242.2.2 | Full privacy, no logging |
| **AdGuard** | 94.140.14.14, 94.140.15.15 | Ad blocking, no logging |

---

## ANyONe Protocol Resources

- [Linux Connection Guide](https://docs.anyone.io/connect/connecting-to-linux)
- [macOS Connection Guide](https://docs.anyone.io/connect/connecting-to-macos)
- [Windows Connection Guide](https://docs.anyone.io/connect/connecting-to-windows)
- [Relay Setup Guide](https://docs.anyone.io/relay)
- [Hardware Setup Guide](https://docs.anyone.io/hardware)

---

<div align="center">

**Created by [DeBros](https://debros.io)** | **Version 2.0.0**

[![Support DeBros](https://img.shields.io/badge/Support-DeBros-cyan?style=for-the-badge)](https://debros.io/donate)

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
