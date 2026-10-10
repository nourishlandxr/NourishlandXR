# Master repairs 0.9459

Local repair and verification record. This build has not been deployed or tested on a physical Quest.

## Changes

- The native Living Frame uses the reading screen's actual facing axes and pixel centre. The screen, rim and Continue control are 12 cm lower.
- Bees avoid a padded reading disk, including a flight segment that crosses the disk between frames. Flower sites beyond its edge remain reachable.
- The welcome page and demo controls expose **Try 3D peek**. This opens the existing independent Living Frame painting experiment; an active demo session ends before the experiment opens.
- Fruit Window sizing uses visible plant geometry, fills up to 57 cm of the 65 cm window and allows 26 cm of plant depth in a 30 cm enclosure. Hidden growth stages and cutaways no longer shrink the initial display.
- Continue and Let’s start stay hidden during narration and the final reading interval, then appear enabled. Leaving a slide hides the previous action immediately. Live map progress retains its already available action.
- The fruit enclosure and desktop card use translucent white. Stronger desktop lights and the native XR material shader brighten the plant. Label draw order keeps dark species names readable above the translucent backing.
- Joint-only hand pinches acquire nearby fruit or an aimed fruit, carry it from the fingertip midpoint and release on pinch opening or tracking loss. Fruit ownership prevents the other hand interactions from acquiring the same input.
- Fruit intersection checks exclude hidden geometry, reuse contacts and sample hover at 20 Hz. Repeated leaves/pods use instancing; both eyes share pose uploads. The Living Frame retains vertex bindings and updates scene transforms once per growth sample.
- Welcome uploads use 80% texture dimensions on medium and 55% on low, with bounded update frequency. Automatic recovery reduces surface detail, stops rain, uses SD when HD was requested, increases optional fixed foveation and recovers to a supported lower refresh rate if low graphics still misses frames. Saved graphics, rain and Living Frame choices remain available.

## Evidence

- Complete regression suite: **750 passed, 0 failed**. Persistence checks required local socket access; sandbox-only failures were rerun with that access.
- Final bee-boundary refinement: all six master repair tests passed, including an unchanged nectar position outside the disk.
- Frontend build: **0.9459**. The compiled welcome displayed **V0.9459**. The compiled badge uses its production build label even when served locally; that is not deployment evidence.
- Browser harness with the real Pigeon Pea asset: joint-only pickup, 10 cm carry and pinch release passed. Both controller window grips passed their movement/release checks; no browser warnings or errors were recorded for those checks.
- Browser welcome button opened the 3D painting inside the Living Frame. The independent experiment rendered without browser warnings/errors.
- Stereo geometry checks verify the disk/rim centre in both eyes, rotation, bee penetration prevention, hidden-stage sizing, shared instanced uploads, and automatic 90-to-72 Hz recovery.
- The actual Continue handler regression checks hidden state during text and the last paragraph's reading interval, enabled state on completion and prevention of repeated advancement.
- Final stereo preview: translucent white enclosure, brighter plant and readable species label; joint-only pinch pickup/carry/release passed again without browser warnings/errors. Screenshot: [Fruit Window](../.tmp/fruit-window-0.9459.jpg).

Desktop browser callback rates varied with concurrent tests and browser rendering. They are not a Quest FPS benchmark. The next device check should compare the same demo stages on the same headset, including Fruit Window growth, two-hand fruit opening, bees and the optional 3D peek, using the FPS/CPU readout in Graphics settings.
