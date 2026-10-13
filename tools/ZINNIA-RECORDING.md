# Zinnia recording

The supported replacement is OpenAI's Audio Speech API, using `gpt-4o-mini-tts` and `coral`, matching the live speech route. This changes the previous Ava voice: regenerate the whole tutorial together so stages do not mix voices.

1. Use your configured Node server without copying its key: `node tools/record-zinnia-narration.mjs --server=https://nourishland.org/xr-api`. The server must have speech enabled. Requests are paced below its per-minute limit.

Alternatively, configure `OPENAI_API_KEY` in the local process environment with API billing enabled. Never commit it.
2. Run `node tools/record-zinnia-narration.mjs --plan` to see the scope without making paid requests.
3. Run `node tools/record-zinnia-narration.mjs`. Generation uses paid API requests once; saved tutorial playback requires no API call.
4. The recorder resumes saved clips and activates the new bank only after every clip is complete. Failures leave the existing bank active.
5. Increment `app/services/buildInfo.js`, build, and review the welcome narration, fruit pickup, cutting, pause and replay before deployment.

Old audio is retained. Dynamic personalised speech uses the same Coral voice only after the Coral tutorial bank is active. If live speech fails, captions remain; device speech is never substituted.

Official API documentation: https://developers.openai.com/api/docs/guides/text-to-speech

## Refined OpenAI V10 delivery

Tutorial and demo recorders import one profile from `tools/zinniaVoiceServer.mjs`. The hosted route returns `X-Zinnia-Delivery: v10-refined-1`; recorders reject a successful response with the wrong profile marker. The bank hash includes the delivery instructions, so existing basic recordings are not reused. Each active bank records its instructions and delivery version. Live replies use the same delivery.

V10 is a delivery reference, not an Ava clone. OpenAI Coral keeps normal playback rate; the prompt asks for lighter conversational delivery, connected clauses and gently released word endings. Background music and short echo remain separate from the saved voice recordings.
