# 蒼星儀（Blue Planet Globe） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a photorealistic 3D Earth globe web app with atmospheric glow, geographic markers, and region navigation in a single HTML file.

**Architecture:** Single `index.html` using Three.js (CDN) with custom GLSL shaders for Earth rendering, CSS2DRenderer for markers/popups, and OrbitControls for interaction. Textures from Solar System Scope (CC BY 4.0).

**Tech Stack:** HTML5, Three.js (r162+, ES modules via importmap), GLSL, CSS2DRenderer, OrbitControls

---

## File Structure

```
prototypes/blue-planet-globe/
  index.html    ← Single file: HTML structure + CSS styles + JS + GLSL shaders
```

All code lives in one file. Logical sections within the file:

1. HTML: `<head>` with importmap + `<style>` + `<body>` with UI controls
2. GLSL: Vertex/Fragment shaders in `<script type="x-shader/*">` tags
3. JS: Scene setup, Earth mesh, atmosphere, stars, markers, controls, animation loop

---

### Task 1: HTML Scaffold + Three.js Scene

**Files:**
- Create: `blue-planet-globe/index.html`

**What this builds:** Empty black scene with Three.js running, camera positioned, OrbitControls working. The foundation everything else builds on.

- [ ] **Step 1: Create project directory**

Run: `mkdir -p "C:/Users/hacsa/Desktop/サトシ開発/prototypes/blue-planet-globe"`

- [ ] **Step 2: Write the HTML scaffold with Three.js importmap and basic scene**

Create `blue-planet-globe/index.html` with:

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>蒼星儀 - Blue Planet Globe</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { overflow: hidden; background: #000; font-family: 'Segoe UI', sans-serif; }
    #canvas-container { width: 100vw; height: 100vh; }

    /* UI Controls - top left */
    #controls {
      position: fixed; top: 20px; left: 20px; z-index: 100;
      color: #fff; user-select: none;
    }
    #controls h1 {
      font-size: 1.4rem; margin-bottom: 10px;
      text-shadow: 0 0 10px rgba(68, 136, 255, 0.8);
    }
    #controls .btn-group { display: flex; gap: 8px; align-items: center; }
    #region-select {
      background: rgba(0, 0, 0, 0.6); color: #fff; border: 1px solid rgba(255,255,255,0.3);
      padding: 6px 10px; border-radius: 4px; font-size: 0.85rem; cursor: pointer;
      outline: none;
    }
    #region-select option { background: #111; }
    #default-btn {
      background: rgba(68, 136, 255, 0.3); color: #fff;
      border: 1px solid rgba(68, 136, 255, 0.6);
      padding: 6px 14px; border-radius: 4px; font-size: 0.85rem;
      cursor: pointer; transition: background 0.2s;
    }
    #default-btn:hover { background: rgba(68, 136, 255, 0.5); }

    /* Marker styles */
    .marker {
      width: 6px; height: 6px; border-radius: 50%;
      cursor: pointer; transition: opacity 0.15s;
      box-shadow: 0 0 4px currentColor;
    }
    .marker-country { background: #00ffff; color: #00ffff; width: 6px; height: 6px; }
    .marker-continent { background: #ff8800; color: #ff8800; width: 8px; height: 8px; }
    .marker-ocean { background: #ff00ff; color: #ff00ff; width: 7px; height: 7px; }

    /* Popup styles */
    .popup {
      background: rgba(0, 0, 0, 0.75); color: #fff;
      padding: 6px 12px; border-radius: 6px;
      font-size: 0.8rem; white-space: nowrap;
      border: 1px solid rgba(68, 136, 255, 0.4);
      box-shadow: 0 0 8px rgba(68, 136, 255, 0.3);
      pointer-events: none;
      transform: translateY(-20px);
    }

    /* Loading overlay */
    #loading {
      position: fixed; inset: 0; z-index: 200;
      display: flex; align-items: center; justify-content: center;
      background: #000; color: #4488ff; font-size: 1.2rem;
      transition: opacity 0.5s;
    }
    #loading.hidden { opacity: 0; pointer-events: none; }
  </style>

  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.162.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.162.0/examples/jsm/"
    }
  }
  </script>
