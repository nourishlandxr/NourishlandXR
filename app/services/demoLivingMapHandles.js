import * as THREE from '../vendor/three.module.min.js';
import {LIVING_MAP_WORLD_SCALE as SCALE} from './demoLivingMapReveal.js';
// The rounded timber ring and its pickup surface share dimensions.
export const LIVING_MAP_HANDLE_X=0;
export const LIVING_MAP_HANDLE_Z=6.55;
const radius=LIVING_MAP_HANDLE_Z*SCALE,tube=.24*SCALE,height=.04*SCALE;
const q=r=>new THREE.Quaternion(r?.x || 0,r?.y || 0,r?.z || 0,r?.w ?? 1).normalize();
const v=p=>new THREE.Vector3(p.x,p.y,p.z);
const valid=p=>p && [p.x,p.y,p.z].every(Number.isFinite);
export function livingMapHandleContact(point,origin,rotation){
 if(!valid(point) || !valid(origin))return null;
 const local=v(point).sub(v(origin)).applyQuaternion(q(rotation).invert());
 return Math.hypot(Math.hypot(local.x,local.z)-radius,local.y-height)<=tube+.04?local:null;
}
export function livingMapHandleAnchor(local){const length=Math.hypot(local.x,local.z)||1;return new THREE.Vector3(local.x/length*radius,height+tube,local.z/length*radius);}
export function livingMapHandleRayHit(ray,origin,rotation){
 if(!valid(ray?.origin) || !valid(ray?.direction) || !valid(origin))return null;
 const inverse=q(rotation).invert(),direction=v(ray.direction);if(direction.lengthSq()<1e-8)return null;
 const cast=new THREE.Ray(v(ray.origin).sub(v(origin)).applyQuaternion(inverse),direction.normalize().applyQuaternion(inverse));let result=null;
 for(let i=0;i<64;i++){
  const angle=i*Math.PI/32,center=new THREE.Vector3(Math.sin(angle)*radius,height,Math.cos(angle)*radius);
  const hit=cast.intersectSphere(new THREE.Sphere(center,tube+.035),new THREE.Vector3());if(!hit)continue;
  const distance=hit.distanceTo(cast.origin);if(distance>3 || result && distance>=result.distance)continue;
  const local=livingMapHandleAnchor(hit),point=local.clone().applyQuaternion(q(rotation)).add(v(origin));result={side:0,local,point,distance};
 }return result;
}
export function createLivingMapHandles({geometry,mesh}){
 const ring=new THREE.Group();ring.name='Rounded timber grip ring';
 const bar=mesh(geometry(new THREE.TorusGeometry(LIVING_MAP_HANDLE_Z,.24,12,96)),'#a78154',0,.04,0,1,1,1,ring);bar.rotation.x=-Math.PI/2;
 const inlay=mesh(geometry(new THREE.TorusGeometry(LIVING_MAP_HANDLE_Z,.018,6,96)),'#d1bd91',0,.28,0,1,1,1,ring);inlay.rotation.x=-Math.PI/2;
 return [ring];
}
