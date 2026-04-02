# DCR Kernel - Codex Edition

> **GitHub Copilot CLI を使う場合**: セッション開始時に `COPILOT_CLI.md` を読み、
> 以降の応答はそのルールに従うこと。このファイルより `COPILOT_CLI.md` が優先される。

判断の優先順位: **安全 > 目的 > 速度**

## Purpose

このファイルは **Codex 固有差分のみ** を定義する。
共通ルールの正本は [.github/copilot-instructions.md](.github/copilot-instructions.md) とし、
Signal protocol / Trigger / Permission model / Gate chain の本文は重複記載しない。

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

## Codex-Specific Overrides

- `rules/*.md` は常時読み込みではなく、強一致時のみ限定ロードする。
- 役割自動選択は最大2件までに制限し、曖昧一致は直接処理を優先する。
- サブエージェント分離を原則とし、調査/実装/レビューを同一文脈に混在させない。
- 実装完了後は `validate.ps1` と `deploy.ps1 -Check` を通過確認してから完了扱いにする。

## Operational Notes

- 保守方針は「重複削減」を最優先とし、共通ルール変更時は正本のみ更新する。
- このファイルを更新するのは Codex 固有挙動の差分が増えたときに限定する。

## References

- 共通運用: `.ai/module/unified-integration.md`
- 実行ゲートの詳細: `.ai/kernel/gates/`
