# V0.9289 — Graphics and AR preparation first pass

## Graphics contract

| Preset | Orb sphere | Sculpted Totem | Living decoration cache | Default rain |
|---|---|---|---|---|
| LOW | 16 × 24 bands | 24 × 16 segments; 256 × 512 material | 1050 × 1125; simplest leaf shading | Off |
| MED | 32 × 48 bands | 48 × 32 segments; 512 × 1024 material | 1400 × 1500; leaf veins and root highlights | Low |
| HIGH | 48 × 72 bands | 72 × 48 segments; 1024 × 2048 material | 2100 × 2250; fine veins, leaf edges, soil relief and root fibres | HQ |

Auto recommends LOW when exposed memory/core hints are limited; unknown devices and Quest start at MED. These are hints, not a GPU benchmark or continuous FPS adaptation. A manually chosen HIGH stays HIGH. Shape, authored data, anchors, hit targets, growth timing and tutorial routes stay intact. Refresh rate remains independent.

Rain is one setting: Off, Low (60 drops), High (220), HQ (480 plus 24 expanding ground ripples). Former V2 is HQ. All immersive modes use depth-tested soft triangle ribbons. HQ has broader tapered highlights and glints, with a bounded 1728 triangles per eye and no fullscreen bloom. Vertex buffers are reused between frames and eyes. Reduced motion suppresses ambient rain.

Info opacity controls main screen, Control panel and LIMO backgrounds from 0 to 100%. Text, outline and connections retain their opacity. PIMO plant cell glass remains independently adjustable. Default glass is 38%; opaque panels remain an explicit readability choice.

LIMO deliberate selection is now 300 ms, down from 500 ms; same-target and synthetic-input guards remain. Orb hold-to-move timing stays independent.

## Loading audit

- Initial: `app/index.html` requests five stylesheet families through Google Fonts, local styles, `main.js` and its large eager module graph (including Creator, Demo and dashboards). Core Orb/Totem meshes, shaders and living-frame art are procedural, not GLTF downloads. No separate audio files are currently shipped.
- Runtime: `pimInfoPanel.js` requests plant/tutorial/LIMO illustrations as panels open. `temporaryArDemo.js` dynamically imports the bee module; its 7.96 MB GLB is fetched and parsed afterwards. Three.js is confined to that bee path; spatial Orb/Totem rendering is raw WebGL.
- Heavy media: see the 20 candidates below. Recompression was not applied because visual quality needs review. Illustrations are significantly larger than necessary for many panel views; WebP variants are candidates for a separate reviewed conversion.
- Duplicate preparation: panel instances previously constructed their own Image objects, and bee mounts fetched/parsed independently. HTTP caching may already avoid a second transfer, but decode/preparation was not shared. New in-flight registry and eight-image decoded LRU reuse images across preload and spatial panel rendering. DOM `<img>` elements still use normal browser image caching.
- Blocking: the large eager JS graph still precedes welcome rendering. This pass does not rewrite routing/import architecture. GPU shader compilation, GL buffers/material upload and bee GPU preparation still require rendering contexts and occur during renderer initialization; downloading media does not prove GPU readiness.
- Existing cache: production Apache revalidates JS/CSS/HTML, caches images one hour; no service worker is registered and `main.js` deliberately unregisters old workers. GLB, AVIF, font and optional audio extensions now get the same one-hour HTTP cache policy. No API/project data is cached. Local dev has no new service-worker cache.
- Bee GLB: one mesh, three animations and four textures; triangle count recorded below. Draco/Meshopt/KTX2 was not added to its custom loader; that requires a targeted compatibility and image-quality audit.

## Focused preparation implementation

Demo critical: the first Control panel knowledge-wheel illustration plus Fraunces/Manrope/Marcellus font preparation. Font failures/slow responses fall back after four seconds. Creator critical: common fonts only, without unrelated demo imagery; project media stays scoped to actual content.

