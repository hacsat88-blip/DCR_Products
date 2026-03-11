# 07_NEXUS_Reference_Guide_v10.md

Official Canon: NEXUS v10
Role: 運用導線・参照形式・Context Loading Tiers SST Ownership Map
Applies to: All Modes

## 1) Must Follow (Hard)

常に守る項目(詳細正本は各ファイルにある)。
• Operational Spine: (00_NEXUS_Kernel_v10.md#2) Operational Spine)
• Preset定義/テンプレ写像: (01_NEXUS_Preset_Catalog_v10.md#2) Preset Specifications)
• Preset Transition Rules: (01_NEXUS_Preset_Catalog_v10.md#7) Preset Transition Rules)
• PROTOCOL_B: (02_NEXUS_Operational_Core_v10.md#1) PROTOCOL_B)
• MODE_A: (03_NEXUS_MODE_A_Contract_v10.md#1) Progressive Flow Overview)
• DP/Addon: (04_NEXUS_Domain_Policy_v10.md#1) Dual-Channel System)
• DP Selection: (04_NEXUS_Domain_Policy_v10.md#7) DP Selection Decision Tree)
• QA/RT/Fast Fix/Release: (05_NEXUS_QA_and_Validation_v10.md#3) Regression Tests)
• Modules: (06_NEXUS_Modules_v10.md#2) Preset Builder Mode)
• Reference Format: (07_NEXUS_Reference_Guide_v10.md#2) Reference Format)

## 2) Reference Format (Hard)

### 2.1) Cross-File Reference (本文参照)

形式:(filename#Heading Text)
Hard:
• filenameはCanonical File Set (v10) に一致すること
• Heading Textは見出し文字列と完全一致 (大小・全半角含む)
• 参照外枠は半角括弧()のみ

### 2.2) Table Reference(表内参照)

形式:[Rxxx]
Hard:
• 表内では(file#HeadingText) を直書きしない
• [Rxxx]はKernelのR台帳で必ず解決できること
• 未解決はS1として扱う
R台帳の正本:(00_NEXUS_Kernel_v10.md#6) Reference Resolution List (R-ID))

## 3) Heading Rules (Hard)

● 同一ファイル内で見出し文字列を重複しない
● 見出しは番号付きの固定形に寄せる
● 見出し階層は最大4段を推奨する

## 4) Naming Conventions (Hard)

### 4.1) File Name

NN_NEXUS_Name_v10.md (NNは00~08)

### 4.2) DP Name

DP_[NAME]_C / DP_[NAME]_S

### 4.3) Addon Name

ADDON_[NAME]

### 4.4) QA_ERR / RT Name

QAERR_[CATEGORY]_[NUMBER] / RT-XXX

## 5) Context Loading Tiers (Hard)

内部検討(Workbench) を既定として、読み込み範囲を段階化する。

### 5.1) Always Load (Hard)

• 00_NEXUS_Kernel_v10.md
• 01_NEXUS_Preset_Catalog_v10.md
• 07_NEXUS_Reference_Guide_v10.md

### 5.2) MODE_B Workbench Load (Hard)

• 02_NEXUS_Operational_Core_v10.md
• 04_NEXUS_Domain_Policy_v10.md
• 05_NEXUS_QA_and_Validation_v10.md (Validation時)

### 5.3) MODE_A Load (Hard)

• 03_NEXUS_MODE_A_Contract_v10.md
• 04_NEXUS_Domain_Policy_v10.md

### 5.4) Hybrid Load (Hard)

• 02_NEXUS_Operational_Core_v10.md
• 03_NEXUS_MODE_A_Contract_v10.md
• 04_NEXUS_Domain_Policy_v10.md
• 05_NEXUS_QA_and_Validation_v10.md (Validation時)

### 5.5) Audit Load (Hard)

全9ファイル (00~08)

### 5.6) Dynamic Context Loading Rules

Level: HARD
Context BudgetとContext Loading Tiersを連動させ、コンテキスト消費に応じて読み込み範囲を動的に調整する。
連動規則:
Sufficient(通常):
・該当Preset用のContext Loading Tierを全て読み込む
• Validation Loadも含める
Tight (要約と固定点優先):
• Always Loadは維持する
• Validation Load (05_QA) を省略し、既知のFast Fix手順のみで対応する
• 06_Modules/08_Legacyを省略する
• Diagnosticsの記録粒度を下げる (Gate Traceを省略、Iteration Logを1行に圧縮)
• Diagnosticsにcontext_loading_tier: reduced (tight)を記録する
Critical(固定点のみ):
• Always Load (00_Kernel + 01_Preset_Catalog + 07_Reference_Guide) のみ読み込む 他の全ファイルを省略する
・出力はMinimal Set (04_NEXUS_Domain_Policy_v10.md#3) Core Domainsの各Minimal Output参照)に縮退する
• Diagnosticsは最小フィールド (mode/safety/ confidence / context_budget/ context_loading_tier)のみ
• Diagnosticsにcontext_loading_tier: minimal (critical)を記録する
Budget判定タイミング:
• Operational SpineのStep 3 (Micro Spine) で判定する
・反復ターンごとに再判定する(会話が長くなるほどTight/Criticalに遷移しやすい)
・ユーザーが明示的にContext Budgetを指定した場合はそちらを優先する

## 6) Single Source of Truth (Hard)

同一概念の定義は1箇所に寄せ、他所は参照で表現する。

### 6.1) Ownership Map (Hard)

本節は導線としてのOwnership Mapであり、各概念の詳細定義は正本ファイルに置く。定義の重複を検知した場合は、正本を本Mapで特定し、副本を参照に置換する。

• Operational Spine: (00_NEXUS_Kernel_v10.md#2) Operational Spine)
• R台帳(R-ID): (00_NEXUS_Kernel_v10.md#6) Reference Resolution List (R-ID))
• Preset定義/Template Mapping: (01_NEXUS_Preset_Catalog_v10.md#2) Preset Specifications)
• Preset Transition Rules: (01_NEXUS_Preset_Catalog_v10.md#7) Preset Transition Rules)
• A_Production_Safe Layer: (01_NEXUS_Preset_Catalog_v10.md#8) A_Production_Safe Layer)
• B_Scenario Layer: (01_NEXUS_Preset_Catalog_v10.md#9) B_Scenario Layer)
• Mode Profiles: (01_NEXUS_Preset_Catalog_v10.md#10) Mode Profiles)
• Emotion-Logic Gradient: (01_NEXUS_Preset_Catalog_v10.md#3) Emotion-Logic Gradient)
• PROTOCOL_B/Thinking Table/Decision Kernel/Bridge: (02_NEXUS_Operational_Core_v10.md#1) PROTOCOL_B)
• State Vector (内部保持タグ): (02_NEXUS_Operational_Core_v10.md#2.3) Micro Spine Fields)
• Table型の連鎖: (02_NEXUS_Operational_Core_v10.md#3.12) Table型の連鎖)
• Cross-Domain Analogy (異分野アナロジー): (02_NEXUS_Operational_Core_v10.md#3.11) Option Generation Phase)
• Red Teaming Protocol (自己反証): (02_NEXUS_Operational_Core_v10.md#4.1) Required Fields)
• Verification Loop Protocol: (02_NEXUS_Operational_Core_v10.md#10.1) Verification Loop Protocol)
• Inflation Guard: (02_NEXUS_Operational_Core_v10.md#5.3) Inflation Guard)
• Progressive Elaboration Pipeline: (02_NEXUS_Operational_Core_v10.md#9.7) Progressive Elaboration Pipeline)
• Cross-Mode Memory: (02_NEXUS_Operational_Core_v10.md#9.6) Cross-Mode Memory)
• Diagnostics (フィールド定義): (02_NEXUS_Operational_Core_v10.md#7) Diagnostics)
• Diagnostics Reset on Transition (リセット規則): (01_NEXUS_Preset_Catalog_v10.md#7.3) Diagnostics Reset on Transition)
• Progressive Flow (MODE_A): (03_NEXUS_MODE_A_Contract_v10.md#1) Progressive Flow Overview)
• Scene Prose Modes: (03_NEXUS_MODE_A_Contract_v10.md#2.2) Scene Prose Modes)
• Emotional Resonance Mapping: (03_NEXUS_MODE_A_Contract_v10.md#2.3) Scene Prose Requirements)
• Physical Plausibility Check (物理的妥当性): (03_NEXUS_MODE_A_Contract_v10.md#6.7) Consistency Check)
• Tension Map: (03_NEXUS_MODE_A_Contract_v10.md#7.3) Tension Map)
• Phase 4 (Temporal Interpolation/動画拡張): (03_NEXUS_MODE_A_Contract_v10.md#11) Phase 4: Temporal Interpolation (Video/Motion))
• nano banana pro運用: (03_NEXUS_MODE_A_Contract_v10.md#2.10) nano banana pro運用)
• DP/Addon定義: (04_NEXUS_Domain_Policy_v10.md#1) Dual-Channel System)
• DP Selection Decision Tree: (04_NEXUS_Domain_Policy_v10.md#7) DP Selection Decision Tree)
• QA_ERR/Fast Fix/Regression/Release: (05_NEXUS_QA_and_Validation_v10.md#2) QA_ERR Catalog)
• Preset Builder/Gallery/Self-Audit: (06_NEXUS_Modules_v10.md#2) Preset Builder Mode)
• Reference Format/Context Loading/SST導線: (07_NEXUS_Reference_Guide_v10.md#2) Reference Format)
• Dynamic Context Loading Rules: (07_NEXUS_Reference_Guide_v10.md#5.6) Dynamic Context Loading Rules)
• Legacy/Migration: (08_NEXUS_Legacy_v10.md#1) File Migration Map)
• Migration Checklist (正本): (08_NEXUS_Legacy_v10.md#6) Migration Checklist (v9 v10 最小))

### 6.2) Duplication Detection & Fix (Hard)

1. Ownership Mapで正本を特定する
2. 副本の定義を削除する
3. 副本箇所から正本への参照を追加する
4. RT-005/RT-006を実行する
5. 残っていればFast Fixで再修復する

## 7) Canonical File Set (v10) (Hard)

固定の9ファイル:
• 00_NEXUS_Kernel_v10.md
• 01_NEXUS_Preset_Catalog_v10.md
• 02_NEXUS_Operational_Core_v10.md
• 03_NEXUS_MODE_A_Contract_v10.md
• 04_NEXUS_Domain_Policy_v10.md
• 05_NEXUS_QA_and_Validation_v10.md
• 06_NEXUS_Modules_v10.md
• 07_NEXUS_Reference_Guide_v10.md
• 08_NEXUS_Legacy_v10.md

## 8) Migration Checklist Reference

Level: HARD
Migration Checklistの正本は (08_NEXUS_Legacy_v10.md#6) Migration Checklist (v9 v10 最小))に置く。

END OF 07_NEXUS_Reference_Guide_v10.md
