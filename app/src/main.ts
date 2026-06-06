// ─────────────────────────────────────────
// HALO — main.ts
// Orchestration layer. Thin by design.
// ─────────────────────────────────────────

import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { getIdentity, getAllIcons, getAllColors, getDefaultRecentIcons, FolderIdentity } from "./identity";
import { scanFolder } from "./scanner";
import { saveFolder, loadAllFolders, deleteFolder, FolderRecord } from "./storage";
import { findRelatedFolders } from "./relations";
import { listen } from "@tauri-apps/api/event";

// ── State ──
let folders: FolderRecord[] = [];
let activeFolderPath: string | null = null;
let searchQuery = "";
let recentlyViewed: { path: string; viewedAt: string }[] = [];

// ── DOM References ──
const addFolderBtn      = document.getElementById("add-folder-btn")!;
const heroCta           = document.getElementById("hero-cta")!;
const folderList        = document.getElementById("folder-list")!;
const folderListEmpty   = document.getElementById("folder-list-empty")!;
const sidebarCount      = document.getElementById("sidebar-folder-count")!;
const sidebarSearch     = document.getElementById("sidebar-search") as HTMLInputElement;
const headerActions     = document.getElementById("header-actions")!;
const emptyState        = document.getElementById("empty-state")!;
const identityView      = document.getElementById("identity-view")!;
const identityIcon      = document.getElementById("identity-icon")!;
const identityName      = document.getElementById("identity-name")!;
const identityCategory  = document.getElementById("identity-category")!;
const descriptionText   = document.getElementById("description-text")!;
const addDescriptionBtn = document.getElementById("add-description-btn")!;
const statFiles         = document.getElementById("stat-files")!;
const statFolders       = document.getElementById("stat-folders")!;
const statModified      = document.getElementById("stat-modified")!;
const changeIconBtn     = document.getElementById("change-icon-btn")!;
const changeColorBtn    = document.getElementById("change-color-btn")!;
const searchInput        = document.getElementById("search-input") as HTMLInputElement;
const searchResultsView  = document.getElementById("search-results-view")!;
const searchResultsList  = document.getElementById("search-results-list")!;
const searchResultsCount = document.getElementById("search-results-count")!;
const searchQuote        = document.getElementById("search-quote")!;
const indexBtn           = document.getElementById("index-btn")!;
const indexDropdown      = document.getElementById("index-dropdown")!;
const reindexBtn         = document.getElementById("reindex-btn")!;
const statIndexedFiles   = document.getElementById("stat-indexed-files")!;
const statIndexedFolders = document.getElementById("stat-indexed-folders")!;
const applyFinderBtn    = document.getElementById("apply-finder-btn")!;
// ── Startup ──
async function init(): Promise<void> {
  folders = await loadAllFolders();
  loadRecentlyViewed();
  renderSidebar();
  showEmptyState();
  updateSearchPlaceholder();
}

// ── Recently Viewed ──
function loadRecentlyViewed(): void {
  try {
    const raw = localStorage.getItem("halo-recent");
    recentlyViewed = raw ? JSON.parse(raw) : [];
  } catch {
    recentlyViewed = [];
  }
}

function saveRecentlyViewed(): void {
  try {
    localStorage.setItem("halo-recent", JSON.stringify(recentlyViewed));
  } catch {}
}

function addToRecent(path: string): void {
  recentlyViewed = recentlyViewed.filter(r => r.path !== path);
  recentlyViewed.unshift({ path, viewedAt: new Date().toISOString() });
  recentlyViewed = recentlyViewed.slice(0, 5);
  saveRecentlyViewed();
}

// ── Format Relative Time ──
function formatRelativeTime(isoString: string): string {
  if (!isoString || isoString === "Unknown") return "—";
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60)     return "Just now";
    if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)  return "Today";
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

// ── Hex to RGBA ──
function hexToRgba(hex: string, alpha: number): string {
  if (hex.startsWith("linear-gradient")) return hex;
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── Render Sidebar ──
function renderSidebar(): void {
  const items = folderList.querySelectorAll(".folder-item");
  items.forEach(item => item.remove());

  sidebarCount.textContent = `Folders (${folders.length})`;

  const filtered = folders.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filtered.length === 0) {
    folderListEmpty.classList.remove("hidden");
  } else {
    folderListEmpty.classList.add("hidden");
    filtered.forEach(folder => {
      folderList.appendChild(createFolderItem(folder));
    });
  }
  
  renderMemorySection();
}

// ── Create Folder Item ──
function createFolderItem(folder: FolderRecord): HTMLDivElement {
  const item = document.createElement("div");
  item.className = "folder-item";
  item.dataset.path = folder.path;
  if (folder.path === activeFolderPath) item.classList.add("active");

  const subtitle = folder.category !== "General"
    ? folder.category
    : `${folder.fileCount} file${folder.fileCount !== 1 ? "s" : ""}`;

  item.innerHTML = `
    <span class="folder-item-icon-wrap" style="background: ${hexToRgba(folder.color, 0.18)}">
      ${folder.icon}
    </span>
    <span class="folder-item-text">
      <span class="folder-item-name">${folder.name}</span>
      <span class="folder-item-sub">${subtitle}</span>
    </span>
    <button class="delete-btn" title="Remove from HALO">🗑️</button>
  `;

  item.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains("delete-btn") || target.closest(".delete-btn")) return;
    selectFolder(folder.path);
  });

  const deleteBtn = item.querySelector(".delete-btn") as HTMLButtonElement;
  deleteBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    await removeFolderFromHalo(folder.path);
  });

  return item;
}

// ── Render Memory Section ──
function renderMemorySection(): void {
  const existing = document.getElementById("sidebar-memory");
  if (existing) existing.remove();
  if (folders.length === 0) return;

  const totalFiles = folders.reduce((sum, f) => sum + f.fileCount, 0);
  const categories = new Set(folders.map(f => f.category)).size;

  const section = document.createElement("div");
  section.id = "sidebar-memory";

  const divider = document.createElement("div");
  divider.className = "sidebar-divider";

  const title = document.createElement("div");
  title.className = "sidebar-section-title";
  title.textContent = "Memory";

  section.appendChild(divider);
  section.appendChild(title);

  [
    { label: "Folders tracked", value: folders.length.toString() },
    { label: "Files indexed",   value: totalFiles.toString()     },
    { label: "Categories",      value: categories.toString()     },
  ].forEach(stat => {
    const row = document.createElement("div");
    row.className = "memory-stat";
    row.innerHTML = `
      <span class="memory-stat-label">${stat.label}</span>
      <span class="memory-stat-value">${stat.value}</span>
    `;
    section.appendChild(row);
  });

  folderList.parentElement!.appendChild(section);
}

