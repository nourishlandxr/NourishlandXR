# Welcome presentation and input repair — 0.9614

## Completed changes

- Basket/fruit reveal runs once. Pickup no longer shrinks/regrows already presented fruit, and normal lesson changes no longer restock the basket. Explicit reset and preview jumps retain their setup behaviour.
- Hidden table, basket, plate and loaded fruit meshes are eligible for preparation before reveal. Basket reveal waits for the matching prepared scene revision.
- Native scene readiness now includes completion of all GPU mesh buffers. Incomplete native scenes cannot draw. The existing shared frame opacity consequently waits for both the prepared Living Frame rim and the prepared reading surface. Living Frame asset preparation starts at demo entry, before the immersive reveal.
- The table's material fade retains depth occlusion, preventing pedestal geometry from showing through the fading top. Components share the same reveal clock.
- Virtual controller-hand rays use the extended index bind pose and the current wrist transform. The visible index still curls when pressing trigger, without bending the interaction ray.
- Side grip owns Zinnia's leaf hold. Squeeze-end clears it immediately; the rendered pointer only honours a leaf lock while grip is down. Trigger remains independent. Pause, global release and tracking loss also clear holds.
- A/B/X/Y chords cannot complete face-button lessons or operate the Orb's teaching response. A fresh valid release/press is required after an invalid chord.
- Welcome headings use the prominent Bauhaus Chez/Fraunces heading stack, with increased size and matching wrapping weight. Paragraphs have increased line spacing and a distinct paragraph gap. Activity screens display their heading during its allotted interval.
- The initial voice preload targets the welcome title. Demo startup prepares the first three authored spoken lessons instead of preloading a stale arrival-only clip. Preparing voice initializes its context when needed. Browser audio still requires permitted playback/user activation.

## Verification

- 967/967 full regression tests passed.
- Frontend build passed as 0.9614; generated build metadata agrees.
- git diff --check passed.
- Added tests cover stable aiming while fingers curl, complete GPU readiness before drawing, table depth occlusion, invalid face-button chords, basket continuity and grip release while trigger stays held.
- No browser screenshot, displayed welcome-badge check or Quest walkthrough was completed in this pass. The earlier browser security block remains a visual-verification limitation. On-device appearance, speech startup and interaction feel remain acceptance checks.
- Local changes only: not committed, pushed or deployed by this repair. The unrelated platform-foundation example artifact was preserved.
