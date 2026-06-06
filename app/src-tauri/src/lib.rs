// ─────────────────────────────────────────
// HALO — lib.rs
// Registers plugins and commands.
// ─────────────────────────────────────────

use std::process::Command;

// ── Apply Finder Icon ──
// Generic command: folder_path + icon_path
// Works for any folder, any icon.
// Day 9: emoji → PNG → this command.
#[tauri::command]
fn apply_finder_icon(folder_path: String, icon_path: String) -> Result<String, String> {

    // Locate the Swift script
    let swift_script = std::env::current_exe()
        .map_err(|e| e.to_string())?
        .parent()
        .ok_or("No parent dir")?
        .join("set-icon.swift");

    // Fall back to assets path during development
    let script_path = if swift_script.exists() {
        swift_script.to_string_lossy().to_string()
    } else {
        // Development path
        let dev_path = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .unwrap()
            .parent()
            .unwrap()
            .join("assets")
            .join("set-icon.swift");
        dev_path.to_string_lossy().to_string()
    };

    // Run: swift set-icon.swift <folder_path> <icon_path>
    let output = Command::new("swift")
        .arg(&script_path)
        .arg(&folder_path)
        .arg(&icon_path)
        .output()
        .map_err(|e| format!("Failed to run swift: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() && stdout.contains("SUCCESS") {
        Ok(stdout.trim().to_string())
    } else {
        Err(format!("Swift error: {} {}", stdout, stderr))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![apply_finder_icon])
        .run(tauri::generate_context!())
        .expect("error while running HALO");
}