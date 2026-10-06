import {butterflyFlightPoint,butterflyFlightHeading} from './demoInsectFlight.js';
const smooth=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
export const BUTTERFLY_PERCH_MS=60000;
export const BUTTERFLY_TAKEOFF_MS=4500;
export function butterflyDropSurface(position,hits,tolerance=.12){
    if(!position)return null;
    return hits.map(hit=>hit?.point || hit?.position).filter(point=>point && Math.hypot(point.x-position.x,point.y-position.y,point.z-position.z)<=tolerance)
        .sort((a,b)=>Math.hypot(a.x-position.x,a.y-position.y,a.z-position.z)-Math.hypot(b.x-position.x,b.y-position.y,b.z-position.z))[0] || null;
}
export function demoButterflyPose(elapsed,startedAt,{reducedMotion=false,perchMs=BUTTERFLY_PERCH_MS,seed=0}={}){
    if(!Number.isFinite(startedAt) || elapsed<startedAt)return null;
    const age=elapsed-startedAt,time=Math.max(0,age-perchMs)/1000;
    if(reducedMotion || age<perchMs)return {state:'landed',flight:0,x:0,y:0,z:0,yaw:.45,bank:0,pitch:0,close:0,opacity:smooth(age/1600)};
    const flight=smooth((age-perchMs)/BUTTERFLY_TAKEOFF_MS);
    // Gentle uneven loops with a few spaced approaches. The world origin is
    // captured on takeoff, so head movement never drags the insect around.
    const loop=time*.23,period=57+seed*7,window=Math.floor(time/period),local=time-window*period;
    const close=window>0?smooth((local-9)/5)*(1-smooth((local-21)/6)):0;
    const point=butterflyFlightPoint(time,seed),heading=butterflyFlightHeading(time,seed);
    return {state:flight<1?'takeoff':'flying',flight,x:point.x*flight,y:point.y*flight,z:point.z*flight,
        ...heading,close,encounterIndex:window,opacity:1};
}
