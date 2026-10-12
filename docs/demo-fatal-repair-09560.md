# Main demo repairs — V0.9560

- Controller rays and panel selection no longer depend on the hand outline/pointer setting. Tracked hands keep direct interaction.
- Narration visibility follows the immersive XR session rather than hidden DOM state. Audio unlock runs before the session request and on resume.
- The welcome uses four existing Coral recordings and professional guide/space introduction; no live-only flower-with-a-face greeting.
- Reused Zinnia is explicitly visible, with restrained demo idle sway and speech-driven expression.
- Both porch branches start inside the native rim volume.
- Automatic bee model loading is removed.
- Future paragraphs stay hidden; the current paragraph appears without the slow clipping sweep. XR paragraph fade is 180 ms.

Verification: 835 tests passed, frontend build V0.9560, diff check clean, local welcome badge V0.9560. Regression fixtures exercise XR versus DOM visibility, recorded welcome coverage, controller rays and physical rim attachment. No Quest device verification was available. Check audible narration, facial movement, controller trigger selection and rim attachment in the headset after deployment.
