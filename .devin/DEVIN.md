# Devin Project Entrypoint

## Mission

Use Devin as a high-signal implementation and verification operator for this repository. Prefer small, safe changes with visible evidence over broad rewrites.

## Source of Truth

- Shared runtime and behavior: `.ai/book/`, `.ai/kernel/`
- Routing and orchestration: `.ai/module/unified-router.md`, `.ai/module/unified-coordinator.md`, `.ai/module/unified-integration.md`
- Rules: `.ai/catalog/rules/`
- Skills: `.ai/catalog/skills/`
- Agents: `.ai/catalog/agents-source/`
- Generated mirrors: `AGENTS.md`, `CLAUDE.md`, `opencode.json`, `.opencode/kernel.md`, `.opencode/opencode.json`, `.windsurf/`, `.cursor/`, `.codex/agents/`, `.claude/agents/`

## Devin Operating Rules

1. For 3+ step work, plan first and track progress with the task plan tool.
2. For config, dependency, destructive, deploy, or security-impacting work, present the plan and wait for explicit approval before editing or executing.
3. Use read-only exploration first. Batch independent reads and status checks.
4. Before using any skill or subagent, report the adopted name, reason, and expected effect.
5. Prefer source edits under `.ai/` over editing generated mirrors. `.devin/` is itself source-of-truth for Devin-specific behavior, not generated output.

## Delegation Strategy

- Use a read-only onboarding or mapping subagent when source-of-truth boundaries, generated files, or execution paths are unclear.
- Use implementation subagents only for isolated tasks with clear file ownership.
- Use QA/evidence collection after implementation when completion claims need commands, logs, screenshots, diffs, or reproduction notes.
- Use specialist QA for UI accessibility, API/CLI contracts, performance, or security when those risks are in scope.
- When the user enables the project MCP in Devin, prefer the `opencode-bridge` tools for OSS model delegation: `oss_explore`, `oss_document`, and `oss_implement`.
- Only hand off to a cloud or remote Devin agent when the user explicitly asks for handoff.

## Hooks and Feedback

Treat hook output as user feedback. If a hook blocks an action:

1. Adjust the action when possible, using a safer equivalent.
2. If the hook appears misconfigured or blocks necessary safe work, ask the user to inspect the hook configuration or explicitly approve the blocked action.
3. Do not attempt to bypass hooks without explicit user approval for that specific action.

## Safety Boundaries

- Do not read, print, copy, or commit secrets.
- Do not edit `.env`, key, certificate, wallet, or credential files.
- Do not run destructive commands without explicit approval for that specific action.
- Do not force-push, rewrite history, delete branches, or bypass hooks without explicit approval.
- Do not directly edit deploy-generated mirrors unless the task explicitly targets generated output inspection.

## Verification Before Completion

Before claiming implementation work is complete, run the narrowest relevant checks plus, for DCR/runtime/config changes:

```powershell
powershell -ExecutionPolicy Bypass -File ./validate.ps1
powershell -ExecutionPolicy Bypass -File ./deploy.ps1 -Check
```

If verification fails for pre-existing unrelated changes, report that distinction clearly and provide the exact failing evidence.

## Memory Search

このプロジェクトは SQLite FTS5 ベースのメモリ検索システムを使用している。

**制約**: `mem_cli.py` と `mem.db` はユーザーのローカルマシン
(`%USERPROFILE%\.claude\projects\<slug>\memory\` など) に存在するため、
クラウドサンドボックスで動作する Devin からは**直接アクセスできない**。

ローカル Hooks は `tools/lib/resolve-claude-memory.ps1` で `mem_cli.py` を解決する。
複数の Claude プロジェクトフォルダがある場合は、環境変数 **`DCR_MEMORY_ROOT`** に
`memory` ディレクトリの絶対パスを設定して一意に固定する。

代替手段:
- ユーザーがセッション開始時に関連メモリを手動で共有する
- リポジトリ内の `docs/` や既存のコンテキストファイルを参照する
- メモリに保存すべき知見が生まれた場合は、ユーザーに
  「これを mem_cli.py に保存してください」と伝える

## Completion Report

Report:

- Changed files
- Why the change is safe
- Verification evidence
- Residual risks or follow-up needed
