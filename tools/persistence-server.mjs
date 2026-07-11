import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const sitesDir = path.join(rootDir, 'sites');

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

function ensureSiteFolders(siteId) {
    const siteDir = path.join(sitesDir, siteId);
    const settingsDir = path.join(siteDir, 'settings');
    const locationDir = path.join(siteDir, 'location');
    const mediaDir = path.join(siteDir, 'media');
    const routesDir = path.join(siteDir, 'routes');
    const experiencesDir = path.join(siteDir, 'experiences');

    fs.mkdirSync(settingsDir, { recursive: true });
    fs.mkdirSync(locationDir, { recursive: true });
    fs.mkdirSync(mediaDir, { recursive: true });
    fs.mkdirSync(routesDir, { recursive: true });
    fs.mkdirSync(experiencesDir, { recursive: true });

    return { siteDir, settingsDir, locationDir };
}

function getSitePath(siteId) {
    return path.join(sitesDir, siteId);
}

function normalizeSite(siteId, siteData) {
    const normalized = { ...siteData, id: siteId, name: siteData.name || siteId };
    const locations = Array.isArray(siteData.locations) ? siteData.locations : [];
    normalized.locations = locations;
    return normalized;
}

function loadSiteFromDisk(siteId) {
    const siteRoot = getSitePath(siteId);
    const siteFile = path.join(siteRoot, 'settings', 'site.json');
    const fallback = { id: siteId, name: siteId, locations: [] };

    if (!fs.existsSync(siteFile)) {
        return fallback;
    }

    const persistedSite = readJson(siteFile, fallback);
    return normalizeSite(siteId, persistedSite);
}

function listSitesFromDisk() {
    if (!fs.existsSync(sitesDir)) {
        return [];
    }

    return fs.readdirSync(sitesDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => loadSiteFromDisk(entry.name));
}

function ensurePlaceFolders(siteId, placeId) {
    const locationDir = path.join(getSitePath(siteId), 'location', placeId);
    const metadataDir = path.join(locationDir, 'metadata');
    const objectsDir = path.join(locationDir, 'objects');
    const mediaDir = path.join(locationDir, 'media');

    fs.mkdirSync(metadataDir, { recursive: true });
    fs.mkdirSync(objectsDir, { recursive: true });
    fs.mkdirSync(mediaDir, { recursive: true });

    return { locationDir, metadataDir };
}

function ensureAssetFolders(siteId, placeId, assetId) {
    const objectDir = path.join(getSitePath(siteId), 'location', placeId, 'objects', assetId);
    const metadataDir = path.join(objectDir, 'metadata');
    const contentDir = path.join(objectDir, 'content');
    const experiencesDir = path.join(objectDir, 'experiences');
    const mediaDir = path.join(objectDir, 'media');
    const relationshipsDir = path.join(objectDir, 'relationships');

    fs.mkdirSync(metadataDir, { recursive: true });
    fs.mkdirSync(contentDir, { recursive: true });
    fs.mkdirSync(experiencesDir, { recursive: true });
    fs.mkdirSync(mediaDir, { recursive: true });
    fs.mkdirSync(relationshipsDir, { recursive: true });

    return { objectDir, metadataDir };
}

function handleApi(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

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
                ensureSiteFolders(siteId);
                const normalizedSite = normalizeSite(siteId, {
                    ...siteData,
                    id: siteId,
                    locations: siteData.locations || []
                });
                writeJson(path.join(sitesDir, siteId, 'settings', 'site.json'), normalizedSite);
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
            ensureSiteFolders(siteId);
            writeJson(path.join(sitesDir, siteId, 'settings', 'site.json'), normalizedSite);
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
            const siteFile = path.join(getSitePath(siteId), 'settings', 'site.json');
            const siteData = readJson(siteFile, { id: siteId, name: siteId, locations: [] });
            const placeId = placeData.id || (placeData.name || 'place').toLowerCase().replace(/\s+/g, '_');
            const normalizedPlace = { ...placeData, id: placeId, assets: placeData.assets || [] };
            const locations = Array.isArray(siteData.locations) ? siteData.locations : [];
            const nextLocations = [...locations.filter(location => location.id !== placeId), normalizedPlace];
            const updatedSite = { ...siteData, id: siteId, locations: nextLocations };
            ensurePlaceFolders(siteId, placeId);
            writeJson(siteFile, updatedSite);
            writeJson(path.join(getSitePath(siteId), 'location', placeId, 'metadata', 'location.json'), normalizedPlace);
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
            const siteFile = path.join(getSitePath(decodeURIComponent(siteId)), 'settings', 'site.json');
            const siteData = readJson(siteFile, { id: decodeURIComponent(siteId), name: decodeURIComponent(siteId), locations: [] });
            const placeData = JSON.parse(body || '{}');
            const nextLocations = (siteData.locations || []).map(location => location.id === decodeURIComponent(placeId) ? { ...location, ...placeData } : location);
            const updatedSite = { ...siteData, locations: nextLocations };
            writeJson(siteFile, updatedSite);
            writeJson(path.join(getSitePath(decodeURIComponent(siteId)), 'location', decodeURIComponent(placeId), 'metadata', 'location.json'), { ...placeData, id: decodeURIComponent(placeId) });
            sendJson(res, 200, { ...placeData, id: decodeURIComponent(placeId) });
        });
        return true;
    }

    if (placeUpdateMatch && req.method === 'DELETE') {
        const [ , siteId, placeId ] = placeUpdateMatch;
        const siteFile = path.join(getSitePath(decodeURIComponent(siteId)), 'settings', 'site.json');
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
            const siteFile = path.join(getSitePath(decodeURIComponent(siteId)), 'settings', 'site.json');
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
            writeJson(path.join(getSitePath(decodeURIComponent(siteId)), 'location', decodeURIComponent(placeId), 'objects', assetId, 'metadata', 'object.json'), normalizedAsset);
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
            const siteFile = path.join(getSitePath(decodeURIComponent(siteId)), 'settings', 'site.json');
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
            writeJson(path.join(getSitePath(decodeURIComponent(siteId)), 'location', decodeURIComponent(placeId), 'objects', decodeURIComponent(assetId), 'metadata', 'object.json'), { ...assetData, id: decodeURIComponent(assetId) });
            sendJson(res, 200, { ...assetData, id: decodeURIComponent(assetId) });
        });
        return true;
    }

    if (assetUpdateMatch && req.method === 'DELETE') {
        const [ , siteId, placeId, assetId ] = assetUpdateMatch;
        const siteFile = path.join(getSitePath(decodeURIComponent(siteId)), 'settings', 'site.json');
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
    if (handleApi(req, res)) {
        return;
    }

    const requestUrl = req.url === '/' ? '/app/' : req.url;
    const pathname = new URL(requestUrl, `http://${req.headers.host}`).pathname;
    const safePath = pathname === '/' ? '/app/index.html' : pathname;
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

server.listen(8000, '127.0.0.1', () => {
    console.log('Persistence server listening on http://127.0.0.1:8000');
});
