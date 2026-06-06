// ─────────────────────────────────────────
// HALO — main.ts
// Orchestration layer. Thin by design.
// Listens. Calls. Renders. Nothing more.
// ─────────────────────────────────────────

import { open } from "@tauri-apps/plugin-dialog";
import { getIdentity, getAllIcons, getAllColors, getDefaultRecentIcons, FolderIdentity } from "./identity";
import { scanFolder } from "./scanner";
import { saveFolder, loadAllFolders, FolderRecord } from "./storage";

// ── State ──
let folders: FolderRecord[] = [];
let activeFolderPath: string | null = null;
let searchQuery = "";

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

// ── Startup ──
async function init(): Promise<void> {
  folders = await loadAllFolders();
  renderSidebar();
  showEmptyState();
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
    return;
  }

  folderListEmpty.classList.add("hidden");

  filtered.forEach(folder => {
    const item = document.createElement("div");
    item.className = "folder-item";
    item.dataset.path = folder.path;

    if (folder.path === activeFolderPath) {
      item.classList.add("active");
    }

    // Subtitle: category or file count
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
    `;

    item.addEventListener("click", () => selectFolder(folder.path));
    folderList.appendChild(item);
  });
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
}

// ── Format Relative Time ──
function formatRelativeTime(isoString: string): string {
  if (!isoString || isoString === "Unknown") return "—";
  try {
    const date = new Date(isoString);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60)       return "Just now";
    if (diff < 3600)     return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)    return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800)   return `${Math.floor(diff / 86400)}d ago`;
    if (diff < 2592000)  return `${Math.floor(diff / 604800)}w ago`;
    if (diff < 31536000) return `${Math.floor(diff / 2592000)}mo ago`;
    return `${Math.floor(diff / 31536000)}y ago`;
  } catch {
    return "—";
  }
}

// ── Hex to RGBA ──
function hexToRgba(hex: string, alpha: number): string {
  if (hex.startsWith("linear-gradient")) {
    return hex;
  }
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
async function addFolder(): Promise<void> {
  try {
    const selected = await open({
      directory: true,
      multiple:  false,
      title:     "Choose a folder to add to HALO",
    });

    if (!selected || typeof selected !== "string") return;

    const name = selected.split("/").filter(Boolean).pop() ?? selected;

    const existing = folders.find(f => f.path === selected);
    if (existing) {
      selectFolder(selected);
      return;
    }

    const identity: FolderIdentity = getIdentity(name);
    const scan = await scanFolder(selected);

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
}

// ── Sidebar Search ──
sidebarSearch.addEventListener("input", () => {
  searchQuery = sidebarSearch.value;
  renderSidebar();
});

// ── Button Listeners ──
addFolderBtn.addEventListener("click", addFolder);
heroCta.addEventListener("click", addFolder);

// ── Change Icon ──
// ── Change Icon ──
changeIconBtn.addEventListener("click", () => {
  if (!activeFolderPath) return;

  const categories = getAllIcons();
  const recentIcons = getDefaultRecentIcons();
  let activeCatIndex = 0;

  // ── Overlay ──
  const overlay = document.createElement("div");
  overlay.className = "picker-overlay";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";

  // ── Modal ──
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
    box-shadow: 0 32px 80px rgba(0,0,0,0.7),
                0 1px 0 rgba(255,255,255,0.07) inset;
    animation: scale-in 150ms ease-out;
  `;

  // ── Search Bar ──
  const searchWrap = document.createElement("div");
  searchWrap.style.cssText = `
    padding: 16px 20px 12px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    flex-shrink: 0;
  `;

  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "Search icons...";
  searchInput.style.cssText = `
    width: 100%;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    color: #f0f0f8;
    font-size: 14px;
    padding: 10px 16px;
    outline: none;
    font-family: inherit;
    transition: border-color 150ms ease;
  `;
  searchInput.addEventListener("focus", () => {
    searchInput.style.borderColor = "rgba(124,106,247,0.5)";
  });
  searchInput.addEventListener("blur", () => {
    searchInput.style.borderColor = "rgba(255,255,255,0.1)";
  });
  searchWrap.appendChild(searchInput);
  modal.appendChild(searchWrap);

  // ── Category Tabs ──
  const tabsWrap = document.createElement("div");
  tabsWrap.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 12px 8px;
    overflow-y: auto;
    flex-shrink: 0;
    border-right: 1px solid rgba(255,255,255,0.06);
    width: 190px;
    scrollbar-width: none;
  `;
  tabsWrap.style.setProperty("-ms-overflow-style", "none");

  // Recent tab
  const allTabs: HTMLButtonElement[] = [];

  function getTabStyle(active: boolean): string {
    return `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 10px;
      border-radius: 8px;
      border: 1px solid ${active ? "rgba(124,106,247,0.4)" : "transparent"};
      background: ${active ? "rgba(124,106,247,0.15)" : "none"};
      color: ${active ? "#c4b8ff" : "rgba(255,255,255,0.45)"};
      font-size: 12px;
      font-weight: ${active ? "600" : "400"};
      cursor: pointer;
      white-space: nowrap;
      font-family: inherit;
      transition: all 120ms ease;
      flex-shrink: 0;
      width: 100%;
      text-align: left;
    `;
  }

  const recentTab = document.createElement("button");
  recentTab.style.cssText = getTabStyle(true);
  recentTab.innerHTML = `⭐ Recent`;
  allTabs.push(recentTab);
  tabsWrap.appendChild(recentTab);

  categories.forEach(cat => {
    const tab = document.createElement("button");
    tab.style.cssText = getTabStyle(false);
    tab.innerHTML = `${cat.icon} ${cat.label}`;
    tab.addEventListener("mouseenter", () => {
      if (allTabs.indexOf(tab) !== activeCatIndex) {
        tab.style.background = "rgba(255,255,255,0.08)";
        tab.style.color = "rgba(255,255,255,0.8)";
      }
    });
    tab.addEventListener("mouseleave", () => {
      if (allTabs.indexOf(tab) !== activeCatIndex) {
        tab.style.cssText = getTabStyle(false);
      }
    });
    allTabs.push(tab);
    tabsWrap.appendChild(tab);
  });

  // ── Body wrapper ──
  const body = document.createElement("div");
  body.style.cssText = `
    display: flex;
    flex: 1;
    overflow: hidden;
  `;

  body.appendChild(tabsWrap);

  // ── Icon Grid ──
  const gridWrap = document.createElement("div");
  gridWrap.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
  `;

  const grid = document.createElement("div");
  grid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 6px;
  `;
  gridWrap.appendChild(grid);
  body.appendChild(gridWrap);
  modal.appendChild(body);

  function renderGrid(icons: string[]) {
    grid.innerHTML = "";

    if (icons.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = `
        grid-column: 1 / -1;
        text-align: center;
        color: rgba(255,255,255,0.25);
        font-size: 14px;
        padding: 40px;
      `;
      empty.textContent = "No icons found";
      grid.appendChild(empty);
      return;
    }

    icons.forEach(icon => {
      const btn = document.createElement("button");
      btn.textContent = icon;
      btn.title = icon;
      btn.style.cssText = `
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 10px;
        font-size: 24px;
        padding: 10px 6px;
        cursor: pointer;
        transition: all 120ms ease;
        line-height: 1;
        aspect-ratio: 1;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      btn.addEventListener("mouseenter", () => {
        btn.style.background = "rgba(124,106,247,0.2)";
        btn.style.borderColor = "rgba(124,106,247,0.5)";
        btn.style.transform = "scale(1.12)";
        btn.style.boxShadow = "0 4px 12px rgba(124,106,247,0.2)";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.background = "rgba(255,255,255,0.04)";
        btn.style.borderColor = "rgba(255,255,255,0.06)";
        btn.style.transform = "scale(1)";
        btn.style.boxShadow = "none";
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
    allTabs.forEach((tab, i) => {
      tab.style.cssText = getTabStyle(i === index);
    });
    if (index === 0) {
      renderGrid(recentIcons);
    } else {
      renderGrid(categories[index - 1].icons);
    }
  }

  recentTab.addEventListener("click", () => setActiveTab(0));
  categories.forEach((_cat, i) => {
    allTabs[i + 1].addEventListener("click", () => setActiveTab(i + 1));
  });

  // ── Search Logic ──
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim();
    if (!q) {
      setActiveTab(activeCatIndex);
      return;
    }
    const all = categories.flatMap(c => c.icons);
    renderGrid(all);
  });

  // ── Initial render ──
  renderGrid(recentIcons);

  overlay.appendChild(modal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
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
    btn.addEventListener("mouseenter", () => {
      btn.style.transform = "scale(1.2)";
      btn.style.borderColor = "rgba(255,255,255,0.4)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "scale(1)";
      btn.style.borderColor = "transparent";
    });
    btn.addEventListener("click", async () => {
      await updateFolderColor(activeFolderPath!, color.value, color.var);
      document.body.removeChild(overlay);
    });
    solidsGrid.appendChild(btn);
  });

  const gradientsTitle = document.createElement("div");
  gradientsTitle.className = "picker-title";
  gradientsTitle.textContent = "Gradients";

  const gradientsGrid = document.createElement("div");
  gradientsGrid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    padding-bottom: 4px;
  `;

  gradients.forEach(color => {
    const btn = document.createElement("button");
    btn.title = color.name;
    btn.style.cssText = `
      width: 100%;
      height: 36px;
      border-radius: 8px;
      background: ${color.value};
      border: 2px solid transparent;
      cursor: pointer;
      transition: transform 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
    `;
    btn.addEventListener("mouseenter", () => {
      btn.style.transform = "scale(1.05)";
      btn.style.borderColor = "rgba(255,255,255,0.4)";
      btn.style.boxShadow = "0 4px 16px rgba(0,0,0,0.4)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "scale(1)";
      btn.style.borderColor = "transparent";
      btn.style.boxShadow = "none";
    });
    btn.addEventListener("click", async () => {
      await updateFolderColor(activeFolderPath!, color.value, color.var);
      document.body.removeChild(overlay);
    });
    gradientsGrid.appendChild(btn);
  });

  panel.appendChild(solidsTitle);
  panel.appendChild(solidsGrid);
  panel.appendChild(gradientsTitle);
  panel.appendChild(gradientsGrid);
  overlay.appendChild(panel);
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
  input.placeholder = "e.g. ESA Satellite Resilience Project, Phase B proposal...";
  input.style.cssText = `
    width: 100%;
    background: rgba(255,255,255,0.06);
    border: 1px solid var(--accent);
    border-radius: 8px;
    color: var(--text);
    font-size: 14px;
    padding: 8px 12px;
    outline: none;
    font-family: inherit;
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
    if (e.key === "Enter")  input.blur();
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
}

// ── Update Color ──
async function updateFolderColor(path: string, color: string, colorVar: string): Promise<void> {
  const index = folders.findIndex(f => f.path === path);
  if (index < 0) return;
  folders[index] = { ...folders[index], color, colorVar, isCustomized: true, identitySource: "user" };
  await saveFolder(folders[index]);
  showIdentityView(folders[index]);
  renderSidebar();
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