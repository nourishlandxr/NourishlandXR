# Head entry portal test — V0.9467

Runtime review: `/tools/preview-living-frame-runtime.html`. Open the Control panel,
then VIEW → PEEK 3D. The scene preloads while the demo runs. The slide fades out,
then a true 3D placeholder flower fades in without navigating to a preparation
screen. Back to scene restores the existing demo. Desktop: scroll to move through
the frame and drag to look around. Native XR: physically lean through the opening;
controller select returns to the demo. Visibility preferences are not changed.

Independent mechanics fixture: `/tools/preview-plant-portal.html`. Its controls
simulate head translation and head orientation. `?native=1` exercises the same
native WebGL portal renderer used by the demo with a simulated camera.

Outside, the scene is masked by the circular opening. Crossing inside its radius
opens the surrounding 3D space. Retreat restores the mask. A small crossing
hysteresis avoids jitter; the central head pose determines the state for both
eyes. The scene stays anchored and the camera follows the viewer without
teleportation. This is original placeholder geometry, not Art-Teeves' model.

Local evidence:

- 67 focused interface, visibility and portal tests passed; six earlier isolated
  peek mechanics tests also passed.
- Browser VIEW → PEEK 3D → Back to scene exercised successfully.
- Native renderer simulated-camera outside and inside views rendered correctly,
  with WebGL error 0. Inside yaw changes retained the inside state.
- Build V0.9467 and local welcome version checked.
- Physical headset comfort, stereo crossing, controller return and performance
  remain unverified. No production deployment was performed.

Screenshot: `portal-inside-0.9467.jpg`.
