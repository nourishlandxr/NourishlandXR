# NourishlandXR Spatial Experience Release Plan

This is the traceable product and engineering package for spatial ideas that must remain aligned with active development. It supplements the broader `docs/ROADMAP.md`.

## Product rule: one AR system

AR settings, placement behavior, marker rendering and interaction controls are global application behavior. Projects contain their own content, Areas, filters and anchors, but do not receive separate copies of the AR interface.

The global policy lives in `app/services/arExperienceConfig.js`. Creator placement is implemented by `app/screens/arMode.js`. Changes to either must be tested against new and existing saved projects.

## V1 release goal

V1 proves one reliable spatial loop:

1. Place a marker quickly without first completing an Area form.
2. Retain the marker and its spatial anchor after leaving AR and restarting.
3. Load a checkpoint that establishes the local coordinate frame.
4. Restore every eligible marker in its saved physical position.
5. As the visitor enters a new Area, activate it and load its eligible markers.
6. Apply active filters before rendering so the scene stays understandable.

V1 succeeds when a creator can walk a real test route, revisit it, load the same checkpoint and see retained markers in the expected places.

## V1 engineering packages

### Global creator placement

- One shared taskbar and marker picker for every project.
- Neutral marker first; type is chosen after placement.
- Automatic `Main Location` and `Unassigned` fallback storage.
- Plant, note, marker and Starting Point share one persistence path.

### Anchor persistence and reconstruction

- Store marker coordinates relative to a checkpoint where available.
- Use session-local anchors only as an explicit temporary fallback.
- On checkpoint load, reconstruct all anchors into the active WebXR reference space.
- Preserve stable marker IDs when names, types or content are edited.
- Record anchor version, capture time and accuracy/provenance.

### Area activation while walking

- Treat Areas as spatial loading zones, not mandatory creation forms.
- An Area can later receive a boundary, checkpoint, GPS position or proximity rule.
- Determine the active Area from checkpoint context and/or visitor position.
- On transition, unload the previous Area markers and load the new Area markers.
- Use hysteresis or a short dwell threshold to prevent rapid boundary switching.
- Keep the Starting Point as the central first Area/journey stage.

### Marker loading pipeline

`project -> active site -> active Area -> saved markers -> visibility/filter rules -> anchor reconstruction -> AR render`

Loading must be cancellable. A late response from a previous Area must never overwrite the newly active Area.

### Spatial visual language

- Markers are quiet environmental cues, not opaque office-style labels or floating web cards.
- Default cues should be small, translucent, softly illuminated and readable against changing environments.
- Extended information is spatial content anchored with the marker, not a footer panel fixed to the camera.
- Information frames use restrained transparency, depth, hierarchy and progressive disclosure.
- Plant frames can reveal climate, uses and ecological relationships.
- Notes evolve into Focus Points capable of stories, sound, animation, imagery and observations.
- Area checkpoints define a coherent system such as a section, guild, microclimate, crop or learning zone.
- Marker clarity must be evaluated outdoors, indoors, in bright light and against visually busy backgrounds.
- Spatial markers must not be HTML buttons and must remain isolated from project-theme button/card styling.
- Dashboard marker pixels are rendered directly in WebXR/WebGL. The projected DOM element is invisible and exists only as a generous Pointer-mode hit target.
- Dashboard placement targets are also WebGL-only and follow the detected physical surface; no DOM control exists at screen centre.
- Dashboard AR owns one temporary browser-history entry. Android Back and Exit AR close the session and restore the active project dashboard before normal navigation resumes.
- A placed master marker is recorded immediately in fallback storage when no Area has been assigned.
- Opening dashboard AR restores recorded spatial entries from the active storage Area; later Area assignment moves the same stable entry rather than recreating it.

### Try It Now master flow

The welcome demonstration begins with a persistent transparent Story Board, then teaches the underlying platform model with exactly three placed elements:

