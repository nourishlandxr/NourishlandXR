# Weather and sky system — Joey production brief

Status: queued as the shared environmental pass after the current wheel and biome-detail work.

## Role

Weather and sky are global systems shared by rainforest, wetlands, permaculture/food production and temperate forest/orchard. They should unify the wheel, reveal seasonal and hydrological relationships, and let students observe how light and rainfall change the same landscape.

## Locked requirements

- Sky color changes continuously with time of day.
- Supported weather modes begin with **sunny** and **rainy**.
- Clouds are manipulable 3D meshes or 3D cloud objects in the Unity scene.
- The customization interface has two distinct environmental controls:
  1. **Time of day** — continuous progression through the daily light cycle.
  2. **Weather** — the second bar, moving between **SUN** and **RAIN**.
- Weather and time changes affect the complete landscape consistently, including water, vegetation, shadows, atmosphere and sound.

## Reference translation

| Ref | Use this quality | Production interpretation |
| --- | --- | --- |
| 01 | Clear pale-blue daytime sky with sparse soft cloud | Define the calm sunny baseline with high visibility and limited cloud obstruction. |
| 02 | Deep-blue sky with distributed cumulus depth | Use multiple cloud scales and depths so the sky feels spatial rather than like a flat backdrop. |
| 03 | Warm pink-blue transition light | Establish a restrained dawn or early-evening state between daylight and sunset. |
| 04 | Rich orange sunset with illuminated cloud edges | Use as the warm sunset extreme, with light direction and cloud shading tied to the sun position. |
| 05 | Purple-red late sunset | Define a cooler post-sunset transition before night, avoiding a sudden color switch. |
| 06 | Layered pastel horizon bands | Use distant low cloud layers and atmospheric perspective near the horizon. |
| 07 | Dramatic red-grey cloud field | Use only as an optional high-cloud sunset variation, not the default weather appearance. |
| 08 | Large volumetric cloud towers and sun rays | Guide rainy-build-up cloud volume, depth and light shafts; keep effects performant and controllable. |

## Control 1 — time of day

Use a continuous normalized value rather than separate disconnected buttons.

Suggested authored checkpoints:

- Dawn
- Morning
- Midday
- Afternoon
- Sunset
- Dusk
- Night

Interpolate between checkpoints for:

- sky and horizon color;
- sun direction, elevation, intensity and color;
- ambient/fill light;
- shadow direction and softness;
- cloud illumination and underside color;
- atmospheric haze;
- water reflection and brightness;
- selected wildlife and ambient sound behavior.

The default website composition should use one approved daylight state. Sunset is a discovery/customization state rather than the default if it reduces biome legibility.

## Control 2 — SUN ↔ RAIN weather bar

The second customization bar represents a continuous weather blend:

**SUN — clear — partly cloudy — overcast — light rain — RAIN**

The bar should have two clear endpoints with optional semantic stops. It must remain understandable without relying on color alone.

As the value moves toward rain:

- increase cloud amount, density and vertical development;
- reduce direct sunlight and sharpen the importance of ambient light;
- soften and darken shadows;
- cool or neutralize the sky and distant atmosphere;
- introduce rain progressively rather than switching it on at one threshold;
- increase wetness and reflection response on suitable materials;
- strengthen visible flow in selected channels and water surfaces within safe artistic limits;
- transition ambient sound toward rainfall and water activity.

Returning toward sun reverses these changes smoothly. Avoid instant sky swaps.

## 3D cloud system

- Build clouds as editable 3D objects or clustered cloud volumes, not one fixed sky photograph.
- Support translation, scale, rotation, density and coverage controls.
- Organize clouds into named layers or families: high thin cloud, fair-weather cumulus, low overcast and rain-building volume.
- Light clouds consistently from the active sun direction.
- Preserve silhouette softness while avoiding obvious intersecting spheres or repeated cloud clones.
- Allow cloud groups to move slowly at different speeds and heights.
- Keep the centre and navigation areas readable; large clouds may frame the hero but should not permanently hide it.
- Provide a reduced-cost configuration for Quest and a richer configuration for desktop/editor capture.

## Rain system

