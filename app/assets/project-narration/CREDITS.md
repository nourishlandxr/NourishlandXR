# Zinnia guided narration

These English recordings extend the approved Zinnia voice from the welcome tutorial through the Living Frame guided journey, alternate screens, placement and map instructions.

Voice: Ava Multilingual Neural (`en-US-AvaMultilingualNeural`), natural pitch and normal rate, matching the approved V10 welcome voice. Source: native 24 kHz speech, gently processed with the same 65 Hz high pass and de-esser, encoded to mono 128 kbps MP3. Encoding does not add source detail.

Scripts come from the existing project guidance. Text remains visible. Narration is controlled by the shared Sound settings and can be replayed. Only the current clip and next clip are fetched; decoded audio is limited to four cached clips. Screen changes cancel playback; hiding the app pauses it. English recordings are not played over translated text.

Rebuild: install the script parser with `npm install --prefix .tmp/narration-tools --no-audit --no-fund acorn`, run `node tools/build-project-narration.mjs`, then `python tools/render-project-narration.py` with the `edge_tts` package and ffmpeg available. `NXR_SPEECH_RUNTIME` may name an existing package directory. The generated catalog matches normalized exact text, so new prose needs a new recording rather than borrowing an unrelated clip.
