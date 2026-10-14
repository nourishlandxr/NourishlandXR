# Welcome practice fruit

Controller guides use the official `@webxr-input-profiles/assets` 1.0.20 Quest Touch Plus and Oculus Touch v3 models and profiles from [Immersive Web input profiles](https://github.com/immersive-web/webxr-input-profiles/tree/main/packages/assets), under the [bundled MIT license](controllers/LICENSE.md). Their component transforms align highlights and pressed animations with grip-space poses. Unsupported profiles retain captions and input practice without guessed button locations.

Models supplied by the project owner. Original files remain unchanged.

## Interactive peel and bite models

- Banana Peel — Nauman Hameed. [Original model](https://sketchfab.com/3d-models/banana-peel-3604a883a5c54bc28707253542139deb), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Owner-supplied `banana_peel (1).glb`. Authored skin animation baked to 16 interpolated morph poses; base-colour texture resized to 512 pixels and JPEG encoded. This replaces the scanned banana in the tutorial, preserving the full fruit and peel surfaces.
- Red Stylized Apples — Eleanie. [Original model](https://sketchfab.com/3d-models/red-stylized-apples-f3616642b74e46648586dfa008ece9ad), [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). Owner-supplied `red_stylized_apples (1).glb`. Matching whole, bitten and half states extracted with shared scale and supporting base; base-colour textures resized to 512 pixels and JPEG encoded, unused texture channels removed. Commercial use requires separate permission.

`interactive-fruit/manifest.json` records original hashes and runtime sizes. Regenerate with `tools/prepare-interactive-fruit.mjs`; the runtime does not load the original 32 MB apple pack. The apple crunch is synthesized at interaction time and introduces no recorded narration.

The second and third eaten apple states are adaptations of Eleanie’s supplied bitten mesh. Additional spherical cavities are carved offline by `tools/fruit-bite-geometry.mjs`, with fresh flesh surfaces and welded vertices. They retain the original attribution, shared fruit origin, and CC BY-NC 4.0 licence; they are not additional authored source models. The supplied sliced, peeled and rotten variants are not presented as bite stages.

- Cara Cara Orange — inciprocal. [Original model](https://sketchfab.com/3d-models/cara-cara-orange-ad325912dc614f1596d2dad2d64524eb). Original metadata: Sketchfab Standard license. Tabletop derivative uses reduced texture resolution.
- Lime (Game Ready / 2K PBR) — Meerschaum Digital. [Original model](https://sketchfab.com/3d-models/lime-game-ready-2k-pbr-d879c2985526427b96a39733dc2a075c). [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Tabletop derivative uses reduced texture resolution and JPEG encoding.
- Banana 3D Scan — Arkify 3D. [Original model](https://sketchfab.com/3d-models/banana-3d-scan-b9214be998c746409dafa3755150fe8e). Original metadata: Sketchfab Standard license. Tabletop derivative uses mesh decimation and the complete source base-colour scan at 2K.

The wood grain, tabletop, basket, remote, strawberry foliage, flowers and seed packet are procedural project assets. Zinnia narration uses the approved V10 American female voice (Ava Multilingual Neural), generated at native 24 kHz / 96 kbps and gently de-essed, then encoded as 128 kbps MP3 for deployment. The speech service rejected native 128 kbps; encoding does not add source detail. Her name is not spoken. The script is maintained in `app/services/welcomePracticeContent.js`. Narration can be disabled in Sound settings or with Voice off during welcome practice; captions remain.

## Welcome dragonfly
Dragonfly — 7SkyArtist. [Original model](https://sketchfab.com/3d-models/dragonfly-3cbbe9177ae24f1a8ca953ca7eb8bb86), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Supplied by the project owner, then simplified and texture optimized for XR. Four independent hinges animate the supplied wing surfaces.

Strawberry — RISD Nature Lab. [Original model](https://sketchfab.com/3d-models/strawberry-a32a74b2b306478dbece5a79c5e5cf23), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Supplied by the project owner. Runtime derivative: 9,090 triangles with a 1K texture. Three harvest instances share geometry and texture.

The seed packet picture is the strawberry reference image supplied by the project owner. `runtime-models.json` records original hashes and derivative sizes. The procedural dragonfly generator is retained for the fallback model.

The welcome collection includes lightweight derivatives of the existing Fruit Discovery Window carambola, African peach, mamey sapote and Chinese bayberry assets. `tropical-runtime-models.json` records the source paths and budgets. Five shared bayberry instances, a procedural cut stem and leaves form one grabbable sprig. Updated controller and flight guidance uses the same approved Zinnia voice with a slight 3 percent pace reduction.

## Zinnia character

The authored prototype 06 organic-face model is restored from the “Fix living frame wheel alignment” chat, including varied pastel petals, attached leaf hands, the refined stem and expressive eye and mouth morphs. `zinnia.glb` is byte-for-byte identical to `zinnia-prototype/organic-face/zinnia-organic-face.glb`. Source fingerprint: `zinnia-source.json`. The animation integration retains authored motion and adds narration-driven expressions, task gaze, pointing and celebration.

## Photorealistic fruit tutorial collection

Whole and cut derivatives were extracted from owner-supplied `apples.glb`, `figs.glb`, `pomegranate.glb`, `mango__cut_half_mango_fruit.glb`, `peach_pack (1).glb`, and `220903yangtao-averrhoa_carambola-2in1.glb`. Original downloads are preserved. Geometry is simplified; textures use WebP at a maximum 1024-pixel edge. Older specular/glossiness materials are converted for the runtime. `fruit-collection/manifest.json` lists derivative file sizes.

Peach Pack — sligocreatures. [Original model](https://sketchfab.com/3d-models/peach-pack-f174ed3f656145cdac16ba95f30c176f). [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). Whole/half extraction and texture/geometry optimisation are adaptations. Commercial use requires separate permission. Apple and fig also carry CC BY-NC 4.0 licences. The embedded source metadata supplies authorship and licences for all six packs:

The updated basket/grab/fruit dialogue and short fruit reactions are bundled AI-generated OpenAI Coral recordings. They are generated once and played locally, without per-play speech API calls.

### Embedded source attribution

- Peach Pack — sligocreatures (https://sketchfab.com/sligocreatures). [Source](https://sketchfab.com/3d-models/peach-pack-f174ed3f656145cdac16ba95f30c176f). CC-BY-NC-4.0 (http://creativecommons.org/licenses/by-nc/4.0/). Whole/cut extraction, material conversion, geometry simplification and texture resizing.
- Figs — sligocreatures (https://sketchfab.com/sligocreatures). [Source](https://sketchfab.com/3d-models/figs-aaa548686dfd4cfe956d13e4468770b0). CC-BY-NC-4.0 (http://creativecommons.org/licenses/by-nc/4.0/). Whole/cut extraction, material conversion, geometry simplification and texture resizing.
- Mango & Cut Half Mango Fruit — Kami Rapacz (https://sketchfab.com/kuroderuta). [Source](https://sketchfab.com/3d-models/mango-cut-half-mango-fruit-6407b7f81f7c4c4aa443c850cc997b44). CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). Whole/cut extraction, material conversion, geometry simplification and texture resizing.
- Pomegranate — sligocreatures (https://sketchfab.com/sligocreatures). [Source](https://sketchfab.com/3d-models/pomegranate-bccffb5cc08b4d65b0bbf99222701830). CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). Whole/cut extraction, material conversion, geometry simplification and texture resizing.
- Apples — sligocreatures (https://sketchfab.com/sligocreatures). [Source](https://sketchfab.com/3d-models/apples-ab57497427ea481ca09ee2acea4c76f2). CC-BY-NC-4.0 (http://creativecommons.org/licenses/by-nc/4.0/). Whole/cut extraction, material conversion, geometry simplification and texture resizing.
- 220903yangtao-Averrhoa carambola-2in1 — Andykk (https://sketchfab.com/andykwok91011). [Source](https://sketchfab.com/3d-models/220903yangtao-averrhoa-carambola-2in1-49fca165aa2646e4a90c0c4a1a1cb149). CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). Whole/cut extraction, material conversion, geometry simplification and texture resizing.
