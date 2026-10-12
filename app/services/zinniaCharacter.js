import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {createWelcomeZinniaGuide} from './welcomeZinniaGuide.js';
import {createZinniaTouchReactions,zinniaContacts,playZinniaGiggle,unlockZinniaTouchAudio} from './zinniaTouchReactions.js';

export const ZINNIA_MODEL_URL=new URL('../assets/welcome-practice/zinnia.glb',import.meta.url);
// Original prototype 06 organic face, attached leaf hands and varied pastel petals.
export function createZinniaCharacter({onReady=()=>{},onError=()=>{},load}={}){
    const root=new THREE.Group();root.name='Zinnia · organic face';
    const state=root.userData.zinnia={status:'loading',disposed:false,time:null,speechLevel:0,paused:false};
    state.touch=createZinniaTouchReactions();state.unlockAudio=unlockZinniaTouchAudio;
    globalThis.document?.addEventListener?.('pointerdown',state.unlockAudio);
    const guide=createWelcomeZinniaGuide(root,{load,voice:{status:()=>({paused:state.paused}),speechLevel:()=>state.speechLevel},onAssets:()=>{state.status='ready';onReady(root);},onError:error=>{state.status='error';state.error=error.message;onError(error);}});
    state.guide=guide;state.ready=guide.loading.then(()=>state.status==='ready');
    return root;
}
export function animateZinniaCharacter(root,time,speaking=false,options={}){
    const state=root?.userData.zinnia;if(!state || state.disposed)return;
    const dt=state.time===null?0:Math.max(0,Math.min(.06,time-state.time));state.time=time;
    state.paused=Boolean(options.paused);
    state.speechLevel=options.speechLevel??(speaking?.35:0);
    if(options.targetWorld){root.updateWorldMatrix(true,true);options={...options,target:root.worldToLocal(new THREE.Vector3(options.targetWorld.x,options.targetWorld.y,options.targetWorld.z))};}
    const previous=state.touch.snapshot().reaction;
    const reaction=state.touch.update(state.paused?0:dt,zinniaContacts(root,options.inputs));
    if(reaction==='tickle' && previous!=='tickle' && !speaking)playZinniaGiggle();
    state.guide.update(state.paused?0:dt,{lesson:'explore',...options,reaction,focused:Boolean(options.focused || speaking)});
}
export function disposeZinniaCharacter(root){
    const state=root?.userData.zinnia;if(state){state.disposed=true;state.guide?.destroy();state.touch?.reset();globalThis.document?.removeEventListener?.('pointerdown',state.unlockAudio);}
    const geometries=new Set(),materials=new Set(),textures=new Set();
    root?.traverse(node=>{if(node.geometry)geometries.add(node.geometry);for(const material of [node.material].flat().filter(Boolean)){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value);}});
    for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();for(const texture of textures){texture.image?.close?.();texture.dispose();}
}
