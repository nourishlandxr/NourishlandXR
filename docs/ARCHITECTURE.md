# NourishlandXR architecture

## Runtime

NourishlandXR is a browser application built with native ES modules, HTML, and CSS. `app/main.js` coordinates screen modules under `app/screens/`; reusable UI and domain logic live in `app/components/` and `app/services/`. There is no client framework or bundling step: the hosted build copies the module tree and applies release metadata.

The welcome flow leads into Visitor, Creator, and demonstration experiences. LIM (Living Information Mesh) and PIM (Plant Information Model) services share structured knowledge documents across conventional web views and spatial AR views. WebXR and camera/location features remain progressive enhancements.

## Persistence API

`tools/persistence-server.mjs` serves the local frontend and a JSON API. In production it runs as the `/xr-api` Passenger application, while `/xr` is static. Creator mutations require the signed session cookie in hosted mode. Production refuses to start if authentication is disabled.

Project data lives outside the public web root:

```text
workspace/
  PROJECT_ID/
    project.json
    sites/SITE_ID/
      site.json
      places/AREA_ID/
        place.json
        markers/MARKER_ID/
          marker.json
          anchor.json
          plant_profile.json
```

Writes use a temporary file plus rename and retain bounded backups. Read-only list requests do not run migrations or rewrite records. Project ZIP import/export uses the cross-platform Node archive implementation in `tools/zipArchive.mjs`; extraction rejects traversal, links, unsupported encryption/compression, excess files, and excess expanded size.

## Publication boundary

Publication is fail-closed. A project, site, area, or marker is public only when its own `visibility` is explicitly `public`; missing or unknown values remain private. Visitor deep reads also require every ancestor in the hierarchy to be public. PIM visitor projection separately removes unpublished or unreviewed knowledge nodes.

## Build and release

`npm test` runs the Node test suite. `npm run build` creates `dist/xr` and `dist/xr-api`; workspace content is never copied. The production workflow runs tests before the frontend build and deployment. `app/services/buildInfo.js` is the displayed release source, and every completed change increments it by `0.0001`.
