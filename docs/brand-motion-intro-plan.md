# Nourishland cross-platform brand motion intro

## Status

Planned. The selected constellation logo and its colorways are still under review. This document records the intent to develop its animation as a reusable Nourishland introduction across products; it does not approve a final logo palette or schedule implementation.

## Goal

Create one recognizable, calm motion signature that can welcome people into Nourishland across the website, product demonstrations, WebXR experiences, and Unity applications. The animation should introduce the Nourishland identity and sense of a living ecosystem without becoming a long product-specific tutorial or delaying access to the experience.

## Motion direction

Use the selected constellation mark as the current visual reference. The working sequence is:

1. The central sprout gently appears.
2. Fine pathways draw outward and their nodes respond.
3. The five surrounding cells reveal with subtle, staggered movement.
4. The Nourishland wordmark settles in after the symbol.

The current review template is approximately 2.6 seconds, plays once, and includes a reduced-motion state. Treat its timing as a design starting point; tune it with the final mark and test it in each product context. Keep the reveal soft, legible, and short enough to preserve a quick path into the experience.

## Cross-platform use

- **Website:** use a lightweight vector or native web animation that loads quickly, respects reduced-motion preferences, and does not block navigation.
- **Demos and WebXR:** use the same motif and timing as a brief welcome moment, with a skip path when the demo needs to begin immediately.
- **Unity:** reproduce the approved sequence and pacing with native scene animation. Keep the Unity implementation aligned with the shared motion specification rather than depending on web-only assets or runtime behavior.

Adapt framing, resolution, and entry behavior to each screen. Preserve the identity, order of reveal, easing character, and approximate timing so the animation feels related across clients.

## Planned work

1. Select the approved logo colorway and confirm the final scalable mark.
2. Refine a platform-neutral motion specification: sequence, timing ranges, easing, color behavior, clear space, and static fallback.
3. Prepare lightweight reference exports and implementation notes for web, demo/WebXR, and Unity teams.
4. Implement the website version first as the reference behavior, including reduced motion and no-blocking startup.
5. Port the approved motion to demos and Unity, preserving the shared specification while fitting each entry point.
6. Review on desktop and mobile browsers, WebXR, and Quest/Unity; check legibility, startup cost, frame stability, skip behavior, and reduced-motion behavior before adoption.

## Acceptance checks

- The same identity and reveal order are recognizable on website, demo/WebXR, and Unity.
- The animation plays once and completes promptly; it never holds navigation or tutorial controls behind it.
- Reduced-motion users see a clean static mark or a minimal fade.
- The animation remains crisp at small and large sizes, and the website implementation does not cause a visible loading or frame-time penalty.
- Product teams can use the shared exports and specification without introducing incompatible logo redraws or new dependencies.

## Source material

The current ten-color review package and playable motion template are design references only. Final palette selection, production exports, platform implementations, and release dates remain open until the mark and motion are approved.
