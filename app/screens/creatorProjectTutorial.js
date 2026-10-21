import { ensureCreatorInterfaceStyles } from '../services/creatorInterface.js';
import { creatorLogoMarkup } from '../services/creatorIdentity.js';
import { dashboardIcon } from '../services/workspaceIcons.js';
import { CREATOR_PROJECT_TUTORIAL } from '../services/creatorProjectTutorialContent.js';
import { ensureCreatorAuthentication } from '../services/apiClient.js';
import {
    createPlaceMarker, createProjectOnDisk, createSitePlace, loadPlaceMarkers, loadProject,
    loadProjects, renameProjectOnDisk
} from '../services/persistence.js';
import { loadCreatorWorkspace } from '../services/creatorWorkspaceData.js';
import { CREATOR_WORKSPACES, creatorProjectTutorialUrl as buildTutorialUrl, workspaceUrl } from '../services/creatorWorkspaceMode.js';
import { isDefaultHomeArea } from '../services/arExperienceConfig.js';
import {
    loadProjectMapInformation, normalizeProjectGeographicOrigin, normalizeProjectGeographicOriginInputs, withProjectGeographicOrigin,
    withProjectMapInformation
} from '../services/creatorProjectGeography.js';

const STEPS = CREATOR_PROJECT_TUTORIAL.steps;
const html = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const isSystemHome = area => isDefaultHomeArea(area) || area?.systemKey === 'home'
    || String(area?.name || '').trim().toLowerCase() === 'home';
const isTemplateRecord = marker => marker?.is_template === true || Boolean(marker?.template_id);
const safePart = value => String(value || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 95);
const stableId = (kind, projectId) => 'setup-' + kind + '-' + safePart(projectId);

export function creatorProjectTutorialUrl({ mode = 'desktop', projectId = '', step = '' } = {}) {
    return buildTutorialUrl(projectId, { mode, step });
}

