import { CREATOR_WORKSPACES, workspaceUrl } from './creatorWorkspaceMode.js';
export const escapeWorkspaceHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const plainHomeUrl = () => { const url = new URL(location.href); url.search = ''; url.hash = ''; return url.href; };
export function workspaceHeader(model, mode, { siteId = '', recordKey = '', view = 'records' } = {}) {
    const html = escapeWorkspaceHtml;
    return `<header class="workspace-shell-header v2-masthead"><a class="workspace-brand" href="${html(plainHomeUrl())}">Nourishland<small>${html(model.project.name)}</small></a><nav class="workspace-mode-picker" aria-label="Creator workspace">${Object.entries(CREATOR_WORKSPACES).map(([key, value]) => `<a href="${html(workspaceUrl(model.project.id,{ mode:key,siteId,recordKey,view }).href)}"${key===mode?' aria-current="page"':''}>${html(value.label)}</a>`).join('')}</nav></header>`;
}
export async function openLegacyCreatorTool(name, ...args) {
    if (!window[name]) { window.__nxrSkipBootstrap = true; await import('../main.js'); }
    return window[name](...args);
}
export async function fieldPhoto(file) {
    if (!file) return '';
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Choose a JPEG, PNG or WebP photo.');
    const bitmap = await createImageBitmap(file);
    try {
        const scale = Math.min(1, 960 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const photo = canvas.toDataURL('image/jpeg', .7);
        if (photo.length > 350000) throw new Error('This photo is too large. Choose a smaller image.');
        return photo;
    } finally { bitmap.close(); }
}
