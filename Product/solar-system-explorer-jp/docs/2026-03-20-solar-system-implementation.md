# Solar System Web App Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page Three.js solar-system web app with cinematic space rendering, logarithmic orbit display by default, smooth planet focus transitions, DOM-based planet info, and reset/scale/dropdown controls.

**Architecture:** Keep the runtime in a single `index.html` file with inline CSS and inline JavaScript module code. Inside that file, separate responsibilities into `App`, `SolarSystemRuntime`, `CameraDirector`, `InteractionManager`, and `OverlayUI`, plus small pure helper functions for orbital transforms, orbit-line generation, and popup data slicing. Deliver the requested work in phase-aligned tasks so the `First Route` milestone is working early, then expand to all eight planets and the remaining controls without restructuring the app.

**Tech Stack:** HTML, CSS, vanilla JavaScript ES modules, Three.js, OrbitControls, Tween.js, Python `http.server` for local serving, browser DevTools for smoke verification.

---

## File Map

- Create: `index.html`
  - Single production file containing markup, CSS theme, hardcoded planet data, Three.js scene setup, animation loop, camera transitions, Raycaster logic, and DOM overlay UI.
- Create: `docs/superpowers/plans/2026-03-20-solar-system-implementation.md`
  - This implementation plan.
- Reference only: `docs/superpowers/specs/2026-03-20-solar-system-design.md`
  - Approved spec. Do not edit unless implementation reveals a real spec mismatch.

## Implementation Notes

- Keep runtime code in one file, but group sections with clear banner comments so future edits stay bounded.
- Do not add a bundler, framework, or asset pipeline.
- Do not add local texture assets. Use remote static texture URLs with fallback materials.
- Do not commit `.superpowers/` runtime artifacts created during brainstorming or browser testing.
- Treat each task below as a review boundary. After each task commit, run the required spec-compliance review and code-quality review before moving on.

### Task 1: Bootstrap the single-file app and deliver the scene shell for the First Route milestone

**Files:**
- Create: `index.html`
- Test: browser smoke check at `http://127.0.0.1:8000/index.html`
- Reference: `docs/superpowers/specs/2026-03-20-solar-system-design.md`

- [ ] **Step 1: Create the minimal HTML shell with deliberate failing self-check hooks**

```html
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Solar System Explorer</title>
    <style>
      html, body { margin: 0; height: 100%; background: #02040a; overflow: hidden; }
      #app { position: relative; width: 100%; height: 100%; }
      #scene-root { width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div id="app">
      <div id="scene-root"></div>
      <aside id="ui-root"></aside>
    </div>
    <script type="module">
      const ENABLE_INTERNAL_CHECKS = true;
      function runInternalChecks() {
        console.assert(getScaledOrbitRadius({ orbitAu: 1 }, 'display') > 0, 'Earth display orbit missing');
        console.assert(getScaledOrbitRadius({ orbitAu: 1.524 }, 'display') > getScaledOrbitRadius({ orbitAu: 1 }, 'display'), 'Mars should be outside Earth');
      }
      if (ENABLE_INTERNAL_CHECKS) runInternalChecks();
    </script>
  </body>
</html>
```

- [ ] **Step 2: Start the local server and confirm the self-check fails before implementation**

Run: `python -m http.server 8000`
Expected: `Serving HTTP on 0.0.0.0 port 8000 ...`

Then open `http://127.0.0.1:8000/index.html`
Expected: browser console shows a `ReferenceError` or failing assertion because the orbit helpers are not implemented yet.

- [ ] **Step 3: Add CDN module imports, cinematic layout CSS, and the first hardcoded data slice**

```js
import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.164.1/examples/jsm/controls/OrbitControls.js?module';
import { Tween, Easing, update as updateTweens } from 'https://cdn.jsdelivr.net/npm/@tweenjs/tween.js@23.1.3/+esm';

const PLANET_DATA = [
  {
    id: 'earth',
    name: 'Earth',
    orbitAu: 1,
    orbitPeriodDays: 365.25,
    meshRadius: 0.34,
    colorFallback: '#4d8cff',
    roughness: 0.92,
    textureUrl: 'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',
    moons: ['Moon'],
    composition: ['iron', 'oxygen', 'silicon', 'magnesium'],
    focusDistance: 2.4,
  },
  {
    id: 'mars',
    name: 'Mars',
    orbitAu: 1.524,
    orbitPeriodDays: 687,
    meshRadius: 0.27,
    colorFallback: '#c96b3b',
    roughness: 0.96,
    textureUrl: 'https://threejs.org/examples/textures/planets/mars_1k_color.jpg',
    moons: ['Phobos', 'Deimos'],
    composition: ['iron oxide', 'silicon', 'oxygen', 'magnesium'],
    focusDistance: 2.1,
  },
];
```

