import { BUILD_INFO } from './buildInfo.js';

// One ordered style stack for every Creator entry, including direct editor URLs.
export function ensureCreatorInterfaceStyles() {
    for (const [key, file] of [
        ['creatorStudio', 'creator-studio.css'], ['creatorHub', 'creator-hub.css'],
        ['creatorGame', 'creator-game-menu.css'], ['creatorWorkbench', 'creator-workbench.css']
    ]) {
        const attribute = 'data-' + key.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase());
        if (document.querySelector(`link[${attribute}]`)) continue;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = new URL(`../${file}?v=${BUILD_INFO.version}`, import.meta.url).href;
        link.dataset[key] = '';
        document.head.append(link);
    }
}
