# NourishlandXR IWSDK input integration

The default Quest preview opens the existing NLXR app at `/nlxr/?xrInput=iwsdk`.
Its current welcome, tutorial, cells, content and native WebGL renderers are reused.
The standalone IWSDK input manager attaches to the same native XRSession; it
does not create another canvas, XRSession or animation loop. The UIKit pass uses
the SDK's Three.js renderer on the existing GL context/framebuffer, restores native
GL state, and runs once per existing eye draw rather than owning another loop.

Tutorial native pinch state, hand poses, controller grip/trigger mapping and ray
poses use this SDK input owner. Tutorial fruit now uses the SDK `GrabSystem` and
`OneHandGrabbable` handles for near-hand capture, movement and release. A small
interaction-only ECS world uses the existing input samples and fruit-bound hit
shapes, without another session, canvas or animation loop. Native pinch/fist and
controller squeeze route one action edge to its scoped SDK grab pointer.

The tutorial packet, watering can, pot and eligible harvested fruit now share
SDK grab ownership. NLXR retains cutting/peeling, held-object basket constraints,
plate rewards and lesson progression. SDK Havok owns free-body simulation in the
native tutorial, with authored table, floor, basket and plate colliders. Held and
anchored objects use kinematic bodies; releases resume dynamic simulation. The
existing lightweight physics remains the legacy/desktop fallback. Specialized
demo gestures and Creator grab ownership remain pending. The native tutorial wrist menu now loads the
authored UIKitML asset and uses SDK ray/touch pointers, Horizon sliders and Lucide
icons with the original wrist positions and actions. Pointing virtual hands and
real hands can press/withdraw the index finger without a trigger. Hiding the
menu removes its input scope atomically. The tutorial uses SDK AudioSystem pools
for watering/insect sound, and SDK positioned
audio for the existing Zinnia narration output. Original recordings, pause/replay,
volume and lesson timing are preserved. Runtime visibility, mute, pause and end
stop scene sounds; no extra AudioContext is created. Headset sound/comfort and
worker performance and headset menu comfort remain to be validated. The V0.9617
local checkpoint passes 963 tests, including actual SDK ray/contact interaction,
tracked-hand contact, spatial control geometry and uninterrupted slider drags.
The V0.9618 test checkpoint also wires demo Plant Orb/Totem/Note-marker movement
to SDK near-hand/distance-grab ownership, native Control Panel and companion
controls to UIKitML, harvested Fruit Window fruit to Havok, and demo Zinnia/bee
sound to SDK spatial audio. Its 967-test suite passes. Native Continue, Settings,
Close confirmation and Cancel were exercised through SDK pointer input in a
browser harness without WebGL errors. This is not physical Quest validation.
Specialized two-hand map/window/fruit-opening gestures, knowledge-object grips,
placed-Note and butterfly grips retain their existing implementations. Creator
migration and physical-device performance/visual validation remain pending.
The checkpoint is integrated into the main checkout at V0.9621, preserving the
newer narration and Field changes. All 1006 tests, the hosted frontend/API build,
the emitted SDK bundle probe and the automated welcome-version check pass.
Integration alone does not mean committed, deployed or Quest-validated.
The input build scopes the pinned SDK GrabSystem's imports to avoid loading
unrelated World UI/font/physics initialization; its interaction class is unchanged.

Virtual controller hands now use the official `AnimatedControllerHand` poses and
real tracked hands use `AnimatedHand`. Their world-joint snapshots feed NLXR's
existing hand shader, retaining its colours, opacity
and reveal effects. Both hands use the vendored Meta generic-hand GLBs. A small
boundary adapter corrects xr-input 1.0.1's model-first controller-hand constructor.
Virtual-hand squeeze curls the thumb and middle/ring/pinky fingers into an authored
pose retargeted from Meta IWER's recorded point/pinch data. With trigger released,
the index stays extended for pointing; squeeze plus trigger closes a full fist.
Trigger alone closes the index. No A or thumbstick press is required for the fist.
SDK interpolation is retained, with a visual-only
button mapping and a local pose asset; native input actions and tracked-hand
joints remain unchanged. No new hand mesh,
session, renderer or per-frame finger-curl algorithm is introduced. The legacy
input comparison route retains its prior hands.

In SDK virtual-hand mode, menu aiming and the displayed selection ray use the
controller's native target-ray pose. Finger curl never redirects that ray when
the trigger is pressed. The legacy comparison route keeps its prior fingertip
ray. Hand tracking and near-hand fruit capture are unaffected by this change.

From this directory, run `npm ci`, `npm run dev` for local testing, and
`npm run build` for the standalone static output in `dist/`. Quest testing
requires a secure origin and a headset session; a browser build alone cannot
establish hand-tracking quality.

For a physical Quest on the same Wi-Fi network, run `npm run dev:quest`, then
`npm run dev:status` and open its `runtimeUrls.network` HTTPS URL in the Quest
Browser. Accept the local development certificate warning and enter the existing
tutorial. Test hand pinch plus controller grip: lift fruit from the basket,
inspect it, move it, release it, and place it on the plate. Check tracking loss,
visibility recovery, controller reconnect and settings contact. Run `npm run dev:down` when
done. This route does not launch the host's managed Chromium window.

From the repository root, `npm run build:iwsdk-preview` also builds the
existing hosted frontend and copies this experimental app to
`dist/xr/iwsdk/`. That preview entry now returns to the existing NLXR welcome with
SDK input enabled. The original Pigeon Pea SDK test scene remains available using
`?inputTest=1`, with its `OneHandGrabbable` pod and simplified PIMO controls.

The normal frontend build bundles the SDK adapter at `vendor/iwsdk-input/index.js`.
Quest uses SDK input by default; `?xrInput=legacy` selects the prior input path for
comparison. Android keeps its existing touch path unless `?xrInput=iwsdk` is
requested explicitly. Install the pinned SDK dependencies with `npm --prefix
iwsdk ci` before building or testing this integration. Existing NLXR routes remain
the user entry points. Physical Quest tutorial validation is required before
release; neither a passing build nor the earlier pod test establishes that result.
