# Mobile scroll hero study

Derived from the approved V17 mountain-production-03 / natural-depth-01 scene. Separate test route; it does not replace the current homepage or alter the master artwork.

The image and depth data form a real, textured 3D surface seen through a deliberately bounded camera path. Scroll/swipe controls a small lateral movement and push-in; markers link to website content. Surface-water pixels receive subtle animated displacement. This is a view-dependent representation: it does not support unrestricted orbit, disoccluded surfaces, real-time relighting, evolving shadows or animated source animals. The complete world is linked separately and never requested on initial load.

Phone scene assets: about 330 KB. Compressed rendering-engine modules: about 181 KB. One mesh, one draw call, 55,607 triangles, pixel ratio capped at 1.25 on phones. These are measured desktop-browser emulation results, not physical-phone validation or a mobile-network loading guarantee. The initial photo and menu remain usable if WebGL/decompression fails. Reduced-motion mode holds the camera and water still. Frames pause in hidden tabs.

Camera projection retains the master's off-axis centring, and the capture has 12% overscan. Thin silhouette edges and large changes in viewpoint remain the principal limitation. Daylight only in this first study; time-of-day states must be authored before this could replace all homepage lighting controls.

Rebuild: `node outputs/wheel-model/build_mobile_depth_hero.cjs`. Browser QA: `node outputs/wheel-model/verify_mobile_depth_hero.cjs`. See `browser-review.json` for resource requests, render counts and local timing. PNGs are review artifacts, not website assets.
