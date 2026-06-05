# HALO

> A memory layer for your files.

HALO is a lightweight desktop app that automatically gives folders identity, context, and memory.

Instead of generic folders, you instantly see what a folder is, why it exists, and what matters inside it.

## What it does

- Assigns smart icons and colors to folders automatically
- Generates a memory profile for each folder
- Shows a context card when you hover over a folder
- Connects related folders and projects

## Example

SATURN → 🛰️ Purple → ESA Satellite Resilience Project
NOVASEC → 🔒 Red → 5G Security Research
MBA → 🎓 Gold → MBA Application Materials

## Principles

- Local first — nothing leaves your device
- Privacy first — no cloud, no login
- No AI chat — context surfaces automatically
- Minimal friction — works in the background

## Status

🚧 In active development — Session 1

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