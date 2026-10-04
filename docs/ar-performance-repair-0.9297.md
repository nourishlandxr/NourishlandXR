# V0.9297 - Refresh recovery and calm startup

## Confirmed code findings

- `xrPerformanceSettings.js` locked RefreshRate while a native promise was pending, without a timeout. Its cyclic control also had no direct lower-rate choice. A saved 120 Hz setting was reused on the next launch.
- `demoBeeModel.js` sped the full hover clip to 3.2x while the immersive sprite updated at about 30 Hz. Every sprite paint reskinned the 29,653-vertex model on the CPU for a bounding box, changed camera framing, and reset canvas dimensions/pixel ratio. These operations are confirmed; their headset timing was not measured here.
- `temporaryArDemo.js` paints the welcome at 2500 x 2100 RGBA: approximately 20 MiB per full upload. At the 48 ms text interval this represents roughly 417 MiB/s of source pixels, not a measured bus throughput. The welcome uploader reallocated texture storage on each repaint.
- `spatialTotemCards.js` deleted/recreated textures whenever serialized card data changed. Image fade used separate wall-clock samples for each eye, so both eyes could repaint/upload the same card in a frame.
- Startup readiness was changed during the eye loop, after displaying the recovery card for the first eye. This could give the two eyes different first-frame content.
- INTRO 1.1 greeted the user in both the heading and body.

## Repair

- Direct supported rate buttons, including 60 Hz only where advertised by the runtime. The highest supported rate at or below 90 Hz is the direct recovery action.
- A 2.5-second native request timeout; a lower request can supersede a pending 120 Hz request. Late requests cannot overwrite the latest saved choice.
- Saved 120 Hz/Auto starts at 90 Hz again; 120 Hz remains an explicit trial. Sustained callback cadence below 78% of a high target over two one-second windows, after three seconds of settling, requests the safe rate. A late high-rate request is corrected too. Hidden/blurred sessions do not count as performance failures.
- Show FPS includes measured JavaScript/driver submission CPU time and the most expensive demo render phase. It is not GPU or compositor timing. Shared Creator rate controls/recovery receive the same fix; demo-specific CPU sampling belongs to the demo loop.
- General sliders start at the top; Graphics and Help are at the bottom. Rate recovery stays enabled during a high-rate request.
- Bee clip speed 1.35x, sprite cadence up to 60 Hz, fixed generous framing, no per-paint CPU bounds calculation or unconditional canvas reset. Existing mesh, four bees and encounters remain. Sprite pixels follow LOW/MED/HIGH (256/384/512).
- Welcome and panel texture storage reused with subimage updates. Panel painting canvases reused; image fade quantized to 24 steps and shared between both eyes. The welcome presentation clock advances once per XR frame.
- Welcome texture prepared before headset callbacks begin; readiness changes after both eyes finish. Failure recovery remains available.
- Opening body now starts with Discover, preserving one welcome greeting.
- Plant connection/climate narrative changes are deferred.

## Validation

- Focused refresh/session/settings/render/content checks: 113 passed.
- Full existing suite plus six regression checks, rerun after the final canvas reuse cleanup: 483 passed.
- Frontend build produced V0.9297; local welcome displays V0.9297.
- Browser preview: General sliders ordered first, Graphics submenu opens, image remains present, captured error/warning log empty.
- No physical Quest is attached. GPU/compositor pressure, thermal effects and browser-specific rate-transition behavior remain unmeasured. Support for 120 Hz does not prove sufficient rendering headroom.

## Quest check

1. Confirm V0.9297 and observe first entry at 90 Hz (or supported fallback).
2. Open Settings; check sliders first and Graphics at the bottom.
3. Enable Show FPS and observe FPS, CPU time and busiest phase at 90 Hz.
4. Try 120 Hz, then directly press 90 Hz during any slowdown. Reopen AR if the browser itself is unresponsive; saved 120 Hz will not restart the next session at 120.
5. Check startup in both eyes, image fades and bee motion at MED. Compare HIGH separately.

Reference: https://developers.meta.com/vr/documentation/web/webxr-frames/
