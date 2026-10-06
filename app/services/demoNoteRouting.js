// A Note showcase owns only its visible surface, never all XR input.
export function noteSurfaceOwnsRay(noteHit,otherHits=[]){
    return Boolean(noteHit && Number.isFinite(noteHit.distance) && otherHits.filter(Boolean).every(hit=>noteHit.distance<hit.distance-.002));
}
