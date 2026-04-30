# Deprecation Removed Ledger

物理削除した rule / skill / agent の累積ログ。`.ai/module/deprecation-lifecycle.md` の
Stage 4（REMOVED）に進めた時に追記する。

git 履歴と異なり、本ファイルは **「いつ・なぜ・誰が」削除したか** のヒューマン読み
やすい1行サマリ。後で「あの旧名は誰が消した？」を5秒で確認できることを目的とする。

## フォーマット

| 削除日 | 種別 | 旧名 | 後継 | 経過日数 | 最終呼び出し | 削除PR | 備考 |
|---|---|---|---|---|---|---|---|

## 削除実績

<!--
新規エントリは表の下に追記。例：
| 2026-07-26 | rule | instagram-curator | content-creator | 92 | 2026-05-12 | #142 | router-decisions.jsonl で 30日0件 |
-->

（まだ削除実績はありません。Stage 4 進行時に本テーブルに追記してください）

## 関連

- ライフサイクル仕様: [.ai/module/deprecation-lifecycle.md](../.ai/module/deprecation-lifecycle.md)
- 監視ダッシュボード: `pwsh tools/deprecation-dashboard.ps1`
- 候補抽出: `pwsh tools/deprecation-dashboard.ps1 -OutputJson`
- Stage 4候補Markdown: `pwsh tools/deprecation-dashboard.ps1 -OutputMarkdown`
