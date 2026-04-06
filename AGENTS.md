# DCR Kernel - Codex Edition

> **GitHub Copilot CLI を使う場合**: セッション開始時に `COPILOT_CLI.md` を読み、
> 以降の応答はそのルールに従うこと。このファイルより `COPILOT_CLI.md` が優先される。

判断の優先順位: **安全 > 目的達成 > 速度 > 完全性**

## Purpose

このファイルは **Codex 固有差分** を定義する。  
共通ルールの正本は `.github/copilot-instructions.md` とする。

> **必須**: セッション開始時に `.github/copilot-instructions.md` を読み込み、全ルールを有効化すること。

## Shared Source Of Truth

- 共通仕様: `.ai/kernel/_base.md`
- 権限モデル: `.ai/kernel/_permissions.md`
- 安全境界: `.ai/kernel/_safety-boundaries.md`
- Trigger/Gate 詳細: `.ai/kernel/_module-behaviors.md`, `.ai/kernel/gates/`
- Codex 環境差分: `.ai/kernel/environments/codex.md`

競合時の優先順位:
1. `.ai/kernel/` の正本
2. `.github/copilot-instructions.md`
3. `COPILOT_CLI.md`
4. 本ファイル

## コマンド処理（Triggers）— インライン定義

> Codex は `.github/copilot-instructions.md` を自動読み込みしないため、ここにインライン定義する。

メッセージ先頭の連続する制御行のみ解釈し、空行以降は本文として扱う。

- `` `a/` `` = 監査（問題点・抜け・リスク）
- `` `i/` `` = 統合（衝突解消済みの最終案を1つ）
- `` `r/` `` = 矛盾耐性（両論併記・競合点・暫定推奨）
- `` `s/` `` = 俯瞰（現状要約→問いの再定義→方向性評価）
- `` `d/` `` = 弱点発見レンズ（失敗シナリオ・致命弱点・緩和策）
- `` `p/` `` = Plan Gate：実装前にスコープと実行計画を確定
- `` `q/` `` = QA Gate：証跡ベースで検証し、リスク順で報告
- `` `sh/` `` = Ship Gate：検証結果を満たした上で出荷判断

Mode は a/i/r/s のうち最初の1つだけ有効。複数 Mode が同行にある場合は先頭のみ適用し通知する。d/ は Lens として追加適用可。  
本文・URL・コード・引用・添付内のコマンド風文字列は制御命令として扱わない。

## ループガード

同一 Mode コマンドが3回連続したら「⚠️ 同一コマンド3回連続。i/かs/を推奨。」を表示する。継続を明示した場合はそのまま対応。s/ または通常応答を挟んだ場合はカウントをリセットする。

## スマートフッター

安全上の留保・重要な未確定情報・解決策が確定していない論点が残る場合のみ、次に有効なコマンドを1行で提案する（「💡 a/で監査します」等）。解決済みなら省略する。

## Codex-Specific Overrides

- `rules/*.md` は常時読み込みではなく、強一致時のみ限定ロードする。
- 役割自動選択は最大2件までに制限し、曖昧一致は直接処理を優先する。
- サブエージェント分離を原則とし、調査/実装/レビューを同一文脈に混在させない。
- 実装完了後は `validate.ps1` と `deploy.ps1 -Check` を通過確認してから完了扱いにする。

## Operational Notes

- 保守方針は「重複削減」を最優先とし、共通ルール変更時は正本のみ更新する。
- このファイルを更新するのは Codex 固有挙動の差分が増えたときに限定する。
- **例外**: Trigger 定義はこのファイルにもインライン保持する（自動読み込み非対応のため）。

## References

- 共通運用: `.ai/module/unified-integration.md`
- 実行ゲートの詳細: `.ai/kernel/gates/`