// ── Show Empty State ──
function showEmptyState(): void {
  emptyState.classList.remove("hidden");
  identityView.classList.add("hidden");
  headerActions.classList.add("hidden");
  activeFolderPath = null;
  renderSidebar();
}

// ── Show Identity View ──
function showIdentityView(folder: FolderRecord): void {
  emptyState.classList.add("hidden");
  identityView.classList.remove("hidden");
  headerActions.classList.remove("hidden");

  identityIcon.textContent     = folder.icon;
  identityName.textContent     = folder.name;
  identityCategory.textContent = folder.category;

  const iconWrapper = document.getElementById("identity-icon-wrapper")!;
  iconWrapper.style.background = hexToRgba(folder.color, 0.2);
  iconWrapper.style.boxShadow  = `0 0 32px ${hexToRgba(folder.color, 0.35)}`;

  const atmosphere = document.getElementById("identity-atmosphere")!;
  atmosphere.style.background = `linear-gradient(180deg, ${hexToRgba(folder.color, 0.15)} 0%, transparent 100%)`;

  if (folder.description) {
    descriptionText.textContent = folder.description;
    descriptionText.classList.add("has-content");
    addDescriptionBtn.textContent = "✏️ Edit Description";
  } else {
    descriptionText.textContent = "What is this folder for?";
    descriptionText.classList.remove("has-content");
    addDescriptionBtn.textContent = "+ Add Description";
  }

  statFiles.textContent    = folder.fileCount.toString();
  statFolders.textContent  = folder.folderCount.toString();
  statModified.textContent = formatRelativeTime(folder.lastModified);

  // ── Related Folders ──
  // ── Related Folders ──
  renderRelations(folder);
}

