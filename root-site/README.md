# Official root website source and reviewed overlays

## Release 0.9783 — Totem motion and automatic hero playback

Replaces click-time WebGL portrait rendering with three small, prepared portraits from the same shared XR sculptures. Totem transitions retain their visible intermediate frames and survive rapid switching. The hero requests muted inline autoplay immediately, without waiting for its poster, and has no playback/reset buttons. The protected 39-file overlay preserves the existing video and world geometry. See `docs/release-0.9783.md`.

## Release 0.9782 — centred website experience

The reviewed 36-file additive overlay publishes the V0.9781 website work: staged entrances, connected Totem navigation, original botanical wheel, three-place showcase, on-page phone preview and discovery die. Shared styles and module imports carry the release version to refresh existing browser caches. Run `node root-site/tools/verify-release.mjs 0.9782` and publish with the protected `Publish reviewed root website` workflow. Details and the known hero-video crevice are recorded in `docs/release-0.9782.md`.

## Release 0.9780 — crafted Totems

Eight shared 3D Totems now use distinct materials, sculpture and directional signage. Rock uses engraved stone slabs; Moon, Sun, Leaf and Botanical use their own ceramic forms; Halo uses opal glass; the two timber models retain different wood plaques. The Creator introduction loads the rotatable collection on demand. The same source updates the native project/Demo renderers and the optional full-world information layer. V0.9775's clean hero and all terrain/content payloads are preserved. See `docs/release-0.9780.md` for scope and validation limits.

This directory owns the official nourishland.org marketing frontend. The root-release marker protects it from the legacy XR rsync workflow. That guard remains enabled.

## Local experience source · 0.9781

`npm run build:website` assembles the current website from the protected 0.9780 shell and maintained component sources. Run `node root-site/tools/preview-transitions.mjs` for local review at `http://127.0.0.1:8010/`. This includes staged page entrances, shared-model Totem navigation, the original botanical wheel, the three-place carousel, the on-page phone preview and the discovery die. See `docs/website-experience-0.9781.md` for scope and verification. No production overlay or deployment is included in this local-source update.

## Release 0.9775

The reviewed 50-file overlay retains the 0.9774 Education and Platform pages and adds the clean high-quality intro video, the paused NL layer, and pending static XR tutorial/material/microphone fixes since 10e330ec. The desktop video is 2560 × 1440 (43.2 MB); the portrait video is 1080 × 1920 (20.1 MB). The intro does not load the full 3D world.

The publisher also accepts explicitly listed static XR screens, services, v2 and vendor assets. It still rejects API/data files, dotfiles, routing configuration and the migrated `/xr/index.html` redirect to `/app/`. Missing XR assets return an HTML app redirect with HTTP 200; the preparation tool recognises that exact sentinel, while installation independently requires each new physical target to be absent. Every replaced file must match its recorded live baseline before any public write.

The legacy workflow now reports a protected skip when the root marker is present. Use `Publish reviewed root website` with version `0.9775` for this release. The unchanged API does not need redeployment. Local verification: 1,205 tests, frontend build, root component checks, desktop/phone video browser checks and the visible V0.9775 welcome badge. Physical phone and headset acceptance remain separate.

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
