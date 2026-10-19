# Rainforest biome — Joey production brief

Status: queued for the next biome-detail pass after the current wheel work is complete.

## Intent

Create an original rainforest region that reads immediately from the hero camera while retaining enough ecological structure for close inspection in Unity XR. The rainforest should feel humid, vertically layered, biodiverse and continuous beyond the visible frame. It must avoid becoming a flat carpet of repeated green trees.

## Reference translation

| Ref | Use this quality | Production interpretation |
| --- | --- | --- |
| 01 | Irregular aerial canopy with occasional flowering color | Mix crown diameter, height, hue and density. Add one restrained seasonal-color focal crown rather than distributing bright color everywhere. |
| 02 | Dense rounded canopy punctuated by palms | Establish a largely closed canopy, then use palm crowns as readable rhythm and scale markers. |
| 03 | Emergent trees rising through mist | Add a small number of tall emergents and atmospheric depth. Do not make every tree equally tall. |
| 04 | Framed view into a layered valley | Build foreground foliage, a darker middle layer and a softened distant ridge to create perceived depth. |
| 05 | Wide spreading crown architecture | Include at least one broad umbrella-like canopy silhouette that remains identifiable from above and from the hero angle. |
| 06 | Humid palm-rich slopes receding into haze | Use overlapping terrain layers and cooler, lower-contrast distance values instead of uniform saturation. |
| 07 | Narrow river corridor cutting through canopy | Let water create a legible compositional path through the rainforest and connect it to adjoining wetland or watershed regions. |
| 08 | Mist held inside a canopy opening | Use a restrained mist pocket or humid clearing as negative space and a depth cue, never as opaque global fog. |

## Shape and composition

- Preserve a dense outer canopy but break its outline with a few emergent crowns.
- Use three readable vegetation heights: understory mass, closed canopy and sparse emergents.
- Give the biome one strong internal route: river, stream or humid ravine.
- Create one small canopy opening that allows mist, water or ground depth to be perceived.
- Form natural clusters and gaps; avoid rows, even spacing and identical rotations.
- Blend the rainforest into neighbouring biomes through moisture and elevation gradients rather than a hard border.
- Keep the central hero composition understandable at a glance. Fine species detail belongs behind the major shapes.

## Palette and atmosphere

- Base: deep blue-green and warm forest green.
- Variation: yellow-green new growth, muted olive crowns and cooler distant foliage.
- Accents: one limited flowering or fruiting color event.
- Water: subdued blue-green that remains visible through the canopy corridor.
- Lighting: humid diffuse daylight with selective highlights on upper crowns.
- Atmosphere: fine valley haze and isolated mist, with enough contrast to preserve the wheel silhouette.

## Movement

- Slow asynchronous crown movement; avoid moving the whole canopy as one surface.
- Subtle palm-frond response distinct from broadleaf motion.
- Gentle water movement along the river corridor.
- One restrained wildlife cue may cross an opening or emerge briefly above the canopy.
- Movement must support scale and life without competing with navigation or text.

## Website hero treatment

- Show a curated rainforest fragment within the perfected central world.
- Prioritize the river path, one emergent silhouette, one palm group and one atmospheric opening.
- Keep foreground detail rich while simplifying distant repetition.
- The short outward reveal may expose more canopy and terrain, but should withhold the complete biome boundary.
- Render the poster from the exact first animation frame.
- Preserve identical camera, crop, lighting and grading across poster, WebM and MP4.

## Unity XR treatment

- Separate terrain, river, mist, canopy layers, emergents, palms and understory into named groups.
- Prepare repeated vegetation for GPU instancing.
- Supply LODs for dominant tree and palm families.
- Use clustered placement and biome masks rather than thousands of unique scene objects.
- Keep collision limited to traversable terrain, major trunks, landmarks and interactive learning objects.
- Reserve highest-detail vegetation and wildlife for the user's reachable or inspectable zone.
- Validate visual richness and headset frame rate as separate acceptance gates.

## Avoid

- A single repeated tree model covering the terrain.
- Uniform bright green across every layer.
- Equal tree heights or evenly spaced palms.
- Excessive mist that hides terrain structure.
- Random colorful trees without an ecological or compositional role.
- Stock-photo textures, copied arrangements or use of the supplied watermarked imagery in a public build.

## Acceptance criteria

- Rainforest reads distinctly from the approved hero camera without a label.
- Canopy shows visible height, crown and hue variation.
- River or ravine creates a clear path through the region.
- At least one emergent and one broad crown anchor the silhouette.
- Mist creates depth while leaving the biome structure readable.
- The focused website view feels composed rather than procedurally scattered.
- Unity assets can be culled, instanced and reduced through LODs without changing the biome identity.
- The rainforest connects naturally to adjacent water and terrain systems.

## Internal reference files

1. `01-mixed-canopy-flowering-accent.jpg`
2. `02-dense-canopy-palms.jpg`
3. `03-misty-emergent-canopy.jpg`
4. `04-layered-rainforest-valley.jpg`
5. `05-broad-spreading-crown.jpg`
6. `06-humid-palm-valley.jpg`
7. `07-river-canopy-corridor.jpg`
8. `08-canopy-mist-opening.jpg`

