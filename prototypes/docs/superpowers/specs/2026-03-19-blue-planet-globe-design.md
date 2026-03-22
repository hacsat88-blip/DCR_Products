# 蒼星儀（Blue Planet Globe） Design Spec

## Overview

宇宙空間に浮かぶフォトリアルな3D地球儀Webアプリ。大気フレネルグロウをまとった美しい地球をマウスで自由に操作でき、地理マーカーとポップアップで地名を表示する。

## Project Structure

```
prototypes/blue-planet-globe/
  index.html        ← 全コードを含む単一ファイル（HTML + CSS + JS + GLSL）
```

- Three.js は CDN（ES module importmap）から読み込み
- テクスチャは Solar System Scope（CC BY 4.0）の CDN リンクを使用
- ビルドツール不要、ブラウザで直接開ける

## Architecture

### Rendering Pipeline

```
Scene
├── StarField (BufferGeometry + Points, 2000-3000個)
├── EarthMesh (SphereGeometry 64×64 + ShaderMaterial)
│   ├── Vertex Shader: UV + 法線 + ライト方向計算
│   └── Fragment Shader:
│       ├── 昼テクスチャ × ディフューズ
│       ├── 夜テクスチャ × (1 - ディフューズ) ブレンド
│       ├── 雲テクスチャ（加算合成、ゆっくり回転）
│       ├── スペキュラハイライト（海面反射、Blinn-Phong）
│       └── フレネルリムグロウ（青い大気光）
├── AtmosphereGlow (SphereGeometry × 1.025, BackSide, フレネルシェーダー)
└── CSS2DRenderer (マーカー + ポップアップ)
    └── 各マーカー: 毎フレーム法線ドット積で裏面判定
```

### Interaction

- `OrbitControls` でドラッグ回転 + ホイールズーム
- マーカークリック → ポップアップ表示（同時に1つのみ）
- ポップアップ外クリック / 別マーカークリック → 閉じる / 切替

## Earth Shader Detail

### Fragment Shader Processing

1. **ディフューズライティング**: 太陽光方向固定（右上）、`dot(normal, lightDir)` で昼夜判定
2. **昼夜ブレンド**: `smoothstep` で境界を滑らかにブレンド（夕暮れゾーン）
3. **雲レイヤー**: 雲テクスチャを加算合成、UV を毎フレーム微小オフセットで回転
4. **スペキュラ**: `earth_specular` マップで海のみ反射、Blinn-Phong ハイライト
5. **フレネルリムグロウ**: `rim = 1.0 - dot(normal, viewDir)`, 青い光 `#4488ff` × `pow(rim, 3.0)`

### Atmosphere Glow (Separate Mesh)

- 地球より 1.025 倍大きい Sphere
- `side: THREE.BackSide`（内側から見える面のみ描画）
- フレネルシェーダーで外縁ほど明るい青のグロウ
- `blending: THREE.AdditiveBlending` + `transparent: true`

### Star Background

- `BufferGeometry` + `Points` で 2000〜3000 個のランダム配置
- 微かなサイズばらつき + 明るさばらつき
- 静止（地球だけが回る）

### Lighting

- シェーダー内で太陽光を処理（Three.js ライトは補助的）
- `AmbientLight` 微弱 — 夜面が完全に真っ黒にならない程度

## Textures

- **ソース**: Solar System Scope（CC BY 4.0）CDN リンク
- **解像度**: 2048×1024px
- **セット**:
  - `earth_daymap.jpg` — 昼面テクスチャ
  - `earth_nightmap.jpg` — 夜景テクスチャ（都市の灯り）
  - `earth_clouds.jpg` — 雲レイヤー
  - `earth_specular.jpg` — スペキュラマップ（海面反射用）

## Marker System

### Categories and Colors

| カテゴリ | 色 | サイズ | 数 |
|---|---|---|---|
| 国（首都） | シアン `#00ffff` | 6px | ~130 |
| 大陸 | オレンジ `#ff8800` | 8px | ~7 |
| 海・海洋 | マゼンタ `#ff00ff` | 7px | ~20 |

合計: 150〜200 個

### Back-face Culling Logic

```
毎フレーム:
  for each marker:
    markerWorldPos = latLng → 3D座標変換
    markerNormal = normalize(markerWorldPos)
    cameraDir = normalize(camera.position - markerWorldPos)
    dot = markerNormal · cameraDir
    if dot < 0.05:
      marker.style.display = 'none'
    else:
      marker.style.display = 'block'
      marker.style.opacity = smoothstep(0.05, 0.2, dot)  // エッジフェード
```

### Popup

- クリックで日本語地名をフローティング表示
- 半透明黒背景 + 白文字 + 微かなボーダーグロウ
- 同時に1つだけ表示
- 裏面判定で自動非表示

### Data Structure

```javascript
const markers = [
  { name: "東京", lat: 35.68, lng: 139.69, type: "country" },
  { name: "アジア", lat: 30, lng: 90, type: "continent" },
  { name: "太平洋", lat: 0, lng: -160, type: "ocean" },
  // ... 150〜200件（実装時にハードコードで全件列挙する）
];
```

## UI Controls

### Navigation (画面左上)

- **タイトル**: 「蒼星儀」
- **デフォルトボタン**: カメラを初期位置にスムーズアニメーションで戻す
- **地域ジャンププルダウン**: 8地域から選択、カメラをスムーズ回転

### Region Presets

| 地域 | 緯度 | 経度 |
|---|---|---|
| ヨーロッパ | 50°N | 15°E |
| アジア | 35°N | 105°E |
| 中東 | 30°N | 45°E |
| アフリカ | 0° | 25°E |
| 北米 | 40°N | 100°W |
| 南米 | 15°S | 60°W |
| オセアニア | -25°S | 135°E |
| 北極 | 90°N | 0° (カメラを上方俯瞰、距離2.5倍) |
| 南極 | 90°S | 0° (カメラを下方俯瞰、距離2.5倍) |

### Camera Animation

- `requestAnimationFrame` による球面線形補間（Slerp）
- 外部ライブラリ不使用

## Performance

- SphereGeometry 分割数: 64×64
- テクスチャ: 2048×1024px
- マーカー裏面判定: 150〜200個/フレームは負荷無視可
- CSS2DRenderer: `display` プロパティ切替のみで不要な DOM 再描画を回避
- `requestAnimationFrame` ループ、非アクティブタブでは自動停止
- 目標: 主要ブラウザで 60fps

## Browser Support

- WebGL 対応ブラウザ（Chrome, Firefox, Edge, Safari）
- モバイル: タッチドラッグ・ピンチズーム（OrbitControls 標準対応）

## Guardrails

- 裏側のマーカー・ポップアップは絶対に表示しない
- 外部 API キー不要
- テクスチャは CC BY 4.0 ライセンスのオープンデータ
- 品質重視: サブエージェントによるコードレビュー・パフォーマンス検証
