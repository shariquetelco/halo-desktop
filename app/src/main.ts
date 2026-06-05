// ─────────────────────────────────────────
// HALO — main.ts
// Orchestration layer. Thin by design.
// Listens. Calls. Renders. Nothing more.
// ─────────────────────────────────────────

import { open } from "@tauri-apps/plugin-dialog";
import { getIdentity, getAllIcons, getAllColors, FolderIdentity } from "./identity";
import { scanFolder } from "./scanner";
import { saveFolder, loadAllFolders, deleteFolder, FolderRecord } from "./storage";

// ── State ──
let folders: FolderRecord[] = [];
let activeFolderPath: string | null = null;

// ── DOM References ──
const addFolderBtn       = document.getElementById("add-folder-btn")!;
const folderList         = document.getElementById("folder-list")!;
const folderListEmpty    = document.getElementById("folder-list-empty")!;
const emptyState         = document.getElementById("empty-state")!;
const identityView       = document.getElementById("identity-view")!;
const identityIcon       = document.getElementById("identity-icon")!;
const identityName       = document.getElementById("identity-name")!;
const identityCategory   = document.getElementById("identity-category")!;
const descriptionText    = document.getElementById("description-text")!;
const addDescriptionBtn  = document.getElementById("add-description-btn")!;
const statFiles          = document.getElementById("stat-files")!;
const statFolders        = document.getElementById("stat-folders")!;
const statModified       = document.getElementById("stat-modified")!;
const changeIconBtn      = document.getElementById("change-icon-btn")!;
const changeColorBtn     = document.getElementById("change-color-btn")!;

// ── Startup ──
async function init(): Promise<void> {
  folders = await loadAllFolders();
  renderSidebar();
  showEmptyState();
}

// ── Render Sidebar ──
function renderSidebar(): void {
  // Clear existing items
  const items = folderList.querySelectorAll(".folder-item");
  items.forEach(item => item.remove());

  if (folders.length === 0) {
    folderListEmpty.classList.remove("hidden");
    return;
  }

  folderListEmpty.classList.add("hidden");

  folders.forEach(folder => {
    const item = document.createElement("div");
    item.className = "folder-item";
    item.dataset.path = folder.path;

    if (folder.path === activeFolderPath) {
      item.classList.add("active");
    }

    item.innerHTML = `
      <span class="folder-item-icon-wrap" style="background: ${hexToRgba(folder.color, 0.15)}">
        ${folder.icon}
      </span>
      <span class="folder-item-name">${folder.name}</span>
    `;

    item.addEventListener("click", () => selectFolder(folder.path));
    folderList.appendChild(item);
  });
}

// ── Show Empty State ──
function showEmptyState(): void {
  emptyState.classList.remove("hidden");
  identityView.classList.add("hidden");
  activeFolderPath = null;
  renderSidebar();
}

// ── Show Identity View ──
// ── Show Identity View ──
function showIdentityView(folder: FolderRecord): void {
  emptyState.classList.add("hidden");
  identityView.classList.remove("hidden");

  // Text content
  identityIcon.textContent     = folder.icon;
  identityName.textContent     = folder.name;
  identityCategory.textContent = folder.category;

  // Layer 2 — Focus: icon wrapper background + glow
  const iconWrapper = document.getElementById("identity-icon-wrapper")!;
  iconWrapper.style.background  = hexToRgba(folder.color, 0.25);
  iconWrapper.style.boxShadow   = `0 0 24px ${hexToRgba(folder.color, 0.4)}`;

  // Layer 3 — Atmosphere: subtle gradient wash
  const atmosphere = document.getElementById("identity-atmosphere")!;
  atmosphere.style.background = `linear-gradient(180deg, ${hexToRgba(folder.color, 0.18)} 0%, transparent 100%)`;

  // Description
  descriptionText.textContent     = folder.description || "No description yet.";
  descriptionText.style.fontStyle = folder.description ? "normal" : "italic";

  // Stats
  statFiles.textContent    = folder.fileCount.toString();
  statFolders.textContent  = folder.folderCount.toString();
  statModified.textContent = formatRelativeTime(folder.lastModified);
}

// ── Hex to RGBA ──
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── Format Relative Time ──
function formatRelativeTime(isoString: string): string {
  if (!isoString || isoString === "Unknown") return "Unknown";
  try {
    const date = new Date(isoString);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60)       return "Just now";
    if (diff < 3600)     return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400)    return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800)   return `${Math.floor(diff / 86400)} days ago`;
    if (diff < 2592000)  return `${Math.floor(diff / 604800)} weeks ago`;
    if (diff < 31536000) return `${Math.floor(diff / 2592000)} months ago`;
    return `${Math.floor(diff / 31536000)} years ago`;
  } catch {
    return "Unknown";
  }
}

// ── Select Folder ──
function selectFolder(path: string): void {
  activeFolderPath = path;
  const folder = folders.find(f => f.path === path);
  if (!folder) return;
  showIdentityView(folder);
  renderSidebar();
}

