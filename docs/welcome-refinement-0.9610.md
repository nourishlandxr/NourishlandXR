# Welcome interaction refinement — 0.9610

## Implemented

- Wrist and brush controls use the shared proposed vector artwork at runtime, with the existing canvas fallback for environments without Path2D. Recent related chats were inspected; a separate authoritative template chat was not identified. The artwork source is `app/services/welcomeIconCandidate.js`.
- Controller balloons follow the current right/left lesson target, fit the words, remain at controller height and sit 15 cm farther from the viewer with a 10 cm outward offset. The former elevated shared balloon is no longer displayed.
- Brush/RC thumbstick and action-button deck positions are mirrored to the correct right-hand arrangement; grip and trigger geometry remain independent of that deck change.
- The demo perch branch roots now penetrate the rim's interior rather than meeting its outermost silhouette. The demo renderer uses the existing bounded 30 Hz facial-morph upload policy used in the tutorial.
- The Living Frame explanation happens before hand instruction. Zinnia turns toward it and points while explaining it.
- Leaf holding stays unlocked after introduction, owns its input, supports controllers, virtual hands and tracked hands, and remains available during optional activities when Zinnia has been introduced.
- Apple bite variants are prepared with the original apple so later bites only change visibility instead of requiring an absent replacement mesh. All three existing bitten/eaten stages remain available.
- Neighbour collisions preserve tangential motion rather than stopping every axis. Basket contact uses the horizontal support radius and evaluates fruit height at the actual wall crossing rather than treating the entire motion as being below the rim.
- Tic-tac-toe is 54 cm square, with two dividers in each direction and nine matching hit regions.
- Optional Games includes a grabbable 60 cm wide × 40 cm high Peek frame. It reuses the authored depth-relief picture, adds a rectangular aperture and permits viewing after crossing the opening. Its GPU resources load only when requested. Controllers, virtual hands and hand tracking use the existing trial-grab path.

## Validation and limits

- Regression tests cover nine selectable board cells, Peek dimensions and grabbing in all modes, fruit sliding/lifting, controller hint selection and persistent leaf input ownership.
- Full test/build results are recorded in `.tmp/xr-refinement-tests-elevated.log` and `.tmp/xr-refinement-build.log`.
- Browser security policy blocked access to the preview error tab during this run. The generated build contains version 0.9610; the displayed badge and rendered visual changes have not been verified in this run.
- No Quest frame-time measurements were collected. The demo morph-upload reduction is an application-side optimization, not proof that the reported close-up frame drop is eliminated.
- The branch junction, right-hand ergonomics, apple swaps, Peek head crossing and basket/plate contact require rendered/headset acceptance checks.
- Changes are local until separately committed, pushed and successfully deployed. Unrelated platform-foundation artifact edits are outside this repair.
