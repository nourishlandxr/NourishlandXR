# Food Forest Table: first interactive design study

## V3 local prototype — V0.9807

V3 extends the same editor and local document. The deployed first-test release remains V0.9806 until a new release is requested. Existing V1 documents are migrated; the original saved document is retained under the `.pre-v3` local-storage key.

- **Landscape:** drag to raise/lower/smooth terrain, draw a path or lower a waterway. One complete stroke is one undo step; pointer cancellation and XR tracking interruption roll it back. Plants and roots follow the sculpted surface. IMAP terrain JSON imports reuse its terrain sampler, convert visual heights into explicitly assumed metres, bring across plant symbols and simple landmarks, and retain the original sketch inside the exported document.
- **Discover:** choose sandbox, fruit, shelter or diversity invitations; track investigation steps. Three illustrative growth stages and pruning resize symbols and declared footprints. Wind direction, sun elevation, shade, dry conditions and pests support experiments. These do not calculate survival, hydrology, nitrogen supply, yield or forest health.
- **Inspect:** assign roles to investigate and connect plants with labelled design hypotheses. Supplier-listed pollinisers are identified separately. Descriptive role candidates retain evidence and conditional statements remain distinct. No beneficial relationship is inferred just from neighbouring plants.
- **Step inside:** desktop uses drag-to-look and W/A/S/D; XR uses explicit clear-ground selection to move. The scene uses board dimensions and editable assumed older-plant heights. The model remains a symbolic design preview. The right stick can bring controls back into view; Return to table preserves the layout.
- **Studies:** save three local studies, restore with undo and compare layout differences. Export/import transfers complete JSON studies; imported collections merge with the current collection. Shared project loads preserve personal collections.
- **Zinnia:** requested guidance loads the existing animated companion and voice service lazily. Speech level drives her animation. A spatial explanation card provides readable chunks with replay, next and close controls; stopping or muting cancels speech. Text remains available if speech service access is unavailable.

### Classroom project boards

The new authenticated `GET/PUT /api/projects/:projectId/forest-boards/:boardId` resource stores a private document with a revision number. Project members can explicitly save/load and follow updates every four seconds. The client does not apply a background update over local changes; stale saves return 409. This is shared-document collaboration, not simultaneous cell merging or avatar presence. Personal wishlist data is excluded from shared storage.

Use **Studies → Choose classroom project**, choose a project you belong to and save a named board. Copy its classroom link for other project members; the link opens Studies and asks them to load the shared document. Account authentication and membership remain the existing project's responsibility.

Classroom sharing needs the updated API running alongside the frontend (`npm run build` packages both). The small preview-only server serves static files and cannot save shared boards. No production API or project data is changed by this implementation.

Verification: `tests/food-forest-v3.test.mjs` covers document migration, terrain, comparison assumptions, IMAP provenance, relationship evidence, private access and revision conflicts. `artifacts/food-forest-v3-browser-qa.mjs` adds actual pointer/world-panel interactions, terrain cancel/undo, speech-driven companion animation with fixture audio, studies, shared API response handling, walk mode, file transfer, persistence and mobile layout. `artifacts/food-forest-api-smoke.mjs` starts the built API against an isolated fixture workspace and checks save/load/conflict/access behavior. Physical Quest validation remains separate.

Local preview: `/tools/preview-food-forest-kit.html` or `/app/?editor=food-forest`.
Run `node tools/serve-food-forest-preview.mjs` for a loopback-only preview on port 8093.
The frontend build includes `/xr/?editor=food-forest`; it has not been deployed.

## What is usable

