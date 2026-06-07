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
async function renderResults(results: any[], elapsed: number): Promise<void> {
  currentResults = results;
  selectedIndex  = -1;
  resultsEl.innerHTML = "";

  if (results.length === 0) {
    const suggestion = await getSuggestion(query);
    if (suggestion && suggestion.toLowerCase() !== query.toLowerCase()) {
      resultsEl.innerHTML = `
        <div style="padding:32px 20px;text-align:center;">
          <div style="font-size:13px;color:rgba(255,255,255,0.25);margin-bottom:12px;">
            No results for <strong style="color:rgba(255,255,255,0.4)">"${query}"</strong>
          </div>
          <div style="font-size:12px;color:rgba(255,255,255,0.2);margin-bottom:10px;">Did you mean:</div>
          <button id="suggestion-btn" style="
            background: rgba(124,106,247,0.12);
            border: 1px solid rgba(124,106,247,0.3);
            border-radius: 8px;
            color: #a89ff9;
            font-size: 14px;
            font-weight: 500;
            padding: 8px 20px;
            cursor: pointer;
            font-family: inherit;
            transition: all 150ms ease;
          ">${suggestion}</button>
        </div>`;
      const btn = document.getElementById("suggestion-btn");
      btn?.addEventListener("click", () => {
        searchInput.value = suggestion;
        searchInput.dispatchEvent(new Event("input"));
        searchInput.focus();
      });
    } else {
      resultsEl.innerHTML = `<div style="padding:32px;color:rgba(255,255,255,0.2);text-align:center;font-size:13px;">No results found for <strong>"${query}"</strong></div>`;
    }
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

  if (!query || query.length < 2) {
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
      const results = await invoke<any[]>("search_files", { query, limit: 20 });
      const elapsed = (performance.now() - start) / 1000;
      await renderResults(results, elapsed);
    } catch (err) {
      console.error("Search render error:", err);
      resultsEl.innerHTML = `<div style="padding:24px;color:rgba(255,255,255,0.2);text-align:center;font-size:13px;">Something went wrong — check console</div>`;
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

// ── Levenshtein distance ──
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

// ── Cache indexed names for fuzzy ──
let cachedTerms: Set<string> | null = null;

async function getTerms(): Promise<Set<string>> {
  if (cachedTerms) return cachedTerms;
  const names: string[] = await invoke("get_indexed_names");
  const terms = new Set<string>();
  names.forEach(name => {
    name.replace(/[-_.]/g, ' ')
        .split(' ')
        .forEach(t => { if (t.length > 2) terms.add(t.toLowerCase()); });
  });
  cachedTerms = terms;
  return terms;
}

// ── Fuzzy suggestion when 0 results ──
async function getSuggestion(query: string): Promise<string | null> {
  try {
    const terms = await getTerms();
    const queryLower = query.toLowerCase();

    // Find closest term
    let bestTerm  = "";
    let bestDist  = 999;

    terms.forEach(term => {
      const dist = levenshtein(queryLower, term);
      if (dist < bestDist && dist <= 2) {
        bestDist = dist;
        bestTerm = term;
      }
    });

    return bestTerm || null;
  } catch {
    return null;
  }
}

// ── Init ──
loadStats();
setTimeout(() => searchInput.focus(), 100);
setTimeout(() => getTerms(), 2000);