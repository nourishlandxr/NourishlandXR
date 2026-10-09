import * as THREE from '../assets/fruit-window/vendor/three.module.js';

export const FRUIT_WINDOW_LIBRARY=Object.freeze([
    {id:'mamey_sapote',scientific:'Pouteria sapota',image:new URL('../assets/fruit-window/photos/mamey-sapote.png',import.meta.url).href,label:'Mamey sapote',folder:'mamey-african',aliases:['mamey','pouteria sapota']},
    {id:'african_peach',scientific:'Sarcocephalus latifolius',image:new URL('../assets/fruit-window/photos/african-peach.png',import.meta.url).href,label:'African peach',folder:'mamey-african',aliases:['african peach','nauclea latifolia','sarcocephalus latifolius']},
    {id:'carambola',scientific:'Averrhoa carambola',image:new URL('../assets/fruit-window/photos/carambola.png',import.meta.url).href,label:'Star fruit',folder:'carambola-bayberry',aliases:['carambola','star fruit','starfruit','averrhoa carambola']},
    {id:'chinese_bayberry',scientific:'Morella rubra',image:new URL('../assets/fruit-window/photos/chinese-bayberry.png',import.meta.url).href,label:'Chinese bayberry',folder:'carambola-bayberry',aliases:['bayberry','yangmei','morella rubra','myrica rubra']},
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
    holds=new Map();pair=null;
    get source(){return this.holds.keys().next().value ?? null;}
    begin(source,fruit,pose,time=0){
        if(this.holds.size>=2 || this.holds.has(source) || source==null || !fruit || !pose?.position || !pose.quaternion)return false;
        this.holds.set(source,{fruit,position:pose.position.clone(),quaternion:pose.quaternion.clone(),startedAt:time,offset:fruit.position.clone().sub(pose.position).applyQuaternion(pose.quaternion.clone().invert()),rotation:pose.quaternion.clone().invert().multiply(fruit.quaternion)});
        const pair=[...this.holds.values()];
        if(pair.length===2 && pair[0].fruit===pair[1].fruit){const center=pair[0].position.clone().add(pair[1].position).multiplyScalar(.5);this.pair={distance:pair[0].position.distanceTo(pair[1].position),center,position:fruit.position.clone(),fruit};}return true;
    }
    update(source,pose){const hold=this.holds.get(source);if(!hold || !pose?.position || !pose.quaternion)return false;hold.position.copy(pose.position);hold.quaternion.copy(pose.quaternion);if(this.pair){const pair=[...this.holds.values()],center=pair[0].position.clone().add(pair[1].position).multiplyScalar(.5);this.pair.fruit.position.copy(this.pair.position).add(center.sub(this.pair.center));}else {hold.fruit.position.copy(hold.offset).applyQuaternion(pose.quaternion).add(pose.position);hold.fruit.quaternion.copy(pose.quaternion).multiply(hold.rotation);}return true;}
    pullProgress(){if(!this.pair)return 0;const pair=[...this.holds.values()];return THREE.MathUtils.clamp((pair[0].position.distanceTo(pair[1].position)-this.pair.distance-.025)/.13,0,1);}
    separate(parts){const pair=[...this.holds.values()];this.pair=null;for(let i=0;i<Math.min(2,parts.length,pair.length);i++){const hold=pair[i];hold.fruit=parts[i];hold.offset=parts[i].position.clone().sub(hold.position).applyQuaternion(hold.quaternion.clone().invert());hold.rotation=hold.quaternion.clone().invert().multiply(parts[i].quaternion);}}
    moveDistance(delta,source=this.source){const hold=this.holds.get(source);if(!hold)return;const length=hold.offset.length();if(length>.001)hold.offset.multiplyScalar(THREE.MathUtils.clamp(length+delta,.10,1.5)/length);}
    release(source){if(!this.holds.delete(source))return false;this.pair=null;for(const hold of this.holds.values()){hold.offset=hold.fruit.position.clone().sub(hold.position).applyQuaternion(hold.quaternion.clone().invert());hold.rotation=hold.quaternion.clone().invert().multiply(hold.fruit.quaternion);}return true;}
    reset(){this.holds.clear();this.pair=null;}
    owns(source){return this.holds.has(source);}
}

// Move the rigid window with the midpoint of both grips. Keep its orientation
// steady; joystick depth adjustment is independent of wrist aim.
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
        anchor.position.copy(this.snapshot.position).add(center.clone().sub(this.snapshot.center));
        anchor.quaternion.copy(this.snapshot.quaternion);return true;
    }
    moveDepth(delta,forward,anchor){if(!this.snapshot || !Number.isFinite(delta))return;const offset=new THREE.Vector3(forward.x,forward.y,forward.z).normalize().multiplyScalar(delta);this.snapshot.position.add(offset);anchor.position.add(offset);}
}
