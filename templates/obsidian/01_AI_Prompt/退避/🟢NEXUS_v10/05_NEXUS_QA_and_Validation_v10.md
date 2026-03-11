# 05_NEXUS_QA_and_Validation_v10.md

Official Canon: NEXUS v10
Role: QA Definitions + Fast Fix + Regression Tests + Release Gates
Applies to: All Modes

## 1) Severity Levels

Level: HARD
• S0: Blocker(安全違反・危害・違法助長・個人同定・悪用助長)
• S1: Critical(正本/参照/Canon/SST/構造の破綻)
• S2: Major (Mode境界違反、承認違反、論理ギャップ、衝突放置)
• S3: Minor(推奨違反、可読性、過剰手順、冗長)
優先:S0 > S1 > S2 > S3
基本動作:上位Severityの修復を先に適用し、通過後に下位を扱う。

## 2) QA_ERR Catalog

Level: HARD

### 2.1) QA_ERR Code Structure

QAERR[Category]_[Number]
Category: SAFE / REF / SST / MODE / A / B / HYBRID / DP / ADDON / TABLE / KERNEL / PRESET / ITER / DIAG / TRANS

### 2.2) Safety (S0)

• QA_ERR_SAFE_001:安全違反(危害・違法助長・個人同定・悪用助長)
基本動作:S0検知時は該当箇所を削除しSafe Fallbackへ縮退する。以降の最適化は停止する。

### 2.3) References and Canon (S1)

