# Zinnia's Micro-Fruit Surprise

## Goal

When a visitor tells Zinnia their favourite fruit, she recognizes it, makes a tiny version appear in her hand, and replies, “It's my favourite too!” She then shares a short, playful line connected to that fruit. This should feel like a small, personal surprise inside the welcome experience.

## Reference set

The ten supplied pictures are saved in [`app/assets/welcome-practice/micro-fruits/references/`](../../app/assets/welcome-practice/micro-fruits/references/). References 1–3 show glossy, rounded, toy-like fruit models; reference 4 is a broad food emoji sheet; references 5–7 and 9–10 add tropical and less-common fruit examples, cutaway forms and alternate illustration styles. Reference 8 repeats the illustration sheet in reference 7. Use the fruit-only examples to guide the look: colourful, immediately recognizable, simple silhouettes, and readable at hand scale. Some source pictures visibly include stock-image watermarks. All ten are visual references only, not ready-to-load 3D assets, and their presence here does not establish a license to redistribute or ship their artwork.

The pictured fruit families include apples, citrus, peach/nectarine, grapes, strawberry, pineapple, pomegranate, mango, fig, pear, banana, watermelon, coconut, cherries, berries, kiwi, avocado, dragon fruit, passion fruit, rambutan, soursop, horned melon and other tropical fruit. Some pictures include vegetables or general food; exclude those from this feature's fruit catalogue.

## Existing NLXR foundation

- Spoken favourite-fruit parsing already lives in `app/services/zinniaConversationInput.js` as `spokenFavouriteFruit`, including common fruit names and aliases.
- Welcome assets already live under `app/assets/welcome-practice/`; `fruit-collection/manifest.json` catalogs several whole/cut GLB fruits, and `interactive-fruit/` contains interaction-specific models.
- The welcome practice lesson sequence and narration are maintained in `app/services/welcomePracticeContent.js`; the scene is assembled in `app/services/welcomePracticeScene.js`.

This plan adds a new response to the existing favourite-fruit conversation. It does not alter the separate fruit-picking lesson, its mechanics, or the lesson order.

## Local fruit-answer database and API use

The first-pass fruit inventory is saved in [`app/assets/welcome-practice/micro-fruits/catalog.json`](../../app/assets/welcome-practice/micro-fruits/catalog.json), with a readable list in [`INVENTORY.md`](../../app/assets/welcome-practice/micro-fruits/INVENTORY.md). These are planning/catalogue records, not yet imported or used by the running app. Use a bundled, versioned JSON catalogue imported by the app, rather than a database server or SQLite. For 100–250 records, a local JSON lookup is simple, loads quickly, works without a database connection, and needs no per-query OpenAI request. Each record should contain a stable ID, preferred name, aliases and spelling variants, pronunciation, short approved playful line, optional reviewed fact, and optional micro-model ID/path. Keep fruit naming and matching deterministic; if a name is ambiguous or absent, ask a brief follow-up or use the safe fallback rather than asking a model to guess.

Keep the knowledge catalogue separate from the 3D asset set. It is practical to support 100–250 fruit names and replies while shipping a smaller polished set of micro models; map less-common fruits to a clearly labeled generic fruit only when that is honest, otherwise give the visitor the personalized reply without showing the wrong fruit. Do not load 100–250 full 3D models into Quest memory just because the catalogue has that many entries.

The code already matches spoken fruit names locally in `spokenFavouriteFruit`; this parsing step does not itself need a model call. The current optional voice path can still send microphone audio to `/zinnia/transcribe`, and live spoken overrides can call `/zinnia/speech` when the selected narration bank uses the OpenAI provider. A local catalogue removes repeat model-generation calls for the fruit answer only if the answer text is selected from the catalogue. To avoid repeat speech-generation charges too, prepare approved, prerecorded lines once and bundle/cache them locally, or use the approved local narration path. If OpenAI is used to generate those recordings, that is a one-time creation cost per clip; later playback is local. Speech transcription remains a separate service and may still have a per-use cost unless a suitable on-device recognizer is selected and verified for the target browser.

Before expanding to 100–250 fruit records, define the inclusion threshold and review names, synonyms, pronunciation and every fact/joke for correctness. Keep the base experience useful without internet after the app and catalogue are cached; version the catalogue alongside the application so content and code stay compatible.

