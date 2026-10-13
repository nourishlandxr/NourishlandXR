# Welcome recovery 0.9587

The latest startup correction supersedes the earlier trigger-before-Zinnia order. Keep this sequence when editing the tutorial:

Welcome to Nourishland → settle in → table reveal → Zinnia reveal and greeting → Living Frame and controller introduction → name and favourite-fruit conversation → spoken bridge → button practice.

## Experience requirements retained

- Basic controller skin immediately; no laser until its lesson.
- Button actions first, explanation after completion: triggers, grips, thumbstick movement, thumbstick click, A/X, B/Y. Each accepted press gets a success tone and haptic tap; each completed lesson gets its reward.
- Compact glass controller hints with a connector no longer than 5 cm. Controller transforms use the current XR grip pose without smoothing.
- Laser extends from the controller; selecting Zinnia triggers her giggle. Settings follows the button/laser lessons and opens/closes with the right thumbstick click.
- Three interaction methods, then the magic controller-to-virtual-hand reveal before fruit assets. Preserve strong magic haptics and wrist menu lessons.
- Fruit starts in the basket; pick up and observe, then introduce the painting controller/brush, then open supported fruit and place it on the plate.
- Use the visitor name at selected later moments, rather than every sentence.
- Table starts with its spoken introduction, reveals over 4.4 seconds and sits 0.65 m ahead of the initial visitor position, separated from the Living Frame.
- Captions wait for actual playback; sentence pages follow the audio clock and pause with it. Sentence offsets are weighted estimates, not word-level speech timestamps.
- Sound-reactive brackets and bars sit at the Living Frame's bottom centre and follow its pose. Use measured microphone/narration levels; no routine recognition-status prose.
- Request microphone permission during demo entry without the extra microphone holding page. Preserve optional speech and permission opt-out.
- Frame height continues to move text and native frame together.

## Rendering repairs

Detached source meshes are invisible in the old native renderer during asset replacement. Future hidden lesson groups do not undergo native geometry conversion; dynamic controller groups remain convertible when hidden. Coalesce asset rebuild requests instead of restarting a conversion in progress. Pointer hits are computed once per frame, and only when a pointer is relevant. Cache controller material traversals and skip zero-count paint instances.

## Evidence and remaining device checks

869 automated tests pass, including automatic startup without preview jumps, delayed audio unlock and transient retry, subtitle clock, current controller pose, feedback, compact hint length, and detached-mesh rendering. Frontend build and diff checks pass. Local WebGL2 Paint selection produced no JavaScript or GL error. Welcome version is 0.9587.

Quest-only checks still required: repeated cold-start audio, microphone prompt and spoken name, exact brush warning, physical controller alignment and FPS while loading/painting. Local browser CPU times are not Quest FPS measurements. This document does not imply production deployment.
