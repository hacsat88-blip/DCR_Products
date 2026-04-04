# Solar System Web App Design

## Summary

Build a desktop-only interactive web app that renders the eight planets of the solar system around the sun in a cinematic deep-space scene. The default presentation uses logarithmic orbital distances, with an alternate real AU-distance mode. Users can rotate and zoom the full scene with the mouse, click a planet to smoothly focus it, inspect a DOM-based information panel, switch scale modes, pick a planet from a dropdown, and reset back to the default camera view.

The visual direction is cinematic first, with a small amount of heightened neon-like presentation in glow, orbit treatment, and background polish. Planet appearance should remain texture-led and realistic rather than stylized.

## Goals

- Render the sun and all eight planets in one Three.js scene.
- Animate planetary revolution continuously by default.
- Use logarithmic orbital positioning as the default display mode.
- Allow switching between `display scale` and `real scale`.
- Support mouse drag rotation and wheel zoom through OrbitControls.
- Support planet click focus with Tween.js camera motion.
- Show a DOM popup with planet name, major moons, composition, and a show-all-moons toggle.
- Support closing the popup via close button or background-space click.
- Support planet focus through a dropdown selector.
- Support resetting the camera to the default angled overview.
- Render a polished space background using a starfield particle system rather than a full galaxy simulation.

## Non-Goals

- No mobile layout or touch optimization.
- No external API or database.
- No bundler-based build pipeline.
- No requirement for exact real-size planet radii in view space.
- No full galaxy simulation beyond a performant cinematic background.

## Constraints

- Deliver as a single HTML file using CDN-loaded Three.js, OrbitControls, and Tween.js.
- Planet data must be hardcoded locally.
- The sun must also act as a PointLight source.
- Planet materials must use MeshStandardMaterial.
- Texture loading must be lazy and must always have a procedural/fallback MeshStandardMaterial path.
- Starfield particle count must stay at or below 50,000 points.
- Orbit lines must be drawn in one batched LineSegments object.
- Scale switching must recalculate and update orbit line vertex buffers.
- Raycaster hit tests must use the planet position snapshot from the click frame.
- Tween.js camera motion must disable OrbitControls during the transition and re-enable them after completion.
- Popup UI must be implemented in DOM/CSS, separate from the Three.js scene.

## User-Approved Decisions

- Visual direction: cinematic dark-space look with a small blend of stronger presentation glow.
- Initial camera: angled overview.
- Focus behavior: the selected planet appears visually fixed by tracking it, while the rest of the system keeps moving.
- Focus camera framing: focused mode always uses a fixed per-planet camera offset rather than preserving the user's prior browsing offset.
- Planet rendering priority: realistic textures first; stronger presentation comes from glow, orbit treatment, and background atmosphere.
- Texture sourcing: use static remote image URLs as the first-choice texture source, and fall back immediately to tuned MeshStandardMaterial generation if loading fails.
- Browser companion was unavailable locally, so design validation was completed through text review.

## System Shape

The app lives in one HTML document with inline CSS and inline JavaScript modules. Internally, the code is separated by responsibility rather than by file:

- `App`: bootstraps renderer, scene, camera, controls, resize handling, and the animation loop.
- `SolarSystemRuntime`: owns planet data, planet meshes, orbit geometry, revolution updates, scale transforms, and the starfield background.
- `InteractionManager`: owns Raycaster setup, click-frame position snapshots, planet hit testing, and empty-space dismissal.
- `CameraDirector`: owns Tween.js transitions, default view restoration, focus transitions, and OrbitControls enable/disable rules.
- `OverlayUI`: owns popup DOM, dropdown focus control, scale toggle, reset button, and UI state sync.

Only one Three.js scene is used. Scene content is organized into logical groups:

- `sunGroup`
- `orbitGroup`
- `planetGroup`
- `starfieldGroup`

This keeps rendering simple and reduces synchronization bugs compared with multi-scene or dual-rig approaches.

## Data Model

Planet data is a single hardcoded array of eight objects. Each object includes:

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
- optional presentation details such as emissive tint or ring settings where needed

Two kinds of values are intentionally separated:

- `real data`: orbital radius in AU and orbital period
- `display data`: mesh radius and focus distance for legibility

This means scale switching affects orbital distance presentation, not planet mesh size. That is intentional and required for readability.

## Scale Design

The runtime supports two orbital scale modes:

### Display Scale

Default mode. Orbital distance is derived from a logarithmic transform based on AU, producing a readable full-system overview with visible spacing between inner and outer planets.

### Real Scale

Alternate mode. Orbital distance uses a linear AU-derived transform, preserving real orbital distance ratios.

### Shared Rule

Planet mesh radii do not change between modes. Only orbital radius presentation changes.

### Update Mechanism

When the user switches scale mode:

1. Update the active orbital transform function.
2. Recompute each planet's display orbit radius.
3. Recompute each planet's rendered position from the same source transform.
4. Rebuild the LineSegments vertex buffer for all orbit rings.
5. Mark the orbit geometry attributes for update.

This guarantees orbit lines and animated planets stay aligned.

## Rendering Design

### Sun

- The sun stays at the origin.
- It uses a bright emissive sphere mesh for the visible body.
- It also owns the main PointLight for planetary lighting.
- A subtle halo/glow treatment may be added with layered transparent geometry, but not by introducing a postprocessing stack.

### Planets

- Each planet uses a MeshStandardMaterial.
- Textures load lazily from declared static remote URLs.
- Until a texture is loaded, or if loading fails, the planet uses a fallback MeshStandardMaterial built from hardcoded color, roughness, and light procedural tweaks.
- Fallback quality must be good enough that the app still looks intentional with zero texture success.
- Texture failure must not block scene initialization, interaction, or animation startup.

