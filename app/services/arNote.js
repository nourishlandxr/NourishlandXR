import { initPanelRenderer, createPanelTexture, renderARPanel } from './arPanel.js';
import { createSpatialSphereRenderer, destroySpatialSphereRenderer, drawSpatialOrb } from './spatialSphereRenderer.js';
import { requestImmersiveArSession } from './webxrSession.js';
import { allowArScreenRotation, releaseArScreenRotation } from './arScreenOrientation.js';
import { readingPositions, hitReadingPlant, visitorTrackingCopy } from './visitorSpatialState.js';
import { html } from './productExperience.js';
import { createPlantKnowledgeResolver } from './spatialKnowledgePresentation.js';
import {isDesktopLearningBookTarget,DESKTOP_AR_EXPLANATION} from './desktopLearningBookTarget.js';

let session=null, starting=false, resetReadingSpace=null, endingPromise=null;
const diagnostics=[];
const AR_DIAGNOSTICS_STORAGE_KEY='nourishland-xr-last-diagnostics';
const AR_DIAGNOSTICS_LIMIT=80;
export function getArDiagnostics(){return [...diagnostics];}
export function getPersistedArDiagnostics(){
    try {
        const saved=JSON.parse(globalThis.localStorage?.getItem(AR_DIAGNOSTICS_STORAGE_KEY) || '[]');
        return Array.isArray(saved)?saved:[];
    }
    catch { return []; }
}
function appendArDiagnostic(message,{persist=false}={}){
    const entry=`${new Date().toISOString()} ${message}`;
    diagnostics.push(entry);
    if(diagnostics.length>AR_DIAGNOSTICS_LIMIT)diagnostics.splice(0,diagnostics.length-AR_DIAGNOSTICS_LIMIT);
    if(!persist)return;
    try {
        const saved=getPersistedArDiagnostics();
        saved.push(entry);
        globalThis.localStorage?.setItem(AR_DIAGNOSTICS_STORAGE_KEY,JSON.stringify(saved.slice(-AR_DIAGNOSTICS_LIMIT)));
    } catch {}
}
export function recordArFailure(error,stage='AR'){
    const detail=String(error?.stack || error?.message || error).slice(0,2000);
    appendArDiagnostic(`${stage}: ${detail}`,{persist:true});
}
function developerDiagnosticsEnabled(){
    try { return JSON.parse(localStorage.getItem('nourishland-xr-settings') || '{}').developerDiagnostics === true; }
    catch { return false; }
}
// Structured, opt-in traces share the existing diagnostics copy path. They are
// intentionally silent during ordinary use and are useful for physical-device
// LIM/AR reproduction reports.
export function recordArDiagnostic(stage, details = {}){
    if(!developerDiagnosticsEnabled())return;
    let payload='';
    try { payload=JSON.stringify(details); } catch { payload=String(details); }
    appendArDiagnostic(`${stage}: ${payload}`);
}
export async function copyArDiagnostics(){
    const entries=[...getPersistedArDiagnostics(),...diagnostics];
    await navigator.clipboard.writeText(entries.join('\n') || 'No AR diagnostics recorded.');
}
export function isArActive(){return Boolean(session);}
export function resetArPlacement(){resetReadingSpace?.();}
export async function exitAr(){
    if(endingPromise)return endingPromise;
    if(!session)return;
    endingPromise=session.end();
    try { await endingPromise; } finally { endingPromise=null; }
}

function drawReadingPanel(context,width,height,plant) {
    context.clearRect(0,0,width,height);
    context.fillStyle='#f5f4e9';context.fillRect(0,0,width,height);
    context.fillStyle='#315540';context.textAlign='left';context.font='500 34px sans-serif';
    context.fillText('NOURISHLAND · SPATIAL READING',50,65);
    context.font='500 58px serif';context.fillText(String(plant?.name || 'Look closer').slice(0,45),50,160);
    context.font='30px sans-serif';
    const words=String(plant?.description || 'Aim at a plant orb and select it. These are reading positions, not mapped plants.').split(/\s+/);
    let line='',y=240;
    for(const word of words){if(context.measureText(`${line} ${word}`).width>width-100){context.fillText(line,50,y);y+=45;line=word;if(y>height-160)break;}else line+=`${line?' ':''}${word}`;}
    if(y<=height-160)context.fillText(line,50,y);
    context.font='26px sans-serif';context.fillText('Last two orbs: close reading · exit AR',50,height-65);
}

