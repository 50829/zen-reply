use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use futures_util::StreamExt;
use serde::Serialize;
use serde_json::{json, Value};
use std::collections::HashSet;
use std::env;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{Emitter, Manager};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

const ACTIVATION_SHORTCUT: &str = "Alt+Space";
const CLIPBOARD_EVENT: &str = "zenreply://clipboard-text";
const LLM_STREAM_EVENT: &str = "zenreply://llm-stream";

#[derive(Clone, Serialize)]
struct ClipboardPayload {
    text: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct LlmStreamEventPayload {
    request_id: String,
    kind: String,
    delta: Option<String>,
    message: Option<String>,
}

#[derive(Clone, Default)]
struct StreamControl {
    canceled_requests: Arc<Mutex<HashSet<String>>>,
}

impl StreamControl {
    fn mark_canceled(&self, request_id: &str) {
        let mut guard = self
            .canceled_requests
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        guard.insert(request_id.to_string());
    }

    fn clear(&self, request_id: &str) {
        let mut guard = self
            .canceled_requests
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        guard.remove(request_id);
    }

    fn is_canceled(&self, request_id: &str) -> bool {
        let guard = self
            .canceled_requests
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        guard.contains(request_id)
    }
}

#[tauri::command]
fn hide_window(window: tauri::WebviewWindow) -> Result<(), String> {
    window.hide().map_err(|err| err.to_string())
}

#[tauri::command]
fn copy_text_to_clipboard(app: tauri::AppHandle, text: String) -> Result<(), String> {
    app.clipboard()
        .write_text(text)
        .map_err(|err| err.to_string())
}

#[tauri::command]
fn cancel_generate_reply(
    stream_control: tauri::State<'_, StreamControl>,
    request_id: String,
) -> Result<(), String> {
    stream_control.mark_canceled(&request_id);
    Ok(())
}

fn emit_stream_event<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    request_id: &str,
    kind: &str,
    delta: Option<String>,
    message: Option<String>,
) {
    let _ = app.emit(
        LLM_STREAM_EVENT,
        LlmStreamEventPayload {
            request_id: request_id.to_string(),
            kind: kind.to_string(),
            delta,
            message,
        },
    );
}

fn emit_stream_delta<R: tauri::Runtime>(app: &tauri::AppHandle<R>, request_id: &str, delta: String) {
    emit_stream_event(app, request_id, "delta", Some(delta), None);
}

fn emit_stream_done<R: tauri::Runtime>(app: &tauri::AppHandle<R>, request_id: &str) {
    emit_stream_event(app, request_id, "done", None, None);
}

fn emit_stream_error<R: tauri::Runtime>(app: &tauri::AppHandle<R>, request_id: &str, message: String) {
    emit_stream_event(app, request_id, "error", None, Some(message));
}

fn parse_delta_from_sse(data: &str) -> Option<String> {
    let value = serde_json::from_str::<Value>(data).ok()?;
    let first_choice = value.get("choices")?.as_array()?.first()?;

    if let Some(content) = first_choice
        .get("delta")
        .and_then(|delta| delta.get("content"))
        .and_then(|content| content.as_str())
    {
        return Some(content.to_string());
    }

    first_choice
        .get("text")
        .and_then(|text| text.as_str())
        .map(|text| text.to_string())
}

fn handle_sse_line<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    request_id: &str,
    line: &str,
) -> bool {
    let trimmed = line.trim();
    if !trimmed.starts_with("data:") {
        return false;
    }

    let data = trimmed.trim_start_matches("data:").trim();
    if data.is_empty() {
        return false;
    }

    if data == "[DONE]" {
        emit_stream_done(app, request_id);
        return true;
    }

    if let Some(delta) = parse_delta_from_sse(data) {
        if !delta.is_empty() {
            emit_stream_delta(app, request_id, delta);
        }
    }

    false
}

