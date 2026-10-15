// Surface distance uses the fruit's oriented bounds, never its longest-axis sphere.
export function fruitPointDistance(body,point){
    const q=body.rotation || {x:0,y:0,z:0,w:1},x=point.x-body.position.x,y=point.y-body.position.y,z=point.z-body.position.z;
    const tx=-2*(q.y*z-q.z*y),ty=-2*(q.z*x-q.x*z),tz=-2*(q.x*y-q.y*x);
    const local={x:x+q.w*tx-q.y*tz+q.z*ty,y:y+q.w*ty-q.z*tx+q.x*tz,z:z+q.w*tz-q.x*ty+q.y*tx};
    return Math.hypot(...['x','y','z'].map(axis=>Math.max(0,Math.abs(local[axis])-body.halfSize[axis])));
}
// Conservative support bounds include the graphics in their current pose.
export function fruitExtents(body){
    const h=body.halfSize,{x,y,z,w}=body.rotation;
    return {x:Math.abs(1-2*(y*y+z*z))*h.x+Math.abs(2*(x*y-z*w))*h.y+Math.abs(2*(x*z+y*w))*h.z,
        y:Math.abs(2*(x*y+z*w))*h.x+Math.abs(1-2*(x*x+z*z))*h.y+Math.abs(2*(y*z-x*w))*h.z,
        z:Math.abs(2*(x*z-y*w))*h.x+Math.abs(2*(y*z+x*w))*h.y+Math.abs(1-2*(x*x+y*y))*h.z};
}
export function constrainFruitNeighbours(body,next,old,fruits){
    const h=fruitExtents(body),position={...old},remaining={x:next.x-old.x,y:next.y-old.y,z:next.z-old.z};
    // Sweep to the first surface, then preserve tangential motion. A contact
    // must never freeze the vertical lift needed to remove fruit from a pile.
    for(let pass=0;pass<3;pass++){
        let earliest=1,normal=null;
        for(const other of fruits){if(other===body || !other.visible || other.plantAttached)continue;
            const k=fruitExtents(other);let enter=0,exit=1,inside=true,axisHit=null;
            for(const axis of ['x','y','z']){const r=h[axis]+k[axis]+.004,o=position[axis]-other.position[axis],d=remaining[axis];inside &&= Math.abs(o)<r;
                if(Math.abs(d)<1e-8){if(Math.abs(o)>=r){exit=-1;break;}}
                else {const a=(-r-o)/d,b=(r-o)/d,near=Math.min(a,b);if(near>enter){enter=near;axisHit=axis;}exit=Math.min(exit,Math.max(a,b));}}
            if(!inside && axisHit && enter<=exit && exit>=0 && enter>=0 && enter<earliest){earliest=Math.max(0,enter-.002);normal=axisHit;}
        }
        for(const axis of ['x','y','z']){position[axis]+=remaining[axis]*earliest;remaining[axis]*=1-earliest;}
        if(!normal)break;remaining[normal]=0;
    }
    Object.assign(next,position);
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
