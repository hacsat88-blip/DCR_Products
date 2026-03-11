# Character Design Sheet v1.0

# キャラクター設計の外部ナレッジ。FORGE §3 段階的精緻化 > Character Blueprint から参照される。
# 対象モデルには依存しない。Structured Prompt段階でモデル別に変換する。

# - Version: 1.0
# - Date: 2026-03-01
# - Lineage: PRISM Character Design Sheet v2.1 → FORGE Character Design Sheet v1.0

# ---

# 使用条件:
# - ユーザーがCharacter Blueprintを明示要求し、本シートがナレッジとして提供されている場合に適用する
# - 本シートが未提供の場合、FORGEの最小定義（Character Core + Consistency Anchors）で進む
# - 参照画像がある場合、画像の作風・プロポーション・色彩を正として本シートの記述より優先する

general_character_design_sheet:

  style:
    base_art_style: "Based on the unique art style, coloring technique, and proportions found in the provided reference image."
    quality: "Clean, precise line work with accurate colors."
    background: "Pure white background for a clean, professional layout."

  character_definition:
    core_identity: "The specific character depicted in the provided reference image."
    feature_preservation: "Maintain all core visual features (clothing, accessories, hair, specific equipment details, and character-specific traits) consistently across all panels."

  color_palette:
    description: "キャラクターの色彩同一性を維持するための公式カラー定義。"
    fields:
      - primary_color:
          role: "面積最大の主色（服装・髪・体表の支配色）"
          value: ""
      - secondary_color:
          role: "主色を補う副色（服装の別パーツ・靴・帽子等）"
          value: ""
      - accent_color:
          role: "差し色（瞳・装飾・エフェクト等。画面の5〜15%）"
          value: ""
      - skin_tone:
          role: "肌色（影色の基準にもなる）"
          value: ""
      - hair_color:
          role: "髪色（グラデーションがある場合は根元→毛先の順で2色）"
          value: ""
    constraints:
      - "全パネルで同一パレットを使用する。照明条件による色温度シフトは許容するが、固有色（HEX）自体は変更しない。"
      - "参照画像からスポイトで抽出した色を正とする。記述と画像で差異がある場合は画像を優先。"

  costume_patterns:
    description: "通常衣装を基本とし、バリエーションがある場合に追加定義する。"
    max_variations: 3
    fields:
      - id: "costume_default"
        label: "通常 (Default)"
        description: "参照画像に描かれた基本衣装。"
        notes: "Consistency Anchorsの「変えない要素」が最も厳格に適用される衣装。"
      - id: "costume_alt_1"
        label: ""
        description: ""
        diff_from_default: ""
      - id: "costume_alt_2"
        label: ""
        description: ""
        diff_from_default: ""
    constraints:
      - "バリエーション間で変えてよい要素と変えない要素はConsistency Anchorsに従う。"
      - "差分のみ記述し、defaultと共通する部分は繰り返さない。"

  accessories_and_equipment:
    description: "固定装備と可変装備を分離し、一貫性と柔軟性を両立する。"
    fixed:
      description: "全衣装・全シーンで必ず存在する装備。キャラクター同一性の核。"
      items: []
    variable:
      description: "シーンや衣装によって有無が変わる装備。"
      items: []
    constraints:
      - "fixedアイテムは全パネル・全衣装で描写する。描き忘れは不整合として扱う。"
      - "variableアイテムはappears_inに記載された衣装/シーンでのみ描写する。"

  chibi_sd_variation:
    description: "デフォルメ版キャラクターの設計仕様。"
    fields:
      - head_body_ratio: ""
      - deformation_rules:
          simplify: "細部を省略する要素（装備の小パーツ、服の皺、髪の毛束数等）"
          preserve: "デフォルメしても必ず残す要素（シルエット、固定アクセサリ、瞳の色、髪色）"
          exaggerate: "誇張する要素（頭部、瞳、特徴的なアクセサリ）"
      - expression_style: "表情はSD特有の大げさな描写を許容する。ただしキャラクターの性格を逸脱しない。"
    constraints:
      - "color_paletteは通常版と完全に一致させる。"
      - "Consistency Anchorsの「変えない要素」はデフォルメ後も識別可能に保つ。"
      - "deformation_rules.preserveに記載された要素はSD版でも省略しない。"

  consistency_anchors:
    description: "キャラクターの同一性を維持するための固定点と可変点の定義。"
    immutable:
      description: "変更すると別キャラクターになる要素。全パネル・全衣装・全バリエーションで厳守。"
      items: []
    mutable:
      description: "シーン・衣装・表情に応じて変更してよい要素。"
      items: []
    carry_forward_tags:
      description: "連作時に次のシーンへ引き継ぐ状態タグ。"
      max: 3
      items: []
    mutation_trigger: "immutableへの変更要求は、FORGEの再設計トリガーとして扱い、ユーザー承認を必須とする。"

  layout:
    sections:
      - id: "multi_view_reference"
        title_label: "マルチビュー・リファレンス"
        panel_layout: "Black-outlined panel containing multiple views with Japanese text labels."
        views:
          - view: "正面 (Front View)"
            description: "Full-body front view of the character, as depicted in the reference image."
          - view: "側面 (Side View)"
            description: "Profile view showing side details, accessories, and any side-mounted weapons/gear."
          - view: "背面 (Back View)"
            description: "Rear view showing the details of the back armor, clothing patterns, backpacks, capes, or tail (if applicable)."
          - view: "斜め前 (Three-Quarter View)"
            description: "A three-quarter front view showing details from both the front and side."
          - view: "上から (View from Above)"
            description: "Top-down view focusing on the head, hair structure, shoulders, and headwear."
          - view: "下から (View from Below)"
            description: "Low-angle view looking up from the feet, detailing the soles of footwear and underside of armor/clothing."

      - id: "expression_sheet"
        title_label: "表情集"
        panel_layout: "Close-up heads (bust-ups) with specific expressions and labels."
        expressions:
          - expression: "笑顔 (Happy)"
            description: "Cheerful expression, appropriate to the character's personality."
          - expression: "悲しみ (Sad)"
            description: "Distressed or melancholic expression, perhaps with a single tear."
          - expression: "怒り (Angry)"
            description: "Firm expression, scowling, perhaps with stylized steam or veins (if appropriate)."
          - expression: "驚き (Surprised)"
            description: "Wide-eyed and open-mouthed expression."
          - expression: ""
            description: ""
          - expression: ""
            description: ""

      - id: "color_palette_panel"
        title_label: "カラーパレット"
        panel_layout: "HEX swatches with labels. Arranged as: Primary / Secondary / Accent / Skin / Hair."
        description: "color_palette節の内容をビジュアルパレットとして配置する。"

      - id: "costume_variation_panel"
        title_label: "服装バリエーション"
        panel_layout: "Side-by-side comparison of costume patterns (max 3). Labels indicate costume_id."
        description: "costume_patterns節の内容を並列比較で配置する。defaultを左端に固定。"
        condition: "衣装バリエーションが2つ以上ある場合のみ表示。"

      - id: "accessories_detail_panel"
        title_label: "装備・アクセサリ詳細"
        panel_layout: "Close-up callouts of fixed and variable equipment with labels."
        description: "accessories_and_equipment節のfixedとvariableを拡大図で示す。"

      - id: "full_body_standing"
        title_label: "全身立ち絵"
        panel_layout: "A larger, detailed full-body figure on the right side."
        description: "A comprehensive, high-detail version of the character, showcasing the complete design and all equipment."

      - id: "chibi_sd_panel"
        title_label: "ちびキャラ / SD"
        panel_layout: "1-2 poses of the SD version alongside the full-body standing for scale comparison."
        description: "chibi_sd_variation節の仕様に基づくデフォルメ版。"
        condition: "ちびキャラ/SDが要求された場合のみ表示。"

  constraints:
    - "Consistent character identity across all views and panels."
    - "Japanese text labels must be precisely positioned and accurate."
    - "Any equipment or details not fully visible in the reference image (e.g., the exact back design) must be logically extrapolated and designed in the same style, integrating with the existing design elements."
    - "color_palette の HEX値は全パネルで厳守する。"
    - "consistency_anchors.immutable に記載された要素は全パネル・全バリエーションで維持する。"
    - "conditionが付いたパネルは条件を満たす場合のみ出力する。不要パネルでレイアウトを膨張させない。"
