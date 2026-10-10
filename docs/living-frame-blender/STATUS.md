# Living Frame — runtime SD/HD trial (2026-10-10)

The approved stage 6 artwork is now connected to the demo behind three saved
settings: **No Living Frame**, **LF SD** (default), and **LF HD**. Off removes
the decorative rim and retains the reading surface, text, navigation and cells.
The choices appear in desktop review Settings and the spatial Graphics settings;
the General settings button cycles the same three modes.

Startup preparation downloads and decodes only the saved tier, independently of
the welcome page. Off skips the model download. Concurrent startup/demo requests
share one promise and asset. A failed download is optional and retryable; delayed
loads cannot restore an Off or destroyed frame. Existing canvas artwork remains
until the native model is uploaded and drawable, and is then replaced once.

- Runtime files: app/assets/living-frame/living-frame-sd.glb and living-frame-hd.glb.
- Rebuild assets: node tools/build-living-frame-assets.mjs. Approved Blender files are preserved.
- SD: 140,552 triangles, 94 source meshes, 13,876,024 bytes; all leaf patches remain,
  with fewer longitudinal leaf rows and without fine underground/branch root groups.
- HD: approved 255,964 triangles, 112 source meshes, 19,974,136 bytes.
- Native XR: both tiers are batched to 24 material draws per eye. GPU morphs retain
  the original growth sequence, stretched to 180 seconds (3 minutes) in both tiers;
  both eyes share static uploads and use independent
  view matrices. Text timing and controller hit paths remain independent of loading.
- CPU/Three.js desktop playback samples growth at 15 Hz for SD and 30 Hz for HD;
  finished artwork sleeps until visibility, size or quality changes.
- Runtime review: http://127.0.0.1:8769/tools/preview-living-frame-runtime.html.
  Test native stereo exercises the actual shared-context GPU renderer in two viewports.

Validation: 736 regression tests passed with local-server access (the restricted
sandbox initially blocked persistence test loopback connections). Additional
exported SD/HD clearance checks passed at 0, 15, 30, 42 and 60 seconds. Focused
checks cover Off/destroy/load races, failed upgrade/retry, material batching,
per-eye matrices, upload reuse and restoration of the surrounding GL state.
Browser review confirmed the actual Settings actions, both native tiers, growth
and mature playback, a single selected-tier startup request and zero model
requests when reloading with Off saved. Frontend build and local welcome badge:
**V0.9452**. A built badge labelled Live is local build evidence here.

This is a local integration trial. Physical Quest performance, placement (including
root clearance relative to the real floor) and interactions beside open learning
cells remain for headset review. Desktop/software rendering timings do not establish
Quest frame rates. No commit, push or deployment was performed by this task.

---

# Living Frame - stage 6 inner-right moss and microdroplets

A localized moss patch builds along the inner-right wall and lip. Its 280 low
cushions use three dark matte greens: 224 on the inner wall and 56 on the lip.
An irregular 5-17 degree arc keeps the effect local. Three waves develop during
seconds 27-58. The approved planting, roots, soil and flower timing are retained.

Twenty-four translucent water beads, 1.39-3.17 mm wide, form on the moss during
seconds 50-60. Tiny static highlights make them legible up close. Alpha blending
and low roughness avoid a transmission render pass or emissive sparkle. This is
stylized art, not a simulation of moss colonization or condensation. Collapsed
growth geometry is tiny rather than removed, following the existing morph approach.

## Files and review

- `create_moss_ring.py`: repeatable additive generation/export entry point.
- `moss-ring.blend`: editable source, packed textures, scripts and timeline.
- `moss-ring.glb`: separate candidate; approved `wrap-ring` files preserved.
- `moss-ring-dimensions.json`, `moss-ring-verification.json`: parameters/checks.
- `moss-ring-moss-detail.png`: final Blender close-up render.
- `moss-preview-finish.png`, `moss-preview-before-dew.png`,
  `moss-preview-front.png`: browser timing and clearance evidence.
- `moss-browser-review.json`, `welcome-0.9446.png`: local browser/build evidence.

