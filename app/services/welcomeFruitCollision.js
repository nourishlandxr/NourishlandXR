// Conservative bounds include the full fruit graphics in their current pose.
export function fruitExtents(body){
    const h=body.halfSize,{x,y,z,w}=body.rotation;
    return {x:Math.abs(1-2*(y*y+z*z))*h.x+Math.abs(2*(x*y-z*w))*h.y+Math.abs(2*(x*z+y*w))*h.z,
        y:Math.abs(2*(x*y+z*w))*h.x+Math.abs(1-2*(x*x+z*z))*h.y+Math.abs(2*(y*z-x*w))*h.z,
        z:Math.abs(2*(x*z-y*w))*h.x+Math.abs(2*(y*z+x*w))*h.y+Math.abs(1-2*(x*x+y*y))*h.z};
}
export function constrainFruitNeighbours(body,next,old,fruits){
    const h=fruitExtents(body),delta={x:next.x-old.x,y:next.y-old.y,z:next.z-old.z};let earliest=1;
    for(const other of fruits){if(other===body || !other.visible || other.plantAttached)continue;const k=fruitExtents(other);let enter=0,exit=1,inside=true;
        for(const axis of ['x','y','z']){const r=h[axis]+k[axis]+.004,o=old[axis]-other.position[axis],d=delta[axis];inside &&= Math.abs(o)<r;if(Math.abs(d)<1e-8){if(Math.abs(o)>=r){exit=-1;break;}}else {const a=(-r-o)/d,b=(r-o)/d;enter=Math.max(enter,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));}}
        if(!inside && enter<=exit && exit>=0 && enter>=0 && enter<earliest)earliest=Math.max(0,enter-.002);
    }
    if(earliest<1)for(const axis of ['x','y','z'])next[axis]=old[axis]+delta[axis]*earliest;
    return next;
}
export function fruitOverlaps(body,position,other){
    const a=fruitExtents(body),b=fruitExtents(other);return ['x','y','z'].every(axis=>Math.abs(position[axis]-other.position[axis])<a[axis]+b[axis]+.002);
}
export function separateFruitBodies(a,b){
    const fixedA=a.held || a.basketed || a.anchored,fixedB=b.held || b.basketed || b.anchored;if(fixedA && fixedB)return;
    const h=fruitExtents(a),k=fruitExtents(b),overlap={};for(const axis of ['x','y','z']){overlap[axis]=h[axis]+k[axis]+.003-Math.abs(a.position[axis]-b.position[axis]);if(overlap[axis]<=0)return;}
    const axis=Object.keys(overlap).sort((x,y)=>overlap[x]-overlap[y])[0],direction=b.position[axis]>=a.position[axis]?1:-1,amount=overlap[axis];
    if(!fixedA){a.position[axis]-=direction*amount*(fixedB?1:.5);a.velocity[axis]=0;}
    if(!fixedB){b.position[axis]+=direction*amount*(fixedA?1:.5);b.velocity[axis]=0;}
}
