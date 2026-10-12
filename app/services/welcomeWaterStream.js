// A short ballistic stream from the nozzle to the soil, with hysteresis
// around the pouring angle and pot edge to tolerate normal tracking jitter.
export function welcomeWaterStream(origin,direction,pot,wasPouring=false){
    if(![origin.x,origin.y,origin.z,direction.x,direction.y,direction.z].every(Number.isFinite) || direction.y>=(wasPouring?-.03:-.08) || origin.y<.095 || origin.y>.65)return null;
    const speed=.18,gravity=9.81,vy=direction.y*speed,height=origin.y-.086;
    const duration=(vy+Math.sqrt(vy*vy+2*gravity*height))/gravity;
    const end={x:origin.x+direction.x*speed*duration,y:.086,z:origin.z+direction.z*speed*duration};
    if(Math.hypot(end.x-pot.x,end.z-pot.z)>(wasPouring?.073:.063))return null;
    return {origin:{...origin},direction:{...direction},duration,speed,gravity,end};
}
export function welcomeWaterDrop(stream,fraction){
    const t=stream.duration*fraction,o=stream.origin,d=stream.direction;
    return {x:o.x+d.x*stream.speed*t,y:o.y+d.y*stream.speed*t-stream.gravity*t*t/2,z:o.z+d.z*stream.speed*t};
}
