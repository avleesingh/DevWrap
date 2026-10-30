use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use active_win_pos_rs::get_active_window;
use axum::{
    extract::State,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use sysinfo::System;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::Manager;
use tower_http::cors::{Any, CorsLayer};

/// Recorded heartbeat for a monitored developer application
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DevAppHeartbeat {
    pub app_name: String,
    pub title: String,
    pub process_id: u64,
    pub matched_filter: String,
    pub timestamp: u64,
    pub duration_seconds: u64,
}

/// Health check response payload
#[derive(Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub version: &'static str,
}

/// Discovered running system process or application window
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DiscoveredProcess {
    pub name: String,
    pub process: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
}

pub type HeartbeatStore = Arc<Mutex<Vec<DevAppHeartbeat>>>;
pub type FilterStore = Arc<Mutex<Vec<String>>>;

/// Default popular developer tool process filters
const DEFAULT_FILTERS: &[&str] = &[
    "cursor",
    "code",
    "terminal",
    "iterm2",
    "alacritty",
    "warp",
    "postman",
    "docker",
    "jetbrains",
    "antigravity",
];

/// Shared Axum application state
#[derive(Clone)]
pub struct AppState {
    pub heartbeats: HeartbeatStore,
    pub filters: FilterStore,
}

/// Helper to get local persistence path for filters
fn get_filters_file_path() -> std::path::PathBuf {
    if let Ok(home) = std::env::var("HOME") {
        std::path::PathBuf::from(home).join(".devwrap_filters.json")
    } else {
        std::path::PathBuf::from("devwrap_filters.json")
    }
}

/// The former companion stored user filters under the previous product name.
/// Keep this read-only migration path so upgrades do not discard that watchlist.
fn get_legacy_filters_file_path() -> std::path::PathBuf {
    if let Ok(home) = std::env::var("HOME") {
        std::path::PathBuf::from(home).join(".subroi_filters.json")
    } else {
        std::path::PathBuf::from("subroi_filters.json")
    }
}

/// Loads persisted process filters or returns defaults
fn load_persisted_filters() -> Vec<String> {
    let path = get_filters_file_path();
    if path.exists() {
        if let Ok(content) = std::fs::read_to_string(&path) {
            if let Ok(filters) = serde_json::from_str::<Vec<String>>(&content) {
                if !filters.is_empty() {
                    println!(
                        "[DevWrap Companion] Loaded {} process filters from {:?}",
                        filters.len(),
                        path
                    );
                    return filters;
                }
            }
        }
    }

    let legacy_path = get_legacy_filters_file_path();
    if legacy_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&legacy_path) {
            if let Ok(filters) = serde_json::from_str::<Vec<String>>(&content) {
                if !filters.is_empty() {
                    save_persisted_filters(&filters);
                    println!(
                        "[DevWrap Companion] Migrated {} process filters to {:?}",
                        filters.len(),
                        path
                    );
                    return filters;
                }
            }
        }
    }

    let defaults: Vec<String> = DEFAULT_FILTERS.iter().map(|&s| s.to_string()).collect();
    save_persisted_filters(&defaults);
    println!(
        "[DevWrap Companion] Initialized default process filters: {:?}",
        defaults
    );
    defaults
}

/// Persists process filters to local JSON file
fn save_persisted_filters(filters: &[String]) {
    let path = get_filters_file_path();
    if let Ok(json) = serde_json::to_string_pretty(filters) {
        if let Err(e) = std::fs::write(&path, json) {
            eprintln!("[DevWrap Companion] Failed to persist filters to {:?}: {}", path, e);
        } else {
            println!("[DevWrap Companion] Successfully saved filters to {:?}", path);
        }
    }
}

/// Normalize string by stripping whitespace and non-alphanumeric chars for robust matching
pub fn normalize_for_match(s: &str) -> String {
    s.to_lowercase()
        .chars()
        .filter(|c| c.is_alphanumeric())
        .collect()
}

