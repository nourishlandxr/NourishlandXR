# Spatial presentation acceptance record

## Baseline captured before this update

| Surface | Observed baseline | Capture status |
| --- | --- | --- |
| Desktop simulated AR, 1280 × 720 | With Pigeon Pea selected, the Control panel ended around x=572 while the green welcome surface began around x=468: roughly 104 px of overlap. The plant photo was confined to a narrow media wing, and the Control-panel copy read small at this scale. | Before screenshot captured in the task UI. |
| Mobile simulated AR, 390 × 844 viewport override | The panel and media wing compressed into a narrow strip at the left of the captured viewport; the rest of the capture was blank. This is retained as a baseline observation to compare, not presumed to be a physical-device result. | Before screenshot captured in the task UI. |
| Simulated AR interaction | Browser simulation reached the Pigeon Pea profile and exposed the Control-panel tabs, media and Continue action. It reproduced the desktop overlap above; browser simulation cannot validate WebXR session input. | Desktop baseline screenshot and accessibility state captured. |
| Physical spatial device / headset | No headset is connected to this work session, so runtime, hand input, controller feel, spatial panel persistence and physical ORB placement have not been observed. | Not available; use the checklist below. |

## Change-to-mode acceptance map

| Change | Demo | Creator Mode | Automated evidence |
| --- | --- | --- | --- |
| Plant Orb → real plant information; Areas → welcoming Totems; exact closing mission | Scripted intro, four-step guided tutorial and closing message. | Shared Spatial-device preparation and spatial vocabulary; no duplicate scripted demo. | `content-presentation`, onboarding, AR-interface tests. |
| Preparation wording, intro fade, Continue styling, Pigeon Pea copy fit | Guided welcome and placement board. | Shared pre-AR preparation component. | `content-presentation`, onboarding and welcome-showcase tests. |
| Differently coloured larger-Area examples and quieter signs | My Food Forest and Rainforest Walk Totems; narrated Botanical Collection and Community Garden uses. | Existing Creator Totem rendering/sign attachment styles remain shared and quieter. | `content-presentation`, living-object and AR-interface tests. |
| Plant profile images, responsive enlargement and Moringa photo | PIM identity media and Moringa example use the optimized source image. | Shared PIM projection and Control panel render profile identity images. | `content-presentation`, PIM model, PIM panel and shared-renderer tests. |
| ORB appearance | Shared crowned ORB renderer plus simulated CSS counterpart. | Same shared WebGL ORB renderer. | `content-presentation`, living-object and AR-interface tests. |
| Pathway archetypes visible together | Four stable roots are visible before pathway choice; branches remain selectable. | N/A — pathway showcase belongs to the guided welcome. | `ar-welcome-showcase` tests. |
| Architecture regressions carried into release acceptance | Live Plant transition, PIM/LIM, notes, joystick, hand fallback, panel movement and Totem grounding remain in the shared regression inventory. | Same shared paths and paired Demo/Creator checks where applicable. | `ar-interface`, `living-objects`, `spatial-interaction`, PIM and welcome-showcase tests. |

## Post-change visual checks

| Surface | Result |
| --- | --- |
| Desktop simulated AR, 1280 × 720 | Captured the Plant Orb intro, four-pathway choice and guided Pigeon Pea/PIM states in the task UI. “Why begin with Pigeon Pea?” now stays on one line with body copy below it. The Control panel measured 560 × 259 px; PIM body text computed to 21 px with 33 px line-height, and the image measured 200 × 146 px. The panel still crosses the decorative welcome-outline by about 104 px horizontally (panel x=12–572; outline begins x≈468), but the instructional copy is below the panel and remains readable. This is a residual visual overlap, not a fully cleared one. |
| Mobile simulated AR, 390 × 844 | Captured the PIM with the media view open and collapsed. The panel stays within the viewport (x≈8–373); the photo view stays inside its media wing, and the text view remains readable when media is collapsed. The welcome card sits below the panel. Viewport override reset after capture. |
| Physical spatial device / headset | Not verifiable from this host; see checklist. |

## Physical-device checklist

- On the target Spatial device, confirm preparation says “Spatial device” and no user-facing copy requires the Quest product name.
- Enter the demo and Creator Mode; confirm neither opens a blocking white surface when a Live Plant tag is encountered.
- Place, grab, reposition and open a Plant Orb; use hand pinch/direct cell press and controller-ray fallback.
- Move the selected orb forward/back with the right joystick; confirm lateral placement remains normal and releasing the stick stops movement.
- Grab and reposition the Control panel; change selection, turn your head, and verify the panel remains where placed and text/media stay readable.
- Compare the four welcome archetypes together, then open PIM/LIM cells and switch among all Note templates.
- Confirm Totem bases remain on the floor and attached signs do not follow head turns.
- Confirm Moringa and other profile photos load at a readable scale without covering text or overflowing the panel; verify rendering remains usable if an image fails to load.
- Confirm the new ORB silhouette, crown and selection state are clear at normal viewing distance and at reduced-motion settings.
