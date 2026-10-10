import { loadCreatorWorkspace } from '../services/creatorWorkspaceData.js';
import { workspaceHeader, escapeWorkspaceHtml as html } from '../services/creatorWorkspaceFrame.js';
import { workspaceUrl, fieldCheckState } from '../services/creatorWorkspaceMode.js';

export async function renderWorkspace(app, projectId, options = {}) {
    const model=await loadCreatorWorkspace(projectId),abort=new AbortController();
    const state={siteId:options.siteId || model.sites[0]?.id || '',areaId:'',selected:options.recordKey || '',prepared:false,busy:false,supported:false};
    const initial=model.entries.find(entry=>entry.key===state.selected);
    if(initial){state.siteId=initial.siteId;state.areaId=initial.place.id;}
    const areas=()=>model.areas.filter(area=>area.siteId===state.siteId);
    state.areaId ||= areas()[0]?.id || '';
    app.innerHTML=`<section class="screen creator-spatial" aria-label="XR Spatial">${workspaceHeader(model,'spatial',{siteId:state.siteId,recordKey:state.selected})}<main class="spatial-entry"><section class="spatial-entry-hero"><p class="studio-eyebrow">XR SPATIAL</p><h1>Place knowledge in real space</h1><p>Select an Area, prepare XR, then enter to place or inspect its elements. Record editing stays in Desktop Studio; scanning and observations stay in Android Field.</p><p role="status" data-status>Checking this device’s WebXR support…</p><div class="spatial-entry-actions"><button type="button" data-prepare>Prepare XR</button><button class="studio-primary" type="button" data-enter disabled>Enter XR</button></div></section><div class="spatial-selectors"><label>Site<select data-site>${model.sites.map(site=>`<option value="${html(site.id)}"${site.id===state.siteId?' selected':''}>${html(site.name)}</option>`).join('')}</select></label><label>Area<select data-area></select></label></div><h2>Area elements</h2><p class="studio-hint">Select an element to begin placement. With no selection, XR opens the Area for inspection.</p><div class="spatial-record-list" data-records></div><details><summary>Device & performance</summary><p>XR needs a secure address and a browser with immersive WebXR support. Preparing assets before entry reduces loading during the session. The in-session Control Panel provides FPS, frame timing and graphics controls.</p><p>Hand tracking and camera access depend on the device and browser.</p></details></main></section>`;
    const root=app.firstElementChild,status=root.querySelector('[data-status]');
    const message=text=>{if(status.isConnected)status.textContent=text;};
    function render() {
        root.querySelector('[data-area]').innerHTML=areas().map(area=>`<option value="${html(area.id)}"${area.id===state.areaId?' selected':''}>${html(area.name)}</option>`).join('');
        root.querySelector('[data-records]').innerHTML=`<button type="button" data-record=""${!state.selected?' aria-current="page"':''}>Inspect this Area<small>No element selected</small></button>`+model.entries.filter(entry=>entry.siteId===state.siteId&&entry.place.id===state.areaId&&entry.marker.status!=='archived').map(entry=>`<button type="button" data-record="${html(entry.key)}"${entry.key===state.selected?' aria-current="page"':''}>${html(entry.marker.name)}<small>${html(entry.marker.physicalAnchor?.markerLabel || 'No tag')} · ${html(fieldCheckState(entry.marker))}</small></button>`).join('');
        root.querySelector('[data-enter]').disabled=!state.supported||!state.prepared||state.busy||!state.areaId||model.offline;
        root.querySelector('[data-prepare]').disabled=state.busy||!state.supported||model.offline;
        history.replaceState({nourishlandView:'creator-workspace',projectId,workspace:'spatial',siteId:state.siteId,recordKey:state.selected},'',workspaceUrl(projectId,{mode:'spatial',siteId:state.siteId,recordKey:state.selected}));
        root.querySelectorAll('.workspace-mode-picker a').forEach(link=>link.href=workspaceUrl(projectId,{mode:new URL(link.href).searchParams.get('workspace'),siteId:state.siteId,recordKey:state.selected}).href);
    }
    root.addEventListener('change',event=>{
        if(state.busy)return;
        if(event.target.matches('[data-site]')){state.siteId=event.target.value;state.areaId=areas()[0]?.id || '';state.selected='';render();}
        if(event.target.matches('[data-area]')){state.areaId=event.target.value;state.selected='';render();}
    },{signal:abort.signal});
    root.addEventListener('click',async event=>{
        const button=event.target.closest('button');if(!button||state.busy)return;
        if(Object.hasOwn(button.dataset,'record')){state.selected=button.dataset.record;render();return;}
        if(button.matches('[data-prepare]')) {
            state.busy=true;render();message('Preparing XR runtime…');
            try {
                window.__nxrSkipBootstrap=true;
                await import('../main.js');
                const {prepareArAssets}=await import('../services/arAssetPreparation.js');
                const result=await prepareArAssets({experience:'creator',onProgress:progress=>message(`Preparing XR assets ${progress.loaded}/${progress.total}…`)});
                state.prepared=!result.failures.some(item=>item.critical);
                message(state.prepared?`Ready to enter XR.${result.failures.length?' Some optional assets could not load.':''}`:'Preparation incomplete. Try again while connected.');
            }catch(error){message(`XR preparation failed: ${error.message}`);}finally{state.busy=false;if(root.isConnected)render();}
        }
        if(button.matches('[data-enter]')&&state.prepared&&state.supported) {
            // Runtime is already prepared. Keep requestSession in the final
            // click's user activation path, including any safety acknowledgement.
            const entry=model.entries.find(entry=>entry.key===state.selected);
            state.busy=true;render();
            try {
                const started=await window.startArMode(projectId,state.areaId,'',entry?.marker.type || '',entry?.marker.id || '',`creator-spatial:${state.siteId}`,state.siteId);
                if(!started)message('XR could not start. Check browser permissions and try again.');
            }catch(error){message(error.message);}finally{state.busy=false;if(root.isConnected)render();}
        }
    },{signal:abort.signal});
    try {
        if(!window.isSecureContext||!navigator.xr)message('Immersive WebXR is unavailable here. Open this address in your XR device’s supported browser.');
        else {
            state.supported=await navigator.xr.isSessionSupported('immersive-ar') || await navigator.xr.isSessionSupported('immersive-vr');
            message(state.supported?'WebXR is available. Prepare XR before entering.':'This browser does not offer an immersive WebXR session.');
        }
    }catch(error){message(`WebXR availability could not be checked: ${error.message}`);}
    render();
    return {root,signal:abort.signal,destroy(){abort.abort();}};
}
