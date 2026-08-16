import { loadMarkerAnchor, loadPlaceMarkers, loadProject, loadProjectSites, loadSitePlaces } from './persistence.js';
import { calculateConceptualLayout, SAFE_BOUNDS } from './livingMapLayout.js';

const effectiveMarkerType = marker => marker?.semantic_type === 'area_checkpoint' ? 'area_checkpoint' : marker?.type;
const isHomeArea = area => area?.systemKey === 'home' || ['home', 'unassigned'].includes(String(area?.name || '').trim().toLocaleLowerCase());
const isTotem = (marker, areaName = '') => effectiveMarkerType(marker) === 'area_checkpoint'
    || (effectiveMarkerType(marker) === 'sub_checkpoint'
        && String(marker?.name || '').trim().toLocaleLowerCase() === `${String(areaName || '').trim().toLocaleLowerCase()} totem`);
const hasGps = anchor => anchor?.type === 'gps'
    && Number.isFinite(Number(anchor.latitude))
    && Number.isFinite(Number(anchor.longitude));
const hasPlacement = anchor => Boolean(anchor?.type || anchor?.qr_code || hasGps(anchor));
const safeDate = value => String(value || '').trim();
const activityDate = item => safeDate(item?.modified || item?.created);

function relativeDate(value) {
    if (!value) return 'No date';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Saved record';
    const elapsed = Math.max(0, Date.now() - date.getTime());
    const minutes = Math.round(elapsed / 60000);
    if (minutes < 2) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
    const days = Math.round(hours / 24);
    return days < 7 ? `${days} day${days === 1 ? '' : 's'} ago` : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

function layoutPoints(areas, siteMap, livingMap) {
    const automatic = calculateConceptualLayout(areas);
    const manualPoints = siteMap?.areaPoints || livingMap?.nodes || {};
    return automatic.map((point, index) => {
        const saved = manualPoints?.[areas[index].id];
        const x = Number(saved?.x ?? saved?.normalizedX);
        const y = Number(saved?.y ?? saved?.normalizedY);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return point;
        return {
            x: clamp(x > 1 ? x : x * 100, SAFE_BOUNDS.left, SAFE_BOUNDS.right),
            y: clamp(y > 1 ? y : y * 100, SAFE_BOUNDS.top, SAFE_BOUNDS.bottom),
            positionSource: saved?.positionSource || saved?.source || (siteMap?.image ? 'image' : 'manual'),
            locked: saved?.locked === true
        };
    });
}

function confirmedConnections(project) {
    const links = Array.isArray(project?.livingMap?.links)
        ? project.livingMap.links
        : Array.isArray(project?.livingMap?.relationships) ? project.livingMap.relationships : [];
    return links
        .filter(link => (link.status || 'draft') === 'confirmed' && link.fromAreaId && link.toAreaId)
        .map(link => ({
            id: link.id || `${link.fromAreaId}-${link.toAreaId}`,
            from: link.fromAreaId,
            to: link.toAreaId,
            relationshipType: link.relationshipType || 'Physical path',
            direction: link.direction || 'two-way'
        }));
}

export async function loadProjectDashboardV2Model(projectId) {
    const project = await loadProject(projectId);
    if (!project) throw new Error('Project data is unavailable.');
    const sites = await loadProjectSites(project.id);
    const site = sites.find(item => item.id === 'main_food_forest') || sites[0] || null;
    const places = site ? await loadSitePlaces(project.id, site.id) : [];
    const groups = await Promise.all(places.map(async place => ({
        place,
        markers: site ? await loadPlaceMarkers(project.id, site.id, place.id) : []
    })));
    const entries = groups.flatMap(group => group.markers.map(marker => ({ marker, place: group.place })));
    const placements = await Promise.all(entries.map(async entry => ({
        ...entry,
        anchor: site ? await loadMarkerAnchor(project.id, site.id, entry.place.id, entry.marker.id).catch(() => null) : null
    })));
    placements.forEach(entry => { entry.isPlaced = hasPlacement(entry.anchor); });

    const plantEntries = placements.filter(entry => effectiveMarkerType(entry.marker) === 'plant');
    const placedPlants = plantEntries.filter(entry => entry.isPlaced);
    const totalPlants = plantEntries.length;
    const mappedPercentage = totalPlants ? Math.round((placedPlants.length / totalPlants) * 100) : 0;
    const homeArea = places.find(isHomeArea) || null;
    const siteMap = project.siteMap || {};
    const livingMap = project.livingMap || {};
    const areas = places.map(place => {
        const areaEntries = placements.filter(entry => entry.place.id === place.id);
        const areaPlants = areaEntries.filter(entry => effectiveMarkerType(entry.marker) === 'plant');
        const areaTotems = areaEntries.filter(entry => isTotem(entry.marker, place.name));
        const placedTotems = areaTotems.filter(entry => entry.isPlaced);
        return {
            ...place,
            label: isHomeArea(place) ? 'Home' : String(place.name || 'Unnamed Area'),
            plantCount: areaPlants.length,
            placedPlantCount: areaPlants.filter(entry => entry.isPlaced).length,
            entryCount: areaEntries.length,
            totemCount: areaTotems.length,
            placedTotemCount: placedTotems.length,
            anchor: place.anchor || null,
            current: place.id === homeArea?.id
        };
    });
    const points = layoutPoints(areas, siteMap, livingMap);
    const mapAreas = areas.map((area, index) => ({ ...area, point: points[index] }));
    const connections = confirmedConnections(project);
    const unanchoredAreas = mapAreas.filter(area => !isHomeArea(area) && area.placedTotemCount === 0).length;
    const totalTotems = mapAreas.reduce((count, area) => count + area.totemCount, 0);
    const confirmedTotems = mapAreas.reduce((count, area) => count + area.placedTotemCount, 0);
    const hasSiteImage = Boolean(siteMap.image || livingMap.background?.assetId || livingMap.background?.assetUrl);
    const mapMode = hasSiteImage
        ? (siteMap.status === 'confirmed' || livingMap.background?.status === 'confirmed' ? 'image-aligned' : 'image-draft')
        : 'conceptual';
    const recentActivity = [
        ...placements.map(entry => ({
            id: `entry-${entry.marker.id}`,
            label: `${entry.marker.name || 'Untitled record'} ${entry.isPlaced ? 'placed' : 'added'}`,
            detail: `${entry.place?.name || 'Home'} · ${relativeDate(activityDate(entry.marker))}`,
            type: effectiveMarkerType(entry.marker),
            date: activityDate(entry.marker)
        })),
        ...mapAreas.map(area => ({
            id: `area-${area.id}`,
            label: `${area.label} updated`,
            detail: `Area · ${relativeDate(activityDate(area))}`,
            type: 'area',
            date: activityDate(area)
        }))
    ].filter(item => item.date).sort((left, right) => right.date.localeCompare(left.date)).slice(0, 4);

    return {
        project,
        site,
        areas: mapAreas,
        connections,
        entries: placements,
        plantEntries,
        placements,
        totems: placements.filter(entry => isTotem(entry.marker, entry.place?.name)),
        currentAreaId: homeArea?.id || mapAreas[0]?.id || '',
        totalPlants,
        placedPlants: placedPlants.length,
        mappedPercentage,
        spatialReadiness: {
            state: hasSiteImage || confirmedTotems ? 'configured' : 'not-configured',
            siteImage: hasSiteImage,
            totalTotems,
            confirmedTotems,
            areasWithConfirmedTotems: mapAreas.filter(area => area.placedTotemCount > 0).length,
            mappedPercentage
        },
        // Keep the old shape as an internal compatibility alias for callers
        // that have not yet moved to the V1 wording.
        spatialHealth: {
            totalTotems,
            onlineTotems: confirmedTotems,
            unanchoredAreas,
            gpsAlignment: hasSiteImage ? 'Image aligned' : 'Conceptual',
            mappedPercentage
        },
        recentActivity,
        mapCapabilities: {
            conceptualLayout: true,
            imageBackground: true,
            manualTotemAlignment: true,
            areaRelationships: true,
            conceptualMap: true,
            geographicCoordinates: false,
            gisImport: false,
            gisExport: false,
            vpsLocalisation: false,
            spatialScanning: false,
            vpsAvailable: false,
            spatialScanAvailable: false
        },
        mapMode,
        siteMap,
        livingMap,
        mapWarning: hasSiteImage ? 'Image aligned' : 'Conceptual layout'
    };
}
