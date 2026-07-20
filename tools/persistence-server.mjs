import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const workspaceDir = path.resolve(process.env.NOURISHLAND_WORKSPACE_DIR || path.join(rootDir, 'workspace'));
const production = process.env.NODE_ENV === 'production';
const creatorPassword = process.env.NOURISHLAND_CREATOR_PASSWORD || '';
const sessionSecret = process.env.NOURISHLAND_SESSION_SECRET || '';
const creatorAuthDisabled = String(process.env.NOURISHLAND_CREATOR_AUTH_DISABLED || '').trim().toLowerCase() === 'true';
const publicOrigin = (process.env.NOURISHLAND_PUBLIC_ORIGIN || 'https://nourishland.org').replace(/\/$/, '');
const sessionTtlMs = 12 * 60 * 60 * 1000;
const PLACE_TYPES = new Set([
    'Outdoor Area',
    'Indoor Area',
    'Bed or Plot',
    'Room',
    'Enclosure',
    'Path or Route',
    'Other',
    'Row',
    'Terrace',
    'Garden',
    'Collection',
    'Glasshouse',
    'Orchard Block',
    'Trail Stop',
    'Habitat',
    'Water Feature',
    'Operational Area'
]);
const PROJECT_THEMES = new Set(['light', 'dark', 'forest-dark', 'forest-light', 'cyber']);
const MARKER_TYPES = new Set(['plant', 'note', 'intro_checkpoint', 'sub_checkpoint', 'area_checkpoint']);
const VISIBILITY_VALUES = new Set(['draft', 'public', 'hidden']);
const demoPlaceDir = path.join(workspaceDir, 'Hillyards', 'sites', 'main_food_forest', 'places', 'field_markers');
const demoMarkersDir = path.join(demoPlaceDir, 'markers');
fs.mkdirSync(workspaceDir, { recursive: true });

function sendJson(res, statusCode, payload) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
        'X-Content-Type-Options': 'nosniff'
    });
    res.end(JSON.stringify(payload));
    return true;
}

function readJson(filePath, fallback = null) {
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
        if (error.code === 'ENOENT') return fallback;
        throw new Error(`Invalid stored JSON: ${path.basename(filePath)}`);
    }
}

function writeJson(filePath, data) {
    const directory = path.dirname(filePath);
    fs.mkdirSync(directory, { recursive: true });
    const serialized = JSON.stringify(data, null, 2) + '\n';
    JSON.parse(serialized);

    if (fs.existsSync(filePath)) {
        const backupDir = path.join(directory, '.backups');
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        fs.mkdirSync(backupDir, { recursive: true });
        fs.copyFileSync(filePath, path.join(backupDir, `${path.basename(filePath)}.${stamp}.bak`));
        const backups = fs.readdirSync(backupDir)
            .filter(name => name.startsWith(`${path.basename(filePath)}.`))
            .sort()
            .reverse();
        for (const stale of backups.slice(20)) fs.rmSync(path.join(backupDir, stale), { force: true });
    }

    const tempPath = path.join(directory, `.${path.basename(filePath)}.${process.pid}.${crypto.randomUUID()}.tmp`);
    fs.writeFileSync(tempPath, serialized, { encoding: 'utf8', mode: 0o640, flag: 'wx' });
    fs.renameSync(tempPath, filePath);
}

const passengerStrippedApiRoots = new Set(['projects', 'auth', 'health', 'demo-markers', 'plant-library']);

function normalizeApiPath(pathname) {
    if (pathname === '/xr-api') return '/api';
    if (pathname.startsWith('/xr-api/')) return `/api/${pathname.slice('/xr-api/'.length)}`;
    if (production && pathname === '/') return '/api';
    const rootSegment = pathname.split('/').filter(Boolean)[0];
    if (production && passengerStrippedApiRoots.has(rootSegment)) return `/api${pathname}`;
    return pathname;
}

function parseCookies(req) {
    return Object.fromEntries(String(req.headers.cookie || '').split(';').map(part => part.trim()).filter(Boolean).map(part => {
        const index = part.indexOf('=');
        return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
    }));
}

function signSession(expires) {
    return `${expires}.${crypto.createHmac('sha256', sessionSecret).update(String(expires)).digest('hex')}`;
}

