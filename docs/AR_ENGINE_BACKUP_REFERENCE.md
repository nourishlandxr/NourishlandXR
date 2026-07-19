# Nourishland XR — AR Engine Backup & Reference Guide

_Generated 2026-07-19 | Engine restored from `NourishlandXRold`_

---

## 1. Overview

The AR engine was fully restored to its last known working state from the backup at `C:\FILES\Projects\website\github\NourishlandXRold`. This document describes every component, its purpose, and how to reconstruct or extend each part.

---

## 2. Restored Files

| File | Purpose | Lines |
|------|---------|-------|
| `app/services/arNote.js` | Main AR engine — XR session, hit testing, panel placement, marker creation, WebGL render loop | ~630 |
| `app/services/targetReticle.js` | On-screen crosshair + marker hover detection for explorer mode | 58 |
| `app/services/spatialPositioning.js` | GPS → XR coordinate math (NOT restored — kept current version) | 79 |
| `docs/AR_ENGINE_BACKUP_REFERENCE.md` | This file | — |

### Not restored (kept current versions):

| File | Why kept |
|------|----------|
| `app/screens/explorer.js` | Contains location/visitor/welcome features added after old backup, still compatible |
| `app/screens/arMode.js` | Newer lightweight AR path — can coexist with arNote.js |
| `app/services/spatialPositioning.js` | GPS math logic — working, not part of rendering failure |

---

## 3. Engine Architecture

### 3.1 Flow

```
User taps "Start AR"
  ↓
startArNote(marker, profile)
  ↓
navigator.xr.requestSession('immersive-ar', { requiredFeatures: ['hit-test'] })
  ↓
XRWebGLLayer created, reference spaces set up
  ↓
hitSource created from 'viewer' reference space
  ↓
Draw loop starts: session.requestAnimationFrame(draw)
  ↓
Every frame:
  1. Get viewer pose from frame
  2. If scanning → captureTrackingState() — checks hit test results
  3. If placed → updateMenuTarget() — raycast panel for hover
  4. Clear framebuffer, draw panel at placedMatrix location
  ↓
User taps → select event:
  - If placedMatrix exists → selectPanel() checks ray hit against panel
  - If scanning → placeFromLatest() snaps panel to hit test result
```

### 3.2 State Machine

```
placementState values:

'idle'               — Session not started
'scanning'           — Looking for surfaces (hit testing active)
'placed'             — Main menu panel placed on a surface
'marker-scanning'    — Looking for surface to place a new marker
'marker-parent'      — Asking for parent checkpoint name
'marker-name'        — Asking for marker name input
'marker-confirmed'   — Marker placed, showing confirmation overlay
```

### 3.3 Key Variables

| Variable | Type | Purpose |
|----------|------|---------|
| `placedMatrix` | Float32Array(16) | Panel position in XR space (world matrix) |
| `rootMenuMatrix` | Float32Array(16) | Saved panel position when entering marker flow |
| `temporaryMarkerMatrix` | Float32Array(16) | Marker flag position (before confirmation) |
| `latestHitTransform` | Float32Array(16) | Most recent hit test result matrix |
| `latestViewerPosition` | {x,y,z} | Camera position from last frame |
| `surfaceAvailable` | boolean | Whether latest frame had a valid hit test |
| `panelView` | 'root' | 'plant' | 'note' | 'marker_flag' | Which panel texture to show |
| `hitSource` | XRHitTestSource | Active hit test subscription |
| `refSpace` | XRReferenceSpace | 'local-floor' or 'local' |
| `session` | XRSession | Active WebXR session |
| `gl` | WebGLRenderingContext | WebGL for panel rendering |

---

## 4. Panel Rendering

### 4.1 Geometry

- Main panel: `PANEL_WIDTH = 0.92`, `PANEL_HEIGHT = 1.06` (meters in XR space)
- Marker flag: `0.38 × 0.20` meters
- Canvas: 1200×1400 pixels for panel, rendered to WebGL texture
- Quad: 2 triangles, 6 vertices, interleaved (position, texcoord) stride 20 bytes

### 4.2 Shaders

**Vertex shader:**
```glsl
attribute vec3 position;
attribute vec2 texCoord;
uniform mat4 modelViewProjection;
varying vec2 uv;
void main() { gl_Position = modelViewProjection * vec4(position, 1.0); uv = texCoord; }
```

**Fragment shader:**
```glsl
precision mediump float;
varying vec2 uv;
uniform sampler2D panelTexture;
void main() { gl_FragColor = texture2D(panelTexture, uv); }
```

### 4.3 Panel Views

| Panel | Function | Description |
|-------|----------|-------------|
| Root menu | `drawMenu()` | 6 options: Intro, Sub, Plant, Note, Lemon Drop, Welcome |
| Plant profile | `drawPlantProfile()` | Shows `plantProfile` data |
| Welcome note | `drawWelcomeNote()` | Static welcome text |
| Marker flag | `drawMarkerFlag(label)` | Temporary marker confirmation |

---

## 5. Interaction System

### 5.1 Tap/Surface Detection (XR select event)

1. **If placedMatrix exists** (panel already placed):
   - `selectPanel(event)` computes ray hit against panel
   - If hit, checks which menu option and invokes `startMockFlow()` or profile view
   - If `panelView !== 'root'`, any tap returns to root menu

2. **If scanning** (no panel yet):
   - `placeFromLatest('xr')` uses latest hit test position
   - Calls `makeVerticalPlacement()` or `makeMarkerPlacement()`

