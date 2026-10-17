# Zinnia narration recording

The active tutorial, demo, and live-speech profile is defined once in `tools/zinniaVoiceServer.mjs`:

- Voice: OpenAI Marin
- Model: `gpt-4o-mini-tts`
- Delivery: `v14-friendly-marin-1`

The tutorial and demo recorders import this profile. The hosted `/zinnia/speech` route uses it too and returns the delivery identifier in `X-Zinnia-Delivery`. Do not pass a separate voice or delivery value to create a new narration bank.

## Record a bank

Use the authenticated speech server so no API key enters the workspace:

```powershell
node tools/record-zinnia-narration.mjs --plan
node tools/record-zinnia-narration.mjs --server=https://nourishland.org/xr-api
node tools/record-demo-narration.mjs --plan
node tools/record-demo-narration.mjs --server=https://nourishland.org/xr-api
```

Recording makes paid speech requests. The scripts pace requests, resume valid saved files, and activate a bank only after all clips are complete. The hosted response must carry the expected delivery identifier. Local direct API recording is also supported with `OPENAI_API_KEY` configured in the process environment; never commit or paste the key.

Saved clips play locally after they are bundled. Uncatalogued tutorial replies and demo guidance use the same live Marin V14 profile, but each new synthesis can vary slightly in intonation and timing. For a line that must sound identical every time, add an approved recording to the active bank and make its catalogue text exactly match the spoken text. Do not use device speech synthesis as an alternate Zinnia voice.

After changing narration content or banks, increment `app/services/buildInfo.js` by `0.0001`, run the voice tests and frontend build, and review the welcome version before deployment. Test the saved/live transition and playback on Quest as a separate device check.

Legacy audio banks remain archived and are not selected by the active pointers: `app/services/welcomeNarrationBank.js` and `app/services/demoNarrationBank.js`.

Official API documentation: https://developers.openai.com/api/docs/guides/text-to-speech
