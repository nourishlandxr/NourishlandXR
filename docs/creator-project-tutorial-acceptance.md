# Beginner Creator project setup: cross-platform acceptance

## Purpose and scope

This specification gives website, Desktop, Android Field, map/API, and Unity implementations one beginner-friendly project setup sequence. It accompanies the shared copy in `app/services/creatorProjectTutorialContent.js`. Stable step IDs are the cross-platform reference; layouts and interaction controls may differ.

The tutorial is a guide through creating one connected project, not a publication flow. Completed setup stays a draft until the creator deliberately publishes it. This slice does not redefine `sharedProjectContract` or authorize a new field in it.

## Shared sequence

Use these step IDs and keep this order:

| Step ID | Lesson | Required result |
| --- | --- | --- |
| `project-identity` | Name the project and describe its purpose. | Draft project identity is available for saving and can be edited later. |
| `geographic-origin` | Set one project-level geographic origin by device location or manual coordinates. | Exactly one geographic origin is attached to the project through an agreed project/API shape. |
| `load-map-information` | Load and review map information for the origin. | Map content is shown, or its unavailability is clearly reported while setup can continue by place name. |
| `first-area` | Choose or create the first working Area. | One working Area is selected or created under the same project; a system Home Area alone does not complete this lesson. |
| `first-record` | Add the learner's first Plant, Note, or other supported record. | The learner's own record belongs to the working Area; a seeded reference example alone does not complete this lesson. |
| `save-reopen-and-switch-views` | Save, reopen, resume, and view the same project in flat view and IMAP. | Both views load the same project and record identities; saved work remains unpublished. |

Do not skip the purpose, origin, map, Area, or first-record learning moments merely because a project template already contains defaults. A system Home Area is scaffolding, not the learner's first working Area. A seeded example is reference content, not the learner's first record. The learner must choose or create a working Area and add their own record; preserve the defaults without duplicating them.

## Geographic origin and physical placement

The project geographic origin provides broad map context for one project. Ask for device location only after the creator selects that action. If permission is denied or unavailable, offer manual coordinate entry without repeatedly prompting for GPS. Do not describe the coordinate fields as a map picker.

This origin has a different meaning from the position of a particular record. Do not use it as an XR spatial anchor, a printed ArUco association, or the `spatialData.coordinateSystem.originTotemMarkerId` local coordinate-frame reference. Individual records may receive physical placement later.

`app/services/creatorProjectGeography.js` now defines the working Creator shape: `project.siteMap.geographicOrigin` stores the single point, and `project.siteMap.mapData` stores the matching sourced or unavailable map package. Use its normalization, stale-origin guard, and `projectGeographicMapContext` helper; do not create a parallel shape. Save through the existing project update path while preserving the project ID, other `siteMap` fields, and expected-modified check.

The current `sharedProjectContract` (`schemaVersion: 1`) still exposes the public project identity and collections of sites, Areas, and records; it does not include geographic-origin or `mapData` fields. This tutorial work does not change that read-only contract. Native/local drafts must not be described as server-synced until a supported write and cross-client read path exists. Do not overload the human-readable `address`, the local metric coordinate-system origin, or an individual record's spatial anchor to hold the project geographic origin.

The current terrain provider has NSW coverage. `loadProjectMapInformation` returns an unavailable status outside that coverage or after provider failure, preserving a project authoring path; any interpolated contour surface must be described as illustrative, not a survey or DEM.

## Current API behavior the wizard must handle

The existing `POST /api/projects` path creates a default site and Home Area and seeds a draft Pigeon Pea example. The persistence tests assert that behavior. The Home Area and Pigeon Pea are system scaffolding/reference content; neither satisfies the learner's first working Area or first record. The wizard must preserve them, offer the example for reference, and avoid duplicating either when the creator resumes or retries. A separate existing working Area may be selected instead of creating another.

The tutorial still requires an empty-project test case. Use a controlled empty-project fixture or an agreed empty-create API mode; do not fake emptiness by hiding records returned by the API. Include a separate compatibility case for the current Home/Pigeon Pea defaults.

The current public shared-project projection is read-only. This tutorial writes through the authenticated Creator project/Area/record APIs, then opens views that consume canonical project data. Do not treat a public projection as Creator write permission.

## Navigation, persistence, and recovery

- **Back:** returns one step and retains all completed fields and server-confirmed records.
- **Resume:** reopening setup returns to the last completed step for the same project ID.
- **Location denial:** no repeated permission prompt; map-point and manual-coordinate routes remain available.
- **Map outage:** retain the project origin and entered progress; show map unavailability; allow retry or a clear place-name path.
- **Create/save API outage:** do not claim the project was saved. Retain unsent details and present Retry against the same draft.
- **Ambiguous create timeout:** if the API may have accepted the create, recover the resulting project ID or use an agreed idempotency mechanism before retrying. Never create a second project from one wizard attempt.
- **Area/record save timeout:** retry the same operation against the same project/site/Area/record identity; do not create a second Home Area or Pigeon Pea sample.
- **Publication:** wizard completion and autosaved progress never publish. Show a saved/draft state only after the write succeeds.
- **Empty project:** explain that no records exist yet and make the add-first-record action clear. Do not render a successful empty map as a service error.
- **Existing defaults:** explain the seeded Home Area and Pigeon Pea when present. Let the creator use, rename where supported, or leave the example without adding a duplicate.

