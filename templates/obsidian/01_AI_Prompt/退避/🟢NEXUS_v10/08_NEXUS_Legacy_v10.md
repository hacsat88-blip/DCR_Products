# 08_NEXUS_Legacy_v10.md

Official Canon: NEXUS v10
Role: v8/v9 v10移行追跡+DP互換エイリアス+ Addon Migration
Note: 互換が不要なら常時ロードしない

## 1) File Migration Map

### 1.1) v8 -> v9 (参考記録)

| v8 File | v9 File |
| :--- | :--- |
| 00_NEXUS_Kernel_v8.md | 00_NEXUS_Kernel_v9.md |
| 01_NEXUS_Preset_Catalog_v8.md | 01_NEXUS_Preset_Catalog_v9.md |
| 02_NEXUS_Operational_Core_v8.md | 02_NEXUS_Operational_Core_v9.md |
| 03_NEXUS_MODE_A_Contract_v8.md | 03_NEXUS_MODE_A_Contract_v9.md |
| 04_NEXUS_Domain_Policy_v8.md | 04_NEXUS_Domain_Policy_v9.md |
| 05_NEXUS_QA_and_Validation_v8.md | 05_NEXUS_QA_and_Validation_v9.md |
| 06_NEXUS_Modules_v8.md | 06_NEXUS_Modules_v9.md |
| 07_NEXUS_Reference_Guide_v8.md | 07_NEXUS_Reference_Guide_v9.md |
| 08_NEXUS_Legacy_v8.md | 08_NEXUS_Legacy_v9.md |

### 1.2) v9 -> v10 (最新)

| v9 File | v10 File |
| :--- | :--- |
| 00_NEXUS_Kernel_v9.md | 00_NEXUS_Kernel_v10.md |
| 01_NEXUS_Preset_Catalog_v9.md | 01_NEXUS_Preset_Catalog_v10.md |
| 02_NEXUS_Operational_Core_v9.md | 02_NEXUS_Operational_Core_v10.md |
| 03_NEXUS_MODE_A_Contract_v9.md | 03_NEXUS_MODE_A_Contract_v10.md |
| 04_NEXUS_Domain_Policy_v9.md | 04_NEXUS_Domain_Policy_v10.md |
| 05_NEXUS_QA_and_Validation_v9.md | 05_NEXUS_QA_and_Validation_v10.md |
| 06_NEXUS_Modules_v9.md | 06_NEXUS_Modules_v10.md |
| 07_NEXUS_Reference_Guide_v9.md | 07_NEXUS_Reference_Guide_v10.md |
| 08_NEXUS_Legacy_v9.md | 08_NEXUS_Legacy_v10.md |

## 2) DP Migration Map (互換エイリアス)

v9からv10へのDP名変更はない。以下はv7以前との互換エイリアスを継承する。

| 旧DP名 | v10 DP名 | 備考 |
| :--- | :--- | :--- |
| DP_LOGIC | DP_REASONING | unified命名→preset命名 |
| DP_VISUAL | DP_CREATIVE | unified命名→preset命名 |
| DP_NARRATIVE | DP_CREATIVE + ADDON_NARRATIVE_BOOST | unified独立DP→統合 |
| DP_COMMUNICATION | DP_INTERFACE | unified命名→preset命名 |
| DP_SCOPE | DP_INTERFACE + ADDON_SCOPE_GUARD | unified独立DP→統合 |
| DP_OPS | DP_QA | unified命名→preset命名 |
| DP_ANALYSIS | DP_REASONING + ADDON_METRICS | v5/v6互換 |
| DP_STYLE | DP_INTERFACE | v5/v6互換 |
| DP_PRODUCT | DP_REASONING + ADDON_ACCEPTANCE | v5/v6互換 |

エイリアス使用方法: ユーザーが旧DP名を指定した場合、システムはv10 DP名として解釈する。複数DPへの分離が必要な場合、自動で適用しDiagnosticsに記録する。

## 3) Addon Migration Map

