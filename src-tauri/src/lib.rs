#![allow(linker_messages)]

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
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
