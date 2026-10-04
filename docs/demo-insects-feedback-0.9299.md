# V0.9299 — Insects, floor placement and demo feedback

## Changes

- Insects On/Off below Rain; preserved independently of graphics quality.
- Smaller bees with varied flight depth, curious viewer-facing close passes, flower visits and a hard floor clearance.
- Blue butterfly perches for 60 seconds; smaller red variant on the opposite top corner perches for 30 seconds. Independent phases, flower visits, heading follows movement.
- Round learning cells have low growth rooted into the living rim after opening, while central text stays clear.
- Demo Totem tip defaults to the main screen midpoint; floor calibration shifts all associated plants, notes and information surfaces together.
- Demo-only streamed music supplied by the user: Hiroshi Yoshimura, Wet Land. Original file 54,815,902 bytes. Metadata preload; no full-album Web Audio decoding or inclusion in Creator preparation.
- Original synthesized menu taps, placement chimes, crystal cell tones and Totem tones. Audio begins in the demo start gesture and stops on exit.
- Gentle selection, stronger repeating held-object feedback and a soft repeating close-bee buzz. Haptic updates limited to once per 120 ms and run once per XR frame, outside the per-eye render loop.

## Tuning

`demoFeedback.js`: musicVolume, touchVolume, selectionStrength, holdStrength, beeStrength.
`demoInsectFlight.js`: beeSize, beeFloorClearance, butterfly sizes and perch durations.

## Validation

496 existing and focused tests passed; frontend build and whitespace checks passed. Welcome displays V0.9299 locally. Browser native-renderer check showed four bees and both butterfly colours in a shared WebGL context, GL error 0, about 60 callbacks/second and 2.22 ms average CPU in that desktop preview. These measurements do not establish Quest performance.

On Quest check: floor clearance after recalibration, Totem2 plants/notes moving together, blue/red staggered takeoffs, forward approaches to flowers, music startup/exit, light taps, stronger holds and close-bee vibration. Device haptic strength and audio mixing require physical headset review.
