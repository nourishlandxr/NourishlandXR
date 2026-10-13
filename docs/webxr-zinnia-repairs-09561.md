# WebXR Zinnia and tutorial palette — V0.9561

- Preserved both active OpenAI Coral banks (59 tutorial clips, 54 demo clips). The recovered Ava V10 is a delivery reference, not a restored active bank.
- Added a separate OpenAI review generator and opt-in hosted `delivery: v10` preset. Candidate recordings never activate a bank. A hosted route backup was retained; the existing hosted default stayed unchanged.
- Demo animation uses its own voice state instead of a stale shared paused owner. Speech energy uses a wider sample window and lower silence threshold for quiet speech. This is audio-reactive expression, not phoneme alignment.
- Removing the tutorial arrival shell now restores original material opacity and visibility before transferring Zinnia to the demo.
- Current paragraphs render at full opacity, without the gray fade. Empty/future DOM paragraphs are explicitly hidden; current centered paragraphs are marked consistently.
- Tutorial paint mode uses a smaller square palette with four brush icons, eight colour swatches, undo/clear and fine/bold controls. Accessible names and aim hints identify the tools; selection has an outline and check mark in XR.

Evidence: 835 tests passed before the hosted preview option; syntax checked after it. Local frontend V0.9561 built, local palette brush selection verified. OpenAI candidate MP3 decoded successfully. Quest expression/text/controller verification remains a device check. Voice bank regeneration awaits listening approval of the new sample.
