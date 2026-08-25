#![allow(linker_messages)]

use std::env;
use tauri::Manager;

#[tauri::command]
fn get_file_args() -> Vec<String> {
    env::args().skip(1).collect()
}

#[tauri::command]
fn reveal_in_file_manager(path: String) -> Result<(), String> {
    let p = std::path::Path::new(&path);
    if !p.exists() {
        return Err("path does not exist".into());
    }

    #[cfg(target_os = "windows")]
    {
        let win_path = path.replace('/', "\\");
        let arg = format!("/select,{}", win_path);
        std::process::Command::new("explorer")
            .arg(&arg)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-R", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        let dir = p.parent().unwrap_or(p);
        std::process::Command::new("xdg-open")
            .arg(dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
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
        .invoke_handler(tauri::generate_handler![get_file_args, reveal_in_file_manager])
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
