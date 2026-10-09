# Living Frame outer ring — stage 4 diverse growth and bloom

## Current review: original-frame richness and a visible growth sequence

The previous rim was too static and repetitive, and its flower accents were too
small. This revision creates a separate `diverse-ring` draft and preserves all
earlier model files. It does not integrate into the live application or alter its
text loading, navigation, timing or reveal. Other shared-checkout edits are preserved.

- `create_diverse_ring.py`: repeatable generation in a NEW visible Blender window.
  Uses `create_botanical_section.py` for shared mesh, soil, texture and export helpers.
  Optional variation: Blender arguments `-- --seed 94039` (change the seed number).
- `diverse-ring.blend`: editable meshes, shape keys, 60-second timeline and packed textures.
- `diverse-ring.glb`: runtime candidate with one synchronized morph-animation clip.
- `diverse-ring-dimensions.json`: growth habits, counts, seed, root and vine details.
- `diverse-ring-perspective.png`, `diverse-ring-detail.png`: mature Blender renders.
- `diverse-preview-soil.png`, `diverse-preview-growth.png`, `diverse-preview-root-growth.png`,
  `diverse-preview-buds.png`, `diverse-preview-flower-detail.png`, `diverse-preview-bloom.png`:
  browser milestone evidence.
- `verify-full-ring.mjs --diverse`, `diverse-ring-verification.json`: actual exported
  geometry, morph weights, growth staggering and flowering checks.
- `diverse-browser-review.json`: directly observed preview controls and release badge.

The existing preview URL with `?model=full` now loads this revision. New visits
start at the early state and play through growth; reduced-motion visits show the
flowering finish. Stage buttons jump to Soil, Leaf growth, Vines & roots and Flowers
open. Blooming finish, scrub, pause/resume, orbit/zoom and a new Root detail view
support close inspection. `?model=previous` preserves the earlier full ring;
`?model=botanical` and `?model=plain` preserve the earlier section and plain form.

There are **64 smaller planting clusters across six habits**, plus **six larger
foreground leaf clusters**. Oval branched shrubs, blue-green rosettes, pinnate
fronds, arching grass, lobed groundcover and silver herbs have different structures
and leaf sizes. Planting positions, sizes, branching and growth waves are seeded
independently. Seeded randomness makes generation repeatable; a different seed
produces a different authored layout, rather than random motion on every frame.

**18 root systems** vary between longer tap-root structures, spreading fans and
fine fibrous mats. **11 aerial roots** hang under the lower arc with varied
lengths, front/back placement, bends and forks. Their placement is informed by the
original `app/services/arWelcomeRoots.js` lower-arc aerial-root section (around
line 547). **Nine climbing/trailing vines** have longer curved paths, paired lobed
leaves and coiled tendrils. Branchlets and tendrils start from their parent anchor.

**27 flowers** form closed buds before opening, with ivory daisy, lavender pointed
and coral rounded petal shapes. The flower-opening groups start at approximately
42–49 seconds and finish before 60 seconds. Flowers are not static from the start.
The 60-second sequence is compressed for review, not a botanical timescale.

Growth uses two additive shape keys per group: extension and opening. Each plant
grows from its own anchor within a batch. This retains clear text space and avoids
scaling the complete ring toward a shared origin. There are 53 animated groups;
the six foliage habits have different maturity at the same time. Species-specific
anatomy and lifelike motion are not claimed by this generic procedural study.

Latest asset: **77,198 triangles, 57 meshes/primitives, four embedded textures,
one clip, 53 animation channels and 6,457,644 bytes**. Mature measured envelope:
**2.138 m × 2.304 m × 0.365 m** including foliage, vines and aerial roots.
The original 1.664 m central opening and 0.800 m protected reading radius remain.
The minimum vertex radius is 0.832 m at all 21 sampled times (every three seconds).
Verification includes sparse morph accessors and actual deformed vertex positions.

