# Creator AR audit and shared interface integration

Version: **0.9285** · 3 October 2026 · local implementation.

## Scope and evidence

Reviewed the Creator entry/session lifecycle, object rendering, panel factory, controller/hand/touch paths, placement and anchor persistence, authoring tools, linked Areas, shared visual preferences and Demo implementations. This is a source audit plus desktop component validation, not a physical Quest test. The desktop lab uses an in-memory reference plant; it does not modify project records.

## Confirmed findings and repairs

| Area | Confirmed original behaviour | Applied change |
| --- | --- | --- |
| Quest panel | `arMode.js` created `createPimInfoPanel` without headset or phone flags. The upgraded shared renderer was present but used its default desktop layout. | Configure the proper device layout, recreate after the actual session mode is known, attach the production renderer and expose Creator actions in its rail. |
| Global settings | Only info backing and Orb model persisted. Text, scale, hand mode, cell opacity and refresh/FPS preferences were local to individual experiences. | One validated, browser-local preference store for Demo and Creator. New panels and sessions inherit these preferences. Project records and anchors remain separate. |
| Refresh/FPS | Creator inherited the 90 Hz session default but had no selection or FPS controls. Demo duplicated rate and cadence logic. | Shared controller for supported Auto/72/90/120 choices and measured XR callback FPS. Update the readout once per second, once per frame rather than per eye. Keep session startup negotiation nonblocking. |
| Cell glass | Creator's panel had no cell-opacity callback; its DOM and canvas meshes omitted the option. | Connect both renderers, include opacity in the texture cache key and refresh open profiles. The existing renderer applies opacity to backgrounds only. |
| Demo cell targeting | Transparent DOM LIMO hit targets multiplied their whole opacity by glass opacity and disabled targeting at zero. | Keep hit targets and their text available when glass backing is transparent. |
| Pointer | Shared laser width was already inherited, but Creator changed the aimed beam to vivid green and drew a solid green sphere contact. It hid the pointer in View mode without an open plant profile. | Shared neutral beam and open contact ring, distance-adjusted contact size, pointer in View mode, bounded fallback beam when nothing is hit, Pointer/Outline hand preference. |
| Totem controls | Renderer produced Signs/Fade IDs, but Creator's handler merely selected those IDs. Text surfaces were drawn only while information was already open. | Keep control surfaces available; implement Signs/Fade/Wake, restore visibility, clear inactive selections and use the shared sign transitions. Add equivalent touch controls. |
| Totem appearance | Creator did not request the new wood material or render the shared backing plaques. | Shared wood contrast/grain, physical plaques/fixings, crisp mipmapped sign textures and aim feedback. Preserve authored colours, dimensions and alternate Totem shapes. |
| Direction | Linked-Area DOM arrows alternated left/right by array index. Knowledge boards did not supply destination navigation. | Derive direction from available session positions or runtime calibration. Omit directional arrows where position is unknown. Add linked Totem cards without changing the existing Area transition routes. |
| Destination feedback | Recent shared destination highlighting was already wired into Creator. | Preserve it; stop hidden/faded signs from keeping destinations highlighted. Keep sign/card selection separate from movement. |
| Orb state | Creator used the shared models but supplied only generic highlight state; movement and explicit selection were not passed. | Pass selected and held state to the shared Orb renderer, preserving authored plant positions and sizes. |
| Trigger sequence | Both `selectend` and trailing `select` could independently activate a placed object. Release could fall back to the original object after aim moved away. | Consume the matching marker gesture once. Require release over the same object and clear incomplete state on hidden session/input change. |
| Hold timing | Creator used a window timer for controller holds. An already open Orb could be interpreted as another short selection instead of movement. | Tick the 800 ms movement threshold from XR frame time. Keep short selection separate from movement, including when the plant profile is open. DOM touch retains its existing timer. |
| Hand cells | Hand pinch used dwell without the controller path's immediate selection. Totem hand activation was missing. | Immediate, deduplicated cell selection and Totem activation; deliberately hold an object to move it. |
| Feedback | Creator's new shared panel grab hook had no callback. | Optional controller buzz for object/panel grabs, sign selection and successful move saves. |
| Authoring read surfaces | Creator palettes/context surfaces retained older opaque pale backings and thin hover treatment. | Shared glass preference, dark neutral backing, stronger borders and stationary hover emphasis. Input forms retain their own readable backing. |

## Rendering, animation and performance review