</head>
<body>
  <div id="loading">読み込み中...</div>

  <div id="controls">
    <h1>蒼星儀</h1>
    <div class="btn-group">
      <select id="region-select">
        <option value="">地域を選択</option>
        <option value="europe">ヨーロッパ</option>
        <option value="asia">アジア</option>
        <option value="middle-east">中東</option>
        <option value="africa">アフリカ</option>
        <option value="north-america">北米</option>
        <option value="south-america">南米</option>
        <option value="oceania">オセアニア</option>
        <option value="north-pole">北極</option>
        <option value="south-pole">南極</option>
      </select>
      <button id="default-btn">デフォルト</button>
    </div>
  </div>

  <div id="canvas-container"></div>

  <!-- Earth Vertex Shader -->
  <script id="earth-vertex" type="x-shader/x-vertex">
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  </script>

  <!-- Earth Fragment Shader (placeholder - completed in Task 3) -->
  <script id="earth-fragment" type="x-shader/x-fragment">
    uniform sampler2D dayTexture;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vec3 dayColor = texture2D(dayTexture, vUv).rgb;
      gl_FragColor = vec4(dayColor, 1.0);
    }
  </script>

  <!-- Atmosphere Vertex Shader -->
  <script id="atmo-vertex" type="x-shader/x-vertex">
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  </script>

  <!-- Atmosphere Fragment Shader -->
  <script id="atmo-fragment" type="x-shader/x-fragment">
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vec3 viewDir = normalize(-vPosition);
      float rim = 1.0 - dot(vNormal, viewDir);
      float intensity = pow(rim, 2.5) * 1.2;
      vec3 color = vec3(0.267, 0.533, 1.0); // #4488ff
      gl_FragColor = vec4(color * intensity, intensity * 0.6);
    }
  </script>

  <script type="module">
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

    // ============================================================
    // Scene Setup
    // ============================================================
    const container = document.getElementById('canvas-container');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0.5, 3);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // CSS2D Renderer for markers
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(labelRenderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1.5;
    controls.maxDistance = 8;
    controls.enablePan = false;

    // Ambient light (subtle, so night side isn't fully black)
    scene.add(new THREE.AmbientLight(0x111122, 0.1));

    // Resize handler
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      labelRenderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ============================================================
    // Texture Loader
    // ============================================================
    const textureLoader = new THREE.TextureLoader();
    // Three.js example textures (reliable, free)
    // Note: specular map may not exist at this path — Task 3 handles fallback
    const TEXTURE_BASE = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/';

    function loadTexture(name) {
      return new Promise((resolve, reject) => {
        textureLoader.load(
          TEXTURE_BASE + name,
          resolve,
          undefined,
          reject
        );
      });
    }

    // ============================================================
    // Init (async to load textures)
    // ============================================================
    async function init() {
      // Load textures
      const [dayMap] = await Promise.all([
        loadTexture('earth_atmos_2048.jpg'),
      ]);

      // Earth mesh (placeholder material - replaced in Task 3)
      const earthGeometry = new THREE.SphereGeometry(1, 64, 64);
      const earthMaterial = new THREE.ShaderMaterial({
        vertexShader: document.getElementById('earth-vertex').textContent,
        fragmentShader: document.getElementById('earth-fragment').textContent,
        uniforms: {
          dayTexture: { value: dayMap },
        },
      });
      const earth = new THREE.Mesh(earthGeometry, earthMaterial);
      scene.add(earth);

      // Hide loading screen
      document.getElementById('loading').classList.add('hidden');

      // Animation loop
      function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
        labelRenderer.render(scene, camera);
      }
      animate();
    }

    init().catch(err => {
      console.error('Failed to initialize:', err);
      document.getElementById('loading').textContent = '読み込みエラー';
    });
  </script>
</body>
</html>
```

- [ ] **Step 3: Open in browser and verify**

Open `blue-planet-globe/index.html` in a browser (or use a local server).
Expected: Black background with a textured sphere visible, draggable with mouse, zoomable with scroll wheel.

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/hacsa/Desktop/サトシ開発/prototypes"
git add blue-planet-globe/index.html
git commit -m "feat: scaffold HTML with Three.js scene, camera, and OrbitControls"
```

---

### Task 2: Star Background

**Files:**
- Modify: `blue-planet-globe/index.html` (JS section, after scene setup, before init)

**What this builds:** 2500 randomly placed stars as a static background sphere.

- [ ] **Step 1: Add star field creation code**

Insert after the resize handler, before the Texture Loader section:

```javascript
// ============================================================
// Star Field
// ============================================================
function createStarField() {
  const starCount = 2500;
  const positions = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);

  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 80 + Math.random() * 20;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    sizes[i] = 0.5 + Math.random() * 1.5;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.8,
  });

  scene.add(new THREE.Points(geometry, material));
}
createStarField();
```

- [ ] **Step 2: Open in browser and verify**

Expected: Star field visible around the Earth. Stars don't move when Earth is rotated.

- [ ] **Step 3: Commit**

```bash
git add blue-planet-globe/index.html
git commit -m "feat: add star field background (2500 random points)"
```

---

### Task 3: Earth Shader (Day/Night/Clouds/Specular/Fresnel)

**Files:**
- Modify: `blue-planet-globe/index.html` (GLSL shaders + JS texture loading)

**What this builds:** The core visual — photorealistic Earth with day/night blending, cloud layer, ocean specular highlights, and blue Fresnel rim glow.

