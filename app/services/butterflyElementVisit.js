const ease=t=>t*t*(3-2*t);
// Existing butterflies leave their perch along a continuous arc. New elements
// are destinations, never spawn points; a journey keeps its destination identity.
export function butterflyElementVisit(insect,home,target,time,reduced=false){
 if(!home)return null;
 if(!insect.visit)insect.visit={id:home.id,perch:home,position:{...home.center},pending:null};
 const state=insect.visit,destination=target || home;
 if(destination.id!==state.id && !state.trip){
  if(state.pending?.id!==destination.id)state.pending={id:destination.id,at:time+2200+insect.seed*650};
  if(time>=state.pending.at && !reduced){const from={...state.position},distance=Math.hypot(destination.center.x-from.x,destination.center.y-from.y,destination.center.z-from.z);state.trip={id:destination.id,from,perch:destination,at:time,duration:Math.max(6000,distance/.22*1000)};state.pending=null;}
 }else if(!state.trip)state.pending=null;
 let position,flight=0,axes=state.perch;
 if(state.trip){const trip=state.trip;
  if(destination.id===trip.id)trip.perch=destination;
  const t=Math.min(1,Math.max(0,(time-trip.at)/trip.duration)),s=ease(t),bend=Math.sin(Math.PI*t),to=trip.perch.center;
  position={x:trip.from.x+(to.x-trip.from.x)*s+trip.perch.normal.x*bend*.12,y:trip.from.y+(to.y-trip.from.y)*s+bend*.16,z:trip.from.z+(to.z-trip.from.z)*s+trip.perch.normal.z*bend*.12};
  flight=Math.min(1,t*12,(1-t)*12);axes=trip.perch;
  if(t===1){state.id=trip.id;state.perch=trip.perch;state.trip=null;}
 }else {if(destination.id===state.id)state.perch=destination;position={...state.perch.center};axes=state.perch;}
 const previous=state.position,dx=position.x-previous.x,dy=position.y-previous.y,dz=position.z-previous.z;
 const yaw=flight>0?Math.atan2(dx,dz):insect.seed*2.399+Math.atan2(axes.right.z,axes.right.x);
 state.position=position;
 return {position,pose:{state:flight>0?'flying':'landed',flight,yaw,pitch:flight>0?-Math.atan2(dy,Math.hypot(dx,dz)||1)*.3:0,bank:flight>0?Math.sin(time/1100+insect.seed)*.12:0,opacity:1,wingPhase:insect.seed*1.9,size:insect.size}};
}
