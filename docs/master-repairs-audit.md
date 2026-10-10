# Follow-up repairs - local 0.9470 (11 October 2026)

- The previous rim contact was an approximate thin disk. Inspection of both SD and HD grown GLB geometry found outer leaves at radius 1.059 m and depth up to 0.190 m, before the renderer offset. Contact now covers that native envelope and includes side walls; bee clearance includes body space around it. This is a conservative collision envelope, not a triangle-level mesh hit.
- PIMO butterfly perches now use the upper cell edge with bounded colour slots and a front offset. Previously the shared slot offset could pull butterflies inward across small cells.
- VIEW is always available on the main left rail, immediately below Controls and above Settings.
- Removed the permanent close-visit suppression triggered by plant/learning interactions. Curious bee visits last 22 seconds with a gradual approach and departure, varied existing side/height routes, and a shared 0.60 m/s movement bound. Reduced-motion and opening-orientation controls remain respected.
- Near encounters send one 0.82-strength, 260 ms controller pulse. Ambient buzzing cannot interrupt that pulse. Actual sensation depends on the device actuator and the user's haptics setting.
- 67 focused checks passed; frontend build and locally rendered welcome verified at V0.9470, with no welcome console errors. Work is local, uncommitted and not deployed. Physical headset rim contact, bee interaction and FPS remain unverified.

---

# Missed demo repairs — local audit, 0.9468

## Repaired in this pass

| Request | Finding and repair |
| --- | --- |
| VIEW sub-panel | Visibility was still in the main footer. VIEW now owns Orbs, Totems, Notes and the loaded Fruit Window, with Hide/Show states. VIEW is an independent lower companion. Controls, VIEW and LIMO Guides can remain open simultaneously, with separate hit regions, movement and close buttons. |
| PEEK 3D | Welcome and demo action rail still linked to the experiment menu. Those shortcuts are removed. VIEW → PEEK 3D now opens the property painting directly in the existing XR session. Scene rendering and interaction updates are suspended; trigger/pinch or Return to scene restores it. |
| Bee/rim collision | The central disk had a guard, but outer rim petals and sideways flight segments were not protected. The expanded depth/radius guard checks the swept path; nectar targets sit clear of the rim. |
| Butterfly transparency | One variant used 28% wing opacity. All variants now use solid wings with texture cutouts. Fruit glass has an explicit rear depth occluder, and fruit-box perches sit in front of the glass. |
| Shake response | Perched butterflies followed moving elements directly. Translation/rotation of a perch now triggers a 3.2-second departure and return, with a cooldown and reduced-motion handling. |
| Butterfly speed | Element visits now travel at 0.55 m/s rather than 0.22 m/s, with a shorter minimum journey. Free flight is faster, and the wing opening cycle is 8 Hz. Shared phase/eye caches remain in place. |
| Rim laser contact | Added a cheap, rotated annular hit surface on both sides of the rim. It stops the pointer without filling the reading aperture and blocks panel activation through the rim. |
| Simultaneous lower panels | Added independent Guides and VIEW cards alongside Controls, with aligned top edges beneath the reader in XR, separate poses and paginated guide content. |

## Earlier repairs already present

| Request | Source evidence and current check |
| --- | --- |
| Living Frame alignment/lower position | `livingFramePlacement.js` aligns the native rim to the actual reading-disk pixel centre and facing axes, with the existing lower offset. Rotated/stereo alignment check passes. |
| Continue hidden while text runs | `showIntroBoard` and opening narration hide the button through text flow and reading time. Runtime callback checks pass. |
| Larger Fruit Window content | `fruitWindowFit` fits visible geometry to 0.57 m and deeper content to 0.26 m; hidden cutaways do not shrink the model. Check passes. |
| White translucent fruit box / brighter model | White back, walls and rim materials, scene lighting and the existing surface-detail renderer are present. Rear insect occlusion added in this pass. Perceived brightness still needs device review. |
| Hand pickup | Joint-only fingertip/thumb pickup pose and pinch hysteresis are present. Joint-frame and release checks pass; physical hand tracking remains unverified. |
| FPS recovery | Adaptive low graphics, SD Living Frame, rain reduction, supported refresh-rate recovery, shared insect rigs and fruit instancing are present. Focused performance checks pass. There is no current headset CPU/GPU capture proving the reported FPS drop is resolved. |
| Creator mode isolation | The existing local Desktop/Android/XR workspace implementation is preserved in this worktree. |

## Evidence and release status

- **97 focused automated checks passed**, covering narration, rotated frame/rim geometry, fruit fit and input, visibility controls, insect phase caches, refresh recovery and the new peek renderer.
- Browser WebGL pixel checks: four eye offsets, zero aperture leaks, crossing guard, and an insect behind translucent rear glass fully occluded. These are desktop rendering checks, not physical headset evidence.
- Source and full frontend/API build: **0.9468**. The locally served compiled welcome displays **V0.9468**; its build-channel label is Live, but this is still a localhost preview. Console errors: none. Syntax and diff checks passed.
- This worktree is local and uncommitted. No deployment or physical headset walkthrough is claimed.

## Device acceptance still required

1. Keep Controls, VIEW and Guides open together; move and close them independently. Aim at the rim from both sides. Hide/show each scene group and verify the main panel has no old visibility footer or PEEK shortcut.
2. PEEK loads without a second XR entry/menu; leaning reveals depth; returning consumes the return gesture and restores the prior scene.
3. Watch bees at the rim and flowers from both sides while moving around the frame.
4. Shake a fruit box, Note or Plant element with a perched butterfly; verify brief departure/return, solid wings and clean occlusion.
5. Pick/release fruit using real hand tracking and review box/model brightness.
6. Record FPS and CPU readout through opening, Living Frame growth, Fruit Window and map interaction. The sustained FPS defect remains open until measured on the affected device.
