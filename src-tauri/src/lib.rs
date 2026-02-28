use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use serde::Serialize;
use serde_json::json;
use std::env;
use std::thread;
use std::time::Duration;
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};


const ACTIVATION_SHORTCUT: &str = "Alt+Space";
const CLIPBOARD_EVENT: &str = "zenreply://clipboard-text";
const CLIPBOARD_CAPTURED_EVENT: &str = "zenreply://clipboard-captured";
const TRAY_WAKE_EVENT: &str = "zenreply://tray-wake";
const TRAY_OPEN_SETTINGS_EVENT: &str = "zenreply://tray-open-settings";
const DEFAULT_API_BASE: &str = "https://api.siliconflow.cn/v1";
const DEFAULT_MODEL_NAME: &str = "Pro/MiniMaxAI/MiniMax-M2.5";

#[derive(Clone, Serialize)]
struct ClipboardPayload {
    text: String,
}

/// Rebuild the tray menu based on panel visibility.
/// When the panel is open, only "退出程序" is shown;
/// when hidden, the full menu (打开主面板 / 打开设置 / 退出程序) is restored.
fn update_tray_menu<R: tauri::Runtime>(app: &tauri::AppHandle<R>, panel_visible: bool) {
    let Some(tray) = app.tray_by_id("main-tray") else {
        return;
    };

    let menu = if panel_visible {
        let Ok(quit) = MenuItemBuilder::with_id("quit", "退出程序").build(app) else { return };
        MenuBuilder::new(app).items(&[&quit]).build()
    } else {
        let Ok(show) = MenuItemBuilder::with_id("show", "打开主面板").build(app) else { return };
        let Ok(settings) = MenuItemBuilder::with_id("settings", "打开设置").build(app) else { return };
        let Ok(quit) = MenuItemBuilder::with_id("quit", "退出程序").build(app) else { return };
        MenuBuilder::new(app).items(&[&show, &settings, &quit]).build()
    };

    if let Ok(m) = menu {
        let _ = tray.set_menu(Some(m));
    }
}

fn normalize_optional(value: Option<String>) -> Option<String> {
    value
        .map(|item| item.trim().to_string())
        .filter(|item| !item.is_empty())
}

fn fallback_env(key: &str) -> Option<String> {
    env::var(key)
        .ok()
        .map(|item| item.trim().to_string())
        .filter(|item| !item.is_empty())
}

fn build_chat_endpoint(api_base: &str) -> String {
    let normalized_base = api_base.trim_end_matches('/');
    if normalized_base.ends_with("/chat/completions") {
        normalized_base.to_string()
    } else {
        format!("{normalized_base}/chat/completions")
    }
}

fn resolve_api_settings(
    api_key: Option<String>,
    api_base: Option<String>,
    model_name: Option<String>,
) -> Result<(String, String, String), String> {
    let resolved_api_key = normalize_optional(api_key)
        .or_else(|| fallback_env("ZENREPLY_API_KEY"))
        .ok_or_else(|| "缺少 API Key，请在设置中填写".to_string())?;

    let resolved_api_base = normalize_optional(api_base)
        .or_else(|| fallback_env("ZENREPLY_API_BASE"))
        .unwrap_or_else(|| DEFAULT_API_BASE.to_string());

    let resolved_model_name = normalize_optional(model_name)
        .or_else(|| fallback_env("ZENREPLY_MODEL"))
        .unwrap_or_else(|| DEFAULT_MODEL_NAME.to_string());

    Ok((resolved_api_key, resolved_api_base, resolved_model_name))
}

#[tauri::command]
fn hide_window(window: tauri::WebviewWindow) -> Result<(), String> {
    let result = window.hide().map_err(|err| err.to_string());
    update_tray_menu(window.app_handle(), false);
    result
}

/// Single IPC call: resize + center + show + focus.
/// Eliminates 4 sequential JS→Rust round-trips on every wake.
#[tauri::command]
fn show_window(window: tauri::WebviewWindow, width: f64, height: f64) -> Result<(), String> {
    use tauri::LogicalSize;
    window
        .set_size(LogicalSize::new(width, height))
        .map_err(|e| e.to_string())?;
    window.center().map_err(|e| e.to_string())?;
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    update_tray_menu(window.app_handle(), true);
    Ok(())
}

#[tauri::command]
async fn test_api_connection(
    api_key: String,
    api_base: Option<String>,
    model_name: Option<String>,
) -> Result<String, String> {
    let (resolved_api_key, resolved_api_base, resolved_model_name) =
        resolve_api_settings(Some(api_key), api_base, model_name)?;

    let endpoint = build_chat_endpoint(&resolved_api_base);

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|err| format!("创建 HTTP 客户端失败: {err}"))?;

    let request_body = json!({
        "model": resolved_model_name,
        "stream": false,
        "temperature": 0.0,
        "max_tokens": 8,
        "messages": [
            {
                "role": "system",
                "content": "You are a concise assistant."
            },
            {
                "role": "user",
                "content": "hi"
            }
        ]
    });

    let response = client
        .post(endpoint)
        .bearer_auth(resolved_api_key)
        .json(&request_body)
        .send()
        .await
        .map_err(|err| format!("调用模型接口失败: {err}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("模型接口错误 {status}: {error_text}"));
    }

    Ok("API 连接成功".to_string())
}

