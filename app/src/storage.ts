// ─────────────────────────────────────────
// HALO — storage.ts
// Persistence layer. Save it. Load it. Delete it.
// identity.ts  → Who is this folder?
// scanner.ts   → What facts exist?
// storage.ts   → Remember it between sessions.
// ─────────────────────────────────────────

import { appDataDir, join } from "@tauri-apps/api/path";
import { mkdir, readTextFile, writeTextFile, exists } from "@tauri-apps/plugin-fs";

// ── Folder Record ──
export interface FolderRecord {
  id:             string;
  path:           string;
  name:           string;
  icon:           string;
  category:       string;
  color:          string;
  colorVar:       string;
  description:    string;
  fileCount:      number;
  folderCount:    number;
  lastModified:   string;  // ISO 8601 timestamp
  addedAt:        string;  // ISO 8601 timestamp
  identitySource: "rules" | "user" | "ai";
  isCustomized:   boolean;
}

// ── Storage Shape ──
interface HALOData {
  version: string;
  folders: FolderRecord[];
}

// ── Default Data ──
const DEFAULT_DATA: HALOData = {
  version: "0.0.1",
  folders: [],
};

// ── Generate Simple ID ──
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Get Storage Path ──
async function getStoragePath(): Promise<string> {
  const appDir = await appDataDir();
  return await join(appDir, "halo-data.json");
}

// ── Ensure Storage Directory Exists ──
async function ensureStorageDir(): Promise<void> {
  const appDir = await appDataDir();
  const dirExists = await exists(appDir);
  if (!dirExists) {
    await mkdir(appDir, { recursive: true });
  }
}

// ── Load All Folders ──
export async function loadAllFolders(): Promise<FolderRecord[]> {
  try {
    await ensureStorageDir();
    const storagePath = await getStoragePath();
    const fileExists  = await exists(storagePath);

    if (!fileExists) {
      return [];
    }

    const raw  = await readTextFile(storagePath);
    const data = JSON.parse(raw) as HALOData;
    return data.folders ?? [];

  } catch (error) {
    console.error("HALO storage load error:", error);
    return [];
  }
}

// ── Save All Folders ──
async function saveAllFolders(folders: FolderRecord[]): Promise<void> {
  try {
    await ensureStorageDir();
    const storagePath = await getStoragePath();
    const data: HALOData = {
      version: DEFAULT_DATA.version,
      folders,
    };
    await writeTextFile(storagePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("HALO storage save error:", error);
  }
}

// ── Save or Update a Folder ──
export async function saveFolder(folder: Omit<FolderRecord, "id" | "addedAt"> & { id?: string; addedAt?: string }): Promise<FolderRecord> {
  const folders = await loadAllFolders();
  const existingIndex = folders.findIndex(f => f.path === folder.path);

  const record: FolderRecord = {
    ...folder,
    id:       folder.id      ?? generateId(),
    addedAt:  folder.addedAt ?? new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    folders[existingIndex] = record;
  } else {
    folders.push(record);
  }

  await saveAllFolders(folders);
  return record;
}

// ── Get Folder By Path ──
export async function getFolderByPath(path: string): Promise<FolderRecord | null> {
  const folders = await loadAllFolders();
  return folders.find(f => f.path === path) ?? null;
}

// ── Delete Folder ──
export async function deleteFolder(path: string): Promise<void> {
  const folders = await loadAllFolders();
  const updated = folders.filter(f => f.path !== path);
  await saveAllFolders(updated);
}