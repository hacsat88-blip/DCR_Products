---
name: setup-pre-commit
routing_category: devops
description: "新規 or 既存リポジトリにローカル pre-commit ガードレール（lint / format / typecheck / test）を導入する。Husky+lint-staged、pre-commit framework、native git hooks の 3 系統からプロジェクトに合うものを選び、CI 重複と repo-specific な既存 hook（.claude/settings.json 等）と衝突しない形で設定する。"
contract:
  preconditions:
    - "対象 repo の言語・パッケージマネージャ・既存 CI 設定が把握できる"
    - "既存の hook 機構（.claude/settings.json hooks, .git/hooks, pre-commit, husky）が確認済み"
  postconditions:
    - "pre-commit 段階で format / lint / typecheck のうち少なくとも 2 つが走る"
    - "新規 hook が既存 hook（特に .claude/settings.json の PreToolUse hook）と役割重複しない（同じチェックを 2 層で走らせない）"
    - "CI 側と pre-commit 側でチェック内容が重複・矛盾していない"
  invariants:
    - "pre-commit は『速い・偽陽性が少ない・bypass しても CI で止まる』を満たす"
    - "Windows / WSL / mac / Linux で動作する shebang・スクリプトを使う"
    - "secrets スキャン・大容量ファイル禁止など、CI では遅い検査をローカルに寄せる"
composable:
  input_type: repo-state
  output_type: hook-config
  chains_with:
    - dcr-pipeline
    - changelog-automation
    - repo-boundary-hygiene
    - tdd-workflow
metadata:
  origin: mattpocock/skills
  upstream_url: "https://github.com/mattpocock/skills"
  upstream_paths:
    - "skills/engineering/setup-pre-commit/SKILL.md"
  upstream_license: "MIT"
  imported_at: "2026-05-16"
  adapted_from: "setup-pre-commit pattern; Husky-first assumption was relaxed to a 3-way selector (Husky / pre-commit framework / native hooks). Coordination with .claude/settings.json hooks is added because this repo runs validate.ps1 / deploy.ps1 via PreToolUse on git commit."
  model_neutral: true
  runtime_targets:
    - codex
    - claude
    - cursor
---

# Setup Pre-Commit

## 目的

ローカル commit 時点でフォーマット崩れ・型エラー・lint 違反・秘密情報の混入を止める。
CI に到達する前のフィードバックを 30 秒以内に返すことで、開発者の文脈切り替えを減らす。

## Natural Language Triggers

- 「pre-commit 入れて」「lint-staged 入れて」「husky セットアップ」
- 「commit 前に format / typecheck 走らせたい」
- 「新しい repo を作った」直後
- 既存 repo で「commit が CI で毎回落ちる」と言われたとき

## 重要前提：DCR repo 特有

このリポジトリは `.claude/settings.json` の PreToolUse hook で `validate.ps1` / `deploy.ps1` / `validate-commit-msg.ps1` を `Bash(git commit *)` matcher で起動している。

起動順は時系列で直列（Claude Code PreToolUse → 実 git commit → git の pre-commit/commit-msg hook → PostToolUse）なので物理的な同時起動は起きないが、**同じチェックを 2 層で走らせない＝役割重複を避ける**ことが本当の論点。役割分担は次の通り：

| レイヤ | 担当 | 既存実装 |
|---|---|---|
| catalog 検証 / gate chain | `.claude/settings.json` PreToolUse | 既存（変更不要） |
| commit message 規約 | `.claude/settings.json` PreToolUse | 既存（変更不要） |
| code format / lint / typecheck / unit test | この skill | **新規追加対象** |
| secrets scan / 大容量ファイル禁止 | この skill | **新規追加対象** |

## 3 系統の選び方

| 系統 | 採用条件 | 強み | 弱み |
|---|---|---|---|
| **Husky + lint-staged** | Node プロジェクト、`package.json` がある | エコシステム成熟、staged ファイルだけ走る | Node 依存、Windows シェル互換に注意 |
| **pre-commit framework** | 多言語、Python 混在、polyglot | 言語非依存、設定が `.pre-commit-config.yaml` 1 ファイル | Python 環境必須 |
| **native git hooks**（`core.hooksPath`） | 既に PowerShell スクリプトが揃っている、軽量に保ちたい | 外部依存ゼロ | hook の共有・更新が手動 |

