import fs from 'fs';
import path from 'path';

const workspaceRoot = path.resolve(process.cwd(), 'workspace');

function ensureProjectDir(projectName) {
    const projectDir = path.join(workspaceRoot, projectName);
    fs.mkdirSync(projectDir, { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'places'), { recursive: true });
    return projectDir;
}

function readJson(filePath, fallback = {}) {
    if (!fs.existsSync(filePath)) {
        return fallback;
    }

    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        return fallback;
    }
}

function writeJson(filePath, data) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function toUiSite(projectName, siteData) {
    const projectDir = ensureProjectDir(projectName);
    const locations = [];
    const placesDir = path.join(projectDir, 'places');

    if (fs.existsSync(placesDir)) {
        const placeIds = fs.readdirSync(placesDir, { withFileTypes: true })
            .filter(entry => entry.isDirectory())
            .map(entry => entry.name);

        placeIds.forEach(placeId => {
            const placePath = path.join(placesDir, placeId, 'place.json');
            const placeData = readJson(placePath, { id: placeId, name: placeId, type: 'Place' });
            const markersDir = path.join(placesDir, placeId, 'markers');
            const assets = [];

            if (fs.existsSync(markersDir)) {
                fs.readdirSync(markersDir, { withFileTypes: true })
                    .filter(entry => entry.isDirectory())
                    .forEach(markerEntry => {
                        const markerPath = path.join(markersDir, markerEntry.name, 'marker.json');
                        const markerData = readJson(markerPath, { id: markerEntry.name, name: markerEntry.name, type: 'Marker' });
                        assets.push({
                            id: markerData.id || markerEntry.name,
                            name: markerData.name || markerEntry.name,
                            category: markerData.type || 'Marker'
                        });
                    });
            }

            locations.push({
                id: placeData.id || placeId,
                name: placeData.name || placeId,
                type: placeData.type || 'Place',
                description: placeData.description || '',
                notes: placeData.notes || '',
                mapPosition: placeData.mapPosition || 'Not set',
                assets
            });
        });
    }

    return {
        id: siteData.id || projectName.toLowerCase(),
        name: siteData.name || projectName,
        template: siteData.template || 'generic',
        locations
    };
}

export function loadSite(projectName) {
    const projectDir = ensureProjectDir(projectName);
    const sitePath = path.join(projectDir, 'site.json');
    const siteData = readJson(sitePath, { id: projectName.toLowerCase(), name: projectName, template: 'generic' });
    return toUiSite(projectName, siteData);
}

export function loadSiteList() {
    if (!fs.existsSync(workspaceRoot)) {
        return [];
    }

    return fs.readdirSync(workspaceRoot, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => loadSite(entry.name));
}

export function saveSite(projectName, siteData) {
    const projectDir = ensureProjectDir(projectName);
    const nextSiteData = {
        id: siteData.id || projectName.toLowerCase(),
        name: siteData.name || projectName,
        template: siteData.template || 'generic'
    };

    writeJson(path.join(projectDir, 'site.json'), nextSiteData);
    return loadSite(projectName);
}

export function createPlace(projectName, placeData) {
    const projectDir = ensureProjectDir(projectName);
    const placeDir = path.join(projectDir, 'places', placeData.id);
    fs.mkdirSync(placeDir, { recursive: true });
    fs.mkdirSync(path.join(placeDir, 'markers'), { recursive: true });
    writeJson(path.join(placeDir, 'place.json'), {
        id: placeData.id,
        name: placeData.name,
        type: placeData.type || 'Place',
        description: placeData.description || '',
        notes: placeData.notes || '',
        mapPosition: placeData.mapPosition || 'Not set'
    });

    return loadSite(projectName);
}

export function updatePlace(projectName, placeData) {
    const projectDir = ensureProjectDir(projectName);
    const placeDir = path.join(projectDir, 'places', placeData.id);
    fs.mkdirSync(placeDir, { recursive: true });
    fs.mkdirSync(path.join(placeDir, 'markers'), { recursive: true });
    writeJson(path.join(placeDir, 'place.json'), {
        id: placeData.id,
        name: placeData.name,
        type: placeData.type || 'Place',
        description: placeData.description || '',
        notes: placeData.notes || '',
        mapPosition: placeData.mapPosition || 'Not set'
    });

    return loadSite(projectName);
}

export function deletePlace(projectName, placeId) {
    const projectDir = ensureProjectDir(projectName);
    const placeDir = path.join(projectDir, 'places', placeId);
    if (fs.existsSync(placeDir)) {
        fs.rmSync(placeDir, { recursive: true, force: true });
    }

    return loadSite(projectName);
}

export function createMarker(projectName, placeId, markerData) {
    const projectDir = ensureProjectDir(projectName);
    const markerDir = path.join(projectDir, 'places', placeId, 'markers', markerData.id);
    fs.mkdirSync(markerDir, { recursive: true });
    writeJson(path.join(markerDir, 'marker.json'), markerData);

    if (markerData.type === 'Plant') {
        writeJson(path.join(markerDir, 'plant_profile.json'), {
            name: markerData.name,
            notes: 'Plant profile placeholder'
        });
    }

    writeJson(path.join(markerDir, 'anchors.json'), {
        anchors: []
    });

    return loadSite(projectName);
}

export function updateMarker(projectName, placeId, markerData) {
    const projectDir = ensureProjectDir(projectName);
    const markerDir = path.join(projectDir, 'places', placeId, 'markers', markerData.id);
    fs.mkdirSync(markerDir, { recursive: true });
    writeJson(path.join(markerDir, 'marker.json'), markerData);

    if (markerData.type === 'Plant') {
        writeJson(path.join(markerDir, 'plant_profile.json'), {
            name: markerData.name,
            notes: 'Plant profile placeholder'
        });
    }

    writeJson(path.join(markerDir, 'anchors.json'), {
        anchors: []
    });

    return loadSite(projectName);
}

export function deleteMarker(projectName, placeId, markerId) {
    const projectDir = ensureProjectDir(projectName);
    const markerDir = path.join(projectDir, 'places', placeId, 'markers', markerId);
    if (fs.existsSync(markerDir)) {
        fs.rmSync(markerDir, { recursive: true, force: true });
    }

    return loadSite(projectName);
}