- Start with sunny and rainy modes only; do not add storms, lightning or snow in this phase.
- Rain direction may respond gently to wind but should remain visually readable.
- Use local camera/player rain where appropriate rather than filling the entire world with particles.
- Add restrained surface ripples, wetness and runoff cues.
- Rainfall should make the designed water path more understandable: terraces, swales, paddies, ponds, channels and wetlands receive or convey water in the correct order.
- Do not dynamically flood terrain beyond the authored water design in the first implementation.

## Relationship to the four biomes

- **Rainforest:** humid haze, canopy highlights, mist and rainfall depth.
- **Wetlands:** reflections, ripples, rainfall impact and stronger visible channel activity.
- **Permaculture/food production:** visible movement from catchment through swales, paddies, ponds and controlled overflow.
- **Temperate forest/orchard:** long shadows, seasonal light, leaf response and orchard visibility.

The same global sun and weather state should affect every biome. Local variations may change intensity, mist or ground response without creating contradictory skies.

## Customization interface

- Use two compact horizontal controls in the environmental customization panel.
- Bar 1: accessible name **Time of day** with a current state such as `Morning` or `Sunset`.
- Bar 2: accessible name **Weather** with endpoints **SUN** and **RAIN** and a readable current state.
- Pair each label with a compact recognizable icon, while keeping endpoint text because the environmental scale is consequential and educational.
- Provide clear keyboard, touch, controller and XR aim/focus states.
- Do not rely on blue/orange or dry/wet color alone to communicate the setting.
- Update visual state while adjusting, but debounce expensive scene rebuilds.
- Provide a reset-to-authored-default action as a compact icon control with an accessible label.

## Website hero treatment

- Keep the public landing hero deterministic and fast: load one approved sky/time poster and its matching cinematic frames.
- Do not load real-time 3D clouds on the initial website hero.
- If environmental customization appears on the website, use a limited set of pre-rendered or efficiently blended states.
- The poster must match the first video frame exactly for every deployed state.
- Weather transitions should remain secondary to the central world composition.

## Unity XR treatment

- Use the real-time time-of-day and 3D cloud system in Unity.
- Expose normalized time and weather parameters to the customization UI.
- Provide separate quality profiles for Quest standalone and desktop/editor capture.
- Use pooled/local rain effects, controlled shader variants and bounded reflection cost.
- Keep cloud shadowing, transparency and overdraw within the target headset budget.
- Synchronize sun, clouds, sky, fog, water, wetness and sound from one environment state.
- Expose state changes to learning activities and future project serialization.

## State and project data

Store environmental state as project data so creator choices can be reproduced:

- `timeOfDay` normalized value;
- `timeLabel` authored semantic state;
- `weather` normalized SUN-to-RAIN value;
- `weatherLabel` authored semantic state;
- cloud preset and optional per-group transforms;
- environment quality profile;
- whether the scene uses authored default or creator customization.

This state should be shareable across Desktop Studio, Android Field, website previews and Unity XR, even when each surface renders it differently.

## Avoid

- Flat photographic skies inside the interactive Unity world.
- Real-time 3D clouds on the initial website landing path.
- Abrupt color or weather switches.
- Clouds moving as one synchronized sheet.
- Rain particles across the entire wheel when only the viewer region requires them.
- Weather that contradicts water flow or lights separate biomes differently.
- Lightning, storms, snow or complex seasonal weather in this first phase.
- Copying source photographs, visible interface overlays or exact cloud formations.

## Acceptance criteria

- Time-of-day changes produce a continuous and coherent sky/light transition.
- The SUN-to-RAIN bar has readable endpoints, intermediate behavior and accessible state output.
- Clouds can be independently positioned, scaled and adjusted in Unity.
- Sunny and rainy states remain visually consistent across all four biomes.
- Rain reinforces the authored hydrological route without uncontrolled terrain flooding.
- The website remains immediate and uses matching poster/cinematic states.
- Quest quality maintains the target frame rate while desktop/editor can render a richer capture state.
- Environmental settings can be saved and restored with a project.

## Internal reference files

1. `01-clear-day-sparse-clouds.png`
2. `02-spatial-cumulus-day.png`
3. `03-pink-blue-transition.png`
4. `04-orange-sunset-clouds.png`
5. `05-purple-red-dusk.png`
6. `06-pastel-horizon-layers.png`
7. `07-dramatic-sunset-cloud-field.png`
8. `08-volumetric-cloud-towers.png`