DCR repo は PowerShell 中心で既に `tools/lib/` に検証スクリプトがあるため、**追加分は native git hooks + `core.hooksPath` を第一候補**にする。Next.js サブプロジェクト（autotrader UI 等）は **Husky + lint-staged をサブディレクトリで限定運用**する形が衝突しにくい。

## 手順

### Step 1: 現状調査

- `.claude/settings.json` の hooks セクションを読む（matcher / command / 重複判定）
- `.git/hooks/` に sample 以外のファイルがあるか
- `.husky/` `pre-commit` ファイル / `.pre-commit-config.yaml` が既にあるか
- 言語別の主要ツール（eslint / prettier / ruff / mypy / tsc / vitest / pytest）の有無

### Step 2: チェック内容を決める

最小セット（commit 当たり 30 秒以内）：

- フォーマット自動修正 (Prettier / ruff format)
- Lint（変更ファイルのみ）
- 型チェック（変更ファイルのみ・速いなら全体）
- secrets scan（gitleaks / detect-secrets）
- 大容量ファイル禁止（>5MB を block）

**pre-commit に入れない**：

- 全テスト（pre-push 段階へ）
- 重い integration test
- CI でしか走らせない E2E

### Step 3: 系統別セットアップ

#### A. Native git hooks + core.hooksPath（PowerShell repo 推奨）

```powershell
# .githooks/pre-commit (PowerShell wrapper)
git config core.hooksPath .githooks
```

`.githooks/pre-commit` から `pwsh tools/lib/run-pre-commit-checks.ps1` を呼ぶ構造にし、
ロジックは `tools/lib/` 側に置く（既存の `validate-commit-msg.ps1` と同階層）。

#### B. Husky + lint-staged（Node サブプロジェクト用）

```jsonc
// package.json
{
  "scripts": { "prepare": "husky install" },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{js,jsx,json,md}": ["prettier --write"]
  }
}
```

```sh
# .husky/pre-commit
npx lint-staged
npx tsc --noEmit
```

サブディレクトリ運用なら `.husky` をその repo root に置き、ルート repo の `.claude/settings.json` hook と分離する。

#### C. pre-commit framework

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: check-added-large-files
        args: ["--maxkb=5000"]
      - id: detect-private-key
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks
```

### Step 4: 役割重複の確認

- `git commit -m "test"` をドライランし、PreToolUse 層（validate.ps1 / deploy.ps1 / validate-commit-msg.ps1）と git hook 層（新規追加）が**どのチェックを担当したか判別できる**ことを確認
- 同じ lint / typecheck / secrets scan が両層で走っていないこと（重複は片方に寄せる）
- 失敗時にどちらの層が原因か判別できる exit code / message を残す

### Step 5: bypass の明文化

`--no-verify` の使用条件をリポジトリの CONTRIBUTING.md に書く（CLAUDE.md の方針: hook を skip しない、を踏襲）。

## Output

```markdown
Pre-Commit Setup
- Selected system: <native | husky | pre-commit framework>
- Reason: ...
- New checks: [...]
- Existing .claude/settings.json hooks (untouched): [...]
- Files added/changed: [...]
- Verification: git commit ドライラン結果
- Bypass policy: CONTRIBUTING.md L?? 参照
```

## 失敗モード

| 兆候 | 原因 | 対処 |
|---|---|---|
| commit が極端に遅い | 全ファイル lint / 全テスト実行 | staged ファイルのみに絞る |
| Windows でだけ落ちる | shebang / pwsh 不在 | PowerShell 経由で wrap |
| `.claude/settings.json` hook と役割重複 | 同じチェックを 2 層で実行 | 役割分担表に従って片方に寄せる |
| CI が落ち pre-commit が通る | チェック差分 | CI 設定とローカル設定を同じスクリプトから呼ぶ |

## 非目標

- 全テストを pre-commit に詰め込む
- `.claude/settings.json` の既存 hook を置き換える
- bypass を全面禁止する（壊れた hook を緊急回避する余地は残す）
