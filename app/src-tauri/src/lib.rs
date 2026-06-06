// ─────────────────────────────────────────
// HALO — lib.rs
// Identity: halo-data.json (unchanged)
// Search:   halo.db SQLite FTS5 (new)
// Two systems. Each does one job.
// ─────────────────────────────────────────

use std::path::PathBuf;
use std::process::Command;
use std::sync::{Arc, Mutex};
use rusqlite::{Connection, params};
use walkdir::WalkDir;
use tauri::Emitter;

// ── Global DB mutex for thread safety ──
static DB_MUTEX: std::sync::OnceLock<Arc<Mutex<()>>> = std::sync::OnceLock::new();

fn get_db_lock() -> Arc<Mutex<()>> {
    DB_MUTEX.get_or_init(|| Arc::new(Mutex::new(()))).clone()
}

// ── Paths ──
fn assets_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent().unwrap()
        .parent().unwrap()
        .join("assets")
}

fn halo_support_dir() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_default();
    PathBuf::from(home)
        .join("Library")
        .join("Application Support")
        .join("HALO")
}

fn db_path() -> PathBuf {
    halo_support_dir().join("halo.db")
}

fn icons_cache_dir() -> PathBuf {
    halo_support_dir().join("icons")
}

// ── Open database ──
fn open_db() -> Result<Connection, String> {
    std::fs::create_dir_all(halo_support_dir())
        .map_err(|e| e.to_string())?;

    let conn = Connection::open(db_path())
        .map_err(|e| e.to_string())?;

    // Create tables if they don't exist
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS indexed_files (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            path      TEXT NOT NULL UNIQUE,
            name      TEXT NOT NULL,
            folder    TEXT NOT NULL,
            extension TEXT NOT NULL,
            modified  INTEGER NOT NULL
        );

        CREATE VIRTUAL TABLE IF NOT EXISTS file_content
        USING fts5(
            path,
            content,
            tokenize='porter unicode61'
        );
    ").map_err(|e| e.to_string())?;

    Ok(conn)
}

// ── Indexable extensions ──
fn is_indexable(ext: &str) -> bool {
    matches!(ext,
        "txt" | "md" | "markdown" | "json" |
        "rs"  | "ts" | "js" | "py" | "swift" |
        "css" | "html" | "xml" | "yaml" | "yml" |
        "toml" | "sh" | "bash" | "csv"
    )
}

// ── Index a folder (non-blocking) ──
#[tauri::command]
fn index_folder(folder_path: String, app: tauri::AppHandle) -> Result<String, String> {
    let path = folder_path.clone();

    std::thread::spawn(move || {
        let binding = get_db_lock();
        let _lock = binding.lock().unwrap();
        let conn = match open_db() {
            Ok(c)  => c,
            Err(e) => {
                let _ = app.emit("index-error", e);
                return;
            }
        };

        let mut indexed = 0;
        let mut total   = 0;

        // Count total first for progress
        for entry in WalkDir::new(&path)
            .follow_links(false)
            .max_depth(5)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if entry.file_type().is_file() {
                let ext = entry.path()
                    .extension()
                    .and_then(|e| e.to_str())
                    .unwrap_or("")
                    .to_lowercase();
                if is_indexable(&ext) { total += 1; }
            }
        }

        for entry in WalkDir::new(&path)
            .follow_links(false)
            .max_depth(5)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if !entry.file_type().is_file() { continue; }

            let file_path = entry.path();
            let ext = file_path.extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_lowercase();

            if !is_indexable(&ext) { continue; }

            let content = match std::fs::read_to_string(file_path) {
                Ok(c)  => c,
                Err(_) => continue,
            };

            if content.trim().is_empty() { continue; }

            let path_str = file_path.to_string_lossy().to_string();
            let name     = file_path.file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("")
                .to_string();

            let modified = std::fs::metadata(file_path)
                .ok()
                .and_then(|m| m.modified().ok())
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs() as i64)
                .unwrap_or(0);

            let _ = conn.execute(
                "INSERT OR REPLACE INTO indexed_files
                 (path, name, folder, extension, modified)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![path_str, name, path, ext, modified],
            );

            let _ = conn.execute(
                "DELETE FROM file_content WHERE path = ?1",
                rusqlite::params![path_str],
            );

            let _ = conn.execute(
                "INSERT INTO file_content (path, content) VALUES (?1, ?2)",
                rusqlite::params![path_str, content],
            );

            indexed += 1;

            // Emit progress every 10 files
            if indexed % 10 == 0 {
                let _ = app.emit("index-progress", serde_json::json!({
                    "folder":  path,
                    "indexed": indexed,
                    "total":   total,
                }));
            }
        }

        let _ = app.emit("index-complete", serde_json::json!({
            "folder":  path,
            "indexed": indexed,
            "total":   total,
        }));
    });

    Ok("Indexing started in background".to_string())
}

