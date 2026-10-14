// Standalone xr-input integration uses the same pinned super-three build as the
// SDK input package. No IWSDK World/render features are imported into NLXR.
import { Scene, PerspectiveCamera, Matrix4, Quaternion, Group } from 'three';
import { XRInputManager, AnimatedControllerHand, AnimatedHand, XRInputVisualAdapter, DefaultXRAssetLoader } from '@iwsdk/xr-input';
import { createNlxrInputBridge } from './xrInputBridge.js';
import { VIRTUAL_HAND_FIST_POSE } from './virtualHandFistPose.js';
import * as GrabSDK from '@iwsdk/core';
import { createTutorialInteractionOwner } from './iwsdkTutorialInteraction.js';
import { createTutorialPhysicsOwner } from './iwsdkTutorialPhysics.js';

export const createNlxrInput = (session, options) => {
    const runtime = createNlxrInputBridge(session,
    { XRInputManager, AnimatedControllerHand, AnimatedHand, XRInputVisualAdapter,
        loadHandGLTF: url => DefaultXRAssetLoader.loadGLTF(url),
        freeHandPose: VIRTUAL_HAND_FIST_POSE,
        Scene, PerspectiveCamera, Matrix4, Quaternion, Group }, options);
    const owners=new Set(),disposeInput=runtime.dispose;let disposed=false;
    runtime.createTutorialInteractions = () => {
        const owner=createTutorialInteractionOwner(runtime,GrabSDK),dispose=owner.dispose;
        owners.add(owner);owner.dispose=()=>{dispose();owners.delete(owner);};return owner;
    };
    runtime.createDemoInteractions = () => {
        if(disposed)return null;
        const far=createTutorialInteractionOwner(runtime,GrabSDK,{scope:'demo-controller',capacity:256,distance:true});
        const near=createTutorialInteractionOwner(runtime,GrabSDK,{scope:'demo-hand',capacity:256});
        const owner={
            step(inputs,targets,options){
                // Separate SDK targets avoid contradictory near-only/far-ray
                // handle configuration and prevent either hand stealing a hold.
                const handTargets=targets.filter(body=>!far.snapshot().held.includes(body.id));
                near.step(inputs.filter(input=>input.source.hand),handTargets,options);
                far.step(inputs.filter(input=>!input.source.hand),targets.filter(body=>!near.snapshot().held.includes(body.id)),options);
            },
            held:source=>(source?.hand?near:far).held(source),
            reset(){near.reset();far.reset();},cancel(id){near.cancel(id);far.cancel(id);},
            snapshot:()=>({backend:'iwsdk',near:near.snapshot(),far:far.snapshot()}),
            dispose(){near.dispose();far.dispose();owners.delete(owner);}
        };
        owners.add(owner);return owner;
    };
    runtime.createTutorialPhysics = options => {
        const owner=createTutorialPhysicsOwner(GrabSDK,options),dispose=owner.dispose;
        owners.add(owner);owner.dispose=()=>{dispose();owners.delete(owner);};return owner;
    };
    runtime.createTutorialAudio = async voice => {
        const {createTutorialAudioOwner}=await import('./iwsdkTutorialAudio.js');
        if(disposed)return null;
        const owner=await createTutorialAudioOwner(runtime,voice);
        if(!owner)return null;if(disposed){owner.dispose();return null;}
        const dispose=owner.dispose;owners.add(owner);owner.dispose=()=>{dispose();owners.delete(owner);};return owner;
    };
    runtime.createTutorialUI = async options => {
        const {createNlxrTutorialUI}=await import('./iwsdkUiAdapter.js');
        if(disposed)return null;
        const owner=await createNlxrTutorialUI(runtime,options);
        if(disposed){owner.dispose();return null;}
        const dispose=owner.dispose;owners.add(owner);owner.dispose=()=>{dispose();owners.delete(owner);};return owner;
    };
    runtime.createDemoAudio = async voice => {
        const {createTutorialAudioOwner}=await import('./iwsdkTutorialAudio.js');
        if(disposed)return null;
        const owner=await createTutorialAudioOwner(runtime,voice,undefined,{scope:'demo'});
        if(!owner)return null;if(disposed){owner.dispose();return null;}
        const dispose=owner.dispose;owners.add(owner);owner.dispose=()=>{dispose();owners.delete(owner);};return owner;
    };
    runtime.dispose=()=>{disposed=true;for(const owner of owners)owner.dispose();disposeInput();};
    return runtime;
};