### 5.2 Pointer Fallback (for devices without XR select)

- `handlePointerFallback()` listens to `pointerdown`
- After 450ms of not lifting finger, calls `placeFromLatest('pointer')`
- Only active during scanning states

### 5.3 Menu Hover (reticle)

- `updateMenuTarget()` casts ray from camera to panel each frame
- Highlights options with `item-targeted` CSS class
- Shows `reticleLabel` text

---

## 6. Marker Creation Flow

```
User taps menu option (e.g. "Add Plant Marker")
  ↓
startMockFlow('plant')
  ↓
rootMenuMatrix = placedMatrix (save panel position)
placementState = 'marker-scanning'
  ↓
User moves phone, finds surface, taps
  ↓
placeFromLatest() → makeMarkerPlacement()
  ↓
temporaryMarkerMatrix set
Panel switches to small flag geometry (0.38 × 0.20)
placementState = 'marker-name'
  ↓
DOM overlay shows name input
User types name, hits Confirm
  ↓
drawMarkerFlag(name)
placementState = 'marker-confirmed'
  ↓
DOM overlay: "Add Information" / "Done"
"Done" → returnToRoot() — restores main panel
```

---

## 7. DOM Overlay

The old engine uses `document.body` as the DOM overlay root for input forms (naming markers, parent checkpoint). These elements are created during AR and removed on exit:

| Element ID | Purpose |
|-----------|---------|
| `#arOverlayControls` | Top status bar + Reset/Exit buttons |
| `#arPlacementReticle` | Centre-screen dot (CSS styled via `style.css`) |
| `#arReticleLabel` | Text label above reticle |
| `#arMockOverlay` | Inline form: name input, confirm/cancel buttons |
| `#arCanvas` | WebGL canvas (fixed, full-screen, z-index 9000) |

---

## 8. CSS Requirements

The following CSS classes in `style.css` support the AR engine. If missing, restore them from the old backup:

```css
body.ar-session-active          /* Hides #app, shows camera */
#arOverlayControls              /* AR status bar */
#arOverlayStatus                /* Status text */
#arPlacementReticle             /* Centre dot */
#arReticleLabel                 /* Hover label */
#arMockOverlay                  /* Input overlay */
.ar-modal                       /* Modal forms */
.ar-modal-card                  /* Modal content */
```

---

## 9. Known Issues & TODO

### Critical (AR not working):
- [ ] Hit testing may fail on devices without ARCore/ARKit
- [ ] `hitSource = await session.requestHitTestSource()` fails if session doesn't support 'hit-test'
- [ ] Some Android Chrome versions block XR without HTTPS and localhost exception

### Moderate:
- [ ] Panel resolution (1200×1400 canvas) is oversized for mobile
- [ ] No floor detection fallback if 'local-floor' reference space fails
- [ ] Marker names not persisted (mock only, in-memory)
- [ ] No error handling for `selectPanel()` if `event.inputSource` is null

### Nice-to-have:
- [ ] Add `window.__nxrArModePanelNeedsReposition` one-shot positioning (from newer arMode.js)
- [ ] Cache GL uniform/attribute locations instead of per-frame `getUniformLocation()`
- [ ] Add visible debug log (dlog function from newer arMode.js)
- [ ] Add `.env` variable to toggle between "full scanning" and "fixed position" modes

---

## 10. How to Rebuild Each Component

### Step 1: Verify XR Support
```js
if (!navigator.xr) { /* WebXR unavailable */ }
if (!await navigator.xr.isSessionSupported('immersive-ar')) { /* not supported */ }
```

### Step 2: Request Session
```js
session = await navigator.xr.requestSession('immersive-ar', {
    requiredFeatures: ['hit-test'],
    optionalFeatures: ['dom-overlay', 'local-floor']
});
```

### Step 3: Set Up WebGL
```js
const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl', { alpha: true, xrCompatible: true });
await gl.makeXRCompatible();
session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl) });
```

### Step 4: Get Reference Spaces
```js
refSpace = await session.requestReferenceSpace('local-floor');
// fallback: 'local'
const viewerSpace = await session.requestReferenceSpace('viewer');
hitSource = await session.requestHitTestSource({ space: viewerSpace });
```

### Step 5: Start Draw Loop
```js
function draw(time, frame) {
    session.requestAnimationFrame(draw);
    const pose = frame.getViewerPose(refSpace);
    if (!pose) return;
    // ... render
}
session.requestAnimationFrame(draw);
```

### Step 6: Handle Placement
```js
session.addEventListener('select', event => {
    const pose = frame.getViewerPose(refSpace);
    const hitResults = frame.getHitTestResults(hitSource);
    if (hitResults.length > 0) {
        const hitPose = hitResults[0].getPose(refSpace);
        // set placedMatrix from hitPose.transform.matrix
    }
});
```

---

## 11. Version History (AR Engine)

| Version | Date | Changes |
|---------|------|---------|
| v0.8402 | 2026-07-19 | Full restore from NourishlandXRold. Added diagnostic stubs for compatibility. |
| v0.8.0+ | 2026-07-18 | Various attempted fixes adding dlog, one-shot positioning, caching. |
| v0.8127 | 2026-07-11 | Working engine with hit testing, panel placement, marker creation. |

---

## 12. Quick Reference Commands

```bash
# Check currently deployed version
curl https://nourishland.org/xr/services/buildInfo.js

# Deploy: push to main triggers GitHub Actions
git add -A
git commit -m "describe change"
git push origin main

# Verify deployment
open https://github.com/nourishlandxr/NourishlandXR/actions