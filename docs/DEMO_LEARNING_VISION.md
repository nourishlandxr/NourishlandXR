# NourishlandXR Demo and LIM Learning Vision

## The demonstration story

The demo should feel like one journey through a place:

1. Arrive, check the space and understand the two companion surfaces.
2. Choose whether to explore the optional Learning Information Mesh (LIM) or continue directly.
3. Place Pigeon Pea and open its Plant Information Mesh (PIM).
4. Place the visually distinct Moringa orb and compare two living profiles.
5. Add one Note as a local observation, without another editing lesson.
6. Meet Area Totems and see a route connect the Food Forest and Kitchen Garden.
7. Finish with a clear invitation to explore or create a project.

The quick fixes implement the copy, palette and pacing needed for this story. They preserve the existing spatial models and tutorial state.

## Phase 10A: pathway discovery

The LIM introduces a new way to learn, so it should offer direction without forcing a sequence. The welcome step now suggests three questions:

- **Planning a small temperate food forest?** Begin with Climate and Place, then Living Landscapes.
- **Discovering plants for a subtropical backyard?** Connect Climate and Place with Plants and Life.
- **Regenerating a creek with native plants?** Begin with Place and Observation, then Wildlife and Relationships.

These questions established the direction for gentle routes through the same stable mesh. Free exploration remains the primary LIM experience.

## Phase 10B: Understand This Place

The early Learning Paths preview now includes one functional path, `lim-path-understand-place`, version 1. It follows these existing cells without copying or moving them:

1. `lim-pin-place`
2. `lim-climate`
3. `lim-food-forest`
4. `lim-plant`
5. `lim-wildlife-relationships`
6. `lim-pin-observation`
7. `lim-pin-observation-action`

Its state is `idle`, `active`, `paused` or `completed`. Progress, timestamps and optional observation-Note status persist locally. Invalid saved state returns safely to idle. Selecting another cell preserves progress and offers a quiet return action. Note placement reuses the existing Note workflow.

## Future creator-authored paths

Creator-authored paths are a direction being explored. Creator tools, personalisation and adaptive recommendations are not implemented or promised. Any future path should reuse stable LIM cells, identify its learning goal and preserve free exploration.

## Experience principles

- Keep the LIM optional and easy to leave.
- Use questions based on a visitor’s real goal.
- Keep all cells visible in their stable positions.
- Let the companion panel carry detail while the mesh preserves orientation.
- Offer one useful next step rather than several competing instructions.
- Use distinct orb and Totem colours to show different roles before text is read.
- Treat links between Totems as routes between Areas; each Area keeps its own information.
