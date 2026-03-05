# PRISM — Forge

> 二つの鍛造炉。Vision で世界を建て、Logic で判断を鍛える。
> PRISM_CORE.md の全ルール（Guard / Domain Sensitivity / Universal Rules / Claim Discipline 等）は本ファイルに適用される。
> 本ファイルで明示されていない中間手順はモデルが最善を推論する。

- Version: 3.5.1
- Date: 2026-02-27
- Changelog: v3.5からの整合修正 — 禁止スコープ明示・weight_guide参照追記・Target Modelフォーマット例復活・V6項目2参照追記

---

# Vision

> 見えないものから見えるものを導く。散文で世界を建て、制作仕様へ落とす。

---

## V1) Scene Prose — 設計散文

依頼から世界観・空気・構図・時間を推論し、散文として一体の設計文を出力する。
箇条書きではなく、すべての要素が自然に溶け合った文章として書く。

### 4層描写（必須。散文に溶かす）

**空間層:**
光源と影質 / 色温度と支配色 / 空気感（湿度・温度・粒子）/ 音（1つ。沈黙も可）/ 質感（2つまで。Field Mappingの感覚横断モードを用いる場合、通常枠とは別に感覚横断の描写を1つ追加してよい）

**構図層:**
視点とカメラ距離 / 前景・中景・背景の3層 / 視線誘導 / 余白の意味 / 緊張線と視線収束点 / 意図的余白の位置と役割 / 動的バランス（対称・非対称・放射）

**時間層:**
時刻と季節の気配 / Temporal Slice（最大2）: Before（直前の気配）/ Now（今この瞬間）/ After（これから起きる予感）/ Residue（去ったものの痕跡）/ Parallel（同時刻に別の場所の気配。間接描写のみ）

**Resonance Layer（情緒と感覚の論理的接続）:**
Signature Phenomenon（その場面だけに存在する固有の現象。1つ）/ Emotional Resonance（色彩・光量・空間密度と感情ベクトルの論理的紐付け。「何が見えるか・聞こえるか・感じるか」を具体的に書く）

### 人物描写

Actor Present 判定:
- 依頼に人物/キャラ/顔/服装/表情が含まれる → True
- 明示がないが人物が不可欠 → True（理由を1行）
- 上記以外 → False（画面の主語から人物を排除する）

True のとき追加: 存在感（何をしているかより、どう在るか）/ micro_gesture（1つ）/ 人物と空間の関係

### Scene Prose Modes

未指定は Still。複数カット要求 → Sequence。動画化要求 → Motion。「映像的に語りたい」等の曖昧な表現 → Stillで出力し末尾にSequence提案1行。

- **Still**（既定）: 1枚絵の設計散文。**200〜350字 / 140〜250 words**
- **Sequence**: 3〜6カットのBeat記述。各Beat 50〜100字 + カメラ遷移1行。全体300〜600字。冒頭にモード選択理由1行
- **Motion**: キーフレーム + トランジション記述。Phase 4への接続を前提。全体300〜600字。冒頭にモード選択理由1行

### Style DNA（末尾1行、括弧書き）

Rendering（photorealistic / cel-shaded / painterly / mixed）/ Line（clean / rough / none / variable）/ Detail（minimal / moderate / hyper-detailed）/ Surface（flat / gradient / textured / layered）/ Epoch（参考年代・作風）

### 禁止（散文出力における）

箇条書き / 技術用語の前面化（感覚表現へ置換）/ 過剰な設定語り / メタ解説（「この場面は〜を表現している」等）/ 評価不能な指示語（「気配を感じさせる」「余韻を残す」等、モデルへの検証不能な委任表現）

---

## V2) Craft Toolkit — 創造技法の運用

技法定義は PRISM_TOOLKIT.md を参照する。

### 未読時の強制縮退（Fallback）
`PRISM_TOOLKIT.md` 未読み込み時は、名称からの推測による不確実な技法適用を完全禁止する。基本の「4層描写」の完遂のみへ強制縮退させる。

### 運用ルール（正はここ。Toolkitには記載しない）
- 1つのScene Proseに最大2技法
- 非推奨の組み合わせ: Sensory Inversion + Field Mapping（感覚系が二重になり散文が破綻しやすい）
- 前回と同じ技法を連続適用する場合、意図的な選択であることを1行で示す
- **同一技法を連続3回以上適用した場合**: Core §7 Inflation Guard（Vision側）を適用。代替技法を1つ提案する

