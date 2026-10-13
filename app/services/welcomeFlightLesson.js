import * as THREE from '../assets/fruit-window/vendor/three.module.js';
const start=new THREE.Vector3(-.43,.035,-.20);
export function createWelcomeFlightLesson(root,dragon,landing,{onFeedback=()=>{}}={}){
 const velocity=new THREE.Vector3(),desired=new THREE.Vector3(),delta=new THREE.Vector3();
 const rings=new THREE.Group();rings.visible=false;root.add(rings);const points=[new THREE.Vector3(-.43,.35,-.72),new THREE.Vector3(-.05,.45,-1.02),new THREE.Vector3(.36,.42,-.88)],entries=[];
 const geometry=new THREE.TorusGeometry(.17,.006,6,48);let previous=start;
 for(const point of points){const normal=point.clone().sub(previous).normalize(),material=new THREE.MeshBasicMaterial({color:'#ffe1a0',transparent:true,opacity:.28,depthWrite:false}),mesh=new THREE.Mesh(geometry,material);mesh.position.copy(point);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);rings.add(mesh);entries.push({point,normal,mesh});previous=point;}
 let count=0,heading=0,landed=false,airborne=false,landingTime=0,elapsed=0;
 function reset(){count=0;heading=0;landed=false;airborne=false;landingTime=0;velocity.set(0,0,0);dragon.group.position.copy(start);}
 function update(dt,phase,pilot){
  elapsed+=dt;const lesson=phase==='fly',available=['fly','hands','packet','seed','water','grow','harvest','explore'].includes(phase);dragon.group.visible=available;rings.visible=lesson && count<entries.length;
  const before=dragon.group.position.clone(),position=dragon.group.position;
  if(pilot?.position && !landed){
   velocity.copy(pilot.position).sub(position).divideScalar(Math.max(.001,dt));position.copy(pilot.position);airborne=true;
  }else if(pilot && !landed){
   const axes=pilot.source.gamepad?.axes || [],offset=axes.length>=4?2:0,dead=v=>Math.abs(v || 0)<.16?0:Math.sign(v)*(Math.abs(v)-.16)/.84;
   heading-=dead(axes[offset])*dt*1.65;const vertical=-dead(axes[offset+1]),speed=(pilot.trigger?1:0)-(pilot.reverse?1:0);
   desired.set(-Math.sin(heading)*speed*.65,vertical*.55,-Math.cos(heading)*speed*.65);
   if(desired.lengthSq()>.001)airborne=true;
   if(airborne){velocity.lerp(desired,1-Math.exp(-dt*8));delta.copy(velocity).multiplyScalar(dt);position.add(delta);position.x=THREE.MathUtils.clamp(position.x,-3.5,3.5);position.y=THREE.MathUtils.clamp(position.y,.035,2.2);position.z=THREE.MathUtils.clamp(position.z,-3.5,2.5);dragon.group.rotation.y=heading;}
  }else if(!landed && airborne){velocity.multiplyScalar(Math.exp(-dt*5));position.addScaledVector(velocity,dt);}
  else {position.copy(start);velocity.set(0,0,0);}
  if(lesson && airborne && count<entries.length){const entry=entries[count],a=before.clone().sub(entry.point).dot(entry.normal),b=position.clone().sub(entry.point).dot(entry.normal);if(a*b<=0 && Math.abs(a-b)>.0001){const cross=before.clone().lerp(position,a/(a-b));if(cross.distanceTo(entry.point)<.145){count++;onFeedback('ring',pilot?.source);}}}
  if(lesson && count===entries.length){const near=position.distanceTo(start)<.14 && position.y<.09 && velocity.length()<.20;landingTime=near?landingTime+dt:0;if(landingTime>.45 && !landed){landed=true;airborne=false;position.copy(start);velocity.set(0,0,0);onFeedback('land',pilot?.source);}}
  for(let i=0;i<entries.length;i++){entries[i].mesh.visible=i>=count;entries[i].mesh.material.opacity=i===count?.9:.22;entries[i].mesh.scale.setScalar(i===count?1+.025*Math.sin(elapsed*2):1);}
  landing.material.opacity=lesson && count===entries.length?.85:.3;
  const flutter=airborne && !landed || Math.sin(elapsed*.9)>.90;
  dragon.wings.forEach(({pivot,side,front})=>{pivot.rotation.z=side*(.06+(flutter?Math.sin(elapsed*2*Math.PI*42+front*.24)*.52:Math.sin(elapsed*1.4)*.035));});
 }
 reset();return {reset,update,get complete(){return landed;},snapshot:()=>({rings:count,total:entries.length,landed,airborne,speed:Math.min(1,velocity.length()/.85),position:{x:dragon.group.position.x,y:dragon.group.position.y,z:dragon.group.position.z}}),get cue(){return count<entries.length?`Fly through the glowing ring. ${count} of ${entries.length}.`:'Bring the dragonfly back to its marked landing spot. Ease off the controls to land.';}};
}
