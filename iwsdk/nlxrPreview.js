import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = fileURLToPath(new URL('../app/', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
    '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff2': 'font/woff2' };

// The HTTPS Quest server serves the actual app files, preserving relative
// imports, assets and the existing welcome/demo instead of copying a new UI.
export function nlxrPreview() {
    return { name: 'nlxr-existing-app-preview', configureServer(server) {
        server.middlewares.use('/nlxr', (req, res, next) => {
            if (!['GET', 'HEAD'].includes(req.method)) return next();
            let pathname;
            try { pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname); }
            catch { res.statusCode = 400; res.end(); return; }
            const target = path.resolve(appRoot, `.${pathname === '/' ? '/index.html' : pathname}`);
            if (!target.startsWith(appRoot) || path.relative(appRoot, target).split(path.sep).some(part => part.startsWith('.'))) {
                res.statusCode = 403; res.end(); return;
            }
            let stat;
            try { stat = fs.statSync(target); } catch { res.statusCode = 404; res.end(); return; }
            if (!stat.isFile()) { res.statusCode = 404; res.end(); return; }
            res.setHeader('Content-Type', types[path.extname(target)] || 'application/octet-stream');
            res.setHeader('Cache-Control', 'no-store');
            if (req.method === 'HEAD') { res.end(); return; }
            fs.createReadStream(target).on('error', () => res.destroy()).pipe(res);
        });
    } };
}
