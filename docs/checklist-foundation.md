# Portable personal checklist foundation

This phase supplies a useful non-XR learning loop without bypassing unfinished project permissions: Desktop creates a personal checklist, exports JSON, and Field imports/completes it. The authoritative project database is unchanged. A personal checklist is not an official trail, safety notice or published experience.

## Contract

`schemas/checklist-v1.schema.json` is the portable contract for client adapters. `app/services/checklistContract.js` performs matching runtime validation at web import/create boundaries, including the additional duplicate step-ID constraint described in the schema. The legacy `schemas/experience.schema.json` remains unchanged; no migration silently reinterprets existing experience-shaped content.

Required fields: `schemaVersion:1`, stable `id` and `projectId`, positive integer `revision`, `type:checklist`, title, description, `publication:personal-draft`, scope and ordered steps. Optional positioning is represented by empty or provided site/area IDs; an area cannot be supplied without its site. Activities reference knowledge/specimens/checkpoints where supplied, but have no required device capabilities and use self-report completion. This v1 adapter rejects XR/GPS conditions rather than pretending they completed.

Limits: 40 activities, 1,000 characters per instruction, 4,000-character description, 160-character title, at most 20 content references per activity, 256 KB per imported JSON. Unknown properties, missing fields, incompatible versions/types/publication states, malformed IDs and duplicate activity IDs fail validation. Import never executes URLs, HTML, code or marker actions. All user text is escaped when rendered. A project reference identifies scope; it proves neither membership nor approval.

## Interfaces

- Desktop: `platform.html?view=checklists`, or Checklists from the content navigation. Create a draft with a project reference, title, description and one activity per line. If entered from a known project/area, that identity can be used without merging records by title. Save locally and export a checklist JSON file.
- Field: `field/index.html?view=checklists`. Import that file and mark observations in any order. Completion count includes a textual saved-on-device status. Reopen after reload or offline to continue.
- The same-origin browser can also see its existing saved checklist library across Desktop and Field entries. Export/import is needed to transfer it to another device. Export includes activity definitions, not personal completion progress.
- No example Hillyards observations, official educational content or project publication is fabricated by this feature. Browser QA uses a synthetic test project and synthetic practice activities.

## Local state and update policy

`checklistStore.js` uses separate versioned library/progress keys. Corrupt data is preserved and reported, never overwritten by fallback. Quota failure leaves earlier data intact; unsaved author text remains in its form. Library entries retain stable project + experience identity. Reimporting identical data is idempotent; conflicting same-revision imports and older revisions cannot overwrite existing data. A new revision replaces the local definition and starts distinct progress; old progress is retained under its original revision.

Completion is keyed by project + experience + revision and stable step IDs. Repeating a checked state does not create duplicate progress. Undoing a check is supported. Unsupported/unknown steps cannot be completed. The library is limited to 100 checklists and progress to 500 revision records; browser quota may be reached sooner.

Field's offline shell includes the contract/store/UI modules. It still excludes APIs and personal data from the worker cache. The local JSON library/progress is read directly from browser storage. This does not implement downloadable published project packs, server contribution submission, background sync or native Unity deserialization.

## Direct WebXR browser entry for Unity

`?experience=webxr-demo` takes precedence over restored creator/visitor views and project loading. `webxrDemoEntry.js` displays a small explicit browser entry and starts the existing `openTemporaryArDemoWindow` path on click. Loading the route does not request XR or microphone permission. It respects current tutorial preferences and device behavior; desktop retains its illustrated introduction fallback.

Unity opens the external browser at `https://nourishland.org/xr/?experience=webxr-demo`. The URL bypasses the platform welcome menu, but entering immersive WebXR still requires the browser gesture and any permissions. No embedded browser runtime, native tutorial recreation or guaranteed automatic return to Unity is introduced. See `docs/unity-platform-handoff.md` for the commands prepared while the Unity chat is unloaded.

## Acceptance

Automated tests cover portable roundtrip, validation boundaries, project/revision identity, idempotent import/progress, conflict/rollback rejection, corrupt/quota preservation, capability constraints, direct-entry precedence and browser-gesture/retry behavior. Existing Field dependency/shell tests ensure checklist modules are included and the tutorial is excluded.

Browser QA: create/export on desktop, import/reopen in Field, complete two synthetic activities out of order, reload and verify progress, stop the synthetic preview server and reopen the direct checklist view offline, and inspect the direct WebXR entry without starting an immersive session. Desktop/phone layout and visible release version are checked separately from Android/Quest hardware. Official publishing requires a later permission-enforced service boundary and deliberate review.

## V0.9597 local evidence

On 14 October 2026 the final focused checks passed 45/45 and the full checkout suite passed 923/923. The frontend build passed, included the checklist modules and direct-entry screen, and emitted version 0.9597. JavaScript syntax and scoped diff checks passed. The original welcome displayed V0.9597 after returning from the introduction.

Browser verification used a synthetic test project. Desktop created and exported a two-activity checklist; Field imported that actual exported file, completed activity 2 before activity 1, and showed 2/2 completed after reload. With the isolated fixture server stopped, the current Field shell reopened the checklist and saved completion. The first offline attempt was still controlled by an older cached Field app; closing/reopening the prior test tab activated the downloaded update. Field startup now explicitly reports an already-waiting update without claiming the older cached shell is current. A regression test covers this status. No forced reload or automatic worker activation discards draft text.

`artifacts/platform-foundation/checklist-offline.jpg` records the 390px browser view after offline reopening. `artifacts/platform-foundation/checklist-example.json` is the synthetic desktop-exported contract fixture for future native adapter verification. This is not an official project experience or physical Android acceptance.

The browser URL `?experience=webxr-demo` showed the direct Start entry with no console errors and no restored welcome/menu. On desktop, its Start action entered the existing illustrated-introduction choice, preserving the desktop fallback. Quest Browser external launch, immersive entry and native return still require hardware tests. No commit/push/deployment or device installation is claimed for this increment. Unity execution remained unloaded at the last attempted dispatch; commands are retained in `docs/unity-platform-handoff.md` for resumption.
