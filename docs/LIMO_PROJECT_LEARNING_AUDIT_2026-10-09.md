# LIMO: project learning, land interpretation and practical action

Audit and design proposal · 9 October 2026 · NourishlandXR audited local source V0.9409

**Recommendation:** make LIMO the place where someone asks a useful question about a Project, sees the relevant evidence in its Areas and plants, tries a small action, and returns to learn from the result.

This is an audit and proposed design. No NourishlandXR source, learning content, project records or release version was changed. The current desktop introduction was inspected locally. This audit does not establish deployed or physical Quest behaviour.

## The judgment

LIMO currently behaves as an organised reference collection with demonstrations of application. Its content repeatedly asks people to observe, compare, decide and revisit, but those verbs mostly remain prose. The interface rarely completes the operation it describes.

The problem is therefore deeper than breadth or graphics. A visitor can read what habitat means, but the leaf cell does not show the habitat records in this Area, help them notice a particular organism, or attach an observation to a place. A creator can read about succession, but cannot use that cell to compare a proposed planting phase against the existing Project.

Adding more branches would make this worse unless the new cells have a practical destination. Better textures and animation would make the collection more attractive while leaving its usefulness largely unchanged.

The strongest material already exists in the introductory questions. Retain that thinking, then make its operations real.

## What was actually found

| Finding | Evidence in current source or rendered UI | Implication |
|---|---|---|
| Several presentation structures coexist | 93 legacy cells; 97 public cells across eight faces; a separate 27-cell introduction with four roots | Migration compatibility is useful, but the product needs one clear public structure. Users should not have to learn different taxonomies between introductions and normal use. |
| The four introductory roots are stronger than the eight broad faces | Read Nature; Understand the Land; Design the Forest; Shape the Outcome | These contain good questions, including evidence, competition, maintenance and uncertainty. They are the material to operationalise. |
| Most normal cells are definitions | The public cell schema stores content, hierarchy, face membership and presentation metadata | It does not define a Project query, field activity, saved outcome or revisit condition. |
| One formal pathway exists | Understand This Place: seven broad topic visits | A tour through subjects is an introduction. It is too broad to be the main practical pathway. |
| Two additional demonstration packages exist | Create a food forest and Identify a native forest, each with three micro steps | These are useful starts, but their current instructions still advance through highlighted learning cells. They do not constitute a working land design or identification system. |
| Progress primarily tracks reading | `visitLimPathwayCell` records the intended cell as completed on a visit; state uses one browser storage key | “Opened” needs to be distinguished from “observed”, “recorded”, “tried” and “reviewed”. Future activity state needs Project, Site, Area and learner scope. |
| The final Note is optional and demonstrative | The demo offers completion without a Note; an existing demo Note can satisfy the placed-Note status | This is acceptable for onboarding but weak evidence that someone made a specific observation. A practical mission needs the relevant record ID and its scope. |
| A rendered branch ends without project action | Desktop: Living Landscapes → Function → Habitat shows a definition and “End of this branch” | This is the clearest expression of the current gap. The endpoint should become “Show habitat here”, “Notice this” or “Record a visit”. |
| PIMO-to-LIMO bridges already have meaningful questions | Five bridge groups cover harvest, soil purpose, design role, care and attributed knowledge | Preserve them. They should start a contextual activity rather than only select another conceptual cell. |
| The connecting-cell foundation is more capable than its demo | Canonical PIM/LIM references, provenance, contextual Project/Area scope, goal IDs and observation refs already exist | Reuse this architecture; a wholly new connection system would discard useful groundwork. |
| The demonstrated result is still a prototype | `createPlaceholderKnowledgeGenerator`, an in-memory repository, and the native demo calling resolve without contextual arguments | It is not yet a durable, evidence-based Project decision engine. Naming a Project in generated prose is insufficient. |
| Practical filtering already exists elsewhere | Area contents filter markers by layer, climate label and type; plant profiles have a layer selector | LIMO should expose the same canonical data and filtering logic. Do not build a disconnected second inventory. |
| Existing Notes can support a first practical loop | Image, checklist, task, clue, plant list and return-date/timer widgets | These can provide useful outputs, but widget interaction state is currently local storage. Shared Project observation/activity persistence needs a separate decision. |
| Whole-Project scope needs deliberate handling | The dashboard V2 loader currently selects `main_food_forest` or the first Site | A new “Whole Project” query must include all intended Sites or clearly disclose its narrower scope. |
| A plant record is not proof of an existing plant | Default Pigeon Pea reconciliation creates a draft record with `is_template: true`; placement is tracked separately | Templates, proposed plants, actual specimens and verified observations must not be mixed in “what grows here” results. |

These findings concern the reviewed source paths and local rendered introduction. They are not a claim that every production data route or saved Project was exhaustively audited.

## A clear role within NLXR

| Surface | Main responsibility | Connection |
|---|---|---|
| Project, Areas and interactive map | Where things belong and where relevant evidence can be found | Receives LIMO highlights and opens the relevant Area, marker or route |
| PIMO | Knowledge about a plant, with species/document/specimen scope kept explicit | Opens the precise source cell behind a local interpretation or possible action |
| Fruit/plant discovery window | A visual example of morphology, development and handling | Loads beside relevant PIMO knowledge or a LIMO activity; example geometry is not a live observation |
| LIMO | Questions, interpretation, options and learning through local action | Queries the Project, compares evidence, and creates a scoped observation or draft next step |
| Notes and activities | Records of observations, trials, instructions and return visits | Store what the learner or steward actually did and discovered |

LIMO should be useful whether someone starts at the map, a Totem, an Area, a PIMO, or a recorded problem. It should inherit that context and offer a visible scope change rather than making the person find the Project again.

When no Project is open, retain a clearly labelled example/reference experience. Learning must still be available before a user creates a site inventory.

## Recommended refreshed tree

The centre is the **selected Project and scope**. The six roots below are questions people can enter in any order. They are not six compulsory stages of a course.

```text
LIMO · Explore and understand this Project
│
├── READ THIS PLACE
│   ├── Sun, shade and exposure
│   ├── Water, slope and drainage
│   ├── Soil and ground cover
│   ├── Climate, seasons and extremes
│   └── Access, existing features and constraints
│
├── MEET THE LIFE HERE
│   ├── Plants and forest layers
│   ├── Wildlife and seasonal visitors
│   ├── Damage, pests and beneficial organisms
│   ├── Flowering, fruiting and other changes
│   └── What has not been recorded yet?
│
├── SEE HOW IT WORKS
│   ├── Guilds, neighbours and competition
│   ├── Shade, shelter and support plants
│   ├── Water, organic matter and soil cycles
│   ├── Pollination and habitat relationships
│   └── Techniques demonstrated in this Project
│
├── IMAGINE WHAT COMES NEXT
│   ├── People, purpose and care capacity
│   ├── Starting land or established planting?
│   ├── Which plants could fit, and why?
│   ├── Compare two possible plans
│   └── First phase, later phases and changing roles
│
├── TRY SOMETHING USEFUL
│   ├── Choose a small first planting
│   ├── Care for an existing plant or Area
│   ├── Try a technique and record the intention
│   ├── Harvest, prepare, save or share
│   └── Record an observation or question
│
└── SEE WHAT CHANGED
    ├── Repeat an observation
    ├── Compare Areas, dates and seasons
    ├── Check results and care effort
    ├── Investigate an unexpected result
    └── Decide the next small step
```

This means six visible roots and five branches per root. Detailed vocabulary lives in explanations, optional filters and referenced material. It should not become dozens of permanently expanded grandchildren.

“Plants and forest layers” is a view of the actual plant records. “Guilds” is a view of named, authored assemblages and their proposed/observed relationships. “What has not been recorded?” is an invitation to investigate, not a report that wildlife or a layer is absent.

“Origins and Culture” remains available through attributed plant knowledge and relevant local stories; its current warm-climate/range mapping should be corrected. “Uses and Making” becomes contextual harvest/preparation/sharing activities. “Discovery and Pathways” becomes an entry into optional missions, not another bucket beside the subjects they traverse.

## Every practical cell needs an outcome

A practical cell should answer five things, progressively rather than as five permanent panels:

1. **What are we trying to understand?** One concrete question.
2. **What do we know here?** Records, dates, sources and gaps within the selected scope.
3. **Where can I see it?** Matching Areas, specimens, PIMO source cells or observation records.
4. **What can I do next?** A small observation, comparison, draft plan or approved care activity.
5. **What would change my understanding?** A revisit question or a new piece of evidence.

Default to one primary action and a quieter “Why this matters”. Open deeper reference material on demand. A concept-only cell can remain a reference, but it should advertise a related local activity when one is possible.

### Example: the Habitat endpoint

Current: definition → end of branch.

Proposed: “Which parts of this Area are being used as habitat?” → recorded sightings and features → highlight their locations → open a sighting or plant → notice food, shelter or water being used → record organism, behaviour, time and place → choose a revisit.

When nothing has been recorded, show **Not assessed here**, with an observation prompt. A blank database must not be rendered as “No wildlife”.

### Example: layers

Plants and forest layers → select Shrub → show matching plant records in this scope → highlight their Areas → choose one → open its PIMO and local observations → compare its intended role with its actual form and neighbours.

Preserve an Unknown/not-set group. Identify whether the layer represents an authored design role, current observed stature, or a species profile. Those are different facts.

### Example: climate and suitable plants

Climate → display attributed regional station data and any local observations separately → select the conditions that matter for this question → inspect candidate plants with reasons for inclusion, conflicts and missing evidence → save a shortlist for a named Area.

Existing free-text climate labels are useful filters but do not establish plant suitability. The Bureau of Meteorology supplies station-based historical observations and statistics that could inform a reviewed climate record. Local shade, exposure and other conditions still need their own evidence. [Bureau of Meteorology Climate Data Online](https://www.bom.gov.au/climate/data/)

### Example: damage and pests

A reported symptom opens the actual affected plant and dated photos. The activity asks what damage occurred, how extensive it was, what organisms were seen and what identification remains uncertain. It then supports monitoring, a sourced response where appropriate, and a review. Monitoring and correct identification are central to deciding whether management is needed in IPM. [UC Integrated Pest Management](https://ipm.ucanr.edu/what-is-ipm/)

## The connecting cell should produce a usable local result

Keep the current source references and provenance. Extend the result into a **local question or trial** containing:

- The exact PIMO source and LIMO question.
- Project, Site, Area and affected specimen IDs.
- A selected goal and relevant observation references.
- Intended benefit, plausible competing effects and missing information.
- An editable next step, person responsible and review condition/date.
- The resulting observation/activity record, without rewriting the source knowledge.

For example, connecting a Pigeon Pea care cell with “Shade, shelter and support plants” might propose investigating how a particular plant affects its neighbours. The user would inspect that plant and its Area, record current shading, decide whether a small trial is appropriate, and later compare observations. The connection should not certify a beneficial relationship from two cell titles.

The current contextual schema and PIM reference scopes support part of this. The missing work is its UI, real evidence inputs, permission handling, persistence, and a useful output contract. Replacing the placeholder with generative text alone would not solve those gaps.

## Bare land and established projects need different invitations

### Starting a food forest

Offer **Find a sensible first pilot**, not “Generate my whole forest”.

Choose a manageable Area → record the starting condition → name the purpose and available care → compare light, water, soil, access and existing life → mark what should be retained → compare two small options → review candidate plants → save a draft first phase and maintenance/review plan.

Open-looking land still has vegetation, habitat, water behaviour and existing uses. The initial screen should ask what is there before it offers planting. A mature forest preview should make its assumptions visible and remain a draft scenario.

The choice of system and species should be tied to the site's conditions, people's goals and available resources. FAO guidance also recommends testing a proposed agroforestry system at a small scale. That supports a pilot-first product experience rather than a universal planting recipe. [FAO Agroforestry](https://www.fao.org/sustainable-forest-management-toolbox/modules/agroforestry/1/en?tabInx=0)

### An established project

Offer **Understand or improve one part**.

Pick a goal, recorded issue or curiosity → show relevant Areas and existing plants → inspect current observations → compare a second Area or date → explain a plausible relationship → choose a care step, experiment, or more observation → return to assess it.

Do not assume a missing database entry means a missing forest layer. Do not suggest filling every layer simply to complete a diagram. Care capacity, access and existing functions matter.

### Imagining a future

Compare two editable scenarios with the current state always available. Show retained features, proposed plants, changing canopy/space assumptions, establishment work, water/care needs, expected functions and unresolved questions. Phase controls should express intentions—first phase/later canopy/managed transition—rather than claim to forecast growth accurately.

A schematic living map is useful for relationships and navigation. It cannot establish slope, hydrological flow, precise shade or physical spacing. Image alignment also does not automatically establish terrain accuracy. Surveyed or otherwise supported layers should be distinguished from authored sketches.

The proposed observe → options → action → review loop is a product adaptation of established planning practice; NRCS describes inventory, analysis, alternatives, implementation and ongoing evaluation. It is not a claim that NLXR already performs professional site assessment. [NRCS planning process](https://www.nrcs.usda.gov/state-offices/tennessee/nine-step-conservation-planning-process)

## Make it engaging without turning it into a checklist course

Use optional missions around one question and one useful result. Let people enter from any related plant, Area or record, change scope, branch off, pause, or record that they cannot yet answer.

| Mission | Activity | Useful outcome |
|---|---|---|
| Find what lives beneath the canopy | Compare layer records with one observed plant | A corrected/confirmed record or a stated gap |
| Follow one wildlife visitor | Find a dated sighting and observe behaviour | A scoped sighting or an honest “not seen during this visit” |
| Where did the water go? | Compare recorded water observations in two places | A dated question and follow-up observation |
| Is this plant helping its neighbours? | Compare intended role and observed light/access | A testable relationship and review point |
| Find a sensible first planting | Compare two small draft options | A retained baseline, shortlist and draft pilot |
| What is this harvest becoming? | Connect plant development to a locally reviewed use | An attributed preparation/seed-sharing activity |
| Something surprising is happening | Investigate a seasonal or unexpected observation | A curiosity linked to the relevant PIMO and local record |

Time estimates should be authored and tested for each mission. A short in-app activity can invite a later field observation; it should not imply that an ecological question is resolved in five minutes.

Reveal → compare → predict → check is a useful activity pattern. A learner might predict which recorded plants occupy a shaded layer, reveal the matches, inspect an example, and explain what evidence would challenge their answer. Use clues, dated photos and the discovery window where they clarify the question.

Track opened, recorded, attempted and revisited separately. A click does not prove learning. Classroom activities should support observations and explanations; stewardship activities should support decisions and follow-through.

## Layout, cells and graphical direction

**Keep the spatial LIMO identity, but focus one branch at a time.**

The centre should show Project and current scope. Six roots are visible at overview. Selecting one reveals its five branches; selecting a branch brings the question and relevant local results forward. Keep a short breadcrumb and return action. Deep reference exploration remains optional.

The Project map and real landscape should provide the main visual payoff: matching Areas highlight, a selected specimen becomes findable, and the exact PIMO source can open beside the explanation. Aggregate large result sets by Area and load a bounded number of objects. Hundreds of glowing nodes would recreate the dump spatially.

| Cell role | Distinctive cue | What selection does |
|---|---|---|
| Question/learning concept | Familiar LIMO form + question/book cue | Explains an idea and offers its local application |
| Live Project view | Small filter cue + scoped result count | Highlights and lists matching records |
| Observation | Camera/notebook cue + date | Opens or creates a place-linked record |
| Trial/action | Tool/check cue + state | Opens an editable activity and review plan |
| Future scenario | Outlined preview + explicit Draft label | Shows a proposed alternative separately from existing records |

Use shape/label cues as well as restrained colour. Topic colours cannot tell people whether they are reading, filtering or changing something. Solid links can show confirmed authored relationships; labelled dashed links can show proposed relationships. Selection emphasis is a separate visual state.

Short question labels will be more legible than abstract subject names spread through the space. Keep explanatory paragraphs in the reading surface. Use dated local photos and simple overlays before adding ornamental animated vegetation to every cell.

For XR, preserve a stable selected cell while the result is inspected; avoid automatic rotation or rearrangement during pointing. All essential actions need controller/touch/keyboard equivalents. Future movement rules should be deliberate and consistent with the user's two-grip window requirement, with an accessible alternative for other input methods. LIMO interaction constants have changed since historical notes; validate the current rendered paths and physical Quest behaviour when implementation begins.

## Alternatives considered

| Approach | Benefit | Limitation | Judgment |
|---|---|---|---|
| Refresh the existing encyclopedia tree | Lowest implementation cost; clearer copy and navigation | Does little to connect learning to decisions or the Project | Useful supporting cleanup, insufficient as the main change |
| Project questions + optional missions | Uses existing Areas, PIMO references, filters, maps and Notes; delivers practical learning | Requires a real context/query/activity bridge | Recommended |
| Full land-planning simulator | Strong future-vision presentation | Requires terrain, reliable plant/site data, care assumptions and validated modelling; high scope | Defer until the practical loop and inputs work |

## Implementation order and acceptance gates

### First: one complete practical loop

Implement **Plants and forest layers → inspect one plant → record what its layer/role means here → choose a revisit**. This has existing profile fields and Area filter logic, so it can test the core promise without requiring climate modelling or wildlife identification.

Deliverables:

- A Project/Site/Area context adapter, preserving entry context from map, Totem or PIMO.
- A shared layer query using canonical plants/instances and excluding template/proposed records from observed inventory.
- Results on both map/list and the selected PIMO.
- A scoped observation record and optional return activity.
- Resume/back behaviour that restores the same scope, selection and evidence.
- A fallback that explains missing or unclassified data and offers a useful next observation.

Accept it only when a user can find a relevant plant, explain the local reason for its classification, record evidence and return to that record. Passing UI tests or adding a new tree alone is insufficient.

### Then: replace the public entry structure

Present the six roots above. Reuse the best introduction questions, collapse duplicate definitions and move specialised vocabulary into contextual reference material. Add three short missions: inspect a layer, investigate a recorded wildlife visit, and compare first-planting options.

Maintain stable legacy cell references through explicit aliases/redirects and regression checks. Existing connections, source provenance and translated content need a migration plan; a title change alone must not strand a stored reference.

### Then: relationships and future visions

Add named guild records, observed/proposed relationship states, technique examples attached to Areas, editable two-option scenarios, and evidence-linked connection outputs. Persist those in the proper Project records, with public/private permissions and learner contribution rules.

### Finally: visual refinement

Refine role cues, spatial transitions, selected result overlays, dated media and bounded XR rendering. Test that the visuals improve finding and understanding rather than simply expanding the number of objects.

### Required checks

1. A query cannot leak records from another Project or Site.
2. Whole-Project results cover the stated Sites; load failures are not silently interpreted as zero matches.
3. Templates, drafts, planned plants and field observations are visibly distinct.
4. Unknown classification and unassessed biodiversity remain available; absence is never inferred from missing records.
5. Species guidance remains distinct from facts about a particular specimen and place.
6. The highlighted map/list/PIMO all refer to the same canonical record.
7. A mission can branch, pause and resume without losing its context or observations.
8. Progress distinguishes content opened from work recorded/reviewed.
9. Visitor actions respect Project permissions; stewardship changes are deliberate and reviewable.
10. A future scenario never overwrites the existing inventory or appears as observed fact.
11. Existing PIMO references and protected Curiosity behaviour continue working.
12. Desktop, mobile and native XR can reach the same outcome; physical Quest checks verify readable targets and reliable activation.

## Source map

Reviewed current files, with entry anchors:

- [LIMO groups/faces](../app/services/limLearning.js#L6), [cell construction](../app/services/limLearning.js#L218), [pathway definition](../app/services/limLearning.js#L373), [introduction](../app/services/limLearning.js#L448).
- [Pathway state and visit completion](../app/services/limPathwayState.js#L56).
- [Desktop reading endpoint](../app/screens/desktopLearningBook.js#L109).
- [Demo pathway](../app/screens/temporaryArDemo.js#L1728), [demo learning packages](../app/screens/temporaryArDemo.js#L1775), [connection resolution](../app/screens/temporaryArDemo.js#L2927).
- [PIMO-to-LIMO bridges](../app/services/pimLimBridge.js#L5), [reference scopes](../app/services/meshReferences.js#L9), [context support](../app/services/meshRelationships.js#L28), [placeholder generator](../app/services/meshGenerator.js#L4), [session repository](../app/services/meshRepository.js#L1).
- [Area filtering](../app/screens/projectDashboard.js#L1886), [layer profile field](../app/screens/projectDashboard.js#L2930), [dashboard scope](../app/services/projectDashboardV2Model.js#L77).
- [Template reconciliation](../app/services/persistence.js#L102), [Notes widgets](../app/services/noteWidgets.js#L1), [PIMO evidence fields](../app/services/pimModel.js#L75), [spatial records](../app/services/spatialDataModel.js#L1).

The proposed names, mission behaviour and layout are design recommendations. Illustrative click flows describe the intended product; they are not claims that those integrations are already implemented.
