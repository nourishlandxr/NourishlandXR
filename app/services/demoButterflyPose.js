const smooth=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
export const BUTTERFLY_PERCH_MS=60000;
export const BUTTERFLY_TAKEOFF_MS=4500;
export function demoButterflyPose(elapsed,startedAt,{reducedMotion=false}={}){
    if(!Number.isFinite(startedAt) || elapsed<startedAt)return null;
    const age=elapsed-startedAt,time=Math.max(0,age-BUTTERFLY_PERCH_MS)/1000;
    if(reducedMotion || age<BUTTERFLY_PERCH_MS)return {state:'landed',flight:0,x:0,y:0,z:0,yaw:.45,bank:0,close:0,opacity:smooth(age/1600)};
    const flight=smooth((age-BUTTERFLY_PERCH_MS)/BUTTERFLY_TAKEOFF_MS);
    // Gentle uneven loops with a few spaced approaches. The world origin is
    // captured on takeoff, so head movement never drags the insect around.
    const loop=time*.23,window=Math.floor(time/57),local=time-window*57;
    const close=window>0?smooth((local-9)/5)*(1-smooth((local-21)/6)):0;
    return {state:flight<1?'takeoff':'flying',flight,
        x:(Math.sin(loop)*.64+Math.sin(loop*.47)*.16)*flight,
        y:(.18+Math.sin(loop*.71)*.22)*flight,
        z:(.28+Math.sin(loop*.63)*.26)*flight,
        yaw:Math.atan2(Math.cos(loop),Math.cos(loop*.63)*.35),
        bank:Math.sin(loop)*.14,close,encounterIndex:window,opacity:1};
}