/// Extract clean process identifier from app name and executable path
pub fn extract_filter_from_name(name: &str, exe_path: &str) -> String {
    let name_lower = name.to_lowercase();
    let exe_lower = exe_path.to_lowercase();
    let norm_name = normalize_for_match(&name_lower);
    let norm_exe = normalize_for_match(&exe_lower);

    if norm_name.contains("visualstudiocode") || norm_exe.contains("visualstudiocode") || norm_name == "code" || norm_exe.ends_with("/code") {
        return "code".to_string();
    }
    if norm_name.contains("cursor") || norm_exe.contains("cursor") {
        return "cursor".to_string();
    }
    if norm_name.contains("antigravity") || norm_exe.contains("antigravity") {
        return "antigravity".to_string();
    }
    if norm_name.contains("iterm") || norm_exe.contains("iterm") {
        return "iterm2".to_string();
    }
    if norm_name.contains("alacritty") || norm_exe.contains("alacritty") {
        return "alacritty".to_string();
    }
    if norm_name.contains("warp") || norm_exe.contains("warp") {
        return "warp".to_string();
    }
    if norm_name.contains("terminal") || norm_exe.contains("terminal") {
        return "terminal".to_string();
    }
    if norm_name.contains("postman") || norm_exe.contains("postman") {
        return "postman".to_string();
    }
    if norm_name.contains("docker") || norm_exe.contains("docker") {
        return "docker".to_string();
    }
    if norm_name.contains("figma") || norm_exe.contains("figma") {
        return "figma".to_string();
    }
    if norm_name.contains("tableplus") || norm_exe.contains("tableplus") {
        return "tableplus".to_string();
    }
    if norm_name.contains("intellij") || norm_name.contains("pycharm") || norm_name.contains("webstorm") || norm_name.contains("clion") || norm_name.contains("rider") || norm_name.contains("goland") {
        return "jetbrains".to_string();
    }

    // Default: clean lowercase alphanumeric string
    let clean: String = name_lower
        .chars()
        .take_while(|c| !c.is_whitespace())
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_')
        .collect();
    if clean.is_empty() {
        "app".to_string()
    } else {
        clean
    }
}

