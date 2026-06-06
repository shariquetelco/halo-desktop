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

    // Performance optimizations
    conn.execute_batch("
        PRAGMA journal_mode=WAL;
        PRAGMA synchronous=NORMAL;
        PRAGMA cache_size=10000;
    ").map_err(|e| e.to_string())?;

    Ok(conn)
}

// ── Skip these folder names entirely ──
fn is_tier1(ext: &str) -> bool {
    matches!(ext,
        "pdf" | "docx" | "pptx" | "xlsx" |
        "odt" | "rtf" | "txt" | "md" | "markdown" | "csv"
    )
}

fn is_tier2(ext: &str) -> bool {
    matches!(ext,
        "json" | "xml" | "yaml" | "yml" | "toml" |
        "html" | "css" | "js" | "ts" | "py" |
        "rs" | "swift" | "java" | "c" | "cpp" |
        "sh" | "bash" | "log"
    )
}

fn is_indexable(ext: &str) -> bool {
    is_tier1(ext) || is_tier2(ext)
}

fn max_file_size_bytes(ext: &str) -> u64 {
    if is_tier1(ext) {
        u64::MAX // No limit for Tier 1 — index everything
    } else {
        // Tier 2 — conservative limits (often machine-generated)
        match ext {
            "json" | "xml" | "html"  => 2_097_152,  // 2MB
            "yaml" | "yml" | "toml"  => 1_048_576,  // 1MB
            "log"                    => 5_242_880,  // 5MB
            _                        => 512_000,    // 500KB for code
        }
    }
}

fn max_content_bytes(ext: &str, content_len: usize) -> usize {
    if is_tier1(ext) {
        // Store full text for small docs (< 5MB extracted)
        // Store 25% for large docs (compression placeholder for V2)
        if content_len <= 5_242_880 {
            content_len // Full text
        } else {
            content_len / 4 // 25% of large documents
        }
    } else {
        204_800 // 200KB for Tier 2
    }
}

fn should_skip_dir(name: &str) -> bool {
    matches!(name,
        "node_modules" | ".git" | "target" | "dist" |
        "build" | "vendor" | ".cache" | "npm-cache" |
        ".next" | ".nuxt" | "__pycache__" | ".venv" |
        "venv" | ".tox" | "coverage" | ".nyc_output" |
        ".gradle" | ".idea" | ".vscode" | "Pods" |
        "DerivedData" | ".swiftpm" | ".terraform" |
        "bower_components"
    )
}

fn should_skip_file(name: &str, ext: &str) -> bool {
    if name.contains(".min.js") || name.contains(".min.css") { return true; }
    if ext == "map" { return true; }
    if name.ends_with(".d.ts") { return true; }
    if matches!(name,
        "package-lock.json" | "yarn.lock" | "Cargo.lock" |
        "Gemfile.lock" | "poetry.lock" | "pnpm-lock.yaml" |
        "composer.lock"
    ) { return true; }
    false
}

