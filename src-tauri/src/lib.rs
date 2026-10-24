#![allow(linker_messages)]

use std::env;
use std::path::{Path, PathBuf};
use tauri::Manager;

/// 数据目录覆盖配置：exe 同目录的 data-dir.txt，内容为一行目录路径；缺失或空白 = 使用默认 data/
const DATA_DIR_CONFIG: &str = "data-dir.txt";
const DATA_DIR_NAME: &str = "data";

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

/// 验证目录可用：能创建且能写探针文件
fn probe_dir(dir: &Path) -> bool {
    if std::fs::create_dir_all(dir).is_err() {
        return false;
    }
    let probe = dir.join(".write-probe");
    match std::fs::write(&probe, b"") {
        Ok(()) => {
            let _ = std::fs::remove_file(&probe);
            true
        }
        Err(_) => false,
    }
}

/// exe 所在目录
fn exe_dir() -> Option<PathBuf> {
    env::current_exe().ok()?.parent().map(Path::to_path_buf)
}

/// 读取 data-dir.txt 里的自定义数据目录；相对路径按 exe 目录解析
fn read_custom_data_dir(base: &Path) -> Option<PathBuf> {
    let raw = std::fs::read_to_string(base.join(DATA_DIR_CONFIG)).ok()?;
    let raw = raw.trim();
    if raw.is_empty() {
        return None;
    }
    let path = PathBuf::from(raw);
    Some(if path.is_relative() { base.join(path) } else { path })
}

/// 启动时解析生效数据目录：data-dir.txt 指定的自定义目录 → 默认 exe 旁 data/ → None（回退系统目录）。
/// 目录不可写（如装到 Program Files）时自动降级。macOS 的 WKWebView 不支持自定义数据目录，Tauri 会忽略该设置。
fn resolve_data_dir() -> Option<PathBuf> {
    let base = exe_dir()?;
    if let Some(custom) = read_custom_data_dir(&base) {
        if probe_dir(&custom) {
            return Some(custom);
        }
    }
    let default = base.join(DATA_DIR_NAME);
    if probe_dir(&default) {
        return Some(default);
    }
    None
}

#[derive(serde::Serialize)]
struct DataDirInfo {
    /// 当前生效的数据目录
    path: String,
    /// 默认目录（exe 旁 data/）
    default_path: String,
    /// 是否设置了自定义目录（data-dir.txt 有内容）
    custom: bool,
}

#[tauri::command]
fn get_data_dir(app: tauri::AppHandle) -> DataDirInfo {
    let base = exe_dir();
    let default_path = base.clone().map(|b| b.join(DATA_DIR_NAME));
    let custom = base.as_deref().and_then(read_custom_data_dir).is_some();
    let path = resolve_data_dir()
        .or_else(|| app.path().app_local_data_dir().ok())
        .unwrap_or_default();
    DataDirInfo {
        path: path.to_string_lossy().into_owned(),
        default_path: default_path
            .map(|p| p.to_string_lossy().into_owned())
            .unwrap_or_default(),
        custom,
    }
}

/// 修改数据目录：写入 data-dir.txt，重启应用后生效；传 None 或空串恢复默认。
#[tauri::command]
fn set_data_dir(path: Option<String>) -> Result<(), String> {
    let base = exe_dir().ok_or("无法定位程序目录")?;
    let config = base.join(DATA_DIR_CONFIG);
    let trimmed = path.as_deref().map(str::trim).filter(|s| !s.is_empty());
    match trimmed {
        None => {
            let _ = std::fs::remove_file(&config);
            Ok(())
        }
        Some(raw) => {
            let p = PathBuf::from(raw);
            let target = if p.is_relative() { base.join(p) } else { p };
            if !probe_dir(&target) {
                return Err(format!("目录不可用或不可写：{}", target.display()));
            }
            std::fs::write(&config, target.to_string_lossy().as_bytes())
                .map_err(|e| format!("写入 {} 失败：{}", DATA_DIR_CONFIG, e))
        }
    }
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
        .invoke_handler(tauri::generate_handler![
            get_file_args,
            reveal_in_file_manager,
            get_data_dir,
            set_data_dir
        ])
        .setup(|app| {
            let window_config = app
                .config()
                .app
                .windows
                .first()
                .ok_or("missing window config")?
                .clone();
            let mut window = tauri::WebviewWindowBuilder::from_config(app.handle(), &window_config)?;
            if let Some(dir) = resolve_data_dir() {
                window = window.data_directory(dir);
            }
            window.build()?;

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
