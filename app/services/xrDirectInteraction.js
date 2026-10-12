import * as THREE from '../assets/fruit-window/vendor/three.module.js';

// The fruit's centre must be within the grasp, not within an expanded radius
// around its mesh. Transforming into palm space also respects wrist rotation.
export function fruitInsidePalm(palmMatrix,position){
    const p=new THREE.Vector3(position.x,position.y,position.z).applyMatrix4(palmMatrix.clone().invert());
    return (p.x/.05)**2+(p.y/.05)**2+(p.z/.055)**2<=1;
}

export function trackedPalmPoint(joints){
    const points=['index','middle','ring','pinky'].flatMap(finger=>['metacarpal','phalanx-proximal'].map(joint=>joints.get(finger+'-finger-'+joint)));
    if(points.some(point=>!point))return null;
    return points.reduce((p,j)=>p.add(new THREE.Vector3(j.x,j.y,j.z)),new THREE.Vector3()).multiplyScalar(1/points.length);
}

// Controllers retain button selection at arm's reach, without distant lasers.
// Hands use the physical fingertip poke path; squeezing never moves a panel.
export function directPanelPress(source,ray,target,type='selectstart'){
    return Boolean(!source?.hand && !type.startsWith('squeeze') && ray && target?.button && !target.button.disabled && Number.isFinite(target.distance) && target.distance>=0 && target.distance<=.15);
}

export function createDirectPanelGesture({now=()=>performance.now()}={}){
    const presses=new WeakMap();
    return {update(source,ray,target,type){
        const valid=directPanelPress(source,ray,target,type),previous=presses.get(source);
        const matches=valid && previous?.action===target.button.action && previous?.card===target.card?.id && now()-previous.time<1800;
        if(type==='selectstart'){
            presses.delete(source);
            if(valid)presses.set(source,{action:target.button.action,card:target.card?.id,time:now(),released:false});
            return {accepted:valid,activate:false};
        }
        if(type==='selectend'){
            if(matches)previous.released=true;else presses.delete(source);
            return {accepted:Boolean(matches),activate:false};
        }
        if(type==='select'){
            presses.delete(source);
            return {accepted:Boolean(matches),activate:Boolean(matches && previous.released)};
        }
        return {accepted:false,activate:false};
    },reset(source){if(source)presses.delete(source);}};
}
