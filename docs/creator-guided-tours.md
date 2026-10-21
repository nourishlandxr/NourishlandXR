# Guided tour foundation

Desktop Studio → Tours. This is the first authoring and screen-based visitor slice, built on existing Project → Site → Area → record identities.

## Creator flow

1. In Records, identify a plant as an individual, clump or collection. Optional use and forest-layer tags have a source/context field. Unknown tags remain empty. Records can be filtered by use and layer.
2. In Tours, create a draft and add existing plants, Notes, Totems, discovery points, Areas or path Areas. Each stop references its site feature; it does not copy or move the record. Choose Observe, Compare, Listen, Investigate or Record.
3. Write directions and a visitor instruction. Reorder stops, check the tour and open Visitor preview. Save draft to retain it across visits.

Compare requires two different features. Listen accepts an optional HTTP(S) audio link plus written transcript; audio only loads when used. Investigate adds a question. Record, Compare and Investigate offer a visitor response field. Optional stops can be skipped. Facilitator notes appear only in Creator preview.

## Visitor flow and publication

The visitor place page links to Guided tours. Direct links use `?tour=TOUR_ID&project=PROJECT_ID` (use `tour=1` to list tours).

Drafts stay private. Publishing is a separate administrator action under Publication. All referenced Sites, Areas and records must already be public; tour validation must pass. Later draft edits do not replace the published tour until it is published again. If referenced content is hidden, the public tour becomes unavailable. Unpublish retracts the tour.

Visitors can pause, return to earlier stops, skip optional stops and finish. Progress and responses remain on that browser/device, scoped to the published revision. Responses are not submitted to educators. Closing Creator preview discards its practice responses. Plant-information links open the existing published plant reader.

## Persistence

`PROJECT/tours.json` stores drafts, published snapshots and optimistic versions. `/api/projects/PROJECT/tours` lists Creator entries; `PUT /tours/ID` saves with `expectedVersion`; `POST /tours/ID/publish` and `/unpublish` manage publication. Public GETs require `?view=visitor` and expose only published content. Full scoped references distinguish Areas, marker IDs and shared plant specimen IDs. Each public read resolves current site content; plant facts are not duplicated inside the tour.

Site feature metadata is additive at `marker.site_feature`. Existing knowledge documents, species profiles, spatial anchors, mapping drafts and other Creator flows remain separate.

## Practical limits / next work

- This slice provides desktop and phone screen preview. XR placement remains in the existing Spatial workspace; the tour player does not provide GPS/AR navigation, sky beacons or a verified walking-path overlay.
- Directions are creator-written. Content checks cannot establish whether a physical route is currently passable. Walk it on site before sharing.
- Frame/Living Frame authoring, independent terrain-aware geometry, recorded routes, relationship overlays, seasonal variants, student submission/review and offline tour packages remain future work.
- Site tags describe recorded uses. They do not establish plant identification, suitability for consumption or medical advice.
- Moving a referenced record to another Area can invalidate that stop; Check tour identifies missing references for repair. Reordering a tour never moves a site feature.

Validation artifacts: `artifacts/tour-foundation-tests.log`, `artifacts/tour-foundation-build.log`, and `artifacts/tour-foundation-browser-qa.mjs`. Browser fixtures use a temporary garden, never the real project workspace. Physical Quest tracking and outdoor routes are not validated by these checks.
