---
name: workflow-audit
description: Run the audit workflow from Devin CLI or Devin Local.
---

# workflow-audit

This Devin skill mirrors the legacy workflow from `.claude\commands\audit.md`.

# /audit — システム健全性監査

Claude Code システム全体の健全性をチェックします。

## 実行内容

以下を検証してレポートを出力します:

1. **gate-state.json 整合性** — ゲートチェーンの状態が有効か
2. **フックカバレッジ** — 必要なフックスクリプトが全て存在するか
3. **メモリDB健全性** — mem_cli.py と mem.db が正常か
4. **ルーティングインデックス鮮度** — _ROUTING_INDEX.md が最新か
5. **カーネルルール完備** — 必須の _*.md ファイルが揃っているか
6. **deploy.ps1 実装確認** — -EnforceGate が実装済みか
7. **ノイズフック検出** — 不要な echo フックが残っていないか

## 実行方法

```
powershell -File tools/audit-system.ps1
```

問題が見つかった場合: `powershell -File tools/audit-system.ps1 -Fix`

## 推奨実行タイミング

- 週次メンテナンス時
- 大きなリファクタリング後
- 新しいルール・スキルを追加した後
- システムの挙動に違和感を感じた時

$ARGUMENTS
