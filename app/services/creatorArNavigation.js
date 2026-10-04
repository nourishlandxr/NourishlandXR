import {arPreparationControlsMarkup,bindArPreparationControls} from './arPreparationControls.js';
import {arAssetsReady} from './arAssetPreparation.js';
// Start immediately from the click gesture: an awaited capability probe or data
// fetch before requestSession can consume WebXR's required user activation.
let launchPromise = null,preparationPromise=null;
function preparationRemembered(){try{return globalThis.localStorage?.getItem('nlxr.creator-graphics-prepared.v1')==='true';}catch{return false;}}
function prepareCreatorEntry(root,launch){
 if(preparationPromise)return preparationPromise;
 const dialog=document.createElement('section');dialog.className='nxr-ar-safety-dialog';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Prepare for AR');
 dialog.innerHTML=`<div class="nxr-ar-safety-dialog-card"><h2>Prepare for AR</h2>${arPreparationControlsMarkup()}<p>Camera access begins after you choose Enter AR.</p><label><input type="checkbox" data-remember-preparation checked> Remember this preparation on this device</label><div class="button-row"><button type="button" data-preparation-cancel>Not now</button><button class="primary" type="button" data-preparation-enter>Enter AR</button></div></div>`;
 const previousFocus=document.activeElement;root.append(dialog);const enter=dialog.querySelector('[data-preparation-enter]');bindArPreparationControls(dialog,enter);
 preparationPromise=new Promise(resolve=>{
  const cancel=()=>{observer.disconnect();dialog.remove();preparationPromise=null;previousFocus?.focus?.();resolve(false);};
  const observer=new MutationObserver(()=>{if(!dialog.isConnected)cancel();});observer.observe(root,{childList:true});
  dialog.querySelector('[data-preparation-cancel]').onclick=cancel;
  dialog.addEventListener('keydown',event=>{
   if(event.key==='Escape'){event.preventDefault();cancel();}
   if(event.key==='Tab'){
    const controls=[...dialog.querySelectorAll('button,input,select')].filter(control=>!control.disabled && !control.hidden),first=controls[0],last=controls.at(-1);
    if(event.shiftKey && document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus();}
   }
  });
  enter.onclick=()=>{
   if(dialog.querySelector('[data-remember-preparation]').checked)try{localStorage.setItem('nlxr.creator-graphics-prepared.v1','true');}catch{}
   observer.disconnect();dialog.remove();preparationPromise=null;
   // Invoke the original launch directly inside the new click gesture.
   resolve(launchCreatorArFromPage(root,launch,true));
  };
 });dialog.querySelector('[data-ar-graphics]').focus();return preparationPromise;
}

export function launchCreatorArFromPage(root, launch, prepared=false) {
    if (launchPromise) return launchPromise;
    if(!prepared && root && typeof document!=='undefined' && (!preparationRemembered() || !arAssetsReady('creator')))return prepareCreatorEntry(root,launch);
    const origin = root?.querySelector('.screen') || root;
    let notice = origin?.querySelector('[data-workspace-ar-notice]');
    if (origin && !notice) {
        notice = document.createElement('p');
        notice.className = 'workspace-ar-notice';
        notice.dataset.workspaceArNotice = 'true';
        notice.setAttribute('role', 'status');
        const heading = origin.querySelector('.page-header,.nlxr-db-v2-ar-strip');
        if (heading) heading.after(notice); else origin.append(notice);
    }
    if (notice) { notice.textContent = 'Opening AR… Your browser may ask for camera access.'; notice.hidden = false; }
    const controls = [...(origin?.querySelectorAll('[data-v2-open-ar],.global-ar-action,.nlxr-db-v2-ar-button,[data-ar-safety-continue]') || [])];
    const disabled = controls.map(control => control.disabled);
    controls.forEach(control => { control.disabled = true; control.setAttribute('aria-busy', 'true'); });
    const showFailure = error => {
        if (notice?.isConnected) notice.textContent = `AR could not open. ${!navigator.xr ? 'Use Meta Quest Browser or a compatible AR browser over HTTPS.' : error?.message || 'Allow camera access and try again.'} Your project stays open here.`;
        return false;
    };
    let started;
    try { started = launch(); } catch (error) { started = Promise.reject(error); }
    launchPromise = Promise.resolve(started).then(result => {
        if (!result) return showFailure(window.__nxrArStartError);
        if (notice) notice.hidden = true;
        return true;
    }).catch(showFailure).finally(() => {
        controls.forEach((control,index) => { control.disabled = disabled[index]; control.removeAttribute('aria-busy'); });
        launchPromise = null;
    });
    return launchPromise;
}
