# Micro-fruit reply audio

The reusable Zinnia favourite-fruit opening was generated with OpenAI `gpt-4o-mini-tts`, voice `marin`, using the project's `v14-friendly-marin-1` delivery profile. The seven fruit-specific joke clips were cut from the matching approved OpenAI recordings to retain their original voice while removing the repeated opening. The MP3s are listed in `voice-manifest.json` and live in the active welcome narration asset bank. Runtime playback uses these saved recordings instead of generating the replies again.

Regenerate with `node tools/record-micro-fruit-narration.mjs --server=https://nourishland.org/xr-api` after verifying the approved delivery profile. `--plan` lists the generation scope without contacting the speech service.