fn trigger_copy_shortcut() {
    if let Ok(mut enigo) = Enigo::new(&Settings::default()) {
        #[cfg(target_os = "macos")]
        let modifier = Key::Meta;
        #[cfg(not(target_os = "macos"))]
        let modifier = Key::Control;

        let _ = enigo.key(modifier, Direction::Press);
        let _ = enigo.key(Key::Unicode('c'), Direction::Click);
        let _ = enigo.key(modifier, Direction::Release);
    }
}

/// Fast synchronous capture: ~87ms. Returns captured text or empty string.
fn quick_capture<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> (String, String) {
    let previous = app.clipboard().read_text().unwrap_or_default();

    // Brief pause for OS to finish processing the Alt+Space key release.
    thread::sleep(Duration::from_millis(30));
    trigger_copy_shortcut();

    // Wait for the source app to update the clipboard.
    thread::sleep(Duration::from_millis(50));

    let current = app.clipboard().read_text().unwrap_or_default();
    if !current.is_empty() && current != previous {
        return (current, previous);
    }

    (String::new(), previous)
}

/// Fallback polling for apps that update the clipboard slowly (e.g. Electron).
fn fallback_capture<R: tauri::Runtime>(app: &tauri::AppHandle<R>, previous: &str) -> String {
    // Second Ctrl+C attempt, then poll.
    trigger_copy_shortcut();
    for _ in 0..10 {
        thread::sleep(Duration::from_millis(30));
        if let Ok(text) = app.clipboard().read_text() {
            if !text.is_empty() && text != previous {
                return text;
            }
        }
    }
    String::new()
}

fn on_shortcut_pressed<R: tauri::Runtime>(app: &tauri::AppHandle<R>)
where
    R: 'static,
{
    // Panel is now being activated — show minimal tray menu immediately.
    update_tray_menu(app, true);

    // Move the blocking clipboard capture off the main thread to prevent
    // the 80ms+ block on Tauri's event loop (thread::sleep in quick_capture).
    let handle = app.clone();
    std::thread::spawn(move || {
        // Capture BEFORE showing the window — enigo Ctrl+C needs the source app focused.
        let (text, previous) = quick_capture(&handle);

        if let Some(window) = handle.get_webview_window("main") {
            // Do NOT show/focus here — let JS side show the window AFTER
            // it has measured + resized the content, preventing the
            // transparent-shell flash and first-launch blank panel.
            let _ = window.emit(CLIPBOARD_EVENT, ClipboardPayload { text: text.clone() });
        }

        // Async fallback: only when the fast path returned nothing.
        if text.is_empty() {
            let captured = fallback_capture(&handle, &previous);
            if !captured.is_empty() {
                if let Some(window) = handle.get_webview_window("main") {
                    let _ = window.emit(
                        CLIPBOARD_CAPTURED_EVENT,
                        ClipboardPayload { text: captured },
                    );
                }
            }
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = dotenvy::dotenv();

    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())

        .setup(|app| {
            // ── System tray ──
            let show_item = MenuItemBuilder::with_id("show", "打开主面板").build(app)?;
            let settings_item = MenuItemBuilder::with_id("settings", "打开设置").build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "退出程序").build(app)?;

            let menu = MenuBuilder::new(app)
                .items(&[&show_item, &settings_item, &quit_item])
                .build()?;

            let tray_icon = app
                .default_window_icon()
                .cloned()
                .expect("default window icon must be set in tauri.conf.json");

            TrayIconBuilder::with_id("main-tray")
                .icon(tray_icon)
                .tooltip("ZenReply 已启动 — 按 Alt+Space 唤醒")
                .menu(&menu)
                .on_menu_event(|app, event| {
                    let window = app.get_webview_window("main");
                    match event.id().as_ref() {
                        "show" => {
                            if let Some(w) = window {
                                let _ = w.show();
                                let _ = w.unminimize();
                                let _ = w.set_focus();
                                let _ = w.emit(TRAY_WAKE_EVENT, ());
                                update_tray_menu(app, true);
                            }
                        }
                        "settings" => {
                            if let Some(w) = window {
                                let _ = w.show();
                                let _ = w.unminimize();
                                let _ = w.set_focus();
                                let _ = w.emit(TRAY_OPEN_SETTINGS_EVENT, ());
                                update_tray_menu(app, true);
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            // Skip if window is already visible.
                            if window.is_visible().unwrap_or(false) {
                                return;
                            }
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                            let _ = window.emit(TRAY_WAKE_EVENT, ());
                            update_tray_menu(app, true);
                        }
                    }
                })
                .build(app)?;

            // ── Global shortcut ──
            app.global_shortcut()
                .on_shortcut(ACTIVATION_SHORTCUT, |app, _shortcut, event| {
                    if event.state == ShortcutState::Released {
                        on_shortcut_pressed(app);
                    }
                })?;

            // ── Reset tray tooltip after 10 s ──
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_secs(10));
                if let Some(tray) = handle.tray_by_id("main-tray") {
                    let _ = tray.set_tooltip(Some("ZenReply"));
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            // Intercept window close — hide to tray instead of exiting.
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
                update_tray_menu(window.app_handle(), false);
            }
        })
        .invoke_handler(tauri::generate_handler![hide_window, show_window, test_api_connection,])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
