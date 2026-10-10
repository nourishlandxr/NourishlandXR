import { loadCreatorWorkspace, entryProfile, entryAnchor, saveWorkspaceRecord, createWorkspaceRecord, createWorkspaceArea, prepareCreatorFieldPackage, savePlanPoint, loadFieldOperations, syncCreatorFieldResults } from '../services/creatorWorkspaceData.js';
import { workspaceHeader, escapeWorkspaceHtml as html, openLegacyCreatorTool, fieldPhoto } from '../services/creatorWorkspaceFrame.js';
import { workspaceUrl, fieldCheckState } from '../services/creatorWorkspaceMode.js';
import { dashboardIcon } from '../services/workspaceIcons.js';
import { PHYSICAL_ANCHOR_IDS, PHYSICAL_ANCHOR_DEFAULTS, normalizePhysicalAnchor, physicalMarkerLabel } from '../services/physicalAnchor.js';
import { resolvePlantPim } from '../services/pimLegacyAdapter.js';
import { pimUpdateNode, pimAddNode, pimKnowledgeScope } from '../services/pimModel.js';

const typeLabel = marker => ({ plant:'Plant', note:'Note', area_checkpoint:'Totem', sub_checkpoint:'Marker', intro_checkpoint:'Entrance' })[marker.semantic_type || marker.type] || 'Record';
const icon = name => `<span aria-hidden="true">${dashboardIcon(name)}</span>`;