// ── Render Relations ──
function renderRelations(folder: FolderRecord): void {
  const relationsEl   = document.getElementById("identity-relations")!;
  const relationsList = document.getElementById("relations-list")!;

  // Load manual overrides from localStorage
  const storageKey = `halo-relations-${folder.path}`;
  let manualRelations: string[] = [];
  let removedRelations: string[] = [];

  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      manualRelations  = parsed.manual  ?? [];
      removedRelations = parsed.removed ?? [];
    }
  } catch {}

  function saveRelationOverrides() {
    localStorage.setItem(storageKey, JSON.stringify({
      manual:  manualRelations,
      removed: removedRelations,
    }));
  }

  // Get auto-suggested relations minus removed ones
  const autoRelated = findRelatedFolders(folder, folders)
    .filter(r => !removedRelations.includes(r.folder.path));

  // Get manually added relations
  const manualFolders = manualRelations
    .map(path => folders.find(f => f.path === path))
    .filter(Boolean) as FolderRecord[];

  // Combine: manual first, then auto
  const allRelated = [
    ...manualFolders.map(f => ({ folder: f, strength: "strong" as const, reason: "Added by you", manual: true })),
    ...autoRelated.map(r => ({ ...r, manual: false })),
  ];

  relationsEl.classList.remove("hidden");
  relationsList.innerHTML = "";

  if (allRelated.length === 0 && folders.length <= 1) {
    relationsEl.classList.add("hidden");
    return;
  }

  // Render each relation
  allRelated.forEach(relation => {
    const item = document.createElement("div");
    item.className = `relation-item relation-strength-${relation.strength}`;
    item.style.cursor = "pointer";

    item.innerHTML = `
      <span class="relation-icon-wrap"
            style="background: ${hexToRgba(relation.folder.color, 0.18)}">
        ${relation.folder.icon}
      </span>
      <span class="relation-text">
        <span class="relation-name">${relation.folder.name}</span>
        <span class="relation-reason">${relation.manual ? "Added by you" : relation.folder.category}</span>
      </span>
      <button class="relation-remove-btn" title="Remove relationship" style="
        background: none;
        border: none;
        color: rgba(255,255,255,0.2);
        font-size: 14px;
        cursor: pointer;
        padding: 4px 6px;
        border-radius: 6px;
        transition: all 120ms ease;
        flex-shrink: 0;
        display: none;
      ">✕</button>
    `;

    const removeBtn = item.querySelector(".relation-remove-btn") as HTMLButtonElement;

    item.addEventListener("mouseenter", () => {
      removeBtn.style.display = "block";
      removeBtn.style.color = "rgba(255,255,255,0.5)";
    });
    item.addEventListener("mouseleave", () => {
      removeBtn.style.display = "none";
    });

    removeBtn.addEventListener("mouseenter", () => {
      removeBtn.style.color = "#fca5a5";
      removeBtn.style.background = "rgba(239,68,68,0.15)";
    });
    removeBtn.addEventListener("mouseleave", () => {
      removeBtn.style.color = "rgba(255,255,255,0.5)";
      removeBtn.style.background = "none";
    });

    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (relation.manual) {
        manualRelations = manualRelations.filter(p => p !== relation.folder.path);
      } else {
        removedRelations.push(relation.folder.path);
      }
      saveRelationOverrides();
      renderRelations(folder);
    });

    item.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).classList.contains("relation-remove-btn")) return;
      selectFolder(relation.folder.path);
    });

    relationsList.appendChild(item);
  });

  // ── Add Relationship Button ──
  const addBtn = document.createElement("button");
  addBtn.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: none;
    border: 1px dashed rgba(255,255,255,0.1);
    border-radius: 10px;
    color: rgba(255,255,255,0.3);
    font-size: 12px;
    cursor: pointer;
    font-family: inherit;
    transition: all 150ms ease;
    margin-top: 2px;
  `;
  addBtn.textContent = "+ Add Relationship";

  addBtn.addEventListener("mouseenter", () => {
    addBtn.style.borderColor = "rgba(124,106,247,0.4)";
    addBtn.style.color = "#c4b8ff";
  });
  addBtn.addEventListener("mouseleave", () => {
    addBtn.style.borderColor = "rgba(255,255,255,0.1)";
    addBtn.style.color = "rgba(255,255,255,0.3)";
  });

  addBtn.addEventListener("click", () => {
    // Show picker of available folders
    const available = folders.filter(f =>
      f.path !== folder.path &&
      !manualRelations.includes(f.path) &&
      !allRelated.find(r => r.folder.path === f.path)
    );

    if (available.length === 0) return;

    const overlay = document.createElement("div");
    overlay.className = "picker-overlay";

    const panel = document.createElement("div");
    panel.className = "picker-panel";
    panel.style.cssText = `width: 300px; display: flex; flex-direction: column; gap: 8px;`;

    const title = document.createElement("div");
    title.className = "picker-title";
    title.textContent = "Add Related Folder";
    panel.appendChild(title);

    available.forEach(f => {
      const item = document.createElement("div");
      item.style.cssText = `
        display: flex; align-items: center; gap: 10px;
        padding: 10px 12px; border-radius: 8px;
        cursor: pointer; transition: background 120ms ease;
        border: 1px solid transparent;
      `;
      item.innerHTML = `
        <span style="width:28px;height:28px;border-radius:7px;
          background:${hexToRgba(f.color, 0.18)};display:flex;
          align-items:center;justify-content:center;font-size:15px;flex-shrink:0">
          ${f.icon}
        </span>
        <span style="display:flex;flex-direction:column;gap:2px;overflow:hidden">
          <span style="font-size:13px;font-weight:500;color:#f0f0f8;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${f.name}
          </span>
          <span style="font-size:11px;color:rgba(255,255,255,0.3)">${f.category}</span>
        </span>
      `;
      item.addEventListener("mouseenter", () => {
        item.style.background = "rgba(124,106,247,0.1)";
        item.style.borderColor = "rgba(124,106,247,0.2)";
      });
      item.addEventListener("mouseleave", () => {
        item.style.background = "none";
        item.style.borderColor = "transparent";
      });
      item.addEventListener("click", () => {
        manualRelations.push(f.path);
        saveRelationOverrides();
        document.body.removeChild(overlay);
        renderRelations(folder);
      });
      panel.appendChild(item);
    });

    overlay.appendChild(panel);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) document.body.removeChild(overlay);
    });
    document.body.appendChild(overlay);
  });

  relationsList.appendChild(addBtn);
}

// ── Select Folder ──
function selectFolder(path: string): void {
  activeFolderPath = path;
  const folder = folders.find(f => f.path === path);
  if (!folder) return;
  addToRecent(path);
  showIdentityView(folder);
  renderSidebar();
}

// ── Remove Folder ──
async function removeFolderFromHalo(path: string): Promise<void> {
  const folder = folders.find(f => f.path === path);
  if (!folder) return;

  // Show confirmation dialog
  const confirmed = await showDeleteConfirmation(folder.name);
  if (!confirmed) return;

  await deleteFolder(path);
  folders = folders.filter(f => f.path !== path);
  recentlyViewed = recentlyViewed.filter(r => r.path !== path);
  saveRecentlyViewed();
  if (activeFolderPath === path) {
    folders.length > 0 ? selectFolder(folders[0].path) : showEmptyState();
  } else {
    renderSidebar();
  }
}

// ── Delete Confirmation Dialog ──
function showDeleteConfirmation(folderName: string): Promise<boolean> {
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.className = "picker-overlay";

    const dialog = document.createElement("div");
    dialog.style.cssText = `
      background: #13131f;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      padding: 28px;
      width: 380px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.6);
      animation: scale-in 150ms ease-out;
    `;

    dialog.innerHTML = `
      <div style="font-size: 20px; text-align: center;">🗑️</div>
      <div style="font-size: 16px; font-weight: 700; color: #f0f0f8; text-align: center;">
        Remove from HALO?
      </div>
      <div style="font-size: 13px; color: rgba(255,255,255,0.5); text-align: center; line-height: 1.6;">
        <strong style="color: rgba(255,255,255,0.8);">${folderName}</strong> will be removed from HALO only.<br><br>
        Your folder and all files inside it will remain completely unchanged on your Mac or PC.<br>
        Nothing will be deleted from your computer.
      </div>
      <div style="display: flex; gap: 10px; margin-top: 4px;">
        <button id="confirm-cancel" style="
          flex: 1; padding: 10px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; color: rgba(255,255,255,0.7);
          font-size: 13px; font-weight: 500;
          cursor: pointer; font-family: inherit;
          transition: background 150ms ease;
        ">Cancel</button>
        <button id="confirm-delete" style="
          flex: 1; padding: 10px;
          background: rgba(239,68,68,0.15);
          border: 1px solid rgba(239,68,68,0.3);
          border-radius: 10px; color: #fca5a5;
          font-size: 13px; font-weight: 600;
          cursor: pointer; font-family: inherit;
          transition: background 150ms ease;
        ">Remove from HALO</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const cancelBtn = dialog.querySelector("#confirm-cancel") as HTMLButtonElement;
    const deleteBtn = dialog.querySelector("#confirm-delete") as HTMLButtonElement;

    cancelBtn.addEventListener("mouseenter", () => {
      cancelBtn.style.background = "rgba(255,255,255,0.1)";
    });
    cancelBtn.addEventListener("mouseleave", () => {
      cancelBtn.style.background = "rgba(255,255,255,0.06)";
    });
    deleteBtn.addEventListener("mouseenter", () => {
      deleteBtn.style.background = "rgba(239,68,68,0.25)";
    });
    deleteBtn.addEventListener("mouseleave", () => {
      deleteBtn.style.background = "rgba(239,68,68,0.15)";
    });

    cancelBtn.addEventListener("click", () => {
      document.body.removeChild(overlay);
      resolve(false);
    });

    deleteBtn.addEventListener("click", () => {
      document.body.removeChild(overlay);
      resolve(true);
    });
  });
}

// ── Add Folder ──
async function addFolder(): Promise<void> {
  try {
    const selected = await open({ directory: true, multiple: false, title: "Choose a folder to add to HALO" });
    if (!selected || typeof selected !== "string") return;

    const name = selected.split("/").filter(Boolean).pop() ?? selected;
    const existing = folders.find(f => f.path === selected);
    if (existing) { selectFolder(selected); return; }

    const identity: FolderIdentity = getIdentity(name);
    const scan = await scanFolder(selected);

    const record = await saveFolder({
      path: selected, name,
      icon: identity.icon, category: identity.category,
      color: identity.color, colorVar: identity.colorVar,
      description: "", fileCount: scan.fileCount,
      folderCount: scan.folderCount,
      lastModified: new Date().toISOString(),
      identitySource: "rules", isCustomized: false,
    });

    folders.push(record);
    activeFolderPath = record.path;
    addToRecent(record.path);
    renderSidebar();
    showIdentityView(record);
  } catch (error) {
    console.error("HALO add folder error:", error);
  }
}

