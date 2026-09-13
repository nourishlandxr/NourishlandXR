# LIM eight-face migration

Phase 7 retains the 93 source LIM cells and their companion text. The four existing roots keep their stable IDs and gain the approved visible titles. Four new roots complete the eight-face structure. LIM remains separate from the Plant Information Mesh.

## Canonical faces

| Stable face ID | Visible title | Accent | Source cells |
| --- | --- | --- | ---: |
| `lim-climate` | Climate and Place | `#6978b8` | 25 |
| `lim-food-forest` | Living Landscapes | `#a06a43` | 20 |
| `lim-plant` | Plants and Life | `#719b62` | 13 |
| `lim-pin` | Place and Observation | `#9a9460` | 11 |
| `lim-uses-making` | Uses and Making | `#bd7659` | 4 |
| `lim-origins-culture` | Origins and Culture | `#8d75a5` | 5 |
| `lim-wildlife-relationships` | Wildlife and Relationships | `#5f9681` | 7 |
| `lim-discovery-pathways` | Discovery and Pathways | `#4f879e` | 8 |

The counts total 93 retained source cells. The four new face roots bring the canonical runtime inventory to 97 unique IDs.

## Primary mapping rules

- Climate source cells remain under `lim-climate`.
- Food-forest layers, light and landscape function remain under `lim-food-forest`; the Plant layer subtree moves there as its primary face.
- Plant identity, propagation and soil remain under `lim-plant`.
- Pin place, specimen and observation records remain under `lim-pin` unless a more specific face below applies.
- Harvest, yield and method map to `lim-uses-making`.
- Range and story map to `lim-origins-culture`.
- Ecology, habitat, soil relationships and soil-life map to `lim-wildlife-relationships`.
- Learning, problem, action, note, task and data map to `lim-discovery-pathways`.

Each source cell retains its original `parentId`, group, title metadata and accent as legacy fields. A cell has one `primaryFaceId`; cross-face meaning is represented by `relatedFaceIds` rather than duplicate cells.

## Compatibility aliases

The runtime adapter accepts the earlier group values `climate`, `food-forest`, `plant` and `pin`, the interim face keys such as `climate-place`, and the interim `lim-face-*` IDs. It returns a normalized copy using the canonical face IDs and does not rewrite stored project records. Reapplying the adapter produces the same result.

## Related-face references

The following 64 cells carry 84 explicit related-face references. The authoritative target IDs are stored in `RELATED_FACE_IDS` and supplemented with the original face when a cell moved from its legacy group.

- Climate and Place: `lim-climate`, `lim-climate-subtropical-frost-tolerance`, `lim-climate-subtropical-seasonal-growth`, `lim-climate-subtropical-suitable-plants`, `lim-climate-subtropical-planting-conditions`, `lim-climate-tropical-rainfall`, `lim-climate-tropical-growth`, `lim-climate-temperate-seasons`, `lim-climate-temperate-frost`, `lim-climate-temperate-dormancy`, `lim-climate-cool-shelter`, `lim-climate-cool-wind-exposure`, `lim-climate-dry-water-needs`, `lim-climate-dry-soil-cover`, `lim-climate-humid-airflow`.
- Living Landscapes: `lim-food-forest`, `lim-food-forest-layers`, `lim-food-forest-layers-roots`, `lim-food-forest-function`, `lim-food-forest-function-yield`, `lim-food-forest-light`, `lim-plant-layer`, `lim-plant-layer-evergreen`, `lim-plant-layer-mature-size`, `lim-plant-layer-form`, `lim-pin-specimen-canopy-layer`.
- Plants and Life: `lim-plant`, `lim-plant-identity`, `lim-plant-propagation`, `lim-plant-soil`.
- Place and Observation: `lim-pin`, `lim-pin-place`, `lim-pin-place-photo`, `lim-pin-specimen`, `lim-pin-specimen-genus`, `lim-pin-specimen-variety`, `lim-pin-observation`, `lim-pin-observation-condition`, `lim-pin-observation-growth`, `lim-pin-observation-fruiting`.
- Uses and Making: `lim-plant-harvest`, `lim-plant-harvest-fruit`, `lim-plant-harvest-flower`, `lim-plant-harvest-season`.
- Origins and Culture: `lim-plant-range`, `lim-plant-range-warmth`, `lim-plant-range-latitude`, `lim-plant-range-exposure`, `lim-pin-place-story`.
- Wildlife and Relationships: `lim-food-forest-function-habitat`, `lim-food-forest-function-soil-relationships`, `lim-food-forest-ecology`, `lim-food-forest-ecology-companions`, `lim-food-forest-ecology-pollinators`, `lim-food-forest-ecology-soil-life`, `lim-plant-soil-soil-life`.
- Discovery and Pathways: `lim-pin-place-learning`, `lim-pin-observation-problem`, `lim-pin-observation-action`, `lim-pin-note`, `lim-pin-note-task`, `lim-pin-note-data`, `lim-pin-note-learning`, `lim-pin-specimen-method`.

## Confirmed editorial mappings

Phase 8 confirms the six previously uncertain records. Their companion content
is unchanged; only ownership and related-face metadata are finalized.

| Cell ID | Primary face | Related faces |
| --- | --- | --- |
| `lim-climate-subtropical-suitable-plants` | `lim-climate` | `lim-plant`, `lim-food-forest` |
| `lim-climate-subtropical-planting-conditions` | `lim-climate` | `lim-food-forest`, `lim-plant` |
| `lim-food-forest-function-yield` | `lim-food-forest` | `lim-uses-making` |
| `lim-plant-harvest-flower` | `lim-uses-making` | `lim-plant`, `lim-wildlife-relationships` |
| `lim-pin-specimen-canopy-layer` | `lim-food-forest` | `lim-pin`, `lim-plant` |
| `lim-pin-specimen-method` | `lim-discovery-pathways` | `lim-pin`, `lim-plant` |

The runtime review collection is now empty because all six records have an
approved primary face.

## Future pathways

Phase 7 defines a versioned pathway schema and an empty pathway collection. Each LIM cell has an empty `pathwayRefs` list. No pathway order, locks, quiz, achievement or automatic progression is active.
