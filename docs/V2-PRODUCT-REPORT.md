# Nourishland XR V2 implementation report

Finalized locally on 9 September 2026 (Sydney), version **0.9020**.

This is a working V2 implementation pass, not a claim of field-validated outdoor AR. The frontend and API build successfully. Production was not deployed during this finalization. The earlier bulk V2 work is in `c12b0f9` (`astra2`); final robustness fixes, tests and this report remain in the working tree.

## 1. Current product assessment

The visitor journey exposed internal project and marker concepts, separated plant discovery from learning, and offered little continuity when returning from a profile. Welcome actions competed for attention. Creator screens, PIM and AR used different visual and navigation conventions. The visitor AR implementation was largely a fixed menu rather than a plant-selection experience. Loading errors could blank a creator dashboard, including a legitimate empty area whose marker directory had never been created.

The underlying hierarchy, persistence, publication and PIM systems were useful foundations. They did not need a framework replacement.

## 2. V2 product vision

Enter a place, meet its plants, follow their knowledge, and explore spatially when the device supports it. Keep the visual language calm, botanical and readable. Make creation a deliberate separate mode, with evidence and review visible where decisions are made.

## 3. Information architecture

Visitor: welcome → published places → place overview → Plants / Map → plant profile → plant knowledge. AR is an optional entry from the place, with a field-guide fallback.

Creator: Your places → Overview / Map / Knowledge / Publish → existing plant editor and PIM workspace. Publish opens existing publication controls; it does not publish automatically.

These are presentation concepts over the existing project/site/place/marker hierarchy, not renamed stored entities.

## 4. Navigation model

A shared Nourishland header provides home and experience settings. Place navigation remains Explore / Plants / Map. Visitor routes have URL and browser-history support. Plant search and filters survive the return from a profile and from settings. Stale asynchronous visitor and creator loads are prevented from overwriting a later screen. Legacy Back controls are no longer moved to the end of entire screens.

Creator deep-link restoration remains incomplete: a full refresh of a PIM editor URL can return to welcome. Persistence is unaffected.

## 5. Visitor experience

Welcome prioritizes Explore a place, then Create & manage, with a remembered-place shortcut. The visitor directory uses published records only. A place opens with an introduction and plant preview. Discovery uses readable cards, progressively reveals results, and leads to a unified profile. Empty, loading, unavailable and unsupported-AR states provide a way forward. Camera/location permissions are not requested on arrival.

The map presents a shared map image when one exists and an area directory. It does not imply a measured map or live location when those are unavailable.

## 6. Creator experience

The existing editing capabilities remain accessible through a unified header, terminology, styling and project navigation. Saved-plant search is explicitly separate from external-source search. Creator dashboard loading is visible, failed tabs can be retried, and partially unavailable areas produce a warning instead of losing the entire dashboard.

A saved empty area now reads as an empty marker list without creating files. A nonexistent area still returns an error. This is a small API compatibility fix, not a migration.

Some legacy editor composition remains, including prominent AR appearance controls in the plant profile. The creator AR toolset was preserved rather than comprehensively redesigned in this pass.

## 7. PIM model and presentation

The six-category structure, stable node IDs, hierarchy, custom branches, source archive, provenance, evidence and publication state remain intact. Outline and honeycomb Diagram continue to address the same knowledge. Diagram selection reveals branch position and a readable selected-topic panel. Search is explicitly within the current plant, with multiple contextual results and hierarchy navigation inherited from the preceding PIM work.

Visitor profiles embed Plant knowledge without a second competing plant identity header and exclude drafts. Creator PIM explains the source → review → draft → publish lifecycle. Add a local observation opens the existing structured editor with local-observation type, specimen scope, and the full project/site/place/marker reference prefilled. New content remains a draft needing review.

Species knowledge and specimen knowledge remain distinguishable. Existing unreviewed content is labelled as unreviewed rather than silently reclassified.

## 8. External database → PIM

External search → source record → import/setup → review suggestions → curated structured topics → publication → visitor PIM. This uses the existing import and review architecture.

| Material | Treatment |
| --- | --- |
| Provider payload and original descriptions | Retain as source material with provenance; do not publish every field as a topic. |
| Identification metadata | Use existing structured profile fields through the import workflow; keep source attribution. |
| Potential cultivation, uses or scientific knowledge | Review and place within the appropriate PIM category, retaining evidence and source references. |
| Unverified or conflicting claims | Keep review/evidence state visible; do not treat import as verification. |
| Actual observations of a plant at a site | Create specimen-scoped observations, with date/evidence when available. An imported species description is not a local observation. |
| Curated Nourishland knowledge | Human-reviewed topics with their own publication state, connected to source evidence. |

There is no new automatic bulk synchronization or global deduplicated species library. Live provider availability still depends on the provider and configuration.

## 9. AR experience

Visitor AR now has a capability-aware entry, session-relative plant orbs, selection, a reading sheet, return to exploration, and exits to the guide/map. Controller-ray selection uses the shared WebXR session foundation. Session resources and UI are cleaned up on exit. Tracking wording explicitly states that site positions are not aligned.

This is a spatial reading preview using a small sample of plants, not verified physical placement of all plants. Real-world registration, proximity discovery and field stability remain future work. Existing creator spatial coordinates are not changed.

## 10. AR taskbar

On supported DOM-overlay devices, the visitor overlay exposes Next plant, Field guide, Map and Exit, with a contextual reading sheet. The previous large panel is suppressed for this visitor mode. Controller-selectable session targets provide plant selection and close/exit functions. Creator AR retains its existing controls and engine; headset ergonomics require hardware QA.

## 11. Plant profile

