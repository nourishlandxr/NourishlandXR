import { loadCreatorWorkspace } from '../services/creatorWorkspaceData.js';
import { workspaceHeader, attachCreatorProjectTutorialLink, escapeWorkspaceHtml as html, openLegacyCreatorTool } from '../services/creatorWorkspaceFrame.js';
import { workspaceUrl, creatorProjectTutorialUrl, CREATOR_WORKSPACES } from '../services/creatorWorkspaceMode.js';
import { creatorAccessCapabilities, creatorHubTools, creatorPimoUrl } from '../services/creatorHub.js';
import { dashboardIcon as icon } from '../services/workspaceIcons.js';
import { creatorLogoMarkup } from '../services/creatorIdentity.js';
import { BUILD_INFO } from '../services/buildInfo.js';

export async function renderWorkspace(app, projectId, options = {}) {
    const mode = options.mode || 'desktop', capabilities = creatorAccessCapabilities();
    const model = await loadCreatorWorkspace(projectId, { overviewOnly: true });
    const abort = new AbortController(); let dirty = false, child = null, busy = false;
    let siteId = model.sites.some(site => site.id === options.siteId) ? options.siteId : model.sites[0]?.id || '';
    const view = options.view || 'hub';
    const context = () => ({ mode, siteId, recordKey:options.recordKey || '' });
    const url = target => workspaceUrl(projectId, { ...context(), view:target }).href;
    const link = (title, target, symbol = 'arrow', detail = '') => `<a class="hub-link" href="${html(target)}">${icon(symbol)}<span><strong>${html(title)}</strong>${detail ? `<small>${html(detail)}</small>` : ''}</span>${icon('arrow')}</a>`;
    const titles = { hub:'Creator hub', content:'PIMOs & content', paths:'Discovery Paths', 'map-tools':'Map', 'preview-tools':'Preview', 'project-tools':'Project details' };
    app.innerHTML = `<section class="screen creator-hub creator-${mode === 'field' ? 'field' : mode === 'spatial' ? 'spatial' : 'studio'}" data-hub-view="${view}">${workspaceHeader(model, mode, { ...context(), view })}
      <main class="hub-main"><div class="hub-topline"><div><p class="hub-eyebrow">${html(model.project.name)} · ${html(CREATOR_WORKSPACES[mode].label)}</p><h1>${titles[view] || titles.hub}</h1></div>${view !== 'hub' ? `<a class="hub-icon" href="${html(url('hub'))}" aria-label="Back to Creator hub" title="Creator hub">${icon('home')}</a>` : ''}</div>
      <div class="hub-context"><label>Site<select data-hub-site>${model.sites.map(site => `<option value="${html(site.id)}"${site.id === siteId ? ' selected' : ''}>${html(site.name)}</option>`).join('')}</select></label><p>${model.offline ? 'Prepared copy · reconnect to edit project content.' : 'One project. Choose what to work on.'}</p></div>
      <p class="hub-status" role="status" data-hub-status></p><div data-hub-content></div></main></section>`;
    const root = app.firstElementChild, host = root.querySelector('[data-hub-content]');
    attachCreatorProjectTutorialLink(root, projectId, mode);
    function status(text) { if (root.isConnected) root.querySelector('[data-hub-status]').textContent = text; }
    function route() { history.replaceState({ nourishlandView:'creator-workspace', projectId, workspace:mode, siteId, view }, '', url(view)); }
    if (view === 'hub') {
        const captions = {records:'Place & organise',content:'Connect knowledge',paths:'Build a guide','map-tools':'View your place','preview-tools':'Try the experience','project-tools':'Setup & sharing'};
        host.innerHTML = `<div class="hub-launch-layout"><div class="hub-command-panel"><div class="hub-tool-grid" aria-label="Creator tools">${creatorHubTools(capabilities).map((tool,index) => `<button type="button" class="hub-tool" data-hub-tool="${tool.id}" data-hub-hint="${html(tool.detail)}"><span class="hub-tool-icon">${icon(tool.icon)}</span><span class="hub-tool-copy"><strong>${tool.title}</strong><small>${captions[tool.id]}</small></span><span class="hub-tool-arrow" aria-hidden="true">${icon('arrow')}</span></button>`).join('')}</div><p class="hub-command-hint" data-hub-command-hint>Choose a tool to get started.</p></div>
          <aside class="hub-identity-stage" aria-label="Nourishland Creator"><div class="hub-identity-orbit"><span class="hub-stage-ring"></span><span class="hub-stage-ring hub-stage-ring--outer"></span>${creatorLogoMarkup('hub-hero-logo')}<span class="hub-stage-orb hub-stage-orb--earth"></span><span class="hub-stage-orb hub-stage-orb--fire"></span><span class="hub-stage-orb hub-stage-orb--water"></span></div><p class="hub-stage-wordmark">nourishland</p><span class="hub-stage-label">CREATOR</span><p class="hub-stage-project">${icon('pin')}${html(model.project.name)}</p></aside></div>
          <div class="hub-bottom"><a class="hub-secondary-button" href="${html(creatorProjectTutorialUrl(projectId, { mode }).href)}">${icon('help')}Guided setup</a><a class="hub-secondary-button" href="${html(url('work'))}">${icon('scan')}Field work</a><span>${model.areas.length} Areas · ${model.project.visibility === 'public' ? 'Public project' : 'Project draft'}<small>V${BUILD_INFO.version}</small></span></div>`;
        const showHint = event => { const tool=event.target.closest('[data-hub-hint]'); if(tool) root.querySelector('[data-hub-command-hint]').textContent=tool.dataset.hubHint; };
        root.addEventListener('focusin',showHint,{signal:abort.signal});root.addEventListener('pointerover',showHint,{signal:abort.signal});
    } else if (view === 'content') {
        host.innerHTML = `<div class="hub-tool-links">${link('Project knowledge', url('knowledge'), 'plant', 'Edit saved plant topics, sources and observations.')}${link('PIMO canvas', creatorPimoUrl(projectId, context()).href, 'webhub', capabilities.kind === 'phone' ? 'A visual map editor with touch controls.' : 'Create and connect cells in a visual map.')}${capabilities.pimoSpatial ? link(capabilities.immersiveEditor ? 'PIMO spatial editor' : 'PIMO 3D preview', creatorPimoUrl(projectId, { ...context(), spatial:true }).href, 'ar', capabilities.immersiveEditor ? 'Open the spatial canvas, then enter XR.' : 'Inspect your local canvas in 3D.') : ''}</div><p class="hub-footnote">PIMO canvases save in this browser and transfer as JSON. They are not yet attached to live plant records. Project knowledge edits save to your project.</p>`;
    } else if (view === 'paths') {
        host.innerHTML = '<p>Build a guide from the features already in your project.</p><div data-path-editor></div><p class="hub-footnote">Hunt and Quiz unlock rules are planned. The current editor supports guided stops, questions and observations.</p>';
        try {
            Object.assign(model, await loadCreatorWorkspace(projectId));
            if (!root.isConnected || abort.signal.aborted) return { root, signal:abort.signal, destroy() { abort.abort(); } };
            const { mountCreatorTourStudio } = await import('../services/creatorTourStudio.js');
            child = await mountCreatorTourStudio(host.querySelector('[data-path-editor]'), { model, siteId, onDirty:value => { dirty = value; if (!value) status(''); } });
            if (abort.signal.aborted) child.destroy();
        } catch (error) { status(`Discovery Paths could not open: ${error.message}`); }
    } else if (view === 'map-tools') {
        host.innerHTML = `<div class="hub-tool-links">${link('Site plan', url('map'), 'area', 'Arrange saved records on the project plan.')}${capabilities.kind !== 'phone' ? link('Flat planning map', url('planning-map'), 'pin', 'Refine your geographic project layout.') : ''}${link('Interactive Map · IMAP', url('imap'), 'explore', 'Open the generated project map.')}</div>`;
    } else if (view === 'preview-tools') {
        host.innerHTML = `<div class="hub-tool-links"><button class="hub-link" type="button" data-hub-action="visitor">${icon('explore')}<span><strong>Visitor preview</strong><small>Review what visitors can read and explore.</small></span>${icon('arrow')}</button>${link(capabilities.kind === 'headset' ? 'Enter spatial workspace' : 'Check spatial placement', workspaceUrl(projectId, { ...context(), mode:'spatial', view:'placement' }).href, 'ar', 'Choose an Area; WebXR support is checked before entry.')}${link('Discovery Path preview', url('paths'), 'checklist', 'Open a saved guide and preview its stops.')}</div>`;
    } else {
        host.innerHTML = `<div class="hub-tool-links">${link('Guided setup', creatorProjectTutorialUrl(projectId, { mode }).href, 'help', 'Create or refine your project, Site and first Area.')}<button class="hub-link" type="button" data-hub-action="settings">${icon('settings')}<span><strong>Project settings & sharing</strong><small>Name, access, publication and archive tools.</small></span>${icon('arrow')}</button>${link('Records & export', url('records'), 'upload', 'Review records, export data and print tags.')}${link('Field preparation & sync', url('project'), 'scan', 'Prepare a phone and review its saved results.')}</div>`;
    }
    root.addEventListener('click', async event => {
        if (event.target.closest('a') && (dirty || busy)) { event.preventDefault(); status(busy ? 'Wait for the current operation.' : 'Save or discard your path changes before leaving.'); return; }
        const tool = event.target.closest('[data-hub-tool]')?.dataset.hubTool;
        if (tool) { location.href = url(tool); return; }
        const action = event.target.closest('[data-hub-action]')?.dataset.hubAction;
        if (!action || busy) return;
        busy = true;
        try { await openLegacyCreatorTool(action === 'visitor' ? 'openCreatorVisitorPreview' : 'renderProjectSettings', encodeURIComponent(projectId)); }
        catch (error) { status(error.message); } finally { busy = false; }
    }, { signal:abort.signal });
    root.querySelector('[data-hub-site]').addEventListener('change', event => {
        if (dirty || busy) { event.target.value = siteId; status('Save or discard changes before switching Sites.'); return; }
        siteId = event.target.value; location.href = url(view);
    }, { signal:abort.signal });
    window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } }, { signal:abort.signal });
    route();
    return { root, signal:abort.signal, destroy() { abort.abort(); child?.destroy(); } };
}
