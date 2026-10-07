import * as THREE from '../vendor/three.module.min.js';
const smooth = value => { const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t); };
export const LIVING_MAP_REVEAL_READY_MS=9800;
export function livingMapGreeneryProgress(elapsed,index=0,reduced=false){return reduced?1:smooth((elapsed-5700-Math.min(7,index)*90)/2300);}
// Reading time is preserved even when motion is reduced.
export function livingMapReveal(elapsed,reduced=false){
    const dissolve=smooth((elapsed-4400)/(reduced?450:2600));
    const appear=smooth((elapsed-(reduced?4850:5700))/(reduced?450:4100));
    return {preview:1-dissolve,dissolve,appear,ready:elapsed>=LIVING_MAP_REVEAL_READY_MS,
        magic:reduced?0:Math.sin(Math.PI*smooth((elapsed-4400)/3200))};
}
export const LIVING_MAP_WORLD_SCALE=.085;
export const LIVING_MAP_SURFACE_HALF_WIDTH=6.3*LIVING_MAP_WORLD_SCALE;
export const LIVING_MAP_SURFACE_HALF_DEPTH=4.2*LIVING_MAP_WORLD_SCALE;
// The loose miniature must be pickable from the side as well as the front.
export function livingMapTotemRayHit(ray,center,radius=null){
    if(!ray?.origin || !ray.direction || !center)return null;
    const start=new THREE.Vector3(ray.origin.x,ray.origin.y,ray.origin.z),direction=new THREE.Vector3(ray.direction.x,ray.direction.y,ray.direction.z);
    if(direction.lengthSq()<1e-8)return null;
    direction.normalize();
    const cast=new THREE.Ray(start,direction);
    const point=radius===null?cast.intersectBox(new THREE.Box3(new THREE.Vector3(center.x-.035,center.y-.095,center.z-.035),new THREE.Vector3(center.x+.035,center.y+.115,center.z+.035)),new THREE.Vector3()):cast.intersectSphere(new THREE.Sphere(new THREE.Vector3(center.x,center.y,center.z),radius),new THREE.Vector3());
    return point?{distance:point.distanceTo(start),point:{x:point.x,y:point.y,z:point.z},radius}:null;
}
export function livingMapRotation(value=0){
    return typeof value==='number'?new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),value):new THREE.Quaternion(value.x,value.y,value.z,value.w).normalize();
}
export function livingMapWorldPoint(item,origin,rotation=0){
    const point=new THREE.Vector3(item.x,item.y ?? .1,item.z).multiplyScalar(LIVING_MAP_WORLD_SCALE).applyQuaternion(livingMapRotation(rotation));
    return {x:origin.x+point.x,y:origin.y+point.y,z:origin.z+point.z};
}
export function livingMapRayPoint(ray,origin,rotation=0){
    if(!ray?.origin || !ray.direction)return null;
    const normal=new THREE.Vector3(0,1,0).applyQuaternion(livingMapRotation(rotation)),surface=livingMapWorldPoint({x:0,y:.1,z:0},origin,rotation);
    const start=new THREE.Vector3(ray.origin.x,ray.origin.y,ray.origin.z),direction=new THREE.Vector3(ray.direction.x,ray.direction.y,ray.direction.z).normalize(),denominator=normal.dot(direction);
    if(Math.abs(denominator)<.001)return null;
    const distance=new THREE.Vector3(surface.x,surface.y,surface.z).sub(start).dot(normal)/denominator;
    if(distance<0 || distance>4)return null;
    const point=start.addScaledVector(direction,distance),local=point.clone().sub(new THREE.Vector3(origin.x,origin.y,origin.z)).applyQuaternion(livingMapRotation(rotation).invert()).multiplyScalar(1/LIVING_MAP_WORLD_SCALE);
    if((local.x/6.3)**2+(local.z/4.2)**2>1)return null;
    return {x:point.x,y:point.y,z:point.z};
}
export function livingMapWorldDropAccepted(point,target){
    return Boolean(point && target && Math.hypot(point.x-target.x,point.z-target.z)<.085 && Math.abs(point.y-target.y)<.13);
}
export function livingMapHeldContact(point,origin,rotation=0){
    if(!point || !origin)return null;
    const normal=new THREE.Vector3(0,1,0).applyQuaternion(livingMapRotation(rotation));
    const contact=livingMapRayPoint({origin:{x:point.x+normal.x,y:point.y+normal.y,z:point.z+normal.z},direction:{x:-normal.x,y:-normal.y,z:-normal.z}},origin,rotation);
    return contact && Math.hypot(point.x-contact.x,point.y-contact.y,point.z-contact.z)<.30?contact:null;
}
export function drawLivingMapPreview(ctx,scene,elapsed,reduced,rect){
    const reveal=livingMapReveal(elapsed,reduced);
    if(reveal.preview<=0)return;
    ctx.save();ctx.globalAlpha=reveal.preview;
    // A continuous luminous fade avoids the former coarse checkerboard breakup.
    if(reveal.magic>0){ctx.shadowColor='#d5ffb4';ctx.shadowBlur=24*reveal.magic;}
    // The reading preview already contains its landscape. Growth belongs to
    // the spatial reveal, whose clock starts only after Continue.
    scene.draw(ctx,elapsed,elapsed===0?true:reduced,rect);ctx.restore();
    if(reveal.magic>0){
        ctx.save();ctx.fillStyle='#f0ffd1';ctx.globalAlpha=reveal.magic*.65;ctx.shadowColor='#d5ffb4';ctx.shadowBlur=10;
        for(let i=0;i<24;i++){const t=(elapsed-4400)/1700,x=rect.x+rect.width*((i*.618)%1),y=rect.y+rect.height*((i*.381)%1)-t*(20+i%7*12);ctx.beginPath();ctx.arc(x+Math.sin(t*3+i)*14,y,.8+i%3*.35,0,Math.PI*2);ctx.fill();}
        ctx.restore();
    }
}
