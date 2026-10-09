import {butterflyFlightPoint,butterflyFlightHeading} from './demoInsectFlight.js';
const smooth=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
const insectHeading=(point,seed)=>Math.atan2(point.x+Math.sin(seed*1.73)*.1,point.z+.28);
export const BUTTERFLY_PERCH_MS=60000;
export const BUTTERFLY_TAKEOFF_MS=4500;
export const BUTTERFLY_FLIGHT_CYCLE_SECONDS=36;
export const BUTTERFLY_LAND_SECONDS=5.5;
export const BUTTERFLY_MOVEMENT_SPEED=1.55;
export function butterflyDropSurface(position,hits,tolerance=.12){
    if(!position)return null;
    return hits.map(hit=>hit?.point || hit?.position).filter(point=>point && Math.hypot(point.x-position.x,point.y-position.y,point.z-position.z)<=tolerance)
        .sort((a,b)=>Math.hypot(a.x-position.x,a.y-position.y,a.z-position.z)-Math.hypot(b.x-position.x,b.y-position.y,b.z-position.z))[0] || null;
}
export function demoButterflyPose(elapsed,startedAt,{reducedMotion=false,perchMs=BUTTERFLY_PERCH_MS,seed=0}={}){
    if(!Number.isFinite(startedAt) || elapsed<startedAt)return null;
    const age=elapsed-startedAt,time=Math.max(0,age-perchMs)/1000;
    const perchWiggle=(!reducedMotion && age<perchMs)?(elapsed/1000+seed*2.17):0;
    const resting={x:Math.sin(perchWiggle*1.7+seed)*.006,y:0,z:0,yaw:seed*2.399+Math.sin(perchWiggle*.8+seed)*.22};
    if(reducedMotion || age<perchMs)return {state:'landed',flight:0,...resting,bank:0,pitch:0,close:0,opacity:smooth(age/1600)};
    const takeoff=smooth((age-perchMs)/BUTTERFLY_TAKEOFF_MS);
    // Gentle uneven loops with a few spaced approaches. The world origin is
    // captured on takeoff, so head movement never drags the insect around.
    const flightPeriod=BUTTERFLY_FLIGHT_CYCLE_SECONDS+seed*4,cycle=flightPeriod+BUTTERFLY_LAND_SECONDS,window=Math.floor((time+BUTTERFLY_LAND_SECONDS)/cycle),local=(time+BUTTERFLY_LAND_SECONDS)-window*cycle,landStart=flightPeriod;
    const landing=smooth((local-landStart)/1.4);
    const flightTime=(window*flightPeriod+Math.min(local,landStart))*BUTTERFLY_MOVEMENT_SPEED;
    const flightPoint=butterflyFlightPoint(flightTime,seed),flightHeading=butterflyFlightHeading(flightTime,seed);
    const perchPoint=butterflyFlightPoint((window*flightPeriod+landStart)*BUTTERFLY_MOVEMENT_SPEED,seed);
    const landed=local>=landStart+1.4;
    const point={x:flightPoint.x+(perchPoint.x-flightPoint.x)*landing,y:flightPoint.y+(perchPoint.y-flightPoint.y)*landing,z:flightPoint.z+(perchPoint.z-flightPoint.z)*landing};
    const heading=landed?{yaw:insectHeading(perchPoint,seed)+Math.sin(time*.65+seed)*.12,pitch:0,bank:0}:flightHeading;
    const close=0;
    const flight=takeoff*(1-landing);
    return {state:landed?'landed':flight<1?'takeoff':'flying',flight,x:point.x*flight,y:point.y*flight,z:point.z*flight,
        ...heading,close,encounterIndex:window,opacity:1};
}
