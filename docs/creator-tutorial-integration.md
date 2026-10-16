# Creator tutorial integration

User-authorized implementation, 16 October 2026. Local testing is the first release gate; deployment and physical-device verification require separate evidence.

## One journey, one project

Create or reopen a draft project, describe its purpose, confirm one geographic origin, load the available map information, create the first Area and record, then reopen the same project in another layout. Desktop Studio, Android Field and spatial access retain the same project/Site/Area/record identities. Flat map and IMAP are projections of the same saved source data. Neither owns duplicate content.

The single GPS point is a geographic map origin. It does not replace printed ArUco references, establish physical XR placement, locate every record, or certify a boundary. Device geolocation is requested only after the user selects that option; manual coordinates remain available. A project may contain many Areas without requiring a GPS point for each one.

## Department ownership

| Owner | Implementation boundary | Handoff |
| --- | --- | --- |
| Dee Dee | Creator tutorial UI, creation entry, resume/routing, desktop and Field hooks | Exact launch route, persistence fields, working local journey |
| Richie | Shared origin/map package, flat and IMAP adapters, existing terrain API integration | Exact exports, schema, source/coverage status, preservation checks |
| Tommy | Native Unity tutorial and matching project/map context | Native workflow and explicit source/build/device evidence |
| Joey | Website create-project entry and responsive explanation | Preview using verified routes; no fabricated launch destination |
| C.J | Shared beginner lessons and acceptance specification/tests | Copy and tests aligned with actual implementation |
| Johnny | Dependency coordination, schema/route agreement and integrated acceptance | Evidence matrix and remaining release gates |

Departments preserve concurrent edits. Existing models remain unchanged; changing a model requires user approval. The shared build version is inspected immediately before the required increment to avoid overwriting another department's bump.

## Data and routing gates

The existing project `siteMap` contains image and Area presentation overrides. Johnny implemented the shared geographic adapter in `app/services/creatorProjectGeography.js` to unblock consumers. `project.siteMap.geographicOrigin` contains `latitude`, `longitude`, `source` (`manual` or `device`), nullable `accuracyMetres`, and `capturedAt`. `project.siteMap.mapData` contains `schemaVersion: 1`, `status` (`sourced` or `unavailable`), `originKey`, `bounds`, bounded contour `features`, `source`, `retrievedAt`, `quality`, `limited` and `message`. Richie owns renderer/server integration; this adapter does not itself prove backend validation or cross-device synchronization.

Use `withProjectGeographicOrigin` to preserve other project data and invalidate geography when the origin changes. `loadProjectMapInformation` uses the existing contour API and returns explicit coverage/failure states. `withProjectMapInformation` rejects late responses for an obsolete origin. Both layouts consume `projectGeographicMapContext`; they must not maintain competing map packages. Contours are simplified and capped to 3,200 points for a bounded persisted payload; `limited` identifies simplification or upstream truncation. Geographic source provenance remains separate from creator-authored records.

Existing workspace routes require `workspace=desktop|field|spatial&project=ID`. Dee Dee owns the project-optional onboarding entry and confirms its implemented URL before website links are marked functional. Saving progress must preserve the project ID and permit re-entry after interruption. Authentication remains the existing Creator boundary; saved drafts do not become public by completing a lesson.

## Map behavior

The current contour endpoint is `/api/terrain/contours` locally and `/xr-api/terrain/contours` when hosted. Its existing implementation validates NSW coverage and bounds, caches responses and limits requests. The current contour interpolation is illustrative terrain, not a DEM or survey. Do not claim global coverage or infer buildings, paths or plants that the source does not contain.

Map loading exposes loading, sourced, unavailable/out-of-coverage and retry states. Unsupported coordinates and upstream failures must not prevent project authoring. Retain attribution, bounds, retrieval time and quality information. Refreshing sourced geography must retain creator records and valid manual presentation overrides. Flat and IMAP views consume the same package rather than fetching separate versions.

## Testing gate

1. Start from the public Creator entry on desktop and narrow mobile viewport; reach an authenticated new-project tutorial.
2. Create a uniquely named draft and confirm its project identity remains stable through all steps.
3. Reject blank, partial, non-finite and out-of-range coordinates. Accept valid zero-valued coordinates. Device permission denial retains manual entry and existing inputs.
4. Confirm origin once, save it, refresh and reopen. A later origin change invalidates stale sourced map data without deleting authoring content.
5. Exercise a successful map response and a failed/out-of-coverage response. Both permit a clear next action; retry does not duplicate the project.
6. Add an Area and one record; reload from persistence and confirm the exact same identities appear in flat and IMAP views.
7. Change a record and refresh both layouts; retain valid manual overrides and ignore deleted identities.
8. Interrupt and resume the lesson. Back, close and platform handoff preserve saved progress; saving does not publish drafts.
9. Verify keyboard access, compact common-action icons with accessible names, readable error/status messages and no narrow-screen horizontal overflow.
10. Run focused tests, production build and the welcome-version check. Report desktop/browser, Android device and Unity/Quest evidence separately.

## Initial audit

At coordination start, existing terrain generation was a preview rather than a Creator save/load workflow. The flat planning-map experiment was not mounted in the current dashboard. These are integration tasks, not completed capabilities. Native publication/authentication and website launch destinations must be verified independently.
