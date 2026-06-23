---
name: ai-prompt-manager
routing_category: governance
description: Chrome拡張 Product/ai-prompt-manager の開発・改修・検証を行う専用スキル。manifest v3、sidepanel、content script、AIチャットDOM差分吸収を含む。
contract:
  preconditions:
    - "The request matches this skill's description or routing category."
  postconditions:
    - "The response names the result, reasoning, and verification or handoff path."
  invariants:
    - "Do not treat generated mirrors or runtime caches as DCR source of truth."
composable:
  input_type: task
  output_type: artifact-or-decision
  chains_with:
    - verification-before-completion
runtime_targets:
  - codex
  - claude
  - copilot
  - cursor
  - gemini-cli
---

# AI Prompt Manager Skill

`Product/ai-prompt-manager` の変更を安全に進めるための実装ガイド。

## When to Use

- 拡張機能の UI (`sidepanel.html`, `sidepanel.css`, `options.html`) を変更するとき
- 挿入ロジック (`content.js`, `ai-service.js`) を変更するとき
- コンテキストメニューや background 処理 (`background.js`) を変更するとき
- `manifest.json` の権限や host 設定を調整するとき

## Working Rules

1. 変更前に `manifest.json` の `permissions` と `host_permissions` への影響を確認する。
2. チャットサービス固有ロジックは `ai-service.js` に閉じ込め、UI からは抽象化した API 経由で呼ぶ。
3. DOM セレクタはハードコードを避け、フォールバック候補を持つ。
4. 入力補完は destructive にならないよう、既存入力を上書きする前に選択的挿入を優先する。
5. 変更後は少なくとも以下を手動確認する:
   - サイドパネル起動
   - プロンプト一覧の追加・編集・削除
   - ChatGPT / Claude / Gemini への挿入動作

## Minimal Verification Checklist

- `manifest.json` の構文が妥当
- 追加権限が最小化されている
- 主要 3 サイトで致命的エラーなく動作する
- 既存のショートカット (`Ctrl+Shift+L`) が維持される
