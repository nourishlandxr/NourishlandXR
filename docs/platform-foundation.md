# Nourishland foundation: audit and phased implementation

Audit date: 14 October 2026. Web checkout: `C:/FILES/Projects/website/github/NourishlandXR`, branch `main`, initial HEAD `1e0ab707`. The initial working tree was clean; unrelated tutorial/controller edits appeared during the audit. Test results therefore describe a changing checkout, not a frozen release candidate.

The new direction supersedes tutorial/demo parity as the Unity migration goal. Preserve the existing WebXR tutorial and native experiments. Do not continue reproducing their full journey across devices.

V0.9594 implementation update: Android Field now owns `app/field/index.html`, its manifest/scope and offline journal shell; Desktop keeps `app/platform.html`. Old Field links redirect compatibly. See [Field ownership, coordinated Unity work and validation](field-app.md). The initial audit and V0.9593 findings below remain historical evidence.

## What to do now, soon and later

| Stage | Deliverable | Relative effort | Completion gate |
| --- | --- | --- | --- |
| Now: protect and separate | Grounded audit, independent desktop content and Android field entries, existing public knowledge, personal observation drafts | Small to medium | Content/field dependency graph excludes tutorial runtime and styles; public reads need no creator login; drafts survive reopening |
| Next: shared contracts and trust | Versioned project/knowledge/specimen/experience contracts, legacy adapters, project-scoped roles and native authentication design | Large | Invalid relationships rejected; private content stays private; one project's editor cannot change another project |
| Short term: one complete educational project | Author an area, trail, checkpoint/Totem and checklist in Studio; visitor completes it on mobile | Medium to large, after contracts | One stable experience ID and published revision; completion works without XR or precise anchors |
| Short term: useful field pack | Download text and licensed media, reopen after offline cold start, checklist progress, observation outbox and acknowledged sync | Large | Partial downloads/quota errors handled; retries are idempotent; drafts retained until server acknowledgment |
| Short term: native shared project | Unity Explore reads the same project and knowledge; authorised native Creator writes through approved APIs; external WebXR tutorial entry | Large | Shared identities, publication and access agree across clients; actual Quest tests and browser-launch test |
| Later: richer field tools | Supported compass, optional GPS/map, photos, audio, identification assistance, NFC/ArUco checkpoints | Medium to large per capability | Permission-denied and unavailable paths tested on Android/Quest; uncertainty and privacy recorded |
| Later: spatial positioning | Multiple positioning references, coordinate adapters, uncertainty, verification and map revision metadata | Large | Area content still works unlocated; transform/marker tests plus actual repeated field localisation |
| Much later | VPS, reconstructed sites, photogrammetry/LiDAR processing, marketplace/payments, multi-user sessions | Very large; separate research/product projects | Proven technical feasibility, permissions/licensing and a validated use case before product integration |

These are effort classes, not calendar promises. Finish the gates in order. Do not start all stages concurrently. The first release is a foundation increment, not the completed Field Multitool or four-client platform.

## Repository-grounded inventory