The default `preview.html?model=full` loads this candidate. Use **Moss detail**,
then **Moss & dew**; **Before dew** compares at 42 seconds. `?model=wrap` preserves
the approved planted sides. Other previous models remain available. Text reference
is independent of the GLB. Blender generation opened visibly and completed; a
focused 1000 x 760 close-up uses eight samples and two render threads.

## Verification and next step

The candidate has 255,964 triangles, 112 meshes/primitives, 109 morph groups,
four embedded textures and one 60-second clip. GLB: 19,974,136 bytes. Six groups
and 10,160 triangles were added, about 4.1% over the approved side/root model.
Mature envelope remains 2.002 x 2.596 x 0.332 m. The scaffold opening is 1.664 m.
Moss extends slightly inward to a minimum radius of 0.82705 m; the protected
0.800 m reading radius passes at all 21 sampled animation times.

Wave checks confirm staggered moss buildup and late condensation. All 573
plant/root attachments, 384 side angle/depth bins, floor contact, branching-root
timing, flowers and soil checks still pass. The final Blender render and browser
close-up show droplets on moss. Browser review covers the 42-second comparison,
mature text clearance and loading the preserved side model. Warning/error logs
are empty. Frontend build and local welcome badge are verified at **0.9446**.
`git diff --check` passes. Existing uncommitted application work was preserved;
the shared checkout's complete regression suite was not claimed here.

This remains isolated artwork. Live Living Frame text/navigation/timing/reveal
code was not edited for this addition. No commit, push or deployment was performed.
Next: integrate behind independent text loading and the existing-frame fallback,
then validate native WebXR morph playback, loading and Quest performance. This
roughly 20 MB / 256k-triangle art candidate needs a runtime budget before deployment.

---

# Earlier stage 5 record

# Living Frame — stage 5 planted outer side and branching root crown

The new `wrap-ring` draft preserves the approved front model (`diverse-ring`).
It adds a full-depth living skin to the cylindrical outer side, not just more
front-facing leaves. Four depth rows span the complete 360-degree circumference,
with 384 additional pockets. Their leaf planes follow the side surface; varied
rounded, oval, fine and lobed leaves overlap across both shoulders. The front's
lower section remains mostly reserved for roots. Existing growth, muted greens,
soil/worm activity, early flowers and the predominantly late bloom are retained.

The lower structure now has 28 aerial roots, 117 secondary splits and 234 fine
branches. Primary roots emerge first, followed by secondary and fine growth.
Four buttress roots lead into a shared central crown. A thicker tapered taproot
extends to a preview floor and splits into nine lateral branches, including two
terminal forks that spread sideways along the floor. This remains generic art,
not a claim about one plant species' root anatomy.

Preview centre height is assumed to be 1.60 m, so floor Y is -1.60 m relative to
the frame centre. Configure generation with `-- --centre-height 1.6`; supported
range is 1.3–2.4 m. The browser floor grid is an independent reference, not part
of the GLB or a landscape. Real project/XR floor placement is not implemented.

## Current files

- `create_wrap_ring.py`: new repeatable generation/export entry point; reuses
  `create_diverse_ring.py` and `create_botanical_section.py`.
- `wrap-ring.blend`: editable source, packed textures, scripts and 60 s timeline.
- `wrap-ring.glb`: separate runtime candidate with one synchronized clip.
- `wrap-ring-dimensions.json`: planting, branching and floor parameters.
- `wrap-ring-perspective.png`, `wrap-ring-detail.png`, `wrap-ring-side.png`,
  `wrap-ring-side-detail.png`: Blender renders for the visual review.
- `verify-full-ring.mjs --wrap` and `wrap-ring-verification.json`: exported checks.
- `wrap-preview-side-detail.png`, `wrap-preview-roots.png`,
  `wrap-preview-root-growth.png`, `wrap-preview-side.png`, `wrap-preview-back.png`,
  `wrap-preview-perspective.png`: browser review evidence.
- `wrap-browser-review.json` and `welcome-0.9445.png`: browser/build evidence.

