use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use serde::Serialize;
use std::thread;
use std::time::Duration;
use tauri::{Emitter, Manager};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

const ACTIVATION_SHORTCUT: &str = "Alt+Space";
const CLIPBOARD_EVENT: &str = "zenreply://clipboard-text";

#[derive(Clone, Serialize)]
struct ClipboardPayload {
    text: String,
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
    tauri::Builder::default()
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
            copy_text_to_clipboard
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
