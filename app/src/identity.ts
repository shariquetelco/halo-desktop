// ─────────────────────────────────────────
// HALO — identity.ts
// The identity engine.
// 250+ icons. 20 categories. 40 colors. 20 gradients.
// HALO suggests. User decides.
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

// ── Color Object ──
export interface IdentityColor {
  name:     string;
  value:    string;
  var:      string;
  type:     "solid" | "gradient";
  preview?: string; // for gradients, the two endpoint colors
}

// ── Icon Category ──
export interface IconCategory {
  id:    string;
  label: string;
  icon:  string;
  icons: string[];
}

// ══════════════════════════════════════════
// ICON LIBRARY — 250+ Icons, 20 Categories
// ══════════════════════════════════════════

export const ICON_CATEGORIES: IconCategory[] = [
  {
    id:    "general",
    label: "General",
    icon:  "📁",
    icons: [
      "📁", "📂", "🗂️", "📄", "📃", "📋", "📊", "📈", "📉",
      "📝", "🗒️", "🗃️", "🗄️", "📌", "📍",
    ],
  },
  {
    id:    "work",
    label: "Work & Business",
    icon:  "💼",
    icons: [
      "💼", "🏢", "🤝", "📅", "📆", "🗓️", "📇", "🖊️", "✒️",
      "📑", "📜", "🖋️", "📤", "📥", "📦", "📫", "📬", "📭",
      "🏗️", "🏭",
    ],
  },
  {
    id:    "finance",
    label: "Finance & Money",
    icon:  "💰",
    icons: [
      "💰", "💵", "💴", "💶", "💷", "💸", "💳", "🏦", "💹",
      "📊", "🪙", "💎", "🏧", "💱", "💲",
    ],
  },
  {
    id:    "education",
    label: "Education & Learning",
    icon:  "📚",
    icons: [
      "📚", "📖", "🎓", "🏫", "✏️", "📝", "🖊️", "📐", "📏",
      "🔬", "🧪", "🧫", "📓", "📔", "📒",
    ],
  },
  {
    id:    "technology",
    label: "Technology & IT",
    icon:  "💻",
    icons: [
      "💻", "🖥️", "🖨️", "⌨️", "🖱️", "💾", "💿", "📀", "🖲️",
      "📱", "☎️", "📟", "📠", "🔋", "🔌", "💡", "🔦", "🕹️",
      "🤖", "⚙️", "🔧", "🔩", "🛠️", "🧰", "🧲",
    ],
  },
  {
    id:    "telecom",
    label: "Telecom & Space",
    icon:  "📡",
    icons: [
      "📡", "🛰️", "🚀", "🌍", "🌏", "🌎", "🔭", "🛸", "🌌",
      "⭐", "🌟", "💫", "☁️", "🌐", "📻", "📲", "🗼", "🏙️",
      "🛩️", "✈️",
    ],
  },
  {
    id:    "security",
    label: "Security & Defense",
    icon:  "🔒",
    icons: [
      "🔒", "🔓", "🛡️", "⚔️", "🗡️", "🔐", "🗝️", "🔑", "🚨",
      "🚔", "🪖", "🎯", "💣", "🔍", "🕵️", "👁️", "⚠️",
      "🚫", "❌", "🔴",
    ],
  },
  {
    id:    "research",
    label: "Science & Research",
    icon:  "🔬",
    icons: [
      "🔬", "🧬", "🧪", "🧫", "⚗️", "🔭", "🧲", "💊", "🩺",
      "🩻", "🧠", "🫀", "🫁", "🧬", "⚛️", "🌡️", "🧯",
      "📡", "🔋", "⚡",
    ],
  },
  {
    id:    "creative",
    label: "Creative & Design",
    icon:  "🎨",
    icons: [
      "🎨", "🖌️", "✏️", "🖊️", "📐", "📏", "🖼️", "🎭", "🎪",
      "🎬", "📸", "🎞️", "🎥", "🎦", "📹", "🎠",
    ],
  },
  {
    id:    "media",
    label: "Media & Content",
    icon:  "📷",
    icons: [
      "📷", "📸", "📹", "🎥", "📽️", "🎞️", "📺", "📻", "🎙️",
      "🎚️", "🎛️", "📡", "🎤", "🔊", "📢", "📣",
    ],
  },
  {
    id:    "music",
    label: "Music & Audio",
    icon:  "🎵",
    icons: [
      "🎵", "🎶", "🎼", "🎹", "🎸", "🎺", "🎻", "🥁", "🎷",
      "🪗", "🪘", "🪕", "🎤", "🎧", "🎙️",
    ],
  },
  {
    id:    "gaming",
    label: "Gaming & Entertainment",
    icon:  "🎮",
    icons: [
      "🎮", "🕹️", "👾", "🎲", "♟️", "🃏", "🎯", "🎳", "🎰",
      "🎭", "🎪", "🎠", "🎡", "🎢", "🃟",
    ],
  },
  {
    id:    "travel",
    label: "Travel & Places",
    icon:  "🌍",
    icons: [
      "🌍", "🌏", "🌎", "✈️", "🛫", "🛬", "🚀", "🛸", "🏖️",
      "🏔️", "🗺️", "🧳", "🏝️", "🌴",
    ],
  },
  {
    id:    "home",
    label: "Home & Family",
    icon:  "🏠",
    icons: [
      "🏠", "🏡", "🏘️", "👨‍👩‍👧", "👨‍👩‍👦", "👪", "🛋️", "🪴",
      "🧹", "🧺", "🪣", "🚿", "🛁", "🪟", "🚪",
    ],
  },
  {
    id:    "health",
    label: "Health & Fitness",
    icon:  "❤️",
    icons: [
      "❤️", "🏃", "🧘", "🏋️", "⚽", "🏀", "🎾", "🏊", "🚴",
      "🥗", "💊", "🩺", "🏥", "🩻", "🧬",
    ],
  },
  {
    id:    "shopping",
    label: "Shopping & Lifestyle",
    icon:  "🛒",
    icons: [
      "🛒", "🛍️", "👗", "👠", "👒", "🎁", "🍕", "🍔", "🍜",
      "☕", "🍷", "🥂", "🛁",
    ],
  },
  {
    id:    "transport",
    label: "Transport & Vehicles",
    icon:  "🚗",
    icons: [
      "🚗", "🏎️", "🚙", "🛻", "🚕", "🚌", "🚂", "🚁", "✈️",
      "🛥️", "⛵", "🚲", "🛵", "🏍️",
    ],
  },
  {
    id:    "legal",
    label: "Legal & Administration",
    icon:  "⚖️",
    icons: [
      "⚖️", "🏛️", "📜", "📋", "🖊️", "✍️", "🔏", "🗳️", "📨",
      "📮", "🗺️",
    ],
  },
  {
    id:    "community",
    label: "Community & Social",
    icon:  "🤝",
    icons: [
      "🤝", "👥", "👤", "💬", "💭", "🗣️", "📣", "🎉", "🎊",
      "🌐", "🤲",
    ],
  },
  {
    id:    "archive",
    label: "Storage & Archive",
    icon:  "📦",
    icons: [
      "📦", "🗃️", "🗄️", "📥", "📤", "💾", "💿", "📀", "🗑️",
      "🗂️", "📁", "🔒", "🔐",
    ],
  },
];

