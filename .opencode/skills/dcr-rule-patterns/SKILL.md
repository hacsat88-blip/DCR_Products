---
name: dcr-rule-patterns
description: "DCR（サトシ開発）の既存71ルール・134スキルを効率的に活用するための索引・検索・推奨マッピングSkill。routing_category別検索、ユースケース別推奨スキルマッピング、frontmatter必須項目チェックリストを提供する。Use when you need to find or apply existing DCR rules/skills, or when auditing DCR structure."
---

# DCR Rule Patterns Skill

DCR（サトシ開発）の既存71ルール・134スキルを効率的に活用するための索引・検索・推奨マッピングを提供する。

## 検索方法

### 1. Routing Category 別検索

| Category | ルール数 | 主なルール | 主なスキル |
|---|---|---|---|
| governance | 9 | agentic-identity-trust-architect, security-engineer, repo-boundary-steward | dcr-pipeline, eval-harness, security-scan |
| development | 8 | ai-engineer, backend-architect, frontend-developer | tdd-workflow, systematic-debugging, static-analysis |
| growth | 8 | growth-hacker, seo-specialist, content-creator | seo-audit, programmatic-seo, ad-creative |
| ux-ui | 7 | ux-architect, ui-designer, visual-storyteller | ui-ux-pro-max, japanese-ux-patterns |
| standards | 6 | _coding-standards, _git-conventions, _testing-standards | - |

### 2. ユースケース別推奨スキルマッピング

#### 実装タスク開始時
1. `satoshi-dev-flow` - Pipeline管理
2. `decision-complete-planning` - 計画の曖昧さ解消
3. `tdd-workflow` - テストファースト開発
4. `model-route` - モデル階層決定

#### コードレビュー時
1. `dcr-code-reviewer` (OpenCodeエージェント) - 品質レビュー
2. `security-scan` - セキュリティ監査
3. `static-analysis` - 構造分析

#### リリース準備時
1. `dcr-pipeline` - ゲート連鎖
2. `eval-harness` - 構造品質検証
3. `harness-audit` - Harness健全性監査
4. `security-scan` - セキュリティ最終確認

#### トラブルシューティング時
1. `systematic-debugging` - 体系的デバッグ
2. `context-degradation` - 文脈劣化診断
3. `agent-overload-recovery` - エージェント過多回復

#### ドキュメント作成時
1. `doc-coauthoring` - 共同執筆ワークフロー
2. `docs-update` - ドキュメント同期
3. `product-marketing-context` - マーケティング文脈

### 3. Frontmatter 必須項目チェックリスト

#### ルール（.ai/catalog/rules/）
- [ ] Frontmatter に `name` がある
- [ ] Frontmatter に `description` がある
- [ ] H1 ヘッダーが存在する
- [ ] Body に具体的な指示・制約がある
- [ ] `_` プレフィックスのメタルールは `_ROUTING_INDEX.md` に登録されている

#### スキル（.ai/catalog/skills/）
- [ ] Frontmatter に `name` がある
- [ ] Frontmatter に `description` がある
- [ ] `name` はフォルダ名と一致する
- [ ] `description` は 1-1024文字
- [ ] 命名規則: 小文字英数字・ハイフンのみ
- [ ] `SKILL.md` は正確にこの名前

#### エージェント（.ai/catalog/agents-source/）
- [ ] `.toml` と `.md` のペアが存在する
- [ ] Frontmatter に `name` がある
- [ ] Frontmatter に `description` がある
- [ ] Prompt に具体的な役割・制約・出力形式がある

## 活用パターン

### パターン1: タスク受領時のスキル選定
```
1. タスクの意図・領域・リスク・フェーズを分類
2. 本Skillで該当カテゴリのルール/スキルを検索
3. `skill` ツールで該当スキルをロード
4. 必要に応じてエージェントを `@mention` で呼び出し
```

### パターン2: DCR構造監査時
```
1. `dcr-rule-auditor` エージェントを呼び出し
2. Frontmatter必須項目チェックリストを使用
3. validate.ps1 で機械的検証
4. 手動で品質チェック
```

### パターン3: 新規ルール/スキル作成時
```
1. 既存の類似ルール/スキルを検索（重複回避）
2. Frontmatter必須項目チェックリストで品質確認
3. _ROUTING_INDEX.md に登録
4. validate.ps1 で検証
```

## 統合

- `.ai/catalog/rules/_ROUTING_INDEX.md` - ルール索引
- `.ai/catalog/rules/_METADATA.md` - メタデータ標準
- `.ai/kernel/README.md` - カーネル哲学
- `validate.ps1` - 構造検証スクリプト
