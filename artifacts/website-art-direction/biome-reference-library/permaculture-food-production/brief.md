# Permaculture and food production — Joey production brief

Status: queued for the next biome-detail pass after the current wheel work is complete.

## Locked spatial decisions

- **Northwest:** rice paddies formed as contour-following terraces.
- **Northeast:** Sepp Holzer-inspired swales, linked lakes and productive terraces.
- **South:** preserve exposure to beneficial southern winds. Do not close this edge with continuous windbreak planting.
- Remove the **two existing horizontal lines of trees** from the production zone.
- Replace those two lines with readable landforming: contour banks, terraces, shallow swales and planted level changes.
- Water must move visibly through the complete system, following natural slope and maximizing infiltration before safe overflow reaches the wetlands.

These are design constraints for the Nourishland wheel. Construction-ready water earthworks require surveyed contours, catchment calculations, soil infiltration testing, rainfall data and engineered spillway review.

## Intent

Create a productive landscape that looks ecologically organized and worked by people without resembling an industrial farm. The terrain should explain how water, contour, shelter, access and layered planting cooperate. From the hero camera, the rice terraces and lake-swale sequence should provide clear geometry against the organic rainforest and wetland forms.

## Reference translation

| Ref | Use this quality | Production interpretation |
| --- | --- | --- |
| 01 | Soft contour terraces with mixed vegetation | Use curved landform bands and planted risers rather than straight horizontal tree barriers. |
| 02 | Water-filled rice terraces following complex contours | Shape northwest paddies as irregular connected cells with visible level changes and controlled water transfer. |
| 03 | Productive hillside terraces integrated into surrounding forest | Blend cultivated terraces into existing slope and vegetation instead of flattening the whole zone. |
| 04 | Banana-lined productive corridor with low central crop | Use tall productive plants as partial shelter and spatial framing while keeping useful openings. |
| 05 | Dense alley cropping and layered food production | Combine annual beds, shrubs and tree crops in bands with accessible working paths. |
| 06 | Curving productive path through mixed tree crops | Use access routes that follow contour and connect zones without rigid grids. |
| 07 | Linked lakes embedded in productive mountain terrain | Inspire the northeast water sequence: several connected water levels surrounded by productive planting. Exclude copied buildings and conifer scenery. |
| 08 | Multiple narrow ponds separated by planted banks | Use planted pond walls, overflow connections and several water bodies rather than one ornamental lake. |
| 09 | Serpentine pick-your-own concept | Use only the idea of a legible visitor route through productive beds; do not reproduce the diagram or text. |
| 10 | Contour crop rows with strong color and texture rhythm | Use diverse crop bands to make contour and production visible from the hero camera. Avoid copying the exact generated scene. |

## Landform and orientation

### Northwest rice paddies

- Form a stepped family of shallow paddies aligned to local contours.
- Vary cell size and curvature so the system reads as terrain-responsive.
- Show inlet, transfer and overflow relationships between levels.
- Retain planted banks for stability, habitat and strong aerial readability.
- Connect the lowest controlled outflow toward the broader wetland system.

### Northeast lake and swale landscape

- Use a linked sequence of lakes or ponds at descending elevations.
- Place swales broadly on contour to intercept runoff and hydrate productive slopes.
- Give every water body a visible inlet, controlled overflow and downstream destination.
- Surround water with mixed orchards, terraces, habitat planting and accessible paths.
- Shape the area as a continuous productive water landscape, not isolated ponds.

### Southern edge and wind

- Keep the southern side visually and aerodynamically open enough to admit beneficial southern winds.
- Avoid continuous dense windbreak walls across this edge.
- If shelter is needed, use broken clusters, low vegetation or porous staggered planting outside the primary airflow opening.
- Confirm north orientation in the master scene before final placement.

### Remove two horizontal tree lines

- Delete the two straight horizontal rows currently dividing the food-production zone.
- Replace their structural function with contour terraces, shallow swales and planted banks.
- Preserve views and airflow across the landforms.
- Reuse selected trees as irregular clusters, orchard groups or contour accents where they support the system.

## Water logic

