# IMAP V3 terrain data pipeline

## V3 preview boundary

`tools/preview-imap-v3-terrain.html` demonstrates three relative landforms: a Sheepstation Creek–Brindle Creek traverse, a creek valley with asymmetric banks, and a ridge with a spur and saddle. These are authored shape examples over the existing schematic Border Ranges layout. They are not sampled elevations or georeferenced coordinates. The linked `preview-imap-v3-live-data.html` now requests contours through `GET /api/terrain/contours?bbox=west,south,east,north` (hosted as `/xr-api/terrain/contours`). The API validates NSW bounds and a 10 km maximum footprint, deduplicates in-flight requests, rate limits cache misses, and caches public contour responses for six hours in the shared workspace cache. The generator accepts a centre coordinate and width, interpolates an illustrative 3D surface, and downloads a versioned terrain JSON model with its bounds, source, elevation summary, grid and contour overlay. This is a useful first user-facing model-generation preview, not yet part of Creator project authoring or publishing, and the interpolated contours are not a DEM.

## Suggested automatic source flow

1. Resolve the user's place, park, or drawn project boundary. Use NPWS park and track pages for names, route descriptions, and place context. Treat scanned visitor maps as label/feature references, not elevation sources.
2. Intersect the boundary with NSW Spatial Services elevation coverage. Prefer the bare-earth DEM for surface shape; use contour and spot-height services as independent checks and for legible contour overlays. Record dataset, acquisition/capture date, grid spacing, horizontal CRS, vertical datum, licence/attribution, and request date.
3. Download or query only the clipped footprint plus a small edge margin. Transform coordinates to a local metric plane, choose a simplification based on the display footprint, and resample to a bounded mesh. Preserve the DEM's vertical values separately from the display exaggeration.
4. Derive local terrain min/max, slope, aspect, contours, and named A–B cross-sections. Combine named waterways, roads, walking tracks, park precincts and lookouts from authoritative vector sources. Do not infer a mapped creek's exact channel floor from its line geometry alone.
5. Save a versioned map package containing the geometry, source metadata, processing settings, and quality flags. Cache it by source/version and project footprint. Refresh when the footprint or upstream dataset changes, not on every render. Keep a schematic fallback when an upstream service is unavailable.

## Validation before automatic publish

- Check coverage and coordinate transformation; reject empty or implausibly small clips.
- Compare sample heights and contour crossings at named points where available; confirm one vertical datum before combining sources.
- Detect no-data holes, spikes, flat tiles, and edge seams. Report low-resolution or mixed-source areas.
- Keep vertical exaggeration explicit and separate from elevation values. Clearly label schematic, estimated, and source-derived terrain.
- Retain source URLs, retrieval date, licence/attribution, and transformation settings with every saved map so the preview can explain where its surface came from.

## Border Ranges source assessment

NPWS locates the Brindle Creek walk within the Sheepstation Creek precinct and describes short steep hills. Its general park map explicitly says it does not provide detailed topography. The NSW Elevation and Depth theme documents contour and bare-earth DEM products; the NSW government describes LiDAR DEMs at varying resolutions and a 5 m photogrammetric DEM. Production terrain should use the matching bare-earth DEM coverage; the exact DEM service/tile retrieval, authoritative site geocoding, feature joining, licence capture, and refresh job remain to be built. The shared contour cache persists for six hours and retains at most 16 recent extents. The sample extent is approximate and must not be treated as a verified park boundary.

Sources:

- [Brindle Creek walking track factsheet](https://www.nationalparks.nsw.gov.au/things-to-do/walking-tracks/brindle-creek-walking-track/visitor-info)
- [Border Ranges National Park map](https://www.nationalparks.nsw.gov.au/-/media/npws/maps/pdfs/parks/border-ranges-national-park/border-ranges-national-park-map.pdf)
- [NSW Elevation and Depth theme](https://www.nsw.gov.au/environment-land-and-water/spatial-data-and-mapping/foundation-spatial-data-framework/elevation-and-depth)
- [NSW contour FeatureServer](https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Elevation_and_Depth_Theme/FeatureServer/2)