// ── Sidebar Search ──
sidebarSearch.addEventListener("input", () => {
  searchQuery = sidebarSearch.value;
  renderSidebar();
});

// ── Button Listeners ──
addFolderBtn.addEventListener("click", addFolder);
heroCta.addEventListener("click", addFolder);

// ── Apply to Finder ──
applyFinderBtn.addEventListener("click", () => {
  if (!activeFolderPath) return;
  const folder = folders.find(f => f.path === activeFolderPath);
  if (!folder) return;

  const overlay = document.createElement("div");
  overlay.className = "picker-overlay";

  const dialog = document.createElement("div");
  dialog.style.cssText = `
    background: #13131f;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px;
    padding: 28px;
    width: 400px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-shadow: 0 24px 64px rgba(0,0,0,0.6);
    animation: scale-in 150ms ease-out;
  `;

  dialog.innerHTML = `
    <div style="font-size:24px;text-align:center;">🖥️</div>
    <div style="font-size:16px;font-weight:700;color:#f0f0f8;text-align:center;">
      Apply icon to Finder?
    </div>
    <div style="font-size:13px;color:rgba(255,255,255,0.5);text-align:center;line-height:1.7;">
      This will change the icon displayed in Finder for:<br>
      <strong style="color:rgba(255,255,255,0.8);">${folder.name}</strong><br><br>
      No files will be changed or deleted.<br>
      The folder remains exactly as it is.
    </div>
    <div style="display:flex;gap:10px;margin-top:4px;">
      <button id="finder-cancel" style="
        flex:1;padding:10px;
        background:rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.1);
        border-radius:10px;color:rgba(255,255,255,0.7);
        font-size:13px;font-weight:500;
        cursor:pointer;font-family:inherit;
      ">Cancel</button>
      <button id="finder-apply" style="
        flex:1;padding:10px;
        background:rgba(16,185,129,0.15);
        border:1px solid rgba(16,185,129,0.3);
        border-radius:10px;color:#6ee7b7;
        font-size:13px;font-weight:600;
        cursor:pointer;font-family:inherit;
      ">Apply to Finder</button>
    </div>
    <div id="finder-status" style="
      text-align:center;font-size:13px;
      color:rgba(255,255,255,0.4);
      display:none;
    ">Applying...</div>
  `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  const cancelBtn = dialog.querySelector("#finder-cancel") as HTMLButtonElement;
  const applyBtn  = dialog.querySelector("#finder-apply") as HTMLButtonElement;
  const status    = dialog.querySelector("#finder-status") as HTMLDivElement;

  cancelBtn.addEventListener("click", () => {
    document.body.removeChild(overlay);
  });

  applyBtn.addEventListener("click", async () => {
    applyBtn.style.display  = "none";
    cancelBtn.style.display = "none";
    status.style.display    = "block";
    status.textContent      = "Applying icon to Finder...";

    const hexColor = folder.color.startsWith("linear-gradient")
      ? (folder.color.match(/#([0-9a-fA-F]{6})/) || [])[1] || "6e56cf"
      : folder.color.replace("#", "");

    try {
      await invoke<string>("apply_folder_icon", {
        folderPath: folder.path,
        emoji:      folder.icon,
        hexColor:   hexColor,
      });
      status.style.color = "#6ee7b7";
      status.textContent = "✓ Icon applied. Check Finder.";
      setTimeout(() => { document.body.removeChild(overlay); }, 2000);
    } catch (error) {
      status.style.color = "#fca5a5";
      status.textContent = `Error: ${error}`;
      setTimeout(() => { document.body.removeChild(overlay); }, 3000);
    }
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
});

// ── Change Icon ──
changeIconBtn.addEventListener("click", () => {
  if (!activeFolderPath) return;

  const categories = getAllIcons();
  const recentIcons = getDefaultRecentIcons();
  let activeCatIndex = 0;

  const overlay = document.createElement("div");
  overlay.className = "picker-overlay";

  const modal = document.createElement("div");
  modal.style.cssText = `
    background: #13131f;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 20px;
    width: 680px;
    max-height: 520px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 32px 80px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.07) inset;
    animation: scale-in 150ms ease-out;
  `;

  const searchWrap = document.createElement("div");
  searchWrap.style.cssText = `padding: 16px 20px 12px; border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0;`;

  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "Search icons...";
  searchInput.style.cssText = `
    width: 100%; background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1); border-radius: 10px;
    color: #f0f0f8; font-size: 14px; padding: 10px 16px;
    outline: none; font-family: inherit;
  `;
  searchWrap.appendChild(searchInput);
  modal.appendChild(searchWrap);

  const body = document.createElement("div");
  body.style.cssText = `display: flex; flex: 1; overflow: hidden;`;

  const catList = document.createElement("div");
  catList.style.cssText = `
    width: 190px; overflow-y: auto;
    border-right: 1px solid rgba(255,255,255,0.06);
    padding: 8px; flex-shrink: 0;
    display: flex; flex-direction: column; gap: 2px;
  `;

  function getCatBtnStyle(active: boolean): string {
    return `
      display: flex; align-items: center; gap: 8px;
      padding: 7px 10px; border-radius: 8px;
      border: 1px solid ${active ? "rgba(124,106,247,0.4)" : "transparent"};
      background: ${active ? "rgba(124,106,247,0.15)" : "none"};
      color: ${active ? "#c4b8ff" : "rgba(255,255,255,0.45)"};
      font-size: 12px; font-weight: ${active ? "600" : "400"};
      cursor: pointer; font-family: inherit;
      transition: all 120ms ease; width: 100%;
      text-align: left; white-space: nowrap;
    `;
  }

  const allTabs: HTMLButtonElement[] = [];

  const recentBtn = document.createElement("button");
  recentBtn.style.cssText = getCatBtnStyle(true);
  recentBtn.textContent = "⭐ Recent";
  allTabs.push(recentBtn);
  catList.appendChild(recentBtn);

  categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.style.cssText = getCatBtnStyle(false);
    btn.textContent = `${cat.icon} ${cat.label}`;
    allTabs.push(btn);
    catList.appendChild(btn);
  });

  const gridWrap = document.createElement("div");
  gridWrap.style.cssText = `flex: 1; overflow-y: auto; padding: 12px;`;

  const grid = document.createElement("div");
  grid.style.cssText = `display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px;`;
  gridWrap.appendChild(grid);

  function renderGrid(icons: string[]) {
    grid.innerHTML = "";
    if (icons.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = `grid-column: 1/-1; text-align: center; color: rgba(255,255,255,0.25); font-size: 14px; padding: 40px;`;
      empty.textContent = "No icons found";
      grid.appendChild(empty);
      return;
    }
    icons.forEach(icon => {
      const btn = document.createElement("button");
      btn.textContent = icon;
      btn.style.cssText = `
        background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
        border-radius: 10px; font-size: 24px; padding: 10px 6px;
        cursor: pointer; transition: all 120ms ease; line-height: 1;
        aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
      `;
      btn.addEventListener("mouseenter", () => {
        btn.style.background = "rgba(124,106,247,0.2)";
        btn.style.borderColor = "rgba(124,106,247,0.5)";
        btn.style.transform = "scale(1.12)";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.background = "rgba(255,255,255,0.04)";
        btn.style.borderColor = "rgba(255,255,255,0.06)";
        btn.style.transform = "scale(1)";
      });
      btn.addEventListener("click", async () => {
        await updateFolderIcon(activeFolderPath!, icon);
        document.body.removeChild(overlay);
      });
      grid.appendChild(btn);
    });
  }

  function setActiveTab(index: number) {
    activeCatIndex = index;
    allTabs.forEach((tab, i) => { tab.style.cssText = getCatBtnStyle(i === index); });
    renderGrid(index === 0 ? recentIcons : categories[index - 1].icons);
  }

  recentBtn.addEventListener("click", () => setActiveTab(0));
  categories.forEach((_cat, i) => {
    allTabs[i + 1].addEventListener("click", () => setActiveTab(i + 1));
  });

  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim();
    if (!q) { setActiveTab(activeCatIndex); return; }
    renderGrid(categories.flatMap(c => c.icons));
  });

  renderGrid(recentIcons);
  body.appendChild(catList);
  body.appendChild(gridWrap);
  modal.appendChild(body);
  overlay.appendChild(modal);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) document.body.removeChild(overlay); });
  document.body.appendChild(overlay);
  setTimeout(() => searchInput.focus(), 100);
});

