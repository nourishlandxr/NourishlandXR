# V0.9298 - Control panel stage, Settings docking and cell planting

## Report and evidence

Quest report: approximately 1 FPS at 90 Hz, CPU 49 ms, collapse at SPACE 1.1
(Meet your Control panel), startup judder with head movement. No Quest device
or GPU/compositor trace is available to this agent.

Confirmed source paths:

- SPACE 1.1 starts the bees and displays the image companion together.
- The immersive bee path created a second Three.js WebGL renderer with
  preserveDrawingBuffer, rendered the 29,653-vertex skinned model, and copied
  its canvas into the session texture up to 60 times per second. The previous
  release increased that copy cadence from 30 to 60 Hz. Cross-context
  synchronization is a plausible source of severe stalls; its contribution
  to the reported 1 FPS is not established without device profiling.
- drawIntroSpatial forced a complete 2500 x 2100 canvas redraw/upload during
  the first 64 seconds, regardless of actual content changes. Each RGBA
  surface is 21,000,000 bytes; a 48/64 ms upload gate still permits substantial
  traffic. The welcome texture was already reused; allocation reuse alone
  did not remove the painting/copy cost.
- Living vegetation itself already had a one-second raster cache. The new
  clearance carpet nevertheless scattered leaves throughout unopened cell
  discs and rendered them fully grown under reduced motion. That visual
  error is confirmed; vegetation alone causing the collapse is unproven.
- Settings forced the top dock and moved a top-docked image left on opening.

## Repair

- Native bee geometry now renders in the session's WebGL context. Static
  indexed mesh and colour upload once. One 6,912-byte skeleton update is
  shared by four bees and both eyes; no XR canvas sprite copying remains.
  LOW and devices without float vertex textures use the existing lightweight
  bee fallback. Desktop retains its existing Three.js renderer. The original
  model, animation speed, laser avoidance and encounter motion remain.
- Removed the blanket first-64-second repaint. Changed copy, reveal/hold
  feedback and connection feedback still refresh; ordinary rim/growth refresh
  stays at one second. Texture resolution is unchanged.
- Settings uses the left dock by default, or top when the visible image is
  docked left. Image docking/held pose does not change when Settings opens.
  Rendered and hit-tested surfaces use the same pose.
- Small cell foliage starts 1.5 seconds after the cell opens and establishes
  over 60 seconds. A few tiny leaves emerge on short stems from the lower
  perimeter, leaving the reading centre clear. Unopened cells have no carpet.
  Reduced motion does not instantly complete this cell growth.

## Validation

- 488 existing and focused regression checks passed.
- Frontend build and local welcome show V0.9298; git diff --check passed.
- tools/preview-native-bees.html ran the actual native shader and original
  asset in browser WebGL: four animated bees, GL error 0, no warning/error
  logs, two initial texture allocations, no repeated colour allocations.
  One sampled desktop window showed about 56 callbacks/s and 1.71 ms CPU.
  This is a single-view desktop rendering check, not Quest timing.
- No physical Quest validation or measured GPU bottleneck attribution.

## Quest recheck

1. Confirm V0.9298. Start at 90 Hz and MED. Move your head during arrival.
2. At Meet your Control panel, enable Show FPS and note FPS, CPU and the
   busiest phase. Leave that stage running for at least a minute.
3. Open Settings with image above: Settings left, image stays above. Move
   image left: Settings above, image stays left. Aim and operate each surface.
4. Open a learning cell: no instant corner islands; shallow leaves gradually
   emerge around its lower edge without obstructing the text.
5. If MED still slows down, choose LOW and record the same timing. Test 120 Hz
   only after 90 Hz is stable; the existing direct 90 Hz recovery remains.
