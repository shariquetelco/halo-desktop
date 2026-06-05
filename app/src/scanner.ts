// ─────────────────────────────────────────
// HALO — scanner.ts
// Reads the shape of a folder.
// Not what's inside. Just what exists.
// Facts, not opinions.
// ─────────────────────────────────────────

import { readDir } from "@tauri-apps/plugin-fs";

// ── Scan Result ──
export interface ScanResult {
  fileCount:    number;
  folderCount:  number;
  lastModified: string;
}

// ── Format Date ──
function formatDate(date: Date): string {
  const now  = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60)                        return "Just now";
  if (diff < 3600)                      return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400)                     return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800)                    return `${Math.floor(diff / 86400)} days ago`;
  if (diff < 2592000)                   return `${Math.floor(diff / 604800)} weeks ago`;
  if (diff < 31536000)                  return `${Math.floor(diff / 2592000)} months ago`;
  return `${Math.floor(diff / 31536000)} years ago`;
}

// ── Core Scanner ──
export async function scanFolder(folderPath: string): Promise<ScanResult> {
  try {
    const entries = await readDir(folderPath);

    let fileCount   = 0;
    let folderCount = 0;

    for (const entry of entries) {
      if (entry.isDirectory) {
        folderCount++;
      } else {
        fileCount++;
      }
    }

    // Use current time as last modified approximation for Day 3
    // Full stat() support comes in a later version
    const lastModified = formatDate(new Date());

    return {
      fileCount,
      folderCount,
      lastModified,
    };

  } catch (error) {
    console.error("HALO scanner error:", error);
    return {
      fileCount:    0,
      folderCount:  0,
      lastModified: "Unknown",
    };
  }
}