Export checks passed for early foliage state, staggered growth, flower petals
closed at 38 seconds and fully open at 60, vine/aerial-root tracks, texture and
reference exclusion, geometry budgets and centre clearance through the sequence.
Visible browser review checks the early state, intermediate foliage, roots, closed
buds and open flowers. The generator saved and rendered in a fresh visible Blender
window; earlier windows were preserved. Save manual edits to a separate name before
regenerating, which overwrites only this draft's outputs and creates a `.blend1` backup.

Version advanced from the observed shared **0.9439** to **0.9440** for this revision.
The frontend build and local welcome badge were verified; `welcome-0.9440.png`
records the badge. No commit, push or deployment was performed by this task.

**Review limitations and next step:** this is a richer procedural draft, not a
finished replacement for the original immersive frame. Reference photographs of
hanging root structures, large-leaf contrast and layered planting viewed from the
side will help the next art pass. Soil still needs a more natural surface and leaf
anatomy needs refinement. Native WebXR integration must support morph playback (or
use a baked mature variant), preserve independent text and retain the original
frame as fallback. Quest/device performance is unverified. No landscape, portal,
text pause, creatures or live timing changes were introduced.

---

# Earlier stage 3 record

## Current handoff: complete planted rim

The planted section has been extended into a separate full-ring draft. This remains
an isolated visual review: the application Living Frame, its text loading, timing,
navigation and reveal code were not changed by this task. Unrelated shared-checkout
edits were preserved. No commit, push or deployment was performed.

- `full-ring.blend`: editable complete rim, packed textures, animation and independent text reference.
- `full-ring.glb`: runtime candidate, excluding reference text and cameras.
- `create_full_ring.py`: launch in a NEW visible Blender window; imports the shared geometry helper `create_botanical_section.py`. Both scripts are embedded in the generated Blender file.
- `full-ring-dimensions.json`: stage and growth metadata.
- `full-ring-perspective.png`, `full-ring-detail.png`: Blender renders.
- `full-ring-preview-front.png`, `full-ring-preview-side.png`, `full-ring-preview-detail.png`, `full-ring-preview-final.png`: browser review evidence.
- `verify-full-ring.mjs`, `full-ring-verification.json`: exported-asset checks and geometry measurements through the animation.
- `full-ring-browser-review.json`: directly observed preview checks and welcome version.

The preview defaults to this full ring at
`http://127.0.0.1:8769/docs/living-frame-blender/preview.html`.
`?model=botanical` keeps the original section available; `?model=plain` keeps the
plain prototype. Earlier Blender files and GLBs are preserved.

There are 79 groundcover pockets with varied sizes and five quieter spaces.
Glossy oval, fine creeping and sage-like forms overlap across the planting depth,
with four cascading accents, sparse flowers, continuous layered soil, litter,
aggregates and exposed roots. These are generic growth habits, not botanical
species models. The fuller revision moves most planting toward the viewer and
removes the pale scaffold edge. Three shoots retain stem extension, six hinged
leaves and developing roots; only their nearby foliage patches expand. Most
established vegetation is static and batched by material.

Measured mature envelope: **1.976 m wide × 1.992 m high × 0.345 m deep**.
The original opening remains **1.664 m**, scaffold diameter **1.824 m**, scaffold
depth **0.180 m** and face width **0.080 m**. The soil extends to approximately
0.195 m in depth. The protected text radius remains 0.800 m; the minimum geometry
radius was 0.832 m at each of seven sampled growth times (0–36 s).

The GLB contains **89,428 triangles, 29 meshes/primitives, four embedded textures,
one 36-second growth clip and 24 animation channels**, at **4,209,252 bytes**.
The prior section contains 82 meshes and 50,219 triangles: batching avoids simply
multiplying the section's independently animated objects around the ring.
This is a provisional desktop review budget, not proof of Quest performance.

