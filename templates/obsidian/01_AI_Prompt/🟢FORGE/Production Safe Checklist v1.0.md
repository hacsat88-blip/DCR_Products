# Production Safe Checklist v1.0

> 商用制作時の品質検査チェックリスト。FORGE §3 Vision Quality Bar > Should から参照される。
> 本チェックリストが未提供の場合、FORGEはAnti-Artifact・解像度・破綻ワードを内部検証する。

- Version: 1.0
- Date: 2026-03-01

---

## 使用条件

- ユーザーが「商用」「量産」「納品」「第三者レビュー前」と明示した場合に適用する
- Depth Safety Netにより商用納品検知時はDeepに引き上げられる前提で設計
- ユーザーがAnti-Artifact ProfileやResolution Tierを明示指定した場合はそちらを優先する
- 動画生成（Motion）移行時は、動画モデル側のプロンプト仕様を優先し、静止画向けの本チェックリストをバイパスする

---

## 1. Anti-Artifact Profiles

破綻を予防するためのプロファイル。同時適用は最大3つ推奨。迷う場合はClean。

| Profile | 用途 | Negative節に追加する指示 |
|---------|------|--------------------------|
| **Clean** | 汎用。ノイズ・アーティファクト全般の抑制 | blurry, noisy, artifacts, deformed, low quality, watermark, text overlay |
| **No-Text** | 画面内の不要テキスト・文字化けの防止 | text, letters, words, watermark, signature, caption, subtitle |
| **No-Body** | 人体描写の破綻防止（手指・顔・関節） | extra fingers, extra limbs, deformed hands, fused fingers, bad anatomy, deformed face |
| **Multi-Character** | 複数人物の混線防止 | merged bodies, fused characters, extra heads, conjoined, clone |
| **Fine-Detail** | 細密描写時の崩れ防止 | blurry details, smudged lines, low resolution texture, pixelated |
| **Perspective** | パース・空間整合性の破綻防止 | broken perspective, inconsistent vanishing point, floating objects, impossible shadow angle |

### 組み合わせ推奨

- 人物あり商用: Clean + No-Body + （多人数なら Multi-Character）
- 背景・風景商用: Clean + Perspective + Fine-Detail
- テキスト含む商用: Clean + No-Text

---

## 2. Resolution Tier

| Tier | ピクセル範囲 | 用途 |
|------|-------------|------|
| **Draft** | 512〜768 | ラフ確認・構図チェック。**商用では使用禁止** |
| **Standard** | 1024 | Web用・SNS用。商用最低ライン |
| **Production** | 2048+ | 印刷・大型ディスプレイ・アーカイブ。商用推奨 |

- 商用時はStandard以上を必須とする。未指定時はProductionを推奨する
- Resolution Tierは Structured Prompt の resolution_tier フィールドに明記する

---

## 3. Prompt Weight Guide

核となる要素と抑制要素の重み付け指針。

| 区分 | Weight範囲 | 説明 |
|------|-----------|------|
| **核（Core）** | 1.2〜1.4 | 画面の主題・最も重要な要素 |
| **補助（Support）** | 1.0 | 場面を構成する標準要素 |
| **抑制（Suppress）** | 0.6〜0.8 | 存在するが目立たせたくない要素 |

- 1.5以上は非推奨（モデルによっては破綻を誘発する）
- 禁止要素はWeightではなくNegative節に配置する
- Structured Prompt の weight_guide フィールドに記載する

---

## 4. 破綻ワードチェックリスト

Negative節に以下が含まれていないか確認する:

- [ ] 固定点（Style DNA、Character Anchorsのimmutable要素）をNegativeが誤って禁じていないか
- [ ] Anti-Artifact Profileの指示がNegativeに反映されているか
- [ ] 矛盾する指示がPositiveとNegativeに同時に存在していないか
- [ ] Negativeが過剰に長くないか（20語以内を推奨。超過時は優先順位で絞る）

---

## 5. Physical Plausibility Check

Structured Prompt出力前に以下を内部検証する:

- 光源方向と影の落ち方が論理的に整合しているか
- 重力・材質の物理的矛盾がないか（浮遊物の理由、液体の挙動等）
- Scene ProseのStyle DNAとStructured Promptのstyle_dnaが一致しているか
- Character Blueprintが存在する場合、HEX値が一致しているか
- 色温度の指定と光源種類が矛盾していないか

---

## 6. 商用チェックフロー

1. Anti-Artifact Profile を選択する（迷ったらClean）
2. Resolution Tier を確認する（Draft→不可。未指定→Production推奨）
3. Prompt Weight Guide を適用する（核1.2〜1.4 / 補助1.0 / 抑制0.6〜0.8）
4. Negative節を破綻ワードチェックリストで検証する
5. Physical Plausibility Check を実施する
6. 全チェック通過後にStructured Promptを出力する