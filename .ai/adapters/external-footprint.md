# External Footprint — リポ外に触れるものの台帳

このリポは原則として自己完結する。リポ外（ユーザーホーム等）へ書き込む/読む依存は
**ここに列挙したものだけ**を許可する。Mac triad の deploy / validate は現在、
リポ外へ書き込まない。新しいリポ外依存を足すときは、必ずここに追記する。

## 復元手順（新PC）
1. GitHub の正本を clone する
2. `pwsh -ExecutionPolicy Bypass -File ./deploy.ps1 -Check` を実行する
3. 必要な場合だけ `pwsh -ExecutionPolicy Bypass -File ./deploy.ps1` で mirror を再生成する