#[tauri::command]
async fn stream_generate_reply(
    app: tauri::AppHandle,
    stream_control: tauri::State<'_, StreamControl>,
    request_id: String,
    prompt: String,
) -> Result<(), String> {
    let stream_control = stream_control.inner().clone();
    stream_control.clear(&request_id);

    let finish_if_canceled = |app_handle: &tauri::AppHandle, request: &str| -> bool {
        if stream_control.is_canceled(request) {
            emit_stream_done(app_handle, request);
            stream_control.clear(request);
            return true;
        }
        false
    };

    if finish_if_canceled(&app, &request_id) {
        return Ok(());
    }

    let api_key = match env::var("ZENREPLY_API_KEY") {
        Ok(value) => value,
        Err(_) => {
            let message = "缺少环境变量 ZENREPLY_API_KEY".to_string();
            emit_stream_error(&app, &request_id, message.clone());
            stream_control.clear(&request_id);
            return Err(message);
        }
    };

    let api_base = env::var("ZENREPLY_API_BASE").unwrap_or_else(|_| "https://api.openai.com/v1".to_string());
    let model = env::var("ZENREPLY_MODEL").unwrap_or_else(|_| "gpt-4o-mini".to_string());

    let normalized_base = api_base.trim_end_matches('/');
    let endpoint = if normalized_base.ends_with("/chat/completions") {
        normalized_base.to_string()
    } else {
        format!("{normalized_base}/chat/completions")
    };

    let client = match reqwest::Client::builder()
        .timeout(Duration::from_secs(120))
        .build()
    {
        Ok(value) => value,
        Err(err) => {
            let message = format!("创建 HTTP 客户端失败: {err}");
            emit_stream_error(&app, &request_id, message.clone());
            stream_control.clear(&request_id);
            return Err(message);
        }
    };

    let request_body = json!({
        "model": model,
        "stream": true,
        "temperature": 0.7,
        "messages": [
            {
                "role": "system",
                "content": "你是资深中文沟通优化专家，只输出可直接发送的一段中文回复正文。"
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
    });

    if finish_if_canceled(&app, &request_id) {
        return Ok(());
    }

    let response = match client
        .post(endpoint)
        .bearer_auth(api_key)
        .json(&request_body)
        .send()
        .await
    {
        Ok(value) => value,
        Err(err) => {
            let message = format!("调用模型接口失败: {err}");
            emit_stream_error(&app, &request_id, message.clone());
            stream_control.clear(&request_id);
            return Err(message);
        }
    };

    if finish_if_canceled(&app, &request_id) {
        return Ok(());
    }

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        let message = format!("模型接口错误 {status}: {error_text}");
        emit_stream_error(&app, &request_id, message.clone());
        stream_control.clear(&request_id);
        return Err(message);
    }

    let mut byte_stream = response.bytes_stream();
    let mut pending = String::new();

    while let Some(chunk_result) = byte_stream.next().await {
        if finish_if_canceled(&app, &request_id) {
            return Ok(());
        }

        let chunk = match chunk_result {
            Ok(value) => value,
            Err(err) => {
                let message = format!("读取流式响应失败: {err}");
                emit_stream_error(&app, &request_id, message.clone());
                stream_control.clear(&request_id);
                return Err(message);
            }
        };

        pending.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(newline_idx) = pending.find('\n') {
            if finish_if_canceled(&app, &request_id) {
                return Ok(());
            }

            let mut line = pending[..newline_idx].to_string();
            if line.ends_with('\r') {
                line.pop();
            }
            pending = pending[(newline_idx + 1)..].to_string();

            if handle_sse_line(&app, &request_id, &line) {
                stream_control.clear(&request_id);
                return Ok(());
            }
        }
    }

    if finish_if_canceled(&app, &request_id) {
        return Ok(());
    }

    if !pending.trim().is_empty() {
        let _ = handle_sse_line(&app, &request_id, pending.trim());
    }

    emit_stream_done(&app, &request_id);
    stream_control.clear(&request_id);
    Ok(())
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

fn capture_selected_text<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> String {
    let previous = app.clipboard().read_text().unwrap_or_default();

    // Wait briefly for Alt/Space to be fully released, then trigger copy.
    thread::sleep(Duration::from_millis(80));
    trigger_copy_shortcut();

    // Poll clipboard for a short period to capture selected text copy result.
    for _ in 0..12 {
        thread::sleep(Duration::from_millis(35));
        if let Ok(text) = app.clipboard().read_text() {
            if !text.is_empty() && text != previous {
                return text;
            }
        }
    }

    // Retry once for apps that update clipboard slower.
    trigger_copy_shortcut();
    for _ in 0..8 {
        thread::sleep(Duration::from_millis(35));
        if let Ok(text) = app.clipboard().read_text() {
            if !text.is_empty() {
                return text;
            }
        }
    }

    app.clipboard()
        .read_text()
        .unwrap_or(previous)
}

fn on_shortcut_pressed<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    let text = capture_selected_text(app);

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();

        let _ = window.emit(CLIPBOARD_EVENT, ClipboardPayload { text });
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = dotenvy::dotenv();

    tauri::Builder::default()
        .manage(StreamControl::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            app.global_shortcut().on_shortcut(
                ACTIVATION_SHORTCUT,
                |app, _shortcut, event| {
                    if event.state == ShortcutState::Released {
                        on_shortcut_pressed(app);
                    }
                },
            )?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            hide_window,
            copy_text_to_clipboard,
            cancel_generate_reply,
            stream_generate_reply
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