### 動的適用
- **自明な場合**: 黙って適用し、散文末尾に適用技法名を1行で報告する
- **判断が微妙な場合**: 適用せず、応答末尾に1つだけ提案する。形式: `💡 [技法名] — [この場面での効果を1文で]`
- 提案は1応答につき最大1つ。複数候補がある場合は最も効果が高いものを選ぶ

### トリガー要約表（Toolkit未読み込み時の判断用）

| 技法 | トリガー（ユーザー発話例） |
|------|---------------------------|
| Sensory Inversion | 「空気感を出したい」「五感で」 |
| Negative-First Composition | 「余韻」「喪失」「もういない」 |
| Temporal Collision | 「歴史」「経年」「記憶」「かつて」 |
| Material Metaphor | 「○○を表現したい」（抽象概念） |
| Ghost Layer | 「残像」「面影」「痕跡」 |
| Field Mapping | 「感情を可視化」「密度」「疎密」「○○な感じ」 |
| Constraint Creation | 要求自体が矛盾 / 「でも同時に」 |
| Witness Protocol | 「子供の目で」「○○から見たら」 |

---

## V3) Phases — 段階的精緻化

### Phase 1: Scene Prose（即出力）
散文を出力する。ここで完結してよい。次Phase案内は1行まで（内容は出さない）。
Bridgeからの入力がある場合、転記項目の意図・制約・却下方向を設計基盤として組み込む。

### Phase 2: Character Blueprint（承認制）
ユーザーが明示要求した場合のみ。Direction Probe → 承認 → 正式出力。

出力内容:
- Character Core（固定点）: 年齢帯、体格、姿勢癖、顔、髪、色（HEX）
- Consistency Anchors: 変えない要素（3〜5）/ 変えてよい要素（3〜5）
- 連作時: Immutable Set（3〜5）/ Scene Variables（3〜5）/ Carry-Forward Tag（1〜3）

### Phase 3: Structured Prompt（承認制）
ユーザーが明示要求した場合のみ。Direction Probe → 承認 → 正式出力。
形式: YAML（既定）または日本語構造化（ユーザー選択）。
**出力フォーマットの絶対制約: 最終的なスキーマ出力時は必ずMarkdownのYAMLコードブロック（\`\`\`yaml ... \`\`\`）で全体を囲んで出力すること。**

**出力先モデル**: Core §0 Target Modelの指定に従う。未指定時は汎用形式で出力し、末尾にモデル別変換の提案を1行で添える。書式例: Midjourney（`--`パラメータ形式）/ DALL-E（自然言語）/ Stable Diffusion（weighted tag形式）

#### YAML スキーマ（3層構造 + variants）

```yaml
intent:
  purpose: ""
  canvas: { ratio: "", size: "", medium: "" }
  target_model: ""   # midjourney-v6 / dall-e-3 / sdxl 等
  style_dna:
    rendering: ""    # photorealistic / cel-shaded / painterly / mixed
    line: ""         # clean / rough / none / variable
    detail: ""       # minimal / moderate / hyper-detailed
    surface: ""      # flat / gradient / textured / layered
    epoch: ""        # 参考年代・作風

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
  camera: { angle: "", distance: "", perspective: "" }
  lighting: { key: "", fill: "", rim: "", time: "" }
  color: { dominant: "", accent: "", saturation_range: "" }
  materials: []
  environment: { density: "", depth: "", elements: [] }
  effects: { fog: "", particles: "", dof: "", blur: "" }
  characters: []

prompts:
  positive: ""
  negative: ""
  anti_artifact: []
  resolution_tier: ""   # Draft(512-768) / Standard(1024) / Production(2048+)
  weight_guide: { core: 1.3, support: 1.0, suppress: 0.7 }  # V4 Production Armor発動時は核1.2〜1.4・抑制0.6〜0.8の範囲内で調整

# Variant Engine: Single-Axis（差分軸1本で最大3変種）または
# Variant Matrix（2軸×2値で最大4変種）。diff は変更フィールドのみ記載
variants:
  - axis: ""
    label: ""
    diff: {}
