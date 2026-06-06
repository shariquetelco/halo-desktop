// ─────────────────────────────────────────
// HALO — relations.ts
// Folder Relationship Engine.
// Finds related folders based on:
//   1. Same category
//   2. Shared keywords
// No AI. No cloud. Pure local matching.
// ─────────────────────────────────────────

import { FolderRecord } from "./storage";

// ── Relationship Result ──
export interface FolderRelation {
  folder:    FolderRecord;
  strength:  "strong" | "medium";
  reason:    string;
}

// ── Shared Keywords ──
// Words that connect folders across categories
const DOMAIN_KEYWORDS: Record<string, string[]> = {
  telecom:    ["5g", "6g", "ntn", "lte", "ran", "core", "ims", "rf", "antenna",
               "frmcs", "mcptt", "telecom", "network", "wireless", "spectrum"],
  space:      ["satellite", "esa", "nasa", "orbit", "space", "ntn", "navisp",
               "artes", "launch", "rocket"],
  security:   ["security", "cyber", "encryption", "defense", "defence", "risk",
               "threat", "attack", "vulnerability", "bsi", "nato", "classified"],
  military:   ["military", "bundeswehr", "army", "navy", "tactical", "combat",
               "mission", "shield", "intelligence", "ironshield"],
  research:   ["research", "paper", "publication", "ieee", "study", "analysis",
               "data", "survey", "experiment", "phd", "thesis"],
  business:   ["proposal", "contract", "client", "consulting", "project",
               "deliverable", "report", "presentation", "budget", "invoice"],
  education:  ["mba", "course", "university", "exam", "degree", "thesis",
               "study", "lecture", "certification", "training"],
  finance:    ["finance", "tax", "invoice", "budget", "salary", "investment",
               "banking", "expense", "revenue", "accounting"],
};

// ── Extract Keywords from Folder ──
function extractKeywords(folder: FolderRecord): string[] {
  const words: string[] = [];

  // From name
  const nameWords = folder.name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2);
  words.push(...nameWords);

  // From description
  if (folder.description) {
    const descWords = folder.description
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 2);
    words.push(...descWords);
  }

  // From category
  const catWords = folder.category
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2);
  words.push(...catWords);

  return [...new Set(words)];
}

// ── Find Domain Matches ──
function findDomainMatches(keywords: string[]): string[] {
  const matched: string[] = [];
  for (const [domain, domainKeywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (domainKeywords.some(k => keywords.includes(k))) {
      matched.push(domain);
    }
  }
  return matched;
}

// ── Core Relationship Engine ──
export function findRelatedFolders(
  target: FolderRecord,
  allFolders: FolderRecord[],
  maxResults: number = 4
): FolderRelation[] {
  const others = allFolders.filter(f => f.path !== target.path);
  if (others.length === 0) return [];

  const targetKeywords = extractKeywords(target);
  const targetDomains  = findDomainMatches(targetKeywords);
  const results: FolderRelation[] = [];

  for (const folder of others) {
    const folderKeywords = extractKeywords(folder);
    const folderDomains  = findDomainMatches(folderKeywords);

    // ── Strong match: same category ──
    if (folder.category === target.category && folder.category !== "General") {
      results.push({
        folder,
        strength: "strong",
        reason:   folder.category,
      });
      continue;
    }

    // ── Strong match: shared domain ──
    const sharedDomains = targetDomains.filter(d => folderDomains.includes(d));
    if (sharedDomains.length > 0) {
      results.push({
        folder,
        strength: "strong",
        reason:   sharedDomains[0],
      });
      continue;
    }

    // ── Medium match: shared keywords ──
    const sharedKeywords = targetKeywords.filter(k =>
      folderKeywords.includes(k) && k.length > 3
    );
    if (sharedKeywords.length >= 2) {
      results.push({
        folder,
        strength: "medium",
        reason:   sharedKeywords.slice(0, 2).join(", "),
      });
    }
  }

  // Sort: strong first, then by name
  return results
    .sort((a, b) => {
      if (a.strength === b.strength) return a.folder.name.localeCompare(b.folder.name);
      return a.strength === "strong" ? -1 : 1;
    })
    .slice(0, maxResults);
}