# AR production diagnostic

## Confirmed working reference

The local `/app/` version and Cloudflare Tunnel version use `app/services/arNote.js`. The production build copies that module directly to `dist/xr/services/arNote.js`; the build verification compares every ordinary `app/` file byte-for-byte with `dist/xr/`.

## Confirmed production difference

The deployed frontend JavaScript and CSS return the correct MIME types. The AR renderer has no Three.js, model, texture, icon, worker, manifest, WebAssembly, or static JSON dependencies.

The hosted request below currently returns the WordPress HTML 404 page instead of API JSON:

```text
GET https://nourishland.org/xr-api/demo-markers?view=visitor
```

AR marker preload occurs before `navigator.xr.requestSession()`. The production build reports both success and failure visibly. A failure is non-fatal: startup continues with an empty marker list and still calls `navigator.xr.requestSession('immersive-ar')`, so the XR session and built-in Hillyards dashboard can start. Persisted markers require the `/xr-api` Passenger/WordPress mount to return JSON.

## Expected START AR diagnostics

```text
START AR clicked
secure context status: secure
navigator.xr availability: available
immersive-ar support: supported
marker preload result: loaded <count> markers
# or: marker preload result: failed; continuing without persisted markers: <exact name and message>
requestSession started
session created
# or: requestSession failed: <exact name and message>
```

All lines remain visible in the diagnostic panel. Any failure displays its exact JavaScript error name and message. Unsupported browsers and devices receive a visible message explaining that immersive WebXR is unavailable and that the non-AR experience remains usable.

## Hosted paths

```text
Frontend: /xr/
API:      /xr-api/
```

All frontend modules use relative imports from `/xr/`. API calls remain root-relative to `/xr-api` by design.

## Deployment verification

1. Run `npm run build`.
2. Record the generated version in `dist/xr/services/buildInfo.js`.
3. Deploy `dist/xr/` through GitHub Actions.
4. Open Settings on the phone and confirm the displayed build version matches the generated version.
5. Open `/xr-api/demo-markers?view=visitor` directly and confirm it returns JSON, not WordPress HTML.
6. Press START AR and record the visible diagnostic sequence.