- Seven layer families, four original sculpted variants per family: 28 symbols.
- A transparent, lightly tinted glass board exposes illustrative branching roots beneath planted pieces. Roots reveal over 0.8 seconds on placement, remain hidden while held, follow the plant, and disappear with deletion/undo. Reduced-motion mode shows roots immediately. Each root system uses one mesh; no refraction pass or texture downloads are required. These are playful educational symbols, not inferred species root dimensions.
- Pick a family, drag a copy from its four-piece loading bay, move it, undo/redo or remove it.
- Rectangle, ellipse or click-drawn custom outline. Continuous positions; optional grid and labels.
- Width/depth define a schematic metre scale, independently of miniature appearance.
- Saved design direction: diverse harvest, primary fruit crop or lower external inputs.
- Select a placed piece in Board to enter an assumed canopy diameter. Its circular footprint is drawn in metre coordinates, so it can look elliptical on a nonuniform schematic board. Overlap counts use physical distances, not miniature token size. Zero means unknown, and overlap never translates into an invented yield loss.
- Search/filter the Daleys snapshot, collect plants and assign species IDs to symbols. Product descriptions/specifications and extraction evidence remain inspectable. Merchandise is excluded by the catalogue matcher. The database and extraction work is owned by C.J.
- Wind/pest lesson visualizations. These currently illustrate a question; they do not calculate shelter, pest outcomes, compatibility or harvests.
- Local browser storage, layout history and JSON export. Collection membership survives layout undo. Storage is specific to browser/origin, not yet shared across devices or projects.

## XR interaction

Enter XR requests immersive AR first, VR second where supported. The table appears about 1.15 metres ahead and 0.55 metres below the viewer. It does not alter the PIMO editor, demo or tutorial.

Point at a piece and hold trigger or grip, move it, then release onto the board. Pinch/select events from hand input use the same target ray where supplied by the browser. Hand meshes, direct near-hand grabbing and full controller skins are not included yet. Grabs are exclusive and bound to the initiating control. Tracking loss, disconnect, interruption and session exit cancel unfinished placement.

The floating panel provides all layer/form choices, saved collection selection, board shape, dimension adjustments, grid/labels, design direction, assumed footprint editing for a selected piece, illustrative challenges, history, deletion, sound and exit. With nothing selected its bottom controls resize the physical tabletop. Right stick click toggles the panel. Bring table here recentres it. The desktop panel-preview icon makes the actual spatial controls testable with a mouse.

Audio cues are synthesized locally. Actions route to controller haptic actuators when present; placement/creation uses a stronger success pattern. Muting sound leaves haptics active. Physical Quest acceptance, comfort, tracking and vibration strength remain unverified.

## Data contract and next modelling stage

Board records store `{id, layer, variant, x, z, size, plantId, label, canopyDiameterM?, footprintBasis?}`. Coordinates span x ±3, z ±2; multiply differences by width/6 and depth/4 for metres. Local piece `size` controls the symbol, not plant spread. `plantId` is the supplier listing ID, not a species-level identity; retain provenance and future rootstock/cultivar distinctions.

Next implementation gates:

1. Add a shared project/wishlist adapter so exploration, classroom boards and other devices use the same content. Add import/versioned migration before claiming a cross-device workflow.
2. Surface reviewed plant traits independently of source candidates. Keep negative and conditional statements, local observations and unknowns explicit. Never turn a category or shopping recommendation into a confirmed beneficial relationship.
3. Add a growth timeline with individually sourced height, canopy, rootstock, pruning and light assumptions. Use declared spread to sketch occupied area; do not derive spacing or yield from supplier height bands alone.
4. Define a function model: desired services, candidate providers, conditions, timing and evidence. Do not require every layer everywhere or present a checklist count as ecosystem health. Nitrogen contribution, pollination, shelter, water and ground cover need different mechanisms.
5. Compare scenarios against the chosen goal. Validate any density/yield relationship with evidence before using numbers such as “40% yield × six trees.” Provide ranges and unknowns instead of a universal crowding coefficient.
6. Connect Zinnia to selected-piece and comparison events with sourced explanations. Scripted challenge feedback and XR hand/model polish follow the same data contract; avoid uncited botanical claims.

## Verification

