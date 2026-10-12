import {createSpatialTetherRenderer,drawSpatialTether,destroySpatialTetherRenderer} from './spatialTetherRenderer.js';
import {unlockZinniaTouchAudio} from './zinniaTouchReactions.js';
import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {createWelcomePracticeScene} from './welcomePracticeScene.js';
import {createFruitWindowXR} from './fruitWindowXR.js';
import {trackedPalmPoint,directPanelPress} from './xrDirectInteraction.js';
import {controllerRayFromPose} from './xrPointer.js';
import {createWelcomeInputRouting} from './welcomeInputRouting.js';
import {nearestWelcomePointerHit} from './welcomePointerTarget.js';

export function createWelcomePracticeXR(gl,{voice,onComplete,onChange,onFeedback,onSelect,onHit,onPanelOwns=()=>false,isFrameReady=()=>true,getFrameError=()=>null,getTrialPanelPose=()=>null,getFramePose=()=>null}={}){
    let renderer=null,pendingRenderer=null,disposed=false,session=null,space=null,abort=null,lastTime=null,hands=[],controllers=[],inputs=[],rebuild=false,revealTime=0,visibilityPaused=false;
    const forceGrip=new Map(),forceTrigger=new Map(),curling=new Map(),comfortPinches=new Map(),suppressed=new WeakMap(),pointer=createSpatialTetherRenderer(gl);
    const stage=createWelcomePracticeScene({voice,onComplete,onChange,onFeedback,onAssets:()=>{rebuild=true;},embedded:true,onSelect,getTrialPanelPose,getFramePose});
    const panelRouting=createWelcomeInputRouting({ownsPanel:onPanelOwns,holdsObject:source=>stage.isHolding(source),hitPanel:ray=>{
        const hit=nearestWelcomePointerHit(ray,onHit?.(ray),stage.hit(ray));return hit?.kind==='panel'?hit:null;
    }});
    const anchor={position:{x:0,y:0,z:0},quaternion:{x:0,y:0,z:0,w:1}};
    function eventRay(event){try{return controllerRayFromPose(event.frame.getPose(event.inputSource.targetRaySpace,space),event.inputSource.handedness);}catch{return inputs.find(i=>i.source===event.inputSource)?.ray || null;}}
    function unbind(){abort?.abort();abort=null;stage.releaseAll(false);forceGrip.clear();forceTrigger.clear();curling.clear();comfortPinches.clear();session=null;}
    function bind(value,referenceSpace){unbind();session=value;space=referenceSpace;abort=new AbortController();
        for(const type of ['selectstart','selectend','select','squeezestart','squeezeend'])session.addEventListener(type,event=>{
            if(!stage.active){if(performance.now()<(suppressed.get(event.inputSource) || 0)){event.stopImmediatePropagation();event.preventDefault?.();}return;}
            const source=event.inputSource;if(type==='selectstart'){unlockZinniaTouchAudio();voice?.unlock();}
            // Only deliberate nearby controller buttons reach the panel listener.
            // Keep ownership through release so it cannot also grab a fruit.
            if(!source.hand && !type.startsWith('squeeze') && panelRouting.routeToPanel(source,eventRay(event))){
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
        if(disposed || !stage.active)return;const dt=lastTime===null?0:(time-lastTime)/1000;lastTime=time;hands=trackedHands || [];inputs=[];controllers=[];
        for(const source of session?.inputSources || []){
            if(panelRouting.occupied(source))continue;
            let pose=null,ray=null;try{pose=frame.getPose(source.gripSpace || source.targetRaySpace,space);ray=controllerRayFromPose(frame.getPose(source.targetRaySpace,space),source.handedness);}catch{}
            if(source.hand){const state=hands.find(h=>h.source===source)?.state,wrist=state?.rawJoints.get('wrist'),index=state?.rawJoints.get('index-finger-tip'),thumb=state?.rawJoints.get('thumb-tip');
                if(!state?.tracked || !wrist || !index || !thumb){comfortPinches.delete(source);inputs.push({source,matrix:null});continue;}
                if(!stage.handsEnabled && state.pinch && !comfortPinches.get(source))stage.select(state.pointer,source);comfortPinches.set(source,Boolean(state.pinch));
                const m=new THREE.Matrix4().fromArray(wrist.matrix),q=new THREE.Quaternion().setFromRotationMatrix(m);
                const tips=['middle-finger-tip','ring-finger-tip','pinky-finger-tip'].map(name=>state.rawJoints.get(name)).filter(Boolean),curl=tips.length===3?tips.reduce((sum,t)=>sum+Math.hypot(t.x-wrist.x,t.y-wrist.y,t.z-wrist.z),0)/3:1;
                const fist=curl<(curling.get(source)?.105:.087);curling.set(source,fist);
                const gripPoint=trackedPalmPoint(state.rawJoints);if(!gripPoint){inputs.push({source,matrix:null});continue;}
                inputs.push({source,matrix:new THREE.Matrix4().compose(gripPoint,q,new THREE.Vector3(1,1,1)).elements,ray:state.pointer,tip:index,fist,down:Boolean(state.pinch || fist),trigger:Boolean(state.pinch)});
            }else {const down=Boolean(forceGrip.get(source) || source.gamepad?.buttons?.[1]?.pressed || source.gamepad?.buttons?.[1]?.value>.55),trigger=Boolean(forceTrigger.get(source) || source.gamepad?.buttons?.[0]?.pressed),input={source,matrix:pose?.transform.matrix || null,ray,down,trigger,grip:Math.max(down?1:0,source.gamepad?.buttons?.[1]?.value || 0)};inputs.push(input);if(input.matrix)controllers.push(input);}
        }
        stage.update(dt,{viewer,floor,hands,controllers,inputs,frameReady:isFrameReady(),frameError:getFrameError()});revealTime+=Math.max(0,Math.min(.1,dt));
        if((!renderer && !pendingRenderer) || rebuild){rebuild=false;pendingRenderer?.destroy();pendingRenderer=createFruitWindowXR(gl,stage.scene,{alphaCompositing:true,progressive:true});}
        if(pendingRenderer){const ready=pendingRenderer.prepareNext();if(ready){pendingRenderer.update();renderer?.destroy();renderer=pendingRenderer;pendingRenderer=null;}}
        // Keep controller poses available while the visitor puts them down.
        // Tracked hands becoming available never turns off controller access.
        renderer?.update();renderer?.prepareNext();
    }
    return {stage,bind,update,get active(){return stage.active;},start(viewer,floor){if(disposed)return;lastTime=null;revealTime=0;stage.start(viewer,floor);},
        draw(view,handRenderer){if(!stage.active)return;const t=Math.min(1,revealTime/1.1),opacity=t*t*(3-2*t)*stage.exitOpacity;renderer?.draw(view,anchor,opacity);
            handRenderer?.draw(view,hands,{filled:true,controllers:stage.controllerHandsVisible?controllers:[],controllerOpacity:stage.controllerHandOpacity*opacity,trackedOpacity:stage.trackedHandOpacity*opacity});
            for(const input of inputs){
                if(input.source.hand || !input.ray || stage.exiting)continue;
                const r=input.ray,hit=nearestWelcomePointerHit(r,onHit?.(r),stage.hit(r));
                const requested=input.source.handedness==='left' && Boolean(input.source.gamepad?.buttons?.[4]?.pressed || input.source.gamepad?.buttons?.[5]?.pressed);
                if(stage.phase.startsWith('controls-') && !requested)continue;
                const panel=hit?.kind==='panel' || hit?.kind==='trial-control' || hit?.kind==='voice-bar';
                if(!panel && (!stage.controllerLasersVisible || stage.trials.active==='painting' || stage.isBrushHeld(input.source)) && !requested)continue;
                const end=hit?.worldPoint || {x:r.origin.x+r.direction.x*1.25,y:r.origin.y+r.direction.y*1.25,z:r.origin.z+r.direction.z*1.25};
                drawSpatialTether(gl,pointer,view,r.origin,end,{width:.0018,curve:0,lift:0,segments:4,color:[.8,.9,.79,.6*opacity]});
            }
        },destroy({stopVoice=true}={}){if(disposed)return;disposed=true;unbind();stage.destroy({stopVoice});pendingRenderer?.destroy();pendingRenderer=null;renderer?.destroy();renderer=null;destroySpatialTetherRenderer(gl,pointer);hands=[];controllers=[];inputs=[];}};
}