Export checks pass for textures, reference exclusion, six leaf rotations, three
extending stems, mesh/triangle budgets and animated clearance. The browser loads
the actual GLB and displays matching triangle/mesh counts and 34.5 cm depth.
Front, side and detail views, orbit/zoom, growth start/play/pause and mature reset were checked
directly in the existing browser. The earlier section and plain comparison were loaded and remain
available. Screenshots document the visible review rather than a live-app replacement.

The generation was visible in a fresh Blender window. Native GUI automation is
not available through this session's enabled computer-control surface; scripts
create the geometry and set the saved perspective viewport. Front/side/detail
milestones were inspected in the browser. Existing Blender windows were left open,
including the first full-ring draft, after automatic approval review rejected
terminating that process because it could discard manual state. Save any manual
variations under a different filename before rerunning the generator, which
overwrites full-ring outputs while retaining a Blender `.blend1` backup.

This task advanced the version to **0.9436** for the prototype update. Concurrent
work advanced the shared version to **0.9437** before the final frontend build.
That build passed; the locally built welcome badge was checked and saved as
`welcome-0.9437.png`. The badge's “Live” wording describes the production build
target and does not establish deployment.

**Next review:** judge the full silhouette, visible planting mass and thickness.
Before integration, refine soil texture and plant shapes where needed, then
measure native WebXR performance and decide LOD/texture/animation budgets.
Integration must keep text independent of GLB readiness and retain the existing
frame as a fallback. No worms, landscape, portal or text pause were implemented.

---

# Earlier stage 2 record

## Current handoff: planted section and growth study

One 105-degree upper-left sector now has layered soil, texture, roots and vegetation. The rest of the ring stays plain for comparison. Stage-one files are preserved; no ring integration was performed in the live application.

- Open `botanical-section.blend` in Blender; it was generated in a visible new window, with the timeline at its mature state.
- `create_botanical_section.py` loads the original plain model into a new window and generates separate botanical assets. It is also embedded as a Blender text block. As with the plain generator, save manual variations under a different name before regenerating.
- `botanical-section.glb`: metre-scale ring and planted section; four embedded textures, one synchronized 36-second growth clip, 82 meshes and about 3.18 MB. No reading reference, text or cameras in the export.
- `textures/`: packed and separately saved soil colour, topsoil colour, soil normal and leaf-vein PNGs.
- `botanical-dimensions.json`, `REFERENCE-NOTES.md`: dimensions, growth behaviour and observations from the new video reference.
- Preview URL remains `http://127.0.0.1:8769/docs/living-frame-blender/preview.html`. Botanical model is the default; `?model=plain` preserves the plain comparison.
- New controls: Close detail, Watch growth, pause/resume, growth scrubber and Fully grown. The reading reference and wireframe toggles remain available.
- Blender renders: `botanical-perspective.png`, `botanical-detail.png`. Browser renders use the `botanical-preview-` prefix. Growth is explicitly labelled as a compressed illustrative study, not a literal biological timescale.

Thirty mixed clusters overlap across the planting bed's depth. Generic oval, creeping and sage forms provide different silhouettes; they are not species-specific models. Soil has a brown lower band and dark organic upper band, normal-map texture, litter and aggregates. Roots are established beneath plants. Three new shoots extend their stems first and unfold six leaves around hinges at staggered times, with developing roots starting earlier.

The user supplied `C:\Users\andre\Downloads\videoplayback.mp4` during this phase. Sampled inspection of its germination and leaf-movement sequences informed the hinged-leaf revision; see the reference notes for the inspection limits and timestamps.

Initial botanical browser checks passed: texture loading, actual geometry staying outside the 0.8 m protected reading radius, mature/early shoot states, scrubbing, play/pause/replay, detail/side views and no page errors. The exported hinge revision was then checked structurally: one clip, four embedded images, 78 animation channels including six leaf-rotation channels. `verify-growth-asset.mjs` verifies the actual exported quaternion endpoints and stem-height endpoints; `botanical-hinge-verification.json` records those results. The user's visible preview was refreshed and growth/pause inspected directly. `verify-botanical.cjs` contains the expanded repeatable browser checks, including hinge motion. The final visible preview contains 50,219 triangles; its screenshot is `botanical-preview-final.png`. See the verification artifacts for what was run.

