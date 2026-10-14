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

## Review adjustments: welcome, headings and microphone

- Prepare the Living Frame and reading screen, then fade both together using one presentation opacity.
- Welcome to NourishlandXR comes first; pause before introducing Your hands tutorial.
- Complete the table and Zinnia spawns before their speech; skip redundant reveal slides and duplicate headings. Keep captions present while audio is being fetched.
- Disable the table silhouette glow, including its round pedestal copy.
- Restore microphone and finish buttons in every visitor conversation phase; provide a viewer-relative voice bar when no panel pose exists.
- Preview has visible microphone, finish, confirmation, correction and skip controls.
- For local voice tests, launch node tools/persistence-server.mjs --hosted-voice-preview. The opt-in loopback-only bridge uses the existing hosted voice routes, without copying keys. Normal local server mode and production stay unchanged.

- Circle flash: initialise both the fruit highlight and dragonfly landing marker hidden before the first renderer build, and exclude the landing marker from arrival glow copies. The fruit plate still arrives with the fruit activity.

## Refinement request: hands, fruit, tools and conversations

- Full virtual fist including thumb opposition and index curl on grip.
- Actual fruit models and renderer ready before basket speech; preload during earlier conversation.
- Fruit collision with other fruit, basket wall and rim; stop/release on contact with feedback.
- Taller stem, proportional leaves, elastic gaze/body, shorter Zinnia reveal.
- Smaller Orb with grip/open/colour/rotation skills retained after introduction.
- Free sentence name/fruit replies, shorter recording turnaround, consistent voice and coordinated prompts.
- Correct brush grip alignment and move its palette to the side.
- Trigger callout on the trigger-facing side; permanent red stick-function ring after menu introduction.
- Fine plain line as default paint; subtle continuous buzz and sound only while drawing.
- Wrist/settings access stays unlocked; learned tools remain available.
- Say each fruit instruction once; keep concise current text guidance and avoid repeat names/tips on every pickup.
- Verify three conversation journeys: introduction/confirmation/fruit, correction/retry, cancel/restart and plant/Note continuation.

## Verification and release notes for V0.9591

- Browser confirms all seven real fruit assets report ready, and the basket is visible with no console errors.
- Both virtual fists were visually checked in the preview. Actual controller fit, vibration strength and microphone turnaround still require Quest checks.
- Zinnia stem stretches 32 percent above the pot, the flower head keeps its round proportions, leaf arms are enlarged, and total character height is 0.48 m. Her reveal is 2.4 s plus a 0.4 s settle.
- Learned Orb skills survive lesson changes and object reset; settings stays unlocked. Direct preview jumps select standard controllers for a consistent starting view.
- Conversation fallback uses a strict, grounded name/fruit extraction schema only when local sentence parsing cannot resolve the reply. It cancels on retry, skip, restart and disposal.
- The new /zinnia/interpret endpoint is included in the API build. A frontend-only production deployment does not activate that endpoint; API release is required for the fallback. Existing hosted transcription and speech routes remain compatible.
- OpenAI schema reference: https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=chat