/// Inspect active/running applications on the user's OS and return unique process records
pub fn discover_running_processes() -> Vec<DiscoveredProcess> {
    let mut results: Vec<DiscoveredProcess> = Vec::new();
    let mut seen_processes = std::collections::HashSet::new();

    // 1. Current active window if available
    if let Ok(window) = get_active_window() {
        let app_name = window.app_name.trim().to_string();
        if !app_name.is_empty() {
            let filter = extract_filter_from_name(&app_name, &window.process_path.to_string_lossy());
            if !filter.is_empty() {
                seen_processes.insert(filter.clone());
                results.push(DiscoveredProcess {
                    name: app_name,
                    process: filter,
                    title: if window.title.trim().is_empty() { None } else { Some(window.title.trim().to_string()) },
                });
            }
        }
    }

    // 2. Discover running processes across the OS via sysinfo
    let mut sys = System::new();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

    for (_pid, proc) in sys.processes() {
        let raw_name = proc.name().to_string_lossy().trim().to_string();
        let exe_path = proc.exe().map(|p| p.to_string_lossy().into_owned()).unwrap_or_default();

        let is_helper = raw_name.contains("Helper")
            || raw_name.contains("Crashpad")
            || raw_name.contains("crashpad")
            || raw_name.contains("xpc")
            || raw_name.contains("Renderer")
            || raw_name.contains("Plugin")
            || raw_name.contains("GPU")
            || raw_name.starts_with("com.apple.");

        if is_helper {
            continue;
        }

        let is_user_app = exe_path.contains(".app")
            || exe_path.contains("/Applications")
            || exe_path.contains("/Users/")
            || raw_name.contains("Code")
            || raw_name.contains("Cursor")
            || raw_name.contains("Antigravity")
            || raw_name.contains("Terminal")
            || raw_name.contains("Postman")
            || raw_name.contains("Docker");

        if !is_user_app && (exe_path.starts_with("/System") || exe_path.starts_with("/usr/libexec") || exe_path.starts_with("/usr/sbin")) {
            continue;
        }

        let friendly_name = if exe_path.contains(".app") {
            exe_path
                .split('/')
                .find(|part| part.ends_with(".app"))
                .map(|part| part.trim_end_matches(".app"))
                .unwrap_or(&raw_name)
                .to_string()
        } else {
            raw_name.clone()
        };

        if friendly_name.is_empty() || friendly_name.starts_with('.') {
            continue;
        }

        let filter = extract_filter_from_name(&friendly_name, &exe_path);
        if filter.is_empty() {
            continue;
        }

        if seen_processes.insert(filter.clone()) {
            results.push(DiscoveredProcess {
                name: friendly_name,
                process: filter,
                title: None,
            });
        }
    }

    // Sort: items with active title first, then alphabetical by name
    results.sort_by(|a, b| {
        if a.title.is_some() && b.title.is_none() {
            std::cmp::Ordering::Less
        } else if a.title.is_none() && b.title.is_some() {
            std::cmp::Ordering::Greater
        } else {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
    });

    results
}

/// Window Poller Ingestion & Dynamic Filter Loop
/// Queries system active window every 15 seconds using active-win-pos-rs.
/// Filters process names using dynamic thread-safe inclusion list and stores heartbeats.
async fn run_window_poller(heartbeat_store: HeartbeatStore, filter_store: FilterStore) {
    println!("[DevWrap Companion] Active window poller loop started (15s interval)");

    loop {
        tokio::time::sleep(Duration::from_secs(15)).await;

        match get_active_window() {
            Ok(window) => {
                let app_name_lower = window.app_name.to_lowercase();
                let process_path_lower = window.process_path
                    .to_string_lossy()
                    .to_lowercase();

                let current_filters = {
                    let guard = filter_store.lock().unwrap();
                    guard.clone()
                };

                let norm_app = normalize_for_match(&app_name_lower);
                let norm_path = normalize_for_match(&process_path_lower);
                let norm_title = normalize_for_match(&window.title.to_lowercase());

                // Match against dynamic developer tool inclusion list using robust normalization
                if let Some(matched) = current_filters.iter().find(|filter| {
                    let f = filter.to_lowercase();
                    let norm_f = normalize_for_match(&f);

                    app_name_lower.contains(&f)
                        || process_path_lower.contains(&f)
                        || (!norm_f.is_empty() && (norm_app.contains(&norm_f) || norm_path.contains(&norm_f) || norm_title.contains(&norm_f)))
                        || (norm_f == "code" && (norm_app.contains("vscode") || norm_app.contains("visualstudiocode") || norm_app == "code"))
                        || (norm_f == "vscode" && (norm_app.contains("code") || norm_app.contains("visualstudiocode")))
                        || (norm_f == "terminal" && (norm_app.contains("iterm") || norm_app.contains("warp") || norm_app.contains("alacritty") || norm_app.contains("terminal")))
                }) {
                    let now = SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs();

                    let heartbeat = DevAppHeartbeat {
                        app_name: window.app_name.clone(),
                        title: window.title.clone(),
                        process_id: window.process_id,
                        matched_filter: matched.clone(),
                        timestamp: now,
                        duration_seconds: 15,
                    };

                    println!(
                        "[DevWrap Poller] Captured heartbeat: {} (Filter: {}, PID: {})",
                        heartbeat.app_name, heartbeat.matched_filter, heartbeat.process_id
                    );

                    let mut list = heartbeat_store.lock().unwrap();
                    list.push(heartbeat);
                }
            }
            Err(()) => {
                // Active window could not be read (e.g. screen locked or permission needed)
            }
        }
    }
}

/// GET /health endpoint
async fn handle_health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        version: "1.0.0",
    })
}

/// GET /stats endpoint returning JSON array of recorded local desktop app heartbeats
async fn handle_stats(State(state): State<AppState>) -> Json<Vec<DevAppHeartbeat>> {
    let heartbeats = state.heartbeats.lock().unwrap().clone();
    Json(heartbeats)
}

/// GET /filters endpoint returning JSON array of currently monitored process filters
async fn handle_get_filters(State(state): State<AppState>) -> Json<Vec<String>> {
    let filters = state.filters.lock().unwrap().clone();
    Json(filters)
}

