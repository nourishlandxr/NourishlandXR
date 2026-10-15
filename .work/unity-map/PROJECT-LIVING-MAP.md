# Simple AR project Living Map

This map is a compact, conceptual project overview for native Creator, Explorer and future project welcome areas. The sophisticated flat Studio planning map remains a separate interface. Both read the same project identities; this patch does not recreate the WebXR demo in Unity.

## Installed entry points

- Creator: local project workspace > compact map icon in the header. The Area and specimen pages also expose the project map.
- Explorer: published project browser > compact map icon in the header. The same public map is available when browsing shared projects from Creator.
- Area island > its saved objects; published object > existing record reader; local Orb > specimen inspector.
- All Areas returns to the overview. Dense views page at 12 nodes. Refresh reloads the shared project endpoint for Explorer and rereads the local draft in Creator.

`ProjectLivingMapData` projects accepted public snapshots or local drafts into the same view model. Areas and records retain composite identities, including site ID. Actual Totems use checkpoint records; a generic checkpoint is not automatically a Totem. Draft Areas do not invent Totem records. Every accepted record can be selected, including records without species knowledge.

`ProjectMapLayout` allocates persistent presentation slots per parent. Existing slots survive additions, removals and reloads; local layout cache is distinct from authoritative content and physical anchors. Creator draft and public layouts have separate cache keys. Map visual fitting can change with the viewport contents; it does not rewrite stored positions.

`NativeProjectLivingMap` reconciles visible objects by ID, disposes removed visuals and owned materials, bounds the active node count, and gives new objects a short growth/glow reveal. Reduced motion reveals immediately. Collider targets, shape differences, identity text and focus outlines provide interaction feedback. Compact controls reveal their names on aim/focus.

## Website and shared data

Unity reads `GET /api/projects/{projectId}/shared?view=visitor` through the existing PublicProjectClient; the hosted prefix is `/xr-api`. The website should keep the flat Creator map attached to the same canonical project/site/Area/record IDs and publication flow. Published content then appears when Unity refreshes that project. Do not link the Unity map to the fixed WebXR demonstration scene or duplicate records into a separate map database.

No browser-to-native deep link is registered by this patch. A website launch button needs a separately registered native app link; an ordinary web URL cannot call the native map route. A native project welcome area can reuse `PublishedProjectLivingMap` after its project snapshot has loaded.

## Validation boundary

Native version: 0.2.26, Android code 27. Source is installed; no APK was built, installed or launched for this change. Isolated compiler checks use the existing Unity Editor references without replacing the assemblies used by the open Editor. Model checks execute the production map projection and shared parser in .NET with numeric and draft-type shims. They do not establish rendering, SDK pointer delivery, hosted endpoint availability or physical Quest acceptance.

Editor verification: `Nourishland > Verify project Living Map` (requires leaving any current Play session first). It checks data growth/removal, identities, selection, keyed reconciliation, paging and reduced-motion setup. Batch verification exits; interactive verification returns from Play mode and leaves the Editor open.

Remaining: run the Editor scene checks and inspect the real rendering, then build and physically validate Quest. Published Creator writes/sign-in, continuous server push, calibrated physical placement, cross-device layout synchronization, map carrying/rotation, and automatic placement of a map in authored welcome areas remain separate work. This integration supplies the reusable map and project navigation entry points.
