# NourishlandXR v0.9101

A place-based learning platform with a browser Creator workspace, a public visitor experience, and optional AR modes. Content is stored as structured project, site, area, marker, anchor, and plant-profile records.

## Local development

```powershell
npm start
```

The application is served from `http://127.0.0.1:8000/app/`.

## Hosted build

```powershell
npm run build
```

This creates the static frontend in `dist/xr/` and the Node API in `dist/xr-api/`. Project workspace data is deliberately excluded from builds.

## Quality checks

```powershell
npm test
npm run build
```

Production deployment is test-gated. See `docs/ARCHITECTURE.md` and `docs/HOSTARMADA_DEPLOYMENT.md` for the current runtime and hosting model.