This task incremented version to **0.9433**. Concurrent work advanced the shared version afterward; the final frontend build passed at **0.9435**, and that built welcome badge was verified visibly and saved as `welcome-0.9435.png`. The production-build badge says “Live”; this is local verification, not a deployment claim.

Do not copy this sector around the entire ring before review and performance measurements: it is a detail prototype with roughly 50k triangles and many independently animated objects. A full ring needs further batching/instancing and animation decisions. Native WebXR integration, Quest performance, worms, full-ring artwork and a landscape/portal remain pending.

The shared checkout changed concurrently throughout this task; unrelated app edits were preserved. This task only changed prototype assets/preview/documentation and the mandatory version field. No commit, push or deployment was performed by this task.

The stage-one record below remains for continuity.

---

Date: 2026-10-09 (Australia/Sydney)
State: plain Blender prototype and isolated GLB preview ready for visual review.
No application ring replacement, landscape, portal, botanical detail or animation.

## Files and how to resume

- `plain-ring.blend`: editable model, separate reference collection and three named review cameras.
- `plain-ring.glb`: only the bevelled ring, one mesh / one material / no textures or animation.
- `create_ring.py`: repeatable Blender generation, selected-object export and three Blender review renders.
- `dimensions.json`: metres, axis convention and source mapping.
- `preview.html`: isolated preview; orbit, zoom, pan, front/side/perspective buttons, reading reference and wireframe toggle.
- `serve-preview.mjs`: read-only localhost server. From repository root: `node docs/living-frame-blender/serve-preview.mjs`.
- Preview URL: `http://127.0.0.1:8769/docs/living-frame-blender/preview.html`.
- `front.png`, `side.png`, `perspective.png`: Blender Workbench renders.
- `preview-front.png`, `preview-side.png`, `preview-perspective.png`, `preview-ring-only.png`: rendered browser evidence.
- `verify-preview.cjs` / `verification.json`: browser checks and results. Set `PLAYWRIGHT_MODULE` to the installed package path before running the script.
- `welcome-0.9429.png`: built welcome badge evidence. The built badge says “Live” because of the production build target; this was a local build, NOT deployment evidence.

Installed Blender: `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe` (5.2.2 LTS).
Generated through a visible Blender window, not background mode; saved file opened visibly for review.
Native GUI click automation is unavailable in this session. Scripts can update the visible Blender scene; viewport changes can also be made by the user.
Blender may have two prototype windows open from generation and saved-file review. Preserve any manual edits before closing either.

