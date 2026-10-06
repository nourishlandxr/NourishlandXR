const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{const t=clamp(x);return t*t*(3-2*t);};
export const INSECT_VISUALS=Object.freeze({beeSize:.095,beeFloorClearance:.12,bluePerchMs:60000,redPerchMs:30000,blueSize:.13,redSize:.11});
export function insectFlowerVisit(age,index=0,{enabled=true,period=47000}={}){
 if(!enabled || age<12000)return {amount:0,index:0};
 const time=age+index*11237,cycle=Math.floor(time/period),local=time-cycle*period;
 return {amount:smooth((local-18000)/6000)*(1-smooth((local-29000)/6000)),index:cycle*3+index};
}
export function beeFlowerVisit(age,index=0,{enabled=true}={}){
 if(!enabled || age<0)return {amount:0,index:0};
 const period=18000+index*1700,time=age+index*9173,cycle=Math.floor(time/period),local=time-cycle*period;
 return {amount:1,index:cycle*7+index*11,transfer:local<6500?smooth(local/6500):1,nectar:local>=7500 && local<period-1200};
}
export function beeCuriosity(progress){
 const t=clamp(progress);
 return {x:Math.sin(t*Math.PI*3)*.07,y:Math.sin(t*Math.PI*4)*.045,z:Math.sin(t*Math.PI*2)*.09,headTurn:Math.sin(t*Math.PI*4)*.24,bank:Math.sin(t*Math.PI*3)*.10,pitch:Math.sin(t*Math.PI*2)*.08};
}
export function keepInsectAboveFloor(position,floor,clearance=INSECT_VISUALS.beeFloorClearance){
 return {...position,y:Math.max(position.y,Number.isFinite(floor)?floor+clearance:position.y)};
}
export function butterflyFlightPoint(time,seed=0){
 const phase=time*.23+seed*1.73;
 return {x:Math.sin(phase)*.64+Math.sin(phase*.47)*.16,y:.18+Math.sin(phase*.71)*.22,z:.28+Math.sin(phase*.63)*.26};
}
export function butterflyFlightHeading(time,seed=0){
 const a=butterflyFlightPoint(time,seed),b=butterflyFlightPoint(time+.03,seed),dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z;
 return {yaw:Math.atan2(dx,dz),pitch:-Math.atan2(dy,Math.hypot(dx,dz))*.4,bank:Math.sin(time*.23+seed)*.14};
}
