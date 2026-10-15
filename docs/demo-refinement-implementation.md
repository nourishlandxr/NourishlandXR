# Demo refinement implementation

Source: `demo-refinement-brief.md`. Zinnia is the character name throughout. This is the independent WebXR welcome/demo flow; Unity and field work are outside this change.

Installed SDK: `@iwsdk/core` and `@iwsdk/xr-input` 1.0.1, with the existing native scene adapters for SDK input, grabbing, hand poses, audio and Havok physics.

## Dependencies and acceptance

### Agreed experience order (latest instruction)

1. **Controllers:** orb manipulation, then dancing with Zinnia.
2. **Virtual hands:** fruit, brush, and special controller interaction.
3. **Hand tracking:** butterfly bucket, then tic-tac-toe.

The bucket supports pinching/grabbing individual butterflies and releasing them to fly briefly, then perch along the live outline of a real tracked hand. Perches follow the current hand pose and recover from tracking loss. A visitor can also lift the bucket to release its flock.

Completing one tic-tac-toe round (win, loss, or draw) unlocks all three experiences. Compact experience switches remain available and are suggested for the rest of the demo. A round in progress does not unlock them.

- [x] Opening: prepare frame and content texture together; reveal a complete surface before starting spoken text.
- [x] Placement: glowing outline, persistent pose-relative grab, full translation and rotation, intentional release.
- [x] Conversation: direct clear names, contextual clarification, bounded retries, no overlapping speech/listening.
- [x] Orb: begins on the tabletop, precise edge/pot collisions, directional controls and feedback.
- [x] Controller teaching: one A/B/X/Y activity, readable circular labels above the hands, immediate progress.
- [x] Settings: hide the completed orb; highlight icons and keep the lesson short.
- [x] Tools: brush and RC bug appear together; picking up the brush starts painting and removes the bug.
- [x] Virtual hands: short glow and whole-hand reveal, with working controller input retained.
- [x] Fruit: wooden board at right, central plate, geometry-derived grab bounds, stable cut pieces, banana peel/eating, apple bites and retained plate placement.
- [x] Leaves: forgiving visible target, persistent grip, moving endpoint, bounded responsive pose for eight seconds.
- [x] Hand tracking/game: controller-to-hand transition, grabbable pieces, board-relative snap/rotation, turn/win/draw rules and tracking-loss recovery.
- [x] Butterfly bucket: pinch/grab, intentional release, brief flight, live hand-outline landing and tracking-loss recovery.
- [x] One completed tic-tac-toe round unlocks all three switchable experiences for the remaining demo.
- [x] Replay/closing: voice yes/no replay, closing summary after all three input methods, clear final navigation.
- [x] Updated saved Zinnia audio matches the final flow.
- [x] Focused interaction tests, complete suite, frontend build, rendered/browser verification and live version.
- [ ] Physical Quest acceptance: check real hand perches, pinch alignment, table comfort, haptics and sustained frame rate on device.

## Starting point

The previous flow had separate face-button stages, a floating-until-unlocked orb, menu-selected brush, woven basket, a progressive wrist-up hand reveal and optional ray-selected tic-tac-toe. Existing components will be repaired and reused. The unrelated `artifacts/platform-foundation/shared-project-example.json` edit is preserved.

## Verification — 0.9625

Full project suite: 1,026 passing tests. Frontend build succeeded.

- Native-renderer Chrome review: butterfly bucket, board and pieces, fruit board/plate, brush station, and both circular controller hints. No page errors in the completed rendered checks.
- Guided game integration: a round in progress stays locked; a finished round unlocks the three experience switches; switching retains lesson progress.
- All 73 authored lesson/response texts match the saved narration catalog. Chrome decoded all 93 primary bank clips successfully, including the 13.104-second welcome and 17.808-second butterfly introduction.
- The built welcome page visibly reports `V0.9625 · Live`. Production verification is recorded in the release report after deployment.
- The optional review page is `tools/preview-demo-experiences.html`; its inputs are synthetic and do not certify a headset.
- The unrelated platform-foundation example remains excluded from this release.
