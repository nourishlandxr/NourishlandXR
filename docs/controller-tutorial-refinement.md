# Controller tutorial refinement

This checklist keeps the original controller requests together with later
steering. Local simulation and headset acceptance are separate checks.

## Requested experience

- Try both triggers, then both grips.
- Bring in the current expandable Living Orb. Grip to lift, turn and release it.
- Trigger opens the toy shell without creating a plant record or opening PIMO.
- Keep the Orb visible: A/X changes its colour; B/Y changes it again.
- Thumbstick movement rotates it. Try each stick click, then right-stick settings.
- Finish with a laser used to tickle Zinnia. Retract it afterwards.
- One activity instruction in the Living Frame. New exercises use text and
  existing feedback/haptics, with no new voice recordings.

## Repairs included

- Callouts name the individual control on that hand. Settings prompts appear
  only on the right. Completed hands lose their callout immediately.
- Connectors start at the animated button mesh's centre, not the controller
  origin, and reach the callout edge without an artificial length cap.
- Preserve face-button legends by keeping opaque highlights off the faces.
  Added legends use each mesh's actual local scale and cap surface.
- Hand reveal duration increases from 1.8 to 4.2 seconds per hand, with stagger,
  64 boundary sparks and existing charging haptics.
- Controller-driven palms use mirrored holding offsets and a pitched holding
  pose. Thumb opposition is stronger. These are candidate alignment corrections:
  actual hand fit must be checked on Quest with different users' controller holds.
- Fruit placeholders remain visible and pickable during model downloads or
  failures. A slow model download no longer blocks the practice-ready stage.
- The table centre sits up to 0.85 m from the visitor instead of 0.65 m, with
  clearance from the frame. The pedestal has a single height layout below the
  tabletop underside, including its reveal copies.

## Zinnia readiness audit

| Event | Previous trigger | Current gate |
| --- | --- | --- |
| Table arrival | Lesson entry; reveal depended on speech starting | Complete 4.4 s spawn, short settling pause, renderer upload ready |
| Zinnia arrival | Lesson entry before her spawn | Model ready, complete 3.6 s spawn, short settling pause, renderer ready |
| Controller toy exercises | Spoken prompts and acknowledgement | Silent; text, visible toy changes and haptics |
| Virtual hands | Follow-up could depend on a fixed short hold | Longer silent reveal before the next lesson |
| Fruit basket | Only downloaded models were visible | Spawn completes with pickable fallback geometry before narration |
| Pot / packet | Narration started before the pot finished appearing | Pot appearance time and renderer readiness |
| Flight | Lesson entry | Visible companion and renderer readiness |
| Demo paragraphs | Flow started immediately | A rendered frame and enabled Living Frame entrance readiness |
| Living Map | Narration could race GPU preparation | Native map renderer has prepared all meshes |
| Reference image / Fruit Window | Narration could race model/image loading | Current panel image / Fruit Window presentation reports ready |

Back/Next cancels readiness polling. Manual narration skip remains available;
waiting for assets must not independently advance the lesson or start its audio.
No new audio assets are generated for this refinement.

## Acceptance still requiring a headset

- Natural hand/controller fit, inward thumb movement and slow reveal appearance.
- Letter readability and connector endpoints while each wrist rotates.
- Table, pedestal and Zinnia spacing from seated and standing viewpoints.
- Real loading delays, microphone behaviour and frame timing on Quest.

## Latest preview corrections

- Use the current 12-cell Living Orb and its shared expansion geometry, without opening PIMO.
- Introduce the Living Frame by name and hint at its living leaves and flowers. Remove the extra tutorial brand header.
- Interpret full conversational name, fruit, plant and Note utterances, with varied confirmation and corrections.
- Separate the saucer from the pot surface; opt those opaque surfaces into back-face culling.
- Batch all 89 petal meshes, including the 14 Honey petals previously missed. Prepared Zinnia now has 31 meshes rather than 43, and 5 morph meshes rather than 19.
- Skip character bounds work for inactive controller pointers. Add damped body lean and broader head gaze, retaining expressive facial morphs.
- Headset frame-time and natural hand calibration remain acceptance checks, not measured claims.
