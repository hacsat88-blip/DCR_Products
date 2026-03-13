---
name: strategic-compact
description: Suggests manual context compaction at logical intervals to preserve context through task phases rather than arbitrary auto-compaction.
origin: ECC (adapted for DCR)
---

# Strategic Compact — 論理的な区切りでコンテキストを整理する

長いセッションで auto-compact に頼るのではなく、論理的な区切りで
手動 `/compact` を提案するスキル。

## いつ使うか

- 長いセッションでコンテキスト上限に近づいているとき
- マルチフェーズ作業（調査 → 計画 → 実装 → テスト）
- 同一セッション内で無関係なタスクに切り替えるとき
- 応答が遅くなる・一貫性が低下するとき

## なぜ auto-compact に頼らないか

Auto-compaction の問題:
- タスク途中の任意のタイミングで発動し、重要なコンテキストが失われる
- 論理的なタスク境界を認識しない
- 複雑なマルチステップ操作を中断する可能性がある

## Compact 判断ガイド

| フェーズ遷移 | Compact? | 理由 |
|-------------|----------|------|
| 調査 → 計画 | ✅ Yes | 調査コンテキストは重い。計画が要約 |
| 計画 → 実装 | ✅ Yes | 計画はファイル/TODO に書き出し済み |
| 実装 → テスト | 🟡 Maybe | テストが直近コードを参照するなら保持 |
| デバッグ → 次の機能 | ✅ Yes | デバッグ痕跡が無関係な作業を汚染する |
| 実装の途中 | ❌ No | 変数名・ファイルパス・部分状態を失うコスト大 |
| 失敗アプローチの後 | ✅ Yes | 行き止まりの推論をクリアしてから再挑戦 |

## Compact 後に残るもの

| 残る | 失われる |
|------|---------|
| CLAUDE.md / 設定ファイル | 中間的な推論・分析 |
| TodoWrite タスクリスト | 以前読んだファイル内容 |
| Memory ファイル | マルチステップの会話コンテキスト |
| Git 状態 | ツール呼び出し履歴 |
| ディスク上のファイル | 口頭で述べたニュアンス |

## ベストプラクティス

1. **計画完了後に Compact** — TodoWrite に計画を確定してから
2. **デバッグ完了後に Compact** — エラー解決コンテキストをクリア
3. **実装途中は Compact しない** — 関連変更のコンテキストを保持
4. **Compact 前に書き出す** — 重要なコンテキストをファイルやメモリに保存
5. **サマリー付きで Compact** — `/compact 次は認証ミドルウェアの実装に集中`

## DCR との統合

- Copilot CLI: `COPILOT_CLI.md` の session-state / plan.md と併用
- VS Code Copilot: 長いチャットセッションでの意識的な区切り
- 全般: DCR の `s/` トリガーで戦略的な区切りを判断
