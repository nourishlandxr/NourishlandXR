# V0.9794 — Whole biome wheel in AR and VR

The existing spatial wheel was reachable only through an older launch screen. The current Demos page now includes **Biome wheel**, with a direct entry at `/demos/?tool=biome`.

Both AR and VR show the whole wheel in front of the visitor. AR uses a smaller scale; VR uses a larger scale. The model stays in place, with no automatic rotation or movement through the world. A centre icon or controller trigger brings it back in front of the viewer. Compact controls provide mode selection, day/night lighting and return to Demos.

Real WebXR capability checks run before preparation. Unsupported browsers show the hardware requirement without downloading the landscape. Compatible devices follow two explicit steps: prepare the model, then request an immersive session. Download progress, retry after a failed load and recovery after denied XR access are included. AR uses a transparent scene; local reference space avoids requiring floor tracking on phones. Closing aborts pending downloads, ends the session and releases render resources.

The miniature is a static geometry snapshot of the current repaired V17 master, rather than the older three-file XR bundle. It retains the repaired basin, terrain and plant placements, omits the NL information layer, uses compact foliage and standard materials, and excludes zero-scale instances that cannot be represented as valid glTF transforms. The master website scene is read only. The snapshot does not reproduce custom shader animation, animated water or weather. Source and output hashes, bounds, byte counts and instance counts are recorded alongside it. The compressed model is approximately 53 MB; physical Quest rendering performance remains unverified.

Validation covers hardware gating, whole-wheel positioning in both modes, model provenance and transform integrity, actual model preparation/rendering, failed-download retry, lighting, denied-session recovery, return navigation, and the welcome version. Automated browser capability fixtures are not physical AR/VR acceptance.

The preceding V0.9793 animation, PIMO and placement repairs remain deployed. Backend, project data, canonical routing and hero media are unchanged.
