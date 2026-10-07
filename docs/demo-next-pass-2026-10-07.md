# Demo update queue - 7 October 2026

Scope: latest user review, starting with Luna high. Local checks are not deployment or physical headset verification. Keep all changes in the existing demo/creator-compatible components, not a new panel architecture.

## Luna high - bounded presentation work

- [x] **PIMO text (local):** measured wrapping with separate name/scientific/roles/summary regions; corrected glyph aspect compensation and increased contrast without glow. Layout bounds tests and native Tag preview checked. Physical headset/low-resolution appearance still requires review. Explorer architecture was not redesigned.
- [x] **Compact widget Notes (local):** half the previous compact widget area, distinct blue/teal glass and crisp fonts. Main Note remains the original size. Visuals/hit regions/tethers use the same size. Native preview checked picker -> Timer using real renderer ray activation, with zero WebGL error.
- [x] **SPACE 1.4 (local):** three centred paragraphs with 1100 ms fade-in, reading time and 700 ms fade-out. Last paragraph stays; Continue cancels the sequence. DOM and canvas use shared timing, with reduced-motion support. Portuguese-Portugal/Dutch sentence translations added.
- [x] **Image inventory:** Acacia has `app/assets/demo-plants/acacia-fimbriata-illustrative.webp`, which is an illustration, not a verified photograph. No matching Blue Quandong, Native Ginger or Lemon Myrtle asset found in `app/assets`. Totem tutorial artwork exists at `app/assets/demo-tutorial-art/05-totem-unfolds-garden-knowledge.png`; existence alone does not confirm display during the relevant step.
- [x] **Map baseline:** 27 focused map model/reveal/grip/render-performance tests pass. This does NOT establish that the application Back sequence or physical Quest pickup works.

## Sol high - interaction/state work, in priority order

### S1 - Interactive map blocker and preloading

- Reproduce Utility 1.1 start -> spatial reveal -> pick Totem -> release on target -> second/third Totem -> Back -> Forward, including repeated Back and a fresh demo restart.
- Trace actual XR listener order, ray/hit target, grip owner and release. Do not substitute a source assertion for exercising the input path. Retain the current all-angle miniature hit region and priority grip handler unless observed evidence requires a change.
- Fix disappearance on Back. History currently snapshots marker/panel/narrative state, but does not snapshot `demoMapIntroPaused`, map origin/orientation, placement list or reveal clock. Inspect disposal/recreation and pending Orbs callbacks too; these are audit leads, not a confirmed root cause.
- Prebuild the scene/GPU resources before the spatial reveal. Preserve the intentional reading/preview interval; remove resource-loading delay, not narrative timing.
- Keep vegetation visible, miniature Totem identical to the existing botanical template, and placement targets easy to see.
- Acceptance: all three Totems can be picked/placed, Back restores visible interactive content, Forward can resume, no exception or orphaned input owner; frame work stays bounded. Report Quest verification separately.

### S2 - Native Australian plant choice at ELEMENTS 1.12

- Replace the second named Moringa Orb with an untagged plain Orb. Visitor first places the Orb, then chooses its plant identity.
- Spawn a compact Note beside that Orb: **Choose the next plant**, with **Acacia / Blue Quandong / Native Ginger / Lemon Myrtle**.
- Choice removes the chooser Note and opens that SAME Orb's newly selected PIMO. Preserve Pigeon Pea and all existing placed items; do not replace the whole scene or create a third plant Orb.
- Reuse the existing Acacia sample species if appropriate; verify species identity/source before inventing botanical information or generating identification imagery. In particular, keep Blue Quandong distinct from other plants sharing the common name Quandong.
- Provide appropriately sourced plant knowledge for each option and English/PT-PT/Dutch visitor copy. Explain the transition from food-forest plants to native Australian plants.
- Generate missing photographic-style demo assets only after species are settled. Mark synthetic imagery as illustrative, not verified identification photography; retain source/attribution where genuine photos are reused.
- Acceptance: four choices yield different names, content and uncropped images; exactly one placed second Orb, no Moringa identity left on that route; chooser disappears, PIMO opens, Back/Forward retain the choice.

### S3 - Notes interaction and view management

- Fix re-selecting main/sub-Note after an Orb changes Controls context; clicking the Note must recover Note options every time, not only the first click.
- Keep stable DOM action references through timer/widget rerenders. Main Note, picker and every widget remain independently draggable and strings stay attached.
- Add nearer/further controls to all Notes, with correct axis direction and sensible distance bounds. Do not rotate Notes away from the viewer.
- Retain edited Notes/widgets through demo progression and Back, clear them only on a fresh demo reset.
- Prefer an explicit compact glowing reopen control for Notes that are put away. Do not make active content nearly invisible. Keep that control selectable and movable.
- Acceptance: select Note -> select Orb -> select Note repeated; add/operate every widget; move/change distance; progress and return without losing content or Controls linkage.

### S4 - Totem signage and linked Controls

- At every Totem stage automatically select that Totem in Controls; show discreet linked name/type. Follow stage defaults while respecting an explicit later object selection.
- Explain physical buttons, show/hide signage and navigation signs in the main Control Panel content.
- Simplify the My area title/sign footprint, distribute plaques higher around the Totem rather than clustering at its foot, keep the sculpture visible.
- Pressing signage reveals readable transparent floating text above the Totem, without a boxed info card. Add a bounded black-and-blue pulse to the selected sign; honour reduced motion.
- Before Second Area appears, gently move the Control Panel only if it obstructs the new Totem. Never move a panel currently held by the visitor. Docked/magnetised panels follow their parent's move without losing relative docking offsets.
- Acceptance: correct Controls for first/second Totem, no stale PIMO tools; every sign remains selectable; sign text does not overlap Living Frame or another Totem.

### S5 - Global stage media policy

- Every narrative stage has relevant imagery available; no crop or altered aspect ratio, no IMAGE PANEL heading. Totem/user monochrome image must appear in its intended narrative stage.
- Images remain optional through the existing hide/show control. Automatically put media away for focused Explorer, interactive-map and Totem-intro activities; restore the relevant image on subsequent reading stages, not a stale previous image.
- Fix ordering where `showDemoTutorialMedia()` runs before `showIntroBoard()`, which currently clears previous media for many stages. Inspect before implementing a shared stage-media policy.
- Acceptance: audit the entire sequence in EN/PT-PT/NL, confirm correct available image per step, focus stages unobstructed, explicit Hide respected, docked panels follow Control Panel movement.

## Integration and release

Luna handoff: frontend build 0.9391, 57 focused checks passed, 12 tutorial-art paths checked with no missing files. Additional map/Note-interaction edits appeared concurrently in the shared checkout; they were preserved, not classified as completed by this pass. Deployment and physical Quest verification were not performed.

- Keep the selected heading design proposal separate until implementation is explicitly approved.
- Increment `app/services/buildInfo.js` for each completed handoff batch; build frontend and verify welcome version binding.
- Focused tests first; run broad checks only when shared interaction changes warrant them. Never claim a headset defect fixed solely from a build or source-string assertion.
- No push/deploy without user instruction. Record completed items and remaining blockers at each handoff.
