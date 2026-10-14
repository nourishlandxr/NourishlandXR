import { API_BASE, apiFetch } from './apiClient.js';
import { readChecklists, checklistProgress, setChecklistStep } from './checklistStore.js';
import { validatePublishedChecklists, validatePublishedChecklist } from './publishedChecklistContract.js';
import { dashboardIcon } from './workspaceIcons.js';

const html = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const icon = (action, name, label) => `<button type="button" class="icon-control" data-${action} aria-label="${label}" title="${label}">${dashboardIcon(name)}</button>`;

export function renderProjectChecklistWorkspace(root, { mode, projectId, status, onDirty, onBack }) {
    let generation = 0, mount = null;
    const active = token => token === generation && mount && root.contains(mount);
    const endpoint = () => `${API_BASE}/projects/${encodeURIComponent(projectId)}/checklists`;
    async function request(url, options) {
        const response = await apiFetch(url, options);
        const value = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(value.error || `Request failed (${response.status})`);
        return value;
    }
    const mutation = (url, method, body) => request(url, { method, headers: { 'Content-Type':'application/json' }, body:JSON.stringify(body) });
    function page(body) {
        onDirty(false);
        root.innerHTML = `<section data-project-checklists>${icon('personal', 'arrow', 'Back to personal checklists')}${body}</section>`;
        mount = root.querySelector('[data-project-checklists]');
        root.querySelector('[data-personal]').onclick = () => { generation++; onBack(); };
    }
    function selectProject() {
        generation++;
        page('<h1>Project checklists</h1><form data-project-form><label>Project reference<input name="projectId" required pattern="[A-Za-z0-9_-]+" maxlength="160"></label><button type="submit">Open project checklists</button></form>');
        root.querySelector('form').onsubmit = event => { event.preventDefault(); projectId = new FormData(event.target).get('projectId').trim(); published(); };
    }
    async function published() {
        const token = ++generation;
        page(`<h1>Project checklists</h1><p>Project: ${html(projectId)}</p><p>Administrator-approved observation activities. Your progress stays on this device.</p>${mode === 'desktop' ? '<button type="button" data-manage>Review &amp; publish</button>' : ''}<div data-published-list role="status">Loading published checklists…</div>`);
        root.querySelector('[data-manage]')?.addEventListener('click', manage);
        try {
            const payload = validatePublishedChecklists(await request(endpoint() + '?view=visitor'), projectId);
            if (!active(token)) return;
            const list = root.querySelector('[data-published-list]');
            list.innerHTML = payload.experiences.map((item,index) => `<button type="button" class="content-card" data-published="${index}"><span>Published · revision ${item.revision}</span><strong>${html(item.title)}</strong><p>${html(item.description)}</p><small>${item.steps.length} activities</small></button>`).join('') || '<p>No published checklists for this project.</p>';
            list.querySelectorAll('[data-published]').forEach(button => button.onclick = () => follow(payload.experiences[Number(button.dataset.published)].id));
        } catch (error) { if (active(token)) { root.querySelector('[data-published-list]').textContent = 'Published content could not load. Connect and try again.'; status(error.message); } }
    }
    async function follow(id) {
        const token = ++generation;
        page('<h1>Opening checklist…</h1>');
        try {
            const experience = validatePublishedChecklist(await request(`${endpoint()}/${encodeURIComponent(id)}?view=visitor`), projectId);
            if (!active(token)) return;
            const completed = new Set(checklistProgress(experience));
            page(`<article><p>Published · revision ${experience.revision}</p><h1>${html(experience.title)}</h1><p class="knowledge-text">${html(experience.description)}</p><p data-progress role="status">${completed.size} of ${experience.steps.length} complete</p><div class="checklist-activities">${experience.steps.map(step => `<label class="checklist-activity"><input type="checkbox" data-step="${html(step.id)}"${completed.has(step.id) ? ' checked' : ''}><strong>${html(step.instructions)}</strong></label>`).join('')}</div><button type="button" data-all>All project checklists</button><p>Completion is self-reported and saved on this device.</p></article>`);
            root.querySelector('[data-all]').onclick = published;
            root.querySelectorAll('[data-step]').forEach(input => input.onchange = () => {
                try { const ids = setChecklistStep(experience, input.dataset.step, input.checked); root.querySelector('[data-progress]').textContent = `${ids.length} of ${experience.steps.length} complete`; }
                catch (error) { input.checked = !input.checked; status(error.message); }
            });
        } catch (error) { if (active(token)) { page('<h1>Checklist unavailable</h1><p>Reconnect or refresh project content.</p><button type="button" data-all>All project checklists</button>'); root.querySelector('[data-all]').onclick = published; status(error.message); } }
    }
    function signIn() {
        const token = ++generation;
        page(`<h1>Project sign in</h1><p>Use your project account. The existing administrator can leave the account name blank.</p><form><label>Account name<input name="username" autocomplete="username" maxlength="160"></label><label>Password<input name="password" type="password" autocomplete="current-password" required maxlength="1024"></label><button type="submit">Sign in</button></form>`);
        root.querySelector('form').onsubmit = async event => {
            event.preventDefault(); const form = event.target, data = new FormData(form), button = form.querySelector('button'); button.disabled = true;
            try { await mutation(`${API_BASE}/auth/login`, 'POST', { username:data.get('username').trim(), password:data.get('password') }); if (active(token)) manage(); }
            catch (error) { if (active(token)) { form.elements.password.value = ''; button.disabled = false; status(error.message); } }
        };
    }
    async function manage() {
        const token = ++generation;
        page('<h1>Checklist review</h1><p>Checking project access…</p>');
        try {
            const session = await request(`${API_BASE}/auth/session`);
            if (!active(token)) return;
            if (!session.authenticated) return signIn();
            const payload = await request(endpoint());
            if (!active(token)) return;
            const personal = readChecklists().filter(item => item.projectId === projectId);
            page(`<h1>Checklist review</h1><p>Project: ${html(projectId)} · ${html(payload.role)} · ${html(session.identity.id)}</p>${icon('logout','close','Sign out')}<p>Editors save server drafts. Administrators review the activities and publish an approved revision. Published activities stay unchanged while the next draft is prepared.</p>${personal.length ? `<form data-submit-draft><label>Personal draft<select name="draft">${personal.map((item,index) => `<option value="${index}">${html(item.title)}</option>`).join('')}</select></label><button type="submit">Submit to project review</button></form>` : '<p>Create a personal checklist for this project, then submit it here.</p>'}<div class="content-grid">${payload.entries.map((entry,index) => `<button type="button" class="content-card" data-review="${index}"><strong>${html(entry.draft.title)}</strong><span>Draft revision ${entry.draft.revision} · ${entry.published ? `published revision ${entry.published.revision}` : 'unpublished'}</span></button>`).join('') || '<p>No server drafts yet.</p>'}</div>`);
            root.querySelector('[data-logout]').onclick = async () => { try { await mutation(`${API_BASE}/auth/logout`,'POST',{}); if (active(token)) signIn(); } catch(error) { status(error.message); } };
            root.querySelectorAll('[data-review]').forEach(button => button.onclick = () => review(payload.entries[Number(button.dataset.review)], payload.role));
            const form = root.querySelector('[data-submit-draft]');
            if (form) form.onsubmit = async event => {
                event.preventDefault(); const experience = personal[Number(new FormData(form).get('draft'))];
                // New submissions never overwrite an existing reviewed server draft.
                form.querySelector('button').disabled = true;
                try { await mutation(`${endpoint()}/${encodeURIComponent(experience.id)}`, 'PUT', { expectedVersion:0, experience }); if (active(token)) { status('Draft submitted for project review.'); manage(); } }
                catch (error) { if (active(token)) { form.querySelector('button').disabled = false; status(error.message); } }
            };
        } catch (error) { if (active(token)) { page(`<h1>Project access unavailable</h1><p>${html(error.message)}</p><button type="button" data-signin>Sign in with another account</button>`); root.querySelector('[data-signin]').onclick = signIn; status(error.message); } }
    }
    function review(entry, role) {
        const token = ++generation;
        page(`<h1>Review checklist draft</h1><p>Draft revision ${entry.draft.revision} · ${entry.published ? `published revision ${entry.published.revision}` : 'unpublished'}</p><form data-edit><label>Title<input name="title" required maxlength="160" value="${html(entry.draft.title)}"></label><label>Description<textarea name="description" maxlength="4000">${html(entry.draft.description)}</textarea></label>${entry.draft.steps.map((step,index) => `<label>Activity ${index+1}<textarea name="step-${index}" required maxlength="1000">${html(step.instructions)}</textarea></label>`).join('')}<button type="submit">Save server draft</button></form>${role === 'admin' ? `<button type="button" data-publish>Publish approved revision</button>${entry.published ? '<button type="button" data-withdraw>Withdraw publication</button>' : ''}` : '<p>A project administrator must approve publication.</p>'}<button type="button" data-review-list>All server drafts</button>`);
        let dirty = false, busy = false;
        const form = root.querySelector('form');
        const lock = value => { busy=value; root.querySelectorAll('button,input,textarea').forEach(control => control.disabled=value); };
        form.oninput = () => { dirty=true; onDirty(true); };
        root.querySelector('[data-personal]').onclick = () => { if (dirty) return status('Save your review changes before leaving.'); generation++; onBack(); };
        root.querySelector('[data-review-list]').onclick = () => dirty ? status('Save your review changes before leaving.') : manage();
        const reload = document.createElement('button'); reload.type = 'button'; reload.textContent = 'Discard changes & reload';
        reload.onclick = async () => {
            if (dirty && !window.confirm('Discard your unsaved review changes and reload the server draft?')) return;
            lock(true);
            try { const next = await request(`${endpoint()}/${encodeURIComponent(entry.draft.id)}`); if (active(token)) { onDirty(false); review(next,role); } }
            catch(error) { if (active(token)) { lock(false); status(error.message); } }
        };
        root.querySelector('[data-review-list]').after(reload);
        form.onsubmit = async event => {
            event.preventDefault(); if (busy) return; lock(true);
            const experience = { ...entry.draft, title:form.elements.title.value, description:form.elements.description.value,
                steps:entry.draft.steps.map((step,index) => ({ ...step, instructions:form.elements[`step-${index}`].value })) };
            try { const next = await mutation(`${endpoint()}/${encodeURIComponent(entry.draft.id)}`,'PUT',{ expectedVersion:entry.version, experience }); if (active(token)) { onDirty(false); status('Server draft saved.'); review(next,role); } }
            catch(error) { if (active(token)) { lock(false); status(error.message); } }
        };
        const publish = async action => {
            if (dirty) return status('Save your review changes before publishing.');
            if (busy) return; lock(true);
            try { const next = await mutation(`${endpoint()}/${encodeURIComponent(entry.draft.id)}/${action}`,'POST',{ expectedVersion:entry.version }); if (active(token)) { status(action === 'publish' ? 'Approved checklist is now public.' : 'Checklist withdrawn from public access.'); review(next,role); } }
            catch(error) { if (active(token)) { lock(false); status(error.message); } }
        };
        root.querySelector('[data-publish]')?.addEventListener('click', () => publish('publish'));
        root.querySelector('[data-withdraw]')?.addEventListener('click', () => publish('unpublish'));
    }
    if (projectId) published(); else selectProject();
}