// ── Recent Icons (default) ──
export const DEFAULT_RECENT_ICONS: string[] = [
  "📁", "🚀", "🛰️", "🔒", "🌴", "🎓", "💻", "📷",
];

// ══════════════════════════════════════════
// COLOR SYSTEM — 40 Solids + 20 Gradients
// ══════════════════════════════════════════

export const ALL_COLORS: IdentityColor[] = [

  // ── Solid Colors (40) ──
  { name: "Violet",      value: "#7c6af7", var: "--folder-violet",    type: "solid" },
  { name: "Indigo",      value: "#6366f1", var: "--folder-indigo",    type: "solid" },
  { name: "Blue",        value: "#3b82f6", var: "--folder-blue",      type: "solid" },
  { name: "Sky",         value: "#0ea5e9", var: "--folder-sky",       type: "solid" },
  { name: "Cyan",        value: "#06b6d4", var: "--folder-cyan",      type: "solid" },
  { name: "Teal",        value: "#14b8a6", var: "--folder-teal",      type: "solid" },
  { name: "Emerald",     value: "#10b981", var: "--folder-emerald",   type: "solid" },
  { name: "Green",       value: "#22c55e", var: "--folder-green",     type: "solid" },
  { name: "Lime",        value: "#84cc16", var: "--folder-lime",      type: "solid" },
  { name: "Yellow",      value: "#eab308", var: "--folder-yellow",    type: "solid" },
  { name: "Amber",       value: "#f59e0b", var: "--folder-amber",     type: "solid" },
  { name: "Orange",      value: "#f97316", var: "--folder-orange",    type: "solid" },
  { name: "Red",         value: "#ef4444", var: "--folder-red",       type: "solid" },
  { name: "Rose",        value: "#f43f5e", var: "--folder-rose",      type: "solid" },
  { name: "Pink",        value: "#ec4899", var: "--folder-pink",      type: "solid" },
  { name: "Fuchsia",     value: "#d946ef", var: "--folder-fuchsia",   type: "solid" },
  { name: "Purple",      value: "#a855f7", var: "--folder-purple",    type: "solid" },
  { name: "Dark Blue",   value: "#1d4ed8", var: "--folder-darkblue",  type: "solid" },
  { name: "Navy",        value: "#1e3a5f", var: "--folder-navy",      type: "solid" },
  { name: "Slate",       value: "#64748b", var: "--folder-slate",     type: "solid" },
  { name: "Gray",        value: "#6b7280", var: "--folder-gray",      type: "solid" },
  { name: "Zinc",        value: "#71717a", var: "--folder-zinc",      type: "solid" },
  { name: "Stone",       value: "#78716c", var: "--folder-stone",     type: "solid" },
  { name: "Copper",      value: "#b45309", var: "--folder-copper",    type: "solid" },
  { name: "Gold",        value: "#ca8a04", var: "--folder-gold",      type: "solid" },
  { name: "Silver",      value: "#94a3b8", var: "--folder-silver",    type: "solid" },
  { name: "White",       value: "#e2e8f0", var: "--folder-white",     type: "solid" },
  { name: "Mint",        value: "#6ee7b7", var: "--folder-mint",      type: "solid" },
  { name: "Lavender",    value: "#c4b5fd", var: "--folder-lavender",  type: "solid" },
  { name: "Peach",       value: "#fca5a5", var: "--folder-peach",     type: "solid" },
  { name: "Coral",       value: "#fb7185", var: "--folder-coral",     type: "solid" },
  { name: "Crimson",     value: "#dc2626", var: "--folder-crimson",   type: "solid" },
  { name: "Forest",      value: "#15803d", var: "--folder-forest",    type: "solid" },
  { name: "Ocean",       value: "#0284c7", var: "--folder-ocean",     type: "solid" },
  { name: "Midnight",    value: "#312e81", var: "--folder-midnight",  type: "solid" },
  { name: "Charcoal",    value: "#374151", var: "--folder-charcoal",  type: "solid" },
  { name: "Sand",        value: "#d4a574", var: "--folder-sand",      type: "solid" },
  { name: "Sage",        value: "#87a96b", var: "--folder-sage",      type: "solid" },
  { name: "Denim",       value: "#4169e1", var: "--folder-denim",     type: "solid" },
  { name: "Burgundy",    value: "#800020", var: "--folder-burgundy",  type: "solid" },

  // ── Gradients (20) ──
  {
    name: "Cosmic",
    value: "linear-gradient(135deg, #7c6af7, #ec4899)",
    var: "--folder-gradient-cosmic",
    type: "gradient",
    preview: "#7c6af7",
  },
  {
    name: "Ocean",
    value: "linear-gradient(135deg, #0ea5e9, #06b6d4)",
    var: "--folder-gradient-ocean",
    type: "gradient",
    preview: "#0ea5e9",
  },
  {
    name: "Sunset",
    value: "linear-gradient(135deg, #f97316, #ec4899)",
    var: "--folder-gradient-sunset",
    type: "gradient",
    preview: "#f97316",
  },
  {
    name: "Aurora",
    value: "linear-gradient(135deg, #10b981, #06b6d4)",
    var: "--folder-gradient-aurora",
    type: "gradient",
    preview: "#10b981",
  },
  {
    name: "Galaxy",
    value: "linear-gradient(135deg, #312e81, #7c6af7)",
    var: "--folder-gradient-galaxy",
    type: "gradient",
    preview: "#312e81",
  },
  {
    name: "Fire",
    value: "linear-gradient(135deg, #ef4444, #f97316)",
    var: "--folder-gradient-fire",
    type: "gradient",
    preview: "#ef4444",
  },
  {
    name: "Forest",
    value: "linear-gradient(135deg, #15803d, #84cc16)",
    var: "--folder-gradient-forest",
    type: "gradient",
    preview: "#15803d",
  },
  {
    name: "Rose Gold",
    value: "linear-gradient(135deg, #f43f5e, #ca8a04)",
    var: "--folder-gradient-rosegold",
    type: "gradient",
    preview: "#f43f5e",
  },
  {
    name: "Midnight",
    value: "linear-gradient(135deg, #1e3a5f, #6366f1)",
    var: "--folder-gradient-midnight",
    type: "gradient",
    preview: "#1e3a5f",
  },
  {
    name: "Neon",
    value: "linear-gradient(135deg, #06b6d4, #84cc16)",
    var: "--folder-gradient-neon",
    type: "gradient",
    preview: "#06b6d4",
  },
  {
    name: "Lavender",
    value: "linear-gradient(135deg, #a855f7, #c4b5fd)",
    var: "--folder-gradient-lavender",
    type: "gradient",
    preview: "#a855f7",
  },
  {
    name: "Tropical",
    value: "linear-gradient(135deg, #10b981, #f59e0b)",
    var: "--folder-gradient-tropical",
    type: "gradient",
    preview: "#10b981",
  },
  {
    name: "Space",
    value: "linear-gradient(135deg, #0f172a, #6366f1)",
    var: "--folder-gradient-space",
    type: "gradient",
    preview: "#0f172a",
  },
  {
    name: "Candy",
    value: "linear-gradient(135deg, #ec4899, #f97316)",
    var: "--folder-gradient-candy",
    type: "gradient",
    preview: "#ec4899",
  },
  {
    name: "Arctic",
    value: "linear-gradient(135deg, #e2e8f0, #0ea5e9)",
    var: "--folder-gradient-arctic",
    type: "gradient",
    preview: "#e2e8f0",
  },
  {
    name: "Gold Rush",
    value: "linear-gradient(135deg, #ca8a04, #f97316)",
    var: "--folder-gradient-goldrush",
    type: "gradient",
    preview: "#ca8a04",
  },
  {
    name: "Crimson",
    value: "linear-gradient(135deg, #dc2626, #7c6af7)",
    var: "--folder-gradient-crimson",
    type: "gradient",
    preview: "#dc2626",
  },
  {
    name: "Mint",
    value: "linear-gradient(135deg, #6ee7b7, #0ea5e9)",
    var: "--folder-gradient-mint",
    type: "gradient",
    preview: "#6ee7b7",
  },
  {
    name: "Dusk",
    value: "linear-gradient(135deg, #f43f5e, #312e81)",
    var: "--folder-gradient-dusk",
    type: "gradient",
    preview: "#f43f5e",
  },
  {
    name: "Copper",
    value: "linear-gradient(135deg, #b45309, #ca8a04)",
    var: "--folder-gradient-copper",
    type: "gradient",
    preview: "#b45309",
  },
];

