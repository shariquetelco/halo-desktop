import Cocoa

// ─────────────────────────────────────────
// HALO — set-icon.swift
// Applies a custom PNG icon to a folder
// using NSWorkspace (macOS native API).
//
// Usage:
//   swift set-icon.swift <folder_path> <icon_path>
// ─────────────────────────────────────────

let args = CommandLine.arguments

guard args.count == 3 else {
    print("ERROR: Usage: set-icon.swift <folder_path> <icon_path>")
    exit(1)
}

let folderPath = args[1]
let iconPath   = args[2]

// Verify folder exists
guard FileManager.default.fileExists(atPath: folderPath) else {
    print("ERROR: Folder not found: \(folderPath)")
    exit(1)
}

// Verify icon exists
guard FileManager.default.fileExists(atPath: iconPath) else {
    print("ERROR: Icon not found: \(iconPath)")
    exit(1)
}

// Load the icon image
guard let image = NSImage(contentsOfFile: iconPath) else {
    print("ERROR: Could not load image: \(iconPath)")
    exit(1)
}

// Apply icon using NSWorkspace
let success = NSWorkspace.shared.setIcon(image, forFile: folderPath, options: [])

if success {
    print("SUCCESS: Icon applied to \(folderPath)")
    exit(0)
} else {
    print("ERROR: NSWorkspace failed to set icon")
    exit(1)
}