A single visitor identity leads into knowledge. Common and scientific names use existing raw profile data even when a legacy profile-path field is absent. Specimen context stays separate from general species knowledge. Legacy notes with unknown scope are explicitly unreviewed. The same PIM component powers the visitor reader and creator workspace, with editing disabled for visitors.

## 12. Search

Place search supports multiple words, diacritic normalization, names, uses and location context, with area and forest-layer filters when the records provide those values. Exact common-name matches rank first. Compound site/place/instance identity keeps repeated specimens separate. The visitor list initially renders 36 results and supports showing more.

Creator Saved plants and External sources are separate scopes. PIM search is separately labelled Search this plant's knowledge. A global all-place catalogue search was not added.

## 13. Visual system

Warm ivory surfaces, sage and pastel accents, serif visitor headings, restrained botanical SVG artwork, clear spacing, rounded controls and shared navigation replace competing treatments. The artwork is code-native and adds no image-generation dependency. Focus styling, touch-sized primary controls, responsive layouts and reduced-motion rules are included. The existing stylesheet remains underneath a scoped V2 layer; CSS consolidation is still desirable.

## 14. Architecture deliberately preserved

No new framework or data migration. Existing persistence API, JSON records, authentication boundaries, backups, hierarchy, stable IDs, publication and PIM normalization remain authoritative. Existing spatial conventions, creator AR and Quest session support remain in place. New presentation helpers, a visitor renderer and pure spatial-selection helpers isolate the new behavior. The shared PIM is reused instead of maintaining a second knowledge renderer.

The API change only distinguishes a valid empty area from a missing area. A future deployment must include the updated API as well as the frontend; frontend-only deployment will not include that fix.

## 15. Files changed across V2

Compared with the preceding PIM release `eb6afaa`, including finalization:

- `app/components/plantInformationWeb.js`
- `app/index.html`
- `app/main.js`
- `app/product-v2.css`
- `app/screens/fieldGuide.js`
- `app/screens/launch.js`
- `app/screens/projectDashboard.js`
- `app/screens/projectDashboardV2.js`
- `app/screens/visitorExperience.js`
- `app/services/arNote.js`
- `app/services/arPanel.js`
- `app/services/buildInfo.js`
- `app/services/productExperience.js`
- `app/services/projectDashboardV2Model.js`
- `app/services/visitorSpatialState.js`
- `tests/pim-persistence.test.mjs`
- `tests/product-v2.test.mjs`
- `tests/visitor-flow.test.mjs`
- `tools/build-hosted.mjs`
- `tools/persistence-server.mjs`
- `docs/V2-PRODUCT-REPORT.md`

The public homepage hero experiment is outside this XR V2 change set.

## 16. Verification

- **219 automated tests passed, zero failures**, including existing PIM/persistence/publication and WebXR/Quest contracts.
- New tests cover specimen identity and search, safe presentation values, AR readiness, session positions and ray selection, embedded PIM/local-observation contracts, dashboard partial-load behavior, and empty-area read behavior without filesystem mutation.
- JavaScript syntax and UTF-8 checks passed; `git diff --check` passed.
- Full frontend and API build succeeded at **0.9020**. Workspace data is excluded from the build. Welcome displayed **V0.9020 · Local preview**.
- Browser QA used an isolated copy of the real Hillyards orchard: **281 plants and 19 areas**. Only the QA copy was made public and its mismatched site ID normalized for testing. Original stored data and hosted records were not edited.
- Inspected welcome, place discovery, catalogue, profile/PIM, creator overview/editor, source-search scope, settings return and unsupported AR behavior.
- Jackfruit search produced eight distinct specimens. Returning from settings preserved the query and all eight results.
- Inspected desktop width 1440, mobile 390 and narrow mobile 320. The 320px visitor page had 305px content width and no horizontal document overflow. Mobile honeycomb controls and selected-topic context remained available.
- Saved a clearly labelled QA-only local observation through the creator UI. Persisted JSON retained specimen scope, full specimen reference, draft status and needs-review evidence state. Refresh did not restore the creator editor route; that limitation is recorded above.
- Prior PIM verification covered populated/deep trees, custom branches, contextual multiple matches and import/review behavior. This final V2 browser pass used the sparse real Jackfruit record and its QA extensions; it did not repeat every populated-tree scenario.

Physical touch, a screen reader, actual reduced-motion OS emulation, real headset/phone AR and outdoor registration were not fully exercised. Automated contracts and CSS inspection are not substitutes for those checks.

## 17. Remaining risks

AR remains a session-relative preview, not a field-validated navigation system. Creator editor deep links do not yet fully restore after refresh. Some creator forms retain legacy density. Large places still require many initial profile reads despite limited rendered visitor results. Legacy incomplete metadata can leave filters sparse. Global species reuse and conflict resolution remain model/workflow extensions. The visual layer relies on CSS overrides that should be consolidated after acceptance.

## 18. Next iterations

1. Test on a real phone and Quest at a food forest, then integrate verified site registration and proximity behavior with existing coordinate conventions.
2. Complete creator editor route restoration and simplify AR appearance settings within plant editing.
3. Add a compatible batched public-guide read path to reduce initial request volume.
4. Improve map position presentation using verified saved placement data.
5. Exercise populated/deep PIM cases again in the unified V2 visitor flow, plus physical touch, screen-reader and reduced-motion QA.
6. Consolidate styling and then design species-library reuse and source conflict review without merging specimen observations.

The result is materially more coherent for visitor discovery and reading, and more explicit about knowledge review. The full spatial-product ambition remains partly implemented and needs the hardware and registration work above before it can be considered production-validated V2.
