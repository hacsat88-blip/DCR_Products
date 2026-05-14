---
name: tech-stack-guide
description: "サトシ開発（DCR）プロジェクトの技術スタック別ガイド。PowerShell 5.1/7、Next.js/React、Python、TOML/YAML/JSON設定管理、MCP連携について、ベストプラクティスと注意点を提供する。Use when working with the サトシ開発 tech stack or when onboarding to the project."
---

# Tech Stack Guide Skill

サトシ開発（DCR）プロジェクトの技術スタック別ガイド。

## 1. PowerShell（5.1 / 7）

### 使用場面
- DCRデプロイメント（`deploy.ps1`, `validate.ps1`, `init-project.ps1`）
- フックシステム（`.cursor/hooks/`, `.devin/hooks/`）
- Windows環境での自動化

### ベストプラクティス
- **5.1互換性**: プロジェクトのデフォルトは PowerShell 5.1
- **7での拡張**: 個人環境では PowerShell 7 を推奨
- **エラーハンドリング**: `$ErrorActionPreference = 'Stop'` を明示
- **文字コード**: UTF-8 BOM を使用（日本語対応）
- **パス**: 日本語パスを含む場合は `-LiteralPath` を使用

### よくある問題
- `&&` は PowerShell 5.1 で未サポート → `; if ($?) { ... }` を使用
- `ls` はエイリアス → `Get-ChildItem` を推奨
- 文字化け → `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8`

### 関連スキル
- `powershell-5.1-expert` / `powershell-7-expert` (DCRエージェント)

## 2. Next.js / React

### 使用場面
- `Product/autotrader/ui/` - 自動取引UI
- フロントエンド全般

### ベストプラクティス
- **App Router** を使用（Pages Routerは非推奨）
- **Server Components** をデフォルトとし、Client Componentsは `use client` で明示
- **TypeScript** 必須（`strict: true`）
- **Tailwind CSS** を使用（UI-UX統一）
- **React Server Components** でデータフェッチ

### ディレクトリ構造
```
ui/
├── app/           # App Router
│   ├── page.tsx   # ルートページ
│   ├── layout.tsx # ルートレイアウト
│   └── api/       # Route Handlers
├── components/    # 再利用可能コンポーネント
├── lib/           # ユーティリティ
└── types/         # 型定義
```

### 関連スキル
- `nextjs-developer` / `react-specialist` (DCRエージェント)
- `ui-ux-pro-max` (DCRスキル)

## 3. Python

### 使用場面
- `Product/autotrader/` - 自動取引バックエンド
- `tools/mcp-servers/opencode-bridge/` - MCPブリッジ
- スキル自動化スクリプト

### ベストプラクティス
- **バージョン**: 3.11+ を推奨
- **型ヒント**: 必須（`mypy` でチェック）
- **仮想環境**: `venv` または `poetry` を使用
- **リンター**: `ruff` または `black`
- **テスト**: `pytest`（カバレッジ80%+）

### 依存管理
```bash
# requirements.txt の更新
pip freeze > requirements.txt

# 新規パッケージ追加
pip install [package]
pip freeze > requirements.txt
```

### 関連スキル
- `python-pro` / `django-developer` (DCRエージェント)
- `tdd-workflow` (DCRスキル)

## 4. 設定ファイル管理（TOML / YAML / JSON）

### TOML
- **用途**: エージェントメタデータ（`.toml`）
- **ツール**: `toml` ライブラリ（Python）
- **注意**: コメントは `#`、セクションは `[section]`

### YAML
- **用途**: DCRレジストリ（`registry.yaml`, `compositions.yaml`）
- **ツール**: `PyYAML`（Python）、`js-yaml`（Node.js）
- **注意**: インデントはスペース2個、タブ禁止

### JSON
- **用途**: スキーマ（`gate-state.schema.json`）、設定（`opencode.json`）
- **ツール**: ビルトイン（Python `json`、Node.js `JSON.parse`）
- **注意**: 末尾カンマ禁止（strict JSON）、コメント不可
- **JSONC**: `opencode.jsonc` ではコメント可（OpenCode対応）

### 関連スキル
- `database-schema-design` (DCRスキル)

## 5. MCP（Model Context Protocol）

### 使用場面
- `.mcp.json` - GitHub MCP、Supermemory MCP
- `tools/mcp-servers/` - カスタムMCPサーバー

### ベストプラクティス
- **Local MCP**: `type: "local"`、`command` は配列
- **Remote MCP**: `type: "remote"`、OAuth設定
- **タイムアウト**: デフォルト5000ms、必要に応じて延長
- **環境変数**: `env` で渡す（シークレットは直接記述禁止）

### 設定例
```json
{
  "mcp": {
    "github": {
      "type": "local",
      "command": ["npx", "-y", "@github/mcp-server"],
      "enabled": true
    },
    "supermemory": {
      "type": "remote",
      "url": "https://api.supermemory.ai/mcp",
      "headers": {
        "Authorization": "Bearer ${SUPERMEMORY_TOKEN}"
      }
    }
  }
}
```

### 関連スキル
- `mcp-builder` (DCRスキル)

## 6. マークダウンベース設定管理

### DCRの哲学
- **正本（Source of Truth）**: `.ai/` ディレクトリ
- **生成物（Generated）**: ルートの `AGENTS.md`, `CLAUDE.md` 等
- **分離原則**: 正本を直接編集し、生成物は `deploy.ps1` で自動生成

### 編集ルール
1. `.ai/` 内のファイルを編集
2. `deploy.ps1` を実行して生成物を更新
3. 生成物を手動編集すると次回デプロイで上書きされる

### 関連スキル
- `dcr-pipeline` (DCRスキル)
- `repo-boundary-hygiene` (DCRスキル)

## 統合

- `.ai/catalog/rules/_python-standards.md`
- `.ai/catalog/rules/_typescript-standards.md`
- `.ai/catalog/rules/_testing-standards.md`
- `.ai/catalog/rules/_NAMING_CONVENTION.md`
