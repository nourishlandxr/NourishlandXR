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
