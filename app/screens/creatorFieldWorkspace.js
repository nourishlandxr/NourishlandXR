import { loadCreatorWorkspace, entryProfile, entryAnchor, saveWorkspaceRecord, prepareCreatorFieldPackage, queueFieldResult, syncCreatorFieldResults, loadFieldOperations, saveFieldOperation, updatePreparedPackage } from '../services/creatorWorkspaceData.js';
import { removeFieldOperation, loadFieldPackage } from '../services/creatorWorkspaceStore.js';
import { workspaceHeader, escapeWorkspaceHtml as html, fieldPhoto } from '../services/creatorWorkspaceFrame.js';
import { workspaceUrl, recordKey, physicalTagSignature, fieldCheckState } from '../services/creatorWorkspaceMode.js';
import { PHYSICAL_ANCHOR_IDS, PHYSICAL_ANCHOR_DEFAULTS, physicalMarkerLabel, normalizePhysicalAnchor } from '../services/physicalAnchor.js';
import { dashboardIcon } from '../services/workspaceIcons.js';
import { startPhysicalAnchorScanner, stopPhysicalAnchorScanner } from './physicalAnchorScanner.js';

export async function renderWorkspace(app, projectId, options = {}) {
    let model = await loadCreatorWorkspace(projectId);
    const abort = new AbortController();
    const state = { view:'work', siteId:options.siteId || model.sites[0]?.id || '', selected:options.recordKey || '', query:'', busy:false, dirty:false, generation:0, photo:'', scannedKey:'', operations:[], package:null };
    app.innerHTML = `<section class="screen creator-field" aria-label="Android Field">${workspaceHeader(model,'field',{siteId:state.siteId,recordKey:state.selected})}<main class="field-content"><div class="field-context"><label>Site<select data-site>${model.sites.map(site=>`<option value="${html(site.id)}"${site.id===state.siteId?' selected':''}>${html(site.name)}</option>`).join('')}</select></label><span class="field-badge" data-connection></span></div><p class="field-status" role="status" data-status></p><div data-field-content></div></main><nav class="field-bottom-nav" aria-label="Field tasks">${[['work','grid','Work'],['scan','scan','Scan'],['capture','note','Capture'],['project','settings','Project']].map(([view,icon,label])=>`<button type="button" data-view="${view}">${dashboardIcon(icon)}${label}</button>`).join('')}</nav></section>`;
    const root = app.firstElementChild;
    const message = (text,error=false) => {if(!root.isConnected)return;const node=root.querySelector('[data-status]');node.textContent=text;node.classList.toggle('is-error',error);};
    const selected = () => model.entries.find(entry=>entry.key===state.selected);
    const allowChange = () => {if(state.busy){message('Wait for the current save to finish.');return false;}if(state.dirty){message('Save or discard your observation before changing tasks.',true);return false;}return true;};
    const rows = () => model.entries.filter(entry=>entry.siteId===state.siteId && entry.marker.status!=='archived' && [entry.marker.name,entry.place.name,entry.marker.physicalAnchor?.markerLabel].join(' ').toLowerCase().includes(state.query.toLowerCase()));
    const recordButtons = entries => `<div class="field-records">${entries.map(entry=>`<button type="button" data-record="${html(entry.key)}"${entry.key===state.selected?' aria-current="page"':''}><span class="field-record-symbol">${dashboardIcon(entry.marker.type==='plant'?'plant':entry.marker.type==='note'?'note':'totem')}</span><span><strong>${html(entry.marker.name)}</strong><small>${html(entry.place.name)} · ${html(entry.marker.physicalAnchor?.markerLabel || 'No tag')}</small><small>${html(fieldCheckState(entry.marker))}${entry.marker.field_work?.placementNeedsRecheck?' · placement needs review':''}</small></span></button>`).join('') || '<p>No records match this Site.</p>'}</div>`;
    function route() {
        history.replaceState({nourishlandView:'creator-workspace',projectId,workspace:'field',siteId:state.siteId,recordKey:state.selected},'',workspaceUrl(projectId,{mode:'field',siteId:state.siteId,recordKey:state.selected}));
        root.querySelectorAll('.workspace-mode-picker a').forEach(link=>{const mode=new URL(link.href).searchParams.get('workspace');link.href=workspaceUrl(projectId,{mode,siteId:state.siteId,recordKey:state.selected}).href;});
    }
    async function refreshLocalState() {
        [state.operations,state.package] = await Promise.all([loadFieldOperations(projectId),loadFieldPackage(projectId)]);
    }
    function render() {
        if(!root.isConnected)return;
        root.querySelector('[data-connection]').textContent=model.offline?'Prepared copy':navigator.onLine?'Connected':'Offline';
        root.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-current',button.dataset.view===state.view?'page':'false'));
        const entry=selected(), pending=state.operations.filter(op=>op.status==='pending').length, conflicts=state.operations.filter(op=>op.status==='conflict').length;
        let content='';
        if(state.view==='work') {
            const tasks=rows().filter(entry=>entry.marker.field_work?.requested);
            content=`<h1>Field work</h1><p>${tasks.length} prepared tasks · ${pending} saved locally · ${conflicts} need review</p><div class="field-launcher"><button type="button" data-action="scan">${dashboardIcon('scan')}Scan a tag<small>Find its linked record</small></button><button type="button" data-view="capture">${dashboardIcon('note')}Observe<small>Notes and photos</small></button><button type="button" data-action="sync">${dashboardIcon('upload')}Sync results<small>${pending} waiting</small></button><button type="button" data-view="project">${dashboardIcon('area')}Project<small>Prepare and review</small></button></div><label>Find a record<input data-search type="search" value="${html(state.query)}" placeholder="Plant, Area or tag"></label>${tasks.length?'<h2>Prepared tasks</h2>'+recordButtons(tasks)+'<h2>Project records</h2>':''}${recordButtons(rows())}`;
        } else if(state.view==='project') {
            content=`<h1>Project & sync</h1><div class="field-card"><h2>${html(model.project.name)}</h2><p>${model.entries.length} records across ${model.sites.length} Sites.</p><p>${state.package?`Prepared locally ${html(new Date(state.package.preparedAt).toLocaleString())}`:'Prepare this device while connected to keep records available offline.'}</p><div class="field-actions"><button type="button" data-action="prepare">Prepare this device</button><button class="studio-primary" type="button" data-action="sync">Sync ${pending} results</button></div><p class="studio-hint">Text, profiles and saved positions are stored on this device. Uncached photos and the camera detector need a connection. A tag check confirms the label association; XR saves the spatial position.</p></div><h2>Local results</h2>${state.operations.map(op=>{const target=model.entries.find(entry=>entry.key===op.key);return `<article class="field-queue-item"><span class="field-badge">${op.status==='conflict'?'Needs review':'Waiting to sync'}</span><h3>${html(target?.marker.name || op.markerId)}</h3><p>${html(op.kind==='observation'?op.note:'Printed tag association checked')}</p><p>${html(op.error || new Date(op.createdAt).toLocaleString())}</p>${op.status==='conflict'?`<label>Apply to record<select data-conflict-target="${html(op.id)}">${model.entries.filter(entry=>entry.marker.status!=='archived').map(entry=>`<option value="${html(entry.key)}"${entry.key===state.selected?' selected':''}>${html(entry.marker.name)} · ${html(entry.place.name)}</option>`).join('')}</select></label><div class="field-actions"><button type="button" data-resolve="${html(op.id)}">Apply after review</button><button type="button" data-discard-operation="${html(op.id)}">Discard local result</button></div>`:''}</article>`;}).join('') || '<p>All field results are synced.</p>'}`;
        } else if(!entry) {
            content=`<h1>${state.view==='scan'?'Scan & check':'Capture an observation'}</h1><p>Select a record${state.view==='scan'?' or scan its printed tag':''}.</p>${state.view==='scan'?'<button class="studio-primary" type="button" data-action="scan">Scan printed tag</button>':''}${recordButtons(rows())}`;
        } else {
            const tag=entry.marker.physicalAnchor, check=fieldCheckState(entry.marker);
            content=`<h1>${state.view==='scan'?'Tag & check':'Field observation'}</h1><button type="button" data-view="work">← Work list</button><article class="field-card"><span class="field-badge">${html(entry.place.name)}</span><h2>${html(entry.marker.name)}</h2><div data-field-profile>Loading record…</div>`;
            if(state.view==='scan') {
                const tagAllowed=entry.marker.type==='plant'||entry.marker.type==='area_checkpoint'||entry.marker.semantic_type==='area_checkpoint';
                content+=`<p>${html(tag?.markerLabel || 'No printed tag assigned')} · ${html(check)}</p><button class="studio-primary" type="button" data-action="scan">Scan printed tag</button>${tagAllowed?`<details><summary>Assign printed tag</summary><label>ArUco tag<select data-tag><option value="">Unassigned</option>${PHYSICAL_ANCHOR_IDS.map(id=>{const owner=model.entries.find(item=>item.key!==entry.key&&item.marker.physicalAnchor?.enabled&&Number(item.marker.physicalAnchor.markerId)===id);return `<option value="${id}"${tag?.enabled&&Number(tag.markerId)===id?' selected':''}${owner?' disabled':''}>${physicalMarkerLabel(id)}${owner?' · '+html(owner.marker.name):''}</option>`;}).join('')}</select></label><label>Black square size (mm)<input type="number" data-tag-size min="10" max="2000" value="${tag?.markerSizeMm || 140}"></label><button type="button" data-action="save-tag"${model.offline?' disabled':''}>Save tag assignment</button></details>`:''}${tag?.enabled?`<form data-check-form><label class="field-check-confirm"><input type="checkbox" name="confirmed" required>I checked that ${html(tag.markerLabel)} is attached to ${html(entry.marker.name)} at this location.</label><button type="submit">Save tag check locally</button></form>`:''}<p class="studio-hint">This records a tag association check. It does not verify the saved XR position.</p>`;
            } else {
                content+='<form data-observation-form><label>What did you observe?<textarea name="note" rows="5" required placeholder="Growth, flowering, fruit, site conditions…"></textarea></label><label>Photo<input data-photo type="file" accept="image/jpeg,image/png,image/webp" capture="environment"></label><img class="studio-photo" data-photo-preview alt="Observation photo" hidden><div class="field-actions"><button class="studio-primary" type="submit">Save on this device</button><button type="button" data-action="discard-draft">Discard draft</button></div><p class="studio-hint">Synced observations become local specimen knowledge in Draft, ready for desktop review.</p></form>';
            }
            content+='</article>';
        }
        root.querySelector('[data-field-content]').innerHTML=content;
        const profileNode=root.querySelector('[data-field-profile]');
        if(entry&&profileNode) {
            const generation=++state.generation;
            Promise.all([entryProfile(model,entry),entryAnchor(model,entry)]).then(([profile,anchor])=>{
                if(generation!==state.generation||!profileNode.isConnected)return;
                profileNode.innerHTML=`<p>${html(profile.scientific_name || '')}</p><p>${html(profile.overview || entry.marker.description || '')}</p><p class="studio-hint">${anchor?'Spatial position saved; field placement unverified':'No saved spatial position'}</p>`;
            }).catch(error=>{if(profileNode.isConnected)profileNode.textContent=error.message;});
        }
    }
    async function sync() {
        if(state.busy)return;
        state.busy=true;message('Syncing saved field results…');
        try {
            const result=await syncCreatorFieldResults(projectId);
            model=await loadCreatorWorkspace(projectId);await refreshLocalState();render();
            message(`${result.synced} synced · ${result.pending} waiting · ${result.conflicts} need review.`,result.conflicts>0);
        } catch(error){message(`Results remain saved on this device. ${error.message}`,true);}
        finally{state.busy=false;}
    }
    async function scan() {
        if(!allowChange())return;
        const started=await startPhysicalAnchorScanner(projectId,null,{assignments:model.entries.map(entry=>({marker:entry.marker,place:entry.place,site:model.sites.find(site=>site.id===entry.siteId)})),onUse:association=>{
            const key=recordKey({siteId:association.site.id,place:association.place,marker:association.marker});
            state.selected=key;state.siteId=association.site.id;state.scannedKey=key;state.view='scan';root.querySelector('[data-site]').value=state.siteId;route();render();message('Tag detected. Check that this is the correct plant or Totem, then save the check.');
        }});
        if(!started)message('Scanner could not start. Camera permission and the marker detector are required.',true);
    }
    root.addEventListener('input',event=>{
        if(event.target.matches('[data-search]')){state.query=event.target.value;const start=event.target.selectionStart;render();const input=root.querySelector('[data-search]');input.focus();input.setSelectionRange(start,start);}
        if(event.target.closest('[data-observation-form]'))state.dirty=true;
    },{signal:abort.signal});
    root.addEventListener('change',async event=>{
        if(event.target.matches('[data-site]')){if(!allowChange()){event.target.value=state.siteId;return;}state.siteId=event.target.value;state.selected='';state.scannedKey='';route();render();}
        if(event.target.matches('[data-photo]')) {
            if(state.busy)return;state.busy=true;
            try {state.photo=await fieldPhoto(event.target.files[0]);state.dirty=true;const preview=root.querySelector('[data-photo-preview]');preview.src=state.photo;preview.hidden=!state.photo;message('Photo attached to this observation.');}catch(error){message(error.message,true);}finally{state.busy=false;}
        }
    },{signal:abort.signal});
    root.addEventListener('submit',async event=>{
        if(!event.target.matches('[data-observation-form],[data-check-form]'))return;event.preventDefault();if(state.busy||!event.target.reportValidity())return;
        state.busy=true;
        try {
            const observation=event.target.matches('[data-observation-form]');
            await queueFieldResult(model,selected(),{kind:observation?'observation':'tag-association',note:observation?event.target.elements.note.value:'',photo:observation?state.photo:''});
            state.dirty=false;state.photo='';await refreshLocalState();render();message('Saved on this device. Sync when connected.');
        }catch(error){message(error.message,true);}finally{state.busy=false;}
    },{signal:abort.signal});
    root.addEventListener('click',async event=>{
        if(event.target.closest('a')&&!allowChange()){event.preventDefault();return;}
        const button=event.target.closest('button');if(!button)return;
        if(button.dataset.record){if(!allowChange())return;state.selected=button.dataset.record;state.view='capture';route();render();return;}
        if(button.dataset.view){if(!allowChange())return;state.view=button.dataset.view;render();return;}
        if(button.dataset.action==='discard-draft'){if(state.busy)return;state.dirty=false;state.photo='';render();message('Observation draft discarded.');return;}
        if(!allowChange())return;
        try {
            const action=button.dataset.action;
            if(action==='scan'){await scan();return;}
            if(action==='sync'){await sync();return;}
            if(action==='save-tag'){
                state.busy=true;const entry=selected(),id=root.querySelector('[data-tag]').value,size=root.querySelector('[data-tag-size]');if(!size.reportValidity())return;
                const physicalAnchor=id?normalizePhysicalAnchor({...PHYSICAL_ANCHOR_DEFAULTS,...entry.marker.physicalAnchor,enabled:true,markerId:Number(id),markerSizeMm:Number(size.value)}):null;
                await saveWorkspaceRecord(model,entry,{markerChanges:{physicalAnchor}});await updatePreparedPackage(model);render();message('Tag assignment saved. Check the printed tag on site next.');return;
            }
            if(action==='prepare'){
                state.busy=true;model=await loadCreatorWorkspace(projectId);
                await prepareCreatorFieldPackage(model,(done,total)=>message(`Preparing records ${done}/${total}…`));
                const {prepareFieldApplication}=await import('../services/creatorFieldOffline.js');
                await prepareFieldApplication();await refreshLocalState();render();message('This device is prepared. Reopen this project from this URL while offline. Uncached media and detector scripts still need a connection.');return;
            }
            if(button.dataset.resolve){
                state.busy=true;const operation=state.operations.find(op=>op.id===button.dataset.resolve),key=root.querySelector(`[data-conflict-target="${CSS.escape(operation.id)}"]`).value;
                const fresh=await loadCreatorWorkspace(projectId);if(fresh.offline)throw new Error('Reconnect to review a changed record.');const entry=fresh.entries.find(entry=>entry.key===key);if(!entry)throw new Error('Select a current record.');
                if(operation.kind==='tag-association'&&!entry.marker.physicalAnchor?.enabled)throw new Error('This record has no assigned tag.');
                if(operation.kind==='tag-association'&&physicalTagSignature(entry.marker)!==operation.signature)throw new Error('The tag changed. Discard this old check and check the current printed tag on site.');
                await saveFieldOperation({...operation,key:entry.key,siteId:entry.siteId,placeId:entry.place.id,markerId:entry.marker.id,signature:physicalTagSignature(entry.marker),status:'pending',error:''});await refreshLocalState();render();message('Reviewed result is ready to sync.');return;
            }
            if(button.dataset.discardOperation){state.busy=true;await removeFieldOperation(button.dataset.discardOperation);await refreshLocalState();render();message('Local result discarded.');}
        }catch(error){message(error.message,true);}finally{state.busy=false;}
    },{signal:abort.signal});
    window.addEventListener('online',()=>{if(!state.dirty&&!state.busy)void sync();else message('Connection restored. Save your observation, then sync.');},{signal:abort.signal});
    window.addEventListener('offline',()=>{if(!state.dirty)render();message('Offline. New field results can be saved on this device.');},{signal:abort.signal});
    window.addEventListener('beforeunload',event=>{if(state.dirty){event.preventDefault();event.returnValue='';}},{signal:abort.signal});
    await refreshLocalState();render();route();
    return {root,signal:abort.signal,destroy(){state.generation++;abort.abort();void stopPhysicalAnchorScanner();}};
}
