# Zinnia presentation and table V2 — 0.9611

## Changes

- Favourite fruit is centred in a dedicated presentation socket, independent of either animated leaf. Both leaves cup below it; an 8.5 cm fruit clears most of both leaves. The cloned fruit is centred before scaling/revealing, including assets with an off-centre origin.
- Zinnia greets with a short right-leaf wave and says goodbye with both leaves. Gestures run once per cue, stop advancing while paused and settle back afterwards. Tutorial exit now continues animating her farewell rather than freezing her pose.
- The tutorial Orb starts 30 cm to the left, with a forest-green shell and purple core. Reset restores both appearance and position. Learned grab, opening, rolling and gravity remain available.
- Gaze follows the current explanation's subject even while narration plays: Living Frame, Orb, presented/held fruit, basket, tools and gardening objects. Otherwise Zinnia follows the relevant hand during controller practice and looks at the viewer during explanations.
- Table V2 has a bevelled rounded timber top with explicit UVs, finer grain across subtly varied planks, one continuous forest-green retaining rim and a brass-toned rounded handle. It preserves the support plane, overall footprint and height controls. Surface detail remains one 1024 × 512 texture, without new material-map passes or dependencies; geometry stays below 6,000 triangles.

## Verification

- 45 focused regression tests pass, including geometric leaf/fruit clearance, wave pause/settling, narrated Orb focus, the new Orb spawn/reset, existing Orb interactions and tabletop/pedestal bounds.
- Frontend build produces version 0.9611. Displayed welcome badge and visual appearance remain unverified because browser preview access was blocked during the preceding session; no Quest walkthrough or frame-time measurement is claimed.
- Final full suite: 956/957 pass. The remaining settings assertion expects the previous list without the concurrently added `OrbModel` control (`tests/pim-info-settings.test.mjs:65`); it is outside this batch.
- Full-suite results are in `.tmp/zinnia-table-full.log`; final build results are in `.tmp/zinnia-table-build.log`.
- Concurrent edits to Orb V3 and the settings panel are present in the shared checkout and are outside this batch. They are preserved.
- Changes are local, alongside the previous 0.9610 refinement; no commit, push or deployment was performed for this batch.
