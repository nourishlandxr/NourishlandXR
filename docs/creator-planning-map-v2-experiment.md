# Creator planning map V2 · retained flat-map experiment

The earlier flat-map work is useful for Creator planning, but it is **not IMAP**. IMAP is the circular, grippable spatial disc from Demo Utility 1.1. The flat Project Map can evolve independently into a sharper authoring tool with source plans, layers, editing and record inspection.

Retained work:

- `app/services/creatorPlanningMapV2Projection.js`: generated Area and record markers from a validated shared-project snapshot, with keyed presentation positions.
- `app/services/creatorPlanningMapV2Model.js`: generated all-Site Creator model with scoped Area and record keys, previous site-plan positions, counts and deterministic defaults.
- `app/services/creatorPlanningMapV2View.js`: an experimental flat view with selection, drag positioning, per-Site inspection, Studio record links, optional contour/slope/water sketches and explicit layout saving. It is currently unmounted; it must be reviewed before production use.
- `artifacts/creator-planning-map-v2.png`: the visual concept presented during the first V2 review.
- `tools/preview-creator-planning-map-v2-interactive.html`: the original interactive flat prototype, retained with its import, staged sample project, drag positioning, and illustrative terrain controls under the correct Creator planning-map name.
- `tools/preview-creator-planning-map-v2.html`: the retained visual review image.

The useful shared foundation is canonical project → Site → Area → record identity, regeneration when content changes, optional keyed presentation overrides, separate authorization for Creator and public visitors, and honest terrain provenance. These principles also inform the circular disc model, while the flat layout and editing interface remain Creator-only planning work.

Before shipping the flat experiment, review marker density, collision handling, save semantics, public filtering, and sourced terrain alignment. Its illustrative contour, slope and water sketches must never be shown as measured site facts.