`node --test tests/food-forest-board.test.mjs tests/pimo-xr-interaction.test.mjs` checks polygon/area/footprint math, all 28 finite/distinct symbol geometries and the reused sound/haptic service.

`node artifacts/food-forest-browser-qa.mjs` serves repository files into Chromium through request interception. It exercises actual Three.js ray targets, drag/invalid drop/cancel, history, custom outlines, footprint editing, goals, collection/species assignment, spatial controls, persistence, mobile overflow and welcome version. It is browser simulation, not a live-server or physical headset benchmark.

## V3 ceramic forest graphics (local V0.9812)

The tabletop now uses a deep forest studio background, warm/cool directional lighting, smooth matte ceramic plant forms, brighter layer colours, rounded loading-bay stations and a defined double glass perimeter with scale ticks. Transparent glass and warm, tapered illustrative roots remain visible. A gold ring marks the selected piece. Terrain uses height-coloured shading, paths are flat ribbons, and waterways have distinct banks. The mobile camera fits the whole table without changing the saved board.

All opaque components of a token are baked into one vertex-coloured mesh, plus one small identity-mark plane. The complete 28-piece kit uses 28 opaque meshes rather than the previous 209; its richer geometry totals 66,996 triangles rather than 17,298. This trades more triangles for substantially fewer draw submissions. Contact shadows use one shared 64px radial texture, with no real-time shadow map, refraction, bloom, downloaded textures or postprocessing. Root systems remain one mesh each.

`getState().rendering` exposes calls, triangles, geometry/texture counts and shadow-map status for review. Browser QA saves `artifacts/food-forest-graphics-budget.json` and checks rendering budgets, in addition to the existing interaction suite. These are desktop renderer counts, not a Quest frame-rate benchmark. Local graphical review does not confirm physical-headset comfort or performance.

## V4 — grow your first forest (local V0.9813)

A new board opens empty with one fruit-tree token in a single loading station. Start follows six short invitations: plant a tree, explore growth, add an understory neighbour, add a vine, try wind, then keep building. Each invitation can be skipped; Build freely leaves the lesson. Successful placement advances the relevant stage, and undo restores both planting and lesson progress. Existing populated designs open with Continue building and can resume learning without a forced reset. Start a new forest archives the current study under a unique local key, supports undo, and offers Restore previous forest. The archive is on this browser/origin, not a cloud backup.

The main activities are Start, Plants, Grow and Try. Detailed catalogue, terrain, dimensions, assumptions, relationships, studies and sharing remain behind More tools. The same simplified choices are drawn into the real XR control panel. Groundcover dimensions and vine support can be edited there; Look at next plant allows selecting overlapping layers. All common controls retain compact icons and accessible names. Taps, placement, selection and completion reuse the existing sound/haptic service.

Planted symbols lose their identical display plinths. Groundcovers become low irregular patches with independent `groundWidthM` and `groundDepthM`, rather than a tree canopy circle. Leaf size stays consistent as a patch expands. Vines keep `supportKind` (`trellis`, `plant` or `trail`) and `supportId`; attached vines move with their chosen tree. Removing a referenced support falls back to a trellis. Attachment at the boundary chooses an offset inside the board. Root-crop harvest forms sit below the glass, with leaves above it. Trees, shrubs and herbs remain individual sculpted symbols.

Board schema 4 retains V1/V3 placements, terrain, studies, species references, collections and planning assumptions. Learning state is stored separately from ecological roles within the board document. Coverage and climbing geometry are illustrative; layered overlap is allowed and does not establish compatibility or predict yield. Groundcover area is not added to a tree canopy as though both occupied exclusive plots.

Verification adds `tests/food-forest-v4.test.mjs` and `artifacts/food-forest-v4-browser-qa.mjs`. It covers migration, successful-placement progression, lesson undo, type-specific geometry, patch editing, vine attachment/trailing/movement, saved-board recovery, actual simplified spatial-panel ray targets and mobile layout. Physical Quest tracking, haptic comfort, and frame rate require headset testing.

