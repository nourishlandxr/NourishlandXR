# Food Forest Table: first interactive design study

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
