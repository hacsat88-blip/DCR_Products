# Superpowers 統合マッピング（初版）

最終更新: 2026-03-17
目的: 既存 Skill 群を維持しつつ、重複する開発プロセス領域のみ superpowers を優先導入する。

採用方針（確定）:

- 統合できるものは「強化統合」する
- 被らないものは「新規導入」する

## 1. 方針（結論）

- 方針は「全面置換」ではなく「プロセス系を superpowers へ寄せる統合」。
- 既存のドメイン特化 Skill（マーケ、資料作成、UI、SEO 等）は維持。
- 競合時は、品質ゲート（TDD・レビュー・検証）を強く担保する側を優先。

## 2. 重複マッピング（採用判断）

| 区分 | 既存 Skill | superpowers 側 | 推奨アクション | 理由 |
|---|---|---|---|---|
| 強重複 | tdd-workflow | test-driven-development | 置換（superpowers 優先） | 実装規律とレビュー工程との接続が強い |
| 中重複 | search-first | brainstorming / writing-plans | 統合（search-first を前段に残す） | 調査の網羅性は既存が有効、以降工程は superpowers が強い |
| 弱重複 | strategic-compact | （直接重複なし） | 維持 | 長セッションの文脈管理として独立価値がある |
| 非重複 | skill-creator | writing-skills（一部近接） | 維持（必要時のみ併用） | 目的が「Skill の評価改善」まで含み独自性が高い |

## 2.1 強化統合ルール（重複領域）

- 重複領域は、superpowers をプロセスの基準実装として採用する
- 既存 Skill の有効要素（調査観点、運用ノウハウ、テンプレート）は残し、superpowers フローへ接続する
- 置換ではなく、品質ゲートを増強する方向で統合する

適用優先度:

1. TDD/レビュー/検証の厳密性を高める統合
2. 計画・設計の再現性を高める統合
3. 実行速度のみを目的とする統合は後回し

実装例:

- `tdd-workflow` の手順を superpowers `test-driven-development` 基準へ統合
- `search-first` を前段調査として維持し、後段は superpowers `brainstorming` / `writing-plans` に接続

## 2.2 新規導入ルール（非重複領域）

- 用途が被らない Skill は既存資産と競合しないため、新規導入を許可する
- 新規導入時は「トリガー条件」「期待出力」「除外条件」を最低限定義する
- まずは1タスクで試験適用し、KPI への影響を確認してから本採用する

導入チェック:

1. 既存 Skill と責務が衝突しない
2. 実タスクで効果が観測できる
3. 運用コストが許容範囲内

## 3. 維持対象（現時点）

以下は superpowers と用途競合がほぼないため維持。

- マーケティング系: ad-creative, ai-seo, analytics-tracking, paid-ads, seo-audit, social-content など
- CRO 系: page-cro, popup-cro, signup-flow-cro, onboarding-cro, paywall-upgrade-cro など
- ドキュメント/成果物系: docx, pdf, pptx, xlsx, internal-comms
- UI/実装支援系: frontend-design, ui-ux-pro-max, webapp-testing, mcp-builder

## 4. 優先順位ルール（衝突回避）

実行時に複数 Skill が候補になった場合:

1. 安全・ユーザー明示指示
2. superpowers のプロセス Skill（設計/計画/TDD/レビュー）
3. ドメイン特化 Skill（既存）
4. どちらにも明確に該当しない場合のみ通常実行

補足:

- 軽微作業（1ファイル・小修正）では、TDD/レビュー工程を簡略化できる例外を許可する。
- 例外適用時でも「何を省略したか」は明記する。

## 5. 段階導入プラン（1週間スプリント）

### Phase 1（Day 1-2）
- 重複領域を強化統合（tdd-workflow を superpowers:test-driven-development に切替）
- 既存 search-first は前段として維持

### Phase 2（Day 3-5）
- 設計/計画は superpowers:brainstorming + writing-plans を優先
- 実装領域は既存ドメイン Skill を併用（強化統合の検証を継続）