function hasCreatorSession(req) {
    if (!production) return true;
    if (creatorAuthDisabled) return true;
    const token = parseCookies(req).nourishland_creator;
    if (!token || !sessionSecret) return false;
    const [expiresText, signature] = token.split('.');
    const expires = Number(expiresText);
    if (!Number.isFinite(expires) || expires <= Date.now() || !signature) return false;
    const expected = signSession(expires).split('.')[1];
    const left = Buffer.from(signature, 'hex');
    const right = Buffer.from(expected, 'hex');
    return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function setSessionCookie(res, value, maxAge) {
    const secure = production ? '; Secure' : '';
    res.setHeader('Set-Cookie', `nourishland_creator=${encodeURIComponent(value)}; Path=/xr-api/; HttpOnly; SameSite=Strict${secure}; Max-Age=${maxAge}`);
}

function isAllowedOrigin(req) {
    if (!production) return true;
    const origin = String(req.headers.origin || '');
    return origin === publicOrigin;
}

function readRequestJson(req, callback) {
    let body = '';
    req.on('data', chunk => {
        body += chunk;
        if (Buffer.byteLength(body) > 1024 * 1024) req.destroy(new Error('Request body is too large'));
    });
    req.on('end', () => {
        try { callback(null, JSON.parse(body || '{}')); }
        catch (error) { callback(new Error('Request body must contain valid JSON')); }
    });
}

function ensureProjectFolders(projectId) {
    const projectDir = path.join(workspaceDir, projectId);
    const sitesDir = path.join(projectDir, 'sites');

    fs.mkdirSync(sitesDir, { recursive: true });

    return { projectDir, sitesDir };
}

function runPowerShell(command) {
    const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(result.stderr || 'Archive operation failed');
}

function validateProjectDirectory(projectDir) {
    const projectFile = path.join(projectDir, 'project.json');
    const sitesDir = path.join(projectDir, 'sites');
    if (!fs.existsSync(projectFile) || !fs.existsSync(sitesDir)) throw new Error('project.json or sites folder is missing');
    JSON.parse(fs.readFileSync(projectFile, 'utf8'));
    for (const site of fs.readdirSync(sitesDir, { withFileTypes: true }).filter(entry => entry.isDirectory())) {
        const siteDir = path.join(sitesDir, site.name);
        const siteFile = path.join(siteDir, 'site.json');
        const placesDir = path.join(siteDir, 'places');
        if (!fs.existsSync(siteFile) || !fs.existsSync(placesDir)) throw new Error(`Invalid site: ${site.name}`);
        JSON.parse(fs.readFileSync(siteFile, 'utf8'));
        for (const place of fs.readdirSync(placesDir, { withFileTypes: true }).filter(entry => entry.isDirectory())) {
            const placeDir = path.join(placesDir, place.name);
            if (!fs.existsSync(path.join(placeDir, 'place.json')) || !fs.existsSync(path.join(placeDir, 'markers'))) throw new Error(`Invalid place: ${place.name}`);
            JSON.parse(fs.readFileSync(path.join(placeDir, 'place.json'), 'utf8'));
            for (const marker of fs.readdirSync(path.join(placeDir, 'markers'), { withFileTypes: true }).filter(entry => entry.isDirectory())) {
                const markerDir = path.join(placeDir, 'markers', marker.name);
                if (!fs.existsSync(path.join(markerDir, 'marker.json'))) throw new Error(`Invalid marker: ${marker.name}`);
                JSON.parse(fs.readFileSync(path.join(markerDir, 'marker.json'), 'utf8'));
                if (fs.existsSync(path.join(markerDir, 'anchor.json'))) JSON.parse(fs.readFileSync(path.join(markerDir, 'anchor.json'), 'utf8'));
                if (fs.existsSync(path.join(markerDir, 'plant_profile.json'))) JSON.parse(fs.readFileSync(path.join(markerDir, 'plant_profile.json'), 'utf8'));
            }
        }
    }
}

function buildHostedIndexes(projectDir) {
    const projectFile = path.join(projectDir, 'project.json'); const project = readJson(projectFile, {}); const sitesDir = path.join(projectDir, 'sites');
    project.sites = fs.existsSync(sitesDir) ? fs.readdirSync(sitesDir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => {
        const siteFile = path.join(sitesDir, e.name, 'site.json'); const site = readJson(siteFile, { id: e.name, name: e.name }); const placesDir = path.join(sitesDir, e.name, 'places');
        site.places = fs.existsSync(placesDir) ? fs.readdirSync(placesDir, { withFileTypes: true }).filter(p => p.isDirectory()).map(p => {
            const placeFile = path.join(placesDir, p.name, 'place.json'); const place = readJson(placeFile, { id: p.name, name: p.name }); const markersDir = path.join(placesDir, p.name, 'markers');
            place.markers = fs.existsSync(markersDir) ? fs.readdirSync(markersDir, { withFileTypes: true }).filter(m => m.isDirectory()).map(m => { const markerFile=path.join(markersDir,m.name,'marker.json'); const marker = readJson(markerFile, { id: m.name, name: m.name }); if(fs.existsSync(path.join(markersDir,m.name,'plant_profile.json')))marker.plant_profile_path='plant_profile.json'; if(fs.existsSync(path.join(markersDir,m.name,'anchor.json')))marker.anchor_path='anchor.json'; writeJson(markerFile,marker); return { id: marker.id || m.name, name: marker.name || m.name, type: marker.type, path: `markers/${m.name}/marker.json` }; }) : [];
            writeJson(placeFile, place); return { id: place.id || p.name, name: place.name || p.name, path: `places/${p.name}/place.json` };
        }) : []; writeJson(siteFile, site); return { id: site.id || e.name, name: site.name || e.name, path: `sites/${e.name}/site.json` };
    }) : []; writeJson(projectFile, project);
}

function escapePs(value) { return value.replace(/'/g, "''"); }

function normalizeVisibility(value, fallback = 'draft') {
    const visibility = String(value || fallback).toLowerCase();
    if (!VISIBILITY_VALUES.has(visibility)) throw new Error('Visibility must be draft, public or hidden');
    return visibility;
}

function isPublic(record) { return Boolean(record) && !['draft', 'hidden'].includes(record.visibility); }
function isVisitorRequest(url) { return url.searchParams.get('view') === 'visitor'; }

function isPublicHierarchy(projectId, siteId = '', placeId = '') {
    const project = readJson(path.join(workspaceDir, projectId, 'project.json'), null);
    if (!isPublic(project)) return false;
    if (!siteId) return true;
    const site = readJson(path.join(getCanonicalSitePath(projectId, siteId), 'site.json'), null);
    if (!isPublic(site)) return false;
    if (!placeId) return true;
    const place = readJson(path.join(getCanonicalSitePath(projectId, siteId), 'places', placeId, 'place.json'), null);
    return isPublic(place);
}

function toPlantId(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function toProjectId(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

function isSafeProjectId(projectId) {
    return isSafeId(projectId);
}

function isSafeId(value) {
    const id = String(value || '');
    return /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(id);
}

function assertSafeId(value, label = 'id') {
    if (!isSafeId(value)) throw new Error(`Invalid ${label}`);
    return value;
}

function getSitePath(siteId) {
    return path.join(workspaceDir, assertSafeId(siteId, 'project id'));
}

function getCanonicalSitePath(projectId, siteId) {
    return path.join(workspaceDir, assertSafeId(projectId, 'project id'), 'sites', assertSafeId(siteId, 'site id'));
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

function listProjects(visitor = false) {
    if (!fs.existsSync(workspaceDir)) return [];
    const priority = ['hillyards', 'frankendael'];
    return fs.readdirSync(workspaceDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => {
            migrateProject(entry.name);
            return readJson(path.join(workspaceDir, entry.name, 'project.json'), { id: entry.name, name: entry.name });
        })
        .filter(project => !visitor || isPublic(project))
        .sort((left, right) => {
            const leftPriority = priority.indexOf(String(left.id).toLowerCase());
            const rightPriority = priority.indexOf(String(right.id).toLowerCase());
            if (leftPriority !== -1 || rightPriority !== -1) return (leftPriority === -1 ? priority.length : leftPriority) - (rightPriority === -1 ? priority.length : rightPriority);
            return String(left.name).localeCompare(String(right.name));
        });
}

function listProjectSites(projectId, visitor = false) {
    migrateProject(projectId);
    const sitesDir = path.join(workspaceDir, projectId, 'sites');
    return fs.readdirSync(sitesDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => ({ ...readJson(path.join(sitesDir, entry.name, 'site.json'), {}), id: entry.name, projectId }))
        .filter(site => !visitor || isPublic(site));
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
        coverImage: projectData.coverImage || '',
        template: projectData.template || '',
        theme: PROJECT_THEMES.has(projectData.theme) ? projectData.theme : 'forest-light',
        visibility: normalizeVisibility(projectData.visibility)
    };
    writeJson(path.join(projectDir, 'project.json'), project);
    for (const siteName of Array.isArray(projectData.siteSuggestions) ? projectData.siteSuggestions : []) {
        const siteId = toProjectId(siteName);
        if (!siteId) continue;
        const siteDir = path.join(projectDir, 'sites', siteId);
        fs.mkdirSync(path.join(siteDir, 'places'), { recursive: true });
        writeJson(path.join(siteDir, 'site.json'), { id: siteId, name: siteName.trim(), description: '', visibility: 'draft' });
    }
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
    if (projectData.theme !== undefined && !PROJECT_THEMES.has(projectData.theme)) {
        throw new Error('Unsupported project theme');
    }

    const name = String(projectData.name || '').trim();
    const nextProjectId = projectData.preserveId === true ? projectId : toProjectId(name);
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
    const storedProjectData = { ...projectData };
    delete storedProjectData.preserveId;
    const renamed = {
        ...existing,
        ...storedProjectData,
        visibility: normalizeVisibility(projectData.visibility, existing.visibility || 'draft'),
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

function ensureDemoMarkerFolders() {
    fs.mkdirSync(demoMarkersDir, { recursive: true });
    const placeFile = path.join(demoPlaceDir, 'place.json');
    if (!fs.existsSync(placeFile)) writeJson(placeFile, { id: 'field_markers', name: 'Field Markers', type: 'Operational Area', description: 'Markers created from the Hillyards AR demonstration.' });
}

function listDemoMarkers(visitor = false) {
    ensureDemoMarkerFolders();
    return fs.readdirSync(demoMarkersDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => readJson(path.join(demoMarkersDir, entry.name, 'marker.json'), null))
        .filter(marker => marker && (!visitor || isPublic(marker)))
        .sort((left, right) => String(right.created || '').localeCompare(String(left.created || '')));
}

function createDemoMarker(data) {
    ensureDemoMarkerFolders();
    const name = String(data.name || '').trim();
    const type = String(data.type || '').toLowerCase();
    if (!name) throw new Error('Marker name is required');
    if (!MARKER_TYPES.has(type)) throw new Error('Unsupported marker type');
    const baseId = toProjectId(name) || 'marker';
    let markerId = baseId;
    let suffix = 2;
    while (fs.existsSync(path.join(demoMarkersDir, markerId))) markerId = `${baseId}_${suffix++}`;
    const markerDir = path.join(demoMarkersDir, markerId);
    const now = new Date().toISOString();
    const marker = { id: markerId, name, type, status: 'draft', visibility: normalizeVisibility(data.visibility), created: now, modified: now };
    const anchor = { type: 'spatial', latitude: null, longitude: null, altitude: null, accuracy: null };
    fs.mkdirSync(markerDir, { recursive: true });
    writeJson(path.join(markerDir, 'marker.json'), marker);
    writeJson(path.join(markerDir, 'anchor.json'), anchor);
    if (type === 'plant') writeJson(path.join(markerDir, 'plant_profile.json'), {});
    return marker;
}

function updateDemoMarker(markerId, data) {
    const markerDir = path.join(demoMarkersDir, assertSafeId(markerId, 'marker id'));
    const markerFile = path.join(markerDir, 'marker.json');
    const existing = readJson(markerFile, null);
    if (!existing) throw new Error('Marker not found');
    const name = String(data.name ?? existing.name).trim();
    if (!name) throw new Error('Marker name is required');
    const type = String(data.type || existing.type).toLowerCase();
    if (!MARKER_TYPES.has(type)) throw new Error('Unsupported marker type');
    const marker = { ...existing, id: existing.id, name, type, status: data.status || existing.status || 'draft', visibility: normalizeVisibility(data.visibility, existing.visibility || 'draft'), created: existing.created, modified: new Date().toISOString() };
    writeJson(markerFile, marker);
    if (type === 'plant' && !fs.existsSync(path.join(markerDir, 'plant_profile.json'))) writeJson(path.join(markerDir, 'plant_profile.json'), {});
    return marker;
}

function readPlantJson(filePath, emptyValue, label) {
    try {
        if (!fs.existsSync(filePath)) return { data: emptyValue, warnings: [`${label} file is missing.`] };
        return { data: JSON.parse(fs.readFileSync(filePath, 'utf8')), warnings: [] };
    } catch (error) {
        return { data: emptyValue, warnings: [`${label} contains malformed JSON: ${error.message}`] };
    }
}

function loadPlantRegistryData() {
    const result = readPlantJson(path.join(workspaceDir, 'plant-library', 'plants.json'), { version: 1, plants: [] }, 'Plant library');
    if (!Array.isArray(result.data?.plants)) {
        result.warnings.push('Plant library does not contain a plants array.');
        result.data = { ...result.data, version: result.data?.version || 1, plants: [] };
    }
    return result;
}

function loadPlantInstanceData(projectId, siteId) {
    const siteDir = getCanonicalSitePath(assertSafeId(projectId, 'project id'), assertSafeId(siteId, 'site id'));
    const result = readPlantJson(path.join(siteDir, 'plant-instances.json'), { version: 1, instances: [] }, 'Plant instances');
    if (!Array.isArray(result.data?.instances)) {
        result.warnings.push('Plant instance file does not contain an instances array.');
        result.data = { ...result.data, version: result.data?.version || 1, instances: [] };
    }
    return result;
}

function resolvePlantsForPlace(projectId, siteId, placeId, visitor = false) {
    const library = loadPlantRegistryData();
    const instanceData = loadPlantInstanceData(projectId, siteId);
    const warnings = [...library.warnings, ...instanceData.warnings];
    const plantsById = new Map();
    for (const plant of library.data.plants) {
        if (visitor && !isPublic(plant)) continue;
        if (!plant?.id) { warnings.push('A plant record is missing its ID.'); continue; }
        if (plantsById.has(plant.id)) warnings.push(`Duplicate plant ID: ${plant.id}.`);
        plantsById.set(plant.id, plant);
    }
    const seenInstances = new Set();
    const targetPlace = String(placeId).toLowerCase();
    const plants = [];
    for (const instance of instanceData.data.instances) {
        if (!instance?.id) { warnings.push('A plant instance is missing its ID.'); continue; }
        if (seenInstances.has(instance.id)) warnings.push(`Duplicate instance ID: ${instance.id}.`);
        seenInstances.add(instance.id);
        if (!instance.placeId) warnings.push(`Missing place ID for instance ${instance.id}.`);
        if (String(instance.placeId || '').toLowerCase() !== targetPlace) continue;
        if (visitor && !isPublic(instance)) continue;
        const plant = plantsById.get(instance.plantId);
        if (!plant) { warnings.push(`Missing plant reference for instance ${instance.id}: ${instance.plantId || 'blank'}.`); continue; }
        const markerFile = instance.markerId ? path.join(getCanonicalSitePath(projectId, siteId), 'places', String(placeId).toLowerCase(), 'markers', instance.markerId, 'marker.json') : '';
        const marker = markerFile ? readJson(markerFile, null) : null;
        if (visitor && marker && !isPublic(marker)) continue;
        plants.push({ ...instance, ...plant, instanceId: instance.id, plantId: plant.id, markerId: instance.markerId || '', cultivar: instance.cultivarOverride || plant.cultivar || '', commonName: plant.commonName || '', scientificName: plant.scientificName || '', summary: plant.summary || '' });
    }
    return { version: 1, plants, warnings };
}

function createSpatialPlant(projectId, siteId, placeId, data) {
    assertSafeId(projectId, 'project id');
    assertSafeId(siteId, 'site id');
    assertSafeId(placeId, 'place id');
    const placeDir = path.join(getCanonicalSitePath(projectId, siteId), 'places', placeId);
    if (!fs.existsSync(path.join(placeDir, 'place.json'))) throw new Error('Place not found');
    const requestedPlantId = String(data.plantId || '').trim();
    const existingPlant = requestedPlantId ? loadPlantRegistryData().data.plants.find(plant => plant.id === requestedPlantId) : null;
    if (requestedPlantId && !existingPlant) throw new Error('Selected plant profile was not found');
    const commonName = String(data.commonName || existingPlant?.commonName || '').trim();
    const scientificName = String(data.scientificName || existingPlant?.scientificName || '').trim();
    const summary = String(data.description || data.summary || '').trim();
    if (!commonName) throw new Error('Common Name is required');
    const hasAnyPosition = [data.latitude, data.longitude, data.accuracy].some(value => value !== undefined && value !== null && value !== '');
    const latitude = hasAnyPosition ? Number(data.latitude) : null;
    const longitude = hasAnyPosition ? Number(data.longitude) : null;
    const accuracy = hasAnyPosition ? Number(data.accuracy) : null;
    if (hasAnyPosition && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) throw new Error('Latitude must be between -90 and 90');
    if (hasAnyPosition && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) throw new Error('Longitude must be between -180 and 180');
    if (hasAnyPosition && (!Number.isFinite(accuracy) || accuracy < 0)) throw new Error('GPS accuracy is required when a position is supplied');
    const visibility = normalizeVisibility(data.visibility);
    if (existingPlant && visibility === 'public' && !isPublic(existingPlant)) throw new Error('Publish the shared plant profile before using it in a public specimen');
    const libraryFile = path.join(workspaceDir, 'plant-library', 'plants.json');
    const instancesFile = path.join(getCanonicalSitePath(projectId, siteId), 'plant-instances.json');
    const libraryExisted = fs.existsSync(libraryFile);
    const instancesExisted = fs.existsSync(instancesFile);
    const library = loadPlantRegistryData().data;
    const instanceData = loadPlantInstanceData(projectId, siteId).data;
    const plantBaseId = toPlantId(scientificName || commonName) || 'plant';
    let plantId = existingPlant?.id || plantBaseId, plantSuffix = 2;
    while (!existingPlant && library.plants.some(plant => plant.id === plantId)) plantId = `${plantBaseId}-${plantSuffix++}`;
    const markerBaseId = toProjectId(data.markerId || commonName) || 'plant_marker';
    let markerId = markerBaseId, markerSuffix = 2;
    const markersDir = path.join(placeDir, 'markers');
    while (fs.existsSync(path.join(markersDir, markerId))) markerId = `${markerBaseId}_${markerSuffix++}`;
    const instanceBaseId = toPlantId(`${projectId}-${siteId}-${placeId}-${plantId}`) || 'plant-instance';
    let instanceId = instanceBaseId, instanceSuffix = 2;
    while (instanceData.instances.some(instance => instance.id === instanceId)) instanceId = `${instanceBaseId}-${instanceSuffix++}`;
    const now = new Date().toISOString();
    const plant = existingPlant || { id: plantId, commonName, scientificName, cultivar: '', family: String(data.family || ''), origin: '', plantType: '', layer: '', uses: [], propagation: [], summary, image: '', visibility, created: now, modified: now };
    const instance = { id: instanceId, plantId, placeId, zoneId: '', markerId, cultivarOverride: '', status: data.status || '', plantingDate: '', localNotes: '', map: { latitude, longitude, x: null, y: null }, visibility, created: now, modified: now };
    const marker = { id: markerId, type: 'plant', name: commonName, description: '', notes: '', parent_checkpoint: '', plantId, plantInstanceId: instanceId, status: data.status || 'ready', visibility, created: now, modified: now };
    const anchor = hasAnyPosition ? { type: 'gps', latitude, longitude, altitude: data.altitude ?? '', accuracy, captured_at: data.captured_at || now, qr_code: '', description: '', created: now, modified: now } : null;
    const markerDir = path.join(markersDir, markerId);
    try {
        if (!existingPlant) library.plants.push(plant);
        instanceData.instances.push(instance);
        writeJson(libraryFile, library);
        writeJson(instancesFile, instanceData);
        fs.mkdirSync(markerDir, { recursive: false });
        writeJson(path.join(markerDir, 'marker.json'), marker);
        if (anchor) writeJson(path.join(markerDir, 'anchor.json'), anchor);
        return { plant, instance, marker, anchor, projectId, siteId, placeId };
    } catch (error) {
        fs.rmSync(markerDir, { recursive: true, force: true });
        if (!existingPlant && libraryExisted) writeJson(libraryFile, { ...library, plants: library.plants.filter(item => item.id !== plantId) });
        else if (!existingPlant) fs.rmSync(libraryFile, { force: true });
        if (instancesExisted) writeJson(instancesFile, { ...instanceData, instances: instanceData.instances.filter(item => item.id !== instanceId) });
        else fs.rmSync(instancesFile, { force: true });
        throw error;
    }
}

function handleApi(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = normalizeApiPath(url.pathname);

    if (pathname !== '/api' && !pathname.startsWith('/api/')) return false;

    try {
        for (const segment of pathname.split('/').filter(Boolean).slice(1)) {
            assertSafeId(decodeURIComponent(segment), 'API path segment');
        }
    } catch (error) {
        return sendJson(res, 400, { error: error.message });
    }

    const visitor = isVisitorRequest(url);

    if (pathname === '/api/auth/session' && req.method === 'GET') {
        return sendJson(res, 200, { authenticated: hasCreatorSession(req), required: production && !creatorAuthDisabled, authDisabled: creatorAuthDisabled });
    }
    if (pathname === '/api/health' && req.method === 'GET') {
        return sendJson(res, 200, {
            ok: true,
            service: 'nourishland-xr-api',
            auth: {
                disabled: creatorAuthDisabled,
                session: 'GET /auth/session',
                login: 'POST /auth/login',
                logout: 'POST /auth/logout'
            }
        });
    }
    if (pathname === '/api' && req.method === 'GET') {
        return sendJson(res, 200, { ok: true, service: 'nourishland-xr-api', health: '/xr-api/health' });
    }
    const loginRequest = req.method === 'POST' && ['/api/auth/login', '/api/auth/session'].includes(pathname);
    if (loginRequest) {
        if (!isAllowedOrigin(req)) return sendJson(res, 403, { error: 'Request origin is not allowed' });
        if (creatorAuthDisabled) return sendJson(res, 200, { authenticated: true, required: false, authDisabled: true });
        readRequestJson(req, (error, data) => {
            if (error) return sendJson(res, 400, { error: error.message });
            const supplied = Buffer.from(String(data.password || ''));
            const expected = Buffer.from(creatorPassword);
            if (!creatorPassword || supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
                return sendJson(res, 401, { error: 'Invalid Creator password' });
            }
            const expires = Date.now() + sessionTtlMs;
            setSessionCookie(res, signSession(expires), Math.floor(sessionTtlMs / 1000));
            return sendJson(res, 200, { authenticated: true });
        });
        return true;
    }
    const logoutRequest = (pathname === '/api/auth/logout' && req.method === 'POST')
        || (pathname === '/api/auth/session' && req.method === 'DELETE');
    if (logoutRequest) {
        if (creatorAuthDisabled) return sendJson(res, 200, { authenticated: true, required: false, authDisabled: true });
        if (!hasCreatorSession(req)) return sendJson(res, 401, { error: 'Creator authentication required' });
        if (!isAllowedOrigin(req)) return sendJson(res, 403, { error: 'Request origin is not allowed' });
        setSessionCookie(res, '', 0);
        return sendJson(res, 200, { authenticated: false });
    }

    const writeRequest = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    if ((writeRequest || !visitor) && !hasCreatorSession(req)) {
        return sendJson(res, 401, { error: 'Creator authentication required' });
    }
    if (writeRequest && !isAllowedOrigin(req)) {
        return sendJson(res, 403, { error: 'Request origin is not allowed' });
    }

    if (pathname === '/api/plant-library' && req.method === 'GET') {
        const result = loadPlantRegistryData();
        const plants = visitor ? result.data.plants.filter(isPublic) : result.data.plants;
        return sendJson(res, 200, { ...result.data, plants, warnings: result.warnings });
    }
    if (pathname === '/api/plant-library' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body || '{}');
                const library = loadPlantRegistryData().data;
                const baseId = toPlantId(data.id || data.scientificName || data.commonName);
                if (!baseId) throw new Error('Plant common or scientific name is required');
                let id = baseId, suffix = 2;
                while (library.plants.some(plant => plant.id === id)) id = `${baseId}-${suffix++}`;
                const now = new Date().toISOString();
                const plant = { id, commonName: String(data.commonName || '').trim(), scientificName: String(data.scientificName || '').trim(), cultivar: data.cultivar || '', family: data.family || '', origin: data.origin || '', plantType: data.plantType || '', layer: data.layer || '', uses: Array.isArray(data.uses) ? data.uses : [], propagation: Array.isArray(data.propagation) ? data.propagation : [], summary: data.summary || '', image: data.image || '', visibility: normalizeVisibility(data.visibility), created: now, modified: now };
                library.plants.push(plant);
                writeJson(path.join(workspaceDir, 'plant-library', 'plants.json'), library);
                sendJson(res, 201, plant);
            } catch (error) { sendJson(res, 400, { error: error.message }); }
        });
        return true;
    }

    const plantLibraryItemMatch = pathname.match(/^\/api\/plant-library\/([^/]+)$/);
    if (plantLibraryItemMatch && req.method === 'PUT') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const id = decodeURIComponent(plantLibraryItemMatch[1]);
                const library = loadPlantRegistryData().data;
                const index = library.plants.findIndex(plant => plant.id === id);
                if (index < 0) return sendJson(res, 404, { error: 'Plant not found' });
                const data = JSON.parse(body || '{}');
                library.plants[index] = { ...library.plants[index], ...data, id, visibility: normalizeVisibility(data.visibility, library.plants[index].visibility || 'draft'), modified: new Date().toISOString() };
                writeJson(path.join(workspaceDir, 'plant-library', 'plants.json'), library);
                sendJson(res, 200, library.plants[index]);
            } catch (error) { sendJson(res, 400, { error: error.message }); }
        });
        return true;
    }

    const plantInstancesMatch = pathname.match(/^\/api\/projects\/([^/]+)\/sites\/([^/]+)\/plant-instances$/);
    if (plantInstancesMatch && req.method === 'GET') {
        const projectId = decodeURIComponent(plantInstancesMatch[1]);
        const siteId = decodeURIComponent(plantInstancesMatch[2]);
        if (visitor && !isPublicHierarchy(projectId, siteId)) return sendJson(res, 200, { version: 1, instances: [], warnings: [] });
        const result = loadPlantInstanceData(decodeURIComponent(plantInstancesMatch[1]), decodeURIComponent(plantInstancesMatch[2]));
        const instances = visitor ? result.data.instances.filter(isPublic) : result.data.instances;
        return sendJson(res, 200, { ...result.data, instances, warnings: result.warnings });
    }
    if (plantInstancesMatch && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const projectId = decodeURIComponent(plantInstancesMatch[1]);
                const siteId = decodeURIComponent(plantInstancesMatch[2]);
                const data = JSON.parse(body || '{}');
                const instanceData = loadPlantInstanceData(projectId, siteId).data;
                if (!loadPlantRegistryData().data.plants.some(plant => plant.id === data.plantId)) throw new Error('Plant reference not found');
                if (!String(data.placeId || '').trim()) throw new Error('Place ID is required');
                const baseId = toPlantId(data.id || `${projectId}-${data.placeId}-${data.plantId}`) || 'plant-instance';
                let id = baseId, suffix = 2;
                while (instanceData.instances.some(instance => instance.id === id)) id = `${baseId}-${suffix++}`;
                const now = new Date().toISOString();
                const instance = { id, plantId: data.plantId, placeId: data.placeId, zoneId: data.zoneId || '', markerId: data.markerId || '', cultivarOverride: data.cultivarOverride || '', status: data.status || '', plantingDate: data.plantingDate || '', localNotes: data.localNotes || '', map: data.map || { latitude: null, longitude: null, x: null, y: null }, visibility: normalizeVisibility(data.visibility), created: now, modified: now };
                instanceData.instances.push(instance);
                writeJson(path.join(getCanonicalSitePath(projectId, siteId), 'plant-instances.json'), instanceData);
                sendJson(res, 201, instance);
            } catch (error) { sendJson(res, 400, { error: error.message }); }
        });
        return true;
    }

    const plantInstanceItemMatch = pathname.match(/^\/api\/projects\/([^/]+)\/sites\/([^/]+)\/plant-instances\/([^/]+)$/);
    if (plantInstanceItemMatch && req.method === 'PUT') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const projectId = decodeURIComponent(plantInstanceItemMatch[1]);
                const siteId = decodeURIComponent(plantInstanceItemMatch[2]);
                const id = decodeURIComponent(plantInstanceItemMatch[3]);
                const instanceData = loadPlantInstanceData(projectId, siteId).data;
                const index = instanceData.instances.findIndex(instance => instance.id === id);
                if (index < 0) return sendJson(res, 404, { error: 'Plant instance not found' });
                const data = JSON.parse(body || '{}');
                instanceData.instances[index] = { ...instanceData.instances[index], ...data, id, visibility: normalizeVisibility(data.visibility, instanceData.instances[index].visibility || 'draft'), modified: new Date().toISOString() };
                writeJson(path.join(getCanonicalSitePath(projectId, siteId), 'plant-instances.json'), instanceData);
                sendJson(res, 200, instanceData.instances[index]);
            } catch (error) { sendJson(res, 400, { error: error.message }); }
        });
        return true;
    }

    const placePlantsMatch = pathname.match(/^\/api\/projects\/([^/]+)\/sites\/([^/]+)\/places\/([^/]+)\/plants$/);
    if (placePlantsMatch && req.method === 'POST') {
        readRequestJson(req, (error, data) => {
            if (error) return sendJson(res, 400, { error: error.message });
            try {
                const [ , projectId, siteId, placeId ] = placePlantsMatch;
                sendJson(res, 201, createSpatialPlant(decodeURIComponent(projectId), decodeURIComponent(siteId), decodeURIComponent(placeId), data));
            } catch (failure) { sendJson(res, 400, { error: failure.message }); }
        });
        return true;
    }
    if (placePlantsMatch && req.method === 'GET') {
        const projectId = decodeURIComponent(placePlantsMatch[1]);
        const siteId = decodeURIComponent(placePlantsMatch[2]);
        const placeId = decodeURIComponent(placePlantsMatch[3]);
        if (visitor && !isPublicHierarchy(projectId, siteId, placeId)) return sendJson(res, 200, { version: 1, plants: [], warnings: [] });
        return sendJson(res, 200, resolvePlantsForPlace(decodeURIComponent(placePlantsMatch[1]), decodeURIComponent(placePlantsMatch[2]), decodeURIComponent(placePlantsMatch[3]), visitor));
    }

    if (pathname === '/api/demo-markers' && req.method === 'GET') return sendJson(res, 200, listDemoMarkers(visitor));
    if (pathname === '/api/demo-markers' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => { try { sendJson(res, 201, createDemoMarker(JSON.parse(body || '{}'))); } catch (error) { sendJson(res, 400, { error: error.message }); } });
        return true;
    }

    const demoProfileMatch = pathname.match(/^\/api\/demo-markers\/([^/]+)\/plant-profile$/);
    if (demoProfileMatch && req.method === 'GET') {
        const markerId = decodeURIComponent(demoProfileMatch[1]);
        const markerDir = path.join(demoMarkersDir, assertSafeId(markerId, 'marker id'));
        if (!fs.existsSync(path.join(markerDir, 'plant_profile.json'))) return sendJson(res, 404, { error: 'Plant profile not found' });
        return sendJson(res, 200, readJson(path.join(markerDir, 'plant_profile.json'), {}));
    }
    if (demoProfileMatch && req.method === 'PUT') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const markerId = decodeURIComponent(demoProfileMatch[1]);
                const markerDir = path.join(demoMarkersDir, assertSafeId(markerId, 'marker id'));
                const marker = readJson(path.join(markerDir, 'marker.json'), null);
                if (!marker || marker.type !== 'plant') return sendJson(res, 404, { error: 'Plant marker not found' });
                const profile = { ...readJson(path.join(markerDir, 'plant_profile.json'), {}), ...JSON.parse(body || '{}'), modified: new Date().toISOString() };
                writeJson(path.join(markerDir, 'plant_profile.json'), profile);
                sendJson(res, 200, profile);
            } catch (error) { sendJson(res, 400, { error: error.message }); }
        });
        return true;
    }

    const demoMarkerMatch = pathname.match(/^\/api\/demo-markers\/([^/]+)$/);
    if (demoMarkerMatch && req.method === 'PUT') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => { try { sendJson(res, 200, updateDemoMarker(decodeURIComponent(demoMarkerMatch[1]), JSON.parse(body || '{}'))); } catch (error) { sendJson(res, 404, { error: error.message }); } });
        return true;
    }
    if (demoMarkerMatch && req.method === 'DELETE') {
        try {
            const markerDir = path.join(demoMarkersDir, assertSafeId(decodeURIComponent(demoMarkerMatch[1]), 'marker id'));
            if (!fs.existsSync(markerDir)) return sendJson(res, 404, { error: 'Marker not found' });
            fs.rmSync(markerDir, { recursive: true, force: true });
            return sendJson(res, 200, { ok: true });
        } catch (error) { return sendJson(res, 400, { error: error.message }); }
    }

    if (pathname === '/api/projects/import' && req.method === 'POST') {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => {
            const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nourishland-import-'));
            try {
                const archivePath = path.join(tempDir, 'project.zip');
                fs.writeFileSync(archivePath, Buffer.concat(chunks));
                const extractDir = path.join(tempDir, 'extracted');
                runPowerShell(`Expand-Archive -LiteralPath '${escapePs(archivePath)}' -DestinationPath '${escapePs(extractDir)}' -Force`);
                const entries = fs.readdirSync(extractDir, { withFileTypes: true }).filter(entry => entry.isDirectory());
                if (entries.length !== 1) throw new Error('ZIP must contain exactly one project folder');
                const sourceDir = path.join(extractDir, entries[0].name);
                validateProjectDirectory(sourceDir);
                const project = JSON.parse(fs.readFileSync(path.join(sourceDir, 'project.json'), 'utf8'));
                let projectId = project.id || toProjectId(entries[0].name);
                let targetDir = path.join(workspaceDir, projectId);
                if (fs.existsSync(targetDir)) {
                    if (req.headers['x-import-as-copy'] !== 'true') { sendJson(res, 409, { error: 'Project ID already exists', conflict: projectId }); return; }
                    const base = toProjectId(`${projectId}_copy`) || 'project_copy'; let index = 1;
                    projectId = base;
                    while (fs.existsSync(path.join(workspaceDir, projectId))) projectId = `${base}_${index++}`;
                    targetDir = path.join(workspaceDir, projectId);
                    project.id = projectId;
                    project.name = `${project.name || entries[0].name} Copy`;
                    fs.writeFileSync(path.join(sourceDir, 'project.json'), JSON.stringify(project, null, 2) + '\n');
                }
                fs.cpSync(sourceDir, targetDir, { recursive: true, errorOnExist: true });
                sendJson(res, 201, project);
            } catch (error) { sendJson(res, 400, { error: error.message }); }
            finally { fs.rmSync(tempDir, { recursive: true, force: true }); }
        });
        return true;
    }

    const exportMatch = pathname.match(/^\/api\/projects\/([^/]+)\/export$/);
    if (exportMatch && req.method === 'GET') {
        const projectId = decodeURIComponent(exportMatch[1]);
        const projectDir = getSitePath(projectId);
        if (!fs.existsSync(projectDir)) { sendJson(res, 404, { error: 'Project not found' }); return true; }
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nourishland-export-'));
        try {
            validateProjectDirectory(projectDir);
            buildHostedIndexes(projectDir);
            const archivePath = path.join(tempDir, `${projectId}.zip`);
            runPowerShell(`Compress-Archive -LiteralPath '${escapePs(projectDir)}' -DestinationPath '${escapePs(archivePath)}' -Force`);
            res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${projectId}.zip"` });
            res.end(fs.readFileSync(archivePath));
        } catch (error) { sendJson(res, 400, { error: error.message }); }
        finally { fs.rmSync(tempDir, { recursive: true, force: true }); }
        return true;
    }

    if (pathname === '/api/projects' && req.method === 'GET') {
        sendJson(res, 200, listProjects(visitor));
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
            const project = readJson(path.join(getSitePath(projectId), 'project.json'), { id: projectId, name: projectId });
            if (visitor && !isPublic(project)) sendJson(res, 404, { error: 'Public project not found' });
            else sendJson(res, 200, project);
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

    const gpsMarkersMatch = pathname.match(/^\/api\/projects\/([^/]+)\/gps-markers$/);
    if (gpsMarkersMatch && req.method === 'GET') {
        const projectId = decodeURIComponent(gpsMarkersMatch[1]);
        if (visitor && !isPublicHierarchy(projectId)) return sendJson(res, 200, []);
        const markers = [];
        const plantsById = new Map(loadPlantRegistryData().data.plants.filter(plant => !visitor || isPublic(plant)).map(plant => [plant.id, plant]));
        for (const site of listProjectSites(projectId, visitor)) {
            const placesDir = path.join(getCanonicalSitePath(projectId, site.id), 'places');
            if (!fs.existsSync(placesDir)) continue;
            for (const placeEntry of fs.readdirSync(placesDir, { withFileTypes: true }).filter(entry => entry.isDirectory())) {
                const place = readJson(path.join(placesDir, placeEntry.name, 'place.json'), { id: placeEntry.name, name: placeEntry.name });
                if (visitor && !isPublic(place)) continue;
                const markersDir = path.join(placesDir, placeEntry.name, 'markers');
                if (!fs.existsSync(markersDir)) continue;
                for (const markerEntry of fs.readdirSync(markersDir, { withFileTypes: true }).filter(entry => entry.isDirectory())) {
                    const markerDir = path.join(markersDir, markerEntry.name);
                    const marker = readJson(path.join(markerDir, 'marker.json'), null);
                    const anchor = readJson(path.join(markerDir, 'anchor.json'), null);
                    if (marker && (!visitor || isPublic(marker)) && anchor?.type === 'gps') {
                        const plant = marker.plantId ? plantsById.get(marker.plantId) : null;
                        const resolvedMarker = plant ? { ...marker, name: plant.commonName || marker.name, description: plant.summary || '' } : marker;
                        markers.push({ marker: resolvedMarker, anchor, site: { id: site.id, name: site.name }, place: { id: place.id || placeEntry.name, name: place.name } });
                    }
                }
            }
        }
        sendJson(res, 200, markers);
        return true;
    }

    const projectSitesMatch = pathname.match(/^\/api\/projects\/([^/]+)\/sites$/);
    if (projectSitesMatch && req.method === 'GET') {
        const projectId = decodeURIComponent(projectSitesMatch[1]);
        if (visitor && !isPublicHierarchy(projectId)) return sendJson(res, 200, []);
        sendJson(res, 200, listProjectSites(decodeURIComponent(projectSitesMatch[1]), visitor));
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
                const site = { id: siteId, projectId, name: data.name.trim(), description: data.description || '', template: data.template || '', visibility: normalizeVisibility(data.visibility) };
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
            const site = { ...existing, ...data, visibility: normalizeVisibility(data.visibility, existing.visibility || 'draft'), id: decodeURIComponent(siteId), projectId: decodeURIComponent(projectId) };
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
        if (visitor && !isPublicHierarchy(decodeURIComponent(projectId), decodeURIComponent(siteId))) return sendJson(res, 200, []);
        const placesDir = path.join(getCanonicalSitePath(decodeURIComponent(projectId), decodeURIComponent(siteId)), 'places');
        if (!fs.existsSync(placesDir)) return sendJson(res, 404, { error: 'Site not found' });
        const places = fs.readdirSync(placesDir, { withFileTypes: true })
            .filter(entry => entry.isDirectory())
            .map(entry => ({ ...readJson(path.join(placesDir, entry.name, 'place.json'), {}), id: entry.name }))
            .filter(place => !visitor || isPublic(place));
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
                const place = { id: placeId, name: data.name.trim(), description: data.description || '', type: data.type, visibility: normalizeVisibility(data.visibility), created: now, modified: now };
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
                if (data.anchor !== undefined) {
                    const anchor = data.anchor && typeof data.anchor === 'object' ? data.anchor : {};
                    const latitude = Number(anchor.latitude);
                    const longitude = Number(anchor.longitude);
                    const accuracy = Number(anchor.accuracy);
                    if (anchor.type !== 'gps') throw new Error('Area location must use GPS');
                    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new Error('Latitude must be between -90 and 90');
                    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error('Longitude must be between -180 and 180');
                    if (!Number.isFinite(accuracy) || accuracy < 0) throw new Error('Location accuracy must be zero or greater');
                    data.anchor = { ...existing.anchor, ...anchor, type: 'gps', latitude, longitude, accuracy };
                }
                const nextId = toProjectId(data.name) || decodeURIComponent(placeId);
                const nextDir = path.join(baseDir, nextId);
                if (nextId !== placeId && fs.existsSync(nextDir)) throw new Error('A place with this name already exists');
                if (nextId !== placeId) fs.renameSync(currentDir, nextDir);
                const place = { ...existing, ...data, visibility: normalizeVisibility(data.visibility, existing.visibility || 'draft'), id: nextId, name: data.name || existing.name, created: existing.created || new Date().toISOString(), modified: new Date().toISOString() };
                writeJson(path.join(nextDir, 'place.json'), place);
                sendJson(res, 200, place);
            } catch (error) { sendJson(res, 400, { error: error.message }); }
        });
        return true;
    }
    if (canonicalPlaceMatch && req.method === 'DELETE') {
        const [ , projectId, siteId, placeId ] = canonicalPlaceMatch;
        const decodedProjectId = decodeURIComponent(projectId);
        const decodedSiteId = decodeURIComponent(siteId);
        const decodedPlaceId = decodeURIComponent(placeId);
        const placeDir = path.join(getCanonicalSitePath(decodedProjectId, decodedSiteId), 'places', decodedPlaceId);
        if (!fs.existsSync(placeDir)) return sendJson(res, 404, { error: 'Place not found' });
        const instanceData = loadPlantInstanceData(decodedProjectId, decodedSiteId).data;
        const remainingInstances = instanceData.instances.filter(instance => instance.placeId !== decodedPlaceId);
        if (remainingInstances.length !== instanceData.instances.length) {
            writeJson(path.join(getCanonicalSitePath(decodedProjectId, decodedSiteId), 'plant-instances.json'), { ...instanceData, instances: remainingInstances });
        }
        fs.rmSync(placeDir, { recursive: true, force: true });
        sendJson(res, 200, { ok: true });
        return true;
    }

    const markersMatch = pathname.match(/^\/api\/projects\/([^/]+)\/sites\/([^/]+)\/places\/([^/]+)\/markers$/);
    if (markersMatch && req.method === 'GET') {
        const [ , projectId, siteId, placeId ] = markersMatch;
        if (visitor && !isPublicHierarchy(decodeURIComponent(projectId), decodeURIComponent(siteId), decodeURIComponent(placeId))) return sendJson(res, 200, []);
        const markersDir = path.join(getCanonicalSitePath(decodeURIComponent(projectId), decodeURIComponent(siteId)), 'places', decodeURIComponent(placeId), 'markers');
        if (!fs.existsSync(markersDir)) return sendJson(res, 404, { error: 'Place not found' });
        const markers = fs.readdirSync(markersDir, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => readJson(path.join(markersDir, entry.name, 'marker.json'), { id: entry.name })).filter(marker => !visitor || isPublic(marker));
        sendJson(res, 200, markers);
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
                if (!MARKER_TYPES.has(type)) throw new Error('Unsupported marker type');
                const markerId = toProjectId(data.id || data.name);
                if (!markerId) throw new Error('Marker name is required');
                const markerDir = path.join(getCanonicalSitePath(decodeURIComponent(projectId), decodeURIComponent(siteId)), 'places', decodeURIComponent(placeId), 'markers', markerId);
                if (fs.existsSync(markerDir)) throw new Error('A marker with this name already exists');
                fs.mkdirSync(markerDir, { recursive: true });
                const now = new Date().toISOString();
                const marker = { id: markerId, type, name: data.name.trim(), description: data.description || '', directions: data.directions || '', notes: data.notes || '', parent_checkpoint: data.parent_checkpoint || '', reference_photo: data.reference_photo || '', facing_direction: data.facing_direction || '', qr_reference: data.qr_reference || '', plantId: data.plantId || '', plantInstanceId: data.plantInstanceId || '', status: data.status || 'draft', visibility: normalizeVisibility(data.visibility), created: now, modified: now };
                writeJson(path.join(markerDir, 'marker.json'), marker);
                if (['gps', 'qr'].includes(String(data.anchor?.type || '').toLowerCase())) {
                    const anchor = { ...data.anchor, type: String(data.anchor.type).toLowerCase(), created: data.anchor.created || now, modified: now };
                    writeJson(path.join(markerDir, 'anchor.json'), anchor);
                }
                if (type === 'plant') writeJson(path.join(markerDir, 'plant_profile.json'), { common_name: '', scientific_name: '', overview: '', identification: '', edible_uses: '', propagation: '', growing_conditions: '', notes: '', references: '', ...(data.plant_profile || {}) });
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
        if (!marker || marker.type !== 'plant' || (visitor && !isPublic(marker))) return sendJson(res, 404, { error: 'Plant marker not found' });
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
            const existing = readJson(path.join(markerDir, 'plant_profile.json'), {});
            const profile = { ...existing, ...data, common_name: String(data.common_name || '').trim(), scientific_name: String(data.scientific_name || '').trim(), modified: new Date().toISOString() };
            writeJson(path.join(markerDir, 'plant_profile.json'), profile);
            sendJson(res, 200, profile);
        });
        return true;
    }

    const anchorMatch = pathname.match(/^\/api\/projects\/([^/]+)\/sites\/([^/]+)\/places\/([^/]+)\/markers\/([^/]+)\/anchor$/);
    if (anchorMatch && req.method === 'GET') {
        const [ , projectId, siteId, placeId, markerId ] = anchorMatch;
        const markerDir = path.join(getCanonicalSitePath(decodeURIComponent(projectId), decodeURIComponent(siteId)), 'places', decodeURIComponent(placeId), 'markers', decodeURIComponent(markerId));
        const marker = readJson(path.join(markerDir, 'marker.json'), null);
        const anchorFile = path.join(markerDir, 'anchor.json');
        if (visitor && !isPublic(marker)) return sendJson(res, 404, { error: 'Public marker not found' });
        if (!fs.existsSync(anchorFile)) return sendJson(res, 404, { error: 'Anchor not found' });
        sendJson(res, 200, readJson(anchorFile, {}));
        return true;
    }
    if (anchorMatch && req.method === 'PUT') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            const [ , projectId, siteId, placeId, markerId ] = anchorMatch;
            const markerDir = path.join(getCanonicalSitePath(decodeURIComponent(projectId), decodeURIComponent(siteId)), 'places', decodeURIComponent(placeId), 'markers', decodeURIComponent(markerId));
            const anchorFile = path.join(markerDir, 'anchor.json');
            if (!fs.existsSync(path.join(markerDir, 'marker.json'))) return sendJson(res, 404, { error: 'Marker not found' });
            const data = JSON.parse(body || '{}');
            const type = String(data.type || '').toLowerCase();
            if (!['gps', 'qr'].includes(type)) return sendJson(res, 400, { error: 'Anchor type must be GPS or QR' });
            if (type === 'gps') {
                const latitude = Number(data.latitude);
                const longitude = Number(data.longitude);
                if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return sendJson(res, 400, { error: 'Latitude must be between -90 and 90' });
                if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return sendJson(res, 400, { error: 'Longitude must be between -180 and 180' });
            }
            if (type === 'qr' && !String(data.qr_code || '').trim()) return sendJson(res, 400, { error: 'QR Code is required' });
            const anchor = { ...readJson(anchorFile, {}), ...data, type, modified: new Date().toISOString() };
            writeJson(anchorFile, anchor);
            const marker = readJson(path.join(markerDir, 'marker.json'), null);
            if (type === 'gps' && marker?.plantInstanceId) {
                const decodedProjectId = decodeURIComponent(projectId);
                const decodedSiteId = decodeURIComponent(siteId);
                const instanceData = loadPlantInstanceData(decodedProjectId, decodedSiteId).data;
                const instance = instanceData.instances.find(item => item.id === marker.plantInstanceId);
                if (instance) {
                    instance.map = { ...(instance.map || {}), latitude: anchor.latitude, longitude: anchor.longitude };
                    instance.modified = new Date().toISOString();
                    writeJson(path.join(getCanonicalSitePath(decodedProjectId, decodedSiteId), 'plant-instances.json'), instanceData);
                }
            }
            sendJson(res, 200, anchor);
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
                if (!MARKER_TYPES.has(type)) throw new Error('Unsupported marker type');
                const nextId = toProjectId(data.name) || decodeURIComponent(markerId);
                const nextDir = path.join(baseDir, nextId);
                if (nextId !== markerId && fs.existsSync(nextDir)) throw new Error('A marker with this name already exists');
                if (nextId !== markerId) fs.renameSync(currentDir, nextDir);
                const marker = { ...existing, ...data, visibility: normalizeVisibility(data.visibility, existing.visibility || 'draft'), id: nextId, type, name: data.name || existing.name, modified: new Date().toISOString() };
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

    return false;
}