/// Request payload for filter endpoints
#[derive(Debug, Deserialize)]
pub struct FilterRequest {
    pub filter: String,
}

/// POST /filters endpoint: accepts `{ "filter": "antigravity" }`, adds to watchlist and persists
async fn handle_post_filter(
    State(state): State<AppState>,
    Json(payload): Json<FilterRequest>,
) -> Json<Vec<String>> {
    let clean = payload.filter.trim().to_lowercase();
    let mut filters = state.filters.lock().unwrap();

    if !clean.is_empty() && !filters.iter().any(|f| f.to_lowercase() == clean) {
        println!("[DevWrap Companion] Adding new monitored filter: {}", clean);
        filters.push(clean);
        save_persisted_filters(&filters);
    }

    Json(filters.clone())
}

/// DELETE /filters and POST /filters/delete endpoint: accepts `{ "filter": "name" }`, removes and persists
async fn handle_delete_filter(
    State(state): State<AppState>,
    Json(payload): Json<FilterRequest>,
) -> Json<Vec<String>> {
    let clean = payload.filter.trim().to_lowercase();
    let mut filters = state.filters.lock().unwrap();

    let initial_len = filters.len();
    filters.retain(|f| f.trim().to_lowercase() != clean);

    if filters.len() != initial_len {
        println!("[DevWrap Companion] Removed monitored filter: {}", clean);
        save_persisted_filters(&filters);
    }

    Json(filters.clone())
}

/// GET /processes endpoint returning JSON array of running processes on the system
async fn handle_get_processes() -> Json<Vec<DiscoveredProcess>> {
    let procs = discover_running_processes();
    Json(procs)
}

/// Local Axum HTTP Web Server on 127.0.0.1:8080
async fn run_axum_server(state: AppState) {
    // Configure CORS to accept requests from Chrome extension origins (chrome-extension://*) and local clients
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/health", get(handle_health))
        .route("/stats", get(handle_stats))
        .route(
            "/filters",
            get(handle_get_filters)
                .post(handle_post_filter)
                .delete(handle_delete_filter),
        )
        .route("/filters/delete", post(handle_delete_filter))
        .route("/processes", get(handle_get_processes))
        .layer(cors)
        .with_state(state);

    let addr = std::net::SocketAddr::from(([127, 0, 0, 1], 8080));
    println!("[DevWrap Companion] Starting local Axum HTTP server on http://{}", addr);

    let mut listener = None;
    for attempt in 1..=5 {
        match tokio::net::TcpListener::bind(addr).await {
            Ok(l) => {
                listener = Some(l);
                break;
            }
            Err(e) => {
                if attempt == 5 {
                    eprintln!("[DevWrap Companion] Failed to bind to 127.0.0.1:8080 after 5 attempts: {}", e);
                } else {
                    tokio::time::sleep(tokio::time::Duration::from_millis(800)).await;
                }
            }
        }
    }

    if let Some(l) = listener {
        if let Err(e) = axum::serve(l, app).await {
            eprintln!("[DevWrap Companion] Server error: {}", e);
        }
    }
}

#[tauri::command]
fn get_companion_stats(state: tauri::State<HeartbeatStore>) -> Vec<DevAppHeartbeat> {
    state.lock().unwrap().clone()
}

#[tauri::command]
fn get_companion_filters(state: tauri::State<FilterStore>) -> Vec<String> {
    state.lock().unwrap().clone()
}

#[tauri::command]
fn add_companion_filter(filter: String, state: tauri::State<FilterStore>) -> Vec<String> {
    let clean = filter.trim().to_lowercase();
    let mut filters = state.lock().unwrap();
    if !clean.is_empty() && !filters.iter().any(|f| f.to_lowercase() == clean) {
        filters.push(clean);
        save_persisted_filters(&filters);
    }
    filters.clone()
}

#[tauri::command]
fn remove_companion_filter(filter: String, state: tauri::State<FilterStore>) -> Vec<String> {
    let clean = filter.trim().to_lowercase();
    let mut filters = state.lock().unwrap();
    filters.retain(|f| f.trim().to_lowercase() != clean);
    save_persisted_filters(&filters);
    filters.clone()
}

