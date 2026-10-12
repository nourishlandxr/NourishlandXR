# Headset usability repair — V0.9557

## Evidence and release status

Release candidate. All 828 automated tests pass with local API loopback access. Frontend build, JavaScript syntax checks and git diff checks pass; welcome badge shows V0.9557. Deployment verification is pending. Physical Quest verification remains required.

The desktop comfort preview exposed repeated Three.js errors from Zinnia's new mouth morph targets. Their position and normal channels now have matching lengths. The repaired fruit scene rendered in the preview.

## Repairs

| Finding | Change |
| --- | --- |
| Table does not line up with Living Frame | Place the table on the actual frame's horizontal centre line before its reveal. |
| Cramped, unordered play space; pieces fall off | Widen table from 1.56 to 1.90 metres. Add a 25 mm timber rim and low-object edge constraints. |
| Plate is painfully white | Muted green ceramic with matte finish. |
| Basket walls can be crossed | Sweep held and released fruit movement against the basket wall. Lift above the rim to remove fruit. |
| Fruit is hard to pick up | Controller grasp uses proximity to the fruit volume; hand grasp includes a small contact tolerance. Whole and cut fruit can be placed on the plate. |
| Controller body is too white; labels invade view | Muted green body, smaller labels positioned below and outside the grip. |
| Controller introductions have lasers | Suppress them during introduction. X/Y can explicitly request a ray. |
| Panel stops working when rays disappear | Panel ray access is independent of painting; pointing at controls restores a short ray. Retain panel grip and native hand poke interaction. |
| Controllers disappear too early | Retain controller input and virtual hand poses while waiting for stable tracked hands. Decay tracking stability rather than resetting it on one missed frame. Controller mode remains available. |
| Old access panel; missing brush tools | Square spatial control panel, Brush tools entry, explicit input modes and Reset objects. Painting tools use a square two-column panel with colour, width, effects, undo, redo, save, load and clear. |
| Floating audio buttons | Dock audio controls below the control panel and follow it when moved. Remove the microphone action from this spatial bar. |
| Press microphone / press Done interrupts conversation | Optional microphone permission step before headset entry. Auto-listen after Zinnia's question; sentence-end detection finishes recordings. |
| Silence blocks introduction | Fresh spoken microphone fallback after 20 seconds without a usable answer, then proceed. Recorded and live narration already share the Coral model and voice profile. |
| Paint feels delayed and erratic | Replace individual cylinder meshes and renderer rebuilds with the existing batched smooth stroke engine. Fit the brush grip to controller grip space with a small tip light. |
| Painting updates cause jerkiness | Stop emitting a full main-interface update every XR frame during activities. Refresh on meaningful state changes. |
| Too many props and lingering marks | Restrict brush, remote, flight companion and fruit to their activity. Clear introductory brush marks when leaving that lesson; hide optional activity tools until opened. |
| Watering can is difficult to grab | Move the grip point to the centre of the authored handle and allow controller operation through gardening lessons. |
| Strawberry separates from stem while growing | Derive attached berry position from the actual plant transform, including pot reveal scale and rotation. Match stem endpoint to berry calyx. |
| Frame rate drops | Remove paint-driven renderer rebuilds and repeated UI rebuilds, skip hidden mesh morph updates, and quantize berry material changes. These are optimizations, not measured Quest frame-rate results. |
| Weak feedback when learning | Add short haptic feedback for controller lesson presses and paint stroke starts; retain grab, placement, pouring, harvest, ring and landing feedback. |
| Phones expose controller tutorial | Disable and hide the tutorial preference for phones; phone demo entry bypasses the headset tutorial. |
| Developer option on intro | Remove the welcome-page Developer Lab shortcut. Direct authenticated lab route remains available. |

## Required headset review

- Run controllers → virtual hands → tracked hands, including slowly putting controllers down and briefly losing tracking.
- Check index-finger contact with all main and painting buttons; check panel grip and rays while a paint tool is held.
- Pick up every fruit and cut piece, place on plate, and move fruit rapidly against basket walls from inside and outside.
- Check watering can grip, pour direction and strawberry attachment throughout growth and while moving the pot.
- Try microphone permitted, denied, silent and successful name/fruit replies. Listen for narration overlaps, voice changes and natural timing.
- Measure actual XR frame time and dropped frames through a complete session and sustained painting. Record headset/browser version, refresh rate, graphics setting and drawing length. Do not declare the frame-rate defect resolved without this evidence.
- Review the paint instrument and spatial panel in the hand. The runtime tools are integrated, but the final industrial design and slider ergonomics still need refinement.

Brush tool reference: [Tilt Brush's official tools documentation](https://support.google.com/tiltbrush/answer/6389713?hl=en) describes controller-based selection, trigger actions and undo/erase access. Nourishland's tools remain focused on communicating relationships between planted areas and Orbs.
