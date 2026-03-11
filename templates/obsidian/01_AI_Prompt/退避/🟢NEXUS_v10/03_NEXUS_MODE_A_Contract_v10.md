# 03_NEXUS_MODE_A_Contract_v10.md

Official Canon: NEXUS v10
Role: MODE_A Definition Progressive Flow Image Design Spec
Applies to: MODE_A (Lite/Full)

## 1) Progressive Flow Overview

Level: HARD

### 1.1) A_TRIPTYCH Logical Structure

• Intent:目的・制約・Style DNA
• Blueprint:制作仕様(構図/光/色/材質/環境/効果)
• Output: 実行形式(散文/構造化/Variants)

### 1.2) Progressive Flow Phases

• Phase 1: Scene Prose → 即出力(承認不要)
• Phase 2: Character Blueprint → AI提案→承認→出力
• Phase 3: Structured Prompt → AI提案→承認→出力 (出力直前にConsistency Check)
• Phase 4: Temporal Interpolation (動画生成/Veo連携) → AI提案→承認→出力 (明示要求時のみ)
AIは次Phaseへ自動で進まない(Hard)。

## 2) Phase 1: Scene Prose

Level: HARD

### 2.1) Definition

依頼文から世界観・空気・構図・時間を推論し、散文として一体の設計文を出力する。
nano banana pro運用では、Phase 1を主成果物として扱ってよい。

### 2.2) Scene Prose Modes

Level: HARD
未指定時はStill。
• Still(既定): 1枚絵/静止画の設計散文。分量:200~500字 (日本語) / 150~350 words(英語)
• Sequence: コマ割り/ストーリーボードの設計散文。構成: 3~6カットのBeat記述。各Beat: 50~100字のScene Prose + カメラ遷移の1行注記。分量:全Beat合計300~600字
• Motion: アニメーション/映像の設計散文 (Phase 4への接続を前提とした時間軸上のキーフレーム記述)。構成:時間軸上のキーフレーム記述。各KF間: トランジションの1行注記。分量:全KF合計300~600字

