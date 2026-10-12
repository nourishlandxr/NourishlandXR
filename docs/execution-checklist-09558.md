# Execution cross-check — V0.9558

The earlier headset report is the checklist used here; no separate checklist was attached to the release request.

## Deployed repair baseline

V0.9557, commit `78acc2a`, passed all 828 local tests and the production workflow [38243220349](https://github.com/nourishlandxr/NourishlandXR/actions/runs/38243220349). The production welcome page displayed `V0.9557 · Live`.

See [the detailed repair matrix](headset-repair-09557.md) for table alignment, basket collision, grip improvements, input transitions, microphone preflight, Zinnia morph fixes, scene budgets and mobile entry changes. Those changes are implemented; headset acceptance remains open.

## Prototype controls now in the experience

- [x] Square spatial panel opened by Brush tools in the tutorial/demo control panel.
- [x] Direct Water, Vine, Earth and Firefly brush choices.
- [x] Eight direct colour swatches with a selected indicator.
- [x] Continuous 1–20 mm width slider, operated by controller ray or fingertip contact.
- [x] Motion toggle, undo, redo, save, load and clear.
- [x] Input mode choices remain available while painting.
- [x] Drawing stays suppressed while operating panel controls.
- [x] Control panel brush shortcuts affect the active brush engine, including after leaving the painting activity.
- [x] Optional fruit-opening tool restored to the fruit lesson.
- [x] Basket tests lift fruit over the rim before placing it on the plate.

## Still missing or requiring evidence

- [ ] Orb/PIMO links: brushes communicate visually, but painted regions do not yet persist a real association with a selected Orb/PIMO or activate its information. The standalone prototype does not establish this integration.
- [ ] Prototype sound and tip-light intensity sliders are not runtime controls yet. The runtime has a visible tip light and motion toggle.
- [ ] Headset acceptance: controller drop timing, index-finger button contact, panel grip, can pickup and rapid basket collisions need a physical Quest session.
- [ ] Performance acceptance: collect XR frame time/dropped frames during the full flow and sustained drawing. Optimizations and passing tests do not prove comfortable frame rate.
- [ ] Voice acceptance: microphone permission/transcription and consistent narration timing need a real headset recording, including silence, denied permission and successful replies.

V0.9558 release gates: complete automated suite, frontend build, diff check, local welcome badge and successful deployment with the live version badge. These gates must pass before reporting the follow-up as deployed.
