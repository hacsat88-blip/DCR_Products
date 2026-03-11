# PRISM v3.2 — Structured Prompt Schema
# Phase 3 で YAML 出力時に使用する。
# 3層構造: intent / blueprint / prompts + variants

intent:
  purpose: ""
  canvas: { ratio: "", size: "", medium: "" }
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
  weight_guide: { core: 1.3, support: 1.0, suppress: 0.7 }

# Variant Engine 出力構造
# Single-Axis: 差分軸1本で最大3変種
# Variant Matrix: 2軸×2値で最大4変種
# いずれの場合も diff には blueprint / prompts 内の変更フィールドのみを記載する
variants:
  - axis: ""         # 差分軸の名称（例: "色温度", "時間帯"）
    label: ""        # この変種の識別名（例: "寒色シフト", "夕暮れ版"）
    diff: {}         # blueprint または prompts 内の差分フィールドのみ
