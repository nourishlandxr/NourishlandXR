# NourishlandXR product decisions

## 2026-07-26 — Spatial Plant Profiles preserve the live Marker

Decision: A Plant Profile never replaces or repositions its living orb. The orb remains at its recorded physical anchor while a separate, compact honeycomb appears nearby at a comfortable reading height. A subtle curved tether connects the two.

Consequences:

- Simulated placement records the actual aiming-point position instead of scattering Markers by list index.
- WebXR profile height is clamped relative to both the viewer and the Plant rather than assuming a fixed floor height.
- Plant information uses progressive disclosure and translucent low-contrast cells.
- Dragging the information cluster changes only its presentation position; the spatial Marker remains immutable.
- Lemon Myrtle in Try It Now is the reference implementation for future spatial Plant Profiles.
