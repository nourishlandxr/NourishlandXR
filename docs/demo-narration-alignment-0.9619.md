# Demo text and Zinnia narration

The prepared English demo now narrates each displayed paragraph in full. Shortened Frame text no longer selects a different, longer authored script, and runtime paragraphs no longer lose their later sentences. Continue still waits for both reading time and narration completion; pause, replay, Back and cancellation retain their existing behavior.

The recording inventory covers the authored chapter sequence, runtime narrative bodies, map placement states, Web Mode explanation (including the ten prepared plant-name variants) and the plant-choice prompt. The original 59 recordings retain their approved OpenAI Marin delivery. Another 52 paragraphs use the same provider, voice and delivery instructions. The bank activates only after all recordings are saved.

Visitor-specific plant and Note conversations continue to speak their displayed response through the existing live voice service. Action names, titles and plant reference material are not treated as a second narrated script. Translated UI remains dependent on live speech for text that differs from the English recordings.

Tutorial lesson text, tutorial audio assets and tutorial sequencing are unchanged. This is an English demo narration alignment pass, not a change to the demo's written script.

`tools/demo-narration-content.mjs` inventories narrative text from the runtime and authored content. Regression checks verify complete saved recording coverage and ensure every demo paragraph flow reads its visible copy. `tools/preview-demo-audio.html` includes both authored and runtime recordings for listening review.