function add(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function addButton(parent, label, action, { secondary = false, icon = '' } = {}) {
    const button = add('button', secondary ? 'cpt-button cpt-button-secondary' : 'cpt-button', icon ? '' : label);
    button.type = 'button';
    button.dataset.action = action;
    if (icon) {
        button.dataset.icon = icon;
        button.setAttribute('aria-label', label);
        button.title = label;
        const glyph = add('span', 'cpt-icon', icon === 'arrow' ? '←' : icon);
        glyph.setAttribute('aria-hidden', 'true');
        button.append(glyph);
    }
    parent.append(button);
    return button;
}

function formField(labelText, type, value, name, placeholder = '') {
    const label = add('label', 'cpt-field');
    label.append(add('span', '', labelText));
    const input = document.createElement(type === 'textarea' ? 'textarea' : 'input');
    if (type !== 'textarea') input.type = type;
    input.name = name;
    input.value = value ?? '';
    input.placeholder = placeholder;
    if (type === 'textarea') input.rows = 3;
    label.append(input);
    return label;
}

function includeStylesheet() {
    if (document.querySelector('link[data-creator-project-tutorial]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('../creator-project-tutorial.css', import.meta.url).href;
    link.dataset.creatorProjectTutorial = '';
    document.head.append(link);
}

export async function renderCreatorProjectTutorial(app, { mode = 'desktop', projectId = '', step = '' } = {}) {
    mode = CREATOR_WORKSPACES[mode] ? mode : 'desktop';
    includeStylesheet();
    ensureCreatorInterfaceStyles();
    document.body.dataset.experienceRole = 'creator';
    document.body.dataset.creatorOnboarding = 'true';

    const root = add('section', 'screen creator-project-tutorial');
    root.setAttribute('aria-label', 'Beginner Creator project setup');
    app.replaceChildren(root);
    const state = {
        mode, projectId, stepIndex: 0, project: null, projects: [], model: null, siteId: '',
        areaId: '', recordId: '', origin: null, map: null, mapError: '', busy: false, loaded: false
    };
    let pendingProjectId = '';
    try { pendingProjectId = localStorage.getItem('nlxr.creator-project-setup.pending') || ''; } catch {}

    function setStatus(message, isError = false) {
        const status = root.querySelector('[data-status]');
        if (!status) return;
        status.textContent = message || '';
        status.classList.toggle('is-error', isError);
    }

    function setBusy(value) {
        state.busy = value;
        root.querySelectorAll('button, input, textarea, select').forEach(node => { node.disabled = value; });
    }

    function rememberRoute() {
        if (!state.projectId || state.projectId === 'pending') return;
        const url = buildTutorialUrl(state.projectId, { mode: state.mode, step: STEPS[state.stepIndex]?.id || '' });
        history.replaceState({ nourishlandView: 'creator-project-tutorial', projectId: state.projectId, mode: state.mode }, '', url.href);
    }

    function completedStepsThroughCurrent() {
        const completed = [];
        if (state.project?.name) completed.push('project-identity');
        if (state.project?.siteMap?.geographicOrigin) completed.push('geographic-origin');
        if (state.map?.status) completed.push('load-map-information');
        if (state.areaId) completed.push('first-area');
        if (state.recordId) completed.push('first-record');
        return completed;
    }

    async function saveProgress(changes = {}) {
        if (!state.projectId) return;
        const fresh = await loadProject(state.projectId);
        const current = fresh.creatorOnboarding || {};
        const creatorOnboarding = {
            ...current,
            version: 1,
            tutorialId: CREATOR_PROJECT_TUTORIAL.id,
            stepId: STEPS[state.stepIndex]?.id || STEPS[0].id,
            stepIndex: state.stepIndex,
            mode: state.mode,
            ...changes,
            updatedAt: new Date().toISOString()
        };
        state.project = await renameProjectOnDisk(state.projectId, {
            ...fresh, preserveId: true, creatorOnboarding, _expectedModified: fresh.modified || ''
        });
        try { localStorage.setItem('nlxr.creator-project-setup.last-project', state.projectId); } catch {}
        rememberRoute();
        return state.project;
    }

    async function saveProjectDocument(update) {
        const fresh = await loadProject(state.projectId);
        const next = update(fresh);
        state.project = await renameProjectOnDisk(state.projectId, {
            ...next, preserveId: true, _expectedModified: fresh.modified || ''
        });
        rememberRoute();
        return state.project;
    }

    async function loadProjectState(id, { resume = true } = {}) {
        state.projectId = id;
        state.model = await loadCreatorWorkspace(id);
        state.project = state.model.project;
        state.projects = state.projects.length ? state.projects : await loadProjects();
        state.siteId = state.model.sites[0]?.id || '';
        const saved = state.project.creatorOnboarding || {};
        state.areaId = saved.firstAreaId || '';
        state.recordId = saved.firstRecordId || '';
        state.origin = state.project.siteMap?.geographicOrigin || null;
        state.map = state.project.siteMap?.mapData || null;
        state.mapSummary = state.map?.message || saved.mapSummary || '';
        state.mapError = state.map?.status === 'unavailable' ? state.map.message : '';
        state.stepIndex = resume && saved.tutorialId === CREATOR_PROJECT_TUTORIAL.id
            ? Math.max(0, Math.min(STEPS.length - 1, Number(saved.stepIndex) || 0))
            : 0;
        state.loaded = true;
        rememberRoute();
        render();
    }

    function renderProjectPicker() {
        const panel = add('section', 'cpt-project-picker');
        panel.append(add('h2', '', 'Choose a project to set up'));
        panel.append(add('p', '', 'Continue a saved draft or start a new one. Setup stays private until you publish it.'));
        const list = add('div', 'cpt-project-list');
        if (!state.projects.length) list.append(add('p', 'cpt-empty', 'No projects are available yet.'));
        for (const project of state.projects) {
            const button = add('button', 'cpt-project-choice');
            button.type = 'button';
            button.dataset.projectId = project.id;
            button.append(add('strong', '', project.name || project.id));
            button.append(add('small', '', project.description || 'Draft project'));
            list.append(button);
        }
        panel.append(list);
        addButton(panel, 'Start a new draft project', 'new-project');
        root.append(panel);
    }

    function renderStepContent() {
        if (!state.projectId || !state.project) {
            renderProjectPicker();
            return;
        }
        const step = STEPS[state.stepIndex];
        const panel = add('section', 'cpt-step-panel');
        const projectLine = add('p', 'cpt-project-context');
        projectLine.append(add('span', '', 'DRAFT PROJECT'));
        projectLine.append(add('strong', '', state.project.name || state.projectId));
        panel.append(projectLine);
        panel.append(add('h2', '', step.heading));
        panel.append(add('p', 'cpt-step-copy', step.body));
        if (step.note) panel.append(add('p', 'cpt-step-note', step.note));

        if (step.id === 'project-identity') renderIdentity(panel, step);
        else if (step.id === 'geographic-origin') renderOrigin(panel, step);
        else if (step.id === 'load-map-information') renderMap(panel, step);
        else if (step.id === 'first-area') renderArea(panel, step);
        else if (step.id === 'first-record') renderRecord(panel, step);
        else renderFinish(panel, step);

        const actions = add('div', 'cpt-actions');
        if (state.stepIndex > 0) addButton(actions, 'Back', 'back', { secondary: true, icon: 'arrow' });
        if (state.stepIndex < STEPS.length - 1 && !['project-identity', 'geographic-origin', 'load-map-information', 'first-area', 'first-record'].includes(step.id)) {
            addButton(actions, 'Continue', 'continue');
        }
        if (step.id === 'first-area' && state.areaId) addButton(actions, 'Continue to first record', 'continue');
        if (step.id === 'first-record' && state.recordId) addButton(actions, 'Continue to review', 'continue');
        if (state.stepIndex === STEPS.length - 1) {
            addButton(actions, 'Open Desktop Studio', 'open-desktop');
            addButton(actions, 'Open XR Spatial', 'open-spatial', { secondary: true });
        }
        panel.append(actions);
        root.append(panel);
    }

    function renderIdentity(panel, step) {
        panel.append(add('p', 'cpt-helper', 'A new draft starts with one system Home Area and a Pigeon Pea sample. We will identify these as starter content so they are not mistaken for your first Area or record.'));
        const form = add('div', 'cpt-form');
        form.append(formField('Project name', 'text', state.project.name, 'name', 'For example, North garden'));
        form.append(formField('What is this project for?', 'textarea', state.project.description, 'description', 'A few words about what you want to grow, care for, learn about or share.'));
        panel.append(form);
        const save = addButton(panel, 'Save name and purpose', 'save-identity');
        save.dataset.stepAction = step.actions[0].id;
    }

    function renderOrigin(panel, step) {
        panel.append(add('p', 'cpt-helper', step.distinction));
        panel.append(add('p', 'cpt-helper', 'This is one geographic origin for the whole project. It remains separate from XR placement and printed tags.'));
        const row = add('div', 'cpt-origin-grid');
        row.append(formField('Latitude', 'number', state.origin?.latitude, 'latitude', '-28.4'));
        row.append(formField('Longitude', 'number', state.origin?.longitude, 'longitude', '153.05'));
        row.querySelector('[name=latitude]').step = 'any';
        row.querySelector('[name=longitude]').step = 'any';
        panel.append(row);
        const buttons = add('div', 'cpt-actions');
        addButton(buttons, step.actions[0].label, 'device-location', { secondary: true });
        addButton(buttons, step.actions[1].label, 'manual-origin', { secondary: true });
        addButton(buttons, step.actions[2].label, 'save-origin');
        panel.append(buttons);
        if (state.origin) panel.append(add('p', 'cpt-saved', 'Project origin: ' + state.origin.latitude + ', ' + state.origin.longitude + ' (' + state.origin.source + ').'));
    }

    function renderMap(panel, step) {
        panel.append(add('p', 'cpt-helper', 'The available contour endpoint currently covers parts of New South Wales. Its contours are interpolated reference information, not a DEM, boundary survey, or physical XR placement.'));
        if (!state.origin) {
            panel.append(add('p', 'cpt-warning', 'Choose and save a project origin first. You can still continue by place name while the map is unavailable.'));
            return;
        }
        if (state.map?.status === 'sourced') panel.append(add('p', 'cpt-saved', state.map.message + ' ' + state.map.features.length + ' contour features saved. Source: ' + state.map.source));
        else if (state.map?.status === 'unavailable') panel.append(add('p', 'cpt-warning', state.map.message));
        else if (state.mapError) panel.append(add('p', 'cpt-warning', state.mapError));
        else panel.append(add('p', 'cpt-helper', 'Load map information for the saved origin. A service error will not block the rest of setup.'));
        const controls = add('div', 'cpt-actions');
        addButton(controls, state.mapError ? 'Retry map information' : step.actions[0].label, 'load-map', { secondary: true });
        addButton(controls, state.map?.status === 'sourced' ? 'Continue to first Area' : 'Continue by place name', 'continue');
        panel.append(controls);
    }

    function renderArea(panel, step) {
        const areas = state.model?.areas.filter(area => area.siteId === state.siteId && !isSystemHome(area)) || [];
        const records = state.model?.entries || [];
        const examples = records.filter(entry => isTemplateRecord(entry.marker));
        if (examples.length) panel.append(add('p', 'cpt-helper', 'Starter example detected: ' + examples.map(entry => entry.marker.name || 'Pigeon Pea').join(', ') + '. It stays in the system Home Area and does not count as your first working Area or record.'));
        if (state.areaId) {
            const selected = state.model.areas.find(area => area.id === state.areaId && area.siteId === state.siteId);
            panel.append(add('p', 'cpt-saved', selected ? 'First working Area: ' + selected.name : 'Your first Area is saved.'));
            addButton(panel, 'Use a different existing Area', 'choose-area', { secondary: true });
        } else if (areas.length) {
            panel.append(add('p', 'cpt-helper', 'Choose an existing working Area or create one. The system Home Area is not counted as your first Area.'));
            const list = add('div', 'cpt-area-list');
            for (const area of areas) {
                const button = add('button', 'cpt-area-choice', 'Use ' + area.name);
                button.type = 'button';
                button.dataset.areaId = area.id;
                list.append(button);
            }
            panel.append(list);
        }
        if (!state.areaId) {
            const form = add('div', 'cpt-form');
            form.append(formField('Name your first Area', 'text', '', 'areaName', 'For example, North garden'));
            panel.append(form);
            const create = addButton(panel, step.actions[0].label, 'save-area');
            create.dataset.stepAction = step.actions[0].id;
        }
    }

    function renderRecord(panel, step) {
        const area = state.model?.areas.find(item => item.id === state.areaId && item.siteId === state.siteId);
        panel.append(add('p', 'cpt-helper', area ? 'Adding to ' + area.name + '.' : 'Choose or create an Area before adding a record.'));
        const existing = (state.model?.entries || []).filter(entry => entry.siteId === state.siteId && entry.place.id === state.areaId && !isTemplateRecord(entry.marker));
        if (state.recordId) panel.append(add('p', 'cpt-saved', 'First record saved in this Area.'));
        else if (existing.length) {
            panel.append(add('p', 'cpt-helper', 'This Area already has records. You can use one as your first record or add another.'));
            const list = add('div', 'cpt-area-list');
            for (const entry of existing) {
                const button = add('button', 'cpt-area-choice', 'Use ' + (entry.marker.name || 'this record'));
                button.type = 'button';
                button.dataset.recordId = entry.marker.id;
                list.append(button);
            }
            panel.append(list);
        }
        if (!state.recordId) {
            const form = add('div', 'cpt-form');
            form.append(formField('Record name', 'text', '', 'recordName', 'For example, Lemon tree'));
            const label = add('label', 'cpt-field');
            label.append(add('span', '', 'Record type'));
            const select = document.createElement('select');
            select.name = 'recordType';
            for (const [value, text] of [['plant', 'Plant'], ['note', 'Note']]) {
                const option = document.createElement('option'); option.value = value; option.textContent = text; select.append(option);
            }
            label.append(select); form.append(label); panel.append(form);
            const create = addButton(panel, step.actions[0].label, 'save-record');
            create.dataset.stepAction = step.actions[0].id;
        }
    }

    function renderFinish(panel, step) {
        panel.append(add('p', 'cpt-helper', 'The project, Area and record keep their saved identities when you reopen them. Desktop Studio’s flat planning map and Interactive Map read from this same saved project.'));
        panel.append(add('p', 'cpt-helper', step.resume));
        panel.append(add('p', 'cpt-saved', state.project.visibility === 'public'
            ? 'This project is public. Review its visibility before continuing.'
            : 'This project remains a draft. Saving setup does not publish it.'));
        const checks = add('ul', 'cpt-checkpoints');
        for (const checkpoint of step.checkpoints) {
            const item = add('li', '', checkpoint.label);
            if (state.project.creatorOnboarding?.checkpoints?.includes(checkpoint.id)) item.dataset.complete = 'true';
            checks.append(item);
        }
        panel.append(checks);
        const controls = add('div', 'cpt-actions');
        addButton(controls, 'Save draft', 'save-draft', { secondary: true });
        addButton(controls, 'Reopen this project', 'reopen-project', { secondary: true });
        addButton(controls, 'Open Desktop records', 'open-flat', { secondary: true });
        addButton(controls, 'Open flat map', 'open-flat-map', { secondary: true });
        addButton(controls, 'Open Interactive Map', 'open-imap', { secondary: true });
        panel.append(controls);
    }

    function render() {
        root.replaceChildren();
        const brand = add('div', 'cpt-brandbar');
        const exitUrl = state.projectId && state.projectId !== 'pending'
            ? workspaceUrl(state.projectId, {mode:state.mode,siteId:state.siteId}).href
            : new URL('../index.html?creator=1', import.meta.url).href;
        brand.innerHTML = `<span>${creatorLogoMarkup()}nourishland <small>Creator</small></span><a href="${html(exitUrl)}" aria-label="Leave project setup" title="Leave project setup">${dashboardIcon('close')}</a>`;
        root.append(brand);
        const header = add('header', 'cpt-header');
        header.append(add('p', 'cpt-eyebrow', 'NOURISHLAND CREATOR · BEGINNER SETUP'));
        header.append(add('h1', '', CREATOR_PROJECT_TUTORIAL.title));
        header.append(add('p', '', CREATOR_PROJECT_TUTORIAL.introduction));
        const modeLabel = add('small', 'cpt-mode', CREATOR_WORKSPACES[state.mode].label);
        header.append(modeLabel);
        const progress = add('ol', 'cpt-progress');
        progress.setAttribute('aria-label', 'Setup progress');
        for (let index = 0; index < STEPS.length; index++) {
            const item = add('li', index === state.stepIndex ? 'is-current' : index < state.stepIndex ? 'is-done' : '', (index + 1) + '. ' + STEPS[index].heading);
            if (index === state.stepIndex) item.setAttribute('aria-current', 'step');
            if (index < state.stepIndex) item.append(add('span', 'cpt-complete-mark', ' ✓'));
            progress.append(item);
        }
        root.append(header, progress);
        if (state.loaded && !state.projectId) renderProjectPicker();
        else renderStepContent();
        const status = add('p', 'cpt-status');
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');
        status.dataset.status = '';
        root.append(status);
    const exit = add('a', 'cpt-exit', 'Return to projects');
        exit.href = new URL('../index.html?creator=1', import.meta.url).href;
        root.append(exit);
    if (state.projectId && state.projectId !== 'pending') {
        const projectExit = add('a', 'cpt-exit cpt-exit-project', 'Return to this project');
        projectExit.href = workspaceUrl(state.projectId, { mode: state.mode, siteId: state.siteId }).href;
        root.append(projectExit);
    }
    }

    async function createProject() {
        const name = root.querySelector('[name=name]')?.value.trim() || '';
        const description = root.querySelector('[name=description]')?.value.trim() || '';
        if (!name) { setStatus('Add a project name before saving.', true); return; }
        const existingId = pendingProjectId || ('starter-' + crypto.randomUUID());
        try { localStorage.setItem('nlxr.creator-project-setup.pending', existingId); } catch {}
        let project;
        try {
            project = await createProjectOnDisk({
                id: existingId, name, description, template: 'empty', siteSuggestions: ['Main Location'],
                projectStatus: 'under_construction', visibility: 'draft'
            });
        } catch (error) {
            try { project = await loadProject(existingId); }
            catch { throw error; }
        }
        state.projectId = project.id;
        state.project = project;
        state.projects = await loadProjects();
        state.stepIndex = 1;
        await saveProgress({ completedSteps: ['project-identity'] });
        try { localStorage.removeItem('nlxr.creator-project-setup.pending'); } catch {}
        await loadProjectState(project.id, { resume: true });
        setStatus('Draft project saved. The API added a system Home Area and sample record; setup will distinguish them from your work.');
    }

    async function updateExistingIdentity() {
        const name = root.querySelector('[name=name]')?.value.trim() || '';
        const description = root.querySelector('[name=description]')?.value.trim() || '';
        if (!name) { setStatus('Add a project name before saving.', true); return; }
        const fresh = await loadProject(state.projectId);
        state.project = await renameProjectOnDisk(state.projectId, {
            ...fresh, name, description, preserveId: true, _expectedModified: fresh.modified || ''
        });
        state.stepIndex = Math.max(state.stepIndex, 1);
        await saveProgress({ completedSteps: ['project-identity'] });
        render();
        setStatus('Project name and purpose saved.');
    }

    async function saveOrigin() {
        const latitudeInput = root.querySelector('[name=latitude]')?.value ?? '';
        const longitudeInput = root.querySelector('[name=longitude]')?.value ?? '';
        state.origin = normalizeProjectGeographicOriginInputs(latitudeInput, longitudeInput, state.origin);
        state.stepIndex = 2;
        await saveProjectDocument(project => {
            const updated = withProjectGeographicOrigin(project, state.origin);
            const current = project.creatorOnboarding || {};
            return {
                ...updated,
                creatorOnboarding: {
                    ...current, version: 1, tutorialId: CREATOR_PROJECT_TUTORIAL.id,
                    stepId: STEPS[state.stepIndex].id, stepIndex: state.stepIndex, mode: state.mode,
                    completedSteps: [...new Set([...(current.completedSteps || []), 'project-identity', 'geographic-origin'])],
                    updatedAt: new Date().toISOString()
                }
            };
        });
        state.map = state.project?.siteMap?.mapData || null;
        state.mapError = '';
        state.mapSummary = '';
        render();
        setStatus('One geographic origin saved to this project.');
    }

    async function useDeviceLocation() {
        if (!navigator.geolocation) throw new Error('Device location is not available here. Enter coordinates instead.');
        const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve,
            error => reject(new Error(error.code === 1 ? STEPS[1].permissionDenied : 'Device location could not be read. Enter coordinates instead.')),
            { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }));
        state.origin = normalizeProjectGeographicOrigin({
            latitude: position.coords.latitude, longitude: position.coords.longitude, source: 'device',
            accuracyMetres: position.coords.accuracy, capturedAt: new Date().toISOString()
        });
        root.querySelector('[name=latitude]').value = String(state.origin.latitude);
        root.querySelector('[name=longitude]').value = String(state.origin.longitude);
        setStatus('Device location filled in. Save this origin to continue.');
    }

    async function loadMapInformation() {
        const origin = state.project?.siteMap?.geographicOrigin;
        if (!origin) { setStatus('Save an origin before requesting map information.', true); return; }
        const mapData = await loadProjectMapInformation(origin, { widthMetres: 1000 });
        state.map = mapData;
        state.mapError = mapData.status === 'unavailable' ? mapData.message : '';
        state.mapSummary = mapData.message;
        await saveProjectDocument(project => {
            const updated = withProjectMapInformation(project, mapData);
            const current = project.creatorOnboarding || {};
            return {
                ...updated,
                creatorOnboarding: {
                    ...current, version: 1, tutorialId: CREATOR_PROJECT_TUTORIAL.id,
                    mapStatus: mapData.status, mapMessage: mapData.message,
                    stepId: STEPS[state.stepIndex].id, stepIndex: state.stepIndex, mode: state.mode,
                    updatedAt: new Date().toISOString()
                }
            };
        });
        render();
        setStatus(mapData.status === 'sourced' ? 'Map information saved to the project.' : 'Map information is unavailable. Your project can still be edited.');
    }

    async function refreshModel() {
        state.model = await loadCreatorWorkspace(state.projectId);
        state.project = state.model.project;
        if (!state.siteId) state.siteId = state.model.sites[0]?.id || '';
        if (!state.siteId) throw new Error('This project has no Site yet. Retry after reconnecting to the project service.');
    }

    async function chooseArea(areaId) {
        state.areaId = areaId;
        state.stepIndex = 4;
        state.areaId = areaId;
        await saveProgress({ firstAreaId: areaId, completedSteps: completedStepsThroughCurrent() });
        await refreshModel();
        render();
        setStatus('Existing working Area selected.');
    }

    async function createArea() {
        const name = root.querySelector('[name=areaName]')?.value.trim() || '';
        if (!name) { setStatus('Name your first Area before saving.', true); return; }
        await refreshModel();
        const id = stableId('area', state.projectId);
        const existing = state.model.areas.find(item => item.siteId === state.siteId && item.id === id);
        const area = existing || await createSitePlace(state.projectId, state.siteId, {
            id, name, type: 'Other', description: '', visibility: 'draft'
        });
        state.areaId = area.id;
        state.stepIndex = 4;
        await saveProgress({ firstAreaId: area.id, completedSteps: completedStepsThroughCurrent() });
        await refreshModel();
        render();
        setStatus(existing ? 'Your saved first Area was recovered.' : 'First Area saved to the draft project.');
    }

    async function chooseRecord(recordId) {
        state.recordId = recordId;
        state.stepIndex = 5;
        state.recordId = recordId;
        await saveProgress({ firstRecordId: recordId, completedSteps: completedStepsThroughCurrent() });
        render();
        setStatus('Existing record selected.');
    }

    async function createRecord() {
        if (!state.areaId) { setStatus('Select or save an Area before adding a record.', true); return; }
        const name = root.querySelector('[name=recordName]')?.value.trim() || '';
        const type = root.querySelector('[name=recordType]')?.value || 'plant';
        if (!name) { setStatus('Add a record name before saving.', true); return; }
        await refreshModel();
        const id = stableId('record', state.projectId);
        const existing = (await loadPlaceMarkers(state.projectId, state.siteId, state.areaId)).find(marker => marker.id === id);
        const marker = existing || await createPlaceMarker(state.projectId, state.siteId, state.areaId, {
            id, name, type, status: 'draft', visibility: 'draft',
            ...(type === 'plant' ? { plant_profile: { common_name: name, scientific_name: '' } } : {})
        });
        state.recordId = marker.id;
        state.stepIndex = 5;
        await saveProgress({ firstRecordId: marker.id, completedSteps: completedStepsThroughCurrent() });
        await refreshModel();
        render();
        setStatus(existing ? 'Your saved first record was recovered.' : 'First record saved inside your Area as a draft.');
    }

    async function reopenAndVerify() {
        const model = await loadCreatorWorkspace(state.projectId);
        const area = model.areas.some(item => item.siteId === state.siteId && item.id === state.areaId);
        const record = model.entries.some(item => item.siteId === state.siteId && item.place.id === state.areaId && item.marker.id === state.recordId);
        if (!area || !record) throw new Error('The saved Area or record is missing from the reopened project. Your project remains open; retry the load.');
        await saveProgress({ checkpoints: [...new Set([...(state.project.creatorOnboarding?.checkpoints || []), 'draft-saved', 'project-reopened'])] });
        render();
        setStatus('Reopened the same project. Its first Area and record identities are intact.');
    }

    async function openWorkspace(targetMode, view = 'hub', checkpoint = '') {
        if (checkpoint) {
            const checkpoints = [...new Set([...(state.project.creatorOnboarding?.checkpoints || []), checkpoint])];
            await saveProgress({ checkpoints });
        }
        const url = workspaceUrl(state.projectId, { mode: targetMode, siteId: state.siteId, view });
        location.href = url.href;
    }

    async function advance() {
        if (state.stepIndex >= STEPS.length - 1) return;
        const completedStep = STEPS[state.stepIndex].id;
        state.stepIndex++;
        const completedSteps = [...new Set([...(state.project.creatorOnboarding?.completedSteps || []),
            ...(completedStep === 'load-map-information' && !state.map ? [] : [completedStep])])];
        await saveProgress({ completedSteps });
        render();
    }

    const clickHandler = async event => {
        const projectChoice = event.target.closest('[data-project-id]');
        if (projectChoice) {
            try { setBusy(true); await loadProjectState(projectChoice.dataset.projectId); setStatus('Project opened. Your saved setup will resume here.'); }
            catch (error) { setStatus(error.message, true); }
            finally { setBusy(false); }
            return;
        }
        const areaChoice = event.target.closest('[data-area-id]');
        if (areaChoice) {
            try { setBusy(true); await chooseArea(areaChoice.dataset.areaId); }
            catch (error) { setStatus(error.message, true); }
            finally { setBusy(false); }
            return;
        }
        const recordChoice = event.target.closest('[data-record-id]');
        if (recordChoice) {
            try { setBusy(true); await chooseRecord(recordChoice.dataset.recordId); }
            catch (error) { setStatus(error.message, true); }
            finally { setBusy(false); }
            return;
        }
        const button = event.target.closest('[data-action]');
        if (!button || state.busy) return;
        const action = button.dataset.action;
        try {
            setBusy(true);
            if (action === 'new-project') {
                state.project = { name: '', description: '', visibility: 'draft' };
                state.projectId = 'pending';
                state.stepIndex = 0;
                state.loaded = true;
                render();
            } else if (action === 'save-identity') {
                if (state.projectId === 'pending') await createProject(); else await updateExistingIdentity();
            } else if (action === 'device-location') await useDeviceLocation();
            else if (action === 'manual-origin') {
                root.querySelector('[name=latitude]')?.focus();
                setStatus('Enter the project latitude and longitude, then save the origin.');
            } else if (action === 'save-origin') await saveOrigin();
            else if (action === 'load-map') await loadMapInformation();
            else if (action === 'save-area') await createArea();
            else if (action === 'choose-area') {
                state.areaId = '';
                render();
                root.querySelector('[name=areaName]')?.focus();
            } else if (action === 'save-record') await createRecord();
            else if (action === 'back') {
                state.stepIndex = Math.max(0, state.stepIndex - 1);
                await saveProgress();
                render();
            } else if (action === 'continue') await advance();
            else if (action === 'save-draft') {
                await saveProgress({ checkpoints: [...new Set([...(state.project.creatorOnboarding?.checkpoints || []), 'draft-saved'])] });
                render();
                setStatus('Draft progress saved to ' + state.project.name + '.');
            } else if (action === 'reopen-project') await reopenAndVerify();
            else if (action === 'open-flat') await openWorkspace('desktop', 'records');
            else if (action === 'open-flat-map') await openWorkspace('desktop', 'planning-map', 'flat-view-opened');
            else if (action === 'open-imap') await openWorkspace('desktop', 'imap', 'imap-view-opened');
            else if (action === 'open-map') await openWorkspace('desktop', 'map');
            else if (action === 'open-desktop') await openWorkspace('desktop', 'overview');
            else if (action === 'open-spatial') await openWorkspace('spatial');
        } catch (error) {
            setStatus(error.message || 'This step could not be saved. Your setup stays open; retry the same action.', true);
        } finally {
            setBusy(false);
        }
    };
    root.addEventListener('click', clickHandler);
    root.addEventListener('input', event => {
        if (event.target.matches('[name=latitude], [name=longitude]') && state.origin?.source === 'device') {
            state.origin = { ...state.origin, source: 'manual', accuracyMetres: null };
        }
    });

    try {
        const authenticated = await ensureCreatorAuthentication();
        if (!authenticated) throw new Error('Creator sign-in is required to save project setup.');
        state.projects = await loadProjects();
        state.loaded = true;
        if (projectId) await loadProjectState(projectId);
        else {
            let lastProjectId = '';
            try { lastProjectId = localStorage.getItem('nlxr.creator-project-setup.last-project') || ''; } catch {}
            if (lastProjectId && state.projects.some(project => project.id === lastProjectId)) await loadProjectState(lastProjectId);
            else render();
        }
        if (step) {
            const requested = STEPS.findIndex(item => item.id === step);
            if (requested >= 0 && requested <= state.stepIndex) { state.stepIndex = requested; render(); }
        }
    } catch (error) {
        render();
        setStatus(error.message || 'Creator setup could not load. Retry when the project service is available.', true);
        const retry = addButton(root, 'Retry setup', 'retry');
        retry.addEventListener('click', () => location.reload());
    }
    return { root, destroy() { root.removeEventListener('click', clickHandler); root.remove(); } };
}