The usual `?model=full` URL now opens this draft, including Side detail, Back,
Root detail and a floor-reference toggle. `?model=front` preserves the approved
front canopy. Earlier previous/section/plain models are still available. The
GLB contains no text, so a future reusable Project welcome can keep its title,
copy, timing and navigation independent of the living artwork. Project welcome
integration is a later stage; no live project screen has been changed here.

## Verification and next step

The candidate has 573 pockets with 573 attached root systems, 245,804 triangles,
106 meshes/primitives, 103 morph groups, four embedded textures and one clip.
GLB size: 19,012,464 bytes. Mature envelope: 2.002 × 2.596 × 0.332 m.
The original 1.664 m opening and 0.800 m protected reading radius remain.
Exported root/stem attachment passes for all pockets (maximum gaps 1.95/1.60 mm).
Side leaf geometry occupies every one of the 384 angle/depth bins and extends
past both shoulders. This tests distribution; small natural soil gaps remain
between individual leaves rather than an opaque green shell.

All 21 sampled animation times retain a minimum reading radius of 0.832 m.
The taproot reaches Y -1.5996 m; the lowest root surface reaches -1.6046 m,
within the 12 mm floor tolerance. Lateral branching reaches both sides.
Branch-weight checks confirm later secondary/fine growth, while the few early
flowers and late finale retain their original timing. The new draft ceiling is
260k triangles / 110 primitives. This is an art-review budget, not headset proof.

Blender generation was visible in fresh windows, preserving existing windows.
The first attempt stopped at a viewport-mode mismatch before export; setting the
render engine before the material checkpoint fixed it. Generation and all four
renders then completed. Browser review covers the planted side, rear shoulder,
root growth, mature floor contact and floor-grid visibility. Local frontend build
and welcome badge are verified at 0.9445. No commit/push/deployment was performed.

Next: approve this volume and root silhouette, then refine natural surfaces and
prepare a cheaper runtime variant. Native WebXR morph playback, loading and Quest
performance still need validation before this becomes a reusable Project welcome.
Live Living Frame text, navigation, timing and reveal were not modified by this
work. Existing uncommitted work and the approved front assets were preserved.

---

# Earlier stage 4 record
# Living Frame outer ring — stage 4 dense, low groundcover

## Current review: wider coverage, attached roots and late flowering

Updated the isolated Blender/GLB study in response to the latest direction:
prostrate, crawling and spreading groundcover with restrained dark greens.
The broad upper and side face now has three overlapping planting rows, rather
than plants confined to the outer edge. The lower arc (210–330 degrees) remains
mostly reserved for roots, with four tiny edge accents. No tall or yellow
spiky plants are generated. LIMO follows this introduction; the central reading
space is preserved. Actual LIMO layout is not implemented or tested here.

There are 184 smaller clusters across six generic growth habits and five broader
leaf accents: 189 planting pockets in total. Sixty staggered positions per row
cover the planted 240-degree arc. Rows start at radii 0.849, 0.880 and 0.915 m;
local jitter, varied size, leaf shapes and four growth waves prevent a uniform
pattern. Sideways runners overlap neighbouring pockets and some spread inward.
Seed 94039 is repeatable; a new seed produces a different authored arrangement.
Small curved leaf surfaces and faint veins replace the earlier fluorescent atlas.
Leaf widths overlap more generously in the final canopy pass without raising stems.
This is generic groundcover, not a species-identification model.

Every planting pocket has its own root system starting at the actual stem origin.
Three architectures vary between tap-root forms, sideways fans and fine fibrous
networks, with different branch counts, curves, shallow/deep placement and growth
waves. Eleven hanging aerial roots beneath the lower arc have clustered origins,
varied lengths (roughly 16–40 cm), bends, front/back depth and secondary forks.
Nine vines crawl around the rim; two short side trails avoid covering the bottom.

