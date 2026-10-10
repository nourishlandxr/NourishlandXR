# Demo repair and performance audit

Local repair batch: **0.9448**, 10 October 2026.

## Changes

| Area | Result |
| --- | --- |
| Control and Image panels | Fixed spatial frame dimensions; fixed desktop Control panel and image dock sizes. Reading scrolls or paginates within the frame. |
| Continue | Disabled while text loads, then a pulsing outer edge. In desktop fruit observation, the action stays beside the box so the box cannot cover it. |
| SPACE 1.3 | Companion image remains visible. Plant cells remain closed. |
| Fruit observation | Shallower matte sage enclosure, inward facing dock, internal common/scientific name plaque and branch supports joining the walls. |
| Fruit pictures | The first Pigeon Pea window retains its classic picture. Other models supply their botanical photo when ready. The preceding image remains during loading. |
| Fruit selection | Four distinct fruit buttons remain on the main Control panel after both partial and full renders. The box's controls remain separate from Plant cells. |
| Fruit interaction | Two pointers pull fruit apart; proximity or holding alone does not open it. Every model supports Play development. Continue fades the box without moving its pose. |
| Controllers | Shared stick response: left/right turns; up/down changes distance. Applies to held panels, Notes/widgets, fruit box, Totems, Hero Dice and Plant cells. Map tilt/roll remain available through its paired grips. |
| Notes and Orbs | Hide preserves state and Show restores it. Hidden Notes have no active spatial hit targets. Minimized Note uses a crisp folded paper icon. Widgets face the viewer. |
| Butterflies | Begin on Control/Image panel perches. Resting bodies stay put with wing motion. Existing butterflies take continuous delayed trips to explored elements and land there. |
| Totems | Steady when idle. Selected Totems use contrasting light phases. |
| Utility map | Fixed undefined marker index that prevented flat and spatial map creation. Idle map beacons remain steady. |
| Learning cells | Expanded families remain open when another family is selected. Reading layout is clearer. Return to demo closes the cells and supplies a closing message. Public wording is Plant cells / Learning cells. |
| ELEMENTS 1.12 | Short complete invitation includes Blue Quandong, Finger Lime and Lemon Myrtle. |

The Learning-cell combination catalogue and testing route are documented in [limo-connection-testing.md](limo-connection-testing.md). Internal identifiers remain stable.

## Frame work reduced

- Fruit meshes update only during growth, fruit movement, opening or foliage interaction. Static bounds are reused; moving arrow bounds update at most 20 times per second.
- Ray misses outside the enclosure skip detailed geometry intersection. Detached fruit remains reachable outside that enclosure.
- Desktop fruit rendering sleeps until its model, camera or viewport changes. Native XR no longer renders an unused second desktop image during model loading.
- Fruit controls update when their state changes; hover values are quantized before DOM writes.
- Learning-cell layout is reused for repeated input/render queries within the same frame.
- Perched desktop butterfly sprites redraw at 10 Hz. Flying insects and controller input retain the active frame cadence; native flock phase sharing is preserved.
- Hidden or blurred XR sessions skip scene work and reset performance measurement windows.
- Automatic graphics can reduce the current session's budget after sustained missed callbacks. Explicit quality choices and saved automatic preferences remain unchanged. Session exit clears the temporary budget.
- Existing high refresh recovery remains available; CPU frame costs are measured in the Creator and demo render paths.

The native stereo fixture showed **one mesh update and one bounds update while the fresh Pigeon Pea model was idle**, then increasing mesh counts during development. This proves idle work is avoided; browser callback cadence is not a headset compositor or GPU benchmark.

Frame budgets are 13.89 ms at 72 Hz, 11.11 ms at 90 Hz and 8.33 ms at 120 Hz. The actual headset must be checked throughout the complete experience, especially during first model loading and dense cell exploration.

## Verification

- Full automated suite: **731 passed, 0 failed**. Syntax checked 28 application modules; scoped diff check passed. Frontend build and welcome version **0.9448** verified.
- Actual browser demo: Notes and Orbs hide/show, classic Pigeon Pea picture, other fruit photo after model load, independent main-panel chooser, accessible Continue, restored flat/spatial map and Learning-cell return path.
- Native stereo fixture: both grips carry without an initial jump; one grip cannot carry; releasing either freezes movement. Common/scientific plaque and both eyes render correctly, with WebGL error 0.
- Play development and ready botanical photo verified for fresh/dry Pigeon Pea, Mamey sapote, African peach, Star fruit and Chinese bayberry.

Review locally at `/tools/preview-demo-refinements.html` and `/tools/preview-fruit-window-xr.html`.

## Remaining device verification

Physical Quest controller rotation, two-pointer ripping, haptics, seated dock comfort, distant text clarity and sustained headset frame timing need a headset session. This batch is local; it has not been pushed or deployed. The separate Blender Living Frame construction files were not edited by this repair pass.