- [ ] **Step 4: Implement the minimum pure helpers needed for log-scale orbit motion**

```js
function getScaledOrbitRadius(planet, scaleMode) {
  if (scaleMode === 'real') return planet.orbitAu * 6.5;
  return Math.log(planet.orbitAu + 1) * 14;
}

function computeOrbitPosition(planet, elapsedDays, scaleMode) {
  const angle = (elapsedDays / planet.orbitPeriodDays) * Math.PI * 2;
  const radius = getScaledOrbitRadius(planet, scaleMode);
  return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
}

function buildOrbitLineVertices(planets, scaleMode, segments = 160) {
  const vertices = [];
  planets.forEach((planet) => {
    const radius = getScaledOrbitRadius(planet, scaleMode);
    for (let index = 0; index < segments; index += 1) {
      const a0 = (index / segments) * Math.PI * 2;
      const a1 = ((index + 1) / segments) * Math.PI * 2;
      vertices.push(Math.cos(a0) * radius, 0, Math.sin(a0) * radius);
      vertices.push(Math.cos(a1) * radius, 0, Math.sin(a1) * radius);
    }
  });
  return new Float32Array(vertices);
}
```

- [ ] **Step 5: Build the initial scene runtime for the First Route milestone**

```js
const appState = {
  scaleMode: 'display',
  selectedPlanetId: null,
  focusedPlanetId: null,
  isPopupOpen: false,
  isTransitioning: false,
  showAllMoons: false,
};

class App {
  constructor(root) {
    this.root = root;
    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.camera.position.set(0, 30, 58);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
  }
}
```

Implement in this step:
- renderer append to `#scene-root`
- deep-space scene background/fog baseline
- `OrbitControls` with damping
- sun emissive sphere + PointLight at origin
- Earth and Mars meshes in `planetGroup`
- one batched `LineSegments` orbit geometry for Earth and Mars
- animation loop that updates positions every frame
- resize handling

- [ ] **Step 6: Verify the First Route visual baseline manually**

Manual check at `http://127.0.0.1:8000/index.html`:
- Earth and Mars revolve around the sun on visible orbit lines
- default view is an angled overview
- mouse drag rotates the scene
- wheel zoom works
- console self-checks pass with no thrown assertion

- [ ] **Step 7: Commit the First Route scene shell**

```bash
git add index.html
git commit -m "feat: bootstrap solar system first route scene"
```

### Task 2: Expand to all eight planets, starfield background, and lazy texture fallback rendering

**Files:**
- Modify: `index.html`
- Test: browser smoke check at `http://127.0.0.1:8000/index.html`

- [ ] **Step 1: Add failing self-checks for planet count, starfield cap, and fallback material presence**

```js
function runInternalChecks() {
  console.assert(PLANET_DATA.length === 8, 'All eight planets must be defined');
  console.assert(STARFIELD_COUNT <= 50000, 'Starfield exceeds the 50k cap');
  console.assert(createFallbackPlanetMaterial(PLANET_DATA[0]) instanceof THREE.MeshStandardMaterial, 'Fallback material missing');
}
```

- [ ] **Step 2: Reload the page and confirm the new self-checks fail before implementation**

Expected: assertion failure for missing planets or missing fallback material helper.

- [ ] **Step 3: Replace the temporary two-planet dataset with the full eight-planet hardcoded dataset**

```js
const PLANET_DATA = [
  /* mercury */, /* venus */, /* earth */, /* mars */,
  /* jupiter */, /* saturn */, /* uranus */, /* neptune */
];
```

Each entry must include:
- `id`
- `name`
- `orbitAu`
- `orbitPeriodDays`
- `meshRadius`
- `colorFallback`
- `roughness`
- `textureUrl`
- `moons`
- `composition`
- `focusDistance`

- [ ] **Step 4: Implement lazy texture loading with tuned fallback materials**

```js
function createFallbackPlanetMaterial(planet) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(planet.colorFallback),
    roughness: planet.roughness,
    metalness: 0.05,
  });
}

function applyPlanetTextureAsync(planet, material, textureLoader) {
  textureLoader.load(
    planet.textureUrl,
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      material.map = texture;
      material.needsUpdate = true;
    },
    undefined,
    () => {
      material.map = null;
      material.needsUpdate = true;
    }
  );
}
```

