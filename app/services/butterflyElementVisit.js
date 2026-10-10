const ease=t=>t*t*(3-2*t);
// Existing butterflies leave their perch along a continuous arc. New elements
// are destinations, never spawn points; a journey keeps its destination identity.
export function butterflyElementVisit(insect,home,target,time,reduced=false){
 if(!home)return null;
 if(!insect.visit)insect.visit={id:home.id,perch:home,position:{...home.center},pending:null,nextExplore:time+7000+Math.random()*19000};
 const state=insect.visit,destination=target || home;
 // A moved/rotated perch startles a resting butterfly briefly. Track the
 // surface, rather than the insect's own flight, and share this state per eye.
 const dt=Math.max(.001,(time-(state.perchAt ?? time))/1000),lastPerch=state.lastPerch;
 const motion=lastPerch&&lastPerch.id===destination.id?Math.hypot(destination.center.x-lastPerch.center.x,destination.center.y-lastPerch.center.y,destination.center.z-lastPerch.center.z):0;
 const turn=lastPerch&&lastPerch.id===destination.id?Math.hypot(destination.normal.x-lastPerch.normal.x,destination.normal.y-lastPerch.normal.y,destination.normal.z-lastPerch.normal.z):0;
 if(!reduced && !state.trip && !state.startle && destination.id===state.id && time>=(state.startleAfter || 0) && dt<.25 && (motion>.008 && motion/dt>.38 || turn>.05 && turn/dt>1.2)){
  state.startle={at:time+Math.random()*420,from:{...state.position},perch:destination,duration:1500+Math.random()*3300,phase:Math.random()*Math.PI*2,side:(Math.random()-.5)*.3,lift:.09+Math.random()*.15,reach:.12+Math.random()*.22,lands:Math.random()<.6};state.startleAfter=time+3500+Math.random()*6000;
  state.hover=null;
 }
 state.lastPerch={id:destination.id,center:{...destination.center},normal:{...destination.normal}};state.perchAt=time;
 if(destination.id!==state.id && !state.trip){
  if(state.pending?.id!==destination.id)state.pending={id:destination.id,at:time+800+Math.random()*5300};
  if(time>=state.pending.at && !reduced && !state.startle){const from={...state.position},distance=Math.hypot(destination.center.x-from.x,destination.center.y-from.y,destination.center.z-from.z);state.trip={id:destination.id,from,perch:destination,at:time,duration:Math.max(1600,distance/.55*1000)};state.pending=null;}
 }else if(!state.trip)state.pending=null;
 let position,flight=0,axes=state.perch;
 if(state.startle){const startled=state.startle;
  if(destination.id===state.id)startled.perch=destination;
  const t=Math.min(1,Math.max(0,(time-startled.at)/startled.duration)),s=ease(t),bend=Math.sin(Math.PI*t),to=startled.perch.center,side=startled.side+Math.sin(t*7+startled.phase)*.04;
  position={x:startled.from.x+(to.x-startled.from.x)*s+startled.perch.normal.x*bend*startled.reach+startled.perch.right.x*bend*side,y:startled.from.y+(to.y-startled.from.y)*s+bend*startled.lift,z:startled.from.z+(to.z-startled.from.z)*s+startled.perch.normal.z*bend*startled.reach+startled.perch.right.z*bend*side};
  flight=Math.min(1,t*14,(1-t)*14);axes=startled.perch;
  if(t===1){position={...to};state.perch=startled.perch;state.startle=null;state.nextExplore=time+7000+Math.random()*23000;if(!startled.lands)state.hover={at:time,until:time+3500+Math.random()*10000,phase:Math.random()*6.28,speed:.7+Math.random()*1.4,reach:.07+Math.random()*.12};}
 }else if(state.trip){const trip=state.trip;
  if(destination.id===trip.id)trip.perch=destination;
  const t=Math.min(1,Math.max(0,(time-trip.at)/trip.duration)),s=ease(t),bend=Math.sin(Math.PI*t),to=trip.perch.center;
  position={x:trip.from.x+(to.x-trip.from.x)*s+trip.perch.normal.x*bend*.12,y:trip.from.y+(to.y-trip.from.y)*s+bend*.16,z:trip.from.z+(to.z-trip.from.z)*s+trip.perch.normal.z*bend*.12};
  flight=Math.min(1,t*12,(1-t)*12);axes=trip.perch;
  if(t===1){state.id=trip.id;state.perch=trip.perch;state.trip=null;state.hover=null;state.nextExplore=time+7000+Math.random()*23000;if(!trip.landing && Math.random()<.35)state.hover={at:time,until:time+3000+Math.random()*11000,phase:Math.random()*6.28,speed:.7+Math.random()*1.4,reach:.07+Math.random()*.12};}
 }else {
  if(destination.id===state.id)state.perch=destination;axes=state.perch;
  if(!reduced && !state.hover && time>=state.nextExplore){state.hover={at:time,until:time+2500+Math.random()*8500,phase:Math.random()*6.28,speed:.7+Math.random()*1.4,reach:.07+Math.random()*.12};}
  if(state.hover && !reduced){const h=state.hover,seconds=(time-h.at)/1000,angle=h.phase+seconds*h.speed,amount=Math.min(1,seconds*2),side=Math.sin(angle)*h.reach*amount,depth=(.08+(.5+.5*Math.sin(angle*.73))*h.reach)*amount,rise=(.035+Math.sin(angle*1.37)*.045)*amount,to=axes.center;
   const desired={x:to.x+axes.right.x*side+axes.normal.x*depth,y:to.y+axes.right.y*side+axes.normal.y*depth+rise,z:to.z+axes.right.z*side+axes.normal.z*depth},follow=1-Math.exp(-Math.min(dt,.1)/.16);
   position={x:state.position.x+(desired.x-state.position.x)*follow,y:state.position.y+(desired.y-state.position.y)*follow,z:state.position.z+(desired.z-state.position.z)*follow};flight=1;
   if(time>=h.until){state.trip={id:state.id,from:{...position},perch:axes,at:time,duration:900+Math.random()*2100,landing:true};state.hover=null;}
  }else position={...state.perch.center};
 }
 const previous=state.position,dx=position.x-previous.x,dy=position.y-previous.y,dz=position.z-previous.z;
 const yaw=flight>0?Math.atan2(dx,dz):insect.seed*2.399+Math.atan2(axes.right.z,axes.right.x);
 state.position=position;
 return {position,pose:{state:flight>0?'flying':'landed',flight,yaw,pitch:flight>0?-Math.atan2(dy,Math.hypot(dx,dz)||1)*.3:0,bank:flight>0?Math.sin(time/1100+insect.seed)*.12:0,opacity:1,wingPhase:insect.seed*1.9,size:insect.size}};
}
