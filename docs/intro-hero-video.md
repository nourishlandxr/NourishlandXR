# Intro hero: clean high-quality video

Current presentation: `clean-hq-video-02`. The intro plays a clean landscape video; the NL layer is disabled in both the intro and the optional full 3D world pending design review.

- Desktop: 2560 × 1440, H.264 MP4, 30 fps, 24 seconds, 43,170,483 bytes (43.2 MB), approximately 14.4 Mbps.
- Portrait phone: 1080 × 1920, H.264 MP4, 30 fps, 24 seconds, 20,057,406 bytes (20.1 MB), approximately 6.7 Mbps.
- Matching posters: 1.45 MB desktop and 0.71 MB phone.

Source: the clean landscape-only `hero-cycle-02` exports (`inner-rock-02`, with the repaired closed basin). The `hero-cycle-03` videos contain the NL layer baked into their frames and must not be used while that layer is disabled. The separate full 3D world retains the newer `knowledge-mesh-03` geometry. Asset sizes and hashes are recorded in `app/v2/assets/hero-clean-hq/manifest.json`. Do not substitute the small compressed clips or recompress these files without visual review.

The intro never requests the full 3D world. It retains gentle grab/scroll framing with less enlargement, native looping, compact play/pause and replay controls, automatic pause off-route and while the menu is open. Reduced-motion and data-saving preferences initially show the poster; explicit play remains available. A failed video leaves the sharp poster visible.

The paused NL-layer source is retained for future design work. `tools/sync-biome-discovery.mjs` preserves the verified master geometry and removes the layer's startup call. Existing Creator and demo functionality remains separate.

Release verification: `artifacts/hero-video-repair-qa.mjs` checks native video dimensions, looping, portrait selection, controls, route/menu pauses, reduced motion, the image fallback and the visible welcome version. Physical phone testing is a separate acceptance step.
