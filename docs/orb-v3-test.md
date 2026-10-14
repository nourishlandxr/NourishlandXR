# Orb V3 in the tutorial and demo

The controller practice orb uses V3, and a fresh demo selects V3 for Plant Orbs automatically. Outside the demo, Living sphere remains the global default. In the spatial Control Panel, open Settings → Graphics and cycle Plant Orb to compare **Orb V3 · test** with Living sphere.

V3 uses 18 unequal rounded cells with curved mating seams. Opening retains the circular shell and exposes a small glimpse of the existing core. Closing returns to the fixed original pose; it does not run a physics simulation or regenerate the cells.

The mesh is prepared only when V3 is selected. Its shape and cell identities remain consistent across Low, Medium and High graphics budgets. It uses the existing two-pass core/shell renderer and the existing PIMO interaction state; selection, grabbing and knowledge content are unchanged.

For a local visual comparison, open `/tools/preview-orb-v3.html`. Select Living sphere or Orb V3, toggle Open core, and drag or use left/right arrows to rotate. This preview runs the production renderer. It does not establish Quest frame rate or headset alignment.

The tutorial toy shares the V3 shell geometry and opening distance, preserving its forest-green shell, purple core, grab/rotation lessons, button feedback and gravity behaviour. Its shell closes exactly at rest and when reset.