To regenerate in a fresh window:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --factory-startup --python 'C:\FILES\Projects\website\github\NourishlandXR\docs\living-frame-blender\create_ring.py'
```

This resets only that newly opened scene. It overwrites the prototype outputs; save manual variations to another file first.
In Blender: Numpad 1 = front; Numpad 3 = side; middle mouse = orbit. Hide the `REFERENCE ONLY - never exported` collection to inspect the hole.

## Current implementation inspected

- `app/services/arWelcomePanel.js`: `WELCOME_SHAPE` centre `(700,550)`, circular radius 520 px. The 16 boundary points are attachment references; the rendered panel outline is circular.
- `app/services/arWelcomeShowcase.js`: 2500 × 2100 canvas, panel offset `(550,510)`. Global ring centre `(1250,1060)`. Separate `drawRoots`, `drawPanel` and `drawContent` controls.
- `app/services/arWelcomeRoots.js`: root network constrained to radii 527–550 px, protected reading radius 500 px. Nine action milestones accumulate root growth, with a 60-second growth period. Additional vegetation is timed: stems 47 s, groundcover 60 s, vines 65 s, dark cover 80 s, silver/aerial cover 90 s, flowers 100 s, berries 150 s. All retained in the live application.
- `app/features/ar-demo/demoConfig.js`: board position `[0.42,0.82,-2.8]`, board scale `[5.6,10.8]`; these are relative to the intro anchor.
- `app/features/ar-demo/demoGeometry.js`: base billboard quad is 0.4 × 0.16 m. Full welcome board dimensions are 4.0 × 3.36 m: both canvas axes map at 0.0016 m/px with current configuration.
- `app/screens/temporaryArDemo.js`: intro anchor and billboard matrix own placement; existing text callback and navigation stay separate.
- Existing GLB precedents: `demoBeeModel.js`, `demoButterflyModel.js`, `fruitWindowExperience.js`. Browser preview reuses the fruit-window vendored Three/GLTFLoader/OrbitControls; no new dependency.
- `demoLivingMapXR.js`: precedent for actual meshes in the shared native XR context, including per-eye matrices and GL state preservation. A browser GLB loader does not automatically integrate the ring into that context.

## Prototype dimensions and orientation

| Dimension | Metres | Basis |
| --- | ---: | --- |
| Opening diameter | 1.664 | 1040 px × 0.0016, preserves current panel circle |
| Outer diameter | 1.824 | Proposed for review, not the exact existing root boundary |
| Radial face width | 0.080 | Proposed 50 px-equivalent face; current roots occupy a narrower band |
| Front-to-back depth | 0.180 | Proposed for review; existing ring has no geometric depth |
| Protected reading diameter | 1.600 | 1000 px × 0.0016 |
| Edge bevel | 0.006 | Small prototype edge softening |

Blender: upright ring in X/Z, viewer-facing direction -Y, depth centred on origin.
GLB: X right, Y up, +Z towards viewer, metres, centre at origin.
The eventual centre attachment relative to the full board centre is `(0,-0.016,0)` metres because the circle centre is 10 px below canvas centre. Use the existing anchor's rotation/translation and express depth in metres; do not multiply the metre-sized GLB by the board's existing nonuniform texture scale.
Reference disc and sample lettering are excluded from GLB. This is a clearance guide, not an exact replica of every live text slide.

## Verification completed

- Blender generated the editable `.blend`, exported GLB and three review images without errors. One harmless Blender 6.0 material API deprecation warning was logged.
- GLB loaded in Chrome; one mesh, 5120 triangles, bounds 1.824 × 1.824 × 0.180 m, about 178 KB.
- Browser interaction checks: orbit and zoom visibly change the rendered view; named view buttons, reference toggle and wireframe work; no preview page errors.
- Browser perspective and side screenshots visually inspected.
- Frontend-only build passed at version **0.9429**.
- Built welcome badge verified in the browser and saved as a screenshot.
- `git diff --check` passed before handoff.
- The only live application edit for this stage is the mandatory version increment. No runtime ring/text/control code was changed.
- Existing shared-checkout changes were preserved; the checkout changed concurrently during this task, so do not treat this local build as isolated full regression or deployment evidence.

## Pending review and next stage

Review opening, 8 cm face width and 18 cm depth. Adjust plain form if needed, then perform placeholder integration only.
Keep text loading independent of GLB readiness. Keep the current ring fallback until the asset is loaded and drawable. Avoid duplicate rings after the swap.
Native XR needs geometry uploaded to the existing session context, correct eye and anchor matrices, depth handling and preserved GL state. Confirm no overlap with existing LIM cells, especially as they open.
Acceptance: text appears on the existing schedule even if the GLB is delayed or fails; controls work; ring matches its panel attachment; each eye sees real depth; model cleanup/re-entry works.
Physical Quest validation and any performance budget remain pending. No headset smoothness claim, no deployment or commit/push was performed.

Stop here for user visual review. Botanical artwork belongs to the following reviewed stage.
