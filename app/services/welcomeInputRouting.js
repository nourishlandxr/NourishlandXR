// Preserve a panel gesture from its first press through its final release.
// The tutorial and the standard panel share one XR session.
export function createWelcomeInputRouting({ownsPanel=()=>false,holdsObject=()=>false,hitPanel=()=>null,now=()=>performance.now()}={}){
    const gestures=new WeakMap();
    const occupied=source=>ownsPanel(source) || now()<(gestures.get(source) || 0);
    return {occupied,routeToPanel(source,ray){
        if(holdsObject(source))return false;
        if(!occupied(source) && !hitPanel(ray))return false;
        gestures.set(source,now()+700);return true;
    }};
}