- [ ] **Step 1: Update the Earth fragment shader**

Replace the earth-fragment `<script>` tag content with the full shader:

```glsl
uniform sampler2D dayTexture;
uniform sampler2D nightTexture;
uniform sampler2D cloudsTexture;
uniform sampler2D specularTexture;
uniform vec3 lightDirection;
uniform float cloudOffset;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(-vPosition);
  vec3 lightDir = normalize(lightDirection);

  // Diffuse lighting
  float diffuse = dot(normal, lightDir);

  // Day/Night blend with smooth terminator
  float blend = smoothstep(-0.1, 0.2, diffuse);

  vec3 dayColor = texture2D(dayTexture, vUv).rgb;
  vec3 nightColor = texture2D(nightTexture, vUv).rgb;

  vec3 color = mix(nightColor * 1.2, dayColor, blend);

  // Cloud layer (offset UV for rotation)
  vec2 cloudUv = vUv + vec2(cloudOffset, 0.0);
  float cloud = texture2D(cloudsTexture, cloudUv).r;
  color = mix(color, vec3(1.0), cloud * blend * 0.6);

  // Specular highlight (ocean only)
  float specMask = texture2D(specularTexture, vUv).r;
  vec3 halfDir = normalize(lightDir + viewDir);
  float spec = pow(max(dot(normal, halfDir), 0.0), 64.0);
  color += vec3(0.8, 0.85, 1.0) * spec * specMask * 0.5;

  // Fresnel rim glow
  float rim = 1.0 - dot(normal, viewDir);
  vec3 rimColor = vec3(0.267, 0.533, 1.0); // #4488ff
  color += rimColor * pow(rim, 3.0) * 0.6;

  gl_FragColor = vec4(color, 1.0);
}
```

- [ ] **Step 2: Update the JS to load all textures and pass uniforms**

Update the texture loading and Earth material creation in the `init()` function:

```javascript
// Load textures — clouds/specular may 404; create fallback if so
const loadWithFallback = (name) =>
  loadTexture(name).catch(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    c.getContext('2d').fillRect(0, 0, 1, 1);
    return new THREE.CanvasTexture(c);
  });

const [dayMap, nightMap, cloudsMap, specMap] = await Promise.all([
  loadTexture('earth_atmos_2048.jpg'),
  loadTexture('earth_lights_2048.png'),
  loadWithFallback('earth_clouds_2048.png'),
  loadWithFallback('earth_specular_2048.png'),
]);

const earthGeometry = new THREE.SphereGeometry(1, 64, 64);
const earthUniforms = {
  dayTexture: { value: dayMap },
  nightTexture: { value: nightMap },
  cloudsTexture: { value: cloudsMap },
  specularTexture: { value: specMap },
  lightDirection: { value: new THREE.Vector3(5, 3, 5).normalize() },
  cloudOffset: { value: 0 },
};
const earthMaterial = new THREE.ShaderMaterial({
  vertexShader: document.getElementById('earth-vertex').textContent,
  fragmentShader: document.getElementById('earth-fragment').textContent,
  uniforms: earthUniforms,
});
const earth = new THREE.Mesh(earthGeometry, earthMaterial);
scene.add(earth);
```

- [ ] **Step 3: Add cloud rotation in the animation loop**

Inside `animate()`, before `renderer.render`:

```javascript
earthUniforms.cloudOffset.value += 0.00002;
```

- [ ] **Step 4: Add atmosphere glow mesh**

After adding the Earth mesh to the scene:

```javascript
// Atmosphere glow
const atmoGeometry = new THREE.SphereGeometry(1.025, 64, 64);
const atmoMaterial = new THREE.ShaderMaterial({
  vertexShader: document.getElementById('atmo-vertex').textContent,
  fragmentShader: document.getElementById('atmo-fragment').textContent,
  side: THREE.BackSide,
  blending: THREE.AdditiveBlending,
  transparent: true,
  depthWrite: false,
});
scene.add(new THREE.Mesh(atmoGeometry, atmoMaterial));
```

- [ ] **Step 5: Open in browser and verify**

Expected:
- Day side shows full-color Earth with visible continents
- Night side shows city lights
- Smooth terminator (twilight zone) between day and night
- Cloud layer visible, slowly rotating
- Blue glow around Earth's rim
- Ocean surfaces show specular highlights on the day side

- [ ] **Step 6: Commit**

```bash
git add blue-planet-globe/index.html
git commit -m "feat: full Earth shader with day/night, clouds, specular, and Fresnel glow"
```

---

### Task 4: Marker Data (150-200 geographic points)

**Files:**
- Modify: `blue-planet-globe/index.html` (JS section, add marker data array)

**What this builds:** Complete geographic marker dataset with all countries (capitals), continents, and oceans/seas.

- [ ] **Step 1: Add the marker data array**

