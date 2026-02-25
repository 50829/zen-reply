use serde::Serialize;
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

fn on_shortcut_pressed<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();

        let text = app.clipboard().read_text().unwrap_or_default();
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
                    if event.state == ShortcutState::Pressed {
                        on_shortcut_pressed(app);
                    }
                },
            )?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![hide_window])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