| Classification | Existing implementation and evidence | Preserve / gap |
| --- | --- | --- |
| A: domain | `app/services/pimModel.js`, `pimLegacyAdapter.js`, `plantDataService.js`, `spatialDataModel.js`, `physicalAnchor.js`; `schemas/*.schema.json` | Canonical PIM IDs, registry species vs specimen identity, existing spatial/marker validation. Experience schema currently accepts arbitrary step objects; it is not a complete portable experience engine |
| B: shared services | `tools/persistence-server.mjs`, `app/services/apiClient.js`, `persistence.js`, `creatorWorkspaceData.js` | Existing JSON/file persistence, public projections, ZIP import/export, atomic writes/backups. Extend rather than replace |
| C: WebXR | `app/screens/temporaryArDemo.js`, `explorer.js`, `arMode.js`, `app/features/ar-demo/`, `app/services/welcomePractice*.js`, `webxrSession.js` | Existing tutorial, demo, Explorer and input lifecycle. Tutorial-specific fruit/Zinnia sequencing is not a platform contract |
| D: Unity | Separate `C:/FILES/Projects/NLXRunity`; `Assets/NLXR/Scripts/PublicProjectClient.cs`, `PublicProjectBrowser.cs`, `PrototypeProjects.cs`, `ExperienceContent.cs`, `NativeJourney.cs`, `DemoFlow.cs` | Native components and public API reader exist. Draft Creator storage is local and not server publication. Native tutorial/demo replicas already exist; freeze parity work rather than deleting them |
| E: desktop | `app/screens/creatorDesktopWorkspace.js`, `app/creator-studio.css`, `app/services/creatorDesktopTools.js` | Conventional project overview, records, knowledge, map/register, field preparation, import/export/printing. Public content entry still used legacy shell before this slice |
| F: mobile | `app/screens/creatorFieldWorkspace.js`, `app/services/creatorWorkspaceStore.js`, `app/creator-field-worker.js`, `fieldGuide.js` | Creator field tasks, scan/capture, IndexedDB prepared packages and operations. This is not yet a universal anonymous visitor multitool |
| G: experimental/legacy | `tools/preview-*.html`, `prototypes/`, legacy screen/global-handler routes in `app/main.js`; Unity export/verification tools | Keep existing experiments accessible. Do not interpret sample demo content or local draft projects as authoritative published platform content |

The physical Unity directory is separate from this Git checkout. Read-only source audit was performed there; no Unity files, scenes, packages, APKs or local drafts were changed in this phase. Native compilation, headset validation and live hosted API verification were not performed.

### Existing records and storage

- Canonical web hierarchy is project → site → place/area → marker, with `plant_profile.json` and optional `anchor.json`. `docs/ARCHITECTURE.md` documents private workspace files outside the static web root.
- Shared plant registry lives in `workspace/plant-library/plants.json`; specimens are `plant-instances.json` under a site. `resolvePlantsForPlace` in `tools/persistence-server.mjs` joins species and specimen records and retains both IDs.
- Current publication values are `draft`, `public`, `hidden`. Proposed `unlisted`/`private` semantics need an explicit compatibility decision; do not silently reinterpret `hidden`.
- Existing browser storage includes presentation preferences, restored views/tutorial progress, and IndexedDB Creator field packages/operations. New personal journal drafts use a separate versioned key and never enter the creator write queue.
- Unity `PrototypeProjects.cs` saves `nlxr-project-drafts.json`; `LocalJournal.cs` saves `nlxr-journal.json`; `PublicProjectClient.cs` has an HTTPS read cache. These are distinct local stores, not a shared project database.
- Organisation memberships, project-scoped roles, trails/checkpoints as reusable entities, observations/moderation, robust anonymous progress and entitlement contracts need further implementation. Existing marker/checkpoint or experience-shaped records do not prove the complete requested models exist.

### Hosting, authentication and deployment

`apiClient.js` selects `/api` locally and `/xr-api` under hosted `/xr/`. Hosted Creator access uses a password/session-cookie flow. The server checks creator sessions and request origins; visitor reads use `?view=visitor` and require explicit public visibility along the hierarchy. PIM projection removes unpublished/unreviewed nodes. This preserves public read access but does not establish per-user, per-project authorisation.

`tools/build-hosted.mjs` copies native ES modules and explicit root assets into `dist/xr`; it does not bundle a framework. Backend output is separate. `.github/workflows/deploy-xr-production.yml` gates frontend deployment on tests/build and rejects protected workspace/API data in static assets. No new framework, cloud service or dependency is needed for the first separation.

## Confirmed dependency and propagation map

