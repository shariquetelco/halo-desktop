// ─────────────────────────────────────────
// HALO — search.ts
// Search foundation.
// Today: searches HALO folders.
// Tomorrow: macOS Spotlight, Windows Search.
// The UI never changes. Only the backend swaps.
// ─────────────────────────────────────────

import { FolderRecord } from "./storage";

// ── Search Result ──
export interface SearchResult {
  folder:   FolderRecord;
  score:    number;
  matchOn:  "name" | "category" | "description";
}

// ── Primary Search Interface ──
// This is the function the UI always calls.
// Swap the implementation below to change the backend.
export function searchFolders(
  query: string,
  folders: FolderRecord[]
): SearchResult[] {
  return searchHALOFolders(query, folders);
}

// ── Backend: HALO Folders ──
// Searches only folders tracked inside HALO.
// Fast. Local. No permissions needed.
function searchHALOFolders(
  query: string,
  folders: FolderRecord[]
): SearchResult[] {
  if (!query.trim()) return [];

  const q = query.toLowerCase().trim();
  const results: SearchResult[] = [];

  for (const folder of folders) {
    const nameMatch        = folder.name.toLowerCase().includes(q);
    const categoryMatch    = folder.category.toLowerCase().includes(q);
    const descriptionMatch = folder.description?.toLowerCase().includes(q) ?? false;

    if (!nameMatch && !categoryMatch && !descriptionMatch) continue;

    let score = 0;
    let matchOn: SearchResult["matchOn"] = "name";

    if (nameMatch) {
      score = folder.name.toLowerCase().startsWith(q) ? 100 : 80;
      matchOn = "name";
    } else if (categoryMatch) {
      score = 60;
      matchOn = "category";
    } else if (descriptionMatch) {
      score = 40;
      matchOn = "description";
    }

    results.push({ folder, score, matchOn });
  }

  return results.sort((a, b) => b.score - a.score);
}

// ── Future Backend Stubs ──
// Uncomment and implement when ready.

// Backend: macOS Spotlight
// async function searchSpotlight(query: string): Promise<SearchResult[]> {
//   invoke Tauri command → mdfind query
//   map results to SearchResult[]
// }

// Backend: Windows Search
// async function searchWindows(query: string): Promise<SearchResult[]> {
//   invoke Tauri command → Windows Search API
//   map results to SearchResult[]
// }