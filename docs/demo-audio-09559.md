# Main-demo audio — V0.9559

## Scope

54 saved English clips cover every paragraph in the authored guided demo, from INTRO 1.1 through CLOSURE 1.1. Scripts retain the current chapter copy. Tutorial recordings remain in their separate bank.

The main demo previously played Ava recordings while the tutorial used Coral. The main-demo player now selects its own Coral bank. Extra runtime guidance outside the authored chapters uses live Coral speech rather than switching to an older Ava recording. That extra guidance requires the speech service; saved chapter recordings do not.

## Recording profile

- OpenAI `gpt-4o-mini-tts`, voice `coral`.
- Australian English, calm and unhurried, gentle sentence pauses, no exaggerated acting.
- Original MP3 output, without slowing playback or applying pitch changes.
- Separate paragraph clips retain pause, replay, reading-time coordination and speech-level driven expression.
- Four decoded clips cached; the next recorded clip is prefetched.

## Build and review

`node tools/record-demo-narration.mjs --plan` lists the recording plan without synthesis. Recording supports a configured local API key or the existing Zinnia speech service. It resumes saved clips and activates the bank only after all clips have been written.

The recording source was verified identical to the publicly deployed `features/ar-demo/demoJourneyContent.js` before sending chapter text to the existing service. No visitor input, private project data or credentials are embedded in the audio assets.

Open `tools/preview-demo-audio.html` on the local preview server to review chapter text and individual recordings. Only one review clip plays at a time.

## Acceptance

Automated coverage checks require a saved Coral MP3 for every authored paragraph, and verify that unmatched demo guidance uses live speech. The full test suite, frontend build and version badge must also pass.

Human listening review remains required for pronunciation, comfortable volume and natural delivery. A Quest run is required to confirm audible narration, pause/replay and Zinnia's expression alongside the main demo.
