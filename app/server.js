import http from 'http';
import { createReadStream, existsSync, readFileSync, statSync } from 'fs';
import { join, resolve, extname, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import {
    createMarker,
    createPlace,
    deleteProject,
    deleteMarker,
    deletePlace,
    loadSite,
    loadSiteList,
    saveSite,
    renameProject,
    updateMarker,
    updatePlace
} from './persistence.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8'
};

function sendJson(response, statusCode, data) {
    response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify(data));
}

function readJsonBody(request) {
    return new Promise((resolve, reject) => {
        let body = '';
        request.on('data', chunk => {
            body += chunk.toString();
        });
        request.on('end', () => {
            if (!body) {
                resolve(null);
                return;
            }

            try {
                resolve(JSON.parse(body));
            } catch (error) {
                reject(error);
            }
        });
        request.on('error', reject);
    });
}

function serveStaticFile(response, filePath) {
    if (!existsSync(filePath)) {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Not found');
        return;
    }

    const extension = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[extension] || 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': contentType });
    createReadStream(filePath).pipe(response);
}

function resolveRequestPath(urlPath) {
    const normalizedPath = urlPath === '/' ? '/app/index.html' : urlPath;
    const requestPath = normalizedPath.replace(/^\//, '');
    const candidatePath = join(projectRoot, requestPath);

    if (candidatePath.startsWith(projectRoot) && existsSync(candidatePath) && statSync(candidatePath).isDirectory()) {
        return join(candidatePath, 'index.html');
    }

    return candidatePath;
}

const server = http.createServer(async (request, response) => {
    const { method, url = '/' } = request;
    const incomingUrl = new URL(url, `http://${request.headers.host || '127.0.0.1'}`);
    const pathname = incomingUrl.pathname;

    if (!pathname.startsWith('/api/') && (pathname === '/sites' || pathname.startsWith('/sites/') || pathname.split('/').includes('sites'))) {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Not found');
        return;
    }

    if (pathname.startsWith('/api/')) {
        const pathParts = pathname.split('/').filter(Boolean);
        const [, , siteId, resource, placeId, assetId] = pathParts;

        try {
            if (method === 'GET' && pathname === '/api/projects') {
                sendJson(response, 200, loadSiteList());
                return;
            }

            if (method === 'POST' && pathname === '/api/projects') {
                const payload = await readJsonBody(request);
                const projectId = (payload.name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
                if (!projectId) {
                    sendJson(response, 400, { error: 'Project name is required' });
                    return;
                }
                sendJson(response, 201, saveSite(projectId, { ...payload, id: projectId, locations: [] }));
                return;
            }

            const projectMatch = pathname.match(/^\/api\/projects\/([^/]+)$/);
            if (projectMatch && method === 'GET') {
                sendJson(response, 200, loadSite(decodeURIComponent(projectMatch[1])));
                return;
            }

            if (projectMatch && method === 'PUT') {
                const payload = await readJsonBody(request);
                sendJson(response, 200, renameProject(decodeURIComponent(projectMatch[1]), payload));
                return;
            }

            if (projectMatch && method === 'DELETE') {
                deleteProject(decodeURIComponent(projectMatch[1]));
                sendJson(response, 200, { ok: true });
                return;
            }

            if (method === 'GET' && pathname === '/api/sites') {
                sendJson(response, 200, loadSiteList());
                return;
            }

            if (method === 'GET' && pathname.startsWith('/api/sites/') && pathParts.length === 2) {
                sendJson(response, 200, loadSite(siteId));
                return;
            }

            if (method === 'POST' && pathname === '/api/sites') {
                const payload = await readJsonBody(request);
                sendJson(response, 200, saveSite(payload.id || payload.name, payload));
                return;
            }

            if (method === 'PUT' && pathname.startsWith('/api/sites/') && pathParts.length === 2) {
                const payload = await readJsonBody(request);
                sendJson(response, 200, saveSite(siteId, payload));
                return;
            }

            if (method === 'POST' && pathname.startsWith('/api/sites/') && pathParts.length === 3 && resource === 'locations') {
                const payload = await readJsonBody(request);
                sendJson(response, 200, createPlace(siteId, payload));
                return;
            }

            if (method === 'PUT' && pathname.startsWith('/api/sites/') && pathParts.length === 4 && resource === 'locations') {
                const payload = await readJsonBody(request);
                sendJson(response, 200, updatePlace(siteId, { ...payload, id: placeId }));
                return;
            }

            if (method === 'DELETE' && pathname.startsWith('/api/sites/') && pathParts.length === 4 && resource === 'locations') {
                sendJson(response, 200, deletePlace(siteId, placeId));
                return;
            }

            if (method === 'POST' && pathname.startsWith('/api/sites/') && pathParts.length === 5 && resource === 'locations') {
                const payload = await readJsonBody(request);
                sendJson(response, 200, createMarker(siteId, placeId, payload));
                return;
            }

            if (method === 'PUT' && pathname.startsWith('/api/sites/') && pathParts.length === 6 && resource === 'locations') {
                const payload = await readJsonBody(request);
                sendJson(response, 200, updateMarker(siteId, placeId, { ...payload, id: assetId }));
                return;
            }

            if (method === 'DELETE' && pathname.startsWith('/api/sites/') && pathParts.length === 6 && resource === 'locations') {
                sendJson(response, 200, deleteMarker(siteId, placeId, assetId));
                return;
            }

            sendJson(response, 404, { error: 'Not found' });
        } catch (error) {
            sendJson(response, 500, { error: error.message });
        }

        return;
    }

    const requestPath = resolveRequestPath(pathname);
    serveStaticFile(response, requestPath);
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, '127.0.0.1', () => {
    console.log(`Persistence server listening on http://127.0.0.1:${PORT}`);
});
