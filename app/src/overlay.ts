import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

const overlayEl   = document.getElementById("overlay")!;
const searchWrap  = document.getElementById("search-wrap")!;
const searchInput = document.getElementById("search-input") as HTMLInputElement;
const resultsEl   = document.getElementById("results")!;
const statTime    = document.getElementById("stat-time")!;
const searchMeta  = document.getElementById("search-meta") as HTMLElement;
const statTimeBar = document.getElementById("stat-time-bar")!;
const settingsBtn = document.getElementById("settings-btn");
const escHint     = document.getElementById("esc-hint")!;

let selectedIndex  = -1;
let currentResults: any[] = [];
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

// ── Load stats ──
async function loadStats(): Promise<void> {
  try {
    const stats = await invoke<any>("get_index_stats", {});
    const covPdf  = document.getElementById("cov-pdf");
    const covDocx = document.getElementById("cov-docx");
    const covXlsx = document.getElementById("cov-xlsx");
    const covPptx = document.getElementById("cov-pptx");
    const covText = document.getElementById("cov-text");
    if (covPdf)  covPdf.textContent  = stats.pdfs.toString();
    if (covDocx) covDocx.textContent = stats.docx.toString();
    if (covXlsx) covXlsx.textContent = stats.xlsx.toString();
    if (covPptx) covPptx.textContent = stats.pptx.toString();
    if (covText) covText.textContent = stats.text.toString();
  } catch {}
}

// ── File icon ──
function getFileIcon(ext: string): string {
  const icons: Record<string, string> = {
    pdf: "📄", docx: "📝", pptx: "📽", xlsx: "📊",
    md: "📓", txt: "📃", ts: "💻", js: "💻",
    py: "🐍", rs: "⚙️", swift: "🍎",
  };
  return icons[ext] || "📄";
}

// ── Ext badge ──
function extClass(ext: string): string {
  const map: Record<string, string> = {
    pdf: "ext-pdf", docx: "ext-docx",
    pptx: "ext-pptx", xlsx: "ext-xlsx",
  };
  return map[ext] || "ext-default";
}

// ── Close overlay ──
async function closeOverlay(): Promise<void> {
  searchInput.value = "";
  resultsEl.innerHTML = `
    <div id="empty-state">
      <div class="empty-shortcut">⌥ Space</div>
      <div class="empty-title">Search across your indexed files</div>
      <div class="empty-types">PDFs · DOCX · PPTX · XLSX · Text · Code</div>
    </div>`;
  statTime.style.display   = "none";
  searchMeta.style.display = "none";
  overlayEl.classList.remove("searching");
  searchWrap.classList.remove("focused");
  selectedIndex  = -1;
  currentResults = [];
  try {
    await invoke("hide_search_overlay");
  } catch {
    await getCurrentWindow().hide();
  }
}

// ── Render results ──
function renderResults(results: any[], elapsed: number): void {
  currentResults = results;
  selectedIndex  = -1;
  resultsEl.innerHTML = "";

  if (results.length === 0) {
    resultsEl.innerHTML = `<div id="empty-state" style="padding:24px;color:rgba(255,255,255,0.2);text-align:center;font-size:13px;">No results found</div>`;
    statTime.style.display = "none";
    return;
  }

  const ms = elapsed < 1
    ? `${(elapsed * 1000).toFixed(0)}ms`
    : `${elapsed.toFixed(2)}s`;
  statTimeBar.textContent  = `⚡ Found ${results.length} result${results.length !== 1 ? 's' : ''} in ${ms}`;
  searchMeta.style.display = "flex";

  // Update coverage counts from current results
  const counts: Record<string, number> = { pdf: 0, docx: 0, pptx: 0, xlsx: 0, text: 0 };
  results.forEach(r => {
    if (['pdf','docx','pptx','xlsx'].includes(r.extension)) {
      counts[r.extension] = (counts[r.extension] || 0) + 1;
    } else {
      counts['text'] = (counts['text'] || 0) + 1;
    }
  });
  const covPdf  = document.getElementById("cov-pdf");
  const covDocx = document.getElementById("cov-docx");
  const covXlsx = document.getElementById("cov-xlsx");
  const covPptx = document.getElementById("cov-pptx");
  const covText = document.getElementById("cov-text");
  if (covPdf)  covPdf.textContent  = counts.pdf.toString();
  if (covDocx) covDocx.textContent = counts.docx.toString();
  if (covXlsx) covXlsx.textContent = counts.xlsx.toString();
  if (covPptx) covPptx.textContent = counts.pptx.toString();
  if (covText) covText.textContent = counts.text.toString();

  results.forEach((r, i) => {
    const item = document.createElement("div");
    item.className = "result-item";
    item.dataset.index = i.toString();

    const folderName = r.folder.split("/").filter(Boolean).pop() || r.folder;
    const shortPath  = r.path.replace(/^\/Users\/[^/]+/, "~");
    const displayPath = shortPath.length > 50
      ? "..." + shortPath.slice(-47)
      : shortPath;

    item.innerHTML = `
      <div class="result-file-icon">${getFileIcon(r.extension)}</div>
      <div class="result-meta">
        <div class="result-name">${r.name}</div>
        <div class="result-folder">📁 ${folderName} · ${displayPath}</div>
        <div class="result-snippet">${r.snippet}</div>
      </div>
      <span class="ext-badge ${extClass(r.extension)}">${r.extension.toUpperCase()}</span>
    `;

    item.addEventListener("click", () => openResult(r));
    item.addEventListener("mouseenter", () => setSelected(i));
    resultsEl.appendChild(item);
  });
}

