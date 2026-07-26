# NourishlandXR product decisions

## 2026-07-26 — Spatial Plant Profiles preserve the live Marker

Decision: A Plant Profile never replaces or repositions its living orb. The orb remains at its recorded physical anchor while a separate, compact honeycomb appears nearby at a comfortable reading height. A subtle curved tether connects the two.

Consequences:

- Simulated placement records the actual aiming-point position instead of scattering Markers by list index.
- WebXR profile height is clamped relative to both the viewer and the Plant rather than assuming a fixed floor height.
- Plant information uses progressive disclosure and translucent low-contrast cells.
- Dragging the information cluster changes only its presentation position; the spatial Marker remains immutable.
- Lemon Myrtle in Try It Now is the reference implementation for future spatial Plant Profiles.
# V0.8503 — interaction and onboarding rules

- “Advanced controls” is a display choice; it is not the definition of whether someone wants a tutorial.
- First-use progress uses plain tasks, not metaphorical growth stages.
- Notes are flat information bubbles. Plants are living spherical orbs. Totems are structural Area centres.
- Hold means magnetise the chosen element to the centre aim until release.
- An Area remains the normal container for spatial placement, while information created before Area assignment is explicitly “Not placed.”
- Physical QR/code anchoring belongs directly in Totem and Trail Entrance panels.