const server = http.createServer((req, res) => {
    const pathname = normalizeApiPath(new URL(req.url, `http://${req.headers.host}`).pathname);

    if (pathname === '/' && !production) {
        res.writeHead(302, { Location: '/app/' });
        res.end();
        return;
    }

    if (!pathname.startsWith('/api/') && (pathname === '/sites' || pathname.startsWith('/sites/') || pathname.split('/').includes('sites'))) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
    }

    try {
        if (handleApi(req, res)) return;
    } catch (error) {
        sendJson(res, 500, { error: error.message || 'Internal API error' });
        return;
    }

    if (production || pathname.startsWith('/api/') || pathname === '/xr-api' || pathname.startsWith('/xr-api/')) {
        sendJson(res, 404, { error: `API route not found: ${req.method} ${pathname}` });
        return;
    }

    const requestUrl = req.url;
    const requestPathname = new URL(requestUrl, `http://${req.headers.host}`).pathname;
    const safePath = requestPathname === '/app' || requestPathname === '/app/' ? '/app/index.html' : requestPathname;
    const filePath = path.join(rootDir, safePath.replace(/^\//, ''));

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        sendJson(res, 404, { error: `File not found: ${requestPathname}` });
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
const host = process.env.HOST || '127.0.0.1';
if (production && (!creatorPassword || sessionSecret.length < 32)) {
    throw new Error('Production requires NOURISHLAND_CREATOR_PASSWORD and a NOURISHLAND_SESSION_SECRET of at least 32 characters');
}
server.requestTimeout = 30000;
server.on('error', error => {
    console.error(`Persistence server failed to start: ${error.message}`);
    process.exitCode = 1;
});
server.listen(port, host, () => {
    console.log(`Persistence server listening on http://${host}:${port}`);
    console.log(`Workspace: ${workspaceDir}`);
    if (creatorAuthDisabled) console.warn('WARNING: Creator authentication disabled — testing mode');
});