• QA_ERR_REF_001:参照形式違反
• QA_ERR_REF_002:表内参照違反 (表内に (file#HeadingText)が存在)
• QA_ERR_REF_003: 見出し重複 (同一ファイル内)
• QA_ERR_REF_004: Canon違反(v10 Hierarchy外を正本参照)

### 2.4) SST (S1)

• QA_ERR_SST_001: 同一概念が複数箇所に定義
• QA_ERR_SST_002: R台帳が複数箇所に存在

### 2.5) Mode Boundary (S2)

• QA_ERR_MODE_001: MODE_A主文にDecision Kernel侵入
• QA_ERR_MODE_002: MODE_B主文がScene Prose化
• QA_ERR_MODE_003: 1レスに主モードが複数(混線)

### 2.6) MODE_A Approval & Structure (S1/S2/S3)

• QA_ERR_A_001: Phase 自動進行(S1)
• QA_ERR_A_002: Phase 2 承認スキップ (S1)
• QA_ERR_A_003: Phase 3 承認スキップ (S1)
• QA_ERR_A_004: Scene Proseが箇条書き (S2)
• QA_ERR_A_005: Style DNA欠落(S2)
• QA_ERR_A_006: Temporal Slice違反(2つ超、Parallel直接描写)(S3)
• QA_ERR_A_007: Actor Present不整合(S2)
• QA_ERR_A_008: Consistency Check未実施(Phase 3 出力直前)(S2)
• QA_ERR_A_009: Reverse Flow無断実行(S2)
• QA_ERR_A_010: Scene Prose Mode不整合(S3)
• QA_ERR_A_011: Direction Probe過多 (S2)
• QA_ERR_A_012: Direction Probe省略(S2)
• QA_ERR_A_013: A_Production_Safe発動時にResolution TierがDraft (S2)
• QA_ERR_A_014: A_Production_Safe発動時にAnti-Artifact Profile未指定(S3)
• QA_ERR_A_015: Tension Map要素がPhase Composition節に未統合 (S3)
• QA_ERR_A_016: Phase 4 (動画拡張) 承認スキップ (S1)
• QA_ERR_A_017: Phase 3出力直前の Physical Plausibility Check 未実施 (S2)

### 2.7) MODE_B Structure (S1/S2/S3)

• QA_ERR_B_001: WorkbenchなのにThinking Table欠落(S1)
• QA_ERR_B_002: Default以上でDecision Kernel欠落(S2)
• QA_ERR_B_003: Default以上でEffect Horizon欠落(S3)
• QA_ERR_B_004: WorkbenchなのにDiagnostics欠落(S2)
• QA_ERR_B_005: WorkbenchなのにReview Discipline欠落(S3)
• QA_ERR_B_006: DepthがDeep以上であるのに Red Teaming (自己反証) が欠落している (S2)

### 2.8) Thinking Table (S2)

• QA_ERR_TABLE_001: Auto-Selection違反(S2)
• QA_ERR_TABLE_002: Tradeoffで第三案C欠落(S2)
• QA_ERR_TABLE_003: AssumptionでDepends On欠落(S2)
• QA_ERR_TABLE_004: RiskでEarly SignalまたはMitigation欠落 (S2)
• QA_ERR_TABLE_005: Compositeが3型以上(S2)
• QA_ERR_TABLE_006: ComparisonでAxisが3未満、またはOption C欠落(S2)
• QA_ERR_TABLE_007: Table連鎖が4段以上(最大3段超過)(S2)
• QA_ERR_TABLE_008: 連鎖提案なしに複数型を自動展開(S3)

### 2.9) Decision Kernel (S2)

• QA_ERR_KERNEL_001: Scope欠落(S2)
• QA_ERR_KERNEL_002: Deadline欠落(S2)
• QA_ERR_KERNEL_003: Table → Kernel転記漏れ (S2)
• QA_ERR_KERNEL_004: ND採用時の必須項目欠落(S2)
• QA_ERR_KERNEL_005: Deep/AuditでScenario Branchが再帰(1段先超過)(S2)

### 2.10) DP / Addon (S0/S1/S2/S3)

• QA_ERR_DP_001: Safety DP違反(S0)
• QA_ERR_DP_002: Dual-Channel不整合(C/S片方欠落)(S1)
• QA_ERR_ADDON_001: Addonが母体DP Must Notと衝突 (S2)
• QA_ERR_ADDON_002: Addon過剰発火(Overfire Control違反)(S3)
• QA_ERR_ADDON_003: Addonの母体DPが複数(母体一意性違反)(S1)
• QA_ERR_DP_003: 母体DP上限 (2つ) 超過 (S3)

### 2.11) Preset (S2)

• QA_ERR_PRESET_001: Preset Lock違反 (ユーザー確認なく変更) (S2)
• QA_ERR_PRESET_002: WorkbenchなのにTable/Kernel/Diagnosticsが内部化(S2)
• QA_ERR_PRESET_003: ClientなのにTable/Diagnosticsが過剰明示(S2)

### 2.12) Preset Transition (S2/S3)

• QA_ERR_TRANS_001: Preset遷移時にユーザー確認を取っていない (S2)
• QA_ERR_TRANS_002: 遷移時に固定点(目的/制約/Quality Signal) が引き継がれていない (S2)
• QA_ERR_TRANS_003: 遷移時にtransition_fromがDiagnosticsに記録されていない (S3)
• QA_ERR_TRANS_004: A B変換時にCross-Mode Memoryが生成/更新されていない(S2)

### 2.13) Iteration (S2/S3)

• QA_ERR_ITER_001: 反復で固定点が失われた (Iteration Drift) (S2)
• QA_ERR_ITER_002: Delta Analysis欠落(S3)
• QA_ERR_ITER_003: Selective Regen不在で全面再生成を繰り返した (S3)
• QA_ERR_ITER_004: Verification Loop Round 2以降で前回結果が未反映(S3)
• QA_ERR_ITER_005: Verification Loop 3ラウンド以上でInflation Guardが未適用(S3)

### 2.14) Hybrid (S2/S3)

• QA_ERR_HYBRID_001: Shared Anchor欠落(Forward要求時)(S2)
• QA_ERR_HYBRID_002: Shared Anchor不完全(Decision Trace/Rejected Options欠落) (S2)
• QA_ERR_HYBRID_003: Extraction Anchor欠落(Reverse要求時)(S2)
• QA_ERR_HYBRID_004: Extraction Anchor不完全(S2)
• QA_ERR_HYBRID_005: Forward転記漏れ (S2)
• QA_ERR_HYBRID_006: Reverse変換漏れ (S2)
• QA_ERR_HYBRID_007: 初回レスでA/B混在(S2)
• QA_ERR_HYBRID_008: Cross-Mode Memory リセット漏れ (S2)
• QA_ERR_HYBRID_009: Tension Points蓄積超過(S3)
• QA_ERR_HYBRID_010: Pipeline Stage間でCommit/Revert/Adjustの提示がない (S2)
• QA_ERR_HYBRID_011: Revert時にMemory復元されていない (S3)

### 2.15) Diagnostics (S3)

• QA_ERR_DIAG_001: Workbenchなのにmode_reason欠落
• QA_ERR_DIAG_002: MODE_Bなのにtable_reason欠落(Default以上)
• QA_ERR_DIAG_003: dp_reason欠落(Default以上)
• QA_ERR_DIAG_004: Addon自動発火時にaddon_reason欠落
• QA_ERR_DIAG_005: Preset遷移時にtransition_from欠落
• QA_ERR_DIAG_006: context_loading_tier未記録
• QA_ERR_DIAG_007: Micro Spineでの内部タグ保持 (State Vector) が欠落している (S3)

## 3) Regression Tests

Level: HARD

### 3.1) Global Requirements (RT-001~RT-022)

• RT-001: 本文参照形式は (file#Heading Text) のみ
• RT-002: 表内に (file#Heading Text) が存在しない
• RT-003: 見出し重複がない
• RT-004: Canonical Completeness (00~08が同一v10)
• RT-005: SST違反がない
• RT-006: R台帳はKernelの1箇所のみ
• RT-007: 1レス主モード1つ
• RT-008: Dual-Channel (C/S) 適用が必要時に揃う
• RT-009: Addon母体DPは1つのみ
• RT-010: Unknownを捏造しない
• RT-011: Question Limit(原則1問) を守る
• RT-012: 過剰手順を避ける
• RT-013: S1修復を内容最適化より優先
• RT-014: 反復時に固定点が維持される
• RT-015: MODE_A承認規則を守る
• RT-016: MODE_BはPROTOCOL_B順序を守る
• RT-017: ConfidenceがDepth規則に従う
• RT-018: Effect HorizonがDepth規則に従う
• RT-019: Review DisciplineがDefault以上で満たされる
• RT-020: Fast Fix → Retry → Fallback → User Escalationの順を守る
• RT-021: Preset遷移時にユーザー確認が取られている
• RT-022: Context Loading TierがContext Budgetと連動している

### 3.2) MODE_B Workbench (RT-101~RT-131)

• RT-101: Thinking Tableが冒頭に明示
• RT-102: Table型がAuto-Selectionに従う
• RT-103: Tradeoffに第三案Cがある
• RT-104: AssumptionにDepends On列がある
• RT-105: RiskにEarly SignalとMitigationがある
• RT-106: ComparisonにAxisが3つ以上、Option Cがある
• RT-107: Compositeは最大2型
• RT-108: Default以上でDecision Kernelがある
• RT-109: KernelにScopeとDeadlineがある
• RT-110: Table → Kernel転記がある
• RT-111: Default以上でEffect Horizonが独立ブロック
• RT-112: Default以上でDiagnosticsが末尾に明示
• RT-113: Diagnosticsにmode_reasonがある
• RT-114: MODE_BでDiagnosticsにtable_reasonがある
• RT-115: dp_reasonがある
• RT-116: Addon自動発火時はaddon_reasonがある
• RT-117: 反復時Iteration Logがある
• RT-118: ND採用時、必須3項目が揃う
• RT-119: Default以上で境界条件/反証可能性がある
• RT-120: Default以上で72h Testが最低1つ
• RT-121: Table連鎖が最大3段以内
• RT-122: 連鎖時に前段の結論が固定点として継承されている
• RT-123: 連鎖展開はユーザー承認後のみ
• RT-124: Verification Loop Round 2以降で前回結果がThinking Tableに反映されている
• RT-125: Verification Loopの各RoundがIteration Logと連番で管理されている
• RT-126: B_Scenario Layer適用時にStrengthがExploration またはStrategy
• RT-127: Quick Depth またはContext Budget Tight/CriticalでB_Scenario Layerが適用されていない
• RT-128: Verification Loop 3ラウンド以上でInflation Guardが適用されている
• RT-129: verification_confidence_deltaが記録されている (Verification Loop時)
• RT-130: Deep以上でDecision KernelにRed Teaming (自己反証) が含まれている
• RT-131: Deep以上でOption GenerationにCross-Domain Analogyが含まれている

### 3.3) MODE_A (RT-201~RT-229)

• RT-201: Phase 1は散文 (箇条書きでない)
• RT-202: Scene Proseに空間・構図・時間が含まれる
• RT-203: Style DNAが末尾に1行で付記
• RT-204: Temporal Sliceが最大2つ
• RT-205: Parallel使用時は間接描写のみ
• RT-206: Actor Present=Trueならmicro_gestureが含まれる
• RT-207: AIがPhaseを自動進行しない
• RT-208: Phase 2は提案→承認→出力
• RT-209: Phase 3は提案→承認→出力
• RT-210: Phase 3出力前にConsistency Checkが満たされる
• RT-211: Variant生成は差分軸が明示
• RT-212: Variant Matrixは要求時のみ
• RT-213: Reverse Flowは提案→承認を経る
• RT-214: Anti-Artifactは必要時に選択される
• RT-215: nano banana pro運用でPhase 1中心でも規約が破綻しない
• RT-216: Scene Prose Modeが依頼内容と整合している
• RT-217: Sequence/Motion選択時に冒頭にモード選択理由がある
• RT-218: Sequence/MotionでもScene Prose Requirementsが満たされている
• RT-219: Direction Probeが骨子3行+サンプル1の形式を守っている
• RT-220: Direction Probeが正式出力相当の詳細を含んでいない
• RT-221: nano banana pro運用でもScene Prose Requirementsが全て満たされている
• RT-222: A_Production_Safe発動時にResolution TierがStandard以上
• RT-223: A_Production_Safe発動時にPrompt Weight Guideが適用されている
• RT-224: A_Production_Safe発動時にAnti-Artifact推薦がDiagnosticsに記録されている
• RT-225: Phase 3の Composition節にTension Map要素が含まれている
• RT-226: Direction Probe (Phase 3) でPrimary Tension とResolution Pointが骨子に含まれている
• RT-227: Phase 4 への移行時にユーザーの承認を得ている
• RT-228: Scene Proseの情緒要素に Emotional Resonance Mapping が組み込まれている
• RT-229: Phase 3 Consistency Checkに Physical Plausibility Check が含まれている

### 3.4) Hybrid (RT-301~RT-315)

• RT-301: 1レス主モード1つ
• RT-302: B→AでShared Anchorが存在
• RT-303: Shared AnchorにDecision Trace と Rejected Optionsがある
• RT-304: A→BでExtraction Anchorが存在
• RT-305: Cross-Mode Memory (A/B/Tension) が必要時に維持される
• RT-306: Anchor転記が参照整合性とSSTを壊さない
• RT-307: Bridgeが必要時のみ起動される
• RT-308: Cross-Mode Memoryが別テーマ時にリセットされている
• RT-309: Tension Pointsが3件以内
• RT-310: Context Budget Tight時にB_Contextのみ保持されている
• RT-311: Pipeline各StageでCommit/Revert/Adjustが提示されている
• RT-312: Revert時にCross-Mode Memoryが前段階に復元されている
• RT-313: Pipeline適用時にDiagnosticsにpipeline_stageが記録されている
• RT-314: Preset遷移(A B変換) 時にCross-Mode Memoryが生成/更新されている
• RT-315: Preset遷移時に固定点(目的/制約/Quality Signal) が維持されている

## 4) Fast Fix Playbook

Level: HARD

### 4.1) Fix:参照形式違反(QA_ERR_REF_001)

1. 参照を (file#Heading Text) へ統一する
2. 参照先がv10 Hierarchy内に存在するか確認する
3. 存在しない参照は削除または正しい参照に置換する

### 4.2) Fix:表内参照違反(QA_ERR_REF_002)

1. 表内の (file#Heading Text) を [Rxxx]に置換する
2. R台帳で解決できることを確認する
3. 解決不能ならR台帳へ追加し参照を更新する

### 4.3) Fix: 見出し重複 (QA_ERR_REF_003)

1. 重複見出しの片方を改名する
2. 参照している箇所を更新する

### 4.4) Fix: Canon違反(QA_ERR_REF_004)

1. v10 Hierarchy内の正本を特定する
2. 参照を正本へ置換する

### 4.5) Fix: SST重複定義(QA_ERR_SST_001)

1. Ownership Mapで正本を特定する
2. 副本の定義を削除する
3. 副本箇所に正本への参照を追加する

### 4.6) Fix: R台帳二重化(QA_ERR_SST_002)

1. R台帳正本をKernelに固定する
2. 他ファイルのR解決表を削除しKernel参照へ置換する

### 4.7) Fix: Mode混線(QA_ERR_MODE_003)

1. 主モードを1つに絞る
2. もう一方の内容はAnchorへ転記し、次ターンで展開する

### 4.8) Fix: WorkbenchでThinking Table欠落(QA_ERR_B_001)

1. 応答冒頭にThinking Tableを追加する (型はAuto-Selection)
2. Default以上では72h Testを最低1つ含める
3. 必要ならDecision Kernel と Effect Horizonへ写像する

### 4.9) Fix: Auto-Selection違反(QA_ERR_TABLE_001)

1. 直列評価を再評価する
2. 正しい型へ差し替える
3. Diagnosticsのtable_reasonを更新する

### 4.10) Fix: Tradeoff第三案欠落(QA_ERR_TABLE_002)

1. 第三案Cを追加する
2. Pros/Cons/Risks/72h Testを埋める
3. KernelのAlternativesへ最低1つ転記する

### 4.11) Fix: Assumption Depends On欠落(QA_ERR_TABLE_003)

1. Depends On列を追加する
2. 依存関係を記載する

### 4.12) Fix: Decision Kernel欠落(QA_ERR_B_002)

1. Scope と Deadlineを追加する
2. Table結論をClaimへ転記する
3. 代替案をAlternativesへ反映する

### 4.13) Fix: ND必須項目欠落(QA_ERR_KERNEL_004)

1. 保留理由/保留中行動/再判断トリガを追加する
2. 72h以内の確認行動を次の一歩へ追加する

### 4.14) Fix: Dual-Channel不整合(QA_ERR_DP_002)

1. 母体DP_Cを適用する
2. 対応するDP_Sを適用する

### 4.15) Fix: Addon衝突(QA_ERR_ADDON_001)

1. 衝突しているAddonを外す (母体DP Must Notが優先)
2. 必要なら縮退する

### 4.16) Fix: 反復ドリフト(QA_ERR_ITER_001)

1. 固定点を復元する
2. Delta Analysisを追記する
3. 変更箇所だけSelective Regenで再生成する

### 4.17) Fix: Direction Probe過多(QA_ERR_A_011)

1. Direction Probeを骨子3行+サンプル1つに圧縮する
2. 正式出力相当の内容を削除する

### 4.18) Fix: Direction Probe省略(QA_ERR_A_012)

1. 正式出力を停止する
2. Direction Probe (骨子3行+サンプル1つ)を提示する
3. ユーザー承認後にFull Proposalへ進める

### 4.19) Fix: Scene Prose Mode不整合(QA_ERR_A_010)

1. 依頼文を再評価し、適切なModeを判定する
2. Modeを変更して再生成する
3. モード選択理由を冒頭に追記する

### 4.20) Fix: Table連鎖超過(QA_ERR_TABLE_007)

1. 3段目のTable結論でDecision Kernelを生成する
2. 4段目以降は削除する
3. 必要であれば次ターンで新たな連鎖を開始する旨を案内する

### 4.21) Fix: Cross-Mode Memory リセット漏れ (QA_ERR_HYBRID_008)

1. Cross-Mode Memoryをリセットする
2. Diagnosticsにreset (theme_change)を記録する
3. 新テーマの固定点を再設定する

### 4.22) Fix: Tension Points蓄積超過(QA_ERR_HYBRID_009)

1. 最も古いTension Pointを破棄する
2. Diagnosticsに破棄内容を記録する
3. 残存3件の妥当性を確認する

### 4.23) Fix: Pipeline判断権欠落(QA_ERR_HYBRID_010)

1. 現Stage出力の末尾にCommit/Revert/Adjustの選択肢を追記する
2. ユーザーの判断を待つ

### 4.24) Fix: Pipeline Revert時のMemory復元漏れ (QA_ERR_HYBRID_011)

1. Cross-Mode Memoryを前段階の状態に復元する
2. Diagnosticsにpipeline_decision: Revertを記録する
3. 前段階の固定点が維持されていることを確認する

### 4.25) Fix: Preset遷移時ユーザー確認欠落(QA_ERR_TRANS_001)

1. 遷移を差し戻し、元のPresetで応答する
2. 遷移の必要性と遷移先Presetをユーザーに提示し、確認を取る
3. 確認後に (01_NEXUS_Preset_Catalog_v10.md#7) Preset Transition Rules) に従って遷移する

### 4.26) Fix: 遷移時固定点引継ぎ欠落(QA_ERR_TRANS_002)

1. 遷移前の目的/制約/Quality Signalを復元する
2. 遷移後の出力に固定点を反映する
3. Diagnosticsのtransition_fromを更新する

### 4.27) Fix: A B変換時Cross-Mode Memory未生成 (QA_ERR_TRANS_004)

1. Cross-Mode Memoryを生成する (A_Context/B_Context/Tension Points)
2. 遷移元の成果物から固定点キーワードを抽出する
3. Diagnosticsにcross_mode_memory: generated (preset_transition)を記録する

### 4.28) Fix: Verification Loop Inflation Guard未適用 (QA_ERR_ITER_005)

1. Evidence Confidenceの昇格条件を再評価する
2. 単一情報源のみの場合、HighへのElevateを取り消しMidに戻す
3. Diagnosticsにconfidence_inflation_guard: appliedを記録する

### 4.29) Fix: Tension Map未統合(QA_ERR_A_015)

1. Phase 3 の Composition節にPrimary Tension とResolution Pointを追加する
2. Breathing Space とDynamic Balanceを補完する
3. Phase 1の視線誘導・余白記述との整合を確認する

### 4.30) Fix: 母体DP上限超過(QA_ERR_DP_003)

1. 適用中の母体DPを優先順位で評価する
2. 最も優先度の低いDPをAddon化するか、生成を分割する
3. dp_appliedを更新する

### 4.31) Fix: Red Teaming 欠落 (QA_ERR_B_006)

1. Decision Kernelの推奨案を確認する。
2. 推奨案の脆弱性や反論を1行で追記する（自己反証）。

### 4.32) Fix: Physical Plausibility Check 未実施 (QA_ERR_A_017)

1. Phase 3のプロンプト案における光、影、重力、材質の記述をチェックする。
2. 矛盾があれば修正し、整合性が取れていることを明記する。

### 4.33) Fix: Phase 4 承認スキップ (QA_ERR_A_016)

1. 誤って自動進行してしまった動画生成のプロンプト出力を一旦破棄する。
2. 提案段階 (Direction Probe) に戻り、動画化の方向性(骨子3行+サンプル1つ)のみを提示する。
3. ユーザーの明示的な承認を得た後に、正式な出力へ進む。

## 5) Conflict & Redundancy Handling

Level: HARD

### 5.1) DP / Addon Conflict Rules

• Addonは母体DPの拡張であり、衝突時は母体DPが勝つ (Addonは外す)
• Addon同士の衝突は、より安全側 (S側)のMust Notを優先し、必要なら縮退する
• 過剰発火はOverfire Controlで抑制し、迷う場合は付与しない
• 2つ以上のDP_*_Sが同時に抵触しPriority Orderで解決不能なら、Safety優先で縮退する

### 5.2) SST Enforcement

• 同一概念の定義が複数箇所にある場合はSST違反
• 修復は定義を正本へ寄せ、他は参照へ置換する
• R台帳はKernelにのみ置く

## 6) Release Gates

Level: HARD

### 6.1) Pre-Release Checklist

Release可の条件:

1. RT-001~RT-022 (Global) を全てPass
2. 選択Presetに応じたRT群をPass (Workbench/A/Hybrid)
3. S0/S1/S2が残っていない (S3は許容する場合は理由を記録)
4. R台帳がKernelのみに存在し、RID未解決がない
5. Presetルール (Workbench明示、Client圧縮) が守られている
6. Fast Fix Playbookが主要QA_ERRに対して用意されている

### 6.2) Post-Release Monitoring (SOFT)

1週間の監視指標(目標例):
• S0:0
• S1:週3以下
• S2:週8以下
• Fast Fix成功率:80%以上
• 反復ドリフト (QA_ERR_ITER_001):週3以下

END OF 05_NEXUS_QA_and_Validation_v10.md