1. **Plant:** place a plant, then reveal its spatial knowledge frame with climate, uses and relationships.
2. **Note / Focus Point:** place an observation, then demonstrate the roadmap for sound, animation, images and evolving stories.
3. **Area / Zone:** trace a visible boundary on the ground, then reveal how one defined place can represent a section, guild, microclimate, crop or learning zone and load its connected markers.

The Story Board begins visually empty and reveals its narrative progressively like subtitles. Plant and Note begin as simple breathing-circle placements: the marker appears first, receives its example identity, and only then opens its static spatial information frame.

The sequence is temporary and saves nothing. It is a compact explanation of how simple spatial markers become stories, databases and place-based education. Dashboard AR and Try It Now share the same surface-hit placement primitive in `app/services/spatialPlacement.js`; their persistence differs intentionally.

### Seven-layer filtering model (provisional)

Implementation should reserve seven independent, composable layers:

1. Navigation and Starting Points
2. Areas and boundaries
3. Plants and living assets
4. Notes, observations and maintenance
5. Learning stories and interpretation
6. Checkpoints, journeys and activities
7. Operational/private creator information

Each marker may have one primary layer and optional secondary tags. Filtering happens before marker rendering. Visibility and access permissions override layer selection.

### V1 acceptance route

- Create a fresh project.
- Enter dashboard AR without manually creating an Area.
- Place at least three neutral markers and apply different types.
- Exit AR and restart the application.
- Load the saved Starting Point/checkpoint.
- Confirm all eligible markers return at retained relative positions.
- Walk into a second configured Area.
- Confirm first-Area markers leave and second-Area markers appear.
- Toggle supported layers and confirm only eligible markers render.

## Explore and V2

Every created project appears in Explore immediately. Draft projects are labelled **V2 preview** and use a private creator-preview data path; they are not published through normal visitor APIs.

V2 develops this into the complete visitor journey:

- automatic Area discovery and transitions;
- route-aware checkpoint loading;
- polished seven-layer controls;
- progressive marker reveal based on distance and direction;
- downloadable/offline location packages;
- multi-user publishing, permissions and analytics.

## Decision log

| Date | Decision | Applies |
|---|---|---|
| 2026-07-24 | AR interface and defaults are global across all projects. | V1 onward |
| 2026-07-24 | Area creation is optional before initial marker placement. | V1 |
| 2026-07-24 | Starting Point is the editable beginning of the journey. | V1 onward |
| 2026-07-24 | New draft projects appear in Explore as private V2 previews. | V1 bridge to V2 |
| 2026-07-24 | Seven composable layers are reserved; final taxonomy remains provisional. | V1 design/V2 UX |
| 2026-07-24 | Spatial information uses soft anchored frames; opaque office-style labels are rejected. | V1 onward |
| 2026-07-24 | Try It Now teaches Plant, Focus Point and Area as one master experience flow. | V1 demo |
| 2026-07-24 | Demo frames and text are deliberately larger; the Story Board reveals text progressively. | V1 demo |
| 2026-07-24 | The third demo placement defines an Area boundary on the ground before loading Area-use information. | V1 demo |
| 2026-07-24 | Dashboard spatial markers are isolated from global button/theme CSS and recorded markers restore from storage. | V1 foundation |
| 2026-07-24 | Dashboard master-marker visuals moved from DOM/CSS into WebGL to eliminate device and theme white-board rendering. | V1 foundation |
| 2026-07-24 | The centred DOM placement control was removed; placement is armed from the taskbar and completed by tapping the WebGL surface target. | V1 foundation |
| 2026-07-24 | Android Back is scoped to closing dashboard AR first rather than returning directly to the welcome screen. | V1 foundation |

## Traceability rule

When an item is implemented:

1. Add or update a focused automated test.
2. Reference this document's relevant heading in the change description.
3. Update the decision log if behavior or scope changed.
4. Move completed work into release notes without deleting its original rationale.
