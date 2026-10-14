# Next commands for Start Unity project port

User authorisation: continue providing concrete commands to the existing Unity chat `01a131a5-6529-7e10-83af-a8d1dd3f5228`. On 14 October 2026 the chat became unloaded after a reported usage limit. Sending the latest follow-up returned `thread not found`; those follow-ups are not claimed delivered. Resume after the user restarts Codex and the chat can be loaded.

## Resume from the current source

1. Inspect the current diff, source version and pending editor/package evidence in `C:/FILES/Projects/NLXRunity`. Preserve the user's in-progress utility row, AR/VR switching, Peek work and room-anchored showcase. Do not restart the native project or delete local data.
2. Finish the current native Create/Explore/Settings and shared-project read milestone. Existing copied tutorial/demo journeys remain Developer experiments; no continued tutorial parity port.
3. External introduction URL is `https://nourishland.org/xr/?experience=webxr-demo`. Web `app/main.js` now handles it before restored creator/project routes. `app/screens/webxrDemoEntry.js` presents an explicit Start action and invokes the existing demo entry in its click handler. Unity opens the browser separately and targets that entry automatically; the browser still needs its own Start gesture/permissions to enter immersive WebXR. This is not embedded WebXR inside Unity.
4. Validate exact external URL dispatch, failure feedback, native route cancellation/return state and preserved Developer entry/exit paths. Keep actual Quest browser launch and return testing distinct from synthetic dispatch/editor checks. The web route remains local until a scoped release is deployed.
5. Use `PublicProjectClient` and the existing public `/xr-api/... ?view=visitor` projections. Keep project/species/specimen identities. Do not treat native local drafts as published content, embed creator credentials or add a second authoritative database. Native publishing follows a reviewed authentication/project-permissions adapter.
6. Run current editor regressions and package/source verification, preserving versioned APK candidates. Do not install or launch on Quest without the user's confirmation required by the Unity workflow.

## Next contract after that milestone

The web slice defines a portable personal checklist in `schemas/checklist-v1.schema.json`, with executable JS boundary validation in `app/services/checklistContract.js`. Portable fields: schemaVersion 1, stable experience/project IDs, revision, type checklist, title/description, publication personal-draft, optional site/area scope, ordered stable activity IDs, knowledge/specimen/checkpoint references, zero required capabilities, self-report completion. JSON-schema cannot express unique object IDs across steps; native validation must additionally reject duplicate activity IDs.

Desktop creates/exports local personal drafts; Field imports/completes them locally. Progress is keyed by project + experience + revision. No server publication, API schema migration, authenticated writes or official land-manager approval is introduced. Imported project references are identifiers, not proof of authorisation. Unity can later deserialize and render supported activities with a client-native adapter, without executing JS or copying tutorial sequencing. First finish the native menu/public-read/browser milestone, then propose the smallest checklist adapter.

Read `docs/platform-foundation.md`, `docs/field-app.md` and `docs/checklist-foundation.md` in the web checkout for boundaries and evidence. Report the current concrete blocker, changed files, passed checks, build status and separate on-device acceptance in the Unity chat.

Web milestone is locally complete at V0.9597: full suite 923/923, focused 45/45, frontend build and welcome version passed. Browser QA verified real desktop JSON export → Field file import → out-of-order activity completion → persistent/offline reopen. The synthetic exported fixture is `artifacts/platform-foundation/checklist-example.json`. Use it for a subsequent native deserialization/identity check; completion export/sync, project publication and native permissions are deliberately absent. Direct-entry browser and desktop fallback behavior were verified, but hosted route deployment and Quest launch/return remain pending.
