import {createTour,createTourStop,TOUR_TEMPLATES,entryTourRef,tourRefKey,recordsForTour,checkTour} from './tourModel.js';
import {tourRequest} from './tourApi.js';
import {mountTourPlayer} from './tourPlayer.js';
import {escapeWorkspaceHtml as html} from './creatorWorkspaceFrame.js';
import {dashboardIcon} from './workspaceIcons.js';

export async function mountCreatorTourStudio(root,{model,siteId,onDirty=()=>{},spatial=false,request=tourRequest}){
    let entries=[],draft=null,saved=null,dirty=false,busy=false,disposed=false,player=null,role='',issues=null;
    const abort=new AbortController(),records=()=>recordsForTour(model).filter(record=>record.ref.siteId===siteId&&!record.archived);
    const message=(text,error=false)=>{if(disposed)return;const status=root.querySelector('[data-tour-status]');if(status){status.textContent=text;status.setAttribute('role',error?'alert':'status');}};
    const changed=value=>{dirty=value;onDirty(value);};
    const options=(selected='',empty='Choose a site feature…')=>`<option value="">${empty}</option>`+records().map(record=>`<option value="${html(JSON.stringify(record.ref))}"${selected===tourRefKey(record.ref)?' selected':''}>${html(record.title)} · ${html(record.areaName)}</option>`).join('');
    function render(){
        if(disposed)return;
        root.innerHTML=`<section class="tour-studio"><p class="studio-eyebrow">1. Mark your place · 2. Build a tour · 3. Preview</p><p>Reuse your existing site features. A tour changes the journey, not the plants.</p>
        <div class="tour-library"><label>Tour<select data-tour-select${busy?' disabled':''}><option value="">Choose a saved tour…</option>${entries.filter(entry=>entry.draft.siteId===siteId).map(entry=>`<option value="${html(entry.draft.id)}"${draft?.id===entry.draft.id?' selected':''}>${html(entry.draft.title)}${entry.published?' · published':' · draft'}</option>`).join('')}</select></label><button type="button" class="studio-primary" data-tour-new${busy||model.offline?' disabled':''}>${dashboardIcon('plus')}Create tour</button></div>
        <p data-tour-status role="status">${model.offline?'Reconnect to load and save tours.':''}</p>
        ${draft?`<fieldset class="tour-editor"${busy?' disabled':''}><legend>${html(draft.title)} · ${saved?.published?'Published version retained separately':'Draft'}</legend>
        <div class="tour-title-fields"><label>Tour name<input data-tour-field="title" maxlength="160" value="${html(draft.title)}" required></label><label>Introduction<textarea data-tour-field="description" maxlength="2000" rows="2">${html(draft.description)}</textarea></label></div>
        <ol class="tour-stop-list">${draft.stops.map((stop,i)=>`<li data-tour-stop="${html(stop.id)}"><header><h3>${i+1}. ${html(TOUR_TEMPLATES[stop.template].label)}</h3><div><button type="button" class="tour-icon" data-tour-move="${i}" data-direction="-1" aria-label="Move stop ${i+1} up" title="Move up"${i===0?' disabled':''}>↑</button><button type="button" class="tour-icon" data-tour-move="${i}" data-direction="1" aria-label="Move stop ${i+1} down" title="Move down"${i===draft.stops.length-1?' disabled':''}>↓</button><button type="button" class="tour-icon" data-tour-remove="${i}" aria-label="Remove stop ${i+1}" title="Remove stop">${dashboardIcon('close')}</button></div></header>
        <label>Site feature<select data-tour-target="0">${options(stop.targets[0]&&tourRefKey(stop.targets[0]))}${stop.targets[0]&&!records().some(record=>tourRefKey(record.ref)===tourRefKey(stop.targets[0]))?`<option value="${html(JSON.stringify(stop.targets[0]))}" selected>Missing or moved feature — choose another</option>`:''}</select></label>
        ${stop.template==='compare'?`<label>Compare with<select data-tour-target="1">${options(stop.targets[1]&&tourRefKey(stop.targets[1]))}</select></label>`:''}
        <label>Stop title <small>Optional; otherwise use the current feature name</small><input data-stop-field="title" maxlength="160" value="${html(stop.title)}"></label>
        <label>${i?'How to reach this stop':'Where to start'}<textarea data-stop-field="directions" maxlength="1000" rows="2" placeholder="For example: Follow the main path to the orchard entrance.">${html(stop.directions)}</textarea></label>
        <label>${stop.template==='listen'?'Explanation / transcript':'Visitor instruction'}<textarea data-stop-field="instructions" maxlength="3000" rows="3">${html(stop.instructions)}</textarea></label>
        ${stop.template==='investigate'?`<label>Investigation question<input data-stop-field="question" maxlength="1000" value="${html(stop.question)}"></label>`:''}
        ${stop.template==='listen'?`<label>Audio link <small>Optional; written transcript remains available</small><input type="url" data-stop-field="audioUrl" maxlength="2000" value="${html(stop.audioUrl)}"></label>`:''}
        <details><summary>Teaching options</summary><label>Facilitator notes <small>Only shown in Creator preview</small><textarea data-stop-field="facilitatorNotes" maxlength="3000" rows="2">${html(stop.facilitatorNotes)}</textarea></label><label class="tour-checkbox"><input type="checkbox" data-stop-field="optional"${stop.optional?' checked':''}>Optional stop</label></details></li>`).join('')||'<li class="tour-empty">Choose a feature below to add your first stop.</li>'}</ol>
        <div class="tour-add-stop"><label>Site feature<select data-tour-add-target>${options()}</select></label><label>Activity<select data-tour-template>${Object.entries(TOUR_TEMPLATES).map(([id,item])=>`<option value="${id}">${item.label}</option>`).join('')}</select></label><button type="button" data-tour-add${draft.stops.length>=40?' disabled':''}>${dashboardIcon('plus')}Add stop</button></div>
        <div class="tour-editor-actions"><button type="button" class="studio-primary" data-tour-save${model.offline?' disabled':''}>${dashboardIcon('save')}Save draft</button><button type="button" data-tour-check>Check tour</button><button type="button" data-tour-preview${!draft.stops.length?' disabled':''}>${dashboardIcon('explore')}Visitor preview</button><button type="button" data-tour-discard>Discard edits</button></div>
        ${issues?`<section class="tour-check" role="status"><h3>${issues.length?'Fix before publishing':'Content checks passed'}</h3>${issues.length?`<ul>${issues.map(issue=>`<li>${html(issue.message)}</li>`).join('')}</ul>`:'<p>References and instructions are complete. Walk the route on site before sharing it.</p>'}</section>`:''}
        ${saved&&role==='admin'?`<details class="tour-publication"><summary>Publication</summary><p>Publishing shares this tour only when its Site, Areas and all referenced features are public. Draft edits do not replace the published version until you publish again.</p><button type="button" data-tour-publish${model.offline?' disabled':''}>Publish saved tour</button>${saved.published?'<button type="button" data-tour-unpublish>Unpublish tour</button>':''}</details>`:''}
        </fieldset>`:'<div class="tour-empty"><h2>Create a short walk.</h2><p>Choose a few features and give visitors one clear task at each stop.</p></div>'}</section>`;
    }
    async function load(){render();message('Loading tours…');try{const value=await request(model.project.id);if(disposed)return;entries=value.entries;role=value.role;render();message('');}catch(error){message(error.message,true);}}
    function select(entry){saved=entry;draft=structuredClone(entry.draft);issues=null;changed(false);render();}
    root.addEventListener('input',event=>{
        if(busy)return;const element=event.target;if(!draft)return;
        if(element.dataset.tourField)draft[element.dataset.tourField]=element.value;
        else if(element.dataset.stopField){const stop=draft.stops.find(stop=>stop.id===element.closest('[data-tour-stop]')?.dataset.tourStop);if(!stop)return;stop[element.dataset.stopField]=element.type==='checkbox'?element.checked:element.value;}
        else return;issues=null;changed(true);message('Unsaved tour changes.');
    },{signal:abort.signal});
    root.addEventListener('change',event=>{
        if(busy)return;const element=event.target;
        if(element.matches('[data-tour-select]')){if(dirty){element.value=draft.id;message('Save or discard tour edits before switching.',true);return;}const entry=entries.find(item=>item.draft.id===element.value);if(entry)select(entry);}
        if(element.matches('[data-tour-target]')){
            const stop=draft.stops.find(stop=>stop.id===element.closest('[data-tour-stop]').dataset.tourStop),i=Number(element.dataset.tourTarget);
            // Rebuild only from selected references; no record contents are copied.
            const refs=Array.from(element.closest('[data-tour-stop]').querySelectorAll('[data-tour-target]')).map(select=>select.value?JSON.parse(select.value):null);
            stop.targets=refs.filter(Boolean);changed(true);issues=null;message('Unsaved tour changes.');
        }
    },{signal:abort.signal});
    root.addEventListener('click',async event=>{
        const button=event.target.closest('button');if(!button||busy)return;
        try{
            if(button.hasAttribute('data-tour-new')){if(dirty)throw Error('Save or discard edits before creating another tour.');draft=createTour(model.project.id,siteId);saved=null;issues=null;changed(true);render();root.querySelector('[data-tour-field="title"]').focus();return;}
            if(button.hasAttribute('data-tour-add')){const value=root.querySelector('[data-tour-add-target]').value;if(!value)throw Error('Choose a site feature.');draft.stops.push(createTourStop(JSON.parse(value),root.querySelector('[data-tour-template]').value));issues=null;changed(true);render();return;}
            if(button.hasAttribute('data-tour-remove')){draft.stops.splice(Number(button.dataset.tourRemove),1);issues=null;changed(true);render();return;}
            if(button.hasAttribute('data-tour-move')){const i=Number(button.dataset.tourMove),to=i+Number(button.dataset.direction);if(to<0||to>=draft.stops.length)return;[draft.stops[i],draft.stops[to]]=[draft.stops[to],draft.stops[i]];issues=null;changed(true);render();return;}
            if(button.hasAttribute('data-tour-discard')){if(saved)select(saved);else {draft=null;changed(false);render();}return;}
            if(button.hasAttribute('data-tour-check')){issues=checkTour(draft,records());render();return;}
            if(button.hasAttribute('data-tour-preview')){
                if(spatial){
                    const editor=root.firstElementChild,scrollHost=root.closest('[data-spatial-scroll]'),scrollBefore=scrollHost?.scrollTop || 0,preview=document.createElement('section');preview.className='xr-tour-preview';editor.hidden=true;root.append(preview);if(scrollHost)scrollHost.scrollTop=0;
                    const close=()=>{player?.destroy();player=null;preview.remove();editor.hidden=false;if(scrollHost)scrollHost.scrollTop=scrollBefore;};
                    player=mountTourPlayer(preview,{tour:draft,records:records(),preview:true,onClose:close});return;
                }
                const dialog=document.createElement('dialog');dialog.className='tour-preview-dialog';dialog.innerHTML='<div data-tour-player></div>';root.append(dialog);
                const close=()=>{player?.destroy();player=null;dialog.close();dialog.remove();};
                dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
                player=mountTourPlayer(dialog.firstElementChild,{tour:draft,records:records(),preview:true,onClose:close});dialog.showModal();return;
            }
            const action=button.hasAttribute('data-tour-publish')?'publish':button.hasAttribute('data-tour-unpublish')?'unpublish':'';
            if(button.hasAttribute('data-tour-save')||action){
                if(action&&dirty)throw Error('Save or discard edits before changing publication.');
                const snapshot=structuredClone(draft);if(action==='publish'){issues=checkTour(snapshot,records());if(issues.length){render();return;}}
                busy=true;render();message(action?'Updating publication…':'Saving draft…');
                const entry=await request(model.project.id,{id:draft.id,action,body:{expectedVersion:saved?.version||0,...(!action?{tour:snapshot}:{})}});
                if(disposed)return;entries=[...entries.filter(item=>item.draft.id!==entry.draft.id),entry];saved=entry;draft=structuredClone(entry.draft);changed(false);busy=false;render();message(action==='publish'?'Tour published.':action==='unpublish'?'Tour unpublished.':'Draft saved.');
            }
        }catch(error){busy=false;render();message(error.message+' Your draft is still open.',true);}finally{busy=false;}
    },{signal:abort.signal});
    await load();return {canLeave:()=>!dirty&&!busy,destroy(){disposed=true;player?.destroy();abort.abort();}};
}
