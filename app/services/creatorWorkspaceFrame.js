import { CREATOR_WORKSPACES, workspaceUrl } from './creatorWorkspaceMode.js';
export const escapeWorkspaceHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const plainHomeUrl = () => { const url = new URL(location.href); url.search = ''; url.hash = ''; return url.href; };
export function workspaceHeader(model, mode, { siteId = '', recordKey = '', view = 'records' } = {}) {
    const html = escapeWorkspaceHtml;
    const guideKey = `nlxr.creator-guide.v1.${model.project.id}`;
    let showGuide = false;
    try {
        showGuide = sessionStorage.getItem(guideKey) !== 'shown';
        if (showGuide) sessionStorage.setItem(guideKey, 'shown');
    } catch { showGuide = true; }
    const workspaceSummary = {
        desktop: 'Set up a Site or Area, add plant and Note records, save your work as a draft, then use Visitor preview to review it.',
        field: 'Use the project prepared by Desktop Studio. Scan a printed tag or capture an observation; results save on this device until you sync.',
        spatial: 'Choose a Site and Area, prepare XR, then place or inspect its elements. Edit knowledge in Desktop Studio and capture field observations in Android Field.'
    }[mode] || CREATOR_WORKSPACES[mode].description;
    const guideModes = Object.entries(CREATOR_WORKSPACES).map(([key, value]) => `<a href="${html(workspaceUrl(model.project.id,{ mode:key,siteId,recordKey,view:'overview' }).href)}"${key===mode?' aria-current="page"':''}><strong>${html(value.label)}</strong><small>${html(value.description)}</small></a>`).join('');
    return `<header class="workspace-shell-header v2-masthead"><a class="workspace-brand" href="${html(plainHomeUrl())}">Nourishland<small>${html(model.project.name)}</small></a><nav class="workspace-mode-picker" aria-label="Creator workspace">${Object.entries(CREATOR_WORKSPACES).map(([key, value]) => `<a href="${html(workspaceUrl(model.project.id,{ mode:key,siteId,recordKey,view }).href)}"${key===mode?' aria-current="page"':''}>${html(value.label)}</a>`).join('')}</nav></header><details class="creator-first-run" data-creator-guide${showGuide?' open':''}><summary>Creator guide · how these workspaces fit together</summary><div class="creator-guide-body"><p class="creator-guide-current">${html(workspaceSummary)}</p><ol><li><strong>Project</strong><span>Choose a project from the home screen. This menu keeps the current project when you switch workspaces.</span></li><li><strong>Site and Area</strong><span>Choose where the knowledge belongs before adding or inspecting its content.</span></li><li><strong>Add and save</strong><span>Studio edits records; Field saves observations on this device; Spatial places or inspects content in XR.</span></li><li><strong>Review sharing</strong><span>Studio offers Visitor preview. Check the project’s draft or public status there before sharing.</span></li></ol><nav class="creator-guide-workspaces" aria-label="Choose a Creator workspace">${guideModes}</nav></div></details>`;
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
