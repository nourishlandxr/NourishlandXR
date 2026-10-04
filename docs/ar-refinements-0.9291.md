# V0.9291 — Settings, floor scale and ambient insects

## Changes

- Settings no longer collapses, docks, hides or discards the image panel. DOM and XR surfaces render independently.
- Text size (the existing normal/large choices), panel scale, PIMO glass, shared Main/Control/LIMO glass and floor correction use range sliders. XR supports immediate pointer placement and continuous controller/hand dragging. The source is captured through release; trailing select events are consumed. Panel size drags use the original surface so resizing does not move the track away from the aim.
- Floor reference: the demo now honours `local-floor` zero, with the configurable eye-height fallback only when floor tracking is unavailable. The old fallback that attached the base to the green panel was removed. Preparation includes floor guidance and eye-height adjustment; the first Totem asks the user to check its base, with correction available in Settings. Floor correction also applies to Creator rendering, without rewriting saved anchors.
- Demo Totem posts are two metres tall. Engraved controls sit at 1.35 and 1.16 metres on a full-height post. Creator offers a Life size 2 m preset; explicit existing project heights are preserved.
- Four bees share a single animated sprite in XR. Wing animation is accelerated 3.2 times and sampled at about 30 Hz instead of 14 Hz. Rest bounds are refreshed for animated wings to prevent clipping. Irregular, seeded-per-session encounters rotate among the four bees, one visitor at a time. Pointer avoidance uses elapsed-time damping, with no duplicate update per eye.
- One butterfly: supplied original GLB (494,064 bytes), 2,144 triangles, three skinned primitives, Idle/Flying clips. Optional preparation decodes the embedded texture before AR. It perches on the actual Control panel edge, with constrained folded wing hinges and subtle Idle motion. Its one-minute timer begins when the panel becomes visible, then blends over 4.5 seconds into gentle flight and spaced close passes. Flight/takeoff origin is fixed in space; approach origins are captured once rather than following the head. Reduced motion keeps it perched.
- Butterfly sprite budget: LOW 192 px / 20 Hz, MED 256 px / about 24 Hz, HIGH 384 px / about 30 Hz. Each sprite upload is reused for both eyes. Geometry/materials are reused; there is no full-screen bloom. Model resources and XR textures are disposed when the demo closes.

## Source archive

The supplied ZIP contains an editable Blender original and `BackWingCol.png`. Its 512 x 512 wing texture matches the GLB texture after a vertical flip, so changing format adds no texture detail. The archive is retained at the supplied Downloads path and is not added to the deployed frontend. Attribution is bundled in `app/assets/butterfly-CREDITS.txt`.

## Validation

- 477 existing and new regression checks pass; frontend build and whitespace checks pass.
- Browser: supplied butterfly Idle/Flying render without console errors; leaf/wing edges are visible. Native opacity slider changes the background; opening/closing Settings preserves the plant image.
- A real production-panel browser harness, using a synthetic XR controller and the actual renderer/intersection, passes opacity drag 0.1 to 0.8, release and trailing-select duplicate suppression.
- Built welcome shows V0.9291; HIGH demo preparation settles six resources, including butterfly preparation.
- No physical Quest validation for this update. User previously verified V0.9290.

## Quest check

1. Open an image, open/close Settings: the image should stay put. Press the track to set opacity, then hold and drag its thumb.
2. Inspect a Totem base and two-metre body. If the headset floor is incorrect, use Floor height adjustment; compare both Totems. Check engraved buttons are reachable.
3. The butterfly rests on the Control panel from its first visible frame, then flies after a minute. Check close passes and wing clipping.
4. Compare FPS before/after insect arrival at 90 and supported 120 Hz, with MED/HIGH. Confirm closing the demo disposes the effects.
