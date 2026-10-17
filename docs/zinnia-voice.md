# Zinnia voice: custom Orbs and Notes

The second demonstration Orb uses a shared voice controller with Notes. Enable the microphone before entering Quest XR. With that permission enabled, Zinnia listens automatically after each prompt has finished playing. **Listen again** retries a turn and **Finish listening** ends a recording early. Recordings stop after a sentence pause or a maximum of 20 seconds. Only one microphone session can run at a time. Closing the experience releases its microphone tracks and cancels requests. Permission denial, a busy microphone, silence and transcription failures are reported separately.

Tutorial audio controls live in the forearm menu: tap the discreet pulse button, then Audio. The six menu icons form two columns and three rows. The menu starts closed, and tools open to its right. Main demo audio controls remain in its Control panel.

## Plant conversation

Suggest a plant or fruit, then choose among three catalogue matches. Say a name, “first”, “second”, “third”, or “more”. Preferences such as “dwarf” or “compact” filter the actual catalogue descriptions. These are matches, not claims of popularity. Confirm before the second Orb changes. Its anchored position is retained and its custom colour and arrival animation are applied.

Daleys is searched first. Its record ID preserves the selected cultivar and its description populates a sourced Plant cell directly without language-model text generation. iNaturalist species records are a fallback when Daleys has no matches or is unavailable. A photo is loaded before the profile becomes ready; a species reference substituted for an inaccessible catalogue image is labelled as such. Missing information is not invented. These profiles remain marked for review.

## Note conversation

After the second plant, dictate a Note, confirm the readback, choose green/blue/amber/rose, and confirm saving. Then place it in the scene. Existing Note controls include **Speak to Zinnia**. Cancel leaves existing Note text untouched. Notes keep the transcript as entered rather than asking a language model to rewrite it.

## Server setup

Run `tools/persistence-server.mjs` with server environment variables:

- `OPENAI_API_KEY`: configured privately on the server; never put it in the frontend or commit it.
- `NOURISHLAND_ZINNIA_VOICE_ENABLED=true`: explicit opt-in to paid voice processing.
- `NOURISHLAND_ZINNIA_DAILY_REQUESTS`: optional process-wide daily ceiling, default 300 requests (transcription and speech each count).
- `PORT` and `HOST`: local defaults 8000 and 127.0.0.1.

Frontend `/api/zinnia/capabilities` reports whether this is ready. `/api/zinnia/transcribe` accepts supported short audio and `/api/zinnia/speech` returns MP3. Hosted `/xr/` uses `/xr-api`; a custom API base can be supplied through `NOURISHLAND_CONFIG.apiBase`. Static hosting alone cannot run these routes. Remote headset access requires HTTPS and microphone permission; desktop loopback is a secure-context exception.

The current server uses OpenAI `gpt-4o-mini-transcribe` for transcription and `gpt-4o-mini-tts` with the Marin voice for speech. Tutorial, demo, and live-generated Zinnia speech share the `v14-friendly-marin-1` profile defined in `tools/zinniaVoiceServer.mjs`. Live speech is generated separately from bundled recordings, so its intonation and timing can vary slightly even though it uses the same profile. No live recordings are written to disk; speech audio is returned from the configured provider. Speech and transcription still incur charges even when Daleys supplies plant text.

The server limits input size, text length, request time, per-address request rate, and total daily requests; checks request origin; and never returns provider keys/errors. Counters are in memory and reset on restart. Production public access needs persistent shared quotas or gateway limits before a wider rollout, particularly across multiple instances. The current guided dialogue uses explicit supported choices, not an unrestricted conversational assistant. App-wide settings/help commands and model training are separate future work.

## Evidence boundary

Local syntax/build and welcome version can be checked without credentials. Live server speech, transcription accuracy, real XR microphone permission, and controller activation need a configured provider and device testing. Browser speech recognition may be used where available for transcription fallback; speech output uses the saved or server-generated Zinnia audio and does not switch to the device's speech-synthesis voice. If neither the server nor browser recognition is available, the interface reports that setup is missing; it does not introduce a keyboard or claim to hear the user.