// ══════════════════════════════════════════
// IDENTITY RULES
// ══════════════════════════════════════════

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
                  "money", "payment", "billing", "accounting", "expense",
                  "salary", "bank", "investment", "revenue", "profit"],
    icon:        "💰",
    category:    "Finance & Money",
    color:       "#3b82f6",
    colorVar:    "--folder-blue",
    description: "Financial documents and records",
  },
  {
    keywords:    ["tax", "taxes", "taxation", "irs", "vat", "fiscal",
                  "declaration", "return", "steuer"],
    icon:        "📊",
    category:    "Finance & Money",
    color:       "#3b82f6",
    colorVar:    "--folder-blue",
    description: "Tax documents and filings",
  },
  {
    keywords:    ["vacation", "travel", "trip", "holiday", "journey",
                  "tour", "flight", "hotel", "booking", "passport",
                  "visa", "beach", "mountain", "adventure"],
    icon:        "🌴",
    category:    "Travel & Places",
    color:       "#10b981",
    colorVar:    "--folder-emerald",
    description: "Travel and holiday content",
  },
  {
    keywords:    ["photo", "photos", "picture", "pictures", "camera",
                  "image", "images", "screenshot", "screenshots", "gallery",
                  "album", "portrait", "landscape"],
    icon:        "📷",
    category:    "Media & Content",
    color:       "#f97316",
    colorVar:    "--folder-orange",
    description: "Photos, images and visual media",
  },
  {
    keywords:    ["video", "videos", "movie", "movies", "film",
                  "films", "recording", "recordings", "footage",
                  "youtube", "stream", "podcast"],
    icon:        "🎥",
    category:    "Media & Content",
    color:       "#f97316",
    colorVar:    "--folder-orange",
    description: "Video and film content",
  },
  {
    keywords:    ["music", "songs", "song", "playlist", "album",
                  "audio", "sound", "track", "tracks", "recording",
                  "studio", "beat", "instrument"],
    icon:        "🎵",
    category:    "Music & Audio",
    color:       "#ec4899",
    colorVar:    "--folder-pink",
    description: "Music and audio content",
  },
  {
    keywords:    ["school", "study", "course", "courses", "lecture",
                  "university", "college", "class", "homework", "exam",
                  "thesis", "dissertation", "assignment", "semester"],
    icon:        "🎓",
    category:    "Education & Learning",
    color:       "#ca8a04",
    colorVar:    "--folder-gold",
    description: "Education and study materials",
  },
  {
    keywords:    ["mba", "degree", "academic", "phd", "master",
                  "bachelor", "certification", "training", "workshop"],
    icon:        "📚",
    category:    "Education & Learning",
    color:       "#ca8a04",
    colorVar:    "--folder-gold",
    description: "Academic documents and applications",
  },
  {
    keywords:    ["code", "coding", "dev", "development", "github",
                  "programming", "software", "app", "apps", "script",
                  "api", "backend", "frontend", "database", "devops"],
    icon:        "💻",
    category:    "Technology & IT",
    color:       "#06b6d4",
    colorVar:    "--folder-cyan",
    description: "Code and software development",
  },
  {
    keywords:    ["ai", "machine", "learning", "neural", "model",
                  "dataset", "training", "inference", "llm", "gpt"],
    icon:        "🤖",
    category:    "Technology & IT",
    color:       "#06b6d4",
    colorVar:    "--folder-cyan",
    description: "AI and machine learning projects",
  },
  {
    keywords:    ["satellite", "ntn", "esa", "space", "orbit",
                  "spacecraft", "nasa", "launch", "rocket", "astronomy",
                  "5g", "6g", "lte", "nr", "ran", "core", "frmcs",
                  "mcptt", "ims", "antenna", "rf", "telecom", "radio"],
    icon:        "🛰️",
    category:    "Telecom & Space",
    color:       "linear-gradient(135deg, #1e3a5f, #6366f1)",
    colorVar:    "--folder-gradient-midnight",
    description: "Satellite and space-related work",
  },
  {
    keywords:    ["security", "cyber", "cybersecurity", "encryption",
                  "firewall", "vulnerability", "threat", "attack",
                  "novasec", "saturn", "ironshield", "bsi", "nato"],
    icon:        "🔒",
    category:    "Security & Defense",
    color:       "#ef4444",
    colorVar:    "--folder-red",
    description: "Security and cybersecurity work",
  },
  {
    keywords:    ["military", "defense", "defence", "army", "navy",
                  "tactical", "mission", "combat", "shield", "weapon",
                  "bundeswehr", "intelligence", "classified"],
    icon:        "🛡️",
    category:    "Security & Defense",
    color:       "#6b7280",
    colorVar:    "--folder-gray",
    description: "Military and defense projects",
  },
  {
    keywords:    ["research", "science", "lab", "laboratory", "experiment",
                  "analysis", "data", "dataset", "paper", "publication",
                  "journal", "study", "survey", "hypothesis"],
    icon:        "🔬",
    category:    "Science & Research",
    color:       "#a855f7",
    colorVar:    "--folder-purple",
    description: "Research and scientific work",
  },
  {
    keywords:    ["design", "ui", "ux", "graphic", "figma", "sketch",
                  "illustration", "animation", "creative", "art",
                  "logo", "brand", "visual", "prototype"],
    icon:        "🎨",
    category:    "Creative & Design",
    color:       "#d946ef",
    colorVar:    "--folder-fuchsia",
    description: "Creative and design projects",
  },
  {
    keywords:    ["health", "medical", "doctor", "hospital", "medicine",
                  "fitness", "workout", "gym", "diet", "wellness",
                  "nutrition", "sport", "yoga", "mental"],
    icon:        "❤️",
    category:    "Health & Fitness",
    color:       "#f43f5e",
    colorVar:    "--folder-rose",
    description: "Health and medical documents",
  },
  {
    keywords:    ["family", "home", "personal", "kids", "children",
                  "parent", "parents", "baby", "house", "household",
                  "wedding", "birthday", "anniversary"],
    icon:        "🏠",
    category:    "Home & Family",
    color:       "#f59e0b",
    colorVar:    "--folder-amber",
    description: "Family and personal documents",
  },
  {
    keywords:    ["legal", "law", "contract", "contracts", "agreement",
                  "lawyer", "court", "compliance", "regulation", "gdpr",
                  "insurance", "notary", "immigration", "visa"],
    icon:        "⚖️",
    category:    "Legal & Administration",
    color:       "#64748b",
    colorVar:    "--folder-slate",
    description: "Legal documents and contracts",
  },
  {
    keywords:    ["project", "projects", "work", "client", "clients",
                  "proposal", "business", "consulting", "management",
                  "meeting", "presentation", "report", "deliverable"],
    icon:        "💼",
    category:    "Work & Business",
    color:       "#7c6af7",
    colorVar:    "--folder-violet",
    description: "Work projects and deliverables",
  },
  {
    keywords:    ["download", "downloads", "archive", "backup",
                  "temp", "temporary", "misc", "miscellaneous",
                  "old", "storage", "cache"],
    icon:        "📦",
    category:    "Storage & Archive",
    color:       "#6b7280",
    colorVar:    "--folder-gray",
    description: "Downloads and archived files",
  },
  {
    keywords:    ["game", "gaming", "games", "steam", "playstation",
                  "xbox", "nintendo", "esport", "twitch", "streamer"],
    icon:        "🎮",
    category:    "Gaming & Entertainment",
    color:       "#7c6af7",
    colorVar:    "--folder-violet",
    description: "Gaming and entertainment",
  },
  {
    keywords:    ["shopping", "shop", "purchase", "order", "fashion",
                  "food", "recipe", "recipes", "cooking", "restaurant"],
    icon:        "🛒",
    category:    "Shopping & Lifestyle",
    color:       "#f97316",
    colorVar:    "--folder-orange",
    description: "Shopping and lifestyle",
  },
  {
    keywords:    ["car", "vehicle", "transport", "bike", "motorcycle",
                  "aviation", "flight", "ship", "marine", "drive"],
    icon:        "🚗",
    category:    "Transport & Vehicles",
    color:       "#64748b",
    colorVar:    "--folder-slate",
    description: "Transport and vehicle documents",
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

// ══════════════════════════════════════════
// CORE ENGINE
// ══════════════════════════════════════════

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

// ── Exports ──
export function getAllIcons(): IconCategory[] {
  return ICON_CATEGORIES;
}

export function getAllColors(): IdentityColor[] {
  return ALL_COLORS;
}

export function getDefaultRecentIcons(): string[] {
  return DEFAULT_RECENT_ICONS;
}