// ── Change Color ──
changeColorBtn.addEventListener("click", () => {
  if (!activeFolderPath) return;

  const colors = getAllColors();
  const solids = colors.filter(c => c.type === "solid");
  const gradients = colors.filter(c => c.type === "gradient");

  const overlay = document.createElement("div");
  overlay.className = "picker-overlay";

  const panel = document.createElement("div");
  panel.className = "picker-panel";
  panel.style.cssText = `width: 320px; display: flex; flex-direction: column; gap: 16px;`;

  const solidsTitle = document.createElement("div");
  solidsTitle.className = "picker-title";
  solidsTitle.textContent = "Solid Colors";

  const solidsGrid = document.createElement("div");
  solidsGrid.style.cssText = `display: grid; grid-template-columns: repeat(8, 1fr); gap: 8px;`;

  solids.forEach(color => {
    const btn = document.createElement("button");
    btn.className = "color-btn";
    btn.title = color.name;
    btn.style.background = color.value;
    btn.addEventListener("mouseenter", () => { btn.style.transform = "scale(1.2)"; btn.style.borderColor = "rgba(255,255,255,0.4)"; });
    btn.addEventListener("mouseleave", () => { btn.style.transform = "scale(1)"; btn.style.borderColor = "transparent"; });
    btn.addEventListener("click", async () => { await updateFolderColor(activeFolderPath!, color.value, color.var); document.body.removeChild(overlay); });
    solidsGrid.appendChild(btn);
  });

  const gradientsTitle = document.createElement("div");
  gradientsTitle.className = "picker-title";
  gradientsTitle.textContent = "Gradients";

  const gradientsGrid = document.createElement("div");
  gradientsGrid.style.cssText = `display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; padding-bottom: 4px;`;

  gradients.forEach(color => {
    const btn = document.createElement("button");
    btn.title = color.name;
    btn.style.cssText = `
      width: 100%; height: 36px; border-radius: 8px;
      background: ${color.value}; border: 2px solid transparent;
      cursor: pointer; transition: transform 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
    `;
    btn.addEventListener("mouseenter", () => { btn.style.transform = "scale(1.05)"; btn.style.borderColor = "rgba(255,255,255,0.4)"; btn.style.boxShadow = "0 4px 16px rgba(0,0,0,0.4)"; });
    btn.addEventListener("mouseleave", () => { btn.style.transform = "scale(1)"; btn.style.borderColor = "transparent"; btn.style.boxShadow = "none"; });
    btn.addEventListener("click", async () => { await updateFolderColor(activeFolderPath!, color.value, color.var); document.body.removeChild(overlay); });
    gradientsGrid.appendChild(btn);
  });

  panel.appendChild(solidsTitle);
  panel.appendChild(solidsGrid);
  panel.appendChild(gradientsTitle);
  panel.appendChild(gradientsGrid);
  overlay.appendChild(panel);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) document.body.removeChild(overlay); });
  document.body.appendChild(overlay);
});

// ── Add Description ──
addDescriptionBtn.addEventListener("click", () => {
  if (!activeFolderPath) return;
  const folder = folders.find(f => f.path === activeFolderPath);
  if (!folder) return;

  const input = document.createElement("input");
  input.type = "text";
  input.value = folder.description ?? "";
  input.placeholder = "e.g. ESA Satellite Resilience Project, Phase B proposal...";
  input.style.cssText = `
    width: 100%; background: rgba(255,255,255,0.06);
    border: 1px solid var(--accent); border-radius: 8px;
    color: var(--text); font-size: 14px; padding: 8px 12px;
    outline: none; font-family: inherit;
  `;

  const container = addDescriptionBtn.parentElement!;
  container.replaceChild(input, addDescriptionBtn);
  input.focus();

  async function saveDescription() {
    const value = input.value.trim();
    await updateFolderDescription(activeFolderPath!, value);
    container.replaceChild(addDescriptionBtn, input);
  }

  input.addEventListener("blur", saveDescription);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") input.blur();
    if (e.key === "Escape") container.replaceChild(addDescriptionBtn, input);
  });
});