- [ ] **Step 5: Implement the cinematic background and complete the visual runtime**

Implement in this step:
- `THREE.Points` starfield capped by `STARFIELD_COUNT`
- varied star size/brightness/depth distribution
- subtle solar halo layers around the sun
- cool-toned orbit line material styling
- all eight planets added to the shared orbit and planet groups

- [ ] **Step 6: Verify full-planet rendering and fallback safety**

Manual check:
- all eight planets render
- starfield feels dense but responsive
- no orbit line count exceeds the single batched `LineSegments` object
- if one texture URL is temporarily invalidated during local testing, that planet still renders with a fallback material and the app keeps running

- [ ] **Step 7: Commit the visual expansion**

```bash
git add index.html
git commit -m "feat: add planets textures and cinematic starfield"
```

### Task 3: Add click selection, snapshot-safe hit testing, focus tweening, and popup UI

**Files:**
- Modify: `index.html`
- Test: browser smoke check at `http://127.0.0.1:8000/index.html`

- [ ] **Step 1: Add failing self-checks for popup moon slicing and focus camera offsets**

```js
function getVisibleMoons(planet, showAllMoons) {
  return showAllMoons ? planet.moons : planet.moons.slice(0, 5);
}

console.assert(getVisibleMoons({ moons: ['a', 'b', 'c', 'd', 'e', 'f'] }, false).length === 5, 'Popup should cap initial moons at 5');
console.assert(getFocusOffset({ focusDistance: 3 }).length() > 0, 'Focus offset must be non-zero');
```

- [ ] **Step 2: Reload and confirm the new interaction checks fail before implementation**

Expected: browser console shows missing helper failures for the focus utilities.

- [ ] **Step 3: Implement the interaction snapshot store and Raycaster click flow**

```js
const interactionState = {
  pointer: new THREE.Vector2(),
  clickSnapshot: new Map(),
};

function updatePlanetSnapshot(planetId, mesh) {
  interactionState.clickSnapshot.set(planetId, mesh.position.clone());
}
```

Implement in this step:
- pointer normalization from canvas clicks
- planet mesh registry for hit testing
- click-frame snapshot refresh inside the animation loop
- hit resolution that uses the snapshot captured for the click event, not live mesh positions from a later frame
- empty-space click detection that closes the popup / resets focus

- [ ] **Step 4: Implement Tween.js focus transitions and fixed cinematic camera offsets**

```js
function getFocusOffset(planet) {
  return new THREE.Vector3(planet.focusDistance * 0.9, planet.focusDistance * 0.42, planet.focusDistance);
}

function tweenCameraToTarget(camera, controls, destinationPosition, destinationTarget, onComplete) {
  controls.enabled = false;
  new Tween({
    px: camera.position.x, py: camera.position.y, pz: camera.position.z,
    tx: controls.target.x, ty: controls.target.y, tz: controls.target.z,
  })
    .to({
      px: destinationPosition.x, py: destinationPosition.y, pz: destinationPosition.z,
      tx: destinationTarget.x, ty: destinationTarget.y, tz: destinationTarget.z,
    }, 1400)
    .easing(Easing.Cubic.InOut)
    .onUpdate((frame) => {
      camera.position.set(frame.px, frame.py, frame.pz);
      controls.target.set(frame.tx, frame.ty, frame.tz);
    })
    .onComplete(() => {
      controls.enabled = true;
      onComplete();
    })
    .start();
}
```

- [ ] **Step 5: Implement the DOM popup panel and close behavior**

Implement in this step:
- fixed side-panel popup markup inside `index.html`
- title, moon list, composition list, show-all-moons toggle, close button
- UI event propagation guards
- popup open on focus and close on empty-space click or `×`
- focus tracking that keeps the selected planet visually centered while other planets continue moving
- per-frame focus updates that move both `controls.target` and `camera.position` together from the latest selected-planet position while preserving the fixed per-planet camera offset established at focus start

- [ ] **Step 6: Verify the complete First Route interaction flow**

Manual check:
- click Earth
- camera smoothly zooms in
- OrbitControls are disabled during the tween and work again after the tween
- popup opens with Earth name, moons, and composition
- click empty space
- popup closes and camera returns to the default angled overview

This step is the first point where the spec-defined `First Route` milestone is fully satisfied.

