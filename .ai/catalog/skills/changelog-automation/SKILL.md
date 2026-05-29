---
name: changelog-automation
routing_category: devops
description: "CHANGELOG自動化：Conventional Commits・semantic-release・バージョニング戦略・GitHub Release自動作成"
disable-model-invocation: true
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
  - windsurf
  - opencode
  - gemini-cli
---

# Changelog Automation

## 基本原則

- CHANGELOGはコードと同期して自動生成する（手動更新は漏れる）
- コミットメッセージの規約がCHANGELOG品質を決める
- セマンティックバージョニングは機械的に決定できる

## Conventional Commits 仕様

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

| type | バージョン影響 | 意味 |
|------|-------------|------|
| `feat` | Minor UP | 新機能 |
| `fix` | Patch UP | バグ修正 |
| `perf` | Patch UP | パフォーマンス改善 |
| `refactor` | なし | リファクタリング |
| `docs` | なし | ドキュメントのみ |
| `test` | なし | テストのみ |
| `chore` | なし | ビルド・依存更新 |
| `BREAKING CHANGE` | Major UP | 破壊的変更 |

```bash
# 例
git commit -m "feat(auth): OAuth2 PKCE フローを追加"
git commit -m "fix(api): レート制限の計算式を修正"
git commit -m "feat!: v2 API エンドポイントに移行

BREAKING CHANGE: /v1/ エンドポイントを削除"
```

## semantic-release 設定

```json
// .releaserc.json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    ["@semantic-release/changelog", {
      "changelogFile": "CHANGELOG.md"
    }],
    "@semantic-release/npm",
    ["@semantic-release/github", {
      "assets": ["dist/*.zip"]
    }],
    "@semantic-release/git"
  ]
}
```

## GitHub Actions CI 設定

```yaml
name: Release
on:
  push:
    branches: [main]
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx semantic-release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## CHANGELOG.md 生成ルール

```markdown
# Changelog

## [2.1.0] - 2024-01-15

### Features
- **auth**: OAuth2 PKCE フローを追加 ([#123](link))

### Bug Fixes
- **api**: レート制限の計算式を修正 ([#124](link))

## [2.0.0] - 2024-01-01

### ⚠ BREAKING CHANGES
- v1 APIエンドポイントを削除
```

## コミット規約の強制

```bash
# commitlint でコミットメッセージを検証
npm install --save-dev @commitlint/{cli,config-conventional}
echo "module.exports = {extends: ['@commitlint/config-conventional']}" > commitlint.config.js

# husky でコミット時に自動チェック
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit ${1}'
```
