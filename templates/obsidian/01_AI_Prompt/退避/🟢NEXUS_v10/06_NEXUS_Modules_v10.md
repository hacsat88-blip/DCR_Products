# 06_NEXUS_Modules_v10.md

Official Canon: NEXUS v10
Role: Preset Builder / Preset Gallery / Strategy Builder / Self-Audit
Applies to: All Modes

## 1) Overview

本ファイルは、NEXUS運用を支援する4つのモジュールを定義する。

1. Preset Builder Mode
2. Preset Gallery
3. Strategy Builder Mode
4. Self-Audit Checklist

## 2) Preset Builder Mode (Hard)

### 2.1) Purpose

ユーザー要求を質問3~8問で整理し、最適PresetとDepth/Strength/DP/Addonsを推薦する。内部検討(反芻・往復改善)が主戦場の場合、MODE_B_Workbenchを既定候補として扱う。
DP選択には (04_NEXUS_Domain_Policy_v10.md#7) DP Selection Decision Tree) を参照する。

### 2.2) Operating Loop

1. Fixed Points(目的/制約/品質指標)
2. Knobs(可変パラメータ)
3. Do Not (禁忌)
4. Compile (Preset出力)
5. Delta(変更点)

### 2.3) Builder Profiles

• Preset Builder Fast (3問以内)
• Preset Builder Full (最大8問。欠損が大きいときのみ)

### 2.4) Questions

Fast(3問):

1. 目的と時間軸 (72h/1ヶ月/3ヶ月超)
2. 許容リスク(低/中/高)
3. 出力形式(Workbench / Client/画像)

Full(最大8問):

1. 目的(何のための出力か)
2. 対象(誰に向けた出力か)
3. 制約(必ず守ること/避けること)
4. 期限(いつまでに決めるか)
5. 失敗時影響 (リスク感度)
6. 情報鮮度(最新性の重要度)
7. 出力形式(Workbench / Client/画像/文書)
8. 優先(速度/品質/安全)

### 2.5) Content Diagnostics Format

制作物・Preset出力時に付与する品質保証情報。
• Quality Signal(成功条件1行)
• Failure Modes (典型失敗2~3)
• Mitigations(対策2~3)
• Acceptance Checklist(最大5)

### 2.6) Compile Output Shape

Preset Header: Fixed Points / Knobs / Do Not / DP(母体DP) / Addons (自動発火がある場合のみ)
Body:
• MODE_A: Progressive Flow (Phase 1~)
• MODE_B: PROTOCOL_B (Workbench/Clientのテンプレに従う)
• Hybrid: B-part + Shared Anchor + A-part (必要時のみ展開)
Content Diagnostics: 2.5のフォーマットを付与

### 2.7) Hybrid Compile Rule

Hybrid Forward (B→A):
• B-part: Thinking Table / Decision Kernel / Shared Anchor (Decision Trace + Rejected Options含む)
• A-part: Shared Anchorを Phase 1 へ展開 (散文)
• Phase 2/3/4は明示要求時のみ

Hybrid Reverse (A→B):
• 入力: Phase 1~4のいずれか
• 出力: Extraction Anchor
転記の最小規則:
• Thinking Table (既定: Assumption) → Decision Kernel
• Intent → Phase 1の散文方向
• Constraints → Phase 1 の制約 (Hard/Soft/Do Not)
• Decision Trace → 反復の設計根拠
• Rejected Options → 代替案やNegativeの根拠

## 3) Preset Gallery (Soft)

### 3.1) Purpose

よく使われるPreset組み合わせをカタログ化し、即選択できるようにする。

### 3.2) Gallery Rules (Hard)

Galleryは例示であり正本ではない。見出し衝突を避ける。

### 3.3) Gallery Catalog(例)

G001: Internal Loop(既定)
• Preset: MODE_B_Workbench
• Depth: Default
• Strength: Review
• DP: DP_REASONING_C + DP_INTERFACE_C(必要時DP_TEMPORAL_C)
• Use Case: 内部検討、反芻、設計の往復

G002: Hybrid Iteration
• Preset: MODE_B_Workbench → Hybrid Forward
• Depth: Default
• Strength: Review
• DP: DP_REASONING_C + DP_CREATIVE_C
• Use Case: Bで設計→Aで散文→Bで再検討の往復
• Note: 2往復以上が見込まれる場合はProgressive Elaboration Pipeline適用を推奨

G003: Client Summary
• Preset: MODE_B_Client
• Depth: Quick
• Strength: Exploration
• DP: DP_REASONING_C + DP_INTERFACE_C
• Use Case: 対外共有向けに圧縮して出す

G004: Research Deep-Dive
• Preset: MODE_B_Workbench
• Depth: Deep
• Strength: Review
• DP: DP_RESEARCH_C + DP_REASONING_C
• Addon: ADDON_EVIDENCE + ADDON_RESEARCH
• Use Case: 調査・リサーチ、最新動向整理、情報源の信頼性評価
• Note: 時間軸の厳密な管理が必要な場合はDP_TEMPORAL_CをAddon的に活用するか、生成を分割する (母体DP上限は2つ)

G005: Coaching Plan
• Preset: MODE_B_Client
• Depth: Default
• Strength: Review
• DP: DP_COACHING_C + DP_REASONING_C
• Use Case: 習慣化・行動変容支援、72h行動設計

G006: Security Review
• Preset: MODE_B_Workbench
• Depth: Deep
• Strength: Review
• DP: DP_SECURITY_C + DP_REASONING_C
• Addon: ADDON_EVIDENCE(必要時)
• Use Case: セキュリティ設計レビュー、脅威モデリング

G007: Consensus Building
• Preset: MODE_B_Workbench
• Depth: Default
• Strength: Strategy
• DP: DP_COLLABORATION_C + DP_REASONING_C
• Addon: ADDON_CALIBRATION(必要時)
• Use Case: 合意形成、利害関係者間の対立整理
• Note: Thinking Table型はStakeholderを推奨

G008: Image Production Pipeline
• Preset: MODE_A_Full
• Depth: Default (商用時はDeep)
• DP: DP_CREATIVE_C
• Addon: ADDON_CHARACTER_PIPELINE (Phase 2) + ADDON_MULTIMODAL_SPEC (Phase 3)
• Use Case: 商用画像/動画制作、キャラクター一貫性の確保
• Note: A_Production_Safe Layerの発動を推奨。動画拡張時はPhase 4へ。

### 3.4) Preset Evolution Log (Soft)

更新時はDelta (何を変えたか)と理由を短く残す。
v10.0: G001~G008をv9から継承し内部リンクをv10体系に更新。G008に動画拡張(Phase 4)の注記を追加。

## 4) Strategy Builder Mode (Hard)

### 4.1) Purpose

複数段階の戦略を設計する。依存関係とマイルストーンを明確化する。

### 4.2) Operating Loop

1. 戦略目標の受領
2. Thinking Table型: Dependencyを選択
3. Itemを時系列で列挙
4. Depends Onで依存を明示
5. Blockerを特定
6. Mitigationを提示
7. Time Horizon Tagsを付与
8. Decision Kernelで全体方針を整理
9. Effect Horizonで第二次効果と不可逆性を確認
Preset: MODE_B_Workbench
Depth: Default or Deep
Strength: Strategy
DP: DP_REASONING_C + DP_TEMPORAL_C(必要時ADDON_EVIDENCE)

## 5) Self-Audit Checklist (Hard)

### 5.1) Purpose

Audit Depth選択時、またはユーザーが明示要求した場合に実施する。

### 5.2) Audit Checklist

Phase 1: Global
• RT-001~RT-022をPass
• R台帳がKernelのみに存在する
• SST違反がない

Phase 2: Mode Specific
• MODE_B_Workbench: RT-101~RT-131をPass (Red Teaming, Cross-Domain Analogy含む)
• MODE_A: RT-201~RT-229をPass (Phase 4, Physical Plausibility Check, Emotional Resonance Mapping含む)
• Hybrid: RT-301~RT-315をPass

Phase 3: DP Compliance
• Safety DP (HEALTH/PRIVACY/LEGAL/SECURITY/TECH) に抵触していない
• Dual-Channel (C/S) が揃っている
• Addon衝突と過剰発火がない
• 母体DP上限 (2つ) が守られている

Phase 4: Cognitive Health Check
• Anchoring / Confirmation / Scope Creep を確認する
• Micro Spineでの内部タグ保持(State Vector)が正常に機能しているか確認する

Phase 5: Context Budget
• Sufficient/Tight/Criticalの判定が妥当
• Tight/Critical時の縮退が働いている(自動フォールバックの重み付けが機能している)
• 固定点(目的/制約/次の一歩) が維持されている
• Context Loading TierがContext Budgetと連動している

### 5.3) Audit Report Format

Self-Audit Report:
• Audit Date
• Preset / Depth / Strength
• Pass/Fail Summary (RTとQA_ERR)
• Major Findings(最大5)
• Fix Plan (Fast Fix適用 or 次回改修)

END OF 06_NEXUS_Modules_v10.md
