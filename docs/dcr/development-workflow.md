# Development Workflow Standard

統合された開発運用標準。ローカル高速開発と品質ゲートのバランスを取ります。

## 3段階運用モデル

### 段階1: 日常開発（ローカル直接編集）
- エディタ: VS Code / Cursor / Claude Code
- 対象: 仕様が明確な機能単位、バグ修正、リファクタリング
- 範囲: 1ファイル〜複数ファイル（気軽に）
- 検証: 適宜 `validate.ps1` 実行でドリフト確認
- コミット: こまめに（履歴が読みやすく）
- プッシュ: まだしない（ローカル保持）
- 速度重視

### 段階2: 小PR化（1〜2日単位）
- タイミング: 機能完成 OR 1〜2日経過時点
- ブランチ: `feature/` で切ってコミット  
- PR作成前チェック:  
  - `validate.ps1` 実行 → 226 passed, 0 failed  
  - `npm test` 実行（存在する場合）→ 全テスト PASS  
  - PRテンプレの「Pre-Review」項目をすべてチェック

```bash
# 例: PR前の必須検証
powershell -ExecutionPolicy Bypass -File .\validate.ps1
npm test  # or equivalent
```

- PR本文: テンプレ必須項目を埋める（背景・変更内容・テスト結果）
- レビュアー: 指定（明示的に）
- 目標: コンテキストが残る、分割責任が分散される

### 段階3: リリース前（自動安全確認）
- トリガー: main へのマージ直前
- ゲート: GitHub Actions で validate.ps1 + npm test 実行
- チェック項目:  
  - ✅ validate.ps1 226 passed, 0 failed
  - ✅ npm test 全 PASS
  - ✅ PR本体が approved（最低1名）
- 結果: CI成功 → main マージ可能  
  CI失敗 → マージブロック + 修正コミット必須

## PR化のサイズ判定基準

| タイミング | ファイル数 | 規模 | 例 |
|----------|----------|------|-----|
| 今すぐPR | 1-2 | < 100行 | バグ修正、単一メッセージ更新 |
| 1日程度で| 2-5 | 100-500行 | 新機能の初期実装、モジュール追加 |
| 2日かけて | 5+ | 500-2000行 | アーキテクチャ変更、複数機能同時 |
| 3日超 | 大規模 | 2000行超 | 再分割推奨（PRが巨大 = レビュー困難） |

## 必須チェックリスト

### PR作成前
- [ ] ローカルでコミット済み（`git log` で確認）
- [ ] `validate.ps1` 実行 → 結果をPRに記載
- [ ] `npm test` 実行（存在する場合）→ 結果をPRに記載
- [ ] ブランチ名が `feature/...` または `fix/...`
- [ ] `.cursor/rules/` 生成ミラーは含めない（deploy後で十分）

### PR本文
- [ ] 背景: Why? を明記
- [ ] 変更内容: What? を明記
- [ ] テスト観点: 何をテストしたか
- [ ] 依存関係: 他PRやIssue番号をリンク
- [ ] validate.ps1 / npm test 結果をコピペ

### マージ前
- [ ] Approveが最低1名
- [ ] CI/CD全て PASS
- [ ] コンフリクト解決済み

## ローカル開発ワークフロー（日常系）

```bash
# 1. 新機能ブランチ切る
git checkout -b feature/my-feature

# 2. 普通に開発
# エディタで編集、コミット、編集、コミット...

# 3. こまめに validate
validate.ps1
npm test

# 4. 1〜2日後、またはキリがついたら
git log --oneline  # 確認
git push origin feature/my-feature  # リモートに上げる

# 5. GitHub でPR作成
# （テンプレ従って）
```

## Issue → Copilot Agent → PR → CI の自動化フロー

より大型の案件（基本的には多人数・監査性重視）では次のオプション運用があります。

1. Issue作成: 背景・スコープ・受け入れ条件を明記
2. Copilot Agent に割り当て: `/assign-copilot-to-issue <issue-url>`
3. Agent が自動でブランチ・PR作成  
4. CI 失敗→自動修正ループ  
5. CI成功 → 自動マージ（設定に応じて）

使用タイミング:
- 要件が確実に明確化されているとき
- 複数人並列開発
- 本番デプロイ前の品質保証が必須

詳細は `CLAUDE.md` の `autopilot:` / `ralph:` mode を参照。

## Branch Protection Rules（推奨設定）

GitHub Settings → Branches → main に以下を設定:

1. **Require a pull request before merging**
   - Dismiss stale pull request approvals: ON
   - Request review from code owners: ON（`.github/CODEOWNERS` 設定時）

2. **Require status checks to pass before merging**
   - Require branches to be up to date before merging: ON
   - Require passing status checks:
     - validate.ps1（Workflow: Validate）
     - npm test（Workflow: Test）

3. **Include administrators**: OFF（柔軟性重視）

## Commit Message Style（参考: Conventional Commits）

```
type(scope): subject

body

footer
```

例:
```
feat(prd-to-issues): add vertical slice decomposition

- Add ability to break PRD into independent issues
- Include acceptance criteria template
- Add dependency tracking

Closes #123
```

## Tips

### 小PRを書く習慣をつけるコツ
- 1PRで1責務を目安に
- 「このPRで何が変わった？」が一言で言えるサイズ
- テストが1つのPRで完結できるサイズ

### テンプレを無視しないコツ
- PRテンプレは「品質チェック表」と同義
- 埋めるのに5分: 後で読み返すのに5時間節約できる
- 新しく参加した人の学習材料にもなる

### CI結果を信じるコツ
- validate/test が赤になったら、理由をIssueに記録する
- 「なぜ失敗したか」の履歴は技術的負債の可視化
- 同じエラーが繰り返されたら設計検討

## FAQ

**Q: リリース前に大量のPRをマージしたい。小PR化は厳しい。**  
A: マージ前の最終validate と test は必須。ただし粒度は調整可。「1日ごと」を「半日ごと」に詰めるのはOK。

**Q: Copilot Agentを使うべき？**  
A: 日常開発はローカル直接（速い）。Issue明確化 + 複数人 + 監査必須 = Agent委任。

**Q: validate.ps1 が失敗したらPRは出さない？**  
A: 出さない。validate 失敗 = 設定ドリフト。本番も失敗するので修正してからPR。

**Q: main 保護ルール厳しくない？**  
A: 厳しい ≠ 遅い。1〜2日単位のPR＋CI自動実行なら全体で数時間なので実用的。
