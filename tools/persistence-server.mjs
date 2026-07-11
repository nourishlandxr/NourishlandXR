import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const workspaceDir = path.join(rootDir, 'workspace');
const PLACE_TYPES = new Set(['Row', 'Terrace', 'Garden', 'Collection', 'Glasshouse', 'Orchard Block', 'Trail Stop', 'Habitat', 'Water Feature', 'Operational Area', 'Other']);

function sendJson(res, statusCode, payload) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload));
}

function readJson(filePath, fallback = null) {
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
        return fallback;
    }
}

function writeJson(filePath, data) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function ensureProjectFolders(projectId) {
    const projectDir = path.join(workspaceDir, projectId);
    const sitesDir = path.join(projectDir, 'sites');

    fs.mkdirSync(sitesDir, { recursive: true });

    return { projectDir, sitesDir };
}

function toProjectId(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

function isSafeProjectId(projectId) {
    return Boolean(projectId) && projectId === path.basename(projectId) && !projectId.includes('..');
}

function getSitePath(siteId) {
    return path.join(workspaceDir, siteId);
}

function getCanonicalSitePath(projectId, siteId) {
    return path.join(workspaceDir, projectId, 'sites', siteId);
}

function migrateProject(projectId) {
    const projectDir = getSitePath(projectId);
    const projectFile = path.join(projectDir, 'project.json');
    const legacySiteFile = path.join(projectDir, 'site.json');

    if (fs.existsSync(projectFile)) {
        ensureProjectFolders(projectId);
        return;
    }

    const legacy = readJson(legacySiteFile, { id: projectId, name: projectId, locations: [] });
    const siteId = toProjectId(legacy.id || legacy.name) || 'main_site';
    const siteDir = getCanonicalSitePath(projectId, siteId);
    ensureProjectFolders(projectId);
    fs.mkdirSync(path.join(siteDir, 'places'), { recursive: true });
    writeJson(projectFile, {
        id: projectId,
        name: legacy.name || projectId,
        description: legacy.description || '',
        template: legacy.template || ''
    });
    writeJson(path.join(siteDir, 'site.json'), { ...legacy, id: siteId, name: legacy.name || siteId });

    const legacyPlaces = path.join(projectDir, 'places');
    const canonicalPlaces = path.join(siteDir, 'places');
    if (fs.existsSync(legacyPlaces) && !fs.readdirSync(canonicalPlaces).length) {
        fs.rmSync(canonicalPlaces, { recursive: true, force: true });
        fs.renameSync(legacyPlaces, canonicalPlaces);
    }
    fs.rmSync(legacySiteFile, { force: true });
}

function listProjects() {
    if (!fs.existsSync(workspaceDir)) return [];
    return fs.readdirSync(workspaceDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => {
            migrateProject(entry.name);
            return readJson(path.join(workspaceDir, entry.name, 'project.json'), { id: entry.name, name: entry.name });
        });
}

function listProjectSites(projectId) {
    migrateProject(projectId);
    const sitesDir = path.join(workspaceDir, projectId, 'sites');
    return fs.readdirSync(sitesDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => ({ ...readJson(path.join(sitesDir, entry.name, 'site.json'), {}), id: entry.name, projectId }));
}

function normalizeSite(siteId, siteData) {
    const normalized = { ...siteData, id: siteId, name: siteData.name || siteId };
    const locations = Array.isArray(siteData.locations) ? siteData.locations : [];
    normalized.locations = locations;
    return normalized;
}

function loadSiteFromDisk(siteId) {
    const siteRoot = getSitePath(siteId);
    const siteFile = path.join(siteRoot, 'site.json');
    const fallback = { id: siteId, name: siteId, locations: [] };

    if (!fs.existsSync(siteFile)) {
        return fallback;
    }

    const persistedSite = readJson(siteFile, fallback);
    const site = normalizeSite(siteId, persistedSite);
    const placesDir = path.join(siteRoot, 'places');

    if (!fs.existsSync(placesDir)) {
        return site;
    }

    const places = fs.readdirSync(placesDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => {
            const placeId = entry.name;
            const placeDir = path.join(placesDir, placeId);
            const place = readJson(path.join(placeDir, 'place.json'), { id: placeId, name: placeId });
            const markersDir = path.join(placeDir, 'markers');
            const assets = fs.existsSync(markersDir)
                ? fs.readdirSync(markersDir, { withFileTypes: true })
                    .filter(entry => entry.isDirectory())
                    .map(entry => readJson(
                        path.join(markersDir, entry.name, 'marker.json'),
                        { id: entry.name, name: entry.name, category: 'Marker' }
                    ))
                : [];

            return { ...place, id: place.id || placeId, assets };
        });

    return { ...site, locations: places };
}

function listSitesFromDisk() {
    if (!fs.existsSync(workspaceDir)) {
        return [];
    }

    return fs.readdirSync(workspaceDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => loadSiteFromDisk(entry.name));
}

function createProject(projectData) {
    const projectId = toProjectId(projectData.id || projectData.name);

    if (!projectId) {
        throw new Error('Project name is required');
    }

    const projectDir = getSitePath(projectId);
    if (fs.existsSync(projectDir)) {
        throw new Error('A project with this name already exists');
    }

    ensureProjectFolders(projectId);
    const project = {
        id: projectId,
        name: projectData.name.trim(),
        description: projectData.description || '',
        template: projectData.template || ''
    };
    writeJson(path.join(projectDir, 'project.json'), project);
    return project;
}

function renameProject(projectId, projectData) {
    if (!isSafeProjectId(projectId)) {
        throw new Error('Invalid project id');
    }

    const currentDir = getSitePath(projectId);
    if (!fs.existsSync(currentDir)) {
        throw new Error('Project not found');
    }

    const name = String(projectData.name || '').trim();
    const nextProjectId = toProjectId(name);
    if (!nextProjectId) {
        throw new Error('Project name is required');
    }

    const nextDir = getSitePath(nextProjectId);
    if (nextProjectId !== projectId && fs.existsSync(nextDir)) {
        throw new Error('A project with this name already exists');
    }

    if (nextProjectId !== projectId) {
        fs.renameSync(currentDir, nextDir);
    }

    const existing = readJson(path.join(nextDir, 'project.json'), {});
    const renamed = {
        ...existing,
        ...projectData,
        id: nextProjectId,
        name
    };
    writeJson(path.join(nextDir, 'project.json'), renamed);
    return renamed;
}

function deleteProject(projectId) {
    if (!isSafeProjectId(projectId)) {
        throw new Error('Invalid project id');
    }

    const projectDir = getSitePath(projectId);
    if (!fs.existsSync(projectDir)) {
        throw new Error('Project not found');
    }

    fs.rmSync(projectDir, { recursive: true, force: true });
}

function ensurePlaceFolders(siteId, placeId) {
    const placeDir = path.join(getSitePath(siteId), 'places', placeId);
    const markersDir = path.join(placeDir, 'markers');

    fs.mkdirSync(markersDir, { recursive: true });

    return { placeDir, markersDir };
}

function ensureAssetFolders(siteId, placeId, assetId) {
    const markerDir = path.join(getSitePath(siteId), 'places', placeId, 'markers', assetId);
    fs.mkdirSync(markerDir, { recursive: true });
    return { markerDir };
}

function handleApi(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    if (pathname === '/api/projects' && req.method === 'GET') {
        sendJson(res, 200, listProjects());
        return true;
    }

    if (pathname === '/api/projects' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                sendJson(res, 201, createProject(JSON.parse(body || '{}')));
            } catch (error) {
                sendJson(res, 400, { error: error.message });
            }
        });
        return true;
    }

    const projectMatch = pathname.match(/^\/api\/projects\/([^/]+)$/);
    if (projectMatch && req.method === 'GET') {
        const projectId = decodeURIComponent(projectMatch[1]);
        if (!isSafeProjectId(projectId) || !fs.existsSync(getSitePath(projectId))) {
            sendJson(res, 404, { error: 'Project not found' });
        } else {
            migrateProject(projectId);
            sendJson(res, 200, readJson(path.join(getSitePath(projectId), 'project.json'), { id: projectId, name: projectId }));
        }
        return true;
    }

    if (projectMatch && req.method === 'PUT') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                sendJson(res, 200, renameProject(decodeURIComponent(projectMatch[1]), JSON.parse(body || '{}')));
            } catch (error) {
                sendJson(res, 400, { error: error.message });
            }
        });
        return true;
    }

    if (projectMatch && req.method === 'DELETE') {
        try {
            deleteProject(decodeURIComponent(projectMatch[1]));
            sendJson(res, 200, { ok: true });
        } catch (error) {
            sendJson(res, 404, { error: error.message });
        }
        return true;
    }

    const projectSitesMatch = pathname.match(/^\/api\/projects\/([^/]+)\/sites$/);
    if (projectSitesMatch && req.method === 'GET') {
        sendJson(res, 200, listProjectSites(decodeURIComponent(projectSitesMatch[1])));
        return true;
    }
    if (projectSitesMatch && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const projectId = decodeURIComponent(projectSitesMatch[1]);
                const data = JSON.parse(body || '{}');
                const siteId = toProjectId(data.id || data.name);
                if (!siteId) throw new Error('Site name is required');
                const siteDir = getCanonicalSitePath(projectId, siteId);
                if (fs.existsSync(siteDir)) throw new Error('A site with this name already exists');
                fs.mkdirSync(path.join(siteDir, 'places'), { recursive: true });
                const site = { id: siteId, projectId, name: data.name.trim(), description: data.description || '', template: data.template || '' };
                writeJson(path.join(siteDir, 'site.json'), site);
                sendJson(res, 201, site);
            } catch (error) { sendJson(res, 400, { error: error.message }); }
        });
        return true;
    }

    const canonicalSiteMatch = pathname.match(/^\/api\/projects\/([^/]+)\/sites\/([^/]+)$/);
    if (canonicalSiteMatch && req.method === 'PUT') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            const [ , projectId, siteId ] = canonicalSiteMatch;
            const siteFile = path.join(getCanonicalSitePath(decodeURIComponent(projectId), decodeURIComponent(siteId)), 'site.json');
            const existing = readJson(siteFile, null);
            if (!existing) return sendJson(res, 404, { error: 'Site not found' });
            const data = JSON.parse(body || '{}');
            const site = { ...existing, ...data, id: decodeURIComponent(siteId), projectId: decodeURIComponent(projectId) };
            writeJson(siteFile, site);
            sendJson(res, 200, site);
        });
        return true;
    }
    if (canonicalSiteMatch && req.method === 'DELETE') {
        const [ , projectId, siteId ] = canonicalSiteMatch;
        const siteDir = getCanonicalSitePath(decodeURIComponent(projectId), decodeURIComponent(siteId));
        if (!fs.existsSync(siteDir)) return sendJson(res, 404, { error: 'Site not found' });
        fs.rmSync(siteDir, { recursive: true, force: true });
        sendJson(res, 200, { ok: true });
        return true;
    }

    const placesMatch = pathname.match(/^\/api\/projects\/([^/]+)\/sites\/([^/]+)\/places$/);
    if (placesMatch && req.method === 'GET') {
        const [ , projectId, siteId ] = placesMatch;
        const placesDir = path.join(getCanonicalSitePath(decodeURIComponent(projectId), decodeURIComponent(siteId)), 'places');
        if (!fs.existsSync(placesDir)) return sendJson(res, 404, { error: 'Site not found' });
        const places = fs.readdirSync(placesDir, { withFileTypes: true })
            .filter(entry => entry.isDirectory())
            .map(entry => ({ ...readJson(path.join(placesDir, entry.name, 'place.json'), {}), id: entry.name }));
        sendJson(res, 200, places);
        return true;
    }
    if (placesMatch && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const [ , projectId, siteId ] = placesMatch;
                const data = JSON.parse(body || '{}');
                const placeId = toProjectId(data.id || data.name);
                if (!placeId) throw new Error('Place name is required');
                if (!PLACE_TYPES.has(data.type)) throw new Error('Unsupported place type');
                const placeDir = path.join(getCanonicalSitePath(decodeURIComponent(projectId), decodeURIComponent(siteId)), 'places', placeId);
                if (fs.existsSync(placeDir)) throw new Error('A place with this name already exists');
                fs.mkdirSync(path.join(placeDir, 'markers'), { recursive: true });
                const now = new Date().toISOString();
                const place = { id: placeId, name: data.name.trim(), description: data.description || '', type: data.type, created: now, modified: now };
                writeJson(path.join(placeDir, 'place.json'), place);
                sendJson(res, 201, place);
            } catch (error) { sendJson(res, 400, { error: error.message }); }
        });
        return true;
    }

    const canonicalPlaceMatch = pathname.match(/^\/api\/projects\/([^/]+)\/sites\/([^/]+)\/places\/([^/]+)$/);
    if (canonicalPlaceMatch && req.method === 'PUT') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const [ , projectId, siteId, placeId ] = canonicalPlaceMatch;
                const baseDir = path.join(getCanonicalSitePath(decodeURIComponent(projectId), decodeURIComponent(siteId)), 'places');
                const currentDir = path.join(baseDir, decodeURIComponent(placeId));
                const existing = readJson(path.join(currentDir, 'place.json'), null);
                if (!existing) throw new Error('Place not found');
                const data = JSON.parse(body || '{}');
                if (data.type && !PLACE_TYPES.has(data.type)) throw new Error('Unsupported place type');
                const nextId = toProjectId(data.name) || decodeURIComponent(placeId);
                const nextDir = path.join(baseDir, nextId);
                if (nextId !== placeId && fs.existsSync(nextDir)) throw new Error('A place with this name already exists');
                if (nextId !== placeId) fs.renameSync(currentDir, nextDir);
                const place = { ...existing, ...data, id: nextId, name: data.name || existing.name, created: existing.created || new Date().toISOString(), modified: new Date().toISOString() };
                writeJson(path.join(nextDir, 'place.json'), place);
                sendJson(res, 200, place);
            } catch (error) { sendJson(res, 400, { error: error.message }); }
        });
        return true;
    }
    if (canonicalPlaceMatch && req.method === 'DELETE') {
        const [ , projectId, siteId, placeId ] = canonicalPlaceMatch;
        const placeDir = path.join(getCanonicalSitePath(decodeURIComponent(projectId), decodeURIComponent(siteId)), 'places', decodeURIComponent(placeId));
        if (!fs.existsSync(placeDir)) return sendJson(res, 404, { error: 'Place not found' });
        fs.rmSync(placeDir, { recursive: true, force: true });
        sendJson(res, 200, { ok: true });
        return true;
    }

    const markersMatch = pathname.match(/^\/api\/projects\/([^/]+)\/sites\/([^/]+)\/places\/([^/]+)\/markers$/);
    if (markersMatch && req.method === 'GET') {
        const [ , projectId, siteId, placeId ] = markersMatch;
        const markersDir = path.join(getCanonicalSitePath(decodeURIComponent(projectId), decodeURIComponent(siteId)), 'places', decodeURIComponent(placeId), 'markers');
        if (!fs.existsSync(markersDir)) return sendJson(res, 404, { error: 'Place not found' });
        sendJson(res, 200, fs.readdirSync(markersDir, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => readJson(path.join(markersDir, entry.name, 'marker.json'), { id: entry.name })));
        return true;
    }
    if (markersMatch && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const [ , projectId, siteId, placeId ] = markersMatch;
                const data = JSON.parse(body || '{}');
                const type = String(data.type || '').toLowerCase();
                if (!['plant', 'note'].includes(type)) throw new Error('Marker type must be Plant or Note');
                const markerId = toProjectId(data.id || data.name);
                if (!markerId) throw new Error('Marker name is required');
                const markerDir = path.join(getCanonicalSitePath(decodeURIComponent(projectId), decodeURIComponent(siteId)), 'places', decodeURIComponent(placeId), 'markers', markerId);
                if (fs.existsSync(markerDir)) throw new Error('A marker with this name already exists');
                fs.mkdirSync(markerDir, { recursive: true });
                const now = new Date().toISOString();
                const marker = { id: markerId, type, name: data.name.trim(), description: data.description || '', created: now, modified: now };
                writeJson(path.join(markerDir, 'marker.json'), marker);
                writeJson(path.join(markerDir, 'anchor.json'), { type: '', latitude: '', longitude: '', altitude: '', qr_code: '', description: '' });
                if (type === 'plant') writeJson(path.join(markerDir, 'plant_profile.json'), { common_name: data.name.trim(), scientific_name: '', overview: '', identification: '', edible_uses: '', propagation: '', growing_conditions: '', notes: '', references: '' });
                sendJson(res, 201, marker);
            } catch (error) { sendJson(res, 400, { error: error.message }); }
        });
        return true;
    }

    const plantProfileMatch = pathname.match(/^\/api\/projects\/([^/]+)\/sites\/([^/]+)\/places\/([^/]+)\/markers\/([^/]+)\/plant-profile$/);
    if (plantProfileMatch && req.method === 'GET') {
        const [ , projectId, siteId, placeId, markerId ] = plantProfileMatch;
        const markerDir = path.join(getCanonicalSitePath(decodeURIComponent(projectId), decodeURIComponent(siteId)), 'places', decodeURIComponent(placeId), 'markers', decodeURIComponent(markerId));
        const marker = readJson(path.join(markerDir, 'marker.json'), null);
        if (!marker || marker.type !== 'plant') return sendJson(res, 404, { error: 'Plant marker not found' });
        sendJson(res, 200, readJson(path.join(markerDir, 'plant_profile.json'), {}));
        return true;
    }
    if (plantProfileMatch && req.method === 'PUT') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            const [ , projectId, siteId, placeId, markerId ] = plantProfileMatch;
            const markerDir = path.join(getCanonicalSitePath(decodeURIComponent(projectId), decodeURIComponent(siteId)), 'places', decodeURIComponent(placeId), 'markers', decodeURIComponent(markerId));
            const marker = readJson(path.join(markerDir, 'marker.json'), null);
            const data = JSON.parse(body || '{}');
            if (!marker || marker.type !== 'plant') return sendJson(res, 404, { error: 'Plant marker not found' });
            if (!String(data.common_name || '').trim() || !String(data.scientific_name || '').trim()) return sendJson(res, 400, { error: 'Common Name and Scientific Name are required' });
            const existing = readJson(path.join(markerDir, 'plant_profile.json'), {});
            const profile = { ...existing, ...data, common_name: data.common_name.trim(), scientific_name: data.scientific_name.trim(), modified: new Date().toISOString() };
            writeJson(path.join(markerDir, 'plant_profile.json'), profile);
            sendJson(res, 200, profile);
        });
        return true;
    }

    const markerMatch = pathname.match(/^\/api\/projects\/([^/]+)\/sites\/([^/]+)\/places\/([^/]+)\/markers\/([^/]+)$/);
    if (markerMatch && req.method === 'PUT') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const [ , projectId, siteId, placeId, markerId ] = markerMatch;
                const baseDir = path.join(getCanonicalSitePath(decodeURIComponent(projectId), decodeURIComponent(siteId)), 'places', decodeURIComponent(placeId), 'markers');
                const currentDir = path.join(baseDir, decodeURIComponent(markerId));
                const existing = readJson(path.join(currentDir, 'marker.json'), null);
                if (!existing) throw new Error('Marker not found');
                const data = JSON.parse(body || '{}');
                const type = String(data.type || existing.type).toLowerCase();
                if (!['plant', 'note'].includes(type)) throw new Error('Marker type must be Plant or Note');
                const nextId = toProjectId(data.name) || decodeURIComponent(markerId);
                const nextDir = path.join(baseDir, nextId);
                if (nextId !== markerId && fs.existsSync(nextDir)) throw new Error('A marker with this name already exists');
                if (nextId !== markerId) fs.renameSync(currentDir, nextDir);
                const marker = { ...existing, ...data, id: nextId, type, name: data.name || existing.name, modified: new Date().toISOString() };
                writeJson(path.join(nextDir, 'marker.json'), marker);
                sendJson(res, 200, marker);
            } catch (error) { sendJson(res, 400, { error: error.message }); }
        });
        return true;
    }
    if (markerMatch && req.method === 'DELETE') {
        const [ , projectId, siteId, placeId, markerId ] = markerMatch;
        const markerDir = path.join(getCanonicalSitePath(decodeURIComponent(projectId), decodeURIComponent(siteId)), 'places', decodeURIComponent(placeId), 'markers', decodeURIComponent(markerId));
        if (!fs.existsSync(markerDir)) return sendJson(res, 404, { error: 'Marker not found' });
        fs.rmSync(markerDir, { recursive: true, force: true });
        sendJson(res, 200, { ok: true });
        return true;
    }

    if (pathname === '/api/sites') {
        if (req.method === 'GET') {
            sendJson(res, 200, listSitesFromDisk());
            return true;
        }

        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                const siteData = JSON.parse(body || '{}');
                const siteId = (siteData.id || siteData.name || 'new_site').toLowerCase().replace(/\s+/g, '_');
                ensureProjectFolders(siteId);
                const normalizedSite = normalizeSite(siteId, {
                    ...siteData,
                    id: siteId,
                    locations: siteData.locations || []
                });
                writeJson(path.join(workspaceDir, siteId, 'site.json'), normalizedSite);
                sendJson(res, 200, normalizedSite);
            });
            return true;
        }
    }

    const siteMatch = pathname.match(/^\/api\/sites\/([^/]+)$/);
    if (siteMatch && req.method === 'GET') {
        const siteId = decodeURIComponent(siteMatch[1]);
        sendJson(res, 200, loadSiteFromDisk(siteId));
        return true;
    }

    if (siteMatch && req.method === 'PUT') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            const siteId = decodeURIComponent(siteMatch[1]);
            const siteData = JSON.parse(body || '{}');
            const normalizedSite = normalizeSite(siteId, siteData);
            ensureProjectFolders(siteId);
            writeJson(path.join(workspaceDir, siteId, 'site.json'), normalizedSite);
            sendJson(res, 200, normalizedSite);
        });
        return true;
    }

    const placeMatch = pathname.match(/^\/api\/sites\/([^/]+)\/locations$/);
    if (placeMatch && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            const siteId = decodeURIComponent(placeMatch[1]);
            const placeData = JSON.parse(body || '{}');
            const siteFile = path.join(getSitePath(siteId), 'site.json');
            const siteData = readJson(siteFile, { id: siteId, name: siteId, locations: [] });
            const placeId = placeData.id || (placeData.name || 'place').toLowerCase().replace(/\s+/g, '_');
            const normalizedPlace = { ...placeData, id: placeId, assets: placeData.assets || [] };
            const locations = Array.isArray(siteData.locations) ? siteData.locations : [];
            const nextLocations = [...locations.filter(location => location.id !== placeId), normalizedPlace];
            const updatedSite = { ...siteData, id: siteId, locations: nextLocations };
            ensurePlaceFolders(siteId, placeId);
            writeJson(siteFile, updatedSite);
            writeJson(path.join(getSitePath(siteId), 'places', placeId, 'place.json'), normalizedPlace);
            sendJson(res, 200, normalizedPlace);
        });
        return true;
    }

    const placeUpdateMatch = pathname.match(/^\/api\/sites\/([^/]+)\/locations\/([^/]+)$/);
    if (placeUpdateMatch && req.method === 'PUT') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            const [ , siteId, placeId ] = placeUpdateMatch;
            const siteFile = path.join(getSitePath(decodeURIComponent(siteId)), 'site.json');
            const siteData = readJson(siteFile, { id: decodeURIComponent(siteId), name: decodeURIComponent(siteId), locations: [] });
            const placeData = JSON.parse(body || '{}');
            const nextLocations = (siteData.locations || []).map(location => location.id === decodeURIComponent(placeId) ? { ...location, ...placeData } : location);
            const updatedSite = { ...siteData, locations: nextLocations };
            writeJson(siteFile, updatedSite);
            writeJson(path.join(getSitePath(decodeURIComponent(siteId)), 'places', decodeURIComponent(placeId), 'place.json'), { ...placeData, id: decodeURIComponent(placeId) });
            sendJson(res, 200, { ...placeData, id: decodeURIComponent(placeId) });
        });
        return true;
    }

    if (placeUpdateMatch && req.method === 'DELETE') {
        const [ , siteId, placeId ] = placeUpdateMatch;
        const siteFile = path.join(getSitePath(decodeURIComponent(siteId)), 'site.json');
        const siteData = readJson(siteFile, { id: decodeURIComponent(siteId), name: decodeURIComponent(siteId), locations: [] });
        const updatedSite = { ...siteData, locations: (siteData.locations || []).filter(location => location.id !== decodeURIComponent(placeId)) };
        writeJson(siteFile, updatedSite);
        sendJson(res, 200, { ok: true });
        return true;
    }

    const assetMatch = pathname.match(/^\/api\/sites\/([^/]+)\/locations\/([^/]+)\/assets$/);
    if (assetMatch && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            const [ , siteId, placeId ] = assetMatch;
            const siteFile = path.join(getSitePath(decodeURIComponent(siteId)), 'site.json');
            const siteData = readJson(siteFile, { id: decodeURIComponent(siteId), name: decodeURIComponent(siteId), locations: [] });
            const assetData = JSON.parse(body || '{}');
            const assetId = assetData.id || (assetData.name || 'asset').toLowerCase().replace(/\s+/g, '_');
            const normalizedAsset = { ...assetData, id: assetId };
            const nextLocations = (siteData.locations || []).map(location => {
                if (location.id !== decodeURIComponent(placeId)) {
                    return location;
                }

                const existingAssets = Array.isArray(location.assets) ? location.assets : [];
                return {
                    ...location,
                    assets: [...existingAssets.filter(asset => asset.id !== assetId), normalizedAsset]
                };
            });
            const updatedSite = { ...siteData, locations: nextLocations };
            ensureAssetFolders(decodeURIComponent(siteId), decodeURIComponent(placeId), assetId);
            writeJson(siteFile, updatedSite);
            writeJson(path.join(getSitePath(decodeURIComponent(siteId)), 'places', decodeURIComponent(placeId), 'markers', assetId, 'marker.json'), normalizedAsset);
            sendJson(res, 200, normalizedAsset);
        });
        return true;
    }

    const assetUpdateMatch = pathname.match(/^\/api\/sites\/([^/]+)\/locations\/([^/]+)\/assets\/([^/]+)$/);
    if (assetUpdateMatch && req.method === 'PUT') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            const [ , siteId, placeId, assetId ] = assetUpdateMatch;
            const siteFile = path.join(getSitePath(decodeURIComponent(siteId)), 'site.json');
            const siteData = readJson(siteFile, { id: decodeURIComponent(siteId), name: decodeURIComponent(siteId), locations: [] });
            const assetData = JSON.parse(body || '{}');
            const nextLocations = (siteData.locations || []).map(location => {
                if (location.id !== decodeURIComponent(placeId)) {
                    return location;
                }

                const existingAssets = Array.isArray(location.assets) ? location.assets : [];
                return {
                    ...location,
                    assets: existingAssets.map(asset => asset.id === decodeURIComponent(assetId) ? { ...asset, ...assetData } : asset)
                };
            });
            const updatedSite = { ...siteData, locations: nextLocations };
            writeJson(siteFile, updatedSite);
            writeJson(path.join(getSitePath(decodeURIComponent(siteId)), 'places', decodeURIComponent(placeId), 'markers', decodeURIComponent(assetId), 'marker.json'), { ...assetData, id: decodeURIComponent(assetId) });
            sendJson(res, 200, { ...assetData, id: decodeURIComponent(assetId) });
        });
        return true;
    }

    if (assetUpdateMatch && req.method === 'DELETE') {
        const [ , siteId, placeId, assetId ] = assetUpdateMatch;
        const siteFile = path.join(getSitePath(decodeURIComponent(siteId)), 'site.json');
        const siteData = readJson(siteFile, { id: decodeURIComponent(siteId), name: decodeURIComponent(siteId), locations: [] });
        const nextLocations = (siteData.locations || []).map(location => {
            if (location.id !== decodeURIComponent(placeId)) {
                return location;
            }

            const existingAssets = Array.isArray(location.assets) ? location.assets : [];
            return {
                ...location,
                assets: existingAssets.filter(asset => asset.id !== decodeURIComponent(assetId))
            };
        });
        const updatedSite = { ...siteData, locations: nextLocations };
        writeJson(siteFile, updatedSite);
        sendJson(res, 200, { ok: true });
        return true;
    }

    return false;
}

const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;

    if (pathname === '/') {
        res.writeHead(302, { Location: '/app/' });
        res.end();
        return;
    }

    if (!pathname.startsWith('/api/') && (pathname === '/sites' || pathname.startsWith('/sites/') || pathname.split('/').includes('sites'))) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
    }

    if (handleApi(req, res)) {
        return;
    }

    const requestUrl = req.url;
    const requestPathname = new URL(requestUrl, `http://${req.headers.host}`).pathname;
    const safePath = requestPathname === '/' ? '/app/index.html' : requestPathname;
    const filePath = path.join(rootDir, safePath.replace(/^\//, ''));

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        const fallbackPath = path.join(rootDir, 'app', 'index.html');
        if (fs.existsSync(fallbackPath)) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(fs.readFileSync(fallbackPath, 'utf8'));
            return;
        }

        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.ico': 'image/x-icon'
    }[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(fs.readFileSync(filePath));
});

const port = process.env.PORT || 8000;
server.listen(port, '127.0.0.1', () => {
    console.log(`Persistence server listening on http://127.0.0.1:${port}`);
});