// ── Search ──
#[tauri::command]
fn search_files(query: String, limit: Option<i64>) -> Result<Vec<serde_json::Value>, String> {
    if query.trim().is_empty() {
        return Ok(vec![]);
    }

    let conn  = open_db()?;
    let limit = limit.unwrap_or(20);

    // FTS5 search with snippet
    let sql = "
        SELECT
            f.path,
            f.name,
            f.folder,
            f.extension,
            snippet(file_content, 1, '<b>', '</b>', '...', 20) as snippet
        FROM file_content fc
        JOIN indexed_files f ON f.path = fc.path
        WHERE file_content MATCH ?1
        ORDER BY rank
        LIMIT ?2
    ";

    let mut stmt = conn.prepare(sql)
        .map_err(|e| e.to_string())?;

    let results: Vec<serde_json::Value> = stmt.query_map(
        params![query, limit],
        |row| {
            Ok(serde_json::json!({
                "path":      row.get::<_, String>(0)?,
                "name":      row.get::<_, String>(1)?,
                "folder":    row.get::<_, String>(2)?,
                "extension": row.get::<_, String>(3)?,
                "snippet":   row.get::<_, String>(4)?,
            }))
        }
    )
    .map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(results)
}

// ── Get index stats ──
#[tauri::command]
fn get_index_stats() -> Result<serde_json::Value, String> {
    let conn = open_db()?;

    let file_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM indexed_files",
        [],
        |row| row.get(0),
    ).unwrap_or(0);

    let folder_count: i64 = conn.query_row(
        "SELECT COUNT(DISTINCT folder) FROM indexed_files",
        [],
        |row| row.get(0),
    ).unwrap_or(0);

    Ok(serde_json::json!({
        "files":   file_count,
        "folders": folder_count,
    }))
}

// ── Apply folder icon ──
#[tauri::command]
fn apply_folder_icon(
    folder_path: String,
    emoji:       String,
    hex_color:   String,
) -> Result<String, String> {
    let safe_color = hex_color.trim_start_matches('#');
    let safe_emoji = emoji
        .chars()
        .map(|c| format!("{:x}", c as u32))
        .collect::<Vec<_>>()
        .join("_");
    let cache_name = format!("{}_{}.icns", safe_emoji, safe_color);

    let cache_dir = icons_cache_dir();
    std::fs::create_dir_all(&cache_dir)
        .map_err(|e| format!("Cache dir error: {}", e))?;

    let icns_path = cache_dir.join(&cache_name);

    if !icns_path.exists() {
        let generator = assets_dir().join("generate-icon.swift");
        let gen_output = Command::new("swift")
            .arg(&generator)
            .arg(&emoji)
            .arg(safe_color)
            .arg(icns_path.to_str().unwrap())
            .output()
            .map_err(|e| format!("Failed to run generator: {}", e))?;

        let stdout = String::from_utf8_lossy(&gen_output.stdout);
        let stderr = String::from_utf8_lossy(&gen_output.stderr);

        if !gen_output.status.success() || !stdout.contains("SUCCESS") {
            return Err(format!("Generator failed: {} {}", stdout, stderr));
        }
    }

    let setter = assets_dir().join("set-icon.swift");
    let set_output = Command::new("swift")
        .arg(&setter)
        .arg(&folder_path)
        .arg(icns_path.to_str().unwrap())
        .output()
        .map_err(|e| format!("Failed to run setter: {}", e))?;

    let stdout = String::from_utf8_lossy(&set_output.stdout);
    let stderr = String::from_utf8_lossy(&set_output.stderr);

    if set_output.status.success() && stdout.contains("SUCCESS") {
        Ok("✓ Synced to Finder".to_string())
    } else {
        Err(format!("Setter failed: {} {}", stdout, stderr))
    }
}

// ── Open file in default app ──
#[tauri::command]
fn open_file(path: String) -> Result<(), String> {
    Command::new("open")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Reveal file in Finder ──
#[tauri::command]
fn reveal_in_finder(path: String) -> Result<(), String> {
    Command::new("open")
        .arg("-R")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}
    #[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            apply_folder_icon,
            index_folder,
            search_files,
            get_index_stats,
            open_file,
            reveal_in_finder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running HALO");
}