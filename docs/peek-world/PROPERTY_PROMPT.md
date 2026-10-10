# Property painting v1

Mode: built-in image generation tool, reference-based style transfer.
Reference: the user's supplied property/video screenshot, 10 October 2026.
Saved asset: `property-painting-v1.png`. The reference screenshot was not overwritten.

## Exact generation prompt

Use case: style-transfer. Asset type: clean landscape painting for a spatial XR peek window. The input is the user's actual terraced food-forest property and is the identity/composition reference. Create a high-resolution wide 16:9 environmental painting that remains almost photographic: detailed natural vegetation, accurate light and credible materials with very restrained fine oil-paint brushwork, atmospheric depth and subtle artistic edges. Preserve this recognisable property and camera viewpoint: the modest low timber veranda house with pale corrugated roof is on the LEFT, partly nestled within dense mature foliage; terraced grassy/mulched slopes flow down into an irregular reflective pond in the LOWER CENTRE; planted bands and a track curve down through the middle/right; large eucalyptus-like trees flank the view, the tall conifer behind the house; open green farmland, distant treelines and soft cloudy pale sky beyond. Preserve the real arrangement, proportions and topography rather than designing a different fantasy estate. Keep the house and pond clear enough to remain recognisable in a circular crop centred on the middle of the image, subtly tightening the composition if needed without moving the house to the centre. Natural darker leaf greens, dry straw grass, understated earthy textures, soft overcast daylight. Remove the entire video title, icons, orange border and video UI; render the missing scenery cleanly. Do not add new buildings, dramatic mountains, giant flowers, futuristic objects, people, text, logos, watermarks or artificial fluorescent colour. This is a painterly interpretation of this photograph, not a cartoon, polygon render or thick impasto. Output the landscape only, no depicted frame or interface.

## Spatial treatment

The generated bitmap stays unchanged. A separate 96 x 54 mesh projects it onto a
manually inferred depth field: near edge foliage, pond/slope, midground house,
distant farmland/sky. The initial viewpoint preserves the image composition.
This first relief study supports modest lean parallax; it does not reconstruct
unseen walls, branches, hidden terrain or the property's surveyed dimensions.