### Phase 3（Day 6-7）
- 複雑タスクのみ superpowers:subagent-driven-development を試験導入
- 非重複 Skill の新規導入を1-2件試験適用
- 軽微タスクでは従来運用を維持して比較

## 6. 判定 KPI（継続/巻き戻し）

比較対象: 導入前1週間 vs 導入後1週間

- PR レビュー指摘件数（減少が望ましい）
- 仕様逸脱件数（減少が望ましい）
- テスト追加率（上昇が望ましい）
- 手戻り回数（減少が望ましい）
- タスク完了時間（大幅悪化しないこと）

継続条件（目安）:

- 品質指標 3/5 以上改善
- 完了時間の悪化が 15% 以内

巻き戻し条件:

- 2スプリント連続で品質改善が確認できない
- 完了時間が 25% 以上悪化し、改善見込みが薄い

## 7. 今日からの運用テンプレート

タスク開始時の宣言テンプレート:

- 「このタスクは superpowers でプロセス実行し、ドメイン実装は既存 Skill を併用します」

軽微修正時の宣言テンプレート:

- 「このタスクは軽微修正のため、計画・レビュー工程を簡略化して実行します（省略: [工程名]）」

## 8. Day 1 実行チェックリスト（そのまま実施可）

### 8-1. 実施対象

- 対象タスクは「中規模以上の開発タスク」1件（複数ファイル変更を含む）
- 軽微修正タスクは比較対象として別枠で1件

### 8-2. 実行手順

1. タスク開始時に宣言テンプレートを使用
2. 既存 `tdd-workflow` は使わず、superpowers の TDD を優先
3. 調査フェーズは `search-first` を先に実施
4. 設計/計画フェーズは superpowers（brainstorming / writing-plans）を優先
5. 実装後はレビュー工程を実施し、指摘件数を記録
6. タスク完了時に KPI 記録テンプレートへ入力

### 8-3. 受け入れ条件

- テストが追加されていること（0件は不合格）
- 仕様逸脱がないこと（逸脱がある場合は原因を記録）
- 完了時間の悪化が 15% 以内であること（同種タスク比較）

## 9. KPI 記録テンプレート（コピペ用）

```
[案件名]:
[日付]:
[タスク種別]: 中規模 / 軽微
[適用プロセス]: superpowers優先 / 従来

1) PRレビュー指摘件数:
2) 仕様逸脱件数:
3) テスト追加率:
4) 手戻り回数:
5) 完了時間:

[所感]:
[次回改善点]:
```

## 10. 1週間後の意思決定ルール

- 継続: 品質指標 3/5 以上改善 かつ 完了時間悪化 15% 以内
- 条件付き継続: 品質指標 2/5 改善だが、逸脱・手戻りが明確に減少
- 巻き戻し: 品質改善なし、または完了時間悪化 25% 以上

## 11. Day 1 実施エントリ（開始）

- 日付: 2026-03-17
- 実施内容: 重複領域の強化統合ルールを確定し、運用チェックリスト/KPI記録を開始
- 導入ステータス: superpowers をローカル導入済み（`%USERPROFILE%/.codex/superpowers` + `%USERPROFILE%/.agents/skills/superpowers` Junction）
- Copilot CLI 統合ステータス: workspace `skills/` に superpowers 14 Skill を取り込み済み（欠落 0）
- 3環境確認ステータス（2026-03-17）:
	- Codex: 導入済み（repo + skills junction + 14 skills 確認）
	- GitHub Copilot CLI: 導入済み（workspace skills 68件、superpowers core 5種確認）
	- Claude Code: 導入済み（`superpowers@claude-plugins-official` v5.0.4 確認）
- タスク種別: 中規模（運用設計）
- 適用方針: 強化統合（重複） + 新規導入（非重複）
- 記録先: `superpowers-kpi-log.md`

次アクション（本計測開始）:

1. コード変更を伴う中規模タスクを1件選定
2. superpowers 優先で実施
3. KPI 5指標を記録し、従来運用タスクと比較

---

必要に応じて、次版で「各 Skill の trigger 文言（description）最適化案」まで展開する。
