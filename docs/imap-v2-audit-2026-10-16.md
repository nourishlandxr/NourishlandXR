# IMAP V2 · disc model audit

IMAP means **Interactive Map**. The physical reference is the circular, grippable 3D disc already presented in Demo Utility 1.1. The Creator dashboard's flat Project Map is a separate site-planning tool. The earlier flat prototype and its data work are retained as a [Creator planning-map experiment](creator-planning-map-v2-experiment.md), under the correct name.

## Existing disc contract

- `app/services/demoLivingMapModel.js` creates the current authored lesson: three Totems, plant Orbs, Areas, terrain and links. Its `createDemoLivingMapPlacement` controls the deliberate Totem placement order.
- `app/services/demoLivingMapScene.js` renders the circular timber/green disc, terrain, Area boundaries, Totems, Orbs, visitors and opposite rim handles. It uses some hard-coded three-Area assumptions and decorative terrain, so it cannot yet render arbitrary projects faithfully.
- `app/services/demoLivingMapReveal.js` keeps the Living Frame preview, luminous dissolve, spatial reveal, ray contact and rotated world-space placement. `demoLivingMapXR.js` draws the same scene in headset space.
- The existing disc and its mechanics can be inspected through `tools/preview-demo-living-map.html`, `tools/preview-map-3d.html` and `tools/preview-spatial-living-map.html`.

## V2 model supplied

`app/services/imapV2DiscModel.js` projects a validated shared-project snapshot into circular-disc pages. It selects a Site, fits up to five Areas per disc, retains canonical Area and record identities, shows real Totems only when records exist, and caps tiny Orb/Note symbols while reporting overflow counts. It supports keyed conceptual layout and sketch-style preferences. It creates no walking routes because the current shared-project contract has no validated Area-route field. Slope, elevation and water remain illustrative until a sourced terrain layer is supplied.

The visual terrain layer lives in `app/services/imapV2Terrain.js`. Creator inputs are bounded `terrainEdits` in the map-model overrides: `channel` strokes lower a waterway, `hill` taps raise a mound, and `bank` strokes form a steep contour with a chosen raised side. The data model normalizes edits and labels them `illustrative-sculpt`; a renderer can call `createImapV2TerrainGrid` once when edits change to obtain a bounded heightfield. `shape` selects `circular` (default) or `square`, while `sizeScale` is clamped to 0.75–1.3 relative to the existing demo map size. Terrain edits retain their local coordinates across shape and size changes; round clipping hides any square-corner edits without deleting them.

`app/services/imapV2Elements.js` defines an extensible symbol library and bounded placement data for Creator-authored landscape features: houses, shelters, sheds, fences, gates, paths, varied trees, shrubs, groundcover, ponds, tanks, food beds and compost. Its Nourishland group covers every current shared-project marker type: plant Orb, Area Totem, Note, Intro checkpoint, and Sub checkpoint, plus an Area boundary guide. These are optional presentation symbols; authoritative Site/Area/record data is still generated from the shared project snapshot. Their square-bounded coordinates persist while the round footprint clips the corners, so changing the map shape preserves layout. The preview at `tools/preview-imap-v2-terrain.html` is now a standalone landscape builder with selection, move, scale, rotation, duplicate/delete, local save, and JSON import/export. No GPS, metre elevation, hydrology, or measured slope is inferred.

The model is pure data and does not change the demo renderer or its narration. Renderer wiring must generalize the existing three-Area assumptions, show empty Areas without fabricated Totems, preserve disc grips/reveal, and bound scene detail for Quest frame rate. Demo integration is separate work.

## Acceptance before cross-client release

- Adding, moving, publishing or deleting Areas and records regenerates the disc from permitted project data; no duplicate map-content database is maintained.
- Creator drafts remain within Creator authorization. Public Explorer receives only the visitor-filtered shared-project response.
- Area and record selection keeps project/Site/Area/record identity and a return path to the prior context.
- Conceptual positions never imply verified ground placement; any factual terrain displays its source and accuracy.
- Large projects page or cluster content instead of shrinking every marker until it is unusable.
- The existing circular silhouette, grips, Living Frame transition and Totem/Orb interactions remain recognizable.
