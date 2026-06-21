use std::fs;
use std::sync::Mutex;
use serde::Serialize;

#[derive(Serialize, Clone)]
struct SearchMatch {
    file_path: String,
    line: u32,
    preview: String,
}

// Paths passed as CLI args before the window opens are stashed here so the
// frontend can retrieve them once the app is ready.
static PENDING_OPEN_FILES: Mutex<Vec<String>> = Mutex::new(Vec::new());

#[tauri::command]
fn take_pending_open_files() -> Vec<String> {
    let mut lock = PENDING_OPEN_FILES.lock().unwrap_or_else(|e| e.into_inner());
    std::mem::take(&mut *lock)
}

#[tauri::command]
fn reveal_in_file_manager(path: String) {
    // On Linux use xdg-open on the parent directory
    let p = std::path::Path::new(&path);
    let target = if p.is_dir() { p } else { p.parent().unwrap_or(p) };
    let _ = std::process::Command::new("xdg-open").arg(target).spawn();
}

// ── Recherche dans le projet (Phase 4) ───────────────────────────────────────

const TEXT_EXTS: &[&str] = &["md", "markdown", "tex", "txt", "rst", "org"];
const SKIP_DIRS: &[&str] = &[
    "node_modules", ".git", "target", "__pycache__", "dist", ".venv", ".next", ".cache",
];

fn walk_search(
    dir: &std::path::Path,
    query: &str,
    case_sensitive: bool,
    results: &mut Vec<SearchMatch>,
    limit: usize,
) {
    if results.len() >= limit { return; }
    let mut entries: Vec<_> = match fs::read_dir(dir) {
        Ok(e) => e.flatten().collect(),
        Err(_) => return,
    };
    entries.sort_by_key(|e| e.file_name());

    for entry in entries {
        if results.len() >= limit { break; }
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        if path.is_dir() {
            if !SKIP_DIRS.contains(&name.as_str()) && !name.starts_with('.') {
                walk_search(&path, query, case_sensitive, results, limit);
            }
        } else if path.is_file() {
            let ext = name.rsplit('.').next().unwrap_or("").to_lowercase();
            if !TEXT_EXTS.contains(&ext.as_str()) { continue; }
            let content = match fs::read_to_string(&path) { Ok(c) => c, Err(_) => continue };
            let q = if case_sensitive { query.to_string() } else { query.to_lowercase() };
            for (i, line) in content.lines().enumerate() {
                let lc = if case_sensitive { line.to_string() } else { line.to_lowercase() };
                if lc.contains(&q) {
                    results.push(SearchMatch {
                        file_path: path.to_string_lossy().into_owned(),
                        line: (i + 1) as u32,
                        preview: line.trim().chars().take(140).collect(),
                    });
                    if results.len() >= limit { break; }
                }
            }
        }
    }
}

#[tauri::command]
fn search_in_project(dir: String, query: String, case_sensitive: bool) -> Result<Vec<SearchMatch>, String> {
    if query.trim().is_empty() { return Ok(vec![]); }
    let mut results = Vec::new();
    walk_search(std::path::Path::new(&dir), &query, case_sensitive, &mut results, 500);
    Ok(results)
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            take_pending_open_files,
            reveal_in_file_manager,
            search_in_project,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