export async function renderWorkspace(app, projectId, options = {}) {
    const model = await loadCreatorWorkspace(projectId);
    const abort = new AbortController();
    const state = { siteId: options.siteId || model.sites[0]?.id || '', areaId:'', query:'', type:'all', page:0,
        view:['records','map','knowledge','field'].includes(options.view) ? options.view : 'records', selected:options.recordKey || '', checked:new Set(), dirty:false, generation:0, busy:false, topicId:'', categoryId:'', newTopic:false };
    app.innerHTML = `<section class="screen creator-studio" aria-label="Desktop Studio">${workspaceHeader(model,'desktop',state)}
      <div class="studio-context"><label>Site<select data-site>${model.sites.map(site=>`<option value="${html(site.id)}"${site.id===state.siteId?' selected':''}>${html(site.name)}</option>`).join('')}</select></label><p data-summary></p><button type="button" data-action="prepare">${icon('scan')}Prepare for field</button><button type="button" data-action="export">Export records</button></div>
      <div class="studio-body"><nav class="studio-sidebar" aria-label="Desktop tasks"><p>WORKSPACE</p>${[['records','grid','Records'],['map','area','Map'],['knowledge','webhub','Knowledge'],['field','scan','Field work']].map(([view,symbol,label])=>`<button type="button" data-view="${view}">${icon(symbol)}${label}</button>`).join('')}<hr><div data-areas></div><button type="button" data-action="new-area">+ Add Area</button><hr><button type="button" data-action="print">${icon('print')}Print tags</button><button type="button" data-action="visitor">${icon('explore')}Visitor preview</button><details><summary>Project tools</summary><button type="button" data-action="settings">Project settings</button><button type="button" data-action="import">Import project archive</button></details></nav>
      <main class="studio-main"><div class="studio-toolbar"><h1 data-heading>Plant records</h1><button type="button" data-action="add">+ Add record</button></div><div class="studio-filters"><label class="studio-search">Search<input type="search" data-search placeholder="Name, code or tag"></label><label>Type<select data-type><option value="all">All records</option><option value="plant">Plants</option><option value="note">Notes</option><option value="area_checkpoint">Totems</option><option value="archived">Archived</option></select></label></div><p class="studio-status" role="status" data-status>${model.offline?'Prepared records · server unavailable. Database edits require a connection.':''}</p><div data-center></div></main>
      <aside class="studio-inspector" aria-label="Selected record" data-inspector></aside></div><dialog class="studio-dialog" data-dialog></dialog></section>`;
    const root = app.firstElementChild;
    let activeEntry = null, profile = {}, anchor = null, pimDocument = null;
    const message = (text, error = false) => { const output=root.querySelector('[data-status]'); output.textContent=text; output.classList.toggle('is-error',error); };
    function route() {
        history.replaceState({nourishlandView:'creator-workspace',projectId,workspace:'desktop',siteId:state.siteId,recordKey:state.selected,view:state.view},'',workspaceUrl(projectId,{mode:'desktop',siteId:state.siteId,recordKey:state.selected,view:state.view}));
        root.querySelectorAll('.workspace-mode-picker a').forEach(link=>{ const mode=new URL(link.href).searchParams.get('workspace');link.href=workspaceUrl(projectId,{mode,siteId:state.siteId,recordKey:state.selected,view:state.view}).href; });
    }
    const allowChange = () => { if (state.busy) { message('Wait for the current save to finish.');return false; } if(state.dirty){message('Save or discard the selected record’s changes before changing views.',true);return false;}return true; };
    function filtered() {
        const query=state.query.toLocaleLowerCase();
        return model.entries.filter(entry=>entry.siteId===state.siteId && (!state.areaId || entry.place.id===state.areaId)
          && (state.type==='archived'?entry.marker.status==='archived':entry.marker.status!=='archived' && (state.type==='all'||entry.marker.type===state.type||entry.marker.semantic_type===state.type))
          && (!query || [entry.marker.name,entry.marker.plant_code,entry.place.name,entry.marker.physicalAnchor?.markerLabel,model.profiles[entry.key]?.scientific_name].join(' ').toLocaleLowerCase().includes(query))
          && (state.view!=='field'||entry.marker.field_work?.requested || entry.marker.physicalAnchor?.enabled));
    }
    function table(rows, compact=false) {
        return `<div class="studio-table-wrap"><table class="studio-table"><thead><tr><th><input type="checkbox" data-select-all aria-label="Select visible records"${rows.length&&rows.every(entry=>state.checked.has(entry.key))?' checked':''}></th><th>Record</th><th>Area</th><th>Tag</th><th>Field check</th><th>Content</th></tr></thead><tbody>${rows.map(entry=>`<tr${entry.key===state.selected?' class="is-selected"':''}><td><input type="checkbox" data-check="${html(entry.key)}" aria-label="Select ${html(entry.marker.name)}"${state.checked.has(entry.key)?' checked':''}></td><td><button type="button" data-record="${html(entry.key)}">${html(entry.marker.name)}</button><small>${html(model.profiles[entry.key]?.scientific_name || entry.marker.plant_code || typeLabel(entry.marker))}</small></td><td>${html(entry.place.name)}</td><td>${html(entry.marker.physicalAnchor?.markerLabel || '—')}</td><td>${html(fieldCheckState(entry.marker))}</td><td>${html(entry.marker.status==='archived'?'Archived':entry.marker.visibility==='public'?'Public':'Draft')}</td></tr>`).join('') || `<tr><td colspan="6">${compact?'No prepared field tasks match this view.':'No records match this view.'}</td></tr>`}</tbody></table></div>`;
    }
    function renderAreas() {
        root.querySelector('[data-areas]').innerHTML=`<p>AREAS</p><button type="button" data-area=""${!state.areaId?' aria-current="page"':''}>All Areas</button>${model.areas.filter(area=>area.siteId===state.siteId).map(area=>`<button type="button" data-area="${html(area.id)}"${area.id===state.areaId?' aria-current="page"':''}>${html(area.name)}<small>${model.entries.filter(entry=>entry.siteId===area.siteId&&entry.place.id===area.id&&entry.marker.status!=='archived').length}</small></button>`).join('')}`;
    }
    function renderCenter() {
        root.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-current',button.dataset.view===state.view?'page':'false'));
        root.querySelector('[data-heading]').textContent=({records:'Project records',map:'Map and register',knowledge:'Knowledge studio',field:'Field work'})[state.view];
        root.querySelector('.studio-filters').hidden=state.view==='knowledge';
        const rows=filtered();state.page=Math.min(state.page,Math.max(0,Math.ceil(rows.length/25)-1));
        root.querySelector('[data-summary]').textContent=`${model.sites.find(site=>site.id===state.siteId)?.name || 'Site'} · ${rows.length} records${state.checked.size?` · ${state.checked.size} selected`:''}`;
        const center=root.querySelector('[data-center]');
        if(state.view==='knowledge') { renderKnowledge();return; }
        let before='';
        if(state.view==='map') {
            const areas=model.areas.filter(area=>area.siteId===state.siteId);
            before=`<p class="studio-hint">Plan positions organise the site image. They do not establish physical placement.</p><div class="studio-plan" data-plan>${model.project.siteMap?.image?`<img src="${html(model.project.siteMap.image)}" alt="Project site plan">`:''}${areas.map((area,index)=>{ const point=model.project.siteMap?.areaPoints?.[`${area.siteId}/${area.id}`] || (area.siteId==='main_food_forest'?model.project.siteMap?.areaPoints?.[area.id]:null) || {x:20+(index%3)*30,y:25+Math.floor(index/3)*25};return `<button type="button" data-map-area="${html(area.id)}" style="left:${Math.max(4,Math.min(85,Number(point.x)||20))}%;top:${Math.max(5,Math.min(85,Number(point.y)||25))}%">${html(area.name)}</button>`;}).join('')}</div><div class="studio-map-tools"><label>Plan image<input type="file" accept="image/jpeg,image/png,image/webp" data-map-photo></label><button type="button" data-action="plan-point">Set selected Area point</button><span data-plan-message>Select a record or Area first.</span></div>`;
        }
        if(state.view==='field') before=`<div class="studio-field-tools"><button type="button" data-action="sync">Sync field results</button><a href="${html(workspaceUrl(projectId,{mode:'field',siteId:state.siteId,recordKey:state.selected}).href)}">Open Android Field</a><p data-queue-status>Reading local field queue…</p></div>`;
        center.innerHTML=before+table(rows.slice(state.page*25,state.page*25+25),state.view==='field')+`<footer class="studio-register-footer"><span>${rows.length} records · page ${state.page+1} of ${Math.max(1,Math.ceil(rows.length/25))}</span><button type="button" data-page="-1"${state.page===0?' disabled':''}>Previous</button><button type="button" data-page="1"${(state.page+1)*25>=rows.length?' disabled':''}>Next</button></footer>`;
        if(state.view==='field') loadFieldOperations(projectId).then(ops=>{if(root.isConnected&&state.view==='field')root.querySelector('[data-queue-status]').textContent=`${ops.filter(op=>op.status==='pending').length} pending · ${ops.filter(op=>op.status==='conflict').length} need review`;}).catch(error=>message(error.message,true));
    }
    function renderRecordInspector() {
        if(!activeEntry) {root.querySelector('[data-inspector]').innerHTML='<h2>Select a record</h2><p>Edit information here while the register stays visible.</p>';return;}
        const marker=activeEntry.marker, isPlant=marker.type==='plant';
        const tagAllowed=isPlant||marker.type==='area_checkpoint'||marker.semantic_type==='area_checkpoint';
        const tag=marker.physicalAnchor;
        root.querySelector('[data-inspector]').innerHTML=`<p class="studio-eyebrow">${html(typeLabel(marker))}</p><h2>${html(marker.name)}</h2><p class="studio-record-id">${html(marker.plant_code || marker.id)}</p><form data-record-form>
         <label>${isPlant?'Common name':'Name'}<input name="name" value="${html(marker.name)}" required></label>${isPlant?`<label>Scientific name<input name="scientific_name" value="${html(profile.scientific_name || '')}"></label>`:''}
         <label>Area<select name="area">${model.areas.filter(area=>area.siteId===activeEntry.siteId).map(area=>`<option value="${html(area.id)}"${area.id===activeEntry.place.id?' selected':''}>${html(area.name)}</option>`).join('')}</select></label>
         <label>${isPlant?'Overview':'Description'}<textarea name="overview" rows="3">${html(isPlant?profile.overview || marker.description:marker.description || '')}</textarea></label>
         <label>Local notes<textarea name="notes" rows="3">${html(isPlant?profile.notes || '':marker.notes || '')}</textarea></label>
         ${tagAllowed?`<div class="studio-tag-fields"><label>Printed ArUco tag<select name="tag"><option value="">Unassigned</option>${PHYSICAL_ANCHOR_IDS.map(id=>{const owner=model.entries.find(entry=>entry.key!==activeEntry.key&&entry.marker.physicalAnchor?.enabled&&Number(entry.marker.physicalAnchor.markerId)===id);return `<option value="${id}"${tag?.enabled&&Number(tag.markerId)===id?' selected':''}${owner?' disabled':''}>${physicalMarkerLabel(id)}${owner?' · '+html(owner.marker.name):''}</option>`;}).join('')}</select></label><label>Black square size (mm)<input name="tagSize" type="number" min="10" max="2000" value="${tag?.markerSizeMm || 140}"></label><p>${html(fieldCheckState(marker))} · ${anchor?'Position saved; field placement unverified':'No spatial position saved'}</p></div>`:''}
         <details><summary>Sources, media & publication</summary>${isPlant?`<label>References<textarea name="references" rows="2">${html(profile.references || '')}</textarea></label><label>Photo<input type="file" accept="image/jpeg,image/png,image/webp" data-photo></label><input name="photo" type="hidden" value="${html(profile.photo || '')}">${profile.photo?`<img class="studio-photo" src="${html(profile.photo)}" alt="${html(marker.name)}">`:''}`:''}<label>Visitor visibility<select name="visibility"><option value="draft"${marker.visibility!=='public'&&marker.visibility!=='hidden'?' selected':''}>Draft</option><option value="public"${marker.visibility==='public'?' selected':''}>Public</option><option value="hidden"${marker.visibility==='hidden'?' selected':''}>Hidden</option></select></label><p>Project, Site and Area visibility also control visitor access.</p></details>
         <div class="studio-save-actions"><button class="studio-primary" type="submit"${model.offline?' disabled':''}>Save record</button><button type="button" data-action="discard">Discard changes</button></div><p role="status" data-save-status>${model.offline?'Prepared copy · reconnect to edit':'Saved record'}</p><button class="studio-quiet" type="button" data-action="archive">${marker.status==='archived'?'Restore record':'Archive record'}</button></form>`;
    }
    function renderKnowledge() {
        const center=root.querySelector('[data-center]');
        if(!activeEntry||activeEntry.marker.type!=='plant'||!pimDocument) {center.innerHTML='<p>Select a Plant in Records to edit its knowledge.</p>';renderRecordInspector();return;}
        const categories=pimDocument.nodes.filter(node=>!node.parentId);
        if(!categories.some(node=>node.id===state.categoryId))state.categoryId=categories[0]?.id || '';
        const topics=pimDocument.nodes.filter(node=>node.parentId && node.primaryCategory===state.categoryId && node.status!=='archived');
        if(!state.newTopic&&!topics.some(node=>node.id===state.topicId))state.topicId=topics[0]?.id || state.categoryId;
        const node=state.newTopic?null:pimDocument.nodes.find(node=>node.id===state.topicId);
        center.innerHTML=`<p class="studio-hint">${html(activeEntry.marker.name)} · canonical plant knowledge</p><nav class="studio-categories" aria-label="Knowledge categories">${categories.map(category=>`<button type="button" data-category="${html(category.id)}"${category.id===state.categoryId?' aria-current="page"':''}>${html(category.title)}</button>`).join('')}</nav><div class="studio-topic-select"><label>Topic<select data-topic>${!topics.length?`<option value="${html(state.categoryId)}">Category introduction</option>`:''}${topics.map(topic=>`<option value="${html(topic.id)}"${topic.id===state.topicId?' selected':''}>${html(topic.title)}</option>`).join('')}</select></label><button type="button" data-action="add-topic">+ Add topic</button></div><form data-topic-form><label>Topic title<input name="title" value="${html(node?.title || '')}" required></label><label>Information<textarea name="body" rows="9">${html(node?.body || node?.preview || '')}</textarea></label><div class="studio-field-pair"><label>Knowledge scope<select name="knowledgeScope"><option value="species"${pimKnowledgeScope(node || {})==='species'?' selected':''}>Species knowledge</option><option value="specimen"${pimKnowledgeScope(node || {})==='specimen'?' selected':''}>This plant in this place</option><option value="unspecified"${pimKnowledgeScope(node || {})==='unspecified'?' selected':''}>Needs scope review</option></select></label><label>Publication<select name="status"><option value="draft"${node?.status!=='published'?' selected':''}>Draft</option><option value="published"${node?.status==='published'?' selected':''}>Published</option></select></label></div><details><summary>Sources, evidence & advanced</summary><label>Source URL<input name="sourceUrl" type="url" value="${html(node?.provenance?.[0]?.sourceUrl || '')}"></label><label>Attribution<input name="attribution" value="${html(node?.attribution || '')}"></label><label>Evidence<select name="evidenceStatus">${['draft','sourced','verified','local_observation','community_contributed','needs_review'].map(value=>`<option${(node?.evidenceStatus || 'draft')===value?' selected':''}>${value}</option>`).join('')}</select></label><p>Existing source references and topic IDs are preserved.</p></details><div class="studio-save-actions"><button type="submit" class="studio-primary"${model.offline?' disabled':''}>Save topic</button><button type="button" data-action="discard">Discard changes</button></div></form>`;
        renderKnowledgePreview();
    }
    function renderKnowledgePreview() {
        const form=root.querySelector('[data-topic-form]');if(!form)return;
        const value=name=>form.elements.namedItem(name).value;
        root.querySelector('[data-inspector]').innerHTML=`<p class="studio-eyebrow">Reading preview</p><h2>${html(activeEntry.marker.name)}</h2><p>${html(profile.scientific_name || '')}</p><article class="studio-reading-preview"><small>${value('knowledgeScope')==='specimen'?'Local specimen knowledge':value('knowledgeScope')==='species'?'Species knowledge':'Scope needs review'}</small><h3>${html(value('title') || 'Untitled topic')}</h3><p>${html(value('body'))}</p></article><p>${value('status')==='published'?'Published topic · project visibility still applies':'Draft · not public'}</p><p class="studio-hint">Same topic in the desktop guide, Android reader and XR PIMO.</p>`;
    }
    async function selectEntry(key) {
        const entry=model.entries.find(entry=>entry.key===key);
        const request=++state.generation;state.selected=entry?.key || '';activeEntry=entry || null;state.dirty=false;state.newTopic=false;state.topicId='';profile={};anchor=null;pimDocument=null;
        if(!entry){renderCenter();renderRecordInspector();route();return;}
        root.querySelector('[data-inspector]').innerHTML='<p role="status">Loading selected record…</p>';renderCenter();route();
        try { const loaded=await Promise.all([entryProfile(model,entry),entryAnchor(model,entry)]);if(request!==state.generation||!root.isConnected)return;[profile,anchor]=loaded;pimDocument=entry.marker.type==='plant'?resolvePlantPim(profile,{id:entry.marker.plantId||entry.marker.id,commonName:profile.common_name||entry.marker.name,scientificName:profile.scientific_name||''}):null;renderCenter();if(state.view!=='knowledge')renderRecordInspector(); }
        catch(error){if(request===state.generation)root.querySelector('[data-inspector]').innerHTML=`<p role="alert">${html(error.message)}</p><button type="button" data-action="reload-record">Reload record</button>`;}
    }
    async function saveRecord(form) {
        if(!form.reportValidity()||state.busy)return;
        state.busy=true;const submit=form.querySelector('[type=submit]');submit.disabled=true;
        try {
            const value=name=>form.elements.namedItem(name)?.value || '';
            let physicalAnchor=activeEntry.marker.physicalAnchor;
            if(form.elements.namedItem('tag'))physicalAnchor=value('tag')?normalizePhysicalAnchor({...PHYSICAL_ANCHOR_DEFAULTS,...physicalAnchor,enabled:true,markerId:Number(value('tag')),markerSizeMm:Number(value('tagSize'))}):null;
            const isPlant=activeEntry.marker.type==='plant';
            await saveWorkspaceRecord(model,activeEntry,{markerChanges:{name:value('name'),description:value('overview'),notes:isPlant?activeEntry.marker.notes||'':value('notes'),physicalAnchor,visibility:value('visibility')},profileChanges:isPlant?{common_name:value('name'),scientific_name:value('scientific_name'),overview:value('overview'),notes:value('notes'),references:value('references'),photo:value('photo')}: {},targetAreaId:value('area')});
            profile=model.profiles[activeEntry.key]||{};state.selected=activeEntry.key;state.dirty=false;renderAreas();renderCenter();renderRecordInspector();route();message('Record saved.');
        } catch(error){message(`${error.message} Your edits remain open.`,true);}finally{state.busy=false;if(submit.isConnected)submit.disabled=model.offline;}
    }
    async function saveTopic(form) {
        if(!form.reportValidity()||state.busy)return;
        state.busy=true;
        const submit=form.querySelector('[type=submit]');submit.disabled=true;
        try {
            const values=Object.fromEntries(new FormData(form));
            const existing=pimDocument.nodes.find(node=>node.id===state.topicId);
            const provenance=[...(existing?.provenance || [])];
            if(values.sourceUrl && !provenance.some(source=>source.sourceUrl===values.sourceUrl))provenance.push({sourceUrl:values.sourceUrl});
            const patch={title:values.title.trim(),body:values.body,preview:values.body.slice(0,240),knowledgeScope:values.knowledgeScope,status:values.status,evidenceStatus:values.evidenceStatus,attribution:values.attribution,provenance,
                ...(values.knowledgeScope==='specimen'?{specimenId:`${projectId}/${activeEntry.siteId}/${activeEntry.place.id}/${activeEntry.marker.id}`,informationType:'local_observation'}:existing?.informationType==='local_observation'?{informationType:'fact'}:{})};
            const id=state.newTopic?`topic-${crypto.randomUUID()}`:state.topicId;
            const next=state.newTopic?pimAddNode(pimDocument,{...patch,id,parentId:state.categoryId}):pimUpdateNode(pimDocument,id,patch);
            await saveWorkspaceRecord(model,activeEntry,{profileChanges:{pim_document:next,profile_enabled:true,spm_enabled:true}});
            pimDocument=next;profile=model.profiles[activeEntry.key];state.topicId=id;state.newTopic=false;state.dirty=false;renderCenter();message('Knowledge saved.');
        }catch(error){message(`${error.message} Your topic edits remain open.`,true);}finally{state.busy=false;if(submit.isConnected)submit.disabled=model.offline;}
    }
    function dialogMarkup(title, body) {
        const dialog=root.querySelector('[data-dialog]');dialog.innerHTML=`<h2>${html(title)}</h2>${body}<button type="button" data-action="close-dialog">Close</button>`;dialog.showModal();return dialog;
    }
    root.addEventListener('submit',event=>{if(event.target.matches('[data-record-form]')){event.preventDefault();void saveRecord(event.target);}if(event.target.matches('[data-topic-form]')){event.preventDefault();void saveTopic(event.target);}}, {signal:abort.signal});
    root.addEventListener('input',event=>{
        if(event.target.matches('[data-search]')){state.query=event.target.value;state.page=0;renderCenter();return;}
        if(event.target.closest('[data-record-form],[data-topic-form]')){state.dirty=true;if(state.view==='knowledge')renderKnowledgePreview();else root.querySelector('[data-save-status]').textContent='Unsaved changes';}
    },{signal:abort.signal});
    root.addEventListener('change',async event=>{
        const target=event.target;
        if(target.matches('[data-site]')){if(!allowChange()){target.value=state.siteId;return;}state.siteId=target.value;state.areaId='';state.page=0;renderAreas();await selectEntry(filtered()[0]?.key);renderCenter();route();}
        if(target.matches('[data-type]')){state.type=target.value;state.page=0;renderCenter();}
        if(target.matches('[data-topic]')){if(!allowChange()){target.value=state.topicId;return;}state.topicId=target.value;state.newTopic=false;renderKnowledge();}
        if(target.matches('[data-check]')){target.checked?state.checked.add(target.dataset.check):state.checked.delete(target.dataset.check);renderCenter();}
        if(target.matches('[data-select-all]')){filtered().slice(state.page*25,state.page*25+25).forEach(entry=>target.checked?state.checked.add(entry.key):state.checked.delete(entry.key));renderCenter();}
        if(target.matches('[data-photo]')){try{state.busy=true;message('Preparing photo…');const photo=await fieldPhoto(target.files[0]);if(!root.isConnected)return;root.querySelector('[name=photo]').value=photo;state.dirty=true;message('Photo prepared. Save the record to confirm.');}catch(error){message(error.message,true);}finally{state.busy=false;}}
        if(target.matches('[data-map-photo]')){try{if(!allowChange())return;const image=await fieldPhoto(target.files[0]);const {loadProject,renameProjectOnDisk}=await import('../services/persistence.js');const fresh=await loadProject(projectId);model.project=await renameProjectOnDisk(projectId,{...fresh,preserveId:true,siteMap:{...fresh.siteMap,image},_expectedModified:fresh.modified||''});renderCenter();message('Site plan image saved.');}catch(error){message(error.message,true);}}
    },{signal:abort.signal});
    root.addEventListener('click',async event=>{
        const link=event.target.closest('a');if(link && !allowChange()){event.preventDefault();return;}
        const button=event.target.closest('button');if(!button)return;
        if(button.dataset.record){if(allowChange())await selectEntry(button.dataset.record);return;}
        if(button.dataset.view){if(!allowChange())return;state.view=button.dataset.view;state.page=0;renderCenter();if(state.view!=='knowledge')renderRecordInspector();route();return;}
        if(Object.hasOwn(button.dataset,'area')||button.dataset.mapArea){if(!allowChange())return;state.areaId=button.dataset.area ?? button.dataset.mapArea;state.page=0;renderAreas();renderCenter();return;}
        if(button.dataset.category){if(!allowChange())return;state.categoryId=button.dataset.category;state.topicId='';state.newTopic=false;renderKnowledge();return;}
        if(button.dataset.page){state.page+=Number(button.dataset.page);renderCenter();return;}
        const action=button.dataset.action;if(!action)return;
        try {
            if(action==='discard'){state.dirty=false;state.newTopic=false;state.view==='knowledge'?renderKnowledge():renderRecordInspector();message('Unsaved changes discarded.');return;}
            if(action==='close-dialog'){root.querySelector('dialog').close();return;}
            if(!allowChange())return;
            if(action==='reload-record'){delete model.profiles[activeEntry.key];await selectEntry(activeEntry.key);return;}
            if(action==='add-topic'){if(!activeEntry||!document)return;state.newTopic=true;state.dirty=true;renderKnowledge();return;}
            if(action==='archive'){await saveWorkspaceRecord(model,activeEntry,{markerChanges:{status:activeEntry.marker.status==='archived'?'draft':'archived',visibility:'hidden'}});renderAreas();renderCenter();renderRecordInspector();message('Record saved.');return;}
            if(action==='print')return openLegacyCreatorTool('renderPrintCenter',encodeURIComponent(projectId));
            if(action==='visitor')return openLegacyCreatorTool('openCreatorVisitorPreview',encodeURIComponent(projectId));
            if(action==='settings')return openLegacyCreatorTool('renderProjectSettings',encodeURIComponent(projectId));
            if(action==='import')return openLegacyCreatorTool('renderProjectSettings',encodeURIComponent(projectId));
            if(action==='prepare'){
                state.busy=true;const tasks=model.entries.filter(entry=>state.checked.size?state.checked.has(entry.key):entry.key===state.selected);
                if(!tasks.length)throw new Error('Select at least one record to prepare field work.');
                for(const entry of tasks)await saveWorkspaceRecord(model,entry,{markerChanges:{field_work:{...entry.marker.field_work,requested:true,requestedAt:new Date().toISOString()}}});
                const pack=await prepareCreatorFieldPackage(model,(done,total)=>message(`Preparing local field records ${done}/${total}…`));
                message(`Field tasks saved. Text, profiles and saved positions are prepared locally (${new Date(pack.preparedAt).toLocaleString()}). Online camera detector and uncached media still require a connection.`);renderCenter();return;
            }
            if(action==='sync'){state.busy=true;const result=await syncCreatorFieldResults(projectId);message(`${result.synced} field results synced · ${result.conflicts} need review · ${result.pending} pending. Reload the workspace to see updated records.`);return;}
            if(action==='new-area'){
                const dialog=dialogMarkup('Add Area','<label>Name<input data-new-area required></label><button type="button" class="studio-primary" data-action="create-area">Create Area</button>');dialog.querySelector('input').focus();return;
            }
            if(action==='create-area'){const name=root.querySelector('[data-new-area]').value.trim();if(!name)throw new Error('Add an Area name.');await createWorkspaceArea(model,state.siteId,name);root.querySelector('dialog').close();renderAreas();renderCenter();message('Area created as a draft.');return;}
            if(action==='add'){
                dialogMarkup('Add record',`<label>Name<input data-new-name required></label><label>Type<select data-new-type><option value="plant">Plant</option><option value="note">Note</option><option value="area_checkpoint">Totem</option></select></label><label>Area<select data-new-area-id>${model.areas.filter(area=>area.siteId===state.siteId).map(area=>`<option value="${html(area.id)}">${html(area.name)}</option>`).join('')}</select></label><button type="button" class="studio-primary" data-action="create-record">Create draft</button>`);return;
            }
            if(action==='create-record'){const name=root.querySelector('[data-new-name]').value.trim();if(!name)throw new Error('Add a record name.');const entry=await createWorkspaceRecord(model,{name,type:root.querySelector('[data-new-type]').value,siteId:state.siteId,areaId:root.querySelector('[data-new-area-id]').value});root.querySelector('dialog').close();state.view='records';state.areaId='';state.type='all';state.query='';root.querySelector('[data-search]').value='';await selectEntry(entry.key);renderAreas();message('Draft record created.');return;}
            if(action==='plan-point'){
                if(!activeEntry)throw new Error('Select a record to choose its Area.');message(`Click the plan to position ${activeEntry.place.name}.`);
                root.querySelector('[data-plan]').addEventListener('click',async click=>{if(click.target.closest('button'))return;const bounds=click.currentTarget.getBoundingClientRect();try{await savePlanPoint(model,activeEntry,{x:100*(click.clientX-bounds.left)/bounds.width,y:100*(click.clientY-bounds.top)/bounds.height});renderCenter();message('Planning point saved. Physical placement still needs field work.');}catch(error){message(error.message,true);}},{once:true,signal:abort.signal});return;
            }
            if(action==='export'){
                const rows=filtered();state.busy=true;message('Preparing record export…');
                const values=[['id','name','scientific_name','type','site','area','tag','field_check','visibility']];
                for(const entry of rows){const data=await entryProfile(model,entry);values.push([entry.marker.id,entry.marker.name,data.scientific_name||'',typeLabel(entry.marker),entry.siteName,entry.place.name,entry.marker.physicalAnchor?.markerLabel||'',fieldCheckState(entry.marker),entry.marker.visibility||'draft']);}
                const csv=values.map(row=>row.map(value=>'"'+String(value).replaceAll('"','""')+'"').join(',')).join('\r\n');
                const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='nourishland-records.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('Record export prepared.');
            }
        }catch(error){message(error.message,true);}finally{state.busy=false;}
    },{signal:abort.signal});
    const beforeUnload=event=>{if(state.dirty){event.preventDefault();event.returnValue='';}};
    window.addEventListener('beforeunload',beforeUnload,{signal:abort.signal});
    renderAreas();renderCenter();
    const initial=model.entries.find(entry=>entry.key===state.selected || (!options.recordKey&&entry.marker.id===options.recordId)) || filtered()[0];
    if(initial) {state.siteId=initial.siteId;root.querySelector('[data-site]').value=state.siteId;renderAreas();await selectEntry(initial.key);}else renderRecordInspector();
    return {root,signal:abort.signal,destroy(){state.generation++;abort.abort();}};
}
