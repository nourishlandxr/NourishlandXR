# Creator / Demo / Tutorial parity

Local implementation review, 21 October 2026. Physical Quest acceptance remains required.

| Capability | Tutorial | Demo | Creator |
| --- | --- | --- | --- |
| Wrist pose, vector icons, ray / poke / pinch interaction | Existing Tutorial wrist renderer | Shared renderer added outside Tutorial | Shared renderer added alongside information panel |
| Right stick click | Tutorial tool menu | Shared wrist toggle outside Tutorial | Shared wrist toggle |
| Plant information / PIMO, Notes and Totems | Practice content | Existing interactive examples | Existing saved project objects |
| Grab ownership, hand tracking, haptics, graphics settings | Existing | Existing | Existing; retained |
| Fruit Window, PIMO Tag / Curiosity / Explore, knowledge editor | Existing practice fruit | Existing | Existing shared information panel / knowledge renderer; retained |
| Totem plaques, directional signs, styles, selected plant highlights | Practice context | Existing | Existing shared Totem renderers and navigation; retained |
| Notes with spatial content / selection / movement | Practice context | Existing | Existing Note renderer and knowledge workspace; retained |
| Three placement steps | Separate Tutorial | New Creator quick start chapter, session-only practice | Quick start instructions using actual saved objects |
| Orb area / line mapping | Not a Tutorial activity | Not yet a practice step | New mapping tool, saved on the selected Orb |
| Paint and Insect controller skins, games and fruit activities | Existing | Available through Tutorial | Not ported: separate learning activities, not authoring tools |

## Mapping

Select a placed Orb, then use the left wrist menu or More → Map Orb area / line. Aim at the ground and press trigger (pinch with hands), or use Mark point on mobile. Undo removes the last point. Save validates at least three non-collinear corners for an area or two points for a line. Cancel discards the draft. Saving again replaces that Orb's previous mapping.

The mapping controller uses the existing Tutorial's calibrated sculpted grip with a distinct survey ring. Its trigger marks points; right stick click opens the shared left wrist menu. Tool-specific Undo / Save / Cancel remain in that menu. The usual belt cycling and object grip movement pause while a mapping draft is active.

`marker.spatial_mapping` stores version 1 geometry in metres relative to the Orb's restored spatial anchor. The existing marker update endpoint persists it without changing the plant profile or the Project / Site / Place hierarchy. Saved lines and area outlines render when that area is open in Creator. Moving the Orb moves its mapped footprint with it. This is local spatial annotation, not survey-grade or GPS boundary capture. Explorer rendering and multiple independent geometries per Orb are later work.

## Direct practice

Demo chapters → Creator quick start opens three placement steps without Zinnia narration or ambient creatures. Practice objects remain in the Demo session. Other chapters retain the full guided experience. Creator → More → Creator quick start gives the same three tasks with real project saves.

## Device checks

Verify wrist orientation and readable targets on both controllers and hands; right stick toggle; menu presses do not place objects; grounding and pinch point marking; line / area save, reopen and re-anchor; interrupted save and exit; three practice placements; normal Tutorial and Demo chapters after leaving practice. Browser tests and a build do not establish these Quest results.
