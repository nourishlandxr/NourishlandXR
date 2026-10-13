// Pack resting fruit by its measured dimensions, inside the basket wall.
export function welcomeBasketSlot(body, occupied, desired={x:0,z:0},radius=.215) {
    const original=body.halfSize,s=Math.SQRT1_2;
    const rotation=original.z<original.y && original.z<=original.x?{x:s,y:0,z:0,w:s}:original.x<original.y?{x:0,y:0,z:s,w:s}:{x:0,y:0,z:0,w:1};
    const h=rotation.x?{x:original.x,y:original.z,z:original.y}:rotation.z?{x:original.y,y:original.x,z:original.z}:{...original};
    const clearance=.009;
    let best=null;
    for(let x=-.20;x<=.201;x+=.018)for(let z=-.20;z<=.201;z+=.018){
        if(Math.hypot(Math.abs(x)+h.x,Math.abs(z)+h.z)>radius)continue;
        let y=.012+h.y;
        for(const other of occupied){const p=other.slot,k=p.halfSize || other.body.halfSize;
            if(Math.abs(x-p.x)<h.x+k.x+clearance && Math.abs(z-p.z)<h.z+k.z+clearance)y=Math.max(y,p.y+k.y+h.y+clearance);
        }
        const score=y*10+Math.hypot(x-desired.x,z-desired.z);
        if(!best || score<best.score)best={x,y,z,score,halfSize:h,rotation};
    }
    return best;
}
