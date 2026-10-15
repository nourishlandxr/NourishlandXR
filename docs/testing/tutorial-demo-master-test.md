# Tutorial and demo master test — V0.9631

Candidate: https://nourishland.org/xr/ (also www). Confirm V0.9631 on the welcome screen before testing. Use a fresh tab for the guided first-run check.

## Expected sequence

1. Welcome to NourishlandXR begins with Zinnia’s saved voice. The Living Frame and guide appear before their narration proceeds. No first-frame watchdog or Comfort options render error.
2. Controllers: Orb manipulation, controller practice and dancing with Zinnia.
3. Virtual hands: fruit starts in the basket; pick it up, inspect it, cut supported fruit and place it on the plate. Try the brush and special controller interactions.
4. Hand tracking: grab a butterfly from the bucket, release it, watch its brief flight, then watch it land on the outline of a real hand and follow that hand.
5. Play one complete tic-tac-toe round. Only completing the round unlocks free choice of Controllers, Virtual hands and Hand tracking. Switching these changes input; it does not launch an activity.
6. Zinnia explains that activities are in Games, suggests picking up the controllers, and continues into the main Nourishland demo after her recording finishes.
7. The early spatial-tools explanation explicitly introduces the tools available in Creator mode.

## Regression matrix

| Check | Expected | Quest result |
|---|---|---|
| First six tutorial screens and first six demo screens | Consistent paragraph spacing; no overlap; saved welcome voice; no render error | Pending |
| Demo narration | Each paragraph appears as its exact recording starts; earlier paragraphs remain readable | Pending |
| Slow loading | Loading does not consume reading time or skip a paragraph | Pending |
| Demo pause, resume, repeat | Main demo pause holds paragraph; resume continues; repeat restarts current paragraph | Pending |
| Back and Continue | No old narration or delayed text arrives on the new screen | Pending |
| Mic prompt | Permission deferred until requested; approved speech works without login error; Notes/custom Orb show microphone level, processing and error states; denial leaves controls usable | Pending |
| Tic-tac-toe | Win, loss or draw unlocks input choice; unfinished game does not | Pending |
| Games | Orb/dance, fruit/brush and butterfly/hand games are listed independently of input unlock | Pending |
| Return from Games | Back icon restores exact demo chapter and visible paragraphs; interrupted narration resumes | Pending |
| Input selection in main demo | Controllers, virtual hands and tracked hands remain selectable after the round | Pending |
| Chapter entries, especially chapter four | Enter actual immersive AR/XR; interact with Orbs and Curiosity; no desktop-only dead end | Pending |
| Main demo tools | Plant Orb → Tag/Curiosity → Fruit Window → Notes → Areas/Totems → living map → pathways → closure | Pending |
| Tracking interruption | Put controllers down, regain hands, pick controllers back up; no stuck grab or duplicate action | Pending |
| Exit and restart | Session resources release; tutorial/demo start again without stale scene or audio | Pending |

## Evidence and limits

Local checks passed: 1,029 regression tests; frontend build V0.9631; 36 authored chapter text layouts within bounds; 204 saved recordings decoded successfully (93 tutorial, 111 demo); native butterfly, tic-tac-toe, fruit, brush and controller scenes rendered; welcome V0.9631 visible; no browser page errors. These checks do not replace physical Quest testing.

Local review: serve the repository and open tools/preview-demo-narration.html for chapter text plus exact paragraph recordings, or tools/preview-demo-experiences.html for the native practice renderer. These developer previews are not hosted product routes.

Record headset/browser version, AR versus VR mode, input method, chapter/lesson, visible V0.9631 and any console error for each failure. Physical Quest results remain pending until this matrix is completed on-device.

V0.9631 additions: tutorial pause controls and their spoken instructions removed; all 36 chapter/111 runtime paragraph recording scripts match displayed body text exactly, including PIMO/LIMO; Notes readbacks page without truncating long dictation; the Moringa fallback disappears after a successful microphone transcript. Live transcription tested on root and www with approved synthetic Strawberry audio through actual browser MediaRecorder. This verifies the public service and browser recording path; physical Quest microphone permission/capture remains pending.

V0.9631: Living Frame PEEK and optional picture-frame activity use the same native 3D Sun Garden as the demo. Verify lean/parallax, both-eye aperture clipping, moving the frame without restarting its reveal, and return to the original scene. Teaching lights highlight Zinnia when no element is introduced; they shift to the controller Orb, fruit, brush, active hand games and narrated demo element. Verify smooth focus transfer, no early Zinnia reveal, steady text, unchanged Orb LEDs and reduced-motion behaviour. Physical Quest results remain pending.