```text
Before this slice:
index.html -> global style.css / pim.css / product-v2.css / other styles
  -> entry.js
     -> explicit workspace + project -> creatorWorkspaceRouting.js
        -> Desktop / Field / Spatial workspace modules
     -> all other routes -> main.js
        -> tutorial/demo, visitorExperience, fieldGuide, Creator and Explorer

Unity export-content / export-demo-flow / sync-recorded-voice tools
  <- WebXR welcome lessons, LIM/LIMO demo content, demo model and saved audio
  -> Assets/Resources/NLXR/experience-content.json and native journey resources

Unity PublicProjectClient -> hosted /xr-api/... ?view=visitor
Unity PrototypeProjects -> local native draft file (no authenticated publishing)

Added in this slice:
platform.html -> platform.css -> platform.js
  -> apiClient (API base only), buildInfo, compact icons
  -> platformPublicContent -> existing public JSON API
  -> fieldJournal -> separate personal draft storage
  -> explicit links to Studio / legacy WebXR welcome (new document lifecycle)
```

Confirmed propagation mechanisms:

1. `main.js` statically imports tutorial/demo and ordinary content/authoring screens, and installs shared globals/history/restored-view handling. Ordinary content routes therefore load the demo graph even when no XR session is requested.
2. `index.html` loads global styles for these routes. Selector/event coupling is an architectural risk; this audit does not claim every global selector caused a reproduced visual regression.
3. Unity `Tools/export-content.mjs` copies WebXR lessons, responses, LIM/LIMO cells, demo living-map data and narration. `Tools/export-demo-flow.mjs` reads WebXR demo sequencing. Web `tools/sync-unity-narration.mjs` explicitly writes native lesson/audio mappings. Changes propagate when these export/sync tools are run; there is no evidence of an automatic watcher continuously rebuilding Unity.
4. `ExperienceContent.cs` loads the copied resource; native tutorial/demo lifecycle interprets it. Separate rendering does not remove copied sequencing/content coupling.
5. Creator direct workspace entries already bypass `main.js`. Their shared data adapters still import some legacy content helpers through persistence; complete authoring isolation remains a later task.

The new platform graph has no PIM renderer yet. It reads public summaries/basic profiles and preserves their knowledge references. Full rich PIM rendering should be added deliberately through a content adapter, not by importing the legacy XR/visitor screen.

## Target architecture and migration decisions

Retain one authoritative service and existing IDs. Add portable JSON contracts under `schemas/` and runtime validation at API boundaries. Separate knowledge, experience sequencing, spatial placement, and client presentation. Spatial positioning remains optional. A species record can exist without a specimen or anchor.

Use distinct presentation entries and lifecycles for Desktop, Field, WebXR tutorial, WebXR Explorer and native Unity. The four product interfaces do not require identical implementations; WebXR owns two bounded experiences.

ADR 001: additive ES-module separation first. Keep existing links/routes operational and introduce `platform.html?interface=desktop|field`. `index.html?interface=...` redirects before importing `main.js`. Do not force a new default route or replace the working welcome before review. The welcome exposes the new content/field entry.

ADR 002: reuse visitor API publication projection. New client reads are GET-only with `view=visitor`, fail on malformed/non-JSON responses, retain project/site/area/specimen identities, and do not call Creator authentication. No shared-record migration is performed.

ADR 003: mobile web first. Basic text observations are personal local drafts with export, version checking and explicit storage failure. Do not describe this as downloadable offline content, server contributions, background sync or a native Android APK.

ADR 004: preserve native components; stop tutorial parity work. Existing experiments are retained. A subsequent Unity menu change should make shared-project Explore/Create primary, move copied demo/tutorial experiments under Developer, and add a labelled external WebXR introduction. No such Unity menu change is claimed in this phase.

Migration risks: ambiguous legacy species/marker IDs, duplicate marker names across projects, publication defaults, moving anchors through coordinate conversion, corrupted/outdated caches, and conflating local draft state with published revision. Adapt read boundaries first, back up before any future migration, and never merge records by title alone.

## How Unity NLXR changes

