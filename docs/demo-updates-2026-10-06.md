# Demo update review

Latest local version: 0.9354. Earlier sections below are historical checkpoints, not current verification claims.

## Simplified Note showcase and interaction repairs — 0.9354

- The demo Note pencil no longer opens the generic editor/keyboard or a detached configuration wall. It opens a sample-edit preview on the Note itself: Try sample edit, Reset text and Done editing. Full creator authoring remains separate and is deliberately deferred from this showcase.
- Selecting or placing a Note automatically restores the existing Control panel and opens its contextual Note tools. The demo tools are Edit preview, + Add widget and Show / hide widgets.
- + grows a right-side connected arm, away from the left-docked Control panel. The arm offers three prepared gardening examples: Information (Thick Box), Timer and Checklist. Choosing one replaces the chooser with a working sample widget. Widget instances and behaviour use the reusable registry, not a separate demo implementation.
- Note surfaces participate in nearest-hit resolution alongside Control panel, PIMO and LIMO. The Note is nonmodal: it does not suspend the Control panel or consume every XR Trigger. Continue closes the showcase and advances normally. Native hand-ray selection has the same route.
- Native Note actions now resolve the current DOM button on every press. Timer refreshes can replace a card without changing its artwork; retaining the earlier button reference otherwise makes the card look correct but unclickable.
- Integrated local review used the real Note renderer, Control panel and XR selectstart/selectend/select handlers. Control-panel pencil, native sample edit/reset, widget-arm opening, Timer selection/start and Continue while editing all responded with no observed WebGL errors. This component harness is not a complete physical Quest walkthrough.
- Bee pointer contact/avoidance cannot retain nectar resting. Original wing tracks are explicitly sampled when returning to flight, including a same-time transition that can otherwise retain the mixer's cached rest pose. Gentle continuous controller buzz returns while bees are around, respects Haptics mute, and stops when they leave; contact remains a stronger short tap.
- Explorer colours belong to parent branches and are inherited by extensions. Bonds/connectors use standard white glass. Child cells have their own grip targets and move independently of other branches; their connected descendants follow translation. Child cells expose multiple real topic/read/parent outputs, without inventing source facts. Root colour, child grip ownership and source-preserving movement are regression-tested.
- Hero Dice gets a stronger soft grounding shadow, restrained low impact/touch sound, grip/touch haptics and a brief floor landing ring. Resting micro-collisions do not repeatedly fire impacts.
- The opening eyebrow is NourishlandXR rather than a second Welcome.
- Verification: 584 Node tests passed; frontend-only build succeeded at 0.9354; built welcome visibly displayed V0.9354. The build required a sandbox permission retry for the generated .htaccess file, without changing source permissions or touching API/workspace data.
- Explorer production stereo review: 120 frames, 11 nodes, CPU submission median 4.70 ms / p95 9.60 ms, 0 texture uploads and 0 WebGL errors on this desktop/browser run. These are not Quest GPU/FPS measurements or a controlled before/after comparison.
- No commit, push, deployment, desktop-book redesign or physical headset walkthrough was performed. Priority hardware check: select Note → pencil preview → sample edit/reset → + → Timer → Continue, then verify bee flapping/buzz, child grip movement and dice landing feedback.

Local review: tools/preview-note-showcase-xr.html. The older keyboard fixture still tests the reusable creator editor; it is no longer the demo Note workflow.

## Native Note and usability repairs — 0.9353

- Note pencil editing and widget text entry now use a bounded 720 × 620 native canvas editor/keyboard. They no longer invoke HTML page capture. Keyboard supports text, numbers, symbols, clear/backspace, paging, Save and Back to AR. Resources and listeners are released on close; a failed editor opening safely returns to the demo.
- Browser walkthrough exercised the actual pixel-hit actions: title typing, Timer editing from four to two minutes, Save and return. No WebGL errors; 30 idle frames produced zero extra texture uploads.
- PIMO Controls contains only Tag / Curiosity / Explorer (plus Done). Note and Totem contextual controls remain intact. Cell glass is a main General Settings slider, shared by PIMO and LIMO.
- Explorer no longer builds and discards Curiosity surfaces. Its Controls no longer converts/copies the plant document during every eye draw. Stereo eyes share a frame's model traversal; shader scratch matrices are reused. A fresh mode-only reader starts with three compact connected branches. Existing personal organisms and specialised assembly APIs are preserved.
- Production stereo renderer review: 120 frames, 11 visible nodes, 0 texture uploads, 0 WebGL errors. On this local desktop/browser run, CPU render submission was 7.40 ms median / 11.50 ms p95. These are not headset FPS or GPU timing measurements, nor a before/after comparison.
- Living Frame now draws opening glass before white text. Removed text opacity breathing/fades and shadows; increased paragraph/button font ceiling. Initial Continue leads to the introduction, then one Start the demo action. Early Discover first plant and repeated Discover another plant progression labels become Continue.
- New Orbs have a fading-in pulsing ring until selected. XR reference-space resets rebase placed records, reading poses, anchors, panels, butterflies and dice; visibility resume preserves placed plants. Physical headset removal/resume remains to verify.
- Image button/IMAGE PANEL naming and Control panel label highlights clarify A closer look. Main Control panel branding is distinct; source/reference buttons sit below the reading text. The native panel reserves additional vertical room for the larger controls.
- Minimized Control panel is a transparent round Show control with larger discreet text, circular ray bounds and grip/hold-drag movement. Ordinary Trigger restores it.
- Bee waist companions have offset approach timing and differing destinations, alongside their existing independent entry/orbit/animation variations. Each close encounter provides one gentle haptic; contact is a stronger short tap with cooldown. Replaced butterflies remain visible while resting. Hero Dice has a soft height-dependent floor contact shadow without a shadow-map render.
- Verification: 576 Node tests passed; syntax and whitespace checks passed; frontend-only build succeeded. Built welcome visibly displayed V0.9353.
- Local review fixtures: tools/preview-native-note-editor.html and tools/preview-native-explorer-budget.html. Neither ships in the hosted frontend. No commit, push, deployment, book redesign or physical Quest walkthrough was performed in this update.

Priority headset acceptance: Note pencil → type → widget add/edit → Save → return without freeze; Explorer sustained frame timing while moving/expanding; Orb survival after removing/replacing the headset; circle grip/restore; glass/text contrast; haptic feel and butterfly surface rest.

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
