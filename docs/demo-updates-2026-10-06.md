# Demo update review

Latest local version: 0.9352. Follow-up repairs progressed through 0.9350, 0.9351 and 0.9352.

## Follow-up repairs — 0.9352

- Living Frame action: 2048 x 1024 power-of-two artwork, filled rounded silhouette instead of translucent stroke, high-contrast face, shadow-free text and optional capped anisotropic filtering. DOM counterpart removes blur and text shadows. Existing spatial size and ray target are unchanged.
- Bee entrances use staggered seeded delays and independent animation offsets. The shared native rig is re-evaluated per pose, including same-frame nectar-to-flight switches; rest restores wing rotation, translation and scale. The user's double-wing appearance still needs a physical headset visual check.
- Explorer now uses the reference truncated-octahedron form: eight large hexagonal information faces and six smaller square connector faces, 44 triangles per node. Small square attachment pads, six-sided connector geometry, no label stroke/glow and labels located on visible information faces. No measured Quest FPS claim.
- Widgets: dark editor/loading background; only one asynchronous dashboard capture at a time; ignore completion errors after disposal; content-only native card keys exclude live DOM/action graphs; per-card content revisions avoid repainting every widget for one timer; zero-duration label fades are safe. Native Note rendering errors close the workspace safely rather than taking down the demo. Exact user-reported headset crash was not reproduced locally and is not claimed resolved end-to-end.
- Butterfly grab detection remains on the ray but no longer clamps the visible laser. Surface resting requires release within 12 cm of an actual hit surface; free-air release immediately resumes flight at the held position. Faster flight wing animation. The play introduction now follows the first plant and panel lessons, rather than startup.
- Verification: 571 Node tests pass. Browser verified native Note ray open, Timer editing/save, connected widgets and faceted Explorer rendering. Welcome version and final build verification are recorded in the handoff. Fixtures are local-only; desktop book remains unchanged.

## Approved 3D map update — 0.9349

- Utility 1.1 now uses the approved animation in its existing Three.js miniature renderer, not the schematic SVG. The concept layout does not modify actual placed demo records.
- Area 1 has three curved swale planting rows; Area 2 has an open centre, perimeter trees and a centred Totem 2. Only two Totem labels and six Orbs appear; no example Note or plant-specific names.
- Landscape is visible first, paused. Play reveals Totem 1, three Orbs, Totem 2, a curved connection over 3.2 seconds, then three more Orbs. Pause resumes in place; Replay resets the sequence. Reduced motion shows the complete layout immediately.
- Existing 3D plants, ground depth, lighting and translucent Orbs remain. Totem collars use glass materials with light tips. Shared geometries, instanced planting and a capped render cadence keep the miniature contained.
- Full Node suite: 565 passed, 0 failed. Frontend-only build passed at 0.9349. The built welcome screen visibly displayed V0.9349. Syntax checks and git diff --check passed.
- Browser verified the real renderer, integrated Play/Pause/Replay controls, stopped-state control labels and reduced motion, without observed warning/error logs. Review fixture: tools/preview-map-3d.html; integrated fixture: tools/preview-demo-living-map.html. Fixtures do not ship in the frontend.
- Still local, not deployed or physically headset-verified. No desktop book redesign.

## Implemented

- Welcome fades in and waits for Start the demo. Bees enter from behind the Living Frame and orbit its flower rim rather than crossing the reading centre.
- LIMO activates immediately, with suppression of duplicate XR events. PIMO and LIMO share the cell glass control; new and legacy opaque defaults migrate to glass without preventing later opacity choices.
- Back restores saved scene records, opened cells, panel content/images and settings state. A fresh demo clears the previous LIMO trail and panel instance.
- Controls follow the selected Note, Totem or plant. Notes convert between Plain, Interactive and Dynamic; the pencil edits text through the existing spatial keyboard path. Totem form, light colour and explicit Show/Hide signage live in object Controls.
- Dynamic Notes have a reusable registry of eight initial widgets: Thick Box, Image, Checklist, Timer, Plant List, Task / Complete, Tip / Hint and Clue. The visual library groups gardening tasks; up to five widgets unfold around the anchor with strings. Six starters demonstrate common activities. Legacy Notes remain Plain.
- Native Note cards forward ray input to the same widget behaviours as the regular visitor view. Checklist actions beyond the first native card page remain reachable. Visitor state and timer deadlines persist locally.
- Bees have soft pointer avoidance, contact-only short haptics, slower curious visits, paired waist-level visits and still wings while collecting nectar. Flowers vary in number, size and shape.
- Trigger-held butterflies can be moved with the joystick and released onto a nearby surface or anywhere in space; they rest briefly before flying again. Hero Dice depth uses the same joystick convention.
- Panel tools pulse until the indicated tool is used. Grip/trigger hints explain movement and interaction. Sample placement preserves the black-and-white media. Reading uses one panel with More info and source links, without a page counter or repeated selected heading.
- Minimize becomes a compact restore control. Close confirmation stays in one row, with red-glass Close demo. Trigger textures use power-of-two mipmaps to improve distance sampling. Typography fits the same cell/sign dimensions with fewer expensive text effects.
- Totem signs are pointy and directional, headings have stronger contrast, all Totem forms have notification tips, and the glass light section has gentle notification behaviours.
- Explorer face records and facet regions are cached, ray testing rejects distant geometry early, and font effects are reduced. These are implementation improvements, not a measured headset FPS claim.
- Desktop demo, creator and visitor AR launch paths are gated with a compatible-device explanation. Public desktop entries point to the existing illustrated book or Web tools.

## Verification

- Full Node suite: 561 passed, 0 failed.
- Frontend-only build succeeded; generated VERSION and welcome badge agree at 0.9348. Both creator and Note styles are included in the build.
- Browser checks: desktop compatibility notice and existing book route; Note editor save; Widget Library add/remove; countdown start; Interactive Note hint/completion/next discovery; Totem light/signage/edit; actual WebGL card ray activation and task completion. No console errors were observed in the Note review.
- Review fixtures: `tools/spatial-notes-review.html` exercises real Note services and the native card renderer. `tools/two-area-map-review.html` wraps the separate conversation preview. Neither fixture ships in the hosted frontend.

## Intentionally deferred

- No book conversion or redesign. The existing prototype remains available, with its desktop AR call to action removed.
- The formerly deferred two-area animation is now integrated in the 0.9349 update above.
- No commit, push or deployment was requested or performed.
- Physical Quest/phone verification remains necessary: distance fuzziness, glass readability in passthrough, controller/keyboard feel, butterfly placement, contact haptics, nectar animation and frame-rate improvement.
