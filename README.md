# DevWrap - Dev Stack Value & Time Tracker (Chrome Extension MV3)

DevWrap is a developer-centric, privacy-first Manifest V3 Chrome Extension that tracks active time spent across both **Web Browser Tools** (Claude, ChatGPT, Figma, Vercel) and **Desktop IDEs** (Cursor, VS Code, JetBrains, Postman, Terminal) using a **Hybrid Telemetry Model** to calculate your true **Effective Hourly ROI**.

DevWrap eliminates subscription sprawl, monitors wasted software spend, and gives developers actionable insights into their engineering toolchain.

---

## ⚡ Key Features

- **First-Time "Companion First" Onboarding Flow**:
  - Automatically displays `#onboardingView` for new users when the desktop companion is not detected on first launch.
  - Highlights private IDE telemetry for Cursor, VS Code, and Terminal with prominent download CTA (`📥 Download Desktop Companion`).
  - Active auto-pairing listener detects background daemon on `127.0.0.1:8080/health`, shows `✅ Desktop Companion Paired!`, and automatically transitions to the dashboard.
  - Secondary skip option (`Skip for now (Track Web-Only Tools)`) allows immediate dashboard access while enabling companion pairing at any time.
- **Hybrid Telemetry Model**:
  - **Web Tools**: Automatically tracks active time on developer web tabs (`chrome.tabs.onActivated`, `chrome.tabs.onUpdated`).
  - **Desktop Companion App**: Integrates with a local, zero-dependency background daemon (`http://127.0.0.1:8080`) to capture active local coding time in Cursor, VS Code, and Terminal with 100% privacy and zero third-party cloud APIs.
  - **Automated Health Check Loop**: Real-time 5-second polling of `http://127.0.0.1:8080/health` seamlessly updates the status badge between `● Disconnected` (slate-500) and `● Live Sync Active` (emerald-400 with a pulse animation).
  - **Desktop Stats Ingestion**: Polls `http://127.0.0.1:8080/stats` to ingest active heartbeats for Cursor, VS Code, Terminal, Postman, etc., updating each tool card in `chrome.storage.local`.
  - **Unified Stack ROI**: Merges desktop IDE hours with web tab hours to provide a single, unified view of engineering time and software costs.
- **Synchronized Global Monthly Drop & Lock System**:
  - **Strict Drop Day Lock (1st of Month 00:00 - 23:59 UTC)**: The "Dev Stack Wrapped" experience is exclusively unlocked on the 1st of every month. On days 2 through 31, the trigger transitions to a locked state: `"🔒 Next Stack Wrapped Unlocks in [Days]d [Hours]h"`.
  - **Live Countdown Timer Engine**: Computes exact time remaining until 00:00 UTC on the 1st of the upcoming month and renders a real-time ticking clock (`14d : 08h : 14m : 22s`).
  - **Local Data Privacy Shield**: While locked, hides raw monthly stack totals and specific hourly rates in the Wrapped modal view to build anticipation for the drop moment, keeping passive background tracking 100% private in local storage.
  - **Dual-State Container UI**:
    * **State A (Locked - Days 2-31)**: Dark translucent card with a glowing lock icon, dynamic month badge (`🔒 OCTOBER STACK WRAPPED LOCKED`), and live ticking countdown clock.
    * **State B (Unlocked - 1st of Month)**: Radiant emerald action button (`✨ OPEN YOUR DEV STACK WRAPPED CARD!`) with animated notification ping.
  - **High-Contrast 16:9 Terminal Card**: Renders top producer tool with hourly rate, unified web + desktop breakdown, and developer persona badges (e.g. *10x Code Artisan*, *AI Prompt Architect*, *Full-Stack Polymath*).
  - **Copyable Social Formatters**: One-click copy buttons formatted specifically for **X (Twitter)** and **LinkedIn**.
  - **Global Drop Notifications & Badge Alert**: On the 1st of every month at 00:00 UTC, triggers native OS alert (`🔒 Your Monthly Dev Stack Wrapped is UNLOCKED!`) and sets the toolbar icon badge text to `DROP`.
- **Smart Idle & Focus Engine**:
  - Excludes inactive and idle time using `chrome.idle` configured with an exact **120-second threshold** (pausing accumulation after 2 minutes of inactivity).
  - Pauses tracking immediately when switching away from the browser window (`chrome.windows.onFocusChanged`).
  - Periodic heartbeat via `chrome.alarms` flushes active seconds to prevent data loss.
- **Developer Presets**:
  - 1-click quick-add presets for popular developer tools: **Claude**, **Cursor**, **ChatGPT**, **GitHub Copilot**, **Vercel**, and **Figma**.
- **100% Local Privacy**:
  - All metrics, connection flags, and subscription records are stored locally in `chrome.storage.local`. Zero third-party tracker servers.

---

## 📁 Project Architecture

```
Extension/
├── manifest.json        # Chrome Extension Manifest V3 (MV3) configuration
├── background.js       # Web tracking, 5s health loop, stats ingestion & alarms
├── popup.html          # Developer-centric dark dashboard UI with Companion status card
├── popup.css           # Premium Tailwind-compatible dark dashboard styling
├── popup.js            # Controller, live health check, stats ingestion & wrapped generator
├── desktop/            # Tauri v2 Desktop Companion App
│   ├── src-tauri/      # Rust backend (Axum server on 127.0.0.1:8080 + active-win-pos-rs poller)
│   ├── src/            # TypeScript / Vite desktop frontend
│   └── package.json    # Companion npm configuration
├── icons/              # Extension icons (16x16, 48x48, 128x128)
└── README.md           # Project overview and usage guide
```

---

## 🛠️ Installation & Setup

1. Open Google Chrome and go to `chrome://extensions`.
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked** in the top left toolbar.
4. Select the directory:
   ```
   /Users/avleesingh/Desktop/Extension
   ```
5. Pin **DevWrap** to your Chrome toolbar for quick access.

---

## 💻 Running the Desktop Companion App

1. In your terminal, navigate to the desktop directory:
   ```bash
   cd desktop
   npm run tauri dev
   ```
   *Or run the precompiled binary:*
   ```bash
   ./desktop/src-tauri/target/debug/devwrap-desktop
   ```
2. The companion starts the Axum HTTP server on `http://127.0.0.1:8080`.
3. DevWrap automatically performs a health check every 5 seconds on:
   ```
   http://127.0.0.1:8080/health
   ```
4. When the companion daemon returns `{ "status": "ok" }`, the indicator switches dynamically to:
   - 🟢 `● Live Sync Active` (pulsating emerald indicator)
   - Telemetry from `http://127.0.0.1:8080/stats` is automatically ingested into your tool cards.
5. If the daemon is stopped or offline, the indicator gracefully displays:
   - ⚪ `● Disconnected`

---

## 📊 ROI Tier Calculations

$$\text{Effective Cost Per Hour} = \frac{\text{Monthly Tool Cost}}{\text{Combined Active Hours (Web Tab Hours + Desktop IDE Hours)}}$$

- 🟢 **High ROI** (`< $2.00 / hr`): Outstanding productivity return.
- 🟡 **Moderate** (`$2.00 – $10.00 / hr`): Healthy utilization.
- 🔴 **Waste Alert** (`> $10.00 / hr` or `0 hours`): Under-utilized subscription alerting you to cancel or downgrade.
