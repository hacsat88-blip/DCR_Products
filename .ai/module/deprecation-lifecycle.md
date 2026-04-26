# Deprecation Lifecycle — alias 物理削除の判断基準

deprecated とマークした rule / skill / agent を **いつ・どう物理削除するか** の正本。

## 4ステージ・モデル

```
Stage 1: ACTIVE                     # 現役、後継なし
   ↓ deprecation 決定
Stage 2: DEPRECATED-VISIBLE          # frontmatter で deprecated:true、CLAUDE.md/AGENTS.md の Aliases に表示
   ↓ 90日 + 0呼び出し （or 180日 + 任意）
Stage 3: DEPRECATED-HIDDEN           # アダプタ生成からスキップ済（既に実装済）
   ↓ 物理削除条件達成
Stage 4: REMOVED                     # ファイル削除、git 履歴のみ残る
```

## Stage 2 → Stage 3 の判断（既に自動）

`deprecated: true` フロントマターを付けた時点で：
- ✅ cursor.ps1 が生成からスキップ
- ✅ CLAUDE.md / AGENTS.md は `Deprecated Aliases` セクションに表示（active list には出ない）
- ✅ pied-piper Step 0 が successor へ自動置換

これは **Phase 4** で完了済み。新規 deprecation も自動的にこの状態になる。

## Stage 3 → Stage 4 の物理削除条件（**全て満たす必要あり**）

| 条件 | 計測方法 | 閾値 |
|---|---|---|
| ① **deprecation 経過時間** | git log でフロントマター追加コミットを確認 | **90日以上** |
| ② **alias 呼び出しゼロ** | `Get-RouterDecisionStats` の `deprecated_calls_by_oldname` | **直近30日 0回** |
| ③ **外部依存ゼロ** | grep で旧名参照を全リポジトリ・ドキュメントから検索 | **マッチ0件**（コミットメッセージ・履歴除く） |
| ④ **後継が安定運用中** | successor も deprecated でない、変更頻度が落ち着いている | 過去30日でメジャー改訂なし |
| ⑤ **削除責任者の承認** | repo-boundary-steward rule 参照、PR ベース | 1人以上の human approval |

## 短縮ルート（強い緊急性がある場合）

以下のいずれかなら 90日待たずに削除可：
- 名前衝突で重大バグを誘発
- セキュリティ脆弱性が deprecated 側にあり、後継だけ修正済み
- ライセンス・法的要請による即時削除

ただし上記 ②③④⑤ は**必ず満たす**こと。

## 削除手順

```powershell
# 1. 削除候補の確認
. .\tools\lib\gate-state.ps1
$stats = Get-RouterDecisionStats -RepoRoot .
$stats.deprecated_calls_by_oldname  # → 削除候補は count=0 か候補

# 2. 外部参照のスキャン
$oldName = "instagram-curator"
Get-ChildItem -Recurse -Include *.md,*.ps1,*.json,*.toml -Exclude '.git' |
  Select-String -Pattern $oldName -List

# 3. ファイル削除（rules / skills / agents）
Remove-Item ".ai/catalog/rules/$oldName.md" -Force
# skills の場合: Remove-Item ".ai/catalog/skills/$oldName" -Recurse -Force
# agents の場合: Remove-Item ".ai/catalog/agents-source/$oldName.md" -Force
#                Remove-Item ".ai/catalog/agents-source/$oldName.toml" -Force

# 4. 再生成
. .\tools\generate-routing-index.ps1
. .\deploy.ps1 -DryRun

# 5. eval-routing-accuracy.ps1 を実行し、当該 alias fixture を削除
. .\tools\eval-routing-accuracy.ps1
# fixtures.json から expected_alias_from: $oldName のエントリを削除

# 6. PR 作成、repo-boundary-steward rule に従う
```

## 累積削除実績の追跡

`docs/deprecation-removed.md`（運用ファイル）に削除日・旧名・後継・削除PR を記録：

```markdown
| 削除日 | 旧名 | 後継 | 経過日数 | 最終呼び出し | 削除PR |
|---|---|---|---|---|---|
| 2026-07-26 | instagram-curator | content-creator | 92 | 2026-05-12 | #142 |
```

これにより削除サイクルの統計が累積し、今後の deprecation 運用の参考になる。

## ロールバック手順

万一削除後に「やっぱり必要だった」となった場合：

```bash
git log --all -- .ai/catalog/rules/instagram-curator.md
git checkout <last-commit-hash>^ -- .ai/catalog/rules/instagram-curator.md
```

履歴は永続的に git に残るため、ファイル復活は常に可能。
ただし復活時は `deprecated: true` を必ず再付与すること（active と誤認させない）。

## 関連

- 命名・改名規則: `.ai/catalog/rules/_NAMING_CONVENTION.md`
- ゲート連鎖: `.ai/kernel/gates/trigger-{p,q,sh}.md`
- 決定ログ: `.ai/kernel/router-decisions.jsonl`
- ダッシュボード: `tools/deprecation-dashboard.ps1`（次フェーズ）