Progress before the server returns a stable project ID may use a local draft identifier. Once created, progress must bind to the returned project ID. It must never be confused with visitor publication state.

## Identity and view consistency

Project and record identity come from the canonical saved project hierarchy. Flat view and IMAP may arrange the same data differently, but switching views must not clone it or mint replacement IDs. Refreshing either view must resolve the same project, Area, and record IDs. If a view cannot load, show the error and retain the selected project context rather than opening an unrelated or empty project.

## Test matrix

Run the applicable cases on each target: **website/desktop browser**, **Android Field/mobile browser**, and **Unity/Quest**. Unity may use native permission and map controls, but the outcome and identity behavior must match.

| Case | Setup and action | Pass condition |
| --- | --- | --- |
| `CP-01` Empty project | Start with no Areas or records; complete all tutorial stages. | One first Area and one first record are created under the new project; setup completes without a preloaded example. |
| `CP-02` Existing default data | Start from the current API-created system Home and draft Pigeon Pea. Resume, go Back, and retry the next save. | Home remains scaffolding and Pigeon Pea remains a reference; neither is counted as the learner's first working Area/record. The learner's own record belongs to a chosen or created working Area, with no duplicate defaults. |
| `CP-03` Device location granted | Select Use device location and grant permission. | One project origin is stored once; user sees its accuracy/context; no per-record anchor is inferred. |
| `CP-04` Device location denied | Deny permission, then enter coordinates manually. | The creator can set the project origin without another permission prompt; no data is lost. |
| `CP-05` Location unavailable | Test without geolocation support or a usable position. | Manual origin options are available and clearly labelled. |
| `CP-06` Map information unavailable | Fail map loading, retry, then continue by place name. | Error is clear; origin and completed tutorial steps remain; no fake empty-map success is shown. |
| `CP-07` Project API unavailable | Disconnect before project creation, then restore service and retry. | Entered details are retained; saved status waits for server confirmation; one project is created. |
| `CP-08` Ambiguous create timeout | Let the server accept a project create but drop its response; retry. | Wizard recovers the same project ID or uses agreed idempotency; there is no duplicate project. |
| `CP-09` Area/record API retry | Interrupt an Area or record save and resume. | The same project and operation complete once; no duplicate Area or record is created. |
| `CP-10` Back and resume | Complete identity and origin, go Back, leave setup, then resume. | Prior values and the correct next unfinished stable step appear for the same draft/project. |
| `CP-11` Flat/IMAP identity | Save first Area and record; open both views and switch repeatedly. | The same project ID, Area ID, and canonical record ID appear; no duplicate content is written. |
| `CP-12` Draft boundary | Complete setup without publishing, then inspect a visitor/public listing. | Project remains private/draft under current visibility rules and is absent from visitor results. |
| `CP-13` Manual physical placement later | After setup, assign a spatial anchor or ArUco tag to one record. | Record placement is independent of the project geographic origin. |
| `CP-14` Unity sharing boundary | Create or reopen a project in Unity, then check whether its origin, map package, and tutorial progress can be read/written through the supported server path. | Synced state uses the same project ID and `siteMap` shape. If only a device-local draft is available, Unity labels it local and does not claim cross-platform sync. |

## Platform-specific checks

- **Website/desktop:** keyboard and pointer navigation, accessible labels, browser permission only after the explicit location action, refresh/resume, API status and map fallback.
- **Android Field/mobile browser:** location permission and denial, manual coordinate entry at touch size, loss of connection during save, returning from background, and resuming the same project.
- **Unity/Quest:** equivalent stage IDs and copy, headset permission/unavailable paths, controller and hand input can reach Back/Retry, map loading never blocks saving the tutorial draft, and Quest/browser transitions preserve the project identity.

Across platforms, do not claim Quest/device parity based only on editor or browser tests. Record the actual device and API environment used.

## Integration checklist

- [ ] UI implementations consume the shared step IDs and copy or document the exact intentional platform-specific wording.
- [ ] Map/API owner confirms a project-level geographic-origin persistence shape without changing shared-project v1 without agreement.
- [ ] Create retries are idempotent or recover the server-created project ID after ambiguous timeouts.
- [ ] The empty-project path and current seeded Home/Pigeon Pea path both pass.
- [ ] `creatorProjectGeography.js` is the sole geographic-origin/map package model; record anchors remain independent.
- [ ] Unity distinguishes a server-synced project from a device-local draft until a supported write path is verified.
- [ ] Tutorial progress is resumable and remains separate from publication.
- [ ] Flat and IMAP resolve the same canonical project and record identities.
- [ ] Website, mobile, and Unity/Quest evidence are recorded separately.
