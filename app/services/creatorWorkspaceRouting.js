import { CREATOR_WORKSPACES, suggestedCreatorWorkspace, workspaceUrl } from './creatorWorkspaceMode.js';
import { ensureCreatorAuthentication } from './apiClient.js';
import { loadFieldPackage } from './creatorWorkspaceStore.js';
import { escapeWorkspaceHtml } from './creatorWorkspaceFrame.js';
import { CREATOR_HUB_VIEWS } from './creatorHub.js';
import { creatorLoadingMarkup } from './creatorIdentity.js';
import { ensureCreatorInterfaceStyles } from './creatorInterface.js';
let activeWorkspace = null;
let generation = 0;
export async function renderCreatorWorkspace(app, projectId, options = {}) {
    const request = ++generation;
    activeWorkspace?.destroy(); activeWorkspace = null;
    const preferenceKey = `nlxr.creator-workspace.${projectId}`;
    let preferred;
    try { preferred = localStorage.getItem(preferenceKey); } catch {}
    const mode = CREATOR_WORKSPACES[options.mode] ? options.mode : CREATOR_WORKSPACES[preferred] ? preferred : suggestedCreatorWorkspace();
    document.body.dataset.experienceRole = 'creator';
    document.body.dataset.creatorWorkspace = mode;
    ensureCreatorInterfaceStyles();
    app.innerHTML = creatorLoadingMarkup();
    try {
        const authenticated = await ensureCreatorAuthentication().catch(async error => { if (await loadFieldPackage(projectId).catch(() => null)) return true; throw error; });
        if (!authenticated) { location.href = new URL('../index.html', import.meta.url).href; return; }
        const view = options.view || 'hub';
        const screenTool = ['overview','records','map','planning-map','imap','knowledge','field','tours'].includes(view);
        const module = CREATOR_HUB_VIEWS.includes(view) ? await import('../screens/creatorHubWorkspace.js')
            : screenTool ? await import('../screens/creatorDesktopWorkspace.js')
            : view === 'placement' ? await import('../screens/creatorSpatialWorkspace.js')
            : ['work','scan','capture','project'].includes(view) || mode === 'field' ? await import('../screens/creatorFieldWorkspace.js')
            : mode === 'spatial' ? await import('../screens/creatorSpatialWorkspace.js') : await import('../screens/creatorDesktopWorkspace.js');
        if (request !== generation) return;
        const controller = await module.renderWorkspace(app, projectId, { ...options, mode, view });
        if (request !== generation) { controller.destroy(); return; }
        activeWorkspace = controller;
        try { localStorage.setItem(preferenceKey, mode); sessionStorage.setItem('nourishland-xr-current-view-v1', JSON.stringify({ view: 'creator-workspace', args: [projectId, { ...options, mode }] })); } catch {}
        const observer = new MutationObserver(() => {
            if (!controller.root.isConnected) { controller.destroy(); observer.disconnect(); if (activeWorkspace === controller) activeWorkspace = null; }
        });
        observer.observe(app, { childList: true });
        controller.signal?.addEventListener('abort', () => observer.disconnect(), { once: true });
        return controller;
    } catch (error) {
        if (request !== generation) return;
        app.innerHTML = `<section class="screen creator-loading"><h1>Workspace could not open</h1><p role="alert">${escapeWorkspaceHtml(error.message)}</p><button type="button" data-workspace-retry>Try again</button><a href="${new URL('../index.html', import.meta.url).href}">Welcome</a></section>`;
        app.querySelector('[data-workspace-retry]').onclick = () => renderCreatorWorkspace(app, projectId, options);
    }
}
