# Independent property peek — visual checkpoint, 10 October 2026

## New authored animation variant

Open `?scene=animated` for a new real-time living painting based on artwork v2.
It uses no website media, remote video, generated MP4, or extra texture. There was
no video-generation tool available in this session, so the effect is authored in
WebGL. `animated-property.mjs` adds colour-gated, soft region masks to the existing
painting material: slow cloud drift, small local foliage movement, gentle pond
reflection distortion and restrained light variation. Geometry/camera remain
steady, buildings are protected from foliage deformation, and both eye views use
the same animation moment. The masks are approximate, not semantic segmentation.

Controls: pause/resume, strength 0–100%, moment scrub and reset. A scrub pauses the
motion; strength zero restores the static appearance. System reduced-motion starts
paused. Hidden tabs/closed peeks do not advance; long frame gaps are bounded.
Reload preserves the animation state. The still painting remains available.

Animation period: 120 seconds, using periodic functions with no sudden loop reset.
The rendered motion test passed: 46,783 changed pixels between moments 0 and 36 in
the tested centre view; identical frames at 0 and 120, zero strength and paused
repeated render. Six aperture/eye checks also passed with zero leaks. Node suite
now passes 6/6 including pause/reduced-motion/loop/disposal. Reports/screenshots:
`animated-painting-review.json`, `animated-painting-preview.png`.

Budget remains 12,000 submitted triangles / 4 calls / 4 GPU geometries / 1 texture.
The fragment shader has more sampling/arithmetic than the still material, so equal
geometry counts do not imply equal GPU time. No physical headset test or deployment
has occurred. Source and local welcome version: 0.9451 after build verification.
Hook reference: https://threejs.org/docs/pages/Material.html.

The current default is textured artistic painting v2. The user rejected the plain
3D blockout's cartoon appearance. That blockout remains a mechanics/proportions
study, not approved artwork. This work did not modify live Living Frame stages.

## Review options and files

- index.html or ?scene=property: painting v2 on an artistic depth relief.
- ?scene=property&art=v1: preserved first painting for comparison.
- ?scene=hilltop: independent Blender geometry with Look down from hilltop control.
- ?scene=mock: original inexpensive mechanics fixture.

Local preview: http://127.0.0.1:8769/docs/peek-world/index.html

property-reference-v2.png is an unchanged copy of the additional user photograph.
property-painting-v1.png is preserved. property-painting-v2.png is 1672 x 941,
3,757,101 bytes. PROPERTY_PROMPT.md and PROPERTY_TEXTURE_PROMPT.md record the exact
prompts; both used the built-in imagegen tool. The v2 pass adds varied leaf edges,
branching, weathered timber, corrugated roof detail, patchy ground and restrained
water reflections. Temperate planting is below the foreground dam; subtropical/
tropical food forest terraces flank the higher house beyond it on the left.
Botanical detail is an artistic interpretation, not verified plant inventory.

textured-painting-preview.png is the actual browser review screenshot.
property-world.mjs retains the picture's central projection on a hand-authored
depth surface. This is 2.5D: it cannot reconstruct unseen sides or support accurate
free movement around the property. It is kept distinct from the full geometry.

hilltop-property-v1.blend keeps editable terrain, house/veranda, water, contour
terraces and individual tree volumes. Photo/painting references are packed into
the file but excluded from runtime. create_hilltop.py reproduces generation/export
and is also embedded in Blender. hilltop-property-v1.glb is roughly 0.53 MB batched
geometry, with no landscape image, camera or animation. hilltop-property-v1.json
records approximate placement and climate zones. hilltop-world.mjs loads the GLB.
hilltop-blender-blockout.png is the plain Blender workbench checkpoint.

The estimated terrain is 56 x 56 m. Dam centre: x=2, y=-7.96, z=-11 m; about 6.36 m
below hilltop ground and 7.96 m below the model eye. House: x=-6, z=-20 m, on the
higher left bench. These are artistic estimates, not surveyed dimensions.
Generic round crowns and flat materials are placeholders. Texture alone will not
make those silhouettes realistic; do not carry them forward as the final style.

## Mechanics and verification

peek-world.mjs owns the shared stencil aperture, clipped world, temporary rim and
one-sided guard. Opening radius 0.832 m, initially 1.8 m ahead at eye height.
Viewer/eye cameras provide perspective directly; no scene render target is used.
The host grid is excluded inside the opening. Crossing behind it closes the peek,
without teleportation. Toggle retains resources; disposal releases geometry,
materials and textures. Reload preserves the opening transform and enabled state.

- Node focused checks: 5/5 pass; focused-test-results.txt. Aperture bounds, depth
  projection, relative parallax, disposal, actual GLB volume/no images, house/dam
  ordering are checked.
- Painting v2 rendered framebuffer checks: 6/6 views pass, zero outside-opening
  changed pixels. Centre/left/right/closer and simulated eyes; 35 mm AA tolerance.
  Report: painting-v2-browser-review.json.
