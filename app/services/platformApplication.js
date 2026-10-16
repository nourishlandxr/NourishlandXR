import { API_BASE } from './apiClient.js';
import { BUILD_INFO } from './buildInfo.js';
import { dashboardIcon } from './workspaceIcons.js';
import { createPublicContentClient } from './platformPublicContent.js';
import { readJournal, saveJournalDraft, journalExport } from './fieldJournal.js';
import { renderChecklistWorkspace } from './checklistWorkspace.js';
import { fieldShellMarkup, fieldLauncherMarkup } from './fieldShell.js';
import { fieldToolsMarkup, fieldDashboardMarkup } from './fieldTools.js';
import { readChecklists } from './checklistStore.js';

// Both entries deliberately reuse public content views; each owns its startup/lifecycle.
export async function renderPlatformApplication({ mode = 'desktop' } = {}) {
if (!['desktop', 'field'].includes(mode)) throw new Error('Unknown platform interface.');
const html = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const params = new URLSearchParams(location.search);
const app = document.getElementById('app');
if (params.get('onboarding') === '1') {
    const { renderCreatorProjectTutorial } = await import('../screens/creatorProjectTutorial.js');
    return renderCreatorProjectTutorial(app, {
        mode, projectId: params.get('project') || '', step: params.get('step') || ''
    });
}
const client = createPublicContentClient({ apiBase: API_BASE });
const state = { project: null, area: null, record: null, records: [], request: null, view: 'discover', busy: false };
let checklistDirty = false;
const url = (file, entries = {}) => {
    const result = new URL(file === 'platform.html' && entries.interface === 'field' ? '../field/index.html'
        : file === 'platform.html' ? '../platform.html' : `../${file}`, import.meta.url);
    result.search = '';
    Object.entries(entries).forEach(([key, value]) => { if (value && !(key === 'interface' && entries.interface === 'field')) result.searchParams.set(key, value); });
    return result.href;
};
const iconButton = (action, icon, label) => `<button class="icon-control" type="button" data-action="${action}" aria-label="${label}" title="${label}">${dashboardIcon(icon)}</button>`;
document.body.dataset.platformInterface = mode;
app.innerHTML = mode === 'field' ? fieldShellMarkup(BUILD_INFO) : `<div class="platform-shell"><header class="platform-header"><a class="wordmark" href="${url('platform.html', { interface: mode })}">nourishland</a><span>Content library</span><small class="welcome-version-badge">V${BUILD_INFO.version} · ${BUILD_INFO.target === 'production' ? 'Live' : 'Local preview'}</small></header>
<nav class="platform-nav" aria-label="Nourishland tools"><button type="button" data-view="discover">${dashboardIcon('explore')}Discover</button><button type="button" data-view="checklists">${dashboardIcon('grid')}Checklists</button>${mode === 'field' ? `<button type="button" data-view="journal">${dashboardIcon('note')}Field journal</button>` : ''}<a href="${url('index.html', { creator: '1' })}">${dashboardIcon('grid')}Create &amp; manage</a><a href="${url('index.html', { experience: 'webxr-demo' })}">${dashboardIcon('ar')}WebXR introduction</a><a href="${url('platform.html', { interface: mode === 'field' ? 'desktop' : 'field', project: params.get('project') })}">${mode === 'field' ? 'Desktop content' : 'Field tools'}</a></nav>
<main><div class="platform-context">${iconButton('back', 'arrow', 'Back')}<p data-context>Public knowledge</p>${iconButton('refresh', 'refresh', 'Refresh content')}</div><p class="platform-status" role="status" aria-live="polite" data-status></p><div data-content></div></main></div>`;
const content = app.querySelector('[data-content]');
if (mode === 'desktop') {
    const link = document.createElement('a');
    const setupUrl = new URL('../index.html', import.meta.url);
    setupUrl.searchParams.set('workspace', mode);
    setupUrl.searchParams.set('onboarding', '1');
    if (params.get('project')) setupUrl.searchParams.set('project', params.get('project'));
    link.href = setupUrl.href;
    link.textContent = 'Guided Creator setup';
    link.dataset.guidedCreatorSetup = '';
    app.querySelector('.platform-nav')?.prepend(link);
}
const status = text => { app.querySelector('[data-status]').textContent = text; };
if(mode==='field') {
    const settings=app.querySelector('[data-field-settings]');
    const update=document.querySelector('[data-field-shell-status]');
    if(update)settings.querySelector('[data-field-update]').append(update);
    app.querySelector('[data-action=settings]').onclick=()=>settings.showModal();
    app.querySelector('[data-action=close-settings]').onclick=()=>settings.close();
    const connection=()=>{app.querySelector('[data-field-connection]').textContent=navigator.onLine===false?'Offline':'Online';};
    connection();window.addEventListener('online',connection);window.addEventListener('offline',connection);
}
function context(text) {
    app.querySelector('[data-context]').textContent = text;
    app.querySelector('[data-action=back]').hidden = state.view === 'home' || state.view === 'discover' && !state.project && mode==='desktop';
    document.body.dataset.fieldView=state.view;
    if(mode==='field')window.scrollTo(0,0);
    app.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-current', button.dataset.view === state.view ? 'page' : 'false'));
    app.querySelector('[data-action=refresh]').hidden = ['home','journal','checklists','dashboard','tools'].includes(state.view);
}
function home() {
    state.request?.abort();state.view='home';status('');context('');
    history.replaceState(null,'',url('platform.html',{interface:mode}));
    content.innerHTML=fieldLauncherMarkup({studioUrl:url('index.html',{creator:'1'}),contentUrl:url('platform.html',{interface:'desktop'}),xrUrl:url('index.html',{experience:'webxr-demo'}),setupUrl:url('index.html',{workspace:'field',onboarding:'1',project:params.get('project')})});
}
function fieldUtility(view, selected = '') {
    if(mode!=='field')return discover();
    state.request?.abort();state.view=view;status('');context(view==='tools'?'Handy tools':'Dashboard');
    history.replaceState(null,'',url('platform.html',{interface:mode,view}));
    if(view==='tools') {
        content.innerHTML=fieldToolsMarkup(selected);
        content.querySelectorAll('[data-preview-tool]').forEach(button=>button.onclick=()=>fieldUtility('tools',button.dataset.previewTool));
    } else {
        let journalCount=0,checklistCount=0,storageError='';
        try {journalCount=readJournal().length;checklistCount=readChecklists().length;}
        catch(error){storageError=error.message;}
        content.innerHTML=fieldDashboardMarkup({projectName:state.project?.name,journalCount,checklistCount,storageError});
    }
}
async function load(task) {
    state.request?.abort();
    const controller = new AbortController(); state.request = controller; state.busy = true;
    status('Opening published content…');
    content.innerHTML = '<p>Loading…</p>';
    try { await task(controller.signal); if (!controller.signal.aborted) status(navigator.onLine === false ? 'Offline. Content browsing needs a connection; saved journal drafts remain on this device.' : ''); }
    catch (error) { if (!controller.signal.aborted) { content.innerHTML = '<p>Content could not open. Use refresh to try again.</p>'; status(error.message); } }
    finally { if (state.request === controller) state.busy = false; }
}
function cards(records, attribute) {
    return `<div class="content-grid">${records.map((record, index) => `<button class="content-card" type="button" ${attribute}="${index}"><span>${html(record.kind || record.siteName || 'Project')}</span><strong>${html(record.title || record.name)}</strong><p>${html(record.description)}</p></button>`).join('') || '<p>No published content is available here yet.</p>'}</div>`;
}
async function discover() {
    state.view = 'discover'; state.project = state.area = state.record = null; context('Public projects');
    history.replaceState(null, '', url('platform.html', { interface: mode, view: mode==='field'?'discover':'' }));
    await load(async signal => {
        const projects = await client.projects(signal); if (signal.aborted) return;
        content.innerHTML = `<p class="eyebrow">${mode === 'field' ? 'Choose a place. Look closer.' : 'Knowledge connected to place'}</p><h1>${mode === 'field' ? 'Your field companion' : 'Explore Nourishland content'}</h1><p>Read published project knowledge without an account.</p>${cards(projects, 'data-project')}`;
        content.querySelectorAll('[data-project]').forEach(button => button.onclick = () => openProject(projects[Number(button.dataset.project)].id));
    });
}
async function openProject(id) {
    state.view = 'discover'; state.area = state.record = null; context('Project content');
    await load(async signal => {
        const shared=await client.shared(id,signal);if(signal.aborted)return;
        const project=shared.project,areas=shared.areas.map(area=>({...area,siteName:shared.sites.find(site=>site.id===area.siteId)?.name||''}));
        state.project = project; context(project.name);
        history.replaceState(null, '', url('platform.html', { interface: mode, project: id }));
        content.innerHTML = `<h1>${html(project.name)}</h1><p>${html(project.description)}</p><h2>Areas</h2>${cards(areas, 'data-area')}${mode === 'desktop' ? `<p><a href="${url('index.html', { workspace: 'desktop', project: id })}">Open this project in Studio</a></p>` : ''}`;
        content.querySelectorAll('[data-area]').forEach(button => button.onclick = () => openArea(areas[Number(button.dataset.area)]));
    });
}
async function openArea(area) {
    state.area = area; state.record = null; context(`${state.project.name} / ${area.name}`);
    await load(async signal => {
        const shared=await client.shared(state.project.id,signal);if(signal.aborted)return;
        const result={records:shared.records.filter(record=>record.siteId===area.siteId&&record.areaId===area.id),warnings:[]};
        state.records = result.records;
        content.innerHTML = `<h1>${html(area.name)}</h1><p>${html(area.description)}</p>${result.warnings.length ? '<p>Some project records need administrator review.</p>' : ''}<label class="content-search">Search this area<input type="search" data-search></label><div data-records></div>`;
        const show = query => {
            const rows = state.records.filter(record => [record.title, record.scientificName, record.description].join(' ').toLowerCase().includes(query.toLowerCase()));
            content.querySelector('[data-records]').innerHTML = cards(rows, 'data-record');
            content.querySelectorAll('[data-record]').forEach(button => button.onclick = () => openRecord(rows[Number(button.dataset.record)]));
        };
        show(''); content.querySelector('[data-search]').oninput = event => show(event.target.value);
    });
}
async function openRecord(record) {
    state.record = record; context(`${state.area.name} / ${record.title}`);
    await load(async signal => {
        // Registry-only specimens have no marker profile; their published summary still works.
        const shared=await client.shared(record.projectId,signal);if(signal.aborted)return;
        const latest=shared.records.find(item=>item.id===record.id);
        if(!latest)throw new Error('This record is no longer available in the published project.');
        record=latest;state.record=latest;
        const profile = record.profile;
        if (signal.aborted) return;
        const text = [record.description, profile.description, profile.summary, profile.notes].filter(value => typeof value === 'string' && value.trim());
        content.innerHTML = `<article class="knowledge-record"><p class="eyebrow">${html(record.kind || 'Knowledge')}</p><h1>${html(record.title)}</h1><p><em>${html(record.scientificName || profile.scientific_name || '')}</em></p>${[...new Set(text)].map(value => `<p class="knowledge-text">${html(value)}</p>`).join('') || '<p>This published record has no description yet.</p>'}<dl><dt>Project</dt><dd>${html(state.project.name)}</dd><dt>Area</dt><dd>${html(state.area.name)}</dd>${record.knowledgeId ? `<dt>Knowledge reference</dt><dd>${html(record.knowledgeId)}</dd>` : ''}</dl>${mode === 'field' ? '<button type="button" data-observe>Record an observation</button>' : ''}</article>`;
        content.querySelector('[data-observe]')?.addEventListener('click', journal);
    });
}
function journal() {
    state.request?.abort(); state.view = 'journal'; context('Personal field journal'); status('');
    history.replaceState(null, '', url('platform.html', { interface: mode, project: state.project?.id, view: 'journal' }));
    let drafts;
    try { drafts = readJournal(); } catch (error) { content.innerHTML = '<h1>Field journal</h1><p>Journal storage needs attention. Existing data has been preserved.</p>'; status(error.message); return; }
    const target = state.record?.title || state.project?.name || 'General observation';
    content.innerHTML = `<h1>Field journal</h1><p>Write what you notice, then return to the landscape.</p><form data-journal><label>Observation · ${html(target)}<textarea name="observation" rows="5" maxlength="4000" required></textarea></label><button type="submit">Save draft on this device</button></form><p>Personal drafts stay in this browser. Server submission and synchronisation are not connected yet. Export a copy before clearing browser storage.</p><button type="button" data-export>Export journal</button><h2>Saved observations</h2>${drafts.slice().reverse().map(draft => `<article class="journal-entry"><time>${html(new Date(draft.createdAt).toLocaleString())}</time><p class="knowledge-text">${html(draft.text)}</p><small>Saved on this device${draft.projectId ? ` · ${html(draft.projectId)}` : ''}</small></article>`).join('') || '<p>No observations saved yet.</p>'}`;
    content.querySelector('[data-journal]').onsubmit = event => {
        event.preventDefault();
        try {
            saveJournalDraft({ text: new FormData(event.target).get('observation'), projectId: state.project?.id || '',
                siteId: state.area?.siteId || '', areaId: state.area?.id || '', targetId: state.record?.id || '' });
            journal(); status('Observation saved on this device.');
        } catch (error) { status(`Draft could not save: ${error.message}. Your text remains in the form.`); }
    };
    content.querySelector('[data-export]').onclick = () => {
        try { const blob = new Blob([journalExport()], { type: 'application/json' }); const href = URL.createObjectURL(blob);
            const link = document.createElement('a'); link.href = href; link.download = 'nourishland-field-journal.json'; link.click(); setTimeout(() => URL.revokeObjectURL(href), 1000);
        } catch (error) { status(error.message); }
    };
}
function checklists(projectId = state.project?.id || '') {
    state.request?.abort();state.view='checklists';context('Personal checklists');status('');
    history.replaceState(null,'',url('platform.html',{interface:mode,project:projectId,view:'checklists'}));
    renderChecklistWorkspace(content,{mode,projectId,scope:{siteId:state.area?.siteId||'',areaId:state.area?.id||''},status,onDirty:dirty=>{checklistDirty=dirty;}});
}
function hasUnsavedObservation() {
    if(checklistDirty){status('Save your checklist draft before changing tools.');return true;}
    if (state.view === 'journal' && content.querySelector('textarea')?.value.trim()) {
        status('Save your observation before changing tools.'); return true;
    }
    return false;
}
app.querySelector('[data-action=back]').onclick = () => {
    if (hasUnsavedObservation()) return;
    if(['dashboard','tools'].includes(state.view))return home();
    if(state.view==='checklists'){checklistDirty=false;return state.project?openProject(state.project.id):discover();}
    if (state.view === 'journal') { state.view = 'discover'; return state.record ? openRecord(state.record) : state.project ? openProject(state.project.id) : discover(); }
    if (state.record) return openArea(state.area);
    if (state.area) return openProject(state.project.id);
    if(mode==='field')return home();
    return discover();
};
app.querySelector('[data-action=refresh]').onclick = () => state.record ? openRecord(state.record) : state.area ? openArea(state.area) : state.project ? openProject(state.project.id) : discover();
app.addEventListener('click',event=>{
    const button=event.target.closest('[data-view]');if(!button||!app.contains(button))return;
    if (hasUnsavedObservation()) return;
    if(['dashboard','tools'].includes(button.dataset.view))return fieldUtility(button.dataset.view);
    return button.dataset.view === 'home' ? home() : button.dataset.view === 'journal' ? journal() : button.dataset.view==='checklists'?checklists():discover();
});
window.addEventListener('beforeunload', event => { if (checklistDirty || state.view === 'journal' && content.querySelector('textarea')?.value.trim()) { event.preventDefault(); event.returnValue = ''; } });
window.addEventListener('pagehide', () => state.request?.abort());
if(mode==='field'&&['dashboard','tools'].includes(params.get('view')))fieldUtility(params.get('view'));
else if (params.get('view') === 'checklists') checklists(params.get('project') || '');
else if (mode === 'field' && params.get('view') === 'journal') {
    journal();
    if (navigator.onLine === false) status('Offline. Your saved journal is available; project downloads are not connected yet.');
} else if(params.get('project'))await openProject(params.get('project'));
else if(mode==='field'&&params.get('view')!=='discover')home();
else await discover();
}