Near-future: two common demo/plant images, sequential decoding; then bee module and GLB parsing through a reused promise. This does not block entry. Data-saver sessions skip speculative near-future downloads. Remaining LIMO, later tutorial art, project media and future audio are on demand.

Progress reports settled required resources, never a timer simulation. The entry button stays disabled on a failed critical image; retry clears failed requests. Image/network preparation has a 30-second timeout. No automatic audio playback.

The existing introduction and Creator entry offer recommended graphics before entry. Creator uses a small preparation overlay, preserving the page behind it. Remembered preparation can be skipped once common resources are ready. AR launch runs directly from the final button click, preserving the browser user gesture. No asynchronous preload wait is inserted immediately before requestSession.

## Validation and measurement

- Automated checks: 468 passing; image decode/reuse, bounded concurrency, stalled-request retry, real progress, level budgets, finite geometry, reused rain buffers/eye draws, existing interaction/navigation checks.
- Hosted build V0.9289; welcome badge verified in the local built UI.
- Browser preparation study: first local preparation 131 ms, same-session repeat rounded to 0 ms, four resources settled. This is local/cached-browser evidence, not a cold remote-network benchmark.
- Canvas showcase benchmark (forces pixel readback each sample): LOW median 95.2 ms / p95 122.3; MED 96.0 / 130.0; HIGH 94.3 / 149.2. Without frame medians ~32 ms. This is a desktop browser canvas/readback measurement, not XR display frame time or Quest GPU time. Decoration refresh stays at one second; these results do not certify 120 Hz.
- Cold transferred MB, total initial network requests, loader first-paint time, HTTP repeat-visit benefit and live slow-network latency have not been measured. No fabricated before/after improvement claim is made.
- Physical Quest/Android XR device unavailable to this agent. Test entry/exit, LOW→MED→HIGH changes, HQ vs High vs Off, FPS/120 Hz, both-eye appearance, LIMO 300 ms selection and glass at 0/38/100%. Test warm return and an uncached slow connection. Rain floor height is estimated when no floor space is available.

## Largest image/model candidates

| Asset | MiB |
|---|---:|
| `app/assets/bee.glb` | 7.96 |
| `app/assets/demo-tutorial-art/10-connected-areas-garden.png` | 3.69 |
| `app/assets/demo-tutorial-art/01-plant-curiosity.png` | 3.42 |
| `app/assets/demo-tutorial-art/05-totem-unfolds-garden-knowledge.png` | 3.33 |
| `app/assets/living-knowledge-seed-atlas.png` | 3.28 |
| `app/assets/limo-cell-art/lim-food-forest-ecology-soil-life.png` | 2.99 |
| `app/assets/limo-cell-art/lim-food-forest-function-habitat.png` | 2.90 |
| `app/assets/demo-tutorial-art/06-plant-orb-effects.png` | 2.86 |
| `app/assets/limo-cell-art/lim-pin-observation.png` | 2.85 |
| `app/assets/demo-tutorial-art/09-explore-archetype-pathways.png` | 2.85 |
| `app/assets/limo-cell-art/lim-food-forest-ecology.png` | 2.83 |
| `app/assets/limo-cell-art/lim-food-forest-layers-canopy.png` | 2.80 |
| `app/assets/limo-cell-art/lim-climate-tropical-rainfall.png` | 2.79 |
| `app/assets/limo-cell-art/lim-intro-food-design.png` | 2.75 |
| `app/assets/limo-cell-art/lim-plant-soil-soil-life.png` | 2.71 |
| `app/assets/limo-cell-art/lim-plant-soil.png` | 2.71 |
| `app/assets/limo-cell-art/lim-intro-analysis-landscape.png` | 2.70 |
| `app/assets/limo-cell-art/lim-intro-literacy.png` | 2.70 |
| `app/assets/limo-cell-art/lim-food-forest.png` | 2.68 |
| `app/assets/demo-tutorial-art/04-create-an-area.png` | 2.67 |

Bee geometry: 51731 triangles, 4 texture(s), 3 animation(s).
