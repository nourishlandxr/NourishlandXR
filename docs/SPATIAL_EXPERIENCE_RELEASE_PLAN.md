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

- The dashboard has one dominant **Open AR** path; creation controls are not duplicated in a Quick Access grid.
- One shared taskbar and marker picker for every project.
- Marker first; its purpose is chosen after placement.
- A new Marker can become a Plant, Note, general Marker or Area Checkpoint.
- Turning a Marker into an Area Checkpoint creates the minimal Area package and makes the checkpoint its local origin.
- Content remembered away from the physical site is saved into the **Unplaced Bag** and can later be selected and spatially placed from the AR taskbar.
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

### Area system model: checkpoint as the local sun

An Area is a self-contained spatial system. A useful mental model is a small galaxy:

- The **Area checkpoint is the sun**: it identifies the Area, establishes its local coordinate origin and begins the Area experience.
- Plants, notes, Focus Points and other markers are the **planets**: they belong to that Area and store their positions relative to its checkpoint where possible.
- The **Area information board** is the entry guide: it introduces the place, its purpose, conditions, stories, safety or access information, and the layers available there.

Checking in at an Area checkpoint activates that Area. The application must not load every marker from the whole project into one AR scene. Instead it loads the active Area package, reconstructs only its eligible markers, and applies the visitor's layer filters before rendering.

The intended lifecycle is:

1. Detect or scan the Area checkpoint.
2. Resolve the checkpoint to one project, site and Area.
3. Establish or restore the checkpoint-local coordinate frame.
4. Load the Area information board first.
5. Fetch the Area marker manifest and apply visibility, permission and seven-layer filters.
6. Restore the remaining eligible markers around the checkpoint.
7. When another Area is activated, cancel stale loading, unload the previous Area package and repeat.

An Area package should eventually contain:

- Area identity and checkpoint reference;
- checkpoint-local origin and anchor metadata;
- information-board content and presentation rules;
- boundary or proximity metadata when available;
- a lightweight marker manifest;
- layer and permission metadata;
- optional media dependencies and offline-cache information.

This model is both experiential and technical. It gives visitors a clear moment of arrival while limiting memory, network, anchor reconstruction and visual clutter. Nearby Area manifests may be prefetched, but their full markers must remain inactive until the Area is checked in or confidently activated. If checkpoint recognition is unavailable, creator-authorized GPS/proximity or manual selection may activate an Area as a degraded fallback without changing the checkpoint's role as its canonical local origin.

### Marker loading pipeline

`project -> active site -> active Area -> saved markers -> visibility/filter rules -> anchor reconstruction -> AR render`

Loading must be cancellable. A late response from a previous Area must never overwrite the newly active Area.

### Spatial visual language

