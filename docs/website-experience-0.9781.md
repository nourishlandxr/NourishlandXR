# Nourishland website experience · V0.9781

## Reconciliation

The checkout contained the uncommitted Totem journey work from V0.9776–0.9779 and was behind `b4a97e4f`, the V0.9780 crafted-Totem release. The newer release was brought in before applying the local work. Shared XR sculpture, sign geometry and materials are retained. Navigation portraits now render those actual shared models: Bionic Pole for Platform, Botanical for Creator and Halo Stem for Explorer, with projected accessible hit targets following the real signs.

No production release payload has been edited. No deployment is included in this change. The earlier tracked prototype was preserved in a temporary reconciliation stash during the merge.

## Website structure

- Hero remains the clean, high-quality landscape video.
- Education enters in stages: heading, central orb silhouette, supporting copy. Its interactive 3D orb loads after the entrance so first-time shader work does not obstruct the introduction.
- Platform retains connected, receding Totems and a living ground string. Final choices open information balloons. The larger `Inside Creator` preview stays on the website.
- Food Forests uses the original botanical wheel artwork in a lightweight touch-turnable ceramic-relief scene. It does not load the full biome model. Layers, relationships and seasons reveal short explanations.
- Places introduces Border Ranges, Mount Warning / Uki and Hillyards Food Forest. The larger models turn by dragging, with two arrow controls and titles underneath. No growth slider, reset, view or zoom toolbar appears in this presentation.
- Field Notes opens an interactive phone preview. Observations remain in the preview and do not write to a real project or require account access.
- Collaborate uses the original discovery die with three concise ways to take part. About, Contact, Hillyards and Immersive Learning use the same centred layout, type and mineral palette.
- The longer food-forest story and guide retain their graphics, hover/focus interactions and detail, with unified headings and introductory styling.

## Accuracy and scope

Border Ranges uses the existing cached NSW contour-derived display grid. Relief and paths are illustrative. The Mount Warning / Uki and Hillyards models are explicitly illustrative studies, not surveyed sites, walking routes or operational public learning packages. Unity and learning-package development status stays visible.

The phone is an interactive website demonstration, not a native Android emulator or the production Field client. Creator/Explorer permissions, approval requirements, project data and hardware-gated XR demos are preserved.

## Local review

Run `npm run build:website`, then `node root-site/tools/preview-transitions.mjs`.

- `http://127.0.0.1:8010/`
- `/education/`, `/platform/`, `/food-forests/`, `/places/`, `/collaborate/`

The assembler creates `dist/website` from the current protected root shell and maintained component sources. The local server serves that assembled experience and built `/xr` assets. Unchanged artwork not present locally may fall back to the current public website. A future deployment must package a reviewed additive root overlay; the legacy destructive sync stays protected.

## Verification

The full suite passes 1,221 tests, including route preservation and finite terrain-grid contracts. The frontend and assembled website build successfully and the app welcome badge shows V0.9781. Root menu and Creator regression harnesses pass. Browser checks cover the redesigned routes on desktop and phone, wheel rotation, the three-place carousel, the simplified Creator preview, phone observations, no extra Totems for information, reduced motion and browser history. Physical phones/headsets remain a separate acceptance step.

Current evidence: `artifacts/website-experience-qa.json`, `artifacts/website-journey-checks.json`, `artifacts/website-experience-review.webm` and the `website-*.png` review captures. Earlier prototype captures are archived locally outside the release source.
