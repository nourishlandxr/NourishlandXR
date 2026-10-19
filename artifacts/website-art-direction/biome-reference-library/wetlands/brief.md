# Wetlands biome — Joey production brief

Status: queued for the next biome-detail pass after the current wheel work is complete.

## Intent

Create an original wetland system that visibly connects land, water and neighbouring biomes. It should read as a living hydrological network rather than a decorative pond: channels divide and reunite, water depth changes, vegetation follows moisture, and habitat structure shifts from submerged edges to flooded woodland and open water.

## Reference translation

| Ref | Use this quality | Production interpretation |
| --- | --- | --- |
| 01 | Dark winding water moving through broad forest | Use a main slow-water channel as the wetland's strongest compositional path and connection to the rainforest. |
| 02 | Dense canopy split by a narrow tidal corridor | Let vegetation press closely around selected channels, producing a clear land-water boundary and a sense of enclosed passage. Exclude the buildings, marina and boats. |
| 03 | Large marsh mosaic with branching waterways | Build irregular islands, shallow channels and reed masses at several scales; avoid one circular lake surrounded by grass. |
| 04 | Flooded forest with trunks emerging from water | Include a limited flooded-woodland pocket where water occupies the forest floor and trunks establish vertical scale. |
| 05 | Small constructed or restored wetland with reed shelves | Use shallow shelves, exposed damp margins and emergent plants to show water-depth transitions. Exclude paths and urban landscaping unless needed in an educational restoration example. |
| 06 | Open reflective pond framed by emergent vegetation | Reserve one calm-water opening for sky reflection, wildlife activity and a visual pause between dense habitat zones. |
| 07 | Clear open water, rock edge and distant terrain reflection | Use only its reflection, shoreline legibility and calm surface cues. Do not turn the wetland into an alpine lake or introduce unrelated conifer/mountain scenery. |

## Hydrology and composition

- Establish one primary water route that visibly connects into the rainforest river corridor.
- Branch it into smaller channels, pools, saturated ground and vegetated islands.
- Vary water depth through color, clarity, plant type and shoreline profile.
- Use irregular shorelines with coves, narrow passages and broad shallow shelves.
- Include one open reflective pool as visual breathing space.
- Include one flooded-forest pocket and one reed- or sedge-dominant marsh pocket.
- Let some channels disappear beneath vegetation and reappear elsewhere to imply a larger connected system.
- Blend into neighbouring terrain through moisture gradients, not a hard blue border.

## Vegetation structure

- Submerged and floating vegetation in sheltered water.
- Emergent reeds, sedges and rushes along shallow shelves.
- Low wet meadow or damp groundcover beyond the immediate waterline.
- Shrubs and water-tolerant trees on islands and elevated margins.
- Flooded tree trunks in one shaded woodland zone.
- Plant density should respond visibly to depth and flow rather than being distributed at random.

## Palette and atmosphere

- Water ranges from dark reflective channels to muted blue-green open pools.
- Marsh vegetation combines deep green, yellow-green, olive and restrained seasonal ochre.
- Mud and shallow shelves use subdued earth colors; avoid bright uniform sand rings.
- Reflections should mirror sky and nearby vegetation without becoming chrome-like.
- Use slight low-lying humidity or morning haze where the wetland meets forest.
- Preserve enough open water and tonal contrast for the system to read from the hero camera.

## Movement and wildlife cues

- Slow directional flow or surface drift in connecting channels.
- Fine ripples and occasional reflection breakup in open water.
- Gentle independent motion in reeds and sedges.
- One or two small wildlife events: a wading bird arrival, frog ripple, fish disturbance or insect movement.
- Wildlife should reveal habitat function, not fill the scene with simultaneous activity.

## Website hero treatment

- Place a compact wetland transition within the perfected central world.
- Make the main channel readable immediately as it enters or leaves the rainforest.
- Show one reflective opening and one vegetated island or reed shelf.
- Use the outward reveal to hint at branching marsh channels beyond the initial frame.
- Maintain the same first-frame poster, video camera, lighting and grading contract as the master hero.
- Keep motion subtle enough that reflections and habitat structure remain legible behind the interface.

## Unity XR treatment

- Separate water bodies, flow paths, depth zones, islands, mud shelves, flooded trees and plant communities into named groups.
- Provide shallow-water and deep-water material zones with a shared visual language.
- Instance repeated reeds, sedges and wetland plants in clusters.
- Use simplified collision for shorelines, islands, major trunks and reachable learning points.
- Reserve animated water, interactive wildlife and close plant detail for reachable areas.
- Expose hydrology anchors so IMAP and learning content can identify source, flow, habitat and downstream connections.
- Validate reflections, transparency and overdraw on the target Quest hardware.

## Avoid

- A single circular blue pond.
- Uniform reeds placed around every shoreline.
- Identical water color and depth across the system.
- Hard biome borders or water channels that terminate without explanation.
- Excessive mirror reflections, transparency layers or animated wildlife.
- Marina, buildings, boats, alpine conifers or mountain scenery copied from the references.
- Use of supplied photographs as public textures or direct scene backplates.

## Acceptance criteria

- Wetlands read distinctly from the hero camera without a label.
- The principal water route visibly connects with at least one neighbouring biome.
- Open water, marsh, shallow shelf and flooded woodland are distinguishable.
- Vegetation distribution communicates moisture and depth.
- Reflections add calmness and depth without obscuring the water structure.
- The website view remains compositionally simple while suggesting a wider channel network.
- Unity assets can be instanced, culled and assigned depth-aware interactions.
- The system supports future IMAP markers and educational stories about water flow, habitat and restoration.

## Internal reference files

1. `01-forest-water-corridor.jpg`
2. `02-enclosed-tidal-channel.jpg`
3. `03-branching-marsh-mosaic.jpg`
4. `04-flooded-forest.jpg`
5. `05-reed-shelf-restored-wetland.jpg`
6. `06-open-reflective-pond.jpg`
7. `07-clear-water-rock-shore.jpg`

