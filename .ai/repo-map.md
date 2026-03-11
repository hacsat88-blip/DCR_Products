# Repo Map

Purpose:
Help the assistant understand the project structure and conventions
before proposing changes.

Behavior rules:
- infer the repository structure before suggesting edits
- prefer existing patterns instead of introducing new ones
- preserve architecture and naming conventions
- recommend minimal changes in the correct layer
- avoid cross-layer coupling unless redesign is requested

When uncertain:
- point to the most likely file or layer that should be inspected
- state assumptions explicitly

---

# Project Summary

Product:
DCR Products — AI prompt and agent configuration management system.

Main purpose:
Manage and deploy AI system prompts, agent rules, and operational configurations
across multiple platforms (VS Code Copilot, Claude Code, Antigravity, Codex).

Tech stack:
Markdown-based configuration, GitHub for version control.

Runtime:
VS Code / GitHub Copilot Chat

Package manager:
N/A (configuration repository)

---

# Entrypoints

AI system entry:
.github/copilot-instructions.md → .ai/kernel.md

---

# Main Directories

## Execution layer (auto-loaded by each editor)

.github/copilot-instructions.md
VS Code Copilot entry point. DCR Kernel inlined.

.ai/
AI system kernel, repo map, and behavior modules (VS Code Copilot).

.ai/module/
Specialized modules (architecture, debugging, review, prompting).

.commands/
Trigger-activated command definitions (a/, i/, r/, s/, d/).

.vscode/
VS Code workspace settings (useInstructionFiles: true).

.cursor/rules/dcr-kernel.md
Cursor entry point. DCR Kernel + all module behaviors inlined.

CLAUDE.md
Claude Code entry point. DCR Kernel + safety/permission model.

.gemini/settings.json
Antigravity (Gemini) entry point. DCR Kernel via systemInstruction.

AGENTS.md
Codex (OpenAI) entry point. DCR Kernel + all module behaviors inlined.

## Asset layer (not auto-loaded)

rules/
Agent-specific behavior rules (84 agents).

templates/
Model-specific configuration templates (archive/source).

templates/obsidian/
Obsidian vault for prompt design and documentation.

templates/claude-code/
Claude Code (CLAUDE.md) configuration templates.

templates/vscode-copilot/
VS Code Copilot configuration templates (original source).

prototypes/
Experimental projects and proof-of-concepts.

skills/
Skill definitions (51 skills). Git-managed source of truth.
Deploy to editors via deploy.ps1.

deploy.ps1
One-way sync script: skills/ → ~/.agents/skills/ (VS Code Copilot),
rules/ → ~/.cursor/rules/ (Cursor).

---

# Architecture Notes

Preferred layering:
copilot-instructions.md → kernel.md → module/*.md + .commands/*.md

Configuration pattern:
Markdown-based instruction files, no code dependencies.

Deployment pattern:
deploy.ps1 syncs skills/ and rules/ to editor-specific user paths.
One-way only: repository → editor. Never reverse.

---

# Change Rules

When modifying this repository:

- edit skills/ and rules/ here, then deploy
- prefer minimal diffs
- preserve existing naming conventions
- do not create files in templates/ unless archiving a new editor config
- do not modify ~/.agents/ or ~/.cursor/ directly
