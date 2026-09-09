# Creator AR and PIM completion — 0.9021

Completed locally on 10 September 2026. No production deployment or data migration.

## Findings and changes

- Expanded branches could reuse honeycomb slots. The shared allocator now reserves unique slots across the displayable tree, keeping existing cells stable when other branches open. Six standard categories remain; custom roots and longer branches remain accessible through All topics.
- Creator actions were crowded and knowledge reading interrupted the spatial workflow. The creator dock now groups Add, Inspect, More and Exit AR, with contextual placement and knowledge actions.
- Creator AR and Try It Now now use the same compact pastel honeycomb settings and shared reading/editing workspace. Fixed missing settings in the demo DOM renderer and creator fallback. Fixed legacy CSS that produced rectangular cell backgrounds and misplaced text.
- All topics opens the complete hierarchy, plant-scoped search, breadcrumbs, evidence and source disclosures. Reading, editing and local observations use the existing PIM component and persistence architecture.
- Closing the reader preserves plant and mesh context. Unsaved editors and active saves block accidental closure. Controller, hand and DOM actions are guarded against reaching placement controls behind the workspace.
- Creator opening refreshes the profile. Saving checks for changed PIM/review data and preserves fresh non-PIM profile fields. This is a client-side conflict check, not an atomic server transaction.
- Demo editing uses session memory rather than the live plant API. Demo observations are explicitly scoped to demo specimens.
- Narrow reading layouts wrap long specimen references and prevent nested-grid clipping. Compact controls retain readable titles; the reading button is constrained to the surface width.

## Knowledge integrity

IDs, six-category hierarchy, species/specimen scope, publication state, evidence, provenance, source IDs and media are preserved in AR projection. External imports continue through the existing source archive and review workflow; this update does not automatically import database fields or promote source material into reviewed knowledge. No new database connector was added.

## Verification

- 225 automated tests passed, including polygon overlap and position stability at 320, 390 and 1440 widths, deep-topic state, projection metadata, conflict handling and shared AR contracts.
- Browser: isolated real Jackfruit record; unpublished specimen observation save and reopen; sparse record and custom root; populated Pigeon Pea reference; multiple search matches and deep breadcrumb navigation.
- Browser: narrow 320px reader, desktop and landscape reading; creator action palette and keyboard Escape dismissal; unsaved-editor closure guard.
- Actual Try It Now simulated flow: placed Pigeon Pea, opened honeycomb, opened shared All topics reader, opened the specimen observation editor. Demo save/reopen was not completed before interruption and remains a manual follow-up.
- Final shared DOM/canvas component preview inspected after CSS corrections. The component lab is explicitly not an immersive AR session.
- Hosted build generated locally; workspace data excluded. Welcome version verified separately during handoff.

## Files

Main implementation spans app/screens/arMode.js, app/screens/temporaryArDemo.js, app/services/creatorArControls.js, app/services/creatorArKnowledge.js, app/services/plantInformationMesh.js, app/services/plantInformationMeshView.js, app/services/plantInformationMeshCanvas.js, app/services/pimModel.js, app/services/questSpatialBelt.js and app/product-v2.css. Release version: app/services/buildInfo.js.

Regression coverage: tests/creator-ar-knowledge.test.mjs, tests/ar-interface.test.mjs, tests/plant-information-mesh.test.mjs, tests/quest-spatial-belt.test.mjs and tests/visitor-flow.test.mjs. Local QA page: tools/creator-ar-preview.html. Some implementation files were already committed in 10d07dc before this final continuation; subsequent fixes remain in the working tree.

## Remaining risks and next iteration

Physical phone/headset passthrough, controller ray alignment, hand input, spatial text readability and motion comfort require hardware verification. No such hardware test is claimed. Large-tree geometry reserves more positions; caches limit repeated surface calculations, but extreme-tree performance needs device profiling. Compact spatial branches intentionally show a limited subset while the reader exposes the complete hierarchy. The next iteration should complete demo save/reopen and physical-device acceptance, then add atomic persistence version checks for multi-creator editing.

The interaction is materially improved by stable geometry, consistent main/demo behavior and access to the complete knowledge hierarchy without ending AR. Hardware validation remains necessary before treating it as production-ready.