- [ ] **Step 7: Commit the focus and popup flow**

```bash
git add index.html
git commit -m "feat: add planet focus tween and popup ui"
```

### Task 4: Add dropdown focus, scale toggle, reset control, and orbit buffer rebuild integration

**Files:**
- Modify: `index.html`
- Test: browser smoke check at `http://127.0.0.1:8000/index.html`

- [ ] **Step 1: Add failing self-checks for orbit rebuild consistency and UI state sync**

```js
console.assert(typeof rebuildOrbitGeometry === 'function', 'Missing orbit rebuild helper');
console.assert(getScaleToggleLabel('display') === 'リアルスケール', 'Display mode should prompt switching to real scale');
```

- [ ] **Step 2: Reload and confirm the new scale/UI checks fail before implementation**

Expected: assertion failure until the orbit rebuild helper and scale-toggle label helper are implemented.

- [ ] **Step 3: Implement the DOM control bar for dropdown, scale toggle, and reset**

```html
<div id="control-bar">
  <select id="planet-select">
    <option value="">惑星を選択</option>
  </select>
  <button id="scale-toggle">リアルスケール</button>
  <button id="reset-view">デフォルト表示に戻す</button>
</div>
```

Implement in this step:
- dropdown options from `PLANET_DATA`
- selection sync with click focus
- reset button that reuses the same camera restoration path as popup close

- [ ] **Step 4: Implement scale switching with orbit-geometry rebuild**

```js
function rebuildOrbitGeometry(planets, scaleMode, orbitGeometry) {
  const vertices = buildOrbitLineVertices(planets, scaleMode);
  orbitGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  orbitGeometry.attributes.position.needsUpdate = true;
  orbitGeometry.computeBoundingSphere();
}
```

Implement in this step:
- button label/state updates for `display` vs `real`
- recalculation of every planet's display orbit radius
- orbit vertex buffer rebuild on each scale change
- immediate synchronization between new orbit lines and animated planet positions

- [ ] **Step 5: Guard competing actions and finish integrated state handling**

Implement in this step:
- ignore new focus requests while `isTransitioning` is true
- reset `showAllMoons` when switching to a different planet
- clear selection state when popup closes
- ensure dropdown, popup, focus state, and camera state never disagree

- [ ] **Step 6: Verify the complete eight-planet integrated experience**

Manual check:
- dropdown focus behaves the same as click focus
- scale toggle visibly changes orbit spacing and keeps planets aligned to their orbit lines
- reset returns to the default overview from both focused and unfocused states
- show-all-moons toggle expands and collapses correctly

- [ ] **Step 7: Commit the control integration**

```bash
git add index.html
git commit -m "feat: add scale toggle reset and planet selector"
```

### Task 5: Final regression, polish, and release-readiness verification

**Files:**
- Modify: `index.html`
- Reference: `docs/superpowers/specs/2026-03-20-solar-system-design.md`

- [ ] **Step 1: Do a final runtime cleanup pass without changing behavior**

Cleanup targets:
- remove dead code and temporary logging
- keep section banners/comments succinct
- confirm only one `LineSegments` orbit object is used
- confirm starfield count constant is at or below 50,000

- [ ] **Step 2: Run the local app and execute the full manual smoke checklist**

Run: `python -m http.server 8000`
Expected: `Serving HTTP on 0.0.0.0 port 8000 ...`

Manual checklist:
- default view opens in angled overview
- all eight planets revolve continuously
- mouse drag rotates and wheel zooms
- click Earth to focus and open popup
- while Earth is focused, Earth remains visually fixed at the focus framing while the rest of the system keeps moving
- close via empty-space click
- close via popup `×`
- dropdown focus works
- scale toggle updates orbit spacing and line geometry
- reset returns to default view
- no visible crash when a planet texture fails and fallback material is used

- [ ] **Step 3: Check browser console for runtime errors and warnings**

Expected:
- no uncaught exceptions
- no repeated render-loop warnings
- no failed UI event propagation causing accidental popup close

- [ ] **Step 4: Commit the regression and polish pass if cleanup changed code**

```bash
git add index.html
git commit -m "chore: polish solar system interactions"
```

If Step 1 produced no source changes, skip this commit and record that the final review passed without additional edits.

- [ ] **Step 5: Hand off to final review and branch-finishing flow**

After Task 5 implementation is approved:
- run the final whole-change code review
- use `superpowers:finishing-a-development-branch`
- summarize any residual risks, especially remote texture availability and browser performance variance