// ── Update Icon ──
async function updateFolderIcon(path: string, icon: string): Promise<void> {
  const index = folders.findIndex(f => f.path === path);
  if (index < 0) return;
  folders[index] = { ...folders[index], icon, isCustomized: true, identitySource: "user" };
  await saveFolder(folders[index]);
  renderSidebar();
  showIdentityView(folders[index]);
  syncFinderIcon(folders[index]);
}

// ── Update Color ──
async function updateFolderColor(path: string, color: string, colorVar: string): Promise<void> {
  const index = folders.findIndex(f => f.path === path);
  if (index < 0) return;
  folders[index] = { ...folders[index], color, colorVar, isCustomized: true, identitySource: "user" };
  await saveFolder(folders[index]);
  showIdentityView(folders[index]);
  renderSidebar();
  syncFinderIcon(folders[index]);
}

// ── Update Description ──
async function updateFolderDescription(path: string, description: string): Promise<void> {
  const index = folders.findIndex(f => f.path === path);
  if (index < 0) return;
  folders[index] = { ...folders[index], description };
  await saveFolder(folders[index]);
  showIdentityView(folders[index]);
}
// ── Sync Finder Icon ──
// Called automatically after icon or color change.
// Runs in background — never blocks the UI.
async function syncFinderIcon(folder: FolderRecord): Promise<void> {
  // Extract hex color from gradient or solid
  let hexColor = folder.color;
  if (hexColor.startsWith("linear-gradient")) {
    // Extract first hex from gradient string
    const match = hexColor.match(/#([0-9a-fA-F]{6})/);
    hexColor = match ? match[1] : "6e56cf";
  }
  hexColor = hexColor.replace("#", "");

  // Show sync status in header
  showSyncStatus("syncing");

  try {
    await invoke<string>("apply_folder_icon", {
      folderPath: folder.path,
      emoji:      folder.icon,
      hexColor:   hexColor,
    });
    showSyncStatus("success");
  } catch (error) {
    console.error("Finder sync error:", error);
    showSyncStatus("error");
  }
}

// ── Sync Status Indicator ──
function showSyncStatus(status: "syncing" | "success" | "error"): void {
  let indicator = document.getElementById("sync-status");

  if (!indicator) {
    indicator = document.createElement("div");
    indicator.id = "sync-status";
    indicator.style.cssText = `
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 6px;
      transition: all 200ms ease;
      font-family: inherit;
    `;
    headerActions.insertAdjacentElement("beforebegin", indicator);
  }

  if (status === "syncing") {
    indicator.textContent = "⟳ Syncing Finder...";
    indicator.style.color = "rgba(255,255,255,0.4)";
    indicator.style.display = "block";
  } else if (status === "success") {
    indicator.textContent = "✓ Synced to Finder";
    indicator.style.color = "#6ee7b7";
    indicator.style.display = "block";
    setTimeout(() => {
      if (indicator) indicator.style.display = "none";
    }, 3000);
  } else {
    indicator.textContent = "⚠ Sync failed";
    indicator.style.color = "#fca5a5";
    indicator.style.display = "block";
    setTimeout(() => {
      if (indicator) indicator.style.display = "none";
    }, 4000);
  }
}

// ── Search Quotes ──
const SEARCH_QUOTES = [
  "Faster than your thoughts.",
  "You blink. We find it.",
  "Lightning fast. Always local.",
  "Your knowledge, instantly.",
  "Search everything. Share nothing.",
  "Built in Germany. Fast everywhere.",
  "Private search. Real results.",
  "No cloud. No waiting.",
  "Find the needle. Keep the haystack.",
  "Memory for your computer.",
  "Google Desktop, reborn.",
  "Your files remember everything.",
];

let quoteIndex = 0;

function rotateQuote(): void {
  quoteIndex = (quoteIndex + 1) % SEARCH_QUOTES.length;
  searchQuote.style.opacity = "0";
  setTimeout(() => {
    searchQuote.textContent = SEARCH_QUOTES[quoteIndex];
    searchQuote.style.opacity = "1";
  }, 300);
}

// Start quote rotation
searchQuote.textContent = SEARCH_QUOTES[0];
searchQuote.style.transition = "opacity 300ms ease";
setInterval(rotateQuote, 4000);

// ── File type icon ──
function getFileIcon(ext: string): string {
  const icons: Record<string, string> = {
    pdf: "📄", md: "📝", txt: "📃", ts: "💻",
    js: "💻", py: "🐍", rs: "⚙️", json: "📋",
    swift: "🍎", css: "🎨", html: "🌐", sh: "⌨️",
    yaml: "📋", toml: "📋", csv: "📊",
  };
  return icons[ext] || "📄";
}

// ── File type badge class ──
function getExtClass(ext: string): string {
  const classes: Record<string, string> = {
    md: "ext-md", txt: "ext-txt", ts: "ext-ts",
    js: "ext-js", py: "ext-py", rs: "ext-rs",
    json: "ext-json", pdf: "ext-pdf",
  };
  return classes[ext] || "ext-default";
}

// ── Get folder name from path ──
function getFolderName(folderPath: string): string {
  const tracked = folders.find(f => folderPath.startsWith(f.path));
  if (tracked) return tracked.name;
  return folderPath.split("/").filter(Boolean).pop() || folderPath;
}

// ── Get folder identity from path ──
function getFolderForPath(filePath: string): FolderRecord | null {
  return folders.find(f => filePath.startsWith(f.path)) || null;
}

// ── Render search results ──
function renderSearchResults(
  results: any[],
  query: string,
  elapsed: number
): void {
  searchResultsList.innerHTML = "";

  if (results.length === 0) {
    searchResultsList.innerHTML = `
      <div class="search-empty">
        <div class="search-empty-icon">🔍</div>
        <div>No results found for "<strong>${query}</strong>"</div>
        <div style="font-size:12px;color:var(--text-dim)">
          Try indexing more folders using the Index button
        </div>
      </div>
    `;
    searchResultsCount.textContent = `No results`;
    return;
  }

  const ms = elapsed < 1 ? `${(elapsed * 1000).toFixed(0)}ms` : `${elapsed.toFixed(2)}s`;
  searchResultsCount.innerHTML = `
    Found <strong style="color:var(--text)">${results.length}</strong> results
    in <strong style="color:#6ee7b7">${ms}</strong>
  `;

  results.forEach(result => {
    const folderRecord = getFolderForPath(result.path);
    const folderName   = getFolderName(result.folder);
    const icon         = getFileIcon(result.extension);
    const extClass     = getExtClass(result.extension);

    const card = document.createElement("div");
    card.className = "search-result-card";

    const folderIcon  = folderRecord ? folderRecord.icon  : "📁";
    const folderColor = folderRecord ? folderRecord.color : "#6b7280";

    // Shorten path for display
    const home = result.path.replace(/^\/Users\/[^/]+/, '~');
    const shortPath = home.length > 60
      ? '...' + home.slice(-57)
      : home;

    card.innerHTML = `
      <div class="search-result-top">
        <div class="search-result-icon"
             style="background:${hexToRgba(folderColor, 0.18)}">
          ${icon}
        </div>
        <div class="search-result-meta">
          <div class="search-result-name">${result.name}</div>
          <div class="search-result-folder">
            <span style="font-size:14px">${folderIcon}</span>
            <strong style="color:rgba(255,255,255,0.6)">${folderName}</strong>
          </div>
          <div class="search-result-path">${shortPath}</div>
        </div>
        <span class="ext-badge ${extClass}">${result.extension}</span>
        <div class="search-result-actions">
          <button class="result-action-btn open-btn">Open</button>
          <button class="result-action-btn reveal-btn">Finder</button>
        </div>
      </div>
      <div class="search-result-snippet">${result.snippet}</div>
    `;

    const openBtn   = card.querySelector(".open-btn")   as HTMLButtonElement;
    const revealBtn = card.querySelector(".reveal-btn") as HTMLButtonElement;

    openBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        await invoke("open_file", { path: result.path });
      } catch (err) {
        console.error("Open error:", err);
      }
    });

    revealBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        await invoke("reveal_in_finder", { path: result.path });
      } catch (err) {
        console.error("Reveal error:", err);
      }
    });

    searchResultsList.appendChild(card);
  });
}

