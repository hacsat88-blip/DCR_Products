---
name: eval-harness
routing_category: governance
description: "DCR リポジトリの構造品質を validate.ps1 で機械的に検証する Eval Harness スキル。q/ ゲートで validate.ps1 を実行し、rules/skills の frontmatter・H1・body・deploy整合を確認する。Use during q/ QA gate, before ship gate, or to verify structural integrity of rules and skills."
metadata:
  origin: ECC eval-harness (adapted for DCR)
---

# Eval Harness — 構造品質の継続検証

## 目的

`validate.ps1` を q/ ゲートの標準検証ステップとして組み込み、
rules/*.md と skills/*/SKILL.md の構造品質を機械的に保証する。

## いつ使うか

- q/ ゲートの実行時（実装完了後の品質確認）
- sh/ ゲート前の最終確認
- rules または skills に変更を加えたとき
- deploy.ps1 の動作確認が必要なとき

## 検証スコープ

| 検証項目 | 対象 | 合格条件 |
|---------|-----|--------|
| H1 見出し存在 | `rules/*.md`（`_*` 除外） | `# タイトル` 形式で1行以上 |
| frontmatter `name:` | `skills/*/SKILL.md` | `name: <値>` が存在 |
| frontmatter `description:` | `skills/*/SKILL.md` | `description: <値>` が存在 |
| body 非空 | `skills/*/SKILL.md` | frontmatter 以降に内容あり |
| deploy DryRun | 全ターゲット (vscode/cursor/windsurf/agents/dcr) | exit 0 |

## q/ ゲートでの使い方

```powershell
# 基本実行（PASS/FAIL サマリーのみ）
powershell -ExecutionPolicy Bypass -File .\validate.ps1

# 詳細出力（各ファイルの [OK] / [FAIL] を表示）
powershell -ExecutionPolicy Bypass -File .\validate.ps1 -Verbose
```

### 結果の解釈

```
RESULT: 420 passed, 0 failed   → 🟢 q/ 通過。sh/ へ進む
RESULT: 415 passed, 5 failed   → 🔴 ブロッカーあり。FAILURES リストを修正して再実行
```

## ECC eval との対応

| ECC eval 概念 | DCR 実装 |
|---|---|
| Capability evals | frontmatter / H1 / body チェック |
| Regression evals | deploy.ps1 -DryRun 全ターゲット |
| pass@3 > 90% | 全項目 [OK] でのみ exit 0 |
| `/eval report` | validate.ps1 の標準出力 |
| `.claude/evals/*.md` | validate.ps1 内に検証ルール統合 |

## よくある FAIL と修正

| FAIL メッセージ | 原因 | 修正 |
|---------------|-----|-----|
| `xxx.md — H1 missing` | rules ファイルに `# タイトル` がない | ファイル冒頭に H1 を追加 |
| `yyy/SKILL.md — 'name:' missing` | frontmatter に name フィールドがない | `---` ブロックに `name: xxx` を追記 |
| `yyy/SKILL.md — body empty` | frontmatter だけでコンテンツがない | Skill の本文を追加 |
| `deploy -Target xxx — exit 1` | deploy 設定に問題あり | `deploy.ps1 -DryRun -Target xxx` を単体実行して原因を確認 |

## deploy.ps1 との関係

`validate.ps1` は `deploy.ps1` の**事前品質確認**として機能する。
- validate → 全 OK → deploy → 配布
- validate で FAIL がある場合は deploy 前に修正する

## 自動化の未来

CI/CD（GitHub Actions 等）に組み込む場合:

```yaml
- name: Validate DCR structure
  run: pwsh -ExecutionPolicy Bypass -File ./validate.ps1

- name: Validate routing accuracy
  run: pwsh -ExecutionPolicy Bypass -File ./tools/eval-routing-accuracy.ps1
```

exit 1 をそのまま CI 失敗として扱える。

## ルーティング精度測定（routing accuracy eval）

`tools/eval-routing-accuracy.ps1` で **静的に** ルーティングの正しさを検証する。
LLM 不要、frontmatter とフィクスチャを突き合わせる：

```powershell
.\tools\eval-routing-accuracy.ps1
.\tools\eval-routing-accuracy.ps1 -Verbose   # per-case 表示
.\tools\eval-routing-accuracy.ps1 -FixturePath custom-fixtures.json
```

**フィクスチャ形式**（`tools/eval-routing-fixtures.json`）：

```json
{
  "input": "ユーザー想定発話",
  "kind": "rule | skill | agent",
  "expected": "<採用される asset 名>",
  "expected_alias_from": "<旧名（任意、Step 0 経路をテストする場合）>",
  "match_keywords": ["frontmatter に存在すべき語"]
}
```

**検証項目**：
1. **存在**: expected の asset ファイルがある
2. **非 deprecation**: expected 自身は deprecated でない（alias テスト除く）
3. **alias 整合**: `expected_alias_from` 指定時、その asset が deprecated で
   かつ successor が expected と一致
4. **キーワードマッチ**: match_keywords の少なくとも1つが
   description / keywords / domain / routing_category のいずれかに含まれる

**目標精度**: 80%以上（プラン目標）。現状: 26/26 = 100% で達成済み。

**fixture 追加方針**：
- 新スキル/エージェント追加時、想定ユーザー発話を1件追加
- deprecation 実施時、旧名 → 新名の alias 経路を1件追加
- 曖昧入力（confidence < 0.8 想定）も意図的に含める
  （その場合は `expected_alias_from` は省略）