Insert before the `init()` function. This is the full dataset of ~160 markers:

```javascript
// ============================================================
// Geographic Marker Data
// ============================================================
const MARKERS = [
  // === 大陸 (Continents) ===
  { name: "アジア", lat: 30, lng: 90, type: "continent" },
  { name: "ヨーロッパ", lat: 54, lng: 15, type: "continent" },
  { name: "アフリカ", lat: 0, lng: 25, type: "continent" },
  { name: "北アメリカ", lat: 45, lng: -100, type: "continent" },
  { name: "南アメリカ", lat: -15, lng: -60, type: "continent" },
  { name: "オセアニア", lat: -25, lng: 135, type: "continent" },
  { name: "南極", lat: -85, lng: 0, type: "continent" },

  // === 海・海洋 (Oceans & Seas) ===
  { name: "太平洋", lat: 0, lng: -160, type: "ocean" },
  { name: "大西洋", lat: 0, lng: -30, type: "ocean" },
  { name: "インド洋", lat: -20, lng: 80, type: "ocean" },
  { name: "北極海", lat: 85, lng: 0, type: "ocean" },
  { name: "南極海", lat: -65, lng: 0, type: "ocean" },
  { name: "地中海", lat: 35, lng: 18, type: "ocean" },
  { name: "カリブ海", lat: 15, lng: -75, type: "ocean" },
  { name: "南シナ海", lat: 12, lng: 114, type: "ocean" },
  { name: "ベーリング海", lat: 58, lng: -175, type: "ocean" },
  { name: "紅海", lat: 20, lng: 38, type: "ocean" },
  { name: "黒海", lat: 43, lng: 35, type: "ocean" },
  { name: "バルト海", lat: 58, lng: 20, type: "ocean" },
  { name: "北海", lat: 56, lng: 3, type: "ocean" },
  { name: "アラビア海", lat: 15, lng: 65, type: "ocean" },
  { name: "ベンガル湾", lat: 15, lng: 88, type: "ocean" },
  { name: "日本海", lat: 40, lng: 135, type: "ocean" },
  { name: "東シナ海", lat: 28, lng: 125, type: "ocean" },
  { name: "タスマン海", lat: -38, lng: 160, type: "ocean" },
  { name: "珊瑚海", lat: -18, lng: 155, type: "ocean" },

  // === アジア (Asia) ===
  { name: "東京", lat: 35.68, lng: 139.69, type: "country" },
  { name: "北京", lat: 39.90, lng: 116.39, type: "country" },
  { name: "ソウル", lat: 37.57, lng: 126.98, type: "country" },
  { name: "平壌", lat: 39.02, lng: 125.75, type: "country" },
  { name: "ウランバートル", lat: 47.92, lng: 106.91, type: "country" },
  { name: "台北", lat: 25.03, lng: 121.57, type: "country" },
  { name: "マニラ", lat: 14.60, lng: 120.98, type: "country" },
  { name: "ハノイ", lat: 21.03, lng: 105.85, type: "country" },
  { name: "バンコク", lat: 13.76, lng: 100.50, type: "country" },
  { name: "クアラルンプール", lat: 3.14, lng: 101.69, type: "country" },
  { name: "シンガポール", lat: 1.35, lng: 103.82, type: "country" },
  { name: "ジャカルタ", lat: -6.21, lng: 106.85, type: "country" },
  { name: "ネーピードー", lat: 19.76, lng: 96.07, type: "country" },
  { name: "プノンペン", lat: 11.56, lng: 104.93, type: "country" },
  { name: "ビエンチャン", lat: 17.97, lng: 102.63, type: "country" },
  { name: "ニューデリー", lat: 28.61, lng: 77.21, type: "country" },
  { name: "イスラマバード", lat: 33.69, lng: 73.04, type: "country" },
  { name: "ダッカ", lat: 23.81, lng: 90.41, type: "country" },
  { name: "カトマンズ", lat: 27.72, lng: 85.32, type: "country" },
  { name: "コロンボ", lat: 6.93, lng: 79.85, type: "country" },
  { name: "ティンプー", lat: 27.47, lng: 89.64, type: "country" },
  { name: "カブール", lat: 34.53, lng: 69.17, type: "country" },
  { name: "タシケント", lat: 41.30, lng: 69.28, type: "country" },
  { name: "アスタナ", lat: 51.17, lng: 71.43, type: "country" },
  { name: "ビシュケク", lat: 42.87, lng: 74.59, type: "country" },
  { name: "ドゥシャンベ", lat: 38.56, lng: 68.77, type: "country" },
  { name: "アシガバート", lat: 37.95, lng: 58.38, type: "country" },

  // === 中東 (Middle East) ===
  { name: "テヘラン", lat: 35.69, lng: 51.39, type: "country" },
  { name: "バグダッド", lat: 33.31, lng: 44.37, type: "country" },
  { name: "リヤド", lat: 24.71, lng: 46.68, type: "country" },
  { name: "アンカラ", lat: 39.93, lng: 32.86, type: "country" },
  { name: "エルサレム", lat: 31.77, lng: 35.23, type: "country" },
  { name: "アンマン", lat: 31.95, lng: 35.93, type: "country" },
  { name: "ベイルート", lat: 33.89, lng: 35.50, type: "country" },
  { name: "ダマスカス", lat: 33.51, lng: 36.29, type: "country" },
  { name: "ドーハ", lat: 25.29, lng: 51.53, type: "country" },
  { name: "アブダビ", lat: 24.45, lng: 54.65, type: "country" },
  { name: "マスカット", lat: 23.59, lng: 58.54, type: "country" },
  { name: "サナア", lat: 15.37, lng: 44.19, type: "country" },
  { name: "クウェート", lat: 29.38, lng: 47.99, type: "country" },
  { name: "マナーマ", lat: 26.23, lng: 50.59, type: "country" },

  // === ヨーロッパ (Europe) ===
  { name: "ロンドン", lat: 51.51, lng: -0.13, type: "country" },
  { name: "パリ", lat: 48.86, lng: 2.35, type: "country" },
  { name: "ベルリン", lat: 52.52, lng: 13.41, type: "country" },
  { name: "マドリード", lat: 40.42, lng: -3.70, type: "country" },
  { name: "ローマ", lat: 41.90, lng: 12.50, type: "country" },
  { name: "リスボン", lat: 38.72, lng: -9.14, type: "country" },
  { name: "アムステルダム", lat: 52.37, lng: 4.90, type: "country" },
  { name: "ブリュッセル", lat: 50.85, lng: 4.35, type: "country" },
  { name: "ウィーン", lat: 48.21, lng: 16.37, type: "country" },
  { name: "ベルン", lat: 46.95, lng: 7.45, type: "country" },
  { name: "ストックホルム", lat: 59.33, lng: 18.07, type: "country" },
  { name: "オスロ", lat: 59.91, lng: 10.75, type: "country" },
  { name: "コペンハーゲン", lat: 55.68, lng: 12.57, type: "country" },
  { name: "ヘルシンキ", lat: 60.17, lng: 24.94, type: "country" },
  { name: "ワルシャワ", lat: 52.23, lng: 21.01, type: "country" },
  { name: "プラハ", lat: 50.08, lng: 14.44, type: "country" },
  { name: "ブダペスト", lat: 47.50, lng: 19.04, type: "country" },
  { name: "ブカレスト", lat: 44.43, lng: 26.10, type: "country" },
  { name: "アテネ", lat: 37.98, lng: 23.73, type: "country" },
  { name: "モスクワ", lat: 55.76, lng: 37.62, type: "country" },
  { name: "キーウ", lat: 50.45, lng: 30.52, type: "country" },
  { name: "ダブリン", lat: 53.35, lng: -6.26, type: "country" },
  { name: "レイキャビク", lat: 64.15, lng: -21.94, type: "country" },
  { name: "ベオグラード", lat: 44.79, lng: 20.47, type: "country" },
  { name: "ソフィア", lat: 42.70, lng: 23.32, type: "country" },
  { name: "ザグレブ", lat: 45.81, lng: 15.98, type: "country" },
  { name: "リュブリャナ", lat: 46.06, lng: 14.51, type: "country" },
  { name: "ブラチスラバ", lat: 48.15, lng: 17.11, type: "country" },
  { name: "タリン", lat: 59.44, lng: 24.75, type: "country" },
  { name: "リガ", lat: 56.95, lng: 24.11, type: "country" },
  { name: "ビリニュス", lat: 54.69, lng: 25.28, type: "country" },
  { name: "ミンスク", lat: 53.90, lng: 27.57, type: "country" },
  { name: "トビリシ", lat: 41.72, lng: 44.79, type: "country" },
  { name: "エレバン", lat: 40.18, lng: 44.51, type: "country" },
  { name: "バクー", lat: 40.41, lng: 49.87, type: "country" },

  // === アフリカ (Africa) ===
  { name: "カイロ", lat: 30.04, lng: 31.24, type: "country" },
  { name: "ナイロビ", lat: -1.29, lng: 36.82, type: "country" },
  { name: "プレトリア", lat: -25.75, lng: 28.19, type: "country" },
  { name: "アディスアベバ", lat: 9.02, lng: 38.75, type: "country" },
  { name: "アクラ", lat: 5.56, lng: -0.19, type: "country" },
  { name: "ラゴス", lat: 6.52, lng: 3.38, type: "country" },
  { name: "キンシャサ", lat: -4.32, lng: 15.31, type: "country" },
  { name: "ダカール", lat: 14.69, lng: -17.44, type: "country" },
  { name: "ラバト", lat: 34.02, lng: -6.84, type: "country" },
  { name: "アルジェ", lat: 36.75, lng: 3.04, type: "country" },
  { name: "チュニス", lat: 36.81, lng: 10.18, type: "country" },
  { name: "トリポリ", lat: 32.90, lng: 13.18, type: "country" },
  { name: "ハルツーム", lat: 15.50, lng: 32.56, type: "country" },
  { name: "カンパラ", lat: 0.35, lng: 32.58, type: "country" },
  { name: "ダルエスサラーム", lat: -6.79, lng: 39.28, type: "country" },
  { name: "マプト", lat: -25.97, lng: 32.58, type: "country" },
  { name: "ルサカ", lat: -15.39, lng: 28.32, type: "country" },
  { name: "ハラレ", lat: -17.83, lng: 31.05, type: "country" },
  { name: "アンタナナリボ", lat: -18.88, lng: 47.51, type: "country" },
  { name: "アビジャン", lat: 5.36, lng: -4.01, type: "country" },

  // === 北アメリカ (North America) ===
  { name: "ワシントンD.C.", lat: 38.91, lng: -77.04, type: "country" },
  { name: "オタワ", lat: 45.42, lng: -75.70, type: "country" },
  { name: "メキシコシティ", lat: 19.43, lng: -99.13, type: "country" },
  { name: "ハバナ", lat: 23.11, lng: -82.37, type: "country" },
  { name: "グアテマラシティ", lat: 14.63, lng: -90.51, type: "country" },
  { name: "サンホセ", lat: 9.93, lng: -84.08, type: "country" },
  { name: "パナマシティ", lat: 8.98, lng: -79.52, type: "country" },
  { name: "キングストン", lat: 18.00, lng: -76.79, type: "country" },
  { name: "テグシガルパ", lat: 14.07, lng: -87.19, type: "country" },
  { name: "マナグア", lat: 12.11, lng: -86.27, type: "country" },
  { name: "サンサルバドル", lat: 13.69, lng: -89.19, type: "country" },

  // === 南アメリカ (South America) ===
  { name: "ブラジリア", lat: -15.79, lng: -47.88, type: "country" },
  { name: "ブエノスアイレス", lat: -34.60, lng: -58.38, type: "country" },
  { name: "リマ", lat: -12.05, lng: -77.04, type: "country" },
  { name: "ボゴタ", lat: 4.71, lng: -74.07, type: "country" },
  { name: "サンティアゴ", lat: -33.45, lng: -70.67, type: "country" },
  { name: "カラカス", lat: 10.48, lng: -66.90, type: "country" },
  { name: "キト", lat: -0.18, lng: -78.47, type: "country" },
  { name: "モンテビデオ", lat: -34.88, lng: -56.17, type: "country" },
  { name: "アスンシオン", lat: -25.26, lng: -57.58, type: "country" },
  { name: "ラパス", lat: -16.50, lng: -68.15, type: "country" },
  { name: "ジョージタウン", lat: 6.80, lng: -58.16, type: "country" },

  // === オセアニア (Oceania) ===
  { name: "キャンベラ", lat: -35.28, lng: 149.13, type: "country" },
  { name: "ウェリントン", lat: -41.29, lng: 174.78, type: "country" },
  { name: "ポートモレスビー", lat: -6.21, lng: 155.97, type: "country" },
  { name: "スバ", lat: -18.14, lng: 178.44, type: "country" },
  { name: "アピア", lat: -13.83, lng: -171.76, type: "country" },
];
```

