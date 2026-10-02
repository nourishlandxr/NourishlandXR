# Creator workspace and AR navigation — V0.9286

## Confirmed findings and repairs

- **Inconsistent visual hierarchy:** `projectDashboardV2.js` mixed text glyphs for navigation, tools and object types. `workspaceIcons.js` now supplies one SVG icon family to project selection, both dashboard implementations, Area records and Location tools. Saved custom Area icons are preserved.
- **Heavy AR entry graphics:** `style.css` forced every AR button to an opaque 104px square with white child labels. `creator-workspace.css` replaces that presentation in web authoring pages with a labelled, softer, adequately sized action. The mobile Area summary now gives the icon and statistics their own rows.
- **Botanical identity without a busy reading surface:** reuse `assets/botanical-cell-mosaic.jpg`, which matches the supplied pattern. Header washes and a narrow border accent add colour; records, forms and statistics retain clear reading surfaces. No new XR textures, scene geometry or animation is introduced by these web styles.
- **Wrong failure destination:** V2 called `openCreatorArMode`, whose failure path opened the Area setup picker. Both dashboard entry paths now use `openProjectArMode` and the common launch wrapper. Explicit checkpoint setup remains a separate route.
- **Missing launch feedback and preparation cancellation:** `creatorArNavigation.js` reports failure, restores control availability, deduplicates launches and invokes the launcher immediately from the click. Preparation cancellation restores the original DOM and scroll position. Successful launches record the existing tutorial event. Capability negotiation remains the renderer's responsibility.
- **Lost dashboard tab:** V2 now remembers Overview/Map/Knowledge per project in session storage. Its Areas statistic opens the Areas section; Plants opens Knowledge. A dashboard-origin AR session returns to the dashboard, even if the user changes Area inside AR.
- **Unnecessary Area reset after failure:** the Area launch fallback now reloads only when the current page belongs to a different project/Area, preserving existing filters and editing state on failure.
- **Exit/save races:** Creator previously awaited placements only and ended the session without awaiting completion. It now also finishes an active move, waits for move and appearance saves, deduplicates exits, ignores new controller/hand input while leaving, and awaits session end. Session identity checks prevent the natural-end handler from also navigating during a manual exit.
- **Navigation could leave a running session behind:** Home and Project Selection now finish a Creator or visitor session before changing page. The Creator DOM workspace has an explicit Return to AR action. Existing editor/Totem/Area/field-guide return contexts remain intact.
- **Repeated visitor exit requests:** `arNote.js` now shares a pending end promise, preserves the first requested destination, disables close controls while ending, and makes cleanup idempotent.

## Routes reviewed

Project Selection → dashboard; Overview/Map/Knowledge; Area and Home records; project/Area AR entry; explicit placement and safety preparation; in-session Creator workspace; Creator close/browser Back/natural session end; editor and Totem return contexts; visitor field guide/Map/AR entry and return; hosted marker AR; introduction confirmation/end lifecycle.

The introduction already has a dedicated confirmation/ending lifecycle with identity guards (`demoExitLifecycle.js`), so its narrative and confirmation flow are retained. Hosted and older Explorer records still use the separate read-only `arNote` renderer. They are not converted into Creator sessions.

## Tuning

`app/creator-workspace.css`: `--workspace-ink`, `--workspace-muted`, `--workspace-paper`, `--workspace-sage`, `--workspace-line`, `--workspace-art-strength`. Header strip opacity is `.6`; artwork stays static and outside input targets. Icons use shared 24px geometry in `workspaceIcons.js`.

Creator AR global settings and the object parity changes included in this release are documented in [CREATOR_AR_AUDIT.md](./CREATOR_AR_AUDIT.md).

## Validation and device limits

Local browser review uses a disposable copy of workspace data on port 8002. Project selection, dashboard tabs, Map persistence across reload, preparation cancellation, unsupported immersive launch feedback, Area opening/return, and phone layout are checked. Automated launch tests cover immediate invocation, repeated input, rejection/retry and pre-disabled controls. Release checks: 460 tests passed, frontend build passed, whitespace check passed, and built welcome badge V0.9286 verified.

A desktop browser cannot confirm Quest camera permission, passthrough, controller haptics, framebuffer performance or headset exit/save ordering. Those require a device run. The local preview is not evidence of production deployment; release status is reported separately after the exact commit's workflow completes.

### Quest 3 checklist

1. Confirm V0.9286. Open a project from Create & manage; inspect Overview, Map and an Area.
2. Enter AR from Map; exit and confirm the same project and Map tab return. Enter from an Area and confirm that Area returns.
3. Cancel preparation where shown; deny camera permission once and retry. Confirm the project remains available.
4. Open the in-session workspace; use Return to AR. Select a signage destination and check the corresponding object highlight.
5. Move an Orb, release, then exit immediately. Re-enter and confirm its saved position. Repeat after changing appearance and pressing exit rapidly.
6. Check Settings, glass opacity, Orb variants, readable PIMO cells, pointer contact, hold vibration and FPS/refresh options using the Creator AR checklist.