- Markers are quiet environmental cues, not opaque office-style labels or floating web cards.
- Area checkpoints appear as taller translucent **Area Totems**, never ordinary circular Markers. Area information panels may arrange themselves around the Totem.
- The Starting Point appears as a warm gateway form distinct from both ordinary Markers and Area Totems.
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
- Spatial anchors use the native `spatial` API type. During deployment transition, GPS/QR-only legacy endpoints first receive a reserved `nxr-spatial-v1` compatibility envelope. If their anchor route is unusable, the same data is embedded on the marker as `nxr-marker-spatial-v1`; both formats normalize back to spatial data on read.
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
| 2026-07-24 | Added a temporary spatial-anchor compatibility envelope for deployed APIs that still validate only GPS/QR. | V1 deployment bridge |
| 2026-07-24 | Areas are independently loaded spatial systems: the checkpoint is their canonical local origin, the Area board guides entry, and only the active Area's filtered markers render. | V1 architecture/V2 journey |
| 2026-07-25 | Dashboard creation is reduced to Open AR; off-site ideas enter an Unplaced Bag and are placed later from the AR taskbar. | V1 workflow |
| 2026-07-25 | A new Marker may become an Area Checkpoint directly, creating a minimal Area and information-board record. | V1 Area foundation |
| 2026-07-25 | “Marker” is the single user-facing spatial term. “Orb” is retired from interface language; visual appearance is not a separate concept users must learn. | V1 language |
| 2026-07-25 | New projects default to a friendly guided experience; Expert Mode explicitly reveals advanced and future V2 controls. | V1 accessibility |
| 2026-07-25 | Area checkpoints use a translucent Totem visual and Starting Points use a separate gateway visual. | V1 spatial language |
| 2026-07-25 | The first-use tutorial teaches Starting Point, Area Totem and first Marker rather than the old dashboard tool flow. | V1 onboarding |
| 2026-07-25 | Named terrace Areas such as 1R1 link to their printed site-plan positions; their marker dots arrange locally around the Area link. | V1 map |
| 2026-07-25 | Try It Now completes its orientation message before slowly revealing the shared aiming target and only then asks for placement. | V1 demo |
| 2026-07-25 | Every placement method renders one shared aiming-pointer component; pointer design changes must propagate globally. | V1 architecture |
| 2026-07-25 | The quick demo welcomes people personally and explains the experience before introducing its three-Marker process. | V1 demo |
| 2026-07-25 | A fresh project may stage its Starting Point in the Unassigned workflow container, persisted with the supported neutral Place type `Other`. | V1 field-test compatibility |
| 2026-07-25 | The next field milestone is ten placed Markers: one Starting Point, two Area Totems and their initial Plants. | 0.890 milestone |
| 2026-07-25 | The dashboard top is a compact vital-actions board: temporary Starting Point reminder, smaller Open AR, Bag, Create Plant and Add Item; Change Location belongs at the bottom. | V1 dashboard |
| 2026-07-25 | A new soft form converts into purpose-specific 3D language: rectangular Note, notice-bearing Starting Point star, grounded Area Totem, living-core Plant sphere or quiet general Marker. | V1 spatial language |
| 2026-07-25 | Everyday `+ Marker` placement offers only Plant, Note and Marker; structural Area Totems move to a deliberate `+ Special` flow, and resizing stays in Edit details. | V1 AR workflow |
| 2026-07-25 | Explorer projects use Under Construction, Demo or Ready status. New projects default to Under Construction with a public information-only page until opened by the creator. | V1 publishing |
| 2026-07-25 | Hidden from Explorer is a fourth publishing state for projects that must remain entirely private. | V1 publishing |
| 2026-07-25 | AR popup controls form an aligned extension above the taskbar. Purpose selection closes immediately, then converts the soft draft into its Plant, Note or Marker form; Area creation remains inside + Special. | V1 AR workflow |
| 2026-07-25 | Plant interaction keeps the living orb central and unfolds profile Elements as a molecular honeycomb: practical/ecological knowledge left, scientific/historical knowledge right. Lemon Myrtle in Try It Now is the reusable reference preset. | V1 plant interaction |
| 2026-07-27 | Phone placement begins one metre ahead; every element keeps a hand handle, movement hides the aim and uses one shared plus-shaped release control. Focused Plant and Totem profile actions load only that element in AR. Totems use framed forms with attached information balloons, and Try It Now includes Lemon Myrtle and Moringa. | V1 phone placement and profiles |
| 2026-07-27 | Try It Now opens with a floating honeycomb knowledge web and Nourishland XR welcome Note; progression uses calm Continue actions, two Plants, a Note and a Totem. Plant conversion awakens the orb and tours reactive profile knowledge without a naming form. | V1 demo storytelling |
| 2026-07-27 | Fresh dashboards sell the purpose of spatial knowledge through four equal tutorial starts and a moving section spotlight. Inventory & Exhibitions adds an isolated neutral-grey non-plant template with Dynamic Marker database metadata, Locations, Notes and Totems. | V1 onboarding and templates |
| 2026-07-27 | Try It Now keeps a restrained world-space `NOURISHLANDXR` identity panel above the working view throughout the experience. Decorative introductory honeycombs are removed; profile honeycombs continue as programmed, and footer narration still waits 2.8 seconds. | V1 spatial introduction |
| 2026-07-27 | Blue is the global AR action colour. Area dashboards edit their own description and text boxes, keep one Go to Area AR action, and list the Totem first with compact Web/AR editing. Focused Plant AR opens the full honeycomb immediately; honeycomb content editing stays in Web Mode and mirrors its left/right/centre structure. | V1 Area and profile editing |

## Traceability rule

When an item is implemented:

1. Add or update a focused automated test.
2. Reference this document's relevant heading in the change description.
3. Update the decision log if behavior or scope changed.
4. Move completed work into release notes without deleting its original rationale.