- Begin with the visible high point and natural drainage direction.
- Slow water high in the landscape before allowing it to descend.
- Spread water laterally along contour where appropriate.
- Sink water into swales, planted banks, terraces and soil before overflow.
- Store water in the northeast linked lakes and northwest paddies.
- Move overflow through stable, visible spillways rather than arbitrary blue lines.
- Route final clean overflow into the wetland network.
- Avoid dead-end channels, uphill flow, disconnected ponds and identical water levels.
- Make the sequence understandable visually: **catch → slow → spread → sink → store → overflow → wetland**.

## Planting structure

- Mixed orchard clusters on suitable terraces.
- Layered food-forest edges linking production to rainforest structure.
- Banana or other broadleaf productive corridors in humid sheltered areas.
- Annual and perennial crop bands that follow landform.
- Low groundcovers and stabilizing plants on terrace faces and swale banks.
- Open working areas and access routes between intensive planting zones.
- Avoid uniform monoculture blocks and evenly repeated crop assets.

## Palette and visual rhythm

- Use water reflections to punctuate productive green bands.
- Differentiate rice, annual beds, orchards and food forest through plant height, texture and restrained color shifts.
- Let soil and mulch remain visible in active production areas.
- Use curved terraces and crop bands as graphic forms readable from the website hero angle.
- Keep the overall palette compatible with rainforest and wetlands while making human stewardship evident.

## Movement and learning cues

- Subtle water transfer between selected terrace or pond levels.
- Small crop and broadleaf motion responding to wind without synchronizing every plant.
- Limited signs of stewardship: a person on a path, small hand-scale activity or seasonal harvest cue.
- Future learning anchors should explain contour, infiltration, polyculture, rice-water management and overflow connections.

## Website hero treatment

- Reveal only a composed portion of the productive system from the central view.
- Ensure at least one rice terrace reflection and one northeast lake or swale curve can be glimpsed during the outward animation.
- Use the geometry of terraces and water to contrast with the rainforest canopy.
- Preserve the open southern sector; do not fill it merely to increase visual density.
- Keep working paths, crops and water readable without presenting every production element at once.

## Unity XR treatment

- Separate rice cells, terrace banks, swales, ponds, spillways, paths, crop bands, orchard groups and food-forest edges into named objects or data groups.
- Encode water-level order and flow direction as metadata for future animation and IMAP explanation.
- Prepare repeated crops and orchard assets for instancing and LODs.
- Keep physical collision simple on terrace edges, banks, bridges and visitor paths.
- Allow seasonal crop materials or variants without rebuilding terrain.
- Provide anchors for interactive lessons about slope, water retention, food systems and landscape design.

## Avoid

- Reinstating continuous southern windbreaks.
- Keeping the two straight horizontal tree rows.
- Decorative swales that cross contours without terrain logic.
- Water running uphill or ponds without spillways.
- One oversized lake replacing the linked system.
- Perfectly parallel industrial crop strips.
- Dense vegetation that hides all productive landform.
- Copying buildings, diagrams, text, watermarks or exact arrangements from the supplied references.

## Acceptance criteria

- Northwest rice paddies and northeast lake-swale system are correctly oriented in the master scene.
- Southern wind access remains visibly open.
- The two horizontal tree lines are gone and replaced by legible contour landforming.
- Water movement can be traced from upper catchment through storage and infiltration to wetland overflow.
- Terraces visibly follow slope rather than an arbitrary screen-space grid.
- Production includes multiple layers and crop structures, not a monoculture.
- The website crop remains readable and enticing at hero scale.
- Unity objects and metadata support later water animation, IMAP markers and educational interaction.

## Information needed before detailed implementation

- Confirmed north arrow and current wheel orientation.
- Terrain elevation or contour representation.
- Intended high and low drainage points.
- Approximate rainfall/climate scenario represented.
- Final positions of adjacent rainforest and wetlands.
- Whether the rice system is permanently flooded, seasonal or demonstration-scale.

## Internal reference files

1. `01-soft-contour-terraces.jpg`
2. `02-water-filled-rice-terraces.jpg`
3. `03-hillside-production-terraces.jpg`
4. `04-banana-productive-corridor.jpg`
5. `05-layered-alley-cropping.jpg`
6. `06-curving-food-forest-path.jpg`
7. `07-linked-lakes-productive-landscape.jpg`
8. `08-planted-banks-multiple-ponds.jpg`
9. `09-serpentine-visitor-production-concept.jpg`
10. `10-contour-crop-bands.jpg`

