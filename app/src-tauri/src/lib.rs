// ─────────────────────────────────────────
// HALO — lib.rs
// Registers plugins and Tauri commands.
// ─────────────────────────────────────────

use std::process::Command;
use std::path::PathBuf;

// ── Get assets directory ──
fn assets_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent().unwrap()
        .parent().unwrap()
        .join("assets")
}

// ── Get HALO icons cache directory ──
fn icons_cache_dir() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_default();
    PathBuf::from(home)
        .join("Library")
        .join("Application Support")
        .join("HALO")
        .join("icons")
}

// ── Generate and apply folder icon ──
// Called automatically when user changes icon or color.
// Cached: same emoji+color won't regenerate.
#[tauri::command]
fn apply_folder_icon(
    folder_path: String,
    emoji:       String,
    hex_color:   String,
) -> Result<String, String> {

    // ── Build cache key ──
    let safe_color = hex_color.trim_start_matches('#');
    let safe_emoji = emoji
        .chars()
        .map(|c| format!("{:x}", c as u32))
        .collect::<Vec<_>>()
        .join("_");
    let cache_name = format!("{}_{}.icns", safe_emoji, safe_color);

    // ── Ensure cache dir exists ──
    let cache_dir = icons_cache_dir();
    std::fs::create_dir_all(&cache_dir)
        .map_err(|e| format!("Cache dir error: {}", e))?;

    let icns_path = cache_dir.join(&cache_name);

    // ── Generate icon if not cached ──
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

    // ── Apply icon to folder ──
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
        Ok(format!("✓ Synced to Finder"))
    } else {
        Err(format!("Setter failed: {} {}", stdout, stderr))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![apply_folder_icon])
        .run(tauri::generate_context!())
        .expect("error while running HALO");
}