Three small muted worms appear gradually at 12–29 seconds, with slow peristalsis.
The organic soil boundary begins changing at 20 seconds and completes at 48:
the dark organic layer thickens from about 12 to 33 mm as the brown/dark boundary
moves continuously. This compressed sequence suggests soil activity; it is not
an ecological timescale simulation. Four flowers open early (roughly 24–34 s),
and 23 open mostly at the finish (roughly 42–58 s). A tiny optional bee visits the
early flowers from 29 s, following the rim rather than crossing the reading space.
The preview reuses app/assets/bee.glb, by etro313 under CC BY 4.0; attribution is
visible in the preview. The bee remains separate from the exported ring GLB.

## Files and review controls

- create_diverse_ring.py: repeatable generation/export script; optional -- --seed N.
- create_botanical_section.py: shared mesh, soil, texture and export helpers.
- diverse-ring.blend: editable meshes, shape keys, packed textures and 60 s timeline.
- diverse-ring.glb: runtime candidate, one synchronized growth clip.
- diverse-ring-dimensions.json: seed, planting rows, root origins and growth details.
- diverse-ring-perspective.png and diverse-ring-detail.png: mature Blender renders.
- diverse-preview-soil.png, diverse-preview-growth.png,
  diverse-preview-early-flowers.png, diverse-preview-root-cutaway.png,
  diverse-preview-root-growth.png, diverse-preview-bloom.png and
  diverse-preview-flower-detail.png: browser evidence.
- verify-full-ring.mjs --diverse and diverse-ring-verification.json: export checks.
- diverse-browser-review.json and welcome-0.9444.png: observed controls and badge.

The existing preview with ?model=full loads this draft. New visits start at the
early growth state and play; reduced-motion visits show the finish. Controls
include Soil, Leaf growth, Early flowers & soil, Vines & roots, Flowers open,
replay, scrub, pause, orbit and zoom. Front, side, perspective, close-detail and
root-detail views support inspection. Inspect roots through soil temporarily
makes the soil transparent. Previous, botanical and plain previews are preserved.

## Verification and current limits

The latest asset has 151,644 triangles, 78 meshes/primitives, four embedded
textures, 75 morph groups, 78 animation channels, one clip and 11,945,132 bytes.
The mature envelope is 2.002 m wide × 2.257 m high × 0.283 m deep. The scaffold
retains its 1.664 m opening and 0.180 m depth. The protected reading radius is
0.800 m; the minimum exported vertex radius stays 0.832 m at all 21 sampled times.
Reference text and cameras are excluded from the GLB.

Export verification checks actual sparse morph geometry, different simultaneous
maturity, early/late flower weights, worm emergence, topsoil accumulation and
vine/aerial-root tracks. All 189 root origins meet actual exported root geometry
within 1.95 mm and supporting stem geometry within 1.60 mm. Browser review checked
soil at 0 s, growth at 20 s, early activity/cutaway at 34 s, hanging roots at 38 s
and the flowering finish at 60 s. The optional bee loaded; no warning/error logs
were observed during the final preview check. Small worms need close inspection;
a dedicated worm close-up has not been recorded.

For denser coverage, the draft ceiling increased from 125k to 160k triangles.
Tiny leaves and root tubes were simplified before adding the second planting
pass. This is a review ceiling, not a performance certification. WebXR morph
support, draw-call reduction, loading and Quest performance remain to be tested
at integration. The thick outer side/back remains a base study for later art
refinement; natural soil and leaf anatomy also need a further art pass.

Generation ran in fresh visible Blender windows and earlier windows were
preserved. Save manual edits under a separate name before regenerating: the
script overwrites this draft's outputs and Blender creates a .blend1 backup.
Live frame geometry, text loading, navigation, timing and reveal were not changed
by this task. Shared uncommitted application changes were preserved.

This task incremented the observed version to 0.9443. Other shared work subsequently
advanced it to 0.9444; the final local frontend build and welcome check use 0.9444.
The badge's Live label is a build channel, not proof of deployment.
No commit, push, deployment or headset verification was performed by this task.

Next: review density, leaf scale, root variation and subtle growth here. Then
refine the approved study and plan desktop/WebXR integration, keeping text
independent and the existing ring available as fallback.

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