// ── Show search results view ──
function showSearchView(): void {
  emptyState.classList.add("hidden");
  identityView.classList.add("hidden");
  searchResultsView.classList.remove("hidden");
  headerActions.classList.add("hidden");
}

// ── Hide search results view ──
function hideSearchView(): void {
  searchResultsView.classList.add("hidden");
  if (activeFolderPath) {
    const folder = folders.find(f => f.path === activeFolderPath);
    if (folder) {
      showIdentityView(folder);
      return;
    }
  }
  showEmptyState();
}

// ── Search input handler ──
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim();

  if (searchTimeout) clearTimeout(searchTimeout);

  if (!query) {
    hideSearchView();
    return;
  }

  showSearchView();
  searchResultsCount.textContent = "Searching...";

  searchTimeout = setTimeout(() => {
    const start = performance.now();
    invoke<any[]>("search_files", { query, limit: 30 })
      .then(results => {
        const elapsed = (performance.now() - start) / 1000;
        lastResults = results;
        lastQuery   = query;
        lastElapsed = elapsed;
        applyFilter();
      })
      .catch(err => {
        console.error("Search error:", err);
        searchResultsCount.textContent = "No results yet — index still building";
      });
  }, 300);
});

// Clear search on Escape
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    searchInput.value = "";
    hideSearchView();
  }
});

// ── Index button dropdown ──
indexBtn.addEventListener("click", async (e) => {
  e.stopPropagation();
  indexDropdown.classList.toggle("hidden");

  if (!indexDropdown.classList.contains("hidden")) {
    try {
      const stats = await invoke<any>("get_index_stats", {});
      statIndexedFiles.textContent   = stats.files.toLocaleString();
      statIndexedFolders.textContent = stats.folders.toString();

      // DB size
      const dbSizeEl = document.getElementById("stat-db-size");
      if (dbSizeEl) dbSizeEl.textContent = `${stats.db_size_mb} MB`;

      // Coverage panel counts
      const covPdf  = document.getElementById("cov-pdf");
      const covDocx = document.getElementById("cov-docx");
      const covPptx = document.getElementById("cov-pptx");
      const covXlsx = document.getElementById("cov-xlsx");
      const covText = document.getElementById("cov-text");
      if (covPdf)  covPdf.textContent  = stats.pdfs.toString();
      if (covDocx) covDocx.textContent = stats.docx.toString();
      if (covPptx) covPptx.textContent = stats.pptx.toString();
      if (covXlsx) covXlsx.textContent = stats.xlsx.toString();
      if (covText) covText.textContent = stats.text.toString();

      // Update pill counts
      updatePillCounts(stats);
    } catch (err) {
      console.error("Stats error:", err);
    }
  }
});

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (!indexDropdown.contains(e.target as Node) &&
      e.target !== indexBtn) {
    indexDropdown.classList.add("hidden");
  }
});

// ── Reindex button ──
reindexBtn.addEventListener("click", async () => {
  const total = folders.length;
  let completed = 0;

  reindexBtn.textContent   = "⟳ Starting...";
  reindexBtn.style.opacity = "0.8";
  indexBtn.textContent     = "🟡 Indexing ▾";



  const unlistenProgress = await listen<any>("index-progress", (event) => {
    const data = event.payload;
    const folderName = data.folder.split("/").filter(Boolean).pop() || data.folder;
    reindexBtn.textContent = `⟳ ${folderName}: ${data.indexed} files`;
    statIndexedFiles.textContent = String(data.indexed);
  });

  const unlistenComplete = await listen<any>("index-complete", async (event) => {
    completed++;
    const folderName = event.payload.folder.split("/").filter(Boolean).pop();
    reindexBtn.textContent = `✓ ${folderName} (${completed}/${total})`;

    if (completed >= total) {
      unlistenProgress();
      unlistenComplete();

      const stats = await invoke<any>("get_index_stats", {});
      const formatted = stats.files.toLocaleString();

      statIndexedFiles.textContent   = formatted;
      statIndexedFolders.textContent = stats.folders.toString();
      searchInput.placeholder = `Search across ${formatted} files...`;
      indexBtn.textContent = `🟢 ${formatted} files ▾`;

      reindexBtn.textContent       = `✓ All ${total} folders indexed`;
      reindexBtn.style.opacity     = "1";
      reindexBtn.style.background  = "rgba(16,185,129,0.15)";
      reindexBtn.style.borderColor = "rgba(16,185,129,0.3)";
      reindexBtn.style.color       = "#6ee7b7";

      setTimeout(() => {
        reindexBtn.textContent       = "⟳ Rebuild Index";
        reindexBtn.style.background  = "";
        reindexBtn.style.borderColor = "";
        reindexBtn.style.color       = "";
        indexBtn.textContent         = "Index ▾";
      }, 5000);
    }
  });

  // Fire sequentially
  for (const folder of folders) {
    invoke("index_folder", { folderPath: folder.path }).catch(console.error);
  }
});