### Orbits

- Orbits are visualized as a single LineSegments batch.
- The look should support the cinematic direction: dim cool-toned lines by default, with slightly stronger accent treatment than a pure scientific chart.
- Line intensity must remain subordinate to the planets and the sun.

### Background

- Use a dense but bounded starfield particle system.
- Target the look of deep space with soft depth variation, color temperature variation, and sparse brighter stars.
- Do not attempt a full galaxy simulation.
- Keep particle count at or below 50,000.

## Animation Design

Planet revolution runs continuously in the default view and during focus mode. Each frame:

1. Compute elapsed time.
2. Update each planet's orbital angle from its orbital period.
3. Convert the angle plus active scale mode into display-space position.
4. Write the latest world position into the interaction snapshot store.
5. If a planet is focused, update focus tracking targets for the camera controller.

The selected planet is never physically paused. Instead, camera targeting is updated each frame so it appears visually fixed to the viewer while the rest of the system continues moving.

## Interaction Design

### OrbitControls

- Mouse drag rotates the system view.
- Mouse wheel zooms.
- Controls remain enabled during normal browsing.
- Controls are disabled only during Tween.js-driven camera transitions.

### Click Hit Testing

- Raycaster hit tests use planet positions captured on the click frame.
- This avoids timing mismatch between the animation loop and click processing.
- Only planet meshes participate in selection hits.

### Planet Focus

When the user clicks a planet or selects one from the dropdown:

1. Resolve the target planet from the current snapshot.
2. Disable OrbitControls.
3. Tween both `camera.position` and `controls.target`.
4. Use a per-planet `focusDistance` plus a slightly elevated off-axis camera offset.
5. Re-enable OrbitControls after the tween completes.
6. Open the popup and sync the dropdown selection.

The camera offset is always chosen from a fixed cinematic framing rule per planet, not inherited from the user's prior browsing angle. The framing should preserve shading and three-dimensionality rather than moving to a flat head-on view.

### Focus Tracking

While focused:

- The selected planet remains centered by continuously updating `controls.target` to the planet's latest position.
- The camera position should move consistently with that target tracking so the focused planet appears stable on screen.
- Other planets continue revolving normally.

### Close and Reset

Close actions:

- popup close button
- empty-space click

On close:

- the popup closes
- selection state clears
- the camera tweens back to the default angled overview

The explicit reset button performs the same camera restoration, regardless of whether a popup is open.

### Transition Guarding

- Ignore new focus requests while a camera tween is already running.
- Keep a single `isTransitioning` flag in shared state.

## UI Design

UI is DOM/CSS overlay, visually separated from WebGL content.

### Control Bar

Minimal overlay controls include:

- planet dropdown
- `real scale / display scale` toggle
- `reset to default view` button

The bar should use a dark translucent glass-like style with clear contrast and restrained visual noise.

### Planet Popup

The popup is a fixed side panel rather than a world-anchored label. This is deliberate for readability while the 3D scene continues moving.

Content:

- planet name
- major moons, initially up to 5
- composition list
- `show all moons` toggle
- close button

Behavior:

- UI clicks must not bubble into background dismissal.
- The popup opens on focus and closes on explicit close or empty-space click.
- Expanding the moon list only changes panel content, not camera state.

## State Model

Keep shared mutable UI/runtime state intentionally small:

- `selectedPlanetId`
- `isPopupOpen`
- `scaleMode`
- `isTransitioning`
- `showAllMoons`
- `focusedPlanetId`
- `defaultCameraPose`

This reduced state surface lowers conflict risk between focus, close, reset, and scale switching.

## First Route Milestone

The first visible milestone should be delivered in this order:

1. Show the sun, Earth, and Mars with logarithmic orbit lines and active revolution.
2. Confirm mouse drag rotation and wheel zoom work through OrbitControls.
3. Confirm clicking Earth triggers Tween.js zoom-in and opens the info popup.
4. Confirm clicking empty space closes the popup and returns to the default view.

Completion for this milestone requires these four milestone checks to run sequentially without errors and with orbit lines visible for the displayed planets.

## Full Feature Completion Criteria

- All eight planets render and revolve.
- Default mode is logarithmic orbital scale.
- Real/display scale toggle updates both planets and orbit lines correctly.
- OrbitControls rotation and zoom work in default browsing mode.
- Planet click focus uses Tween.js and disables controls during transition.
- Focus from dropdown behaves the same as click focus.
- Selected planet remains visually fixed through focus tracking.
- Popup shows name, major moons, composition, and full moon expansion.
- Popup closes from close button and empty-space click.
- Reset returns the scene to the default angled overview.
- Background remains performant and visually polished.

## Risks And Mitigations

### Single-file complexity

Risk: the HTML file becomes hard to maintain.

Mitigation: structure code into clearly named sections and classes within the file, matching the runtime boundaries defined above.

### Texture failure

Risk: CDN or asset load failure degrades appearance.

Mitigation: fallback materials are required and should be intentionally tuned, not plain placeholder colors.

### Focus jitter

Risk: focus tracking may jitter if selection, tweening, and orbital updates use inconsistent positions.

Mitigation: keep one authoritative position update path and store click-frame snapshots explicitly.

### Scale-switch mismatch

Risk: planets and orbit lines can desynchronize if only one representation is updated.

Mitigation: scale change always rebuilds both display positions and the orbit line buffer from the same transform.

## Planning Boundary

This spec is scoped for a single implementation plan and one integrated app. It is intentionally not split into multiple deliverables because the approved work is one cohesive single-page interactive experience with staged internal milestones rather than independent products.