// ── Index a folder (non-blocking, sequential) ──
#[tauri::command]
fn index_folder(folder_path: String, app: tauri::AppHandle) -> Result<String, String> {
    let path = folder_path.clone();

    std::thread::spawn(move || {
        let binding = get_db_lock();
        let _lock   = binding.lock().unwrap();

        let conn = match open_db() {
            Ok(c)  => c,
            Err(e) => {
                let _ = app.emit("index-error", e);
                return;
            }
        };

        let mut indexed = 0u64;
        let mut total   = 0u64;

        // ── Count indexable files first ──
        for entry in WalkDir::new(&path)
            .follow_links(false)
            .max_depth(6)
            .into_iter()
            .filter_entry(|e| {
                if e.file_type().is_dir() {
                    let name = e.file_name().to_str().unwrap_or("");
                    return !should_skip_dir(name);
                }
                true
            })
            .filter_map(|e| e.ok())
        {
            if entry.file_type().is_file() {
                let ext = entry.path()
                    .extension()
                    .and_then(|e| e.to_str())
                    .unwrap_or("")
                    .to_lowercase();
                if is_indexable(&ext) {
                    total += 1;
                }
            }
        }

        // ── Index files ──
        for entry in WalkDir::new(&path)
            .follow_links(false)
            .max_depth(6)
            .into_iter()
            .filter_entry(|e| {
                if e.file_type().is_dir() {
                    let name = e.file_name().to_str().unwrap_or("");
                    return !should_skip_dir(name);
                }
                true
            })
            .filter_map(|e| e.ok())
        {
            if !entry.file_type().is_file() {
                continue;
            }

            let file_path = entry.path();
            let ext = file_path
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_lowercase();

            if !is_indexable(&ext) {
                continue;
            }

            let file_name = file_path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("");

            if should_skip_file(file_name, &ext) {
                continue;
            }
            if should_skip_file(file_name, &ext) {
                continue;
            }

            // Smart size limit by tier
            if let Ok(metadata) = std::fs::metadata(file_path) {
                if metadata.len() > max_file_size_bytes(&ext) {
                    continue;
                }
            }

            

            let content = if ext == "pdf" {
                // Extract PDF text via Swift PDFKit
                let extractor = assets_dir().join("extract-pdf.swift");
                let output = Command::new("swift")
                    .arg(&extractor)
                    .arg(file_path)
                    .output();

                match output {
                    Ok(o) if o.status.success() => {
                        String::from_utf8_lossy(&o.stdout).to_string()
                    }
                    _ => continue,
                }
            } else if ext == "docx" {
                let extractor = assets_dir().join("extract-docx.swift");
                let output = Command::new("swift")
                    .arg(&extractor)
                    .arg(file_path)
                    .output();

                match output {
                    Ok(o) if o.status.success() => {
                        String::from_utf8_lossy(&o.stdout).to_string()
                    }
                    _ => continue,
                }
            } else if ext == "pptx" {
                let extractor = assets_dir().join("extract-pptx.swift");
                let output = Command::new("swift")
                    .arg(&extractor)
                    .arg(file_path)
                    .output();

                match output {
                    Ok(o) if o.status.success() => {
                        String::from_utf8_lossy(&o.stdout).to_string()
                    }
                    _ => continue,
                }
            } else if ext == "xlsx" {
                let extractor = assets_dir().join("extract-xlsx.swift");
                let output = Command::new("swift")
                    .arg(&extractor)
                    .arg(file_path)
                    .output();

                match output {
                    Ok(o) if o.status.success() => {
                        String::from_utf8_lossy(&o.stdout).to_string()
                    }
                    _ => continue,
                }
            } else {
                match std::fs::read_to_string(file_path) {
                    Ok(c)  => c,
                    Err(_) => continue,
                }
            };

            if content.trim().is_empty() {
                continue;
            }

            let limit = max_content_bytes(&ext, content.len());
            let content = if content.len() > limit {
                content[..limit].to_string()
            } else {
                content
            };

            let path_str = file_path.to_string_lossy().to_string();
            let name     = file_path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("")
                .to_string();

            let modified = std::fs::metadata(file_path)
                .ok()
                .and_then(|m| m.modified().ok())
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs() as i64)
                .unwrap_or(0);

            // Skip if file hasn't changed since last index
            let existing: Option<i64> = conn.query_row(
                "SELECT modified FROM indexed_files WHERE path = ?1",
                params![path_str],
                |row| row.get(0),
            ).ok();

            if let Some(existing_modified) = existing {
                if existing_modified >= modified {
                    indexed += 1;
                    continue; // Skip unchanged file
                }
            }

            let _ = conn.execute(
                "INSERT OR REPLACE INTO indexed_files
                 (path, name, folder, extension, modified)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![path_str, name, path, ext, modified],
            );

            let _ = conn.execute(
                "DELETE FROM file_content WHERE path = ?1",
                params![path_str],
            );

            let _ = conn.execute(
                "INSERT INTO file_content (path, content) VALUES (?1, ?2)",
                params![path_str, content],
            );

            indexed += 1;

            if indexed % 20 == 0 {
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

    Ok("Indexing started".to_string())
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

    // Count by file type
    let pdf_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM indexed_files WHERE extension = 'pdf'",
        [], |row| row.get(0),
    ).unwrap_or(0);

    let docx_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM indexed_files WHERE extension = 'docx'",
        [], |row| row.get(0),
    ).unwrap_or(0);

    let pptx_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM indexed_files WHERE extension = 'pptx'",
        [], |row| row.get(0),
    ).unwrap_or(0);

    let xlsx_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM indexed_files WHERE extension = 'xlsx'",
        [], |row| row.get(0),
    ).unwrap_or(0);

    let text_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM indexed_files WHERE extension IN ('txt','md','markdown','csv','json','xml','yaml','toml','ts','js','py','rs','swift')",
        [], |row| row.get(0),
    ).unwrap_or(0);

    // Get DB size
    let db_size = std::fs::metadata(db_path())
        .map(|m| m.len())
        .unwrap_or(0);

    let db_size_mb = db_size / 1_048_576;

    Ok(serde_json::json!({
        "files":      file_count,
        "folders":    folder_count,
        "pdfs":       pdf_count,
        "docx":       docx_count,
        "pptx":       pptx_count,
        "xlsx":       xlsx_count,
        "text":       text_count,
        "db_size_mb": db_size_mb,
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
// ── Vacuum database ──
#[tauri::command]
fn vacuum_db() -> Result<String, String> {
    let conn = open_db()?;
    conn.execute_batch("VACUUM;")
        .map_err(|e| e.to_string())?;
    let size = std::fs::metadata(db_path())
        .map(|m| m.len() / 1_048_576)
        .unwrap_or(0);
    Ok(format!("Database optimized: {}MB", size))
}

// ── Find largest indexed files ──
#[tauri::command]
fn get_largest_files(limit: Option<i64>) -> Result<Vec<serde_json::Value>, String> {
    let conn = open_db()?;
    let limit = limit.unwrap_or(20);

    let mut stmt = conn.prepare(
        "SELECT f.name, f.extension, f.folder,
                LENGTH(fc.content) as content_size
         FROM indexed_files f
         JOIN file_content fc ON fc.path = f.path
         ORDER BY content_size DESC
         LIMIT ?1"
    ).map_err(|e| e.to_string())?;

    let results: Vec<serde_json::Value> = stmt.query_map(
        params![limit],
        |row| Ok(serde_json::json!({
            "name":      row.get::<_, String>(0)?,
            "extension": row.get::<_, String>(1)?,
            "folder":    row.get::<_, String>(2)?,
            "size_kb":   row.get::<_, i64>(3)? / 1024,
        }))
    ).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(results)
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
            vacuum_db,
            get_largest_files,
        ])
        .run(tauri::generate_context!())
        .expect("error while running HALO");
}