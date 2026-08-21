#![allow(linker_messages)]

use std::env;
use tauri::Manager;

#[tauri::command]
fn get_file_args() -> Vec<String> {
    env::args().skip(1).collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
            let files: Vec<String> = args
                .into_iter()
                .skip(1)
                .collect();
            if !files.is_empty() {
                use tauri::Emitter;
                let _ = app.emit("file-open", files);
            }
        }));
    }

    builder
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![get_file_args])
        .setup(|app| {
            let handle = app.handle().clone();
            ctrlc::set_handler(move || {
                handle.exit(0);
            })
            .expect("Error setting Ctrl-C handler");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
