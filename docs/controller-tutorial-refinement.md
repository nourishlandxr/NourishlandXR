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

## Live review executed: V0.9592

This section supersedes historical wording above when it conflicts with the confirmed live review. Scope starts with the microphone test and includes the user's subsequent item-by-item approvals. No new recorded audio files were generated.

### Welcome, table and reading surface

- Spoken NourishlandXR welcome, at least ten seconds before controller teaching; comfort guidance follows.
- Discreet in-frame Pause/Play control is separate from the microphone bar and stops progression and object input.
- Outline precedes the table. Aim and hold any controller button to reposition it; release starts its gentle reveal. Visitors who leave the placement alone keep the suggested position.
- Default vertical table height reduced 25 percent; retained long tabletop and raised its boundary lip.
- Each heading appears once for five seconds. Caption sentences accumulate on the same reading surface.
- Zinnia waits for her spawn and renderer readiness; welcome, character and lesson speech use the same runtime voice service. Living Frame copy does not claim it has leaves.

### Controller lesson, menus and Zinnia

- One trigger/grip balloon joins the two controller connectors. Face-button prompts are compact.
- Current expandable Orb retained: A starts the inner pulse; X/B change shell colour; Y changes inner pulse colour. Right stick spins; left stick rolls/moves. Right click extinguishes the pulse during this lesson. The final left click enables gravity, throwing and rolling. Learned physical mode survives object reset.
- General menu: left-stick click. Brush menu: right-stick click. Orb button teaching remains its own context.
- General menu icons, contact highlighting, volume slider and replay symbol improved. Games sit last; Tutorial includes repeat-last-step. Brush settings remain beside the right controller.
- Leaf dance holds left controller to left leaf and right controller to right leaf. Both pointers lock while held; after a brief dance Zinnia releases and invites the tickle through “Please don’t tickle me with the lasers!” Tickle/laugh advances and retracts the lasers.
- Larger stem and leaf hands, broader elastic body lean. Zinnia looks at the visitor during explanations and usually tracks their hand while idle; fruit opening has leaf gestures.
- Thumb opposition now crosses the dorsal side of the curled fingers. Both hands remain visible with the paint controller; menu rays originate at the virtual index finger.

### Fruit and drawing

- Actual fruit and renderer readiness precede basket narration. Removed the basket feedback disc. Plate is beside the corner basket.
- Fixed held-fruit neighbour corrections incorrectly behaving like basket contact/release. Movable packed neighbours can settle while fruit lifts; genuine basket wall/rim contact still releases with feedback.
- Two-hand proximity followed by outward separation opens available whole/half fruit variants. Fruit stage precedes painting. Instructions and names do not repeat on each pickup.
- Fine initial paint line. B undo; hold A to show a translucent rectangular eraser, then trigger to erase; grip on a pointed stroke moves it.
- Paint controller keeps anatomical handedness and uses vector undo/eraser legends; adapter pitched a further 45 degrees. Selected colour reaches both contact tip and controller pigment.
- Colour choices form a hit-tested radial wheel. Right-stick deflection opens it and release commits the last direction. Brush/tool icons and selection borders improved.
- Flight and strawberry lessons are optional and are invited at the end; existing preview/trial entry points remain available.
- Microphone recording fallback bounded to eight seconds when room noise prevents silence detection (normal silence finish remains 700 ms). This bounds one contributor to delay; network speech/transcription and real Quest microphone latency remain separate checks.

### Performance and evidence boundaries

- Cached hand local bind matrices and reusable pose transforms avoid repeated inverse-matrix work each frame.
- Suppressed character touch ray traversal outside the actual tickle phase; explanation gaze no longer updates the entire descendant tree just to transform a target.
- Welcome morph weights are quantized and uploaded at most 30 times per second; controller/head transforms still update each XR frame.
- Native tutorial exposes rolling frame-p95/update CPU/renderer statistics through its performance getter. These are diagnostics, not a claimed Quest benchmark.
- Full suite: 903 passed with local loopback API tests enabled. Later focused checks cover changed pose, pointer, Orb and fruit paths. Frontend/API build and current shared local browser badge are V0.9593 (concurrent platform work advanced the shared version after this tutorial batch’s V0.9592 bump).
- Browser visual evidence: revised fists, longer Zinnia stem/leaf hands; runtime speech reports audible true. Real microphone capture, headset hand fit/haptics, and before/after Quest frame rates remain unverified.

### Supplied art integrated

The supplied Banana Peel and Red Stylized Apples GLBs now supply the tutorial banana and matching whole/half/bitten apple. `tools/prepare-interactive-fruit.mjs` preserves source hashes and credits, extracts only the needed states and reduces textures to 512 pixels. Total runtime payload is 761,424 bytes, including the banana’s complete surfaces and 16 interpolated peel poses. Native XR uses the existing morph deformation path, avoiding unsupported skin animation and per-frame skeleton work.

Holding the banana with one hand and pulling the other hand down its local length progresses the peel. Releasing preserves progress; it never creates a mirrored banana half. A held apple must approach the headset mouth zone from outside before changing to its authored bitten state, with a short synthesized crunch and haptic pulse once. Reset/restart restores closed peel, whole apple, collision bounds and gesture state. All required fruit states load before basket readiness. No prerecorded audio files were added. Source licences, including the apple’s CC BY-NC restriction, are retained in the asset credits.

Final validation: 913 tests passed, including native renderer deformation and real fruit grab/peel/bite/reset input paths. The final caption cleanup also passed 16 focused checks. Frontend/API build passed at V0.9595. The refreshed preview displays that version, reports all seven fruit assets ready and WebGL error 0. Real Quest haptics, hand fit and frame-rate measurements remain unverified.

This is local implementation, not a production release. Concurrent platform/launch work in this checkout is outside this repair scope and is preserved.


### Final narration and repeated bites (V0.9596)

- Filled the spoken gaps for the Living Frame, triggers, grips, expandable Orb, face buttons, stick rotation, stick clicks, general menu, laser introduction and leaf dance. Existing live Zinnia delivery is retained; no new prerecorded files. Spawn/reveal effects stay silent. The Orb and extended lasers must be visible before their instructions start.
- Right-stick completion queues the left-stick instruction after the current speech finishes. Each transition is spoken once; repeat follows the current task. Corrected old references to flying and right-stick general settings, and included brush undo, eraser, drawing movement and colour-wheel guidance.
- Apple progression is whole → supplied bitten mesh → two further offline-carved eaten states. Each bite requires a fresh approach from outside the mouth zone; resting at the mouth never auto-repeats. Each accepted bite gives one crunch/tap; the third state is final. Reset/restart clears all eaten states and the bite count. Source slice, peeled and rotten models are not used as eaten states.
- Runtime fruit payload: 1,083,816 bytes across six GLBs, with textures capped at 512 pixels. Boolean carving runs only in the preparation script, never during XR interaction. Source attribution and adaptation details are retained.
- Final local validation: 915 tests passed, frontend/API build passed, diff whitespace checks passed, preview welcome badge V0.9596. This section is locally finalized; production deployment and Quest device measurements are separate.
