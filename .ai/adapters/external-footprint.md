# External Footprint — リポ外に触れるものの台帳

このリポは原則として自己完結する。リポ外（ユーザーホーム等）へ書き込む/読む依存は
**ここに列挙したものだけ**を許可する。`validate.ps1` は列挙外のリポ外書き込みを検出したら警告する。
新しいリポ外依存を足すときは、必ずこの表に追記すること。

| パス | 種別 | 生成元 | 必須か | 備考 |
|------|------|--------|--------|------|
| `~/.config/dcr/config.json` | 書き込み(任意ミラー) | `deploy.ps1` (`.dcr/config.json` 由来) | 任意 | 実行時はリポ相対 `.dcr/config.json` を第一参照。本ミラーが無くても動く。`bootstrap.ps1` が冪等に再生成。 |

## 復元手順（新PC）
1. このリポ（サトシ開発）フォルダを新PCへ移す
2. `pwsh -ExecutionPolicy Bypass -File .ai/adapters/bootstrap.ps1`
