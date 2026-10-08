import * as THREE from '../vendor/three.module.min.js';
import {LIVING_MAP_WORLD_SCALE as SCALE} from './demoLivingMapReveal.js';

// Shared dimensions keep the visible raised handles and their capture areas
// together. Totem targets remain round and lie inside the landscape.
export const LIVING_MAP_HANDLE_X=6.05;
export const LIVING_MAP_HANDLE_POINTS=Object.freeze([
    [0,.10,-.58],[0,.36,-.42],[0,.42,0],[0,.36,.42],[0,.10,.58]
]);
const curve=new THREE.CatmullRomCurve3(LIVING_MAP_HANDLE_POINTS.map(p=>new THREE.Vector3(...p)));
const handleSegments=Array.from({length:17},(_,i)=>curve.getPoint(i/16).multiplyScalar(SCALE));
const handleLines=handleSegments.slice(1).map((point,i)=>new THREE.Line3(handleSegments[i],point));
const half=new THREE.Vector3(.18,.23,.66).multiplyScalar(SCALE);
const q=rotation=>new THREE.Quaternion(rotation?.x || 0,rotation?.y || 0,rotation?.z || 0,rotation?.w ?? 1).normalize();
const v=point=>new THREE.Vector3(point.x,point.y,point.z);
const valid=point=>point && [point.x,point.y,point.z].every(Number.isFinite);
function inHandle(local,padding){
    const dx=Math.abs(local.x)-LIVING_MAP_HANDLE_X*SCALE;
    return Math.abs(dx)<=half.x+padding && Math.abs(local.y-.26*SCALE)<=half.y+padding && Math.abs(local.z)<=half.z+padding;
}
export function livingMapHandleContact(point,origin,rotation){
    if(!valid(point) || !valid(origin))return null;
    const local=v(point).sub(v(origin)).applyQuaternion(q(rotation).invert());
    return inHandle(local,.04)?local:null;
}
// Snap a forgiving capture to the actual bar, so the held beam visibly ends
// on the handle rather than hovering beside its larger capture area.
export function livingMapHandleAnchor(local){
    const center=Math.sign(local.x)*LIVING_MAP_HANDLE_X*SCALE;
    const relative=local.clone();relative.x-=center;
    const nearest=new THREE.Vector3(),point=new THREE.Vector3();let distance=Infinity;
    for(const line of handleLines){
        line.closestPointToPoint(relative,true,point);
        const squared=point.distanceToSquared(relative);if(squared<distance){nearest.copy(point);distance=squared;}
    }
    const normal=relative.clone().sub(nearest);if(normal.lengthSq()<1e-8)normal.set(0,1,0);else normal.normalize();
    return nearest.addScaledVector(normal,.08*SCALE).add(new THREE.Vector3(center,0,0));
}
export function livingMapHandleRayHit(ray,origin,rotation){
    if(!valid(ray?.origin) || !valid(ray?.direction) || !valid(origin))return null;
    const inverse=q(rotation).invert(),direction=v(ray.direction);if(direction.lengthSq()<1e-8)return null;
    const localRay=new THREE.Ray(v(ray.origin).sub(v(origin)).applyQuaternion(inverse),direction.normalize().applyQuaternion(inverse));
    let result=null;
    for(const side of [-1,1]){
        const center=new THREE.Vector3(side*LIVING_MAP_HANDLE_X*SCALE,.26*SCALE,0),size=half.clone().addScalar(.025);
        const contact=localRay.intersectBox(new THREE.Box3(center.clone().sub(size),center.clone().add(size)),new THREE.Vector3());
        if(!contact)continue;
        const distance=contact.distanceTo(localRay.origin);if(distance>3 || result && distance>=result.distance)continue;
        const local=livingMapHandleAnchor(contact),point=local.clone().applyQuaternion(q(rotation)).add(v(origin));
        result={side,local,point,distance};
    }
    return result;
}
export function createLivingMapHandles({geometry,mesh}){
    const bar=geometry(new THREE.TubeGeometry(curve,16,.08,6,false));
    const foot=geometry(new THREE.CylinderGeometry(1,1,1,8));
    const rib=geometry(new THREE.TorusGeometry(.087,.018,4,8));
    return [-1,1].map(side=>{
        const group=new THREE.Group();group.name=side<0?'Left tray handle':'Right tray handle';group.position.x=side*LIVING_MAP_HANDLE_X;
        mesh(bar,'#91b8b1',0,0,0,1,1,1,group);
        for(const z of [-.58,.58])mesh(foot,'#607c76',0,.07,z,.16,.13,.16,group);
        for(let i=0;i<5;i++){
            const t=.28+i*.11,p=curve.getPointAt(t),node=mesh(rib,'#c6dfd5',p.x,p.y,p.z,1,1,1,group);
            node.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),curve.getTangentAt(t));
        }
        return group;
    });
}