- [ ] **Step 2: Add region preset data**

Insert after the MARKERS array:

```javascript
// ============================================================
// Region Presets
// ============================================================
const REGIONS = {
  'europe':        { lat: 50, lng: 15, distance: 3 },
  'asia':          { lat: 35, lng: 105, distance: 3 },
  'middle-east':   { lat: 30, lng: 45, distance: 3 },
  'africa':        { lat: 0, lng: 25, distance: 3 },
  'north-america': { lat: 40, lng: -100, distance: 3 },
  'south-america': { lat: -15, lng: -60, distance: 3 },
  'oceania':       { lat: -25, lng: 135, distance: 3 },
  'north-pole':    { lat: 90, lng: 0, distance: 7.5 },
  'south-pole':    { lat: -90, lng: 0, distance: 7.5 },
};

const DEFAULT_CAMERA = { lat: 20, lng: 0, distance: 3 };
```

- [ ] **Step 3: Verify data compiles without errors**

Open browser console — no errors expected.

- [ ] **Step 4: Commit**

```bash
git add blue-planet-globe/index.html
git commit -m "feat: add geographic marker data (160+ points) and region presets"
```

---

### Task 5: Marker Rendering + Back-face Culling

**Files:**
- Modify: `blue-planet-globe/index.html` (JS section, marker creation + animation loop)