- Painting: 12,000 submitted triangles / 4 calls / 4 GPU geometries / 1 texture.
  Reload: geometries 4 -> 1 host grid -> 4; textures 1 -> 0 -> 1.
- Blender blockout: 16,150 submitted triangles / 14 calls / 14 GPU geometries /
  0 textures, including rim/host and sky. Report: hilltop-browser-review.json.
- Original mock: 7,844 triangles / 12 calls / 0 textures. Earlier stereo-preview,
  lean-left and lean-right screenshots belong to this mock, not painting v2.
- Browser frame intervals measure system cadence, not isolated GPU cost or Quest.

Blender 5.2.2 LTS was launched visibly; HILLTOP_3D_READY in hilltop-generation-6.log
confirms completed export/render. Early operator-context errors were fixed using
fresh viewport context after factory setup. Native interactive screen control was
unavailable; saved Blender render and browser views were inspected. User windows
and unrelated uncommitted work were preserved.

Version was incremented to 0.9449 for this feature; concurrent work advanced the
checkout/build to 0.9450, preserved here. Frontend build and local V0.9450 welcome
badge verified; welcome-version.png. The badge's Live label is not deployment proof.

## Next step and limits

### App painting test — 2026-10-10, V0.9453

Release candidate V0.9456 packages this app test with the three-minute runtime
Living Frame growth update. The isolated test keeps its 60-second source-clip
scrubber for inspection. The screenshots/reports below record the original
V0.9453 review checkpoint; deployment and headset evidence are separate.

Open the built app at `/dist/xr/?test=living-painting`. This explicit test route
combines the animated property painting with the actual SD/HD Living Frame GLB.
Normal welcome/demo routes, text, navigation and reveal timing are unchanged.
Return to welcome removes the test parameter and disposes the test renderer.

The painting/aperture implementations now live in `app/services/peekOpening.js`,
`propertyPainting.js` and `animatedPropertyPainting.js`; the docs preview reuses
these modules. The painting asset is packaged in `app/assets/peek-world/` so the
built app does not depend on a deployed docs directory. The test screen is
`app/screens/livingPaintingTest.js`. Frame cache geometry/textures retain their
existing ownership; only cloned test materials are disposed by this screen.

Controls: whole-frame/close-up/lean, SD/HD/test-rim selection, 60-second growth
replay/scrubbing, painting pause/strength/toggle, simulated 64 mm stereo, and
immersive AR/VR where supported. XR places the frame 1.8 m ahead of the viewer,
with explicit recenter and exit controls; controller select pauses painting and
squeeze recenters. Reduced-motion starts the painting paused; frame starts mature.

Verification: 13/13 focused Node checks pass. Final rendered SD framebuffer checks
pass all six views with zero outside-aperture changed pixels; animation changes
142,288 pixels between sampled moments, with zero loop seam, zero-strength or
paused changes. See `app-painting-review.json`. Growth start/scrub, SD/HD selection,
test-rim fallback and return to welcome were exercised through actual app controls.
An odd-width drawing-buffer edge in the stereo pixel checker was corrected without
relaxing the aperture check. Build and welcome V0.9453 verified locally;
`app-welcome-0.9453.png`. Its Live label describes the build target, not deployment.

Observed mature SD draw: 98 calls / 152,168 submitted triangles / 97 geometries /
96 textures. These are renderer counters, not a headset performance assessment.
Final app image: `app-painting-preview.png`; earlier growth/HD images are checkpoints.

This test uses a separate Three.js renderer/session inside the app. Integration
into the existing native demo XR renderer and its stencil/state ownership remains
a later stage. No introduction text pause, automatic scene entry, production
deployment or full narrative audit was added. No immersive device was available
in the review browser, so AR/VR startup, passthrough, comfort, anchoring, controller
behavior and actual headset performance remain unverified. A headset must access
the build through HTTPS; this computer's loopback URL is for local desktop review.

Review painting v2 as the artistic reference. Develop one convincing 3D foreground/
terrace section with natural foliage silhouettes and textured surfaces, guided by
this painting, before extending the world. One photograph does not reveal hidden
geometry; additional angles would improve reconstruction fidelity.

Standalone AR/VR paths exist but no actual headset session ran. Live native WebGL
integration/stencil ownership, combined frame/world performance, passthrough,
controllers/hands, anchoring and comfort remain unverified. No text pause, scene
entry, production deployment or full narrative audit was completed. Living Frame
v2 live integration/fallback/device validation remain pending; the requested audit
follows that work. This prototype preserves independent ownership of frame/world.

Primary references:
[Three material stencil/clipping](https://threejs.org/docs/pages/Material.html),
[WebXR manager](https://threejs.org/docs/pages/WebXRManager.html),
[session requests](https://developer.mozilla.org/en-US/docs/Web/API/XRSystem/requestSession),
[viewer cameras](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API/Cameras).