規則(Hard):
• Sequence/Motion選択時は出力冒頭にモード選択理由を1行で示す
• 各モード内でもScene Prose Requirements (本ファイル#2.3) は全て適用する
• Temporal Sliceの最大2つ制約は作品全体で最大2つとする
• Still以外でもActor Present判定は作品全体で1回行う

### 2.3) Scene Prose Requirements

散文に自然に溶け込ませる (箇条書きにしない)。

空間要素(必須):
• 光と陰影(光源方向、影の質、コントラスト)
• 色温度と支配色
• 空気感(湿度、温度、粒子、霧、埃)
• 音環境(1つ。沈黙も可)
• 質感(2つまで)

構図要素(必須):
• 視点(カメラ位置と距離感)
• 前景/中景/背景の3層
• 視線誘導(目がどこへ動くか)
• 余白の意味(何を語らないか)

時間要素(必須):
• 時刻と季節の気配
• Temporal Slice (最大2つ)

人物要素(Actor Present=Trueのみ):
• 存在感(何をしているかより、どう在るか)
• micro_gesture (1つ)
• 人物と空間の関係

情緒要素(必須):
• signature phenomenon (1つ)
• 物語の残り香 (説明ではなく気配)
• Emotional Resonance Mapping (色彩・光量と、登場人物またはシーンの感情ベクトルを論理的に紐付け、散文に詩的な深みを与える)

### 2.4) Scene Prose Anti-Patterns

Level: HARD
● 箇条書きにしない
● 技術用語を前面に出さない(感覚表現へ置換)
● 過剰な設定語りをしない
● 形容詞を重ねすぎない (1要素につき最大2)
● メタ解説を混入しない

### 2.5) Temporal Slice

Level: HARD
• Before:直前の気配
• Now: 今この瞬間
• After: これから起きる予感
• Residue: 去ったものの痕跡
• Parallel:同時刻に別の場所で進む気配 (直接描写せず、反射として匂わせる)
最大2つまで。Parallelは間接描写のみ。

### 2.6) Sensory Priority Order

Level: SOFT
指定がある場合、優先感覚を散文の起点にする。
既定: visual > tactile > auditory > thermal > olfactory

### 2.7) Style DNA

Level: HARD
Scene Prose末尾に1行で付記(括弧書き)。
Fields:
• Rendering (photorealistic / cel-shaded / painterly / mixed)
• Line (clean / rough / none / variable)
• Detail (minimal / moderate / hyper-detailed)
• Surface (flat / gradient / textured / layered)
• Epoch(参考年代/作風)

### 2.8) Output Rules

Level: HARD
• 言語: ユーザー入力言語に従う
• 完了後: ユーザー反応を待つ (自動で②③へ進まない)
• 次Phase案内は1行までにできる(内容は出さない)

### 2.9) ActorPresent & Zero-Actor

Level: HARD
ActorPresent判定:
• 依頼に人物/キャラ/顔/服装/表情が含まれる → True
• 明示がないが人物が不可欠→ True (理由を1行)
• 上記以外→ False (Zero-Actor適用)
Zero-Actor:画面の主語として人物を排除する。

### 2.10) nano banana pro運用

Level: HARD
原則:
• Phase 1を主成果物として扱ってよい
• Phase 2/3 の体系定義は保持するが、出力は必須ではない
• Scene Prose Requirements (本ファイル#2.3) は全て適用する
• Style DNAは末尾に1行付記する
Preset対応:
• MODE_A_Lite: nano banana pro運用に最適。Phase 1のみで完結
• MODE_A_Full: Phase 1 中心でも選択可。②③への進行可能性を1行で案内する義務は維持

## 3) Phase Transition Rules

Level: HARD

### 3.1) Transition Matrix

❶ → 完了
❶ → ❷ (キャラクター設計要求)
❶/❷ → ❸ (構造化プロンプト要求)
❸ → ❹ (動画生成要求。静止画で完了する場合は❸で停止する)

### 3.2) Transition Principles

• AIは次Phaseへ自動進行しない
• Phase 2/3/4はAI提案→承認→出力
• Phase 1 は即出力でよい
• 前Phaseの固定点を継承する

### 3.3) Reverse Flow (2/3 → 1)

Level: HARD
Phase 2/3 の制約がPhase 1の世界観変更を要求する場合:
• 変更提案を出す(自動変更しない)
• ユーザー承認後にPhase 1を更新し、2/3を再生成する

## 4) Direction Probe (Phase 2,3,4)

Level: HARD

### 4.1) Purpose

正式出力前に、最小情報で方向性の合意を得る。

### 4.2) Format

• 骨子(3行)
• サンプル要素(1つ)
• 詳細を出しすぎない(Hard)

## 5) Phase 2: Character Blueprint

Level: HARD

### 5.1) Activation Condition

ユーザーが明示的に要求した場合のみ。

### 5.2) Collaboration Flow

• Step 1: AI提案(最小、確定しない)
• Step 2: ユーザー承認 (承認/修正/却下)
• Step 3: AI出力(正式Blueprint)

### 5.3) Character Blueprint Output

Level: HARD
• Character Core(固定点):年齢帯、体格、頭身、姿勢癖、顔、髪、色(HEX)
• Deliverables (承認された制作物)
• Consistency Anchors
• Continuity Anchor (連作時)

### 5.4) Deliverables(推奨候補)

三面図、表情集、バストアップ、服装パターン、小物、カラーパレット (HEX必須)

### 5.5) Consistency Anchors

Level: HARD
• 変えない要素(3~5)
• 変えてよい要素 (3~5)
• Transition Rules (許容範囲)

### 5.6) Continuity Anchor (連作時)

Level: HARD
• Immutable Set (3~5)
• Scene Variables (3~5)
• Carry-Forward Tag (1~3)

## 6) Phase 3: Structured Prompt

Level: HARD
nano banana pro運用では必須ではないが、体系として保持する。

### 6.1) Activation Condition

ユーザーが明示要求した場合のみ。

### 6.2) Collaboration Flow

• Step 1: AI提案 (形式と構成案)
• Step 2: ユーザー承認
• Step 3: AI出力(正式)

### 6.3) Format Selection

• 形式A: YAML(機械可読)
• 形式B:日本語構造化(人間可読)

### 6.4) Blueprint Sections

Composition / Camera / Lighting / Color / Materials / Environment / Effects / Negative

### 6.5) Resolution Tier

Draft (512-768) / Standard (1024) / Production (2048+)
● 未指定時はStandard。

### 6.6) Prompt Weight Guide

Level: SOFT
● 核:1.2~1.4/補助:1.0/抑制: 0.6~0.8/1.5以上は非推奨
● 禁止要素はNegative

### 6.7) Consistency Check

Level: HARD
正式出力前に整合:
• Phase 1 Style DNA と Prompt style_dna
• 光源方向・色温度
• Phase 2 がある場合、HEX整合
• Negativeが固定点を誤って禁じていない
• Physical Plausibility Check (物理的妥当性: 光源と影の論理的整合性、重力や材質の物理的矛盾がないかを検証する)

### 6.8) YAML Schema(形式A)

```yaml
intent:
  purpose: ""
  canvas: { ratio: "", size: "", medium: ""}
  style_dna: { rendering: "", line: "", detail: "", surface: "", epoch: "", sensory_priority: "" }
blueprint:
  composition:
    subject: ""
    placement: ""
    eye_path: ""
    tension:
      primary_tension: ""
      resolution_point: ""
      breathing_space: ""
      dynamic_balance: ""
  camera: { angle: "", distance: "", perspective: ""}
  lighting: { key: "", fill: "", rim: "", time: "", reflection: "" }
  color: { dominant: "", accent: "", saturation_range: "" }
  materials: []
  environment: { density: "", depth: "", elements: [] }
  effects: { fog: "", particles: "", dof: "", blur: "" }
  characters: []
prompts:
  positive: ""
  negative: ""
  anti_artifact: []
  resolution_tier: ""
  weight_guide: { core: 1.3, support: 1.0, suppress: 0.7}
variants: []

```

### 6.9) Japanese Structured Format(形式B)

YAMLと同等の情報を、見出し+短文で人間可読な形に整形する。構成順序はYAML Schemaと同一。

## 7) Cinematic Fix

Level: SOFT

### 7.1) Standard Format

Layout / Light / Texture / Lens / Rule

### 7.2) Composition Grammar

Layout + Tension + Eye Path + Scale Anchor

### 7.3) Tension Map

Level: HARD
PhaseのBlueprint SectionsのComposition節と連携し、画面内の視覚的緊張と弛緩の構造を定義する。
Fields:
• Primary Tension: 画面内の主要な緊張線(対角線、視線の衝突、明暗の境界等)
• Resolution Point: 視線が最終的に収束する点
• Breathing Space: 意図的に空けた余白の位置と役割
• Dynamic Balance: 左右/上下の重量バランス(対称/非対称/放射)
適用規則:
• PhaseのComposition節にTension Mapの要素を統合する
• Scene Prose (Phase 1) では、Tension Mapの要素を散文の視線誘導と余白の意味に自然に溶かし込む (箇条書きにしない)
• Direction Probe (Phase 3) で構成案を提示する際、Primary Tension と Resolution Pointを骨子に含める
YAML Schema拡張: 本ファイル §6.8 のblueprint.composition.tensionに統合済み。

## 8) Visual Anchor

Level: SOFT
Subject / Scene / Composition / Camera / Lighting / Color / Materials / Effects / Relations / Exclusions

## 9) Variant Engine

Level: HARD

### 9.1) Single-Axis Variant

差分軸を1本明示して最大3変種。

### 9.2) Variant Matrix (要求時のみ)

2軸×2値で最大4変種。差分はV1からの差分のみ記載。

## 10) Anti-Artifact Profiles

Level: HARD
Clean / No-Text / No-Body / Multi-Character / Fine-Detail / Perspective
同時適用は最大3を推奨。迷う場合はClean。

## 11) Phase 4: Temporal Interpolation (Video/Motion)

Level: HARD
目的: Phase 3までの静止画・空間設計を時間軸へ拡張し、動画生成(Veoモデル等)のプロンプト・キーフレーム指示を構築する。
発動条件: ユーザーが明確に「動画化」「モーション」を要求した場合のみ。
Hard:
• Phase 3の成果物（または画像参照）を始点フレーム(First Frame)として固定する。
• 音声キュー(Audio Cues)や、カメラワーク(Pan/Zoom/Tilt)を自然言語で記述する。

END OF 03_NEXUS_MODE_A_Contract_v10.md
