# Official root website source and reviewed overlays

This directory owns the official nourishland.org marketing frontend. The root-release marker protects it from the legacy XR rsync workflow. That guard remains enabled.

## Release 0.9774

- Education introduces curiosity, participation and care through the approved philosophical paragraph.
- Selected topics grow into colour-matched side panels and smaller child cells. The central orb stays in place. Narrow Education layouts retain a connected panel below the orb.
- Platform Totem signs open content on the side their arrow points towards. The Totem translates smoothly to make room without shrinking. Creator's feature preview stays in that same side panel. The panel is bounded to the viewport and can scroll internally; narrow screens use a directional drawer and a close control.
- Creator introduces the actual Organic V3 orb, Classic honeycomb PIMO, actual Totem signage and a draggable Border Ranges IMAP before its optional app entry.
- Terrain uses 520 previously cached public NSW contours, 200–970 m AHD, interpolated into a display surface. Relief is exaggerated and the circular rim extrapolates. Paths and Totem positions are conceptual, not surveyed.

`source/` retains component source and its local models/vendor modules. `releases/0.9774/payload/` is the exact additive frontend overlay. The manifest includes both installed hashes and expected previous hashes so a changed production file causes a stop before public writes.

Run from the repository root:

    node root-site/tests/menu-interaction-checks.mjs
    node root-site/tests/creator-feature-checks.mjs
    node root-site/tools/verify-release.mjs 0.9774

The manual `Publish reviewed root website` workflow uses the existing production SSH identity, stages outside public_html, checks every baseline hash, creates a private frontend backup and copies only the listed files. Assets precede route shells, the homepage follows, then version metadata and the protection marker. It does not delete whole directories, change routing, touch WordPress or deploy API/data files. Runtime install failures restore only files still matching this overlay. A later public verification failure is reported for investigation; the private backup remains available.

Controller and structural checks pass. Local HTTP dependencies respond successfully. Browser Use remains disabled, so this release has no new visual/GPU or physical-phone acceptance claim.
