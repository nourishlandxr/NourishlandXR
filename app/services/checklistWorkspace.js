import { createChecklist, CHECKLIST_MAX_BYTES } from './checklistContract.js';
import { readChecklists, saveChecklist, importChecklist, exportChecklist, checklistProgress, setChecklistStep } from './checklistStore.js';
import { renderProjectChecklistWorkspace } from './projectChecklistWorkspace.js';
const html = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

export function renderChecklistWorkspace(root, { mode, projectId = '', scope = {siteId:'',areaId:''}, status, onDirty = () => {} }) {
    let current = null;
    const library = () => readChecklists().filter(item=>!projectId || item.projectId===projectId);
    function exportFile(experience) {
        const href=URL.createObjectURL(new Blob([exportChecklist(experience)],{type:'application/json'}));
        const link=document.createElement('a');link.href=href;link.download=`nourishland-checklist-${experience.id}.json`;link.click();
        setTimeout(()=>URL.revokeObjectURL(href),1000);
    }
    function listing() {
        current=null;onDirty(false);
        let items; try { items=library(); } catch(error) {root.innerHTML='<h1>Personal checklists</h1><p>Saved checklist data needs attention. Existing data has been preserved.</p>';status(error.message);return;}
        root.innerHTML=`<h1>Personal checklists</h1><p>Observation activities you can follow without XR, location tracking or an account.</p><p>These are personal drafts, not official published project experiences. Completion is your own record.</p>${mode==='desktop'?'<button type="button" data-create-checklist>Create a checklist draft</button>':''}<label class="checklist-import">Import a checklist file<input type="file" accept="application/json,.json" data-import-checklist></label><div class="content-grid">${items.map((item,index)=>`<button type="button" class="content-card" data-checklist="${index}"><span>Personal draft · revision ${item.revision}</span><strong>${html(item.title)}</strong><p>${html(item.description)}</p><small>Project reference: ${html(item.projectId)} · ${item.steps.length} activities</small></button>`).join('')||'<p>No personal checklists saved yet.</p>'}</div>`;
        root.querySelector('[data-create-checklist]')?.addEventListener('click',author);
        const projectButton = document.createElement('button');
        projectButton.type = 'button'; projectButton.textContent = 'Project checklists';
        projectButton.onclick = () => renderProjectChecklistWorkspace(root, { mode, projectId, status, onDirty, onBack: listing });
        root.querySelector('h1').after(projectButton);
        root.querySelectorAll('[data-checklist]').forEach(button=>button.onclick=()=>open(items[Number(button.dataset.checklist)]));
        root.querySelector('[data-import-checklist]').onchange=async event=>{
            const input=event.target,file=input.files?.[0];if(!file)return;
            input.disabled=true;
            try {
                if(file.size>CHECKLIST_MAX_BYTES)throw new Error('Checklist file exceeds 256 KB.');
                const source=await file.text();
                if(!input.isConnected)return;
                const experience=importChecklist(source);
                listing();status(`Imported ${experience.title}. Saved on this device as a personal draft.`);
            } catch(error) {if(input.isConnected){status(`Checklist could not import: ${error.message}`);input.disabled=false;input.value='';}}
        };
    }
    function author() {
        onDirty(false);
        root.innerHTML=`<h1>Create a personal checklist</h1><p>Draft an observation activity for a project. This saves on your device; it does not publish to that project.</p><form data-checklist-form><label>Project reference<input name="projectId" required maxlength="160" pattern="[A-Za-z0-9_-]+" value="${html(projectId)}"></label><label>Checklist title<input name="title" required maxlength="160"></label><label>Description<textarea name="description" rows="3" maxlength="4000"></textarea></label><label>Activities · one per line<textarea name="activities" rows="8" required maxlength="40040"></textarea></label><p>Use 1–40 activities, up to 1,000 characters each. No device capabilities or mapped positions are required.</p><button type="submit">Save personal draft</button></form>`;
        root.querySelector('[data-checklist-form]').oninput=()=>onDirty(true);
        root.querySelector('[data-checklist-form]').onsubmit=event=>{
            event.preventDefault();
            try {
                const data=new FormData(event.target);
                const activities=String(data.get('activities')).split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
                const selectedProject=String(data.get('projectId')).trim();
                const experience=createChecklist({projectId:selectedProject,title:data.get('title'),description:data.get('description'),activities,
                    scope:selectedProject===projectId?scope:{siteId:'',areaId:''}});
                saveChecklist(experience);onDirty(false);open(experience);status('Personal draft saved on this device. Export it to open on another device.');
            } catch(error) {status(`Draft could not save: ${error.message}. Your text remains in the form.`);}
        };
    }
    function open(experience) {
        current=experience;onDirty(false);
        let completed;try{completed=checklistProgress(experience);}catch(error){status(error.message);return;}
        const completeIds=new Set(completed);
        root.innerHTML=`<article class="knowledge-record"><p class="eyebrow">Personal draft · revision ${experience.revision}</p><h1>${html(experience.title)}</h1><p class="knowledge-text">${html(experience.description)}</p><p>Project reference: ${html(experience.projectId)}. This file is not proof of project approval or access.</p><p>Mark what you have observed. Activities can be completed in any order.</p><p data-checklist-progress role="status">${completed.length} of ${experience.steps.length} complete · saved on this device</p><div class="checklist-activities">${experience.steps.map((step,index)=>`<label class="checklist-activity"><input type="checkbox" data-step="${html(step.id)}"${completeIds.has(step.id)?' checked':''}><span><small>Activity ${index+1}</small><strong>${html(step.instructions)}</strong></span></label>`).join('')}</div><button type="button" data-export-checklist>Export checklist file</button><button type="button" data-checklist-list>All personal checklists</button><p>Your completion stays on this device. The exported checklist contains activities, not your personal progress.</p></article>`;
        root.querySelectorAll('[data-step]').forEach(input=>input.onchange=()=>{
            try {
                const ids=setChecklistStep(current,input.dataset.step,input.checked);
                root.querySelector('[data-checklist-progress]').textContent=`${ids.length} of ${current.steps.length} complete · saved on this device`;
                status(ids.length===current.steps.length?'Checklist complete. Your progress is saved on this device.':'Progress saved on this device.');
            } catch(error) {input.checked=!input.checked;status(`Progress could not save: ${error.message}`);}
        });
        root.querySelector('[data-export-checklist]').onclick=()=>{try{exportFile(experience);}catch(error){status(error.message);}};
        root.querySelector('[data-checklist-list]').onclick=listing;
    }
    listing();
}
