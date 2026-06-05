# HALO — Product Requirements Document

## Tagline
A memory layer for your files.

## Vision
HALO helps users instantly recognize, understand, and reconnect with folders
and projects by automatically adding visual identity and contextual memory
to their file system.

## Problem
Knowledge workers accumulate hundreds of folders over time.
After weeks or months, they forget:
- Why a folder was created
- What the folder contains
- Which files are important
- How folders relate to one another

## Solution
HALO creates a memory layer on top of the existing file system.
It automatically assigns icons, colors, summaries, and connections.

## Target Users
- Engineers
- Researchers
- Consultants
- Project Managers
- Students
- Knowledge Workers

## Core Principles
1. Local first — all analysis runs locally
2. Privacy first — no data leaves the device
3. No AI chat window
4. Minimal friction
5. Context over conversation

## MVP Features

### Feature 1 — Smart Folder Identity
Automatically assign:
- Folder icons
- Folder colors
- Folder themes

Examples:
- Invoices → 📄 Blue
- Vacation 2026 → 🌴 Green
- SATURN → 🛰️ Purple
- NOVASEC → 🔒 Red
- MBA → 🎓 Gold

### Feature 2 — Folder Memory Engine
Generate a memory profile containing:
- Folder summary
- Folder purpose
- Important files
- Last activity
- Related folders

### Feature 3 — Hover Context Card
When hovering over a folder, display:
- Icon and color
- Folder name
- Summary
- Last activity
- Related projects
- Important files

### Feature 4 — Folder Relationship Engine
Detect related folders based on:
- Similar filenames
- Similar keywords
- Activity patterns

## Out of Scope for MVP
- Voice interaction
- AI agents
- Chat interface
- Cloud sync
- Team collaboration
- Mobile apps
- Glow effects
- Windows support

## Future Features
- Halo Glow (memory strength indicator)
- Workflow breadcrumbs
- Activity timeline
- Semantic file discovery

## Business Model
- Free: up to 100 folders, basic icons and colors
- Pro: unlimited folders, relationships, advanced memory
- Price: €9.99 one-time purchase

## Tech Stack
- Framework: Tauri
- Frontend: HTML, CSS, TypeScript
- Backend: Rust
- Storage: SQLite
- AI: Local embedding model

## Success Metrics
- User understands a folder within 2 seconds
- User reconnects with old project without opening files
- User finds important folders faster