#[tauri::command]
fn get_running_processes() -> Vec<DiscoveredProcess> {
    discover_running_processes()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let heartbeat_store: HeartbeatStore = Arc::new(Mutex::new(Vec::new()));
    let filter_store: FilterStore = Arc::new(Mutex::new(load_persisted_filters()));

    let poller_heartbeats = Arc::clone(&heartbeat_store);
    let poller_filters = Arc::clone(&filter_store);

    let app_state = AppState {
        heartbeats: Arc::clone(&heartbeat_store),
        filters: Arc::clone(&filter_store),
    };

    let tauri_heartbeats = Arc::clone(&heartbeat_store);
    let tauri_filters = Arc::clone(&filter_store);

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .manage(tauri_heartbeats)
        .manage(tauri_filters)
        .invoke_handler(tauri::generate_handler![
            get_companion_stats,
            get_companion_filters,
            add_companion_filter,
            remove_companion_filter,
            get_running_processes
        ])
        .on_window_event(|window, event| {
            // Prevent close from terminating the background daemon; hide to tray instead
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .setup(move |app| {
            // Register the installed macOS application as a login item on its first
            // launch. This keeps the local telemetry service available after future
            // logins without asking the user to run a terminal command.
            #[cfg(target_os = "macos")]
            {
                // Run silently as an accessory menu-bar app (hide from Dock and CMD+Tab)
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);

                use tauri_plugin_autostart::{MacosLauncher, ManagerExt};

                app.handle().plugin(tauri_plugin_autostart::init(
                    MacosLauncher::LaunchAgent,
                    None,
                ))?;

                let autostart = app.autolaunch();
                match autostart.is_enabled() {
                    Ok(false) => {
                        if let Err(error) = autostart.enable() {
                            eprintln!(
                                "[DevWrap Companion] Could not enable launch at login: {error}"
                            );
                        } else {
                            println!("[DevWrap Companion] Enabled launch at login");
                        }
                    }
                    Ok(true) => println!("[DevWrap Companion] Launch at login is already enabled"),
                    Err(error) => eprintln!(
                        "[DevWrap Companion] Could not check launch-at-login status: {error}"
                    ),
                }
            }

            // 1. Setup system tray menu items
            let open_item = MenuItem::with_id(
                app,
                "open_control_panel",
                "Open Control Panel",
                true,
                None::<&str>,
            )?;
            let status_item = MenuItem::with_id(
                app,
                "status_indicator",
                "Status: Daemon Active (127.0.0.1:8080)",
                false,
                None::<&str>,
            )?;
            let quit_item = MenuItem::with_id(
                app,
                "quit_app",
                "Quit DevWrap Companion",
                true,
                None::<&str>,
            )?;

            let tray_menu = Menu::with_items(app, &[&open_item, &status_item, &quit_item])?;

            let tray_icon = app.default_window_icon().unwrap().clone();

            // 2. Build system tray icon with left-click toggle & menu action handlers
            let _tray = TrayIconBuilder::with_id("devwrap-tray")
                .icon(tray_icon)
                .tooltip("DevWrap Desktop Companion")
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "open_control_panel" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                        "quit_app" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    // Left-clicking tray icon toggles window visibility (Show/Hide)
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let is_visible = window.is_visible().unwrap_or(false);
                            let is_minimized = window.is_minimized().unwrap_or(false);
                            if is_visible && !is_minimized {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            // 3. Spawn 15-second active window poller loop
            tauri::async_runtime::spawn(async move {
                run_window_poller(poller_heartbeats, poller_filters).await;
            });

            // 4. Spawn local Axum HTTP server on 127.0.0.1:8080
            tauri::async_runtime::spawn(async move {
                run_axum_server(app_state).await;
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        match event {
            tauri::RunEvent::ExitRequested { code, api, .. } => {
                // If exit wasn't explicitly triggered with a code (e.g. app.exit(0)),
                // prevent exit so the background poller and Axum daemon stay running
                if code.is_none() {
                    api.prevent_exit();
                }
            }
            #[cfg(target_os = "macos")]
            tauri::RunEvent::Reopen { .. } => {
                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                }
            }
            _ => {}
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_filters_initialization() {
        let defaults: Vec<String> = DEFAULT_FILTERS.iter().map(|&s| s.to_string()).collect();
        assert_eq!(defaults.len(), 10);
        assert!(defaults.contains(&"cursor".to_string()));
        assert!(defaults.contains(&"code".to_string()));
        assert!(defaults.contains(&"terminal".to_string()));
        assert!(defaults.contains(&"iterm2".to_string()));
        assert!(defaults.contains(&"alacritty".to_string()));
        assert!(defaults.contains(&"warp".to_string()));
        assert!(defaults.contains(&"postman".to_string()));
        assert!(defaults.contains(&"docker".to_string()));
        assert!(defaults.contains(&"jetbrains".to_string()));
        assert!(defaults.contains(&"antigravity".to_string()));
    }

    #[test]
    fn test_normalize_for_match() {
        assert_eq!(normalize_for_match("VS Code"), "vscode");
        assert_eq!(normalize_for_match("vscode"), "vscode");
        assert_eq!(normalize_for_match("Visual Studio Code"), "visualstudiocode");
        assert_eq!(normalize_for_match("Antigravity IDE"), "antigravityide");
        assert_eq!(normalize_for_match("TablePlus"), "tableplus");
    }

    #[test]
    fn test_extract_filter_from_name() {
        assert_eq!(extract_filter_from_name("Visual Studio Code", "/Applications/Visual Studio Code.app"), "code");
        assert_eq!(extract_filter_from_name("Antigravity IDE", "/Applications/Antigravity IDE.app"), "antigravity");
        assert_eq!(extract_filter_from_name("Cursor", "/Applications/Cursor.app"), "cursor");
        assert_eq!(extract_filter_from_name("iTerm2", "/Applications/iTerm.app"), "iterm2");
        assert_eq!(extract_filter_from_name("Postman", "/Applications/Postman.app"), "postman");
        assert_eq!(extract_filter_from_name("TablePlus", "/Applications/TablePlus.app"), "tableplus");
    }

    #[tokio::test]
    async fn test_get_post_delete_filters_handlers() {
        let heartbeats: HeartbeatStore = Arc::new(Mutex::new(Vec::new()));
        let filters: FilterStore = Arc::new(Mutex::new(vec![
            "cursor".to_string(),
            "code".to_string(),
            "antigravity".to_string(),
        ]));

        let state = AppState {
            heartbeats,
            filters,
        };

        // Test GET /filters
        let Json(initial_filters) = handle_get_filters(State(state.clone())).await;
        assert_eq!(initial_filters.len(), 3);
        assert!(initial_filters.contains(&"antigravity".to_string()));

        // Test POST /filters with new app
        let payload = FilterRequest {
            filter: "tableplus".to_string(),
        };
        let Json(updated_filters) = handle_post_filter(State(state.clone()), Json(payload)).await;
        assert_eq!(updated_filters.len(), 4);
        assert!(updated_filters.contains(&"tableplus".to_string()));

        // Test POST /filters duplicate
        let dup_payload = FilterRequest {
            filter: "TABLEPLUS".to_string(),
        };
        let Json(dedup_filters) = handle_post_filter(State(state.clone()), Json(dup_payload)).await;
        assert_eq!(dedup_filters.len(), 4);

        // Test DELETE /filters
        let del_payload = FilterRequest {
            filter: "tableplus".to_string(),
        };
        let Json(after_del) = handle_delete_filter(State(state.clone()), Json(del_payload)).await;
        assert_eq!(after_del.len(), 3);
        assert!(!after_del.contains(&"tableplus".to_string()));
    }

    #[tokio::test]
    async fn test_discover_running_processes() {
        let procs = discover_running_processes();
        assert!(!procs.is_empty());
        // Verify process objects have valid names and process filters
        for p in procs.iter().take(5) {
            assert!(!p.name.is_empty());
            assert!(!p.process.is_empty());
        }
    }
}