// ── Open result ──
async function openResult(result: any): Promise<void> {
  try {
    await invoke("open_file", { path: result.path });
    await closeOverlay();
  } catch (err) {
    console.error("Open error:", err);
  }
}

// ── Keyboard selection ──
function setSelected(index: number): void {
  document.querySelectorAll(".result-item").forEach((el, i) => {
    el.classList.toggle("selected", i === index);
  });
  selectedIndex = index;
}

// ── Search input ──
searchInput.addEventListener("focus", () => {
  searchWrap.classList.add("focused");
});

searchInput.addEventListener("blur", () => {
  searchWrap.classList.remove("focused");
});

searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim();
  if (searchTimeout) clearTimeout(searchTimeout);

  if (!query) {
    overlayEl.classList.remove("searching");
    resultsEl.innerHTML = `
      <div id="empty-state">
        <div class="empty-shortcut">⌥ Space</div>
        <div class="empty-title">Search across your indexed files</div>
        <div class="empty-types">PDFs · DOCX · PPTX · XLSX · Text · Code</div>
      </div>`;
    statTime.style.display   = "none";
    searchMeta.style.display = "none";
    return;
  }

  overlayEl.classList.add("searching");

  searchTimeout = setTimeout(async () => {
    const start = performance.now();
    try {
      const results = await invoke<any[]>("search_files", { query, limit: 15 });
      const elapsed = (performance.now() - start) / 1000;
      renderResults(results, elapsed);
    } catch {
      resultsEl.innerHTML = `<div id="empty-state" style="padding:24px;color:rgba(255,255,255,0.2);text-align:center;font-size:13px;">Index not ready yet — open HALO and rebuild index</div>`;
    }
  }, 200);
});

// ── Keyboard navigation ──
document.addEventListener("keydown", async (e) => {
  if (e.key === "Escape") {
    e.preventDefault();
    await closeOverlay();
    return;
  }

  if (e.key === "ArrowDown") {
    e.preventDefault();
    setSelected(Math.min(selectedIndex + 1, currentResults.length - 1));
    return;
  }

  if (e.key === "ArrowUp") {
    e.preventDefault();
    setSelected(Math.max(selectedIndex - 1, 0));
    return;
  }

  if (e.key === "Enter" && selectedIndex >= 0) {
    e.preventDefault();
    openResult(currentResults[selectedIndex]);
    return;
  }
});

// ── ESC button click ──
escHint.addEventListener("click", async () => {
  await closeOverlay();
});

// ── Always keep focus on input ──
document.addEventListener("click", () => {
  searchInput.focus();
});

// ── Focus + reload stats when window shows ──
window.addEventListener("focus", () => {
  setTimeout(() => {
    searchInput.focus();
  }, 50);
  loadStats();
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    setTimeout(() => searchInput.focus(), 50);
  }
});

// ── Settings button — opens main HALO window ──
settingsBtn?.addEventListener("click", async () => {
  try {
    await invoke("show_main_window");
  } catch {}
  await closeOverlay();
});

// ── Init ──
loadStats();
setTimeout(() => searchInput.focus(), 100);