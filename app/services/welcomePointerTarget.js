// All tutorial surfaces compete by distance, in the same world reference space.
export function nearestWelcomePointerHit(ray,...hits){
    if(!ray?.origin || !ray.direction)return null;
    const valid=hits.filter(hit=>hit && Number.isFinite(hit.distance) && hit.distance>0);
    const hit=valid.sort((a,b)=>a.distance-b.distance)[0];
    if(!hit)return null;
    const point=hit.worldPoint || {x:ray.origin.x+ray.direction.x*hit.distance,y:ray.origin.y+ray.direction.y*hit.distance,z:ray.origin.z+ray.direction.z*hit.distance};
    return {...hit,worldPoint:point};
}
