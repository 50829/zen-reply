use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use serde::Serialize;
use serde_json::json;
use std::env;
use std::thread;
use std::time::Duration;
use tauri::{Emitter, Manager};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

const ACTIVATION_SHORTCUT: &str = "Alt+Space";
const CLIPBOARD_EVENT: &str = "zenreply://clipboard-text";
const CLIPBOARD_CAPTURED_EVENT: &str = "zenreply://clipboard-captured";
const DEFAULT_API_BASE: &str = "https://api.siliconflow.cn/v1";
const DEFAULT_MODEL_NAME: &str = "Pro/MiniMaxAI/MiniMax-M2.5";

#[derive(Clone, Serialize)]
struct ClipboardPayload {
    text: String,
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
    window.hide().map_err(|err| err.to_string())
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
    // Capture BEFORE showing the window — enigo Ctrl+C needs the source app focused.
    let (text, previous) = quick_capture(app);

    if let Some(window) = app.get_webview_window("main") {
        // Do NOT show/focus here — let JS side show the window AFTER
        // it has measured + resized the content, preventing the
        // transparent-shell flash and first-launch blank panel.
        let _ = window.emit(CLIPBOARD_EVENT, ClipboardPayload { text: text.clone() });
    }

    // Async fallback: only when the fast path returned nothing.
    if text.is_empty() {
        let handle = app.clone();
        std::thread::spawn(move || {
            let captured = fallback_capture(&handle, &previous);
            if !captured.is_empty() {
                if let Some(window) = handle.get_webview_window("main") {
                    let _ = window.emit(
                        CLIPBOARD_CAPTURED_EVENT,
                        ClipboardPayload { text: captured },
                    );
                }
            }
        });
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = dotenvy::dotenv();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            // Set transparent background for the webview to prevent the default
            // white flash that appears for 1-2 frames when the window is shown.
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_background_color(Some(tauri::window::Color(0, 0, 0, 0)));
            }

            app.global_shortcut()
                .on_shortcut(ACTIVATION_SHORTCUT, |app, _shortcut, event| {
                    if event.state == ShortcutState::Released {
                        on_shortcut_pressed(app);
                    }
                })?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![hide_window, test_api_connection,])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
