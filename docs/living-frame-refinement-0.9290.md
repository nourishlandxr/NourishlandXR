# V0.9290 — Living-frame material refinement

## Size, measured before this update

Decimal MB (1 MB = 1,000,000 bytes), file contents rather than filesystem allocation:

| Scope | MB |
|---|---:|
| Deployed frontend (`dist/xr`) | 346.91 |
| Frontend source (`app`) | 346.92 |
| Image/model assets (`app/assets`, included in frontend) | 342.38 |
| Local folder including Git, duplicate build and workspace | 1162.28 |
| Git history, included in local total | 413.99 |
| Workspace/project data, included in local total | 49.77 |

The deployed tree is not the initial download. Assets are requested as used; backend/workspace data is not included in the frontend deployment.

## Confirmed visual causes

`arWelcomeRoots.js` drew leaf bodies in flat colours with discrete vein strokes. Hanging roots used constant-width strokes; fine rootlet origins approximated a straight line rather than the curved parent. Enlarging the decoration cache alone did not replace these simple material cues.

## HIGH refinement

- `livingFrameArtwork.js`: one transparent, procedural 1024 × 1024 atlas holding fourteen leaf tiles (seven colours, two forms). Leaf blades have soft light falloff, lamina shading, curved secondary veins, a restrained midrib and fine cuticle folds. Placement/origin and size are preserved.
- `arWelcomeRoots.js`: HIGH uses the atlas and continuous tapered hanging-root ribbons. Rootlets attach to actual sampled cubic positions and taper into curved fine ends. Structural root ribbons receive subdued longitudinal material shading. Cache scaling comes from the central preset; decoration still refreshes slowly.
- `spatialVisualSettings.js`: HIGH owns the 256-pixel leaf tile and 36-sample root budgets. LOW and MED retain existing artwork and allocate no atlas before HIGH is requested.
- `arAssetPreparation.js` and `arPreparationControls.js`: readiness is tracked by experience and graphics tier. HIGH accounts for artwork generation during preparation. Changing the selector restarts the matching preparation check; a request token prevents an older completion from enabling Enter for another tier.
- `pimInfoPanel.js`: choosing HIGH in AR generates the atlas once before applying the existing graphics update. Repeated selection reuses it. Rendering has a vector fallback when the atlas cannot be created.
- `tools/preview-living-frame.html`: an enlarged HIGH leaf inspection view uses the same production atlas.

The atlas costs 4,194,304 bytes (4.19 MB / 4 MiB) of uncompressed pixel storage. It is generated locally and adds no image download. Canvas/GPU backing stores may add further runtime memory. The existing HIGH decoration raster and information texture budgets are unchanged. No full-screen effects, extra animation loop or per-leaf GPU draw calls were added.

## Future graphics updates

Refinements should declare their tier in the central graphics presets. Broad inexpensive improvements may apply to all tiers; additional material detail stays HIGH, with a graceful simpler fallback. Auto remains a conservative starting recommendation, not continuous GPU/FPS adaptation.

## Validation

- Automated regression checks cover atlas tile bounds/budget, shared preparation/reuse, exact root attachment and finite curves, tier-specific readiness, existing growth/cell-clearance caches and opacity.
- Browser preview verifies HIGH leaf artwork and hanging roots, LIMO spacing and return to MED without console errors.
- Release V0.9290 must be built, committed, pushed and have a successful deployment before being called live.
- Physical Quest 3 performance and passthrough appearance remain unverified by the agent. Compare MED and HIGH with Show FPS, inspect at normal distance and close up, and verify LIMO selection/clearance during growth.
