# Nourishland PIM experiment — 8 September 2026

The scheduled 23:32 Sydney follow-up was canceled. Work was performed locally; nothing was deployed. Version: 0.9019.

## Findings and implementation
The original reader repeated navigation and description blocks, selected only the first search match, and disabled search in the creator dashboard. Its Web diagram used rectangular sectors rather than the canonical honeycomb. Editing could discard source/media metadata; review could apply an older document snapshot; move/archive changes did not always persist.

The reader now separates navigation, readable topic content, and expandable evidence/provenance. Search lists contextual matches with full paths, opens ancestors, and restores results when returning. Outline remains the accessible default. Scope controls distinguish general species knowledge, local specimen knowledge, and legacy knowledge whose scope has not been reviewed.

The Diagram now uses the existing AR honeycomb renderer and geometry: six familiar categories around the plant, pastel surfaces, legible labels, selected cells, expanding branches, a topic reading area, and creator branch growth. Web expansion includes all children rather than AR's three-child limit. Large trees get scrollable bounds and zoom with preserved position. Default AR rendering retains its existing child limit. Custom roots remain available outside the canonical six-category flower.

## Knowledge growth and external databases
External records enter a staging/review queue through existing provider mappings or creator JSON intake. The entire raw record remains source data; mapped fields become suggestions. Unmapped fields stay in the source archive. Accept/modify creates structured species knowledge as a draft with source identity and provenance; review is distinct from publication. Conflicts require editing/review instead of automatic overwrite. Previously reviewed items cannot be accepted twice. Completed source history remains available.

A physical-site observation is authored separately with specimen scope and a specimen/site reference. External species facts cannot be reclassified as local observations merely because they describe the same plant. Legacy scope remains explicitly unreviewed rather than being guessed. Evidence status and publication remain separate decisions.

## Files
- app/components/plantInformationWeb.js — reader, search, scope, editor/review integration, honeycomb interaction.
- app/pim.css — reading composition, responsive controls and pastel honeycomb.
- app/services/pimModel.js — reading/publication projection and scope.
- app/services/pimImportReview.js — raw source preservation and review protections.
- app/services/plantInformationMesh.js — opt-in all-child Web expansion.
- app/services/plantInformationMeshView.js — forward the Web expansion option.
- app/screens/projectDashboard.js — search and transactional document/review save integration.
- app/services/buildInfo.js — version.
- tests/pim-growth.test.mjs, tests/pim-web-renderer.test.mjs, tests/ar-interface.test.mjs — regression coverage.

## Verification
Automated suite covers model operations, publication filtering, deep search, custom roots, source/media preservation, staged imports, scope validation, persistence, geometry and existing AR contracts. Browser checks used the populated existing Pigeon Pea reference and the actual sparse orchard Jackfruit profile through the real persistence API, with all writes restricted to an isolated workspace copy. Tested desktop 1365×950, mobile 390×844, narrow 320×740, honeycomb expansion and zoom, Outline/Diagram, nine soil search results, deep topic navigation and search return, keyboard Escape, source acceptance/modification, custom specimen branch creation, editor reopen, reload through role changes, and visitor draft exclusion. Narrow screen has no horizontal page overflow; large mesh content scrolls within its panel.

## Remaining limits and risks
The existing orchard dashboard has a site identifier mismatch (main_food_forest versus Hillyards_loaded) and cannot navigate its original project normally. This unrelated data problem was preserved; browser verification mounted the real PIM component with the real API in a local harness. Live external-provider fetches, physical touch/headset interactions and a real device reduced-motion setting were not verified. Reduced-motion CSS remains in place. Species scope is stored on nodes; this does not create a shared cross-specimen species library. Source archives can grow document size; concurrent editor conflict resolution is still a future concern. Large graphs use scrolling and zoom, and custom roots are not placed into the six-category AR flower.

## Assessment and next iteration
The interaction is materially better: the honeycomb is now an actual navigable knowledge structure, search exposes alternatives and context, reading is quieter, and external evidence cannot silently become published local fact. Next: real-device usability sessions, a shared species/source library with explicit specimen links, server-side revision conflicts, and richer visual placement for custom roots after validating the six-category experience.