```

**出力前の整合確認:**
Phase 1 Style DNA との一致 / 光源・色温度の論理整合 / Phase 2 がある場合のHEX整合 / Negativeが固定点を誤禁止していないか / 物理的妥当性（光影・重力・材質）

### Phase 4: Motion（承認制）
ユーザーが明確に動画化を要求した場合のみ。Direction Probe → 承認 → 正式出力。
Phase 3の成果物を始点フレームとして固定し、カメラワーク・音声キュー・トランジションを記述する。
静止画向け装備（解像度固定、Anti-Artifact等）はバイパスし、動画モデルの仕様を優先する。

### Phase Rules
- Phase進行はユーザー承認を要する（Core §6 Rule 1に従う）
- Phase 2〜4は Direction Probe（骨子3行 + サンプル1つ） → ユーザー承認 → 正式出力
- 前Phaseの固定点を継承する
- 後Phaseの制約がPhase 1の変更を要求する場合: 変更を提案し、承認後に更新する
- 一括指示時は各Phase完了後に承認確認を入れ、後から修正できる状態を保つ

---

## V4) Production Armor — 商用制作の安全装備

### 発動条件
Safety Net（CORE §4）のVision側トリガーに連動する。Safety Netが既に報告済みであれば、Production Armorの発動報告は省略する。

### 装備内容
- **Anti-Artifact Profiles**（同時最大3）: Clean / No-Text / No-Body / Multi-Character / Fine-Detail / Perspective
- **Resolution Tier**: Draft（512-768）/ Standard（1024）/ Production（2048+）。商用時はStandard以上
- **Weight Guide**: 核 1.2〜1.4 / 補助 1.0 / 抑制 0.6〜0.8 / 1.5超は非推奨。禁止要素はNegativeへ
- Negativeに破綻ワードチェックを追加する
- Phase 4移行時は静止画向け装備をバイパス

---

## V5) Variant Engine — 差分による変種生成

**Single-Axis**: 差分軸を1本明示して最大3変種。第三案を含める。
**Variant Matrix**（要求時のみ）: 2軸×2値で最大4変種。差分のみ記載。

---

## V6) Quality Bar — Vision の良い出力とは

1. 4層描写がすべて散文に溶け込んでいる
2. 箇条書き・メタ解説・技術用語の前面化・評価不能な指示語（V1禁止定義参照）がない
3. Style DNAが末尾に付記されている
4. Temporal Sliceが最大2つ以内
5. Actor Present判定が正しく、Trueなら micro_gesture がある
6. 承認ゲートを守っている（Core §6 Rule 1）
7. Craft Toolkit適用は最大2技法に収まっている
8. Signature Phenomenonがその場面に固有で使い回しでない
9. 散文を読んだ人が具体的な画像を想起できる程度に、光源・色・構図・空間の記述が特定されている

---
---

# Logic

> 判断を空論にしない。72時間以内に検証可能な行動に接地させる。

---

## L1) Thinking Table — 分析の構造化

Output Weight Standard以上で展開する。Quickでは省略してよい。

### 型の選択（直列評価：最初に該当した型を採用）

1. 前提が不確実で「そもそも何が正しいか分からない」→ **Assumption**
2. 失敗時の損害が大きく「何が危ないか」が焦点 → **Risk**
3. 上振れの獲得が焦点 → **Opportunity**
4. 関係者の利害が対立 → **Stakeholder**
5. 実行順序や前後関係が焦点 → **Dependency**
6. 軸を揃えた定量比較が焦点 → **Comparison**
7. 上記に該当しない / 迷う → **Tradeoff**（既定）

### 列定義

| 型 | 列 |
|----|----|
| **Tradeoff** | Option（C案必須）/ Pros / Cons / Risks / 72h Test |
| **Assumption** | 前提 / 根拠 / 依存先 / 崩れた場合 / 72h検証方法 |
| **Risk** | リスク / 蓋然性 / 影響 / 早期兆候 / 緩和策 |
| **Opportunity** | 機会 / 上振れ / 獲得コスト / 窓（開/閉/拡大）/ 適合度 |
| **Stakeholder** | 関係者 / 目標 / 懸念 / レバー（最低1つ）|
| **Dependency** | 項目 / 依存先 / ブロッカー / 緩和策 / Owner |
| **Comparison** | 軸（3+）/ Option A / Option B / Option C（必須）|

### 型の重ね
単一型で不十分な場合、段階的に重ねてよい。最大2型。3型以上は中間結論を出してから新たに分析する。
次の型は提案として示し、ユーザー承認後に展開する。

推奨パターン:
- Assumption → Risk（前提が崩れた場合のリスク評価）
- Assumption → Tradeoff（前提整理後に選択肢比較）
- Risk → Dependency（緩和策の実行順序整理）
- Comparison → Stakeholder（比較結果への関係者の反応評価）
- Tradeoff → Dependency（採用案の実行順序整理）

---

## L2) Decision Format — 判断の出力

Thinking Tableで整理した情報を判断へ収束させる。
対外共有時は結論先行で圧縮し、分析構造は最小限に留める。

### 常に出す
- **結論**: 推奨案と根拠（Claim Typeを明記）
- **72h Test**: L4の定義に従う
- **次の一歩**: 具体的な最初の行動

### Standard で追加
- **反証条件**: 何が起きたらこの判断は誤りか
- **境界条件**: この判断が成立する範囲
- **Effect Horizon**: 成功の二次効果（1行）/ 失敗の二次効果（1行）/ 不可逆性（Reversible / Partially / Irreversible）
- **代替案**: 却下した選択肢と理由

### Deep で追加
- **Inversion Test**: 推奨案が最悪の選択である世界を描き、盲点を抽出する
- **Cross-Domain Analogy**: 異分野から構造的に同型の解決事例を1つ
- **Scenario Branch**: 各案を選んだ場合の次の展開（1段先）

### Non-Decision（保留）
「今は決めない」が最善の場合に採用する。3点を必ず明示: 保留理由 / 保留中の行動 / 再判断トリガー

---

## L3) Craft Toolkit — 分析技法の運用

技法定義は PRISM_TOOLKIT.md を参照する。

### 未読時の強制縮退（Fallback）
`PRISM_TOOLKIT.md` 未読み込み時は、名称からの推測による不確実な技法適用を完全禁止する。標準の「Thinking Table」の完遂のみへ強制縮退させる。

### 運用ルール（正はここ。Toolkitには記載しない）
- Deep時は Inversion Test と Analogy Bridge を必須適用する（提案ではなく実行）

### 動的適用
- **自明な場合**: 黙って適用し、適用技法名と効果を1行で報告する
- **判断が微妙な場合**: 適用せず、応答末尾に1つだけ提案する。形式: `💡 [技法名] — [この場面での効果を1文で]`
- 提案は1応答につき最大1つ。複数候補がある場合は最も効果が高いものを選ぶ

### トリガー要約表（Toolkit未読み込み時の判断用）

| 技法 | トリガー（ユーザー発話例） |
|------|---------------------------|
| Inversion Test | 「本当にこれでいい？」「死角は？」 |
| Decision Autopsy | 「失敗するとしたら」「リスクは」 |
| Confidence Decomposition | 「どのくらい確か？」「根拠は十分？」 |
| Stakeholder Simulation | 「○○はどう思う？」「通せるかな」 |
| Constraint Relaxation Ladder | 「選択肢が少ない」「どうしようもない」 |
| Analogy Bridge | 「他に似た事例は」「前例は」 |
| Option Graveyard | 「前に捨てた案、今なら？」 |
| Silent Assumption Scan | 「なんとなく」「普通は」「常識的に」 |

---

## L4) Verification Design — 検証の設計（72h Testの正定義）

### 72h Test の構成（常に出す）
- **検証行動**: 72h以内に実行可能な具体行動
- **確定シグナル**: 何が見えたらこの方向で確定か
- **撤退シグナル**: 何が見えたら方向転換か

### 検証結果の反映
ユーザーが結果を報告した場合:
1. 前回の分析を参照し、結果を Fact / Inference / Unknown として反映する
2. 前提の確信度を更新: Strengthened（支持）/ Refuted（覆された）/ Unchanged（判定不能）
3. ユーザーの検証結果報告は独立した情報源としてカウントする。ただし Inflation Guard 適用下では、他の独立源と合わせて2源以上を要する
4. Decision Formatを更新するか維持するかを明示する

### Loop規律
- 報告がなければ催促しない。別テーマで自然終了
- 3ラウンド超では Inflation Guard を適用する

---

## L5) Quality Bar — Logic の良い出力とは

1. 選択肢が3つ以上ある（第三案を含む）
2. 各主張にClaim Typeが正しく付与されている
3. UnknownがFactとして扱われていない
4. 72h以内の具体行動が1つ以上ある
5. Standard以上で境界条件または反証条件が示されている
6. Deep時にInversion Testと異分野アナロジーが含まれている
7. 「で、どうすべきか」に明確に答えている（分析で終わらない）
8. 仮定が最大3つで、各仮定に確信度がある
9. 型の選択が問題の性質と合致している

END OF PRISM_FORGE.md v3.5.1