## Proposed interaction

1. Ask the existing favourite-fruit question and capture the visitor's answer.
2. Normalize and match the answer to a canonical fruit ID and aliases. Use the current parser as a starting point, with a curated catalogue for supported display names. If no supported match exists, acknowledge the answer warmly and continue without pretending a different fruit was named.
3. While Zinnia speaks, animate a small reveal gesture and show the matching micro fruit resting in or just above her open leaf hand. Keep the fruit oriented toward the visitor and large enough to recognize in headset view.
4. Say, “It's my favourite too!” Then deliver one concise, fruit-specific playful observation or joke. Keep each line kind, age-appropriate, easy to hear, and short enough not to stall the tutorial.
5. Mirror both lines as captions. Let speech and reveal animation finish cleanly before the existing conversation moves to its next step; allow the visitor to skip or continue if recognition or narration is unavailable.

## Asset and preload plan

- Create an explicit `micro-fruits` asset catalogue with canonical ID, display name, aliases, local model path, approximate display scale, preload status, and any attribution/licence details.
- Build a first polished set from the most recognizable supplied examples: apple, orange, peach, grapes, strawberry, pineapple, mango, fig, pear, banana, pomegranate, watermelon, coconut, cherry and blueberry. Add kiwi, avocado, dragon fruit and passion fruit if the initial visual pass can keep their silhouettes distinct at miniature size.
- Produce optimized, standalone whole-fruit GLBs that match the reference style. Treat the supplied pictures as art direction; do not use a flat sprite as the final hand-held object. Reuse existing project fruit models only when their appearance, scale, origin, license and size meet this feature's needs.
- Keep the models intentionally small and consistent in presentation. Reduce geometry and texture sizes for Quest, share materials or atlases where practical, and set clear pivots so each fruit sits naturally in Zinnia's hand.
- Load the small JSON catalogue with the app so name matching and text selection are immediate and available without a model request. Preload only the supported micro-fruit assets before the visitor reaches the favourite-fruit question. Download and parse compact assets early, then keep reusable scene-ready models cached for the response. Track total transfer and decoded/GPU memory so loading the asset set does not create a hitch or consume excessive Quest memory.
- Keep a lightweight fallback response if a model fails to load. Do not delay the welcome flow indefinitely for an asset.

## Content plan

Write one short line per supported fruit, reviewed for accuracy and wordplay. The line should connect to a recognizable trait without making a health claim. Examples of the intended tone: a star-fruit line about carrying a little star inside; a grape line about being a whole bunch of fun; a banana line about bringing its own peel-away joke. These are tone examples, not approved final narration.

## Implementation sequence

1. Finalize the supported fruit list, pronunciation, aliases and playful response copy.
2. Confirm the Zinnia hand pose/socket and the response moment in the welcome conversation, keeping the feature opt-in to this question.
3. Create and optimize the micro models; record source and redistribution rights in the existing welcome-practice asset credits.
4. Add the catalogue and preload/cache path, then connect the canonical fruit answer to the reveal, shared favourite line, fruit-specific line and captions.
5. Preview every fruit against Zinnia's hand and verify fallback, timing, visibility, memory use and conversation continuation in desktop preview and an XR harness.
6. After implementation is approved and complete, bump `VERSION` in `app/services/buildInfo.js` by `0.0001` and verify the welcome screen displays it. Test the interaction on the target Quest before calling the headset experience complete.

## Acceptance checks

- Supported names and aliases select the correct fruit model and line, including plural and conversational answers.
- Unsupported answers do not spawn a misleading fruit and do not block the tutorial.
- The fruit appears in Zinnia's hand, faces the visitor, remains visible at normal viewing distance, and leaves cleanly after the reply.
- Spoken audio, captions, reveal motion and tutorial progression agree and do not overlap the next lesson.
- The complete name/reply catalogue is available locally; only supported micro-fruit models are preloaded, without a visible pause at the question.
- Fruit matching and reply selection make no per-query OpenAI request; any remaining transcription or audio generation cost is reported separately.
- A missing asset still gives a usable response.
- The Quest build stays within its agreed asset and memory budget, and the feature is verified on the headset.

## Deferred from this plan

This is a preparation document and reference-asset filing only. It does not create production models, alter tutorial flow, add narration, or preload anything at runtime.