// ── Auto-index when folder is added ──
// TODO: wire up after Day 15 FSEvents implementation

// ── Filter pills ──
let activeFilter = "all";
let lastResults: any[] = [];
let lastQuery   = "";
let lastElapsed = 0;

document.querySelectorAll('.filter-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    const type = (pill as HTMLElement).dataset.type || 'all';
    activeFilter = type;

    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');

    applyFilter();
  });
});

function applyFilter(): void {
  const filtered = activeFilter === 'all'
    ? lastResults
    : lastResults.filter(r => {
        if (activeFilter === 'text') {
          return !['pdf','docx','pptx','xlsx'].includes(r.extension);
        }
        return r.extension === activeFilter;
      });

  // Update pill counts to reflect current results
  const counts: Record<string, number> = { all: lastResults.length, pdf: 0, docx: 0, pptx: 0, xlsx: 0, text: 0 };
  lastResults.forEach(r => {
    if (['pdf','docx','pptx','xlsx'].includes(r.extension)) {
      counts[r.extension] = (counts[r.extension] || 0) + 1;
    } else {
      counts['text'] = (counts['text'] || 0) + 1;
    }
  });

  document.querySelectorAll('.filter-pill').forEach(pill => {
    const btn     = pill as HTMLButtonElement;
    const type    = btn.dataset.type || 'all';
    const count   = counts[type] ?? 0;
    const countEl = btn.querySelector('.pill-count') as HTMLElement;

    if (countEl) countEl.textContent = count.toString();

    if (type !== 'all' && count === 0) {
      btn.disabled = true;
      btn.style.opacity = '0.3';
      btn.style.cursor  = 'not-allowed';
    } else {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor  = 'pointer';
    }
  });

  renderSearchResults(filtered, lastQuery, lastElapsed);
}

// ── Coverage toggle ──
const coverageToggleBtn = document.getElementById("coverage-toggle-btn");
const coveragePanel     = document.getElementById("coverage-panel");
let coverageOpen = false;

coverageToggleBtn?.addEventListener("click", () => {
  coverageOpen = !coverageOpen;
  coveragePanel?.classList.toggle("hidden", !coverageOpen);
  if (coverageToggleBtn) {
    coverageToggleBtn.textContent = coverageOpen ? "Hide ▴" : "View ▾";
  }
});

// ── Start file watcher ──
async function startFileWatcher(): Promise<void> {
  try {
    const paths = folders.map(f => f.path);
    if (paths.length === 0) return;
    await invoke("start_file_watcher", { folders: paths });
  } catch (err) {
    console.error("Watcher error:", err);
  }
}

// ── Watcher status indicator ──
async function setupWatcherEvents(): Promise<void> {
  const { listen } = await import("@tauri-apps/api/event");

  await listen("watcher-status", (event: any) => {
    const data = event.payload;
    const btn  = document.getElementById("index-btn");
    if (!btn) return;

    if (data.status === "watching") {
      btn.textContent = `✓ Watching ▾`;
      btn.style.color = "#6ee7b7";
      setTimeout(() => {
        btn.textContent = "Index ▾";
        btn.style.color = "";
      }, 3000);
    } else if (data.status === "updating") {
      btn.textContent = `⟳ Updating ▾`;
      btn.style.color = "#a89ff9";
    } else if (data.status === "idle") {
      btn.textContent = `✓ Index up to date ▾`;
      btn.style.color = "#6ee7b7";
      setTimeout(() => {
        btn.textContent = "Index ▾";
        btn.style.color = "";
      }, 3000);
      updateSearchPlaceholder();
    }
  });

  await listen("watcher-activity", (event: any) => {
    const activity: any[] = event.payload;
    if (!activity || activity.length === 0) return;

    // Store in memory log (max 50)
    const log = (window as any).__haloActivityLog || [];
    activity.forEach(item => {
      log.unshift({
        time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        name: item.name || item.path.split("/").pop(),
        action: item.action,
      });
    });
    (window as any).__haloActivityLog = log.slice(0, 50);
  });
}

// ── Start ──
init();

// ── Boot watcher after folders load ──
setTimeout(async () => {
  await setupWatcherEvents();
  await startFileWatcher();
}, 1000);

// ── Update search placeholder with file count ──
async function updateSearchPlaceholder(): Promise<void> {
  try {
    const stats = await invoke<any>("get_index_stats", {});
    if (stats.files > 0) {
      const formatted = stats.files.toLocaleString();
      searchInput.placeholder = `Search across ${formatted} files...`;
      statIndexedFiles.textContent   = formatted;
      statIndexedFolders.textContent = stats.folders.toString();
    }
    updatePillCounts(stats);
  } catch {}
}

// ── Update pill counts from stats ──
function updatePillCounts(stats: any): void {
  const pillAll  = document.querySelector('.filter-pill[data-type="all"]  .pill-count') as HTMLElement;
  const pillPdf  = document.querySelector('.filter-pill[data-type="pdf"]  .pill-count') as HTMLElement;
  const pillDocx = document.querySelector('.filter-pill[data-type="docx"] .pill-count') as HTMLElement;
  const pillPptx = document.querySelector('.filter-pill[data-type="pptx"] .pill-count') as HTMLElement;
  const pillXlsx = document.querySelector('.filter-pill[data-type="xlsx"] .pill-count') as HTMLElement;
  const pillText = document.querySelector('.filter-pill[data-type="text"] .pill-count') as HTMLElement;

  if (pillAll)  pillAll.textContent  = stats.files.toString();
  if (pillPdf)  pillPdf.textContent  = stats.pdfs.toString();
  if (pillDocx) pillDocx.textContent = stats.docx.toString();
  if (pillPptx) pillPptx.textContent = stats.pptx.toString();
  if (pillXlsx) pillXlsx.textContent = stats.xlsx.toString();
  if (pillText) pillText.textContent = stats.text.toString();

  // Disable zero-count pills
  document.querySelectorAll('.filter-pill').forEach(pill => {
    const btn   = pill as HTMLButtonElement;
    const count = parseInt(btn.querySelector('.pill-count')?.textContent || '0');
    const type  = btn.dataset.type;
    if (type !== 'all' && count === 0) {
      btn.disabled = true;
    } else {
      btn.disabled = false;
    }
  });
}