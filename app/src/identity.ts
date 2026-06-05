// ─────────────────────────────────────────
// HALO — identity.ts
// The identity engine. Gives every folder a name, face, and color.
// The rest of HALO never cares how identity was generated.
// It simply asks: who is this folder?
// ─────────────────────────────────────────

// ── Identity Object ──
export interface FolderIdentity {
  icon:        string;
  category:    string;
  color:       string;
  colorVar:    string;
  description: string;
  source:      "rules" | "user" | "ai";
}

// ── Color Palette ──
export interface IdentityColor {
  name:  string;
  value: string;
  var:   string;
}

export const ALL_COLORS: IdentityColor[] = [
  { name: "Purple",    value: "#6e56cf", var: "--folder-purple"    },
  { name: "Blue",      value: "#2563eb", var: "--folder-blue"      },
  { name: "Dark Blue", value: "#1e3a5f", var: "--folder-dark-blue" },
  { name: "Green",     value: "#16a34a", var: "--folder-green"     },
  { name: "Orange",    value: "#ea580c", var: "--folder-orange"    },
  { name: "Gold",      value: "#ca8a04", var: "--folder-gold"      },
  { name: "Pink",      value: "#db2777", var: "--folder-pink"      },
  { name: "Red",       value: "#dc2626", var: "--folder-red"       },
  { name: "Cyan",      value: "#0891b2", var: "--folder-cyan"      },
  { name: "Gray",      value: "#6b7280", var: "--folder-gray"      },
];

// ── Starter Identity Pack — 30 Icons ──
export const ALL_ICONS: string[] = [
  "📁", "📄", "🚀", "🛰️", "📡", "🔒",
  "🌴", "📷", "🎓", "💻", "🎵", "📚",
  "💰", "🗂️", "🏖️", "🎮", "🏥", "🚗",
  "🐾", "🍕", "⚽", "👨‍👩‍👧", "🔬", "🛡️",
  "📦", "🎬", "🛒", "⚖️", "🧬", "🌍",
];

// ── Identity Rules ──
interface IdentityRule {
  keywords:    string[];
  icon:        string;
  category:    string;
  color:       string;
  colorVar:    string;
  description: string;
}

const IDENTITY_RULES: IdentityRule[] = [
  {
    keywords:    ["invoice", "invoices", "finance", "financial", "budget",
                  "money", "payment", "billing", "accounting", "expense"],
    icon:        "💰",
    category:    "Finance",
    color:       "#2563eb",
    colorVar:    "--folder-blue",
    description: "Financial documents and records",
  },
  {
    keywords:    ["tax", "taxes", "taxation", "irs", "vat", "fiscal"],
    icon:        "📄",
    category:    "Taxes",
    color:       "#2563eb",
    colorVar:    "--folder-blue",
    description: "Tax documents and filings",
  },
  {
    keywords:    ["vacation", "travel", "trip", "holiday", "journey",
                  "tour", "flight", "hotel", "booking", "passport"],
    icon:        "🌴",
    category:    "Travel",
    color:       "#16a34a",
    colorVar:    "--folder-green",
    description: "Travel and holiday content",
  },
  {
    keywords:    ["photo", "photos", "picture", "pictures", "camera",
                  "image", "images", "screenshot", "screenshots", "gallery"],
    icon:        "📷",
    category:    "Media",
    color:       "#ea580c",
    colorVar:    "--folder-orange",
    description: "Photos, images and visual media",
  },
  {
    keywords:    ["video", "videos", "movie", "movies", "film",
                  "films", "recording", "recordings", "footage"],
    icon:        "🎬",
    category:    "Video",
    color:       "#ea580c",
    colorVar:    "--folder-orange",
    description: "Video and film content",
  },
  {
    keywords:    ["music", "songs", "song", "playlist", "album",
                  "audio", "podcast", "sound", "track", "tracks"],
    icon:        "🎵",
    category:    "Music",
    color:       "#db2777",
    colorVar:    "--folder-pink",
    description: "Music and audio content",
  },
  {
    keywords:    ["school", "study", "course", "courses", "lecture",
                  "university", "college", "class", "homework", "exam"],
    icon:        "🎓",
    category:    "Education",
    color:       "#ca8a04",
    colorVar:    "--folder-gold",
    description: "Education and study materials",
  },
  {
    keywords:    ["mba", "degree", "thesis", "dissertation",
                  "application", "applications", "academic"],
    icon:        "🎓",
    category:    "Education",
    color:       "#ca8a04",
    colorVar:    "--folder-gold",
    description: "Academic documents and applications",
  },
  {
    keywords:    ["code", "coding", "dev", "development", "github",
                  "programming", "software", "app", "apps", "script"],
    icon:        "💻",
    category:    "Coding",
    color:       "#0891b2",
    colorVar:    "--folder-cyan",
    description: "Code and software development",
  },
  {
    keywords:    ["satellite", "ntn", "esa", "space", "orbit",
                  "spacecraft", "nasa", "launch", "rocket", "astronomy"],
    icon:        "🛰️",
    category:    "Space",
    color:       "#1e3a5f",
    colorVar:    "--folder-dark-blue",
    description: "Satellite and space-related work",
  },
  {
    keywords:    ["security", "cyber", "cybersecurity", "encryption",
                  "firewall", "vulnerability", "threat", "attack", "defense"],
    icon:        "🔒",
    category:    "Security",
    color:       "#dc2626",
    colorVar:    "--folder-red",
    description: "Security and cybersecurity work",
  },
  {
    keywords:    ["telecom", "5g", "4g", "lte", "network", "radio",
                  "antenna", "signal", "spectrum", "wireless", "frmcs"],
    icon:        "📡",
    category:    "Telecom",
    color:       "#0891b2",
    colorVar:    "--folder-cyan",
    description: "Telecommunications and network projects",
  },
  {
    keywords:    ["military", "defense", "defence", "army", "navy",
                  "tactical", "mission", "combat", "shield", "weapon"],
    icon:        "🛡️",
    category:    "Military",
    color:       "#6b7280",
    colorVar:    "--folder-gray",
    description: "Military and defense projects",
  },
  {
    keywords:    ["research", "science", "lab", "laboratory", "experiment",
                  "study", "analysis", "data", "dataset", "paper"],
    icon:        "🔬",
    category:    "Research",
    color:       "#6e56cf",
    colorVar:    "--folder-purple",
    description: "Research and scientific work",
  },
  {
    keywords:    ["health", "medical", "doctor", "hospital", "medicine",
                  "fitness", "workout", "gym", "diet", "wellness"],
    icon:        "🏥",
    category:    "Health",
    color:       "#16a34a",
    colorVar:    "--folder-green",
    description: "Health and medical documents",
  },
  {
    keywords:    ["family", "home", "personal", "kids", "children",
                  "parent", "parents", "baby", "house", "household"],
    icon:        "👨‍👩‍👧",
    category:    "Family",
    color:       "#db2777",
    colorVar:    "--folder-pink",
    description: "Family and personal documents",
  },
  {
    keywords:    ["food", "recipe", "recipes", "cooking", "kitchen",
                  "restaurant", "meal", "nutrition", "diet", "baking"],
    icon:        "🍕",
    category:    "Food",
    color:       "#ea580c",
    colorVar:    "--folder-orange",
    description: "Food, recipes and cooking",
  },
  {
    keywords:    ["legal", "law", "contract", "contracts", "agreement",
                  "lawyer", "court", "compliance", "regulation", "gdpr"],
    icon:        "⚖️",
    category:    "Legal",
    color:       "#6b7280",
    colorVar:    "--folder-gray",
    description: "Legal documents and contracts",
  },
  {
    keywords:    ["shopping", "shop", "purchase", "order", "orders",
                  "ecommerce", "buy", "bought", "store", "cart"],
    icon:        "🛒",
    category:    "Shopping",
    color:       "#ea580c",
    colorVar:    "--folder-orange",
    description: "Shopping and purchases",
  },
  {
    keywords:    ["game", "gaming", "games", "steam", "playstation",
                  "xbox", "nintendo", "esport", "twitch", "streamer"],
    icon:        "🎮",
    category:    "Gaming",
    color:       "#6e56cf",
    colorVar:    "--folder-purple",
    description: "Gaming and entertainment",
  },
  {
    keywords:    ["book", "books", "reading", "library", "novel",
                  "ebook", "kindle", "literature", "author", "writing"],
    icon:        "📚",
    category:    "Books",
    color:       "#ca8a04",
    colorVar:    "--folder-gold",
    description: "Books and reading materials",
  },
  {
    keywords:    ["project", "projects", "work", "client", "clients",
                  "proposal", "business", "consulting", "management"],
    icon:        "🚀",
    category:    "Projects",
    color:       "#6e56cf",
    colorVar:    "--folder-purple",
    description: "Work projects and deliverables",
  },
  {
    keywords:    ["download", "downloads", "archive", "backup",
                  "temp", "temporary", "misc", "miscellaneous", "old"],
    icon:        "📦",
    category:    "Archive",
    color:       "#6b7280",
    colorVar:    "--folder-gray",
    description: "Downloads and archived files",
  },
];

// ── Default Identity ──
const DEFAULT_IDENTITY: FolderIdentity = {
  icon:        "📁",
  category:    "General",
  color:       "#6b7280",
  colorVar:    "--folder-gray",
  description: "General purpose folder",
  source:      "rules",
};

// ── Core Engine ──
export function getIdentity(folderName: string): FolderIdentity {
  const normalized = folderName.toLowerCase();

  for (const rule of IDENTITY_RULES) {
    for (const keyword of rule.keywords) {
      if (normalized.includes(keyword)) {
        return {
          icon:        rule.icon,
          category:    rule.category,
          color:       rule.color,
          colorVar:    rule.colorVar,
          description: rule.description,
          source:      "rules",
        };
      }
    }
  }

  return { ...DEFAULT_IDENTITY };
}

// ── Exports for Pickers ──
export function getAllIcons(): string[] {
  return ALL_ICONS;
}

export function getAllColors(): IdentityColor[] {
  return ALL_COLORS;
}