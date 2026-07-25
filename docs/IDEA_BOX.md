# Nourishland XR Idea Box

This is the living memory of Nourishland XR. Add promising ideas here when they appear in conversation or testing. Ideas do not become commitments automatically: each one should protect the product’s purpose and remain simple enough for a person standing in a real garden.

## Product compass

Nourishland XR uses the inviting discovery loop of location-based games to reconnect people with nature, food systems and the knowledge held by real places.

The experience should inspire curiosity. It is not intended to become a dense professional authoring tool. A visitor or garden creator should be able to begin without learning technical language.

## Language rule

**Marker** is the single spatial term shown to users.

- Place a Marker.
- Give it a purpose: Plant, Note/Focus Point, general Marker or Area Checkpoint.
- Move, edit or revisit the Marker.

“Orb” is not a product concept. A Marker may be drawn as a quiet glowing circle, but its appearance does not require another name.

Three roles have distinct visual identities:

- Ordinary content appears as a quiet Marker.
- An **Area Totem** is a taller translucent form that holds an Area together. Information panels can arrange themselves around it.
- The **Starting Point** is a warm gateway shape, visibly different from both Markers and Area Totems.

### Spatial form language

Status: V1 implementation

The soft glowing circle is the temporary, uncommitted form of a newly placed entry. People do not need to learn another name for it. Once given a purpose, its 3D form communicates what it has become:

- **Note / Focus Point** — a soft rectangular information form.
- **Starting Point** — a warm star that can carry an editable notice board.
- **Area Totem** — a translucent vertical form rising from ground level.
- **Plant** — a living sphere with a denser luminous core.
- **General Marker** — retains the quiet soft circular form.

Softness, translucency and the existing symbol character must be preserved. All forms share the same Small / Medium / Large sizing system.

Normal and structural creation are separate:

- **+ Marker** is the fast everyday action. After placement, choose Plant, Note or general Marker in one tap.
- **+ Special** contains rare structural forms such as Area Totem. These use a deliberate guided process rather than appearing in every ordinary Marker conversion.
- Resizing belongs in **Edit details**, not in the immediate post-placement choice.

## Friendly Mode and Expert Mode

Status: V1 foundation

New projects begin in the friendly experience. It asks only for information required to create a meaningful place.

Expert Mode is an explicit project checkbox. It reveals advanced configuration, coordinates, diagnostics, themes and future V2 controls without forcing those concepts on every creator.

The first-use tutorial should teach a welcoming journey, not the software architecture:

1. Create a welcoming Starting Point.
2. Understand an Area through its translucent Totem.
3. Place one Marker and give it a purpose.

## Active ideas

### Living plant discovery

Status: V1 foundation in progress

- **Available now:** Create Plant → Global searches GBIF read-only by common name, scientific name, genus or species. Selecting a result creates a sourced, editable Local copy.
- Keep **Local** plants clearly separate from **Global** plant discovery.
- Local means a plant profile already saved in Nourishland.
- Global means a read-only result from an external botanical source.
- Choosing a Global result creates an editable Local copy with source identity and attribution.
- Search common name, scientific name, genus and species without requiring botanical expertise.
- Begin with GBIF as the global taxonomy source.
- Consider Atlas of Living Australia enrichment for Australian projects.
- Useful/edible knowledge must be cited and curated locally; never present an unverified safety claim as fact.

Source pathway:

1. **GBIF now** — broad global name discovery and taxonomic identifiers.
2. **Atlas of Living Australia next** — Australian names, occurrences and regional context.
3. **iNaturalist enrichment later** — observation-led discovery and images, using its supported API and rate limits.
4. **Kew POWO/WCVP reference layer** — accepted names, distributions and plant uses where licensing and data access permit.
5. **Nourishland useful-plant layer** — curated edible, medicinal, fibre, habitat and food-forest knowledge with visible sources and safety review.

Global sources remain read-only. NourishlandXR stores the source name, source ID, source URL and retrieval date when a person chooses a result. Global results must never silently overwrite Local knowledge.

### Gentle advanced search

Status: explore after garden testing

Keep the first search box simple. Reveal optional filters only when requested:

- Local / Global
- Edible or useful
- Plant family
- Food-forest layer
- Native or introduced
- Area

Do not expose database terminology or identifiers in the normal journey.

### Nature discovery loop

Status: product direction

- Arrival at a real place should feel like entering a living world.
- Markers invite discovery rather than demand attention.
- Movement, observation and return visits should reveal knowledge gradually.
- Gardens can hold stories, seasonal change, plant relationships and community memory.
- Reward curiosity and care rather than collection for its own sake.

### Collect, organise, then place

Status: V1 dashboard direction; staged implementation

The dashboard is the creator's active field board. Its top section should contain only what matters now:

- A temporary Starting Point reminder for a new project. It disappears when completed.
- A compact but highlighted **Open AR** action.
- **Unplaced Bag** for collected ideas awaiting a home or precise position.
- **Create Plant** for quickly recording a plant to place later.
- **Add Item** for choosing a Plant and Area, then either placing it in AR or leaving it gathered around the Area Totem.

The spatial model is:

1. **Collect** — find or create a Plant and keep it in the Bag.
2. **Organise** — assign it to an Area. It leaves the truly unassigned Bag and loads around that Area's Totem.
3. **Place** — while on site, move it from the Totem cluster to a permanent spatial position.
4. **Discover** — visitors find the placed Markers; creators can keep collecting and refining the garden.

An Area assignment and a permanent physical position are different states. Content assigned to an Area but not precisely positioned should remain visible around its Totem, not appear lost or incomplete.

Implementation pathway:

- V1A: reorganise the dashboard vital section and clarify Bag/Create/Add language.
- V1B: store Area assignment independently from the spatial anchor.
- V1C: render Area-assigned, unpositioned content in a stable Totem cluster.
- V1D: let AR placement move an item out of the Totem cluster without changing its Area.
- V1E: add friendly collection progress and discovery feedback without introducing gaming terminology.

## Real-garden test ideas

- Can a first-time creator place three Markers without explanation?
- Can they leave, return and restore the same Marker positions?
- Can a visitor understand why each Marker matters before opening detailed information?
- Are Markers visible in sun, shade and visually busy vegetation?
- Does the interface encourage looking at the garden rather than staring at the phone?
- What language causes hesitation?
- What moment produces delight?

## Idea review rule

Before promoting an idea into the release plan, ask:

1. Does it strengthen connection to a real place?
2. Can it be understood without technical training?
3. Does it reduce effort or create a meaningful moment?
4. Can it work reliably in a garden?
5. Is it V1-essential, a later enhancement, or simply an inspiring possibility?