| Existing direction | New direction | Preserve |
| --- | --- | --- |
| Reproduce WebXR tutorial and 29-screen demo | Native Explorer/Creator of real shared projects | Existing experiments and checkpoints as developer assets |
| Copy lessons/sequencing into native resources | Load versioned published knowledge/experiences through APIs | Native JSON adapter, HTTPS public reader/cache |
| Local Creator prototypes | Local drafts clearly identified; later authorised API writes and sync | Distinct specimen identities and local backups |
| Tutorial inside native startup | Labelled external browser introduction; explain separate launch/return | Native components needed for real experiences |
| WebXR visual fidelity as whole-product acceptance | Native interaction quality and shared data compatibility | PIMO, Tags, Orbs, Totems, Living Frame, knowledge and input work |

First Unity implementation after contract review: change menu ownership without removing scenes/data, connect Explore to one known published project, expose native capabilities honestly, and test browser launch on Quest. Authentication design precedes Creator publishing. Do not embed the browser Creator password or consider public read compatibility proof of native write compatibility.

## First implementation and tests

Affected files: `app/platform.html`, `platform.js`, `platform.css`, `services/platformPublicContent.js`, `services/fieldJournal.js`, `services/workspaceIcons.js`, `entry.js`, `main.js` (explicit Studio access route), `screens/launch.js`, `services/buildInfo.js`, `tools/build-hosted.mjs`, `tests/platform-foundation.test.mjs`, and this documentation. No backend format or Unity source migration.

Validate the reachable module graph and separate stylesheet entry; public request projection/encoding/error handling; shared species with distinct specimens and project scope; legacy marker retention; personal draft reopen/export and corrupt/quota preservation. Existing API integration tests cover public hierarchy and protected writes. Build includes new root assets and version metadata. Verify welcome version and desktop/field content in a browser separately from hardware.

Initial baseline with permitted loopback access: 889 tests, 882 pass, 7 fail. Failures were in fruit/welcome/rim/controller/tutorial and startup-game checks; preserve `.tmp/foundation-baseline-loopback.log` as local evidence. Source changed concurrently, so these are observed pre-slice failures, not a verified release baseline. Re-run focused and full checks before deployment; do not deploy a failing suite.

Local validation for V0.9593: focused foundation/visitor tests passed 30/30; full suite passed 899/899 after the concurrent tutorial work updated its implementation/tests; the final route/foundation/visitor/product checks passed 37/37. Frontend build passed. Browser verification on a separate synthetic workspace confirmed public project → area → plant profile, preserved unsaved observation on Back, and a saved journal draft surviving reload, with no console warnings/errors. A 390px viewport review confirmed the field layout; this is browser evidence, not Android hardware evidence. The real local workspace's public list was empty; no project was made public for this work. Studio access opened project selection, and the original welcome displayed V0.9593. Scoped diff checks passed; the whole checkout still had unrelated trailing whitespace in `welcomePracticeScene.js`. Source continues to change concurrently, so freeze and repeat release checks before deployment. This increment remains uncommitted and undeployed; Android/Quest hardware and Unity integration remain pending.

Hardware acceptance still required: Android touch/layout, storage persistence/quota/offline lifecycle, camera/location permission paths when added; Quest WebXR welcome/controller lifecycle; native shared-project rendering and external browser launch/return. No hardware success follows from Node tests or browser rendering.

## Essential decisions before later stages

No further approval is needed for this reversible first slice under the user's implementation request. Before broad migrations or production rollout, review the default landing change, project membership/role policy, native sign-in mechanism, public/unlisted/private migration and observation moderation. Confirm suitable Hillyards content/permissions before publishing a new demonstration project; do not invent official trails, safety information or plant observations.

Next concrete task: define a minimal portable checklist experience and legacy project/knowledge adapter, then review project-scoped permissions before adding official publishing or observation sync. Finish one project's complete non-XR learning loop before expanding the tool list.
