# Nourishland Field application

Field is a separate Android-first mobile web/PWA application within the existing repository. It consumes the same published knowledge as Desktop and Unity; it is not a separate authoritative content database or a native Android APK.

The next increment adds [portable personal checklists](checklist-foundation.md), accessible through Checklists and available with the offline shell. The earlier V0.9594 statements below describe that initial entry/journal milestone; official project downloads and server publication remain later work.

## Entry and ownership

- Local entry: `http://127.0.0.1:8000/app/field/index.html`.
- Hosted build entry: `/xr/field/index.html` after deployment.
- Journal shortcut: `field/index.html?view=journal`.
- Manifest identity, launch URL and service worker scope belong to `field/`.
- `app/field/main.js` explicitly starts Field mode on every device. Desktop uses `app/platform.js` and remains desktop regardless of user agent.
- Old `platform.html?interface=field` and `index.html?interface=field` links redirect to the dedicated Field entry and preserve project/view parameters.
- The normal welcome links Android/mobile visitors directly to Field. Its WebXR tutorial remains independently accessible.

`app/services/platformApplication.js` deliberately shares public content views and personal journal behavior. It imports only the API-base configuration, release metadata, compact icons, public content adapter and journal store. It does not import the demo, XR input/session lifecycle, tutorial state or legacy global shell. Field has its own HTML, launcher metadata, CSS overrides and offline lifecycle. Full UI specialization can build on this boundary without forking knowledge or duplicating the server.

## Implemented now

Discover published projects, areas and basic plant/specimen content; search an area; read legacy public profiles; save/export personal observation drafts; protect unsaved observations; reopen the journal without contacting the public API through its direct shortcut. Existing journal storage is retained under `nourishland.field-journal.v1`; no draft migration or deletion is performed. Browser storage is still origin-scoped, so existing drafts carry across the new route on the same origin.

The manifest declares Nourishland Field's own launcher name, 192/512px icons, standalone display, scope and journal shortcut. Browser/Android installation is not claimed until tested on a physical device. Installation is offered through supporting browsers; no native APK or Play Store packaging is introduced.

## Offline boundary

After a successful connected preparation, `app/field/worker.js` caches the complete Field shell, icons and its explicitly listed shared modules/styles. Field can then reopen its local journal without the server. A failed partial shell download cannot complete installation. An update waits for the previous Field tabs to close; it does not reload and discard an unsaved observation.

The worker registration is limited to `field/`. Its fetch handler accepts only exact shell assets and Field document navigation. It never intercepts API/auth requests, writes, Desktop documents, Creator documents, tutorial modules or other origins. HTTP failures are not replaced with stale cache responses. Cache cleanup only removes previous `nourishland-public-field-shell-*` versions, preserving Creator and unrelated caches.

This shell is not an offline project pack. Public knowledge retrieval still needs a connection. No observations are submitted to the server, no authoritative records are modified, and no background sync is promised. Next stages are versioned downloadable content, checklist progress, project permissions, a submission outbox and idempotent server acknowledgement.

Standards references: [Web Application Manifest](https://www.w3.org/TR/appmanifest/) and [Service Workers](https://www.w3.org/TR/service-workers/). Their lifecycle mechanisms provide the app metadata/scope and offline shell; they do not establish Android hardware acceptance.

## Coordinated Unity work

The user authorised continuation of the existing Codex chat **Start Unity project port** (`01a131a5-6529-7e10-83af-a8d1dd3f5228`), working in `C:/FILES/Projects/NLXRunity`. That chat owns native menu/scaffolding changes. This chat owns the web/Field entry and shared service boundaries.

Unity's authorised first slice is native Create/Explore/Settings, shared-project public reads through `PublicProjectClient`, preserved tutorial/demo experiments under Developer, and a clearly labelled external browser launch for the WebXR introduction. The browser experience opens separately; it is not embedded in Unity. Preserve local drafts, native components and room-anchored showcase. Native authenticated publication and Quest device installation remain separately gated by their established workflow.

No API schema is changed in the Field entry slice. Native and web continue to use the existing `/xr-api` publication projection and stable IDs. Contract evolution and native authorisation will be coordinated before introducing shared writes.

## Acceptance

Automated checks cover app identity/launch/scope, icon dimensions, module graph and shell completeness, offline journal navigation, HTTP failures, API/Creator/tutorial exclusion, partial installation failure and bounded cache cleanup. Run `node --test tests/field-app.test.mjs tests/platform-foundation.test.mjs tests/visitor-flow.test.mjs`, then the full suite and frontend build for release.

Browser checks: dedicated Field title/entry; published fixture content; saved draft across reload; successful shell installation; stop the isolated preview server and reload the journal to prove a cold document request is served by the shell; confirm Desktop remains separate and original welcome shows the new version. Physical Android install/relaunch, storage pressure and low-connectivity behavior are still required.

## V0.9594 local evidence

On 14 October 2026, focused Field/foundation/visitor checks passed 37/37, the full current checkout suite passed 910/910, and the frontend build included the dedicated Field entry, manifest, icons and versioned startup assets. JavaScript syntax and scoped diff checks passed. The original welcome showed `V0.9594 · Local preview` with no console errors.

The isolated browser fixture opened `field/index.html` as Nourishland Field, displayed published test content, retained the earlier route's journal drafts, saved a new local draft, and redirected the old Field link to the new journal route. Desktop opened independently. After stopping that fixture server, reloading the journal document still rendered the app and saved observations. A 390px viewport screenshot is retained in `artifacts/platform-foundation/field-entity-offline.jpg`. This is browser offline-shell evidence, not physical Android installation or offline project-pack evidence.

The Unity chat reported 61 focused menu checks passed and continued its feature regression. That is progress from a separate native checkout, not a completed Unity/Quest release. No web commit/push/deployment or device installation is claimed for this increment.
