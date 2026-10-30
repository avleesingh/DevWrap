# DevWrap Desktop Companion App (Tauri v2 + Axum + Rust)

The DevWrap Desktop Companion App is a lightweight, local-first background daemon and desktop application built with **Tauri v2**, **Axum**, and **active-win-pos-rs**.

It provides private, local telemetry for developer IDEs (Cursor, VS Code, JetBrains, Postman, Terminal) to the DevWrap Chrome Extension without relying on third-party cloud APIs.

---

## ⚡ Architecture & Features

1. **Active Window Poller Loop (`15s` interval)**:
   - Uses `active-win-pos-rs` (v0.11) to inspect system active windows.
   - Filters processes against the monitored inclusion list:
     ```json
     ["cursor", "code", "terminal", "iterm2", "alacritty", "warp", "postman", "docker", "jetbrains"]
     ```
   - Stores recorded telemetry heartbeats in a thread-safe `Arc<Mutex<Vec<DevAppHeartbeat>>>`.

2. **Local Axum HTTP Web Server (`127.0.0.1:8080`)**:
   - Boots up on port 8080 alongside Tauri.
   - Configured with permissive CORS headers accepting requests from Chrome Extension origins (`chrome-extension://*`).
   - `GET /health` &rarr; Returns `{ "status": "ok", "version": "1.0.0" }`.
   - `GET /stats` &rarr; Returns JSON array of recorded local desktop app heartbeats.

3. **Chrome Extension Integration**:
   - The DevWrap Chrome Extension runs an automated health check loop every 5 seconds against `http://localhost:8080/health`.
   - When the companion is running, the extension UI badge automatically switches from `● Disconnected` to `● Live Sync Active`.

---

## 🛠️ Development & Running

### Prerequisites
- Node.js (`v22+`) & npm
- Rust (`1.80+`) & Cargo

### Run in Development
```bash
cd desktop
npm run tauri dev
```

### Build Binary
```bash
cd desktop/src-tauri
cargo build
```
Executable will be generated at `desktop/src-tauri/target/debug/devwrap-desktop`.

### Build the macOS installer for users

```bash
cd desktop
npm run bundle:macos
```

This produces a DMG under `desktop/src-tauri/target/release/bundle/dmg/`. Publish the
signed and notarized DMG in a GitHub Release, then set `DESKTOP_COMPANION_DMG_URL` in
`popup.js` to its direct release-asset URL, for example
`https://github.com/your-github-username/devwrap/releases/latest/download/DevWrap-Desktop-Companion-macos.dmg`.
Until that URL is configured, the extension shows local setup instructions instead of
opening a broken download link. After a user installs the app in Applications and opens it once, the
companion registers itself to launch at login and continues running from the menu bar.

---

## 🔌 API Endpoints

### 1. `GET /health`
```bash
curl -i http://127.0.0.1:8080/health
```
**Response**:
```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

### 2. `GET /stats`
```bash
curl -i http://127.0.0.1:8080/stats
```
**Response**:
```json
[
  {
    "app_name": "Cursor",
    "title": "DevWrap — popup.js",
    "process_id": 48120,
    "matched_filter": "cursor",
    "timestamp": 1729112400,
    "duration_seconds": 15
  }
]
```
