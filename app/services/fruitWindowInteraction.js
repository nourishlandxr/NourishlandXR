import * as THREE from '../assets/fruit-window/vendor/three.module.js';

export const FRUIT_WINDOW_LIBRARY=Object.freeze([
    {id:'mamey_sapote',label:'Mamey sapote',folder:'mamey-african',aliases:['mamey','pouteria sapota']},
    {id:'african_peach',label:'African peach',folder:'mamey-african',aliases:['african peach','nauclea latifolia','sarcocephalus latifolius']},
    {id:'carambola',label:'Star fruit',folder:'carambola-bayberry',aliases:['carambola','star fruit','starfruit','averrhoa carambola']},
    {id:'chinese_bayberry',label:'Chinese bayberry',folder:'carambola-bayberry',aliases:['bayberry','yangmei','morella rubra','myrica rubra']},
    {id:'pigeon_pea_fresh',label:'Pigeon pea · fresh',folder:'pigeon-pea',aliases:['pigeon pea','pigeonpea','cajanus cajan']},
    {id:'pigeon_pea_dry',label:'Pigeon pea · dry',folder:'pigeon-pea',aliases:[]}
]);
export function fruitWindowSpecies(identity={}){
    const text=[identity.plant,identity.commonName,identity.scientific,identity.scientificName].filter(Boolean).join(' ').toLowerCase().replace(/[_-]/g,' ');
    return FRUIT_WINDOW_LIBRARY.find(item=>item.aliases.some(alias=>text.includes(alias))) || null;
}
export function fruitWindowModes(modes,concept=false){return modes.filter(mode=>mode!=='explore'||concept);}
export function fruitWindowCanPick(asset){return Boolean(asset?.canPick&&!asset.picked&&!asset.motion);}

// Preserve the exact pickup offset. There is no preset inspection destination.
export class FruitWindowTriggerHold {
    source=null;
    begin(source,fruit,pose,time=0){
        if(this.source!==null || source==null || !fruit || !pose?.position || !pose.quaternion)return false;
        this.source=source;this.fruit=fruit;this.startedAt=time;
        this.offset=fruit.position.clone().sub(pose.position).applyQuaternion(pose.quaternion.clone().invert());
        this.rotation=pose.quaternion.clone().invert().multiply(fruit.quaternion);return true;
    }
    update(source,pose){if(source!==this.source || !pose?.position || !pose.quaternion)return false;this.fruit.position.copy(this.offset).applyQuaternion(pose.quaternion).add(pose.position);this.fruit.quaternion.copy(pose.quaternion).multiply(this.rotation);return true;}
    moveDistance(delta){if(this.source===null)return;const length=this.offset.length();if(length>.001)this.offset.multiplyScalar(THREE.MathUtils.clamp(length+delta,.10,1.5)/length);}
    release(source){if(source!==this.source)return false;this.source=null;this.fruit=null;return true;}
    reset(){this.source=null;this.fruit=null;}
    owns(source){return source!=null && source===this.source;}
}

// A rigid pair: controller translation and the axis between grips control the
// object. Wrist aim and the distance between hands never scale the window.
export class FruitWindowGripPair{
    constructor(){this.holds=new Map();this.snapshot=null;}
    press(source,side,point){
        if(!source||!['left','right'].includes(side)||!point||![point.x,point.y,point.z].every(Number.isFinite)||this.holds.has(source)||[...this.holds.values()].some(hold=>hold.side===side))return false;
        this.holds.set(source,{side,point:new THREE.Vector3(point.x,point.y,point.z)});this.snapshot=null;return true;
    }
    release(source){const owned=this.holds.delete(source);this.snapshot=null;return owned;}
    reset(){this.holds.clear();this.snapshot=null;}
    owns(source){return this.holds.has(source);}
    update(points,anchor){
        for(const [source,hold] of this.holds){const point=points.get(source);if(!point||![point.x,point.y,point.z].every(Number.isFinite)){this.release(source);continue;}hold.point.set(point.x,point.y,point.z);}
        if(this.holds.size!==2){this.snapshot=null;return false;}
        const pair=[...this.holds.values()].sort((a,b)=>a.side==='left'?-1:1),left=pair[0].point,right=pair[1].point;
        const axis=right.clone().sub(left);if(axis.length()<.08){this.snapshot=null;return false;}axis.normalize();
        const center=left.clone().add(right).multiplyScalar(.5);
        if(!this.snapshot){this.snapshot={center,axis,position:anchor.position.clone(),quaternion:anchor.quaternion.clone()};return false;}
        const delta=new THREE.Quaternion().setFromUnitVectors(this.snapshot.axis,axis);
        anchor.position.copy(this.snapshot.position).sub(this.snapshot.center).applyQuaternion(delta).add(center);
        anchor.quaternion.copy(delta).multiply(this.snapshot.quaternion);return true;
    }
}