**What this builds:** Colored dot markers on the globe that hide when facing away from camera, with smooth edge fading.

- [ ] **Step 1: Add lat/lng to 3D coordinate conversion utility**

Insert after the REGIONS data:

```javascript
// ============================================================
// Utilities
// ============================================================
function latLngToVector3(lat, lng, radius = 1.001) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
```

- [ ] **Step 2: Add marker creation code inside init()**

After adding the atmosphere mesh, before the animation loop:

```javascript
// ============================================================
// Markers
// ============================================================
const markerObjects = [];
let activePopup = null;

MARKERS.forEach(data => {
  const pos = latLngToVector3(data.lat, data.lng);

  // Marker dot
  const markerEl = document.createElement('div');
  markerEl.className = `marker marker-${data.type}`;
  const markerObj = new CSS2DObject(markerEl);
  markerObj.position.copy(pos);
  markerObj.userData = { data, element: markerEl, popup: null };
  earth.add(markerObj);

  // Popup (hidden by default)
  const popupEl = document.createElement('div');
  popupEl.className = 'popup';
  popupEl.textContent = data.name;
  popupEl.style.display = 'none';
  const popupObj = new CSS2DObject(popupEl);
  popupObj.position.copy(pos);
  earth.add(popupObj);
  markerObj.userData.popup = popupObj;
  markerObj.userData.popupEl = popupEl;

  // Click handler
  markerEl.style.pointerEvents = 'auto';
  markerEl.addEventListener('click', (e) => {
    e.stopPropagation();
    if (activePopup === popupEl) {
      popupEl.style.display = 'none';
      activePopup = null;
    } else {
      if (activePopup) activePopup.style.display = 'none';
      popupEl.style.display = 'block';
      activePopup = popupEl;
    }
  });

  markerObjects.push(markerObj);
});

// Close popup on background click
renderer.domElement.addEventListener('click', () => {
  if (activePopup) {
    activePopup.style.display = 'none';
    activePopup = null;
  }
});
```

