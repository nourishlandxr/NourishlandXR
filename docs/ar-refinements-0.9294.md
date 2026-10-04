# Quest interface refinement — V0.9294

Release follow-up: V0.9295 updates six existing assertions for the intentionally changed Settings dock, demo height, foliage mask and visitor wording. V0.9294 was stopped by those assertions before deployment; V0.9295 is the release candidate.

## Confirmed source findings and changes

- Settings shared the image's left dock, and its many rows compressed Help. It now uses the top dock with the image's 0.66 m width, Control panel/image height and 0.035 m gap. General and Graphics are separate views. Orb/Totem and refresh/FPS share paired rows. Help opens the full reading page. The only visible glass slider is Main / Control glass; learning cell backgrounds continue to follow it. Font size and contrast increased without fading lettering or outlines.
- The laser was rendered before the Control panel and could be covered by its backing. It now draws after information panels, using their actual ray intersection for contact. A held panel uses the right joystick for distance, even when the left controller holds it.
- Four-sign vertical placement could put the bottom boards below the post's base. Signs now start above ground and occupy the lower post. Botanical column becomes the default once; later manual choices remain saved. New demo Totems adapt their height to the main screen midpoint, remain based on the detected/estimated floor, and retain their height when moved. Existing Creator anchors and chosen heights are preserved.
- Opaque timber boards undermined transparency. Spatial signage and detail cards now have dark glass backgrounds, independent crisp edges, bigger labels and direction arrows. The shared glass preference updates them. Linked routes use clear sage chevrons with gentle opacity variation. A selected neighbouring destination receives a 12-second local pulse at its header's top edge; reduced motion uses a steady indicator. These shared effects also apply in Creator AR.
- The XR butterfly used a camera-facing sprite. It now draws the three animated skinned meshes in the existing XR context, at 20–30 mesh updates per second according to graphics quality, reusing the same vertices for both eyes. Uniform scale prevents horizontal distortion. Its smaller perch meets the upper right Control panel edge, with slow folded wing movement. Close insect visits draw after reading surfaces so they are not covered by them.
- Vegetation deliberately removed everything beneath reserved learning cell circles. Tall growth remains excluded, but a low, progressively growing carpet fills those spaces beneath the cells. It uses the existing cached living-frame canvas, with a fixed quality-dependent cluster budget. The central reading aperture remains clear.
- The plant connection renderer omitted selection from its source layout options. It now uses the same selected layout and visual cell centre as the plant canvas. The connected explanation leads with Pigeon Pea's soil, nurse-plant and habitat roles.
- Continue outlines are thicker in the spatial and native controls.

## Copy sources

Pigeon Pea's growth, nitrogen fixation, soil improvement, mulch, windbreak and bee forage: [World Agroforestry profile](https://apps.worldagroforestry.org/usefultrees/pdflib/Cajanus_cajan_ERI.pdf). Its nurse crop role: [Useful trees and shrubs of Uganda](https://www.cifor-icraf.org/publications/downloads/Publications/PDFS/b09383.pdf). Habitat suitability depends on local species and conditions.

## Validation boundary

Build and release/version verification are required before handoff. The deployment workflow runs the existing repository checks. No physical Quest validation is claimed; the user requested the next walkthrough on Quest 3.

On Quest: aim at Settings and its sliders; open an image on the left simultaneously; hold a panel and move the right stick; inspect Totem base/sign height and neighbouring destination pulse; observe the folded butterfly perch and later 3D flyovers; revisit the Pigeon Pea connection and check its centre endpoint; check mature low foliage and FPS at the chosen graphics/refresh setting.
