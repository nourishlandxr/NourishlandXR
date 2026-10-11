# Welcome practice fruit

Controller guides use the official `@webxr-input-profiles/assets` 1.0.20 Quest Touch Plus and Oculus Touch v3 models and profiles from [Immersive Web input profiles](https://github.com/immersive-web/webxr-input-profiles/tree/main/packages/assets), under the [bundled MIT license](controllers/LICENSE.md). Their component transforms align highlights and pressed animations with grip-space poses. Unsupported profiles retain captions and input practice without guessed button locations.

Models supplied by the project owner. Original files remain unchanged.

- Cara Cara Orange — inciprocal. [Original model](https://sketchfab.com/3d-models/cara-cara-orange-ad325912dc614f1596d2dad2d64524eb). Original metadata: Sketchfab Standard license. Tabletop derivative uses reduced texture resolution.
- Lime (Game Ready / 2K PBR) — Meerschaum Digital. [Original model](https://sketchfab.com/3d-models/lime-game-ready-2k-pbr-d879c2985526427b96a39733dc2a075c). [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Tabletop derivative uses reduced texture resolution and JPEG encoding.
- Banana 3D Scan — Arkify 3D. [Original model](https://sketchfab.com/3d-models/banana-3d-scan-b9214be998c746409dafa3755150fe8e). Original metadata: Sketchfab Standard license. Tabletop derivative uses mesh decimation and reduced texture resolution.

The tabletop, basket, remote, strawberry foliage, flowers and seed packet are procedural project assets. Zinnia narration uses the approved V10 American female voice (Ava Multilingual Neural), generated at native 24 kHz / 96 kbps and gently de-essed, then encoded as 128 kbps MP3 for deployment. The speech service rejected native 128 kbps; encoding does not add source detail. Her name is not spoken. The script is maintained in `app/services/welcomePracticeContent.js`. Narration can be disabled in Sound settings or with Voice off during welcome practice; captions remain.

## Welcome dragonfly
Dragonfly — 7SkyArtist. [Original model](https://sketchfab.com/3d-models/dragonfly-3cbbe9177ae24f1a8ca953ca7eb8bb86), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Supplied by the project owner, then simplified and texture optimized for XR. Four independent hinges animate the supplied wing surfaces.

Strawberry — RISD Nature Lab. [Original model](https://sketchfab.com/3d-models/strawberry-a32a74b2b306478dbece5a79c5e5cf23), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Supplied by the project owner. Runtime derivative: 9,090 triangles with a 1K texture. Three harvest instances share geometry and texture.

The seed packet picture is the strawberry reference image supplied by the project owner. `runtime-models.json` records original hashes and derivative sizes. The procedural dragonfly generator is retained for the fallback model.
