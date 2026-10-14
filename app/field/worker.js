// Only this app's shell is cached. Never cache API responses or personal data.
const PREFIX = 'nourishland-public-field-shell-';
const version = new URL(self.location.href).searchParams.get('v') || 'development';
const CACHE = PREFIX + version;
const scope = new URL(self.registration.scope);
const SHELL = [
    './index.html', './main.js', './styles.css', './manifest.json', './icon.svg', './icon-192.png', './icon-512.png',
    '../platform.css', '../services/platformApplication.js', '../services/apiClient.js', '../services/buildInfo.js',
    '../services/workspaceIcons.js', '../services/platformPublicContent.js', '../services/fieldJournal.js',
    '../services/checklistWorkspace.js', '../services/checklistContract.js', '../services/checklistStore.js', '../services/fieldShell.js', '../services/sharedProjectContract.js'
].map(file => new URL(file, scope).href);
const assetPaths = new Set(SHELL.map(file => new URL(file).pathname));

self.addEventListener('install', event => {
    // Cache.addAll commits the complete shell; a failed download cannot activate it.
    event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
});
self.addEventListener('activate', event => event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name.startsWith(PREFIX) && name !== CACHE) await caches.delete(name);
    await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    if (request.method !== 'GET' || url.origin !== scope.origin) return;
    const navigation = request.mode === 'navigate' && (url.pathname === scope.pathname || url.pathname === new URL('index.html', scope).pathname);
    if (!navigation && !assetPaths.has(url.pathname)) return;
    event.respondWith((async () => {
        try {
            // Explicit HTTP errors stay errors; offline fallback is for connection loss.
            return await fetch(request);
        } catch (error) {
            const cache = await caches.open(CACHE);
            const response = await cache.match(navigation ? new URL('index.html', scope).href : request, { ignoreSearch: true });
            if (response) return response;
            throw error;
        }
    })());
});
