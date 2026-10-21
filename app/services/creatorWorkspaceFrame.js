import { CREATOR_WORKSPACES, creatorProjectTutorialUrl, workspaceUrl } from './creatorWorkspaceMode.js';
import { dashboardIcon } from './workspaceIcons.js';
import { creatorLogoMarkup } from './creatorIdentity.js';
import { creatorHubTools, creatorGroupForView } from './creatorHub.js';
import {portalUrl} from './portalRoutes.js';
export const escapeWorkspaceHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const plainHomeUrl = () => { const url = new URL(location.href); url.search = ''; url.hash = ''; return url.href; };
export function creatorStartHeader() {
    return `<header class="workspace-shell-header creator-start-header v2-masthead"><a class="workspace-brand" href="${escapeWorkspaceHtml(portalUrl('creator'))}" aria-label="Your projects">${creatorLogoMarkup()}<span>nourishland<small>Creator</small></span></a></header>`;
}
export function workspaceToolNavigation(projectId, mode, { siteId = '', recordKey = '', view = 'hub' } = {}) {
    const active = creatorGroupForView(view);
    return `<nav class="creator-tool-nav" aria-label="Project tools">${creatorHubTools().map(tool => `<a data-creator-tool="${tool.id}" href="${escapeWorkspaceHtml(workspaceUrl(projectId, { mode, siteId, recordKey, view:tool.id }).href)}"${tool.id === active ? ' aria-current="page"' : ''}>${dashboardIcon(tool.icon)}<span>${escapeWorkspaceHtml(tool.title)}</span></a>`).join('')}</nav>`;
}
export function updateWorkspaceNavigation(root, projectId, mode, context) {
    const active = creatorGroupForView(context.view);
    const hub = root.querySelector('[data-creator-hub-link]');
    if (hub) hub.href = workspaceUrl(projectId, { ...context, mode, view:'hub' }).href;
    root.querySelectorAll('[data-creator-tool]').forEach(link => {
        link.href = workspaceUrl(projectId, { ...context, mode, view:link.dataset.creatorTool }).href;
        if (link.dataset.creatorTool === active) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
    });
    root.querySelectorAll('.workspace-mode-picker a:not([data-guided-project-setup])').forEach(link => {
        link.href = workspaceUrl(projectId, { ...context, mode:new URL(link.href).searchParams.get('workspace') }).href;
    });
}
export function workspaceHeader(model, mode, { siteId = '', recordKey = '', view = 'records' } = {}) {
    const html = escapeWorkspaceHtml;
    return `<header class="workspace-shell-header v2-masthead"><a class="workspace-brand" href="${html(plainHomeUrl())}" aria-label="Nourishland home">${creatorLogoMarkup()}<span>nourishland<small>${html(model.project.name)}</small></span></a><div class="workspace-access"><a class="workspace-hub-link workspace-control" data-creator-hub-link href="${html(workspaceUrl(model.project.id,{mode,siteId,recordKey,view:'hub'}).href)}" aria-label="Creator hub" title="Creator hub">${dashboardIcon('grid')}<span class="workspace-control-hint">Creator hub</span></a><nav class="workspace-mode-picker" aria-label="Access mode">${Object.entries(CREATOR_WORKSPACES).map(([key, value]) => `<a class="workspace-control" href="${html(workspaceUrl(model.project.id,{ mode:key,siteId,recordKey,view }).href)}" aria-label="${html(value.label)}" title="${html(value.label)}"${key===mode?' aria-current="page"':''}>${dashboardIcon({desktop:'monitor',field:'phone',spatial:'ar'}[key])}<span class="workspace-control-hint">${html(value.label)}</span></a>`).join('')}</nav></div></header>${view === 'hub' ? '' : workspaceToolNavigation(model.project.id, mode, { siteId, recordKey, view })}`;
}
export function guardWorkspaceNavigation(root, canLeave, signal) {
    root.addEventListener('click', event => { if (event.target.closest('a') && !canLeave()) event.preventDefault(); }, { signal });
}
export function attachCreatorProjectTutorialLink(root, projectId, mode) {
    const nav = root?.querySelector('.workspace-mode-picker');
    if (!nav || nav.querySelector('[data-guided-project-setup]')) return;
    const link = document.createElement('a');
    link.href = creatorProjectTutorialUrl(projectId, { mode }).href;
    link.innerHTML = `${dashboardIcon('help')}<span class="workspace-control-hint">Guided setup</span>`;
    link.className = 'workspace-control';
    link.setAttribute('aria-label', 'Guided project setup');
    link.dataset.guidedProjectSetup = '';
    link.title = 'Resume beginner project setup';
    nav.append(link);
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
