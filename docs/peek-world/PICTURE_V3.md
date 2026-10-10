# Still picture review — V0.9466

Review: `/dist/xr/index.html?test=living-painting`.

Built-in imagegen regenerated the original `property-reference-v2.png` as a clean
photographic scene. The generated source is 1672 × 941. The runtime JPEG is a
7680 × 4320 Lanczos export of that source; it is upscaled, not native 8K detail.
Original and previous paintings are preserved. The 8K asset loads only when the
explicit picture experiment opens. Device texture limits and headset performance
remain unverified.

The experiment now uses a flat, two-triangle picture immediately behind the rim.
The circular mask reaches 0.89 m to overlap the inner frame edge; the picture
covers it without letterboxing. Texture animation and depth deformation are off.
The independent depth study retains its existing default behavior.

Local verification: six aperture views passed with zero outside-mask pixels;
still-image comparisons changed zero pixels across time; requested texture
dimensions loaded as 7680 × 4320. Six existing mechanics tests passed. Frontend
build V0.9466 passed. No production deployment or headset test was performed.

## Generation prompt

Create a restored extremely high definition 8K 7680x4320 16:9 landscape photograph
from this original property photo. Preserve the exact viewpoint, composition,
terrain, house on left, pond lower centre, terraced food forest, open farmland and
overcast sky. Remove all video interface, text, icons and orange border;
reconstruct scenery in those areas. Natural photographic detail with coherent
individual leaves, plausible branching, corrugated roof and veranda structure,
fine grasses, clean water reflections. Correct smeared or repeated foliage,
unnatural artifacts, warped building details, halos and painterly blobs. Natural
dark rainforest greens, understated earth tones and soft daylight. No new
buildings, people, text, stylized painting or invented fantasy elements. Output
the landscape alone edge to edge. Request actual 7680x4320 pixels if supported.
