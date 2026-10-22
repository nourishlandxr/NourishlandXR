# Intro hero: clean high-quality video

Current presentation: `autoplay-09783`. The intro plays a clean landscape video; the NL layer is disabled in both the intro and the optional full 3D world pending design review.

- Desktop: 2560 × 1440, H.264 MP4, 30 fps, 24 seconds, 43,170,483 bytes (43.2 MB), approximately 14.4 Mbps.
- Portrait phone: 1080 × 1920, H.264 MP4, 30 fps, 24 seconds, 20,057,406 bytes (20.1 MB), approximately 6.7 Mbps.
- Matching posters: 1.45 MB desktop and 0.71 MB phone.

Source: the clean landscape-only `hero-cycle-02` exports (`inner-rock-02`, with the repaired closed basin). The `hero-cycle-03` videos contain the NL layer baked into their frames and must not be used while that layer is disabled. The separate full 3D world retains the newer `knowledge-mesh-03` geometry. Asset sizes and hashes are recorded in `app/v2/assets/hero-clean-hq/manifest.json`. Do not substitute the small compressed clips or recompress these files without visual review.

The intro never requests the full 3D world. It requests muted inline autoplay immediately, without waiting for the poster to decode, and retains gentle grab/scroll framing and native looping. There are no playback or reset buttons. It pauses off-route, in a hidden tab or while the menu is open, and resumes automatically on return. Reduced-motion displays the poster. A failed video leaves the sharp poster visible.

The paused NL-layer source is retained for future design work. `tools/sync-biome-discovery.mjs` preserves the verified master geometry and removes the layer's startup call. Existing Creator and demo functionality remains separate.

Current browser verification: `root-site/tests/website-release-browser.mjs` checks automatic playback, no hero controls, menu pause/resume, reduced motion and playback when the poster is unavailable. The earlier `artifacts/hero-video-repair-qa.mjs` records the superseded V0.9775 control design. Physical phone testing is a separate acceptance step.

Known media limitation: these retained video frames predate the later food-area crevice repair. A fresh export from the repaired master remains separate from the autoplay/transition repair.