export async function startArNote(marker,profile,options={}) {
    if(isDesktopLearningBookTarget())throw new Error(DESKTOP_AR_EXPLANATION);
    if(session || starting)return;
    if(!window.isSecureContext)throw new Error('AR requires HTTPS.');
    if(!navigator.xr)throw new Error('WebXR is unavailable in this browser.');
    starting=true;
    let gl=null,renderer=null,spheres=null,texture=null,overlay=null,canvas=null,owned=null;
    let positions=[],selected=-1,tracked=null,returnAction=null;
    // Read-only session samples; persisted coordinates are never modified or inferred.
    const plants=(options.plants?.length ? options.plants : marker ? [{...marker,description:profile?.overview || marker.description}] : []).slice(0,5);
    const resolveKnowledge=createPlantKnowledgeResolver();
    const plantKnowledge=plants.map(plant=>resolveKnowledge(plant.plant_profile || plant.profile || (plant.id===marker?.id ? profile : {}) || {},{includeDraft:false}));
    let cleaned=false;
    const cleanup=()=>{
        if(cleaned)return; cleaned=true;
        overlay?.remove();canvas?.remove();
        if(texture)gl?.deleteTexture(texture);
        if(renderer){gl?.deleteBuffer(renderer.buffer);gl?.deleteProgram(renderer.program);}
        destroySpatialSphereRenderer(gl,spheres);
        texture=null;renderer=null;spheres=null;
        releaseArScreenRotation();document.body.classList.remove('visitor-ar-active');
        if(session===owned)session=null;
        resetReadingSpace=null;starting=false;
    };
    let finishing=false;
    const finish=async action=>{
        if(finishing || session!==owned)return;
        finishing=true;returnAction=action;
        overlay?.querySelectorAll('button').forEach(button=>{button.disabled=true;});
        try { await exitAr(); }
        catch(error){finishing=false;returnAction=null;overlay?.querySelectorAll('button').forEach(button=>{button.disabled=false;});recordArFailure(error,'Exit');}
    };
    const updateSelection=index=>{
        selected=index;
        if(texture)gl.deleteTexture(texture);
        texture=createPanelTexture(gl,(ctx,w,h)=>drawReadingPanel(ctx,w,h,plants[selected]));
        const panel=overlay?.querySelector('[data-ar-reading]');
        if(panel){panel.hidden=selected<0;panel.innerHTML=selected<0?'':`<h2>${html(plants[selected].name)}</h2><p>${html(plants[selected].description || 'Open the field guide to explore this plant’s knowledge.')}</p><button data-ar-read-full>Read full knowledge</button> <button data-ar-close-reading>Keep exploring</button>`;
            panel.querySelector('[data-ar-close-reading]')?.addEventListener('click',()=>updateSelection(-1));
            panel.querySelector('[data-ar-read-full]')?.addEventListener('click',()=>finish(()=>options.onRead?.(plants[selected].id) || options.onBrowse?.()));}
    };
    try {
        allowArScreenRotation();
        overlay=document.createElement('section');overlay.className='v2-visitor-ar';overlay.setAttribute('aria-label','Visitor AR');
        overlay.innerHTML=`<p class="v2-visitor-ar-status" role="status" data-ar-tracking>Starting tracking · site positions not aligned</p><section class="v2-visitor-ar-selection" data-ar-reading hidden></section><nav class="v2-visitor-ar-dock" aria-label="AR exploration controls"><button data-ar-next ${plants.length?'':'disabled'}>Next plant</button><button data-ar-guide>Field guide</button><button data-ar-map>Map</button><button data-ar-exit>Exit AR</button></nav>`;
        document.body.append(overlay);document.body.classList.add('visitor-ar-active');
        overlay.addEventListener('beforexrselect',event=>event.preventDefault());
        overlay.querySelector('[data-ar-next]').addEventListener('click',()=>{if(gl)updateSelection((selected+1)%plants.length);});
        overlay.querySelector('[data-ar-guide]').addEventListener('click',()=>finish(options.onBrowse));
        overlay.querySelector('[data-ar-map]').addEventListener('click',()=>finish(options.onMap));
        overlay.querySelector('[data-ar-exit]').addEventListener('click',()=>finish(null));
        const result=await requestImmersiveArSession(document.body,{preferDomOverlay:true});
        owned=result.session;session=owned;
        owned.addEventListener('end',()=>{cleanup();returnAction?.();},{once:true});
        canvas=document.createElement('canvas');canvas.id='arCanvas';canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9000';document.body.append(canvas);
        gl=canvas.getContext('webgl',{alpha:result.passthrough!==false,antialias:true,xrCompatible:true});
        if(!gl)throw new Error('WebGL is unavailable.');
        await gl.makeXRCompatible();
        owned.updateRenderState({baseLayer:new XRWebGLLayer(owned,gl,{alpha:result.passthrough!==false,depth:true,antialias:true}),depthNear:.01,depthFar:100});
        let space;try{space=await owned.requestReferenceSpace('local-floor');}catch{space=await owned.requestReferenceSpace('local');}
        renderer=initPanelRenderer(gl);spheres=createSpatialSphereRenderer(gl);updateSelection(-1);
        resetReadingSpace=()=>{positions=[];updateSelection(-1);};
        owned.addEventListener('select',event=>{
            const pose=event.frame.getPose(event.inputSource.targetRaySpace,space);
            if(!pose || !tracked)return;
            const hit=hitReadingPlant(pose.transform.matrix,positions);
            if(hit>=0 && hit<plants.length)updateSelection(hit);
            else if(hit===plants.length)updateSelection(-1);
            else if(hit===plants.length+1)void finish(null);
        });
        const frame=(time,xrFrame)=>{
            if(session!==owned || !gl)return;
            owned.requestAnimationFrame(frame);
            const pose=xrFrame.getViewerPose(space);
            if(tracked!==Boolean(pose)){tracked=Boolean(pose);overlay.querySelector('[data-ar-tracking]').textContent=visitorTrackingCopy(tracked,plants.length);}
            if(!pose)return;
            if(!positions.length)positions=readingPositions(pose,plants.length+2);
            const center=positions[Math.floor(plants.length/2)] || positions[0];
            renderARPanel(gl,xrFrame,space,texture,{program:renderer.program,buffer:renderer.buffer,position:[center.x,center.y+.4,center.z],width:.68,height:.42,
                hidePanel:selected<0 && Boolean(owned.domOverlayState),
                drawSpatialContent:view=>positions.forEach((position,index)=>drawSpatialOrb(gl,spheres,view,position,index === selected ? .11 : .075,{type:index<plants.length?'plant':'marker',knowledge:plantKnowledge[index],highlighted:index===selected}))});
        };
        owned.requestAnimationFrame(frame);starting=false;
    } catch(error){recordArFailure(error,'Start');cleanup();if(owned)await owned.end().catch(()=>{});throw error;}
}
