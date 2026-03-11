# Preset Pattern Library v1.0

> 用途別の構成パターン集。FORGE §5 Mode & Bridge から参照される。
> 本ライブラリが未提供の場合、FORGEはモード＋深度をその場で推論する。

- Version: 1.0
- Date: 2026-03-01

---

## 使用条件

- ユーザーの目的が明確な場合、最も近いパターンを参照して初期構成を素早く決定する
- パターンはガイドであり拘束ではない。ユーザーの意図に合わせて調整してよい
- パターンに該当しない場合はFORGE本体のモード判定に従う

---

## パターン一覧

### P001: Internal Loop（内部検討の反芻）

- **用途**: 設計の往復、仮説検証、自問自答的な深掘り
- **モード**: Logic
- **深度**: Standard
- **Domain Safety**: 通常は不要
- **Quality Signal**: 72h Test が具体的で実行可能
- **Failure Mode**: 問いが広がりすぎて収束しない / 固定点がドリフトする
- **推奨技法**: Silent Assumption Scan → Inversion Test

### P002: Hybrid Iteration（設計→制作の往復）

- **用途**: Logicで方針決定→Visionで散文化→フィードバック→再検討
- **モード**: Logic → Fusion（または Logic → Vision切替）
- **深度**: Standard（2往復以上はDeep推奨）
- **Domain Safety**: 通常は不要
- **Quality Signal**: 散文が判断根拠を正確に反映している
- **Failure Mode**: Logic結論とVision散文の乖離 / 往復でコンテキストが揮発
- **推奨技法**: Vision側は技法1つに留める。Logic側はConstraint Relaxation

### P003: Client Summary（対外共有の要約）

- **用途**: 第三者への説明、レポート、提案書の骨子
- **モード**: Logic
- **深度**: Quick〜Standard
- **Domain Safety**: 対象に応じて適用
- **Quality Signal**: 非専門家が読んで「で、どうすべきか」が分かる
- **Failure Mode**: 内部検討の粒度をそのまま出して読み手が消化不良
- **推奨技法**: Stakeholder Simulation（読み手の視点で検証）

### P004: Research Deep-Dive（調査・リサーチ）

- **用途**: 最新動向整理、情報源の信頼性評価、Gap分析
- **モード**: Logic
- **深度**: Deep
- **Domain Safety**: 情報鮮度の注記必須。健康/法務/金融に該当する場合は安全境界適用
- **Quality Signal**: Fact/Inference/Unknownが明確に分離されている
- **Failure Mode**: 単一情報源への過度な依存 / 調査範囲のScope Creep
- **推奨技法**: Confidence Decomposition → Analogy Bridge

### P005: Coaching Plan（習慣化・行動変容）

- **用途**: 小さなステップでの行動設計、障壁の具体化と回避策
- **モード**: Logic
- **深度**: Standard
- **Domain Safety**: 健康・医療に該当する場合は安全境界適用。過度な負荷の推奨を避ける
- **Quality Signal**: 72h以内の具体行動が1つ以上。障壁と回避策がペアになっている
- **Failure Mode**: 理想論に走り実行可能性が低い / 心理的障壁の軽視
- **推奨技法**: Constraint Relaxation（暗黙の「できない」を外す）

### P006: Security Review（セキュリティ設計レビュー）

- **用途**: 脅威モデリング、防御設計、残余リスク評価
- **モード**: Logic
- **深度**: Deep
- **Domain Safety**: セキュリティ安全境界を必ず適用。攻撃手順の具体化を回避
- **Quality Signal**: 資産・脅威・攻撃面・対策・残余リスクが整理されている
- **Failure Mode**: 防御側と攻撃側の記述境界を超える / 対策の優先順位が不明確
- **推奨技法**: Decision Autopsy（失敗シナリオからの逆算）→ Analogy Bridge

### P007: Consensus Building（合意形成）

- **用途**: 利害関係者間の対立整理、合意方式の明確化
- **モード**: Logic
- **深度**: Standard〜Deep
- **Domain Safety**: 通常は不要
- **Quality Signal**: 各立場の譲れない点/譲れる点が可視化されている
- **Failure Mode**: 特定立場への偏り / 反対意見の省略による偽りの合意
- **推奨技法**: Stakeholder Simulation → Constraint Relaxation
- **Thinking Table型推奨**: Stakeholder

### P008: Image Production Pipeline（画像・動画制作）

- **用途**: 商用画像制作、キャラクター一貫性の確保、動画拡張
- **モード**: Vision
- **深度**: Standard（商用はDeep）
- **Domain Safety**: 通常は不要。実在人物への類似回避は常時
- **Quality Signal**: Scene Proseから具体的な画像を想起できる。商用時はProduction Safe適用
- **Failure Mode**: Anti-Artifact未検討 / 解像度Tier未指定 / キャラクター不整合
- **推奨技法**: 場面に応じて1技法。商用時はProduction Safe Checklist参照

---

## パターン選択ガイド

| ユーザーの意図 | 推奨パターン |
|:---|:---|
| 考えを整理したい / 設計を詰めたい | P001 |
| 方針を決めてから画にしたい | P002 |
| 人に説明する資料がほしい | P003 |
| 調べてまとめてほしい | P004 |
| 習慣を変えたい / 行動計画がほしい | P005 |
| セキュリティを見てほしい | P006 |
| 関係者の意見をまとめたい | P007 |
| 画像/動画をつくりたい | P008 |