- [ ] **Step 3: Add back-face culling in the animation loop**

Inside `animate()`, before `renderer.render`:

```javascript
// Back-face culling for markers
const camPos = camera.position.clone();
markerObjects.forEach(obj => {
  const worldPos = new THREE.Vector3();
  obj.getWorldPosition(worldPos);
  const markerNormal = worldPos.clone().normalize();
  const cameraDir = camPos.clone().sub(worldPos).normalize();
  const dot = markerNormal.dot(cameraDir);

  const visible = dot > 0.05;
  const opacity = smoothstep(0.05, 0.2, dot);

  obj.userData.element.style.display = visible ? 'block' : 'none';
  obj.userData.element.style.opacity = visible ? opacity : 0;

  // Also hide popup if marker is on back side
  if (!visible && obj.userData.popupEl.style.display !== 'none') {
    obj.userData.popupEl.style.display = 'none';
    if (activePopup === obj.userData.popupEl) activePopup = null;
  }
  obj.userData.popupEl.style.opacity = visible ? opacity : 0;
});
```

- [ ] **Step 4: Open in browser and verify**

Expected:
- Colored dots visible on the globe (cyan, orange, magenta)
- Rotating the globe hides dots on the far side
- Dots near the edge fade smoothly
- Clicking a dot shows a popup with the Japanese name
- Clicking elsewhere closes the popup
- Popups on the back side are automatically hidden

- [ ] **Step 5: Commit**

```bash
git add blue-planet-globe/index.html
git commit -m "feat: add markers with back-face culling, popups, and click interaction"
```

---

### Task 6: Camera Navigation (Default + Region Jump)

**Files:**
- Modify: `blue-planet-globe/index.html` (JS section, camera animation + event handlers)

**What this builds:** Smooth camera animation to preset regions and back to default position.

- [ ] **Step 1: Add camera animation system**

Insert after the utilities section:

