# Secondary-area Totems

Sun, Leaf, Rock and Moon are 1.35 metre models, grounded at y = 0.
The GLB exports share the geometry used by the native XR renderer.

- Sun: timber post, carved rays and an amber disc light; sunny clearings and pollinator guilds.
- Leaf: timber post and leaf crown with luminous veins; woodland edges and regeneration guilds.
- Rock: stacked river stone with a mineral light seam; soil, rock gardens and water edges.
- Moon: timber post with a crescent light; shaded retreats and nocturnal ecosystems.

Each GLB has a separate `Communication light` material. A future communication
module can animate its emission independently of the body. These exports contain
static models; the application supplies pulse timing.

Runtime signal: set `record.communicationSignal = { startedAt: performance.now(),
duration: 4200 }`. `totemNotificationLight(record, now)` produces the pulse.
No networking or messaging service is connected. Idle lights remain steady;
model selection and the explicit preview action briefly demonstrate a pulse.

Regenerate assets using `node tools/export-secondary-totems.mjs`.
Browse all eight runtime designs in `tools/preview-totem-roster.html`.
