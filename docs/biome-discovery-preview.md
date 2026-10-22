# Hidden knowledge showcase

The homepage uses the current `knowledge-mesh-03` master from the separate website preview. Its V17 filename is retained, but the landscape includes the newer closed rock interior, food-landform repairs and inner biomes. `app/v2/full-3d/world-source.json` records the imported source hash and model-data hashes.

The NL layer is a demonstrative animation, not an information browser. A quiet welcome Totem begins a terrain-following path reveal. Two secondary Totems appear, then a cluster of three actual Living-shell orbs. One orb opens briefly with a small arrangement of connected leaf cells. The reveal fades away before another biome begins. Hovering or tapping a welcome Totem chooses its reveal without moving the camera.

There are no floating pins, numbered stops, biome chooser, reading cards or record controls. Only compact play/pause and replay controls remain. Reduced-motion starts paused. Creator, Explorer and educational content access remain separate.

The route planner samples the actual terrain, avoids visible water above it, stays inside the biome's nearest-piece region, and rejects steep jumps and gaps. If necessary, stops move onto nearby connected ground. This is a visual concept route through the model, not a surveyed or accessibility-validated route through a real site.

The connected cells illustrate hidden knowledge; they do not expose plant records or publish project data.

## Maintained files

- `app/v2/biome-discovery-model.js`: biome anchors, reveal timing and terrain route planner.
- `app/v2/biome-route-surface.js`: terrain and water sampling for paths.
- `app/v2/biome-discovery.js`: animated ground paths, native Totem sculptures, Living orbs and connected cells.
- `tools/sync-biome-discovery.mjs`: embeds these modules into the verified master snapshot at `artifacts/biome-master-source.html`. Run after editing a module. Tests check the embedded copies and preserved model data.
- `artifacts/biome-showcase-qa.mjs`: current-master, animation, no-access-UI and phone-control checks.

The website world is a browser 3D scene. XR aim/selection hooks are provided by the layer, but native headset integration and physical headset acceptance are not verified by this preview.

No root-domain migration or deployment is part of this local review.
