import {drawWelcomeControllerLaser} from './welcomeControllerLaser.js';
import {createSpatialTetherRenderer,drawSpatialPointerContact,destroySpatialTetherRenderer} from './spatialTetherRenderer.js';
import {unlockZinniaTouchAudio} from './zinniaTouchReactions.js';
import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {createWelcomePracticeScene} from './welcomePracticeScene.js';
import {createFruitWindowXR} from './fruitWindowXR.js';
import {trackedPalmPoint,directPanelPress} from './xrDirectInteraction.js';
import {controllerRayFromPose} from './xrPointer.js';
import {createWelcomeInputRouting} from './welcomeInputRouting.js';
import {nearestWelcomePointerHit} from './welcomePointerTarget.js';

export function createWelcomePracticeXR(gl,{voice,onComplete,onChange,onFeedback,onSelect,onHit,onToolMenu=()=>{},onPanelOwns=()=>false,isFrameReady=()=>true,getFrameError=()=>null,getTrialPanelPose=()=>null,getFramePose=()=>null}={}){
    let handOutline=null;const frameSamples=[];let updateCpuMs=0,rendererRebuilds=0,retainedRevisions=0;let renderer=null,pendingRenderer=null,disposed=false,session=null,space=null,abort=null,lastTime=null,hands=[],controllers=[],inputs=[],rebuild=false,revealTime=0,visibilityPaused=false,nativeHandsReady=false,rendererRevision=-1,pendingRevision=-1;
    const forceGrip=new Map(),forceTrigger=new Map(),curling=new Map(),comfortPinches=new Map(),suppressed=new WeakMap(),pointer=createSpatialTetherRenderer(gl);
    const stage=createWelcomePracticeScene({voice,onComplete,onChange,onFeedback,onToolMenu,onAssets:()=>{rebuild=true;},embedded:true,onSelect,getTrialPanelPose,getFramePose});
    const panelRouting=createWelcomeInputRouting({ownsPanel:onPanelOwns,holdsObject:source=>stage.isHolding(source),hitPanel:ray=>{
        const hit=nearestWelcomePointerHit(ray,onHit?.(ray),stage.hit(ray));return hit?.kind==='panel'?hit:null;
    }});
    const anchor={position:{x:0,y:0,z:0},quaternion:{x:0,y:0,z:0,w:1}},handMatrices=new WeakMap(),wristMatrix=new THREE.Matrix4(),wristRotation=new THREE.Quaternion(),unitScale=new THREE.Vector3(1,1,1),overlayPoint=new THREE.Vector3(),visibleControllers=[],curlJointNames=['middle-finger-tip','ring-finger-tip','pinky-finger-tip'];
    function eventRay(event){if(stage.controllerHandsVisible){const ray=inputs.find(i=>i.source===event.inputSource)?.ray;if(ray)return ray;}try{return controllerRayFromPose(event.frame.getPose(event.inputSource.targetRaySpace,space),event.inputSource.handedness);}catch{return inputs.find(i=>i.source===event.inputSource)?.ray || null;}}
    function unbind(){abort?.abort();abort=null;stage.releaseAll(false);forceGrip.clear();forceTrigger.clear();curling.clear();comfortPinches.clear();session=null;}
    function bind(value,referenceSpace){unbind();void stage.preloadControllers([...value.inputSources].filter(source=>!source.hand));session=value;space=referenceSpace;voice?.unlock();abort=new AbortController();
        for(const type of ['selectstart','selectend','select','squeezestart','squeezeend'])session.addEventListener(type,event=>{
            if(!stage.active){if(performance.now()<(suppressed.get(event.inputSource) || 0)){event.stopImmediatePropagation();event.preventDefault?.();}return;}
            const source=event.inputSource;if(type==='selectstart'){unlockZinniaTouchAudio();voice?.unlock();}
            // Only deliberate nearby controller buttons reach the panel listener.
            // Keep ownership through release so it cannot also grab a fruit.
            if(stage.settingsAvailable && !source.hand && !type.startsWith('squeeze') && panelRouting.routeToPanel(source,eventRay(event))){
                forceGrip.delete(source);forceTrigger.delete(source);return;
            }
            suppressed.set(event.inputSource,performance.now()+700);event.stopImmediatePropagation();event.preventDefault?.();
            if(type==='selectstart'){forceTrigger.set(event.inputSource,true);if(!event.inputSource.hand)stage.select(eventRay(event),event.inputSource);}
            else if(type==='selectend')forceTrigger.set(event.inputSource,false);
            else if(type==='squeezestart')forceGrip.set(event.inputSource,true);
            else if(type==='squeezeend')forceGrip.set(event.inputSource,false);
        },{capture:true,signal:abort.signal});
        session.addEventListener('visibilitychange',()=>{if(session.visibilityState!=='visible'){stage.releaseAll(false);visibilityPaused=!voice?.status().paused;voice?.pause();lastTime=null;forceGrip.clear();forceTrigger.clear();}else {voice?.unlock();if(visibilityPaused)voice?.resume();visibilityPaused=false;}},{signal:abort.signal});
        session.addEventListener('inputsourceschange',event=>{if(event.removed?.length)stage.releaseAll(false);for(const source of event.removed || []){forceGrip.delete(source);forceTrigger.delete(source);curling.delete(source);comfortPinches.delete(source);}},{signal:abort.signal});
        referenceSpace.addEventListener?.('reset',event=>{if(event.transform?.inverse?.matrix)stage.rebase(event.transform.inverse.matrix);else {stage.releaseAll(false);onChange?.({...stage.snapshot(),trackingReset:true});}},{signal:abort.signal});
    }
    function update(frame,time,viewer,floor,trackedHands){
        if(disposed || !stage.active)return;const cpuStarted=performance.now();const dt=lastTime===null?0:(time-lastTime)/1000;lastTime=time;hands=trackedHands || [];inputs.length=0;controllers.length=0;
        for(const source of session?.inputSources || []){
            const uiBlocked=panelRouting.occupied(source);
            let pose=null,ray=null;try{pose=frame.getPose(source.gripSpace || source.targetRaySpace,space);ray=controllerRayFromPose(frame.getPose(source.targetRaySpace,space),source.handedness);}catch{}
            if(source.hand){const state=hands.find(h=>h.source===source)?.state,wrist=state?.rawJoints.get('wrist'),index=state?.rawJoints.get('index-finger-tip'),thumb=state?.rawJoints.get('thumb-tip');
                if(!state?.tracked || !wrist || !index || !thumb){comfortPinches.delete(source);inputs.push({source,matrix:null});continue;}
                if(!stage.handsEnabled && state.pinch && !comfortPinches.get(source))stage.select(state.pointer,source);comfortPinches.set(source,Boolean(state.pinch));
                wristMatrix.fromArray(wrist.matrix);wristRotation.setFromRotationMatrix(wristMatrix);
                let curlSum=0,curlCount=0;for(const name of curlJointNames){const tip=state.rawJoints.get(name);if(tip){curlSum+=Math.hypot(tip.x-wrist.x,tip.y-wrist.y,tip.z-wrist.z);curlCount++;}}const curl=curlCount===3?curlSum/3:1;
                const fist=curl<(curling.get(source)?.105:.087);curling.set(source,fist);
                const gripPoint=trackedPalmPoint(state.rawJoints);if(!gripPoint){inputs.push({source,matrix:null});continue;}
                let handMatrix=handMatrices.get(source);if(!handMatrix){handMatrix=new THREE.Matrix4();handMatrices.set(source,handMatrix);}handMatrix.compose(gripPoint,wristRotation,unitScale);
                inputs.push({source,matrix:handMatrix.elements,ray:state.pointer,tip:index,fist,down:Boolean(state.pinch || fist),trigger:Boolean(state.pinch),uiBlocked});
            }else {const down=Boolean(forceGrip.get(source) || source.gamepad?.buttons?.[1]?.pressed || source.gamepad?.buttons?.[1]?.value>.55),trigger=Boolean(forceTrigger.get(source) || source.gamepad?.buttons?.[0]?.pressed),input={source,matrix:pose?.transform.matrix || null,ray,down,trigger,grip:Math.max(down?1:0,source.gamepad?.buttons?.[1]?.value || 0),uiBlocked};inputs.push(input);if(input.matrix){if(stage.controllerHandsVisible)input.ray=handOutline?.controllerPointer?.(input) || input.ray;controllers.push(input);}}
        }
        stage.update(dt,{viewer,floor,hands,controllers,inputs,frameReady:isFrameReady(),frameError:getFrameError(),handsReady:nativeHandsReady,presentationReady:Boolean(renderer && !pendingRenderer && !rebuild),renderRevision:rendererRevision});revealTime+=Math.max(0,Math.min(.1,dt));
        if(rebuild && renderer && !pendingRenderer && renderer.coversScene()){retainedRevisions++;rebuild=false;rendererRevision=stage.sceneRevision;}
        if(!pendingRenderer && (!renderer || rebuild)){rebuild=false;pendingRevision=stage.sceneRevision;rendererRebuilds++;pendingRenderer=createFruitWindowXR(gl,stage.scene,{alphaCompositing:true,progressive:true,welcomeMagic:true,visibleParentsOnly:true});}
        if(pendingRenderer){const ready=pendingRenderer.prepareNext();if(ready){pendingRenderer.update();renderer?.destroy();renderer=pendingRenderer;rendererRevision=pendingRevision;pendingRenderer=null;}}
        // Keep controller poses available while the visitor puts them down.
        // Tracked hands becoming available never turns off controller access.
        renderer?.update();renderer?.prepareNext();
        const pointerEnabled=stage.controllerLasersVisible || stage.settingsAvailable;
        updateCpuMs=performance.now()-cpuStarted;if(dt>0){frameSamples.push(dt*1000);if(frameSamples.length>120)frameSamples.shift();}
        for(const input of inputs)if(pointerEnabled && !input.source.hand && input.ray && !stage.exiting){const leafPoint=stage.heldLeafPoint(input.source.handedness);input.pointerHit=leafPoint?{kind:'zinnia-leaf',worldPoint:leafPoint}:nearestWelcomePointerHit(input.ray,onHit?.(input.ray),stage.hit(input.ray));}
    }
    return {stage,bind,update,get performance(){const sorted=[...frameSamples].sort((a,b)=>a-b);return {updateCpuMs,rendererRebuilds,retainedRevisions,frameP95Ms:sorted[Math.floor(sorted.length*.95)] || 0,samples:sorted.length,renderer:renderer?.stats};},get active(){return stage.active;},start(viewer,floor){if(disposed)return;lastTime=null;revealTime=0;stage.start(viewer,floor);},
        draw(view,handRenderer){handOutline=handRenderer;if(!stage.active)return;nativeHandsReady=Boolean(handRenderer?.ready);const t=Math.min(1,revealTime/1.1),opacity=t*t*(3-2*t)*stage.exitOpacity;renderer?.draw(view,anchor,opacity);
            const reveal=stage.controllerHandReveal;visibleControllers.length=0;if(stage.controllerHandsVisible)for(const input of controllers)if((reveal[input.source.handedness] || 0)>0)visibleControllers.push(input);
            handRenderer?.draw(view,hands,{filled:true,controllers:visibleControllers,controllerOpacity:stage.controllerHandOpacity*opacity,trackedOpacity:stage.trackedHandOpacity*opacity,controllerReveal:reveal});
            for(const input of inputs){
                if(input.source.hand || !input.ray || stage.exiting)continue;
                const r=input.ray,hit=input.pointerHit;
                if(!stage.controllerLasersVisible){if(stage.settingsAvailable && hit?.worldPoint && ['panel','trial-control','voice-bar'].includes(hit.kind)){const contact={x:hit.worldPoint.x-r.direction.x*.004,y:hit.worldPoint.y-r.direction.y*.004,z:hit.worldPoint.z-r.direction.z*.004};drawWelcomeControllerLaser(gl,pointer,view,r,contact,1,opacity);drawSpatialPointerContact(gl,pointer,view,contact,.009,[.8,.96,1,.9*opacity],true);};continue;}
                if(stage.trials.active==='painting' || stage.isBrushHeld(input.source))continue;
                drawWelcomeControllerLaser(gl,pointer,view,r,hit?.worldPoint,stage.controllerLaserProgress,opacity);
            }
        },drawPointerOverlay(view){if(!stage.active || stage.exiting)return;for(const input of inputs){const hit=input.pointerHit;if(input.source.hand || !hit?.worldPoint || !['panel','trial-control','voice-bar'].includes(hit.kind))continue;const point=overlayPoint.copy(hit.worldPoint).addScaledVector(input.ray.direction,-.006);drawSpatialPointerContact(gl,pointer,view,point,.009,[.8,.96,1,.95*stage.exitOpacity],true);}},destroy({stopVoice=true}={}){if(disposed)return;disposed=true;unbind();stage.destroy({stopVoice});pendingRenderer?.destroy();pendingRenderer=null;renderer?.destroy();renderer=null;destroySpatialTetherRenderer(gl,pointer);hands=[];controllers=[];inputs=[];}};
}