| v9 Addon | v10 Status | Notes |
| :--- | :--- | :--- |
| ADDON_EVIDENCE | 維持 | |
| ADDON_DECOMPOSITION | 維持 | |
| ADDON_CALIBRATION | 維持 | |
| ADDON_DECISION_QUALITY | 維持 | |
| ADDON_METRICS | 維持 | |
| ADDON_ACCEPTANCE | 維持 | |
| ADDON_RESEARCH | 維持 | |
| ADDON_NARRATIVE_BOOST | 維持 | |
| ADDON_MULTIMODAL_SPEC | 維持 | |
| ADDON_CHARACTER_PIPELINE | 維持 | |
| ADDON_SCOPE_GUARD | 維持 | |
| ADDON_PEDAGOGY | 維持 | 母体: DP_LEARNING |
| ADDON_CONTEXT_BUDGET | 維持 | |

## 4) Major Concept Changes (v8 -> v9要約)

(PDFに残存する歴史的記録として保持)
• Emotion-Logic Gradient 10段階化: L45とL55を追加。B_Assumption (L85) を追加。
• Preset Transition Rules新設:遷移マトリクス、遷移原則、Diagnostics リセット規則を定義。
• DP Selection Decision Tree新設: 5つの主目的からDP組み合わせを導出。母体DP上限(2つ)を明記。
• Dynamic Context Loading Rules新設: Context Budgetと連動させ縮退を実現。
• Verification Loop Inflation Guard新設: 3ラウンド以上の反復で過信を防ぐ制約を導入。
• Tension Map正式組み込み: Cinematic Fix内のSoft概念からHard昇格。

## 5) Major Concept Changes (v9 -> v10 新機能)

v9 → v10 (完全統合・強化版アップデート):
• State Vector導入: Micro Spineにて内部タグ `[State: Mode=...]` を明示保持し、LLMの推論迷いやコンテキスト揮発を防止。
• 創造性強化 (MODE_B): 深堀り(Deep)時に「Red Teaming Protocol (自己反証)」と「Cross-Domain Analogy (異分野アナロジー)」を強制発動し、論理的収束の質を飛躍的に向上（※安全・予算スキップ条件、および依存関係の例外条件付き）。
• 堅牢性と創造性の拡張 (MODE_A): Scene Proseに「Emotional Resonance Mapping」を追加し、出力前に「Physical Plausibility Check (物理的妥当性)」を義務化。
• 動画生成拡張 (Phase 4): Veoモデル等の動画生成を前提とした Temporal Interpolation フローを新設し、静止画(Phase 1〜3)からのシームレスな移行を定義。
• 自動フォールバックの重み付け: F1〜F3の複合エラー時に推論迷いを防ぐため、Priority (Safety > Constraints > Context > Completeness) を明文化。
• 全参照の完全一致化: SST保護のため、ファイル名と全見出し文字列の完全な整合を達成。

## 6) Migration Checklist (v9 v10 最小)

1. v9参照をv10ファイル名へすべて更新したことを確認
2. R台帳にR300レンジを追加し、RID未解決がないことを確認
3. 02_Operational_Core の State Vector (Micro Spine) のタグ要件が記述されていることを確認
4. 02_Operational_Core の Cross-Domain Analogy と Red Teaming に、例外スキップ条件 (Tight/Critical/DP_S/Dependency時) が追記されていることを確認
5. 01_Preset_Catalog の A_Production_Safe Layer に、Phase 4 (動画)移行時のバイパス条件が追記されていることを確認
6. 05_QA_and_Validation の Fast Fix 4.33 に、QA_ERR_A_016 (動画承認スキップ) の修復手順が定義されていることを確認
7. 07_Reference_Guide の SST Ownership Map に新機能 (Phase 4 等) が完全一致の参照フォーマットで登録されていることを確認
8. Ignition Prompt の参照先が `v10` に完全にアップデートされていることを確認

END OF 08_NEXUS_Legacy_v10.md
