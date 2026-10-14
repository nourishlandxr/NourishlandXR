import { renderPlatformApplication } from './services/platformApplication.js';

// Keep old Field links working; Desktop and Field now own separate entries.
const params = new URLSearchParams(location.search);
if (params.get('interface') === 'field') {
    const target = new URL('./field/index.html', import.meta.url);
    target.search = location.search;
    target.searchParams.delete('interface');
    location.replace(target.href);
} else await renderPlatformApplication({ mode: 'desktop' });
