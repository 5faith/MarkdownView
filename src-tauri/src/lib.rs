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

/// 文件树搜索时跳过的生成目录（大小写不敏感）
const SEARCH_SKIP: &[&str] = &[
    "node_modules",
    ".git",
    ".svn",
    "dist",
    ".obsidian",
    ".venv",
    "venv",
    "__pycache__",
    ".idea",
    ".cache",
    ".mypy_cache",
    ".pytest_cache",
    "target",
    "build",
];
const SEARCH_MAX_DEPTH: usize = 8;
/// 返回给前端的命中上限（前端排序后只展示前 200）
const SEARCH_MAX_HITS: usize = 1000;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct SearchHit {
    name: String,
    path: String,
    is_dir: bool,
}

/// 深度优先遍历；want_dirs 为 None 时不过滤类型，Some(b) 只保留目录/文件
fn walk_search(
    dir: &Path,
    matcher: &dyn Fn(&str) -> bool,
    want_dirs: Option<bool>,
    depth: usize,
    out: &mut Vec<SearchHit>,
) {
    if depth > SEARCH_MAX_DEPTH || out.len() >= SEARCH_MAX_HITS {
        return;
    }
    let Ok(entries) = std::fs::read_dir(dir) else {
        return;
    };
    let mut sub_dirs = Vec::new();
    for entry in entries.flatten() {
        let Ok(name) = entry.file_name().into_string() else {
            continue;
        };
        if SEARCH_SKIP.iter().any(|s| s.eq_ignore_ascii_case(&name)) {
            continue;
        }
        // file_type() 不跟随符号链接，避免软链环导致死循环
        let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);
        if (want_dirs.is_none() || want_dirs == Some(is_dir)) && matcher(&name) {
            out.push(SearchHit {
                name: name.clone(),
                path: dir.join(&name).to_string_lossy().into_owned(),
                is_dir,
            });
            if out.len() >= SEARCH_MAX_HITS {
                return;
            }
        }
        if is_dir {
            sub_dirs.push(entry.path());
        }
    }
    for sub in sub_dirs {
        walk_search(&sub, matcher, want_dirs, depth + 1, out);
        if out.len() >= SEARCH_MAX_HITS {
            return;
        }
    }
}

/// 文件树筛选：在 Rust 侧遍历工作区。前端逐目录 IPC 并发扇出会把 WebView
/// 消息桥挤崩（软件崩溃），这里一次调用完成全部遍历与匹配。
#[tauri::command]
fn search_workspace(
    root: String,
    query: String,
    is_regex: bool,
    case_sensitive: bool,
    file_type: String,
) -> Result<Vec<SearchHit>, String> {
    let matcher: Box<dyn Fn(&str) -> bool> = if is_regex {
        let re = regex::RegexBuilder::new(&query)
            .case_insensitive(!case_sensitive)
            .build()
            .map_err(|_| "正则表达式无效".to_string())?;
        Box::new(move |name: &str| re.is_match(name))
    } else if case_sensitive {
        Box::new(move |name: &str| name.contains(&query))
    } else {
        let needle = query.to_lowercase();
        Box::new(move |name: &str| name.to_lowercase().contains(&needle))
    };
    let want_dirs = match file_type.as_str() {
        "file" => Some(false),
        "directory" => Some(true),
        _ => None,
    };
    let mut hits = Vec::new();
    walk_search(Path::new(&root), matcher.as_ref(), want_dirs, 0, &mut hits);
    Ok(hits)
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
            set_data_dir,
            search_workspace
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
