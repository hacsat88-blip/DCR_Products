# Unified Integration Module

このモジュールは、VS Code の GitHub Copilot、GitHub Copilot CLI、Claude Code の
3環境で同じ運用を再現するための共通仕様です。

## 目的

- 環境差分で運用品質がぶれないようにする
- gstack 的な「計画 → 実装 → レビュー → QA → 出荷」の流れを共通化する
- 既存の rules/skills を活かし、全面置換ではなく統合で進める

## Common Flow

1. `p/` Plan Gate
   - `skills/writing-plans` を優先
   - 3ステップ以上は計画を明示してから実装
2. 実装
   - 既存の skill と rules の優先順位に従う
3. `a/` Review Gate
   - 既存 review/debug ルールを適用
4. `q/` QA Gate
   - `skills/webapp-testing` を優先
   - 画面検証は証跡を残す
5. `sh/` Ship Gate
   - `skills/verification-before-completion` と
     `skills/finishing-a-development-branch` を優先

## Canonical Priority

1. ユーザーの明示要求
2. skills
3. rules
4. 直接処理

## Notes

- Copilot CLI は `COPILOT_CLI.md` を優先
- VS Code Copilot は `.github/copilot-instructions.md` を優先
- Claude Code は `CLAUDE.md` を優先
- ただし、上記3つはこのモジュールを共通参照し、差分を最小化する