```javascript
// ============================================================
// Camera Animation
// ============================================================
let cameraAnimation = null;

function latLngToCamera(lat, lng, distance) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -distance * Math.sin(phi) * Math.cos(theta),
    distance * Math.cos(phi),
    distance * Math.sin(phi) * Math.sin(theta)
  );
}

function animateCamera(targetLat, targetLng, targetDistance, duration = 1000) {
  const startPos = camera.position.clone();
  const endPos = latLngToCamera(targetLat, targetLng, targetDistance);
  const startTime = performance.now();

  cameraAnimation = { startPos, endPos, startTime, duration };
}

function updateCameraAnimation() {
  if (!cameraAnimation) return;
  const { startPos, endPos, startTime, duration } = cameraAnimation;
  const elapsed = performance.now() - startTime;
  const progress = Math.min(elapsed / duration, 1);

  // Ease in-out cubic
  const t = progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;

  // Slerp on the sphere surface, then scale to distance
  const startDir = startPos.clone().normalize();
  const endDir = endPos.clone().normalize();
  const startDist = startPos.length();
  const endDist = endPos.length();

  // Manual slerp
  const dot = Math.max(-1, Math.min(1, startDir.dot(endDir)));
  const omega = Math.acos(dot);
  let newDir;
  if (omega < 0.001) {
    newDir = startDir.clone().lerp(endDir, t).normalize();
  } else {
    const sinOmega = Math.sin(omega);
    const a = Math.sin((1 - t) * omega) / sinOmega;
    const b = Math.sin(t * omega) / sinOmega;
    newDir = startDir.clone().multiplyScalar(a).add(endDir.clone().multiplyScalar(b));
  }

  const currentDist = startDist + (endDist - startDist) * t;
  camera.position.copy(newDir.multiplyScalar(currentDist));
  camera.lookAt(0, 0, 0);

  if (progress >= 1) cameraAnimation = null;
}
```

- [ ] **Step 2: Add event listeners for UI controls inside init()**

After the marker creation code, before the animation loop:

```javascript
// ============================================================
// UI Controls
// ============================================================
document.getElementById('default-btn').addEventListener('click', () => {
  animateCamera(DEFAULT_CAMERA.lat, DEFAULT_CAMERA.lng, DEFAULT_CAMERA.distance);
  document.getElementById('region-select').value = '';
});

document.getElementById('region-select').addEventListener('change', (e) => {
  const region = REGIONS[e.target.value];
  if (region) {
    animateCamera(region.lat, region.lng, region.distance);
  }
});
```

- [ ] **Step 3: Add camera animation update to the animation loop**

Inside `animate()`, right after `controls.update()`:

```javascript
updateCameraAnimation();
```

- [ ] **Step 4: Open in browser and verify**

Expected:
- Clicking "デフォルト" smoothly animates camera to initial view
- Selecting a region from dropdown smoothly rotates to that region
- Animation uses ease-in-out timing
- 北極/南極 views show the globe from above/below at increased distance
- Controls still work during and after animation

- [ ] **Step 5: Commit**

```bash
git add blue-planet-globe/index.html
git commit -m "feat: add smooth camera navigation with region presets and default button"
```

---

### Task 7: Polish and Final Verification

**Files:**
- Modify: `blue-planet-globe/index.html` (minor adjustments)

**What this builds:** Final polish pass — loading state, visual tweaks, performance verification.

- [ ] **Step 1: Add loading progress indication**

Update the `init()` function to show texture loading progress. Replace the loading text update:

```javascript
const loadingEl = document.getElementById('loading');
loadingEl.textContent = 'テクスチャを読み込み中...';
```

And after all textures load, before mesh creation:

```javascript
loadingEl.textContent = '地球を構築中...';
```

- [ ] **Step 2: Add subtle auto-rotation when idle**

After OrbitControls setup:

```javascript
controls.autoRotate = true;
controls.autoRotateSpeed = 0.3;
```

- [ ] **Step 3: Open in browser and verify full functionality**

Checklist:
- [ ] Loading screen shows and disappears after textures load
- [ ] Star field visible as background
- [ ] Earth renders with day/night sides, clouds moving, blue rim glow
- [ ] Ocean specular highlights visible on day side
- [ ] Drag to rotate works smoothly
- [ ] Scroll to zoom works (min/max enforced)
- [ ] Subtle auto-rotation when idle
- [ ] Colored markers visible (cyan/orange/magenta)
- [ ] Markers on back side are hidden
- [ ] Markers near edge fade smoothly
- [ ] Clicking marker shows Japanese name popup
- [ ] Only one popup open at a time
- [ ] Popup hides when its marker rotates to back side
- [ ] "デフォルト" button resets camera with smooth animation
- [ ] Region dropdown jumps to correct region with smooth animation
- [ ] 北極/南極 show top-down view at increased distance
- [ ] No console errors
- [ ] Performance feels smooth (60fps target)

- [ ] **Step 4: Commit final version**

```bash
git add blue-planet-globe/index.html
git commit -m "feat: complete 蒼星儀 with loading, auto-rotation, and polish"
```

---

## Summary

| Task | What it builds | Depends on |
|------|---------------|------------|
| 1 | HTML scaffold + Three.js scene + OrbitControls | — |
| 2 | Star field background | Task 1 |
| 3 | Earth shader (day/night/clouds/specular/Fresnel) + atmosphere | Task 1 |
| 4 | Marker data (160+ geographic points) + region presets | Task 1 |
| 5 | Marker rendering + back-face culling + popups | Tasks 3, 4 |
| 6 | Camera navigation (default + region jump) | Task 4 |
| 7 | Polish + final verification | Tasks 5, 6 |
