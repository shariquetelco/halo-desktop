# HALO

> Give every folder an identity.

HALO helps people instantly recognize, understand, and reconnect
with their folders by adding visual identity, context, and memory
to the file system.

Instead of generic folders, HALO provides:

- Smart icons
- Smart colors
- Folder summaries
- Context and purpose
- Relationships between folders

Whether it's Taxes, Downloads, Vacation Photos, MBA Applications,
or a complex work project, HALO helps users understand what matters
without digging through files.

Your folders already store your work.
HALO helps them tell their story.

## What it does

- Assigns smart icons and colors to folders automatically
- Generates a memory profile for each folder
- Shows a context card when you hover over a folder
- Connects related folders and projects

## Examples

- Taxes          → 📄 Blue    → 18 PDFs, tax returns 2022–2025
- Vacation 2025  → 🌴 Green   → Photos, tickets, hotel bookings
- Downloads      → 📥 Gray    → Mixed files, last updated today
- SATURN         → 🛰️ Purple  → ESA Satellite Resilience Project
- MBA            → 🎓 Gold    → Applications, essays, deadlines

## Principles

- Local first — nothing leaves your device
- Privacy first — no cloud, no login
- No AI chat — context surfaces automatically
- Minimal friction — works in the background
- Generic by design — works for any folder, any user

## Status

🚧 In active development — Day 2 complete

## Tech Stack

- Tauri (Rust + TypeScript)
- SQLite
- Local AI models

## Project Structure

HALO/
├── app/          → Tauri application code
├── docs/         → Architecture and notes
├── design/       → UI mockups
├── assets/       → Icons and logos
├── prompts/      → AI prompts used during development
├── screenshots/  → Progress screenshots
└── notes/        → Ideas and backlog