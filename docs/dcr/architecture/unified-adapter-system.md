# Unified Adapter System

このリポジトリは、正本を1か所に集約し、各ツール向けの生成物へ配布する方式を採用しています。

## Source Of Truth

- `.ai/assets/rules/`
- `.ai/assets/skills/`
- `.ai/assets/agents/`
- `templates/`

## Generated Outputs

- `.github/copilot-instructions.md`
- `AGENTS.md`
- `CLAUDE.md`
- `.claude/agents/` (local generated mirror, Git 管理外)
- `.codex/agents/` (local generated mirror, Git 管理外)

## Deployment Path

1. 正本を編集する
2. `deploy.ps1` を実行する
3. `tools/deploy-all.ps1` が各 adapter を呼び出す
4. 生成物を上書きする

## Design Rules

- 生成物は read-only とみなす
- 大量生成 mirror は Git で追跡せず、必要時に `deploy.ps1` で再生成する
- path migration は旧新両対応期間を設ける
- adapter の変更は generated file ではなく `tools/adapters/` 側で行う
