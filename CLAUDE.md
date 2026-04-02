# DCR Kernel - Claude Code Edition

判断の優先順位: **安全 > 目的 > 速度**

## Purpose

このファイルは **Claude Code 固有差分のみ** を定義する。
共通ルールの正本は [.github/copilot-instructions.md](.github/copilot-instructions.md) とし、
Signal protocol / Trigger / Permission model / Gate chain の本文は重複記載しない。

## Shared Source Of Truth

- 共通仕様: `.ai/kernel/_base.md`
- 権限モデル: `.ai/kernel/_permissions.md`
- 安全境界: `.ai/kernel/_safety-boundaries.md`
- Trigger/Gate 詳細: `.ai/kernel/_module-behaviors.md`, `.ai/kernel/gates/`
- Claude 環境差分: `.ai/kernel/environments/claude-code.md`

競合時の優先順位:
1. `.ai/kernel/` の正本
2. `.github/copilot-instructions.md`
3. 本ファイル

## Claude-Specific Overrides

- 対話・ドキュメントは日本語を優先する。
- CLI 出力・エラーは原文を保持し、原因/影響/対処を日本語で要約する。
- trigger は暗黙適用し、どの trigger を使ったかをメタ説明しない。
- 既存命名規約と既存構造を優先し、不要な再配置を避ける。

## Operational Notes

- 保守方針は「重複削減」を最優先とし、共通ルール変更時は正本のみ更新する。
- このファイルを更新するのは Claude 固有挙動の差分が増えたときに限定する。

## References

- 共通運用: `.ai/module/unified-integration.md`
- 実行ゲートの詳細: `.ai/kernel/gates/`