- **Stack:** Creator uses custom WebGL shaders and canvas textures, not a Three.js renderer. No unsupported Three.js colour-space/tone-mapping APIs were introduced. Material highlight models are deliberately stylised. No runtime evidence identifies colour space or WebXR itself as a dullness cause.
- **Textures/UV/filtering:** Totem boards use cached canvas textures (2048×512 plaques, 2048×1024 header/detail, 1024×1024 controls), rectangular UVs, linear filtering, power-of-two mipmaps and optional anisotropy up to 8. These existing shared settings are now used with Creator's physical plaques. No new external assets or compressed-texture dependency.
- **Geometry/materials:** Shared sphere/prism buffers are reused. Orb model geometry is selected from existing buffers; Advanced adds local collar/detail draws. No full-screen bloom, particles or new continuously generated geometry. Creator's alternate plate/triangle plant shapes and custom Totem styles remain available.
- **Lighting:** Local shell/rim/material highlights are shader effects; there is no passthrough environment-light capture. Visibility against actual outdoor backgrounds still needs headset inspection.
- **XR resolution:** Creator already requests alpha, depth and antialiasing in the WebGL context and XR layer, and uses the runtime viewport per eye. Existing scissored per-eye clearing is preserved. Refresh rate is not render resolution, and browser pixel ratio does not control an XR framebuffer. No evidence warrants increasing framebuffer scale as a default.
- **Transparency:** Panel/cell backing opacity does not lower text or outline alpha. Shared sign textures use blending and disable depth writes; physical backing plaques retain normal depth behaviour. Closing/faded signs do not supply active sign hit surfaces. Wake controls remain reachable.
- **Animation:** Object arrival, sign transitions, fade and movement timing use elapsed time. Reduced-motion behaviour remains in the shared renderers. No new animation changes object centres while the user aims. Living-frame growth, bee behaviour and Demo narrative sequences are not Creator authoring features and were not inserted into this mode.
- **Allocation/cost:** Cached sign artwork avoids per-frame text rasterisation. Existing Creator PIMO animation can still delete/recreate a texture when its bloom/hover key changes; marker projection and ray functions still allocate arrays/objects. These are real code costs, not proven headset bottlenecks. This pass does not claim a measured Creator GPU improvement.
- **Placement/data:** Existing placement preview, confirmation, duplicate-placement guard, pending-save exit wait, anchor rollback on failure, Area alignment and routes remain in their existing services. Saved marker appearance opacity remains independent of global information glass.
- **Authoring workspace:** Detailed knowledge editing still uses its existing workspace/Quest dashboard mirror. Text-size and spatial-scale settings tune the shared reading panel; they do not rewrite every input form or rescale project anchors.

## Settings available in Creator

- Hands: Pointer / Outline.
- Reading text size and reading-panel scale (85–120%).
- Cell glass: 0–100%, backgrounds only.
- Info background opacity: 0–100%; default 38% glass.
- Plant Orb model: Basic / Improved (default) / Advanced.
- XR refresh: only supported rates; default 90 Hz, with runtime fallback.
- Show FPS: measured XR callback cadence plus actual session refresh rate.
- Recenter the reading panel.

Preferences persist **in the same browser/origin** across Demo and Creator. They are not account/cloud preferences and do not transfer automatically between the local preview and deployed site. Rain settings are omitted in Creator because Creator has no rain renderer.

## Validation

- Existing suite: **457 tests passed**. Updated two existing source assertions that required the superseded neon beam/sphere contact; no new test suite added.
- `node tools/build-hosted.mjs`: successful, version **0.9285**.
- Built welcome screen inspected at the local `dist/xr/` URL: **V0.9285**. Its “Live” build target badge is not evidence of deployment.
- Desktop Creator component lab: production Quest panel, Creator actions and settings rendered. Checked 0% cell glass, 65%/38% info backing, larger/reset text; verified whole panel and whole cell opacity stayed 1. Restored preview preferences. No warning/error logs during those interactions.
- Shared performance controller checked with a mock session: supported 120 Hz selection, 120 callback FPS readout, preference validation/clamping. This does not verify headset frame delivery.
- `git diff --check`: clean.
- No physical Quest, complete immersive Creator walkthrough, GPU profiling or deployment performed for this pass. A static frontend server cannot exercise authenticated Creator persistence; the isolated component preview deliberately avoids that dependency.

## Quest 3 acceptance checklist

1. Open a saved Creator project in AR. Confirm the new Control panel, Creator actions and settings are readable without DOM overlay.
2. Select an Orb once: information opens once. Select a root/child cell once, move aim away during a gesture, and repeat quickly; no unintended close/reopen.
3. Hold an Orb for 0.8 seconds: buzz, move state, right-joystick depth adjustment, release/save confirmation. Repeat with information already open, then re-enter AR to verify the saved placement.
4. Switch Pointer/Outline and use hands as well as controllers. Verify cells/Signs/Fade and menu targets stay usable.
5. Change glass to 0%, 38%, 100%; confirm text/outlines stay readable and cells remain selectable. Switch all three Orb models.
6. Show signs, select plant/note/linked Totem cards and inspect highlights. Close/Fade, ensure inactive boards cannot intercept input, then Wake. Inspect known-direction arrows against the actual destination.
7. Enable FPS; cycle only offered refresh rates. Compare Basic/Improved/Advanced in a populated Area and inspect bright/dark passthrough backgrounds.
8. Open media, open Settings, return to information, open authoring workspace, place/cancel a draft and exit while a move is saving. Confirm no stuck panels, duplicate records or lost anchors.

## Files

`app/screens/arMode.js`, `app/screens/temporaryArDemo.js`, `app/services/spatialVisualSettings.js`, `app/services/xrPerformanceSettings.js`, `app/services/pimInfoPanel.js`, `app/services/spatialSphereRenderer.js`, `app/services/spatialTotemCards.js`, `app/living-objects.css`, `app/services/buildInfo.js`, `tools/creator-ar-preview.html`, `tests/ar-interface.test.mjs`, and this audit.