// ── Add Folder ──
addFolderBtn.addEventListener("click", async () => {
  try {
    const selected = await open({
      directory: true,
      multiple:  false,
      title:     "Select a folder to add to HALO",
    });

    if (!selected || typeof selected !== "string") return;

    // Extract folder name from path
    const name = selected.split("/").filter(Boolean).pop() ?? selected;

    // Check if already added
    const existing = folders.find(f => f.path === selected);
    if (existing) {
      selectFolder(selected);
      return;
    }

    // Generate identity
    const identity: FolderIdentity = getIdentity(name);

    // Scan folder
    const scan = await scanFolder(selected);

    // Save to storage
    const record = await saveFolder({
      path:           selected,
      name,
      icon:           identity.icon,
      category:       identity.category,
      color:          identity.color,
      colorVar:       identity.colorVar,
      description:    "",
      fileCount:      scan.fileCount,
      folderCount:    scan.folderCount,
      lastModified:   new Date().toISOString(),
      identitySource: "rules",
      isCustomized:   false,
    });

    folders.push(record);
    activeFolderPath = record.path;
    renderSidebar();
    showIdentityView(record);

  } catch (error) {
    console.error("HALO add folder error:", error);
  }
});

// ── Change Icon ──
changeIconBtn.addEventListener("click", () => {
  if (!activeFolderPath) return;

  const icons = getAllIcons();

  // Build picker overlay
  const overlay = document.createElement("div");
  overlay.id = "icon-picker-overlay";
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `;

  const picker = document.createElement("div");
  picker.style.cssText = `
    background: #1e1e1e;
    border: 1px solid #2a2a2a;
    border-radius: 16px;
    padding: 24px;
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 12px;
    max-width: 360px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  `;

  icons.forEach(icon => {
    const btn = document.createElement("button");
    btn.textContent = icon;
    btn.style.cssText = `
      background: none;
      border: 1px solid #2a2a2a;
      border-radius: 8px;
      font-size: 22px;
      padding: 8px;
      cursor: pointer;
      transition: background 150ms ease;
    `;
    btn.addEventListener("mouseenter", () => {
      btn.style.background = "#2a2a2a";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "none";
    });
    btn.addEventListener("click", async () => {
      await updateFolderIcon(activeFolderPath!, icon);
      document.body.removeChild(overlay);
    });
    picker.appendChild(btn);
  });

  overlay.appendChild(picker);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
  document.body.appendChild(overlay);
});

// ── Change Color ──
changeColorBtn.addEventListener("click", () => {
  if (!activeFolderPath) return;

  const colors = getAllColors();

  const overlay = document.createElement("div");
  overlay.id = "color-picker-overlay";
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `;

  const picker = document.createElement("div");
  picker.style.cssText = `
    background: #1e1e1e;
    border: 1px solid #2a2a2a;
    border-radius: 16px;
    padding: 24px;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    max-width: 300px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  `;

  colors.forEach(color => {
    const btn = document.createElement("button");
    btn.title = color.name;
    btn.style.cssText = `
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: ${color.value};
      border: 2px solid transparent;
      cursor: pointer;
      transition: transform 150ms ease, border-color 150ms ease;
    `;
    btn.addEventListener("mouseenter", () => {
      btn.style.transform = "scale(1.15)";
      btn.style.borderColor = "#ffffff44";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "scale(1)";
      btn.style.borderColor = "transparent";
    });
    btn.addEventListener("click", async () => {
      await updateFolderColor(activeFolderPath!, color.value, color.var);
      document.body.removeChild(overlay);
    });
    picker.appendChild(btn);
  });

  overlay.appendChild(picker);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
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
  input.placeholder = "Describe this folder...";
  input.style.cssText = `
    width: 100%;
    background: #2a2a2a;
    border: 1px solid #6e56cf;
    border-radius: 8px;
    color: #eeeeee;
    font-size: 14px;
    padding: 8px 12px;
    outline: none;
  `;

  const container = addDescriptionBtn.parentElement!;
  container.replaceChild(input, addDescriptionBtn);
  input.focus();

  async function saveDescription() {
    const value = input.value.trim();
    await updateFolderDescription(activeFolderPath!, value);
    container.replaceChild(addDescriptionBtn, input);
    addDescriptionBtn.textContent = value ? "✏️ Edit Description" : "+ Add Description";
  }

  input.addEventListener("blur", saveDescription);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") input.blur();
    if (e.key === "Escape") {
      container.replaceChild(addDescriptionBtn, input);
    }
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
}

// ── Update Color ──
async function updateFolderColor(path: string, color: string, colorVar: string): Promise<void> {
  const index = folders.findIndex(f => f.path === path);
  if (index < 0) return;
  folders[index] = { ...folders[index], color, colorVar, isCustomized: true, identitySource: "user" };
  await saveFolder(folders[index]);
  showIdentityView(folders[index]);
}

// ── Update Description ──
async function updateFolderDescription(path: string, description: string): Promise<void> {
  const index = folders.findIndex(f => f.path === path);
  if (index < 0) return;
  folders[index] = { ...folders[index], description };
  await saveFolder(folders[index]);
  showIdentityView(folders[index]);
}

// ── Start ──
init();