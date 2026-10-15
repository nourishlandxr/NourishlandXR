import * as THREE from '../assets/fruit-window/vendor/three.module.js';

export const BUTTERFLY_OUTLINE_JOINTS=Object.freeze(['thumb-tip','thumb-phalanx-distal','index-finger-tip','index-finger-phalanx-intermediate','middle-finger-tip','middle-finger-phalanx-intermediate','ring-finger-tip','ring-finger-phalanx-intermediate','pinky-finger-tip','pinky-finger-phalanx-intermediate','pinky-finger-metacarpal','wrist']);
// No synthetic perch positions: missing or curled joints cannot invite a landing.
export function butterflyOpenHand(input){
    if(input.trigger || input.fist || !input.joints)return false;
    const wrist=input.joints.get('wrist');if(!wrist)return false;
    const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
    for(const finger of ['index','middle','ring','pinky']){
        const tip=input.joints.get(finger+'-finger-tip'),base=input.joints.get(finger+'-finger-phalanx-proximal');
        if(!tip || !base || distance(tip,wrist)<distance(base,wrist)*1.45)return false;
    }
    const thumb=input.joints.get('thumb-tip'),index=input.joints.get('index-finger-tip');
    return Boolean(thumb && index && distance(thumb,index)>.045);
}
export function butterflyOutlineTargets(input,inverse){
    if(!butterflyOpenHand(input))return [];
    const wrist=input.joints.get('wrist'),matrix=wrist.matrix?new THREE.Matrix4().fromArray(wrist.matrix):new THREE.Matrix4().fromArray(input.matrix);
    matrix.premultiply(inverse);const q=new THREE.Quaternion().setFromRotationMatrix(matrix),offset=new THREE.Vector3(0,.006,0).applyQuaternion(q);
    return BUTTERFLY_OUTLINE_JOINTS.flatMap((name,index)=>{
        const joint=input.joints.get(name);return joint?[-1,1].map(edge=>({source:input.source,point:new THREE.Vector3(joint.x,joint.y,joint.z).applyMatrix4(inverse).add(offset).add(new THREE.Vector3(edge*.003,0,0).applyQuaternion(q)),q,index:index*2+(edge>0?1:0),joint:name+':'+edge})):[];
    });
}
