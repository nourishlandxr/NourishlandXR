import * as THREE from '../assets/fruit-window/vendor/three.module.js';

// The baked poses share one closed-fruit origin. Only the two adjacent poses
// contribute, and held progress survives releasing/regrabbing the peel.
export function setBananaPeel(variant,progress){
    const next=Math.max(variant.peel || 0,progress>=.98?1:Math.max(0,progress));
    if(next===(variant.peel || 0))return false;
    variant.peel=next;const frame=next*16,low=Math.floor(frame),mix=frame-low;
    variant.whole.traverse(node=>{const weights=node.morphTargetInfluences;if(!weights)return;weights.fill(0);if(low>0)weights[low-1]=1-mix;if(low<16)weights[low]=mix;});
    return true;
}

export function resetInteractiveFruit(variant){
    variant.opened=false;variant.bitten=false;variant.bites=0;variant.peel=0;variant.mouthArmed=false;
    variant.whole.visible=true;if(variant.half)variant.half.visible=false;if(variant.bite)variant.bite.visible=false;
    for(const state of variant.biteStates || [])state.visible=false;
    variant.whole.traverse(node=>node.morphTargetInfluences?.fill(0));
}

export function tryAppleBite(variant,body,mouth,source,onFeedback){
    const states=variant?.biteStates || (variant?.bite?[variant.bite]:[]),count=variant?.bites || 0;
    if(!states.length || variant.opened || count>=states.length)return false;
    const distance=mouth.distanceTo(new THREE.Vector3().copy(body.position));
    // Require a deliberate approach from outside the mouth zone, not a spawn
    // or grab already touching the user's face.
    if(distance>.20)variant.mouthArmed=true;
    if(!variant.mouthArmed || distance>.105)return false;
    variant.mouthArmed=false;variant.bitten=true;variant.bites=count+1;variant.whole.visible=false;
    for(const [index,state] of states.entries())state.visible=index===count;
    onFeedback('bite',source);return true;
}
