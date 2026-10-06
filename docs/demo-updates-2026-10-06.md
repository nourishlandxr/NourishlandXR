# Demo update review

Local version: 0.9348 (+0.0001 from the preceding 0.9347).

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
- The new two-area land animation is a proposal only: swales in Area 1, open space with perimeter trees in Area 2, Totem 1, three Orbs, Totem 2, a curved connection, then three more Orbs. It is not integrated into the app map.
- No commit, push or deployment was requested or performed.
- Physical Quest/phone verification remains necessary: distance fuzziness, glass readability in passthrough, controller/keyboard feel, butterfly placement, contact haptics, nectar animation and frame-rate improvement.
