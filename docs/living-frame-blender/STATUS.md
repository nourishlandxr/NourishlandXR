# Living Frame outer ring — stage 1 review

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