## Living Pieces collection V5 (local V0.9814)

The seven-layer, 28-variant collection is rebuilt around sculpted leaf geometry. Canopies use thick curved leaf cells and branching boughs; fruit trees have jade foliage, attached pendant fruit and distinct fan/multi-stem silhouettes. Shrubs use leaf sprays and berry trusses. Herbs have folded fans, narrow tufts, upright blades and five-petal flower heads. Groundcovers use rosettes, trifoliate clusters, cushions and connecting runners instead of a flat opaque patch. Vines have heart-shaped leaves, fine tendrils and flower accents. Root crops retain the glass cutaway with more distinct harvest forms and fine roots. Display tokens use profiled ceramic plinths and small mineral-colour bands; plinths disappear after planting.

The mineral finish is carried by surface shape, folds and subtle vertex-colour variation, without downloaded texture assets or additional lighting passes. Each solid miniature still uses one mesh; its small identity stamp is a separate plane in the loading bay. Display variants remain below the established 5,000-triangle per-piece budget.

Planted pieces have a closed-to-open geometry morph. On release, leaves unfurl as the root network branches downward; held pieces stay open. Reduced-motion mode shows the finished shape immediately. Three.js ray picking follows the morph, so invisible, fully expanded leaves are not used as interaction targets during the reveal. Placement sound and controller haptics remain on the existing feedback path.

The local close-up gallery is `/tools/preview-food-forest-pieces-v5.html`. It provides all families/forms, planted/display views, root inspection, replay, optional rotation, sound control and the full 28-piece collection. It uses the same model services as the actual table. Gallery tooling is local; it is not part of the hosted frontend payload. The table itself automatically uses the new collection without changing saved plant positions, source references or learning progress.

`tests/food-forest-pieces-v5.test.mjs` checks leaf thickness/midribs, finite morph geometry for all 28 planted forms and picking against the visible morph. `artifacts/food-forest-pieces-v5-browser-qa.mjs` checks the actual gallery controls and full-collection rendering; the existing full-table suite follows it. Physical Quest frame rate and visual acceptance still require headset/user review.

## V6 root space and organic pieces — local V0.9815

This supersedes the earlier decorative-root description. Each planted piece stores rootSpreadM (diameter), rootDepthM, rootBasis and optional rootSourceUrl/rootEvidence. The root mesh is calibrated to radius 0.5 and depth 1 before conversion using the board dimensions. Its rendered spread is independent of token size and canopy pruning; the illustrative growth stage scales it. The dashed selected root envelope and shared-root-space count use the same metre dimensions. Root overlap invites investigation; it does not imply a benefit, incompatibility or yield. Branch paths remain schematic.

The kit begins with clearly labelled editable practice sizes, not measured species data. User edits become planning assumptions. A supplied reference requires both an HTTPS source and evidence; imported references retain that provenance. Grow exposes spread/depth sliders on desktop and a compact Root space page in XR. Undo, local documents and shared project saves retain the dimensions. Zero dimensions hide the roots and indicate an unset size.

Pieces use stable per-plant variation, less regular leaf clusters, slightly uneven stems and display bases, muted foliage and a shared procedural matte grain. There is no external texture download or additional postprocessing pass. The close-up gallery is /tools/preview-food-forest-pieces-v6.html; the V5 link remains usable. Tests add food-forest-root-space.test.mjs and browser checks for editing, undo, persistence and actual spatial root controls. Physical Quest performance and visual acceptance remain to be checked.

## V0.9818 release preparation

The V4–V6 Food Forest changes are packaged as an additive overlay against the verified live V0.9817 baseline. Existing website HTML is retained byte for byte; the Demo update remains in place. The API deployment is separate so shared board saves retain root-space fields, vine supports, patch dimensions and learning progress. Close-up tool previews remain local; the production entry is /app/?editor=food-forest&mode=xr&from=demos.
