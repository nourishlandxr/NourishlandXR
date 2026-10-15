import * as THREE from '../assets/fruit-window/vendor/three.module.js';
// Native XR reads emissive materials directly; no bloom pass or shadow lights.
export function createExperienceFocusLighting(scene){
 const root=new THREE.Group();root.name='Teaching focus light';root.userData.welcomeAlwaysConvert=true;scene.add(root);
 const material=new THREE.MeshBasicMaterial({color:'#ffe5b3',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
 const ring=new THREE.Mesh(new THREE.TorusGeometry(1,.012,6,64),material);ring.name='Current introduction light';ring.rotation.x=-Math.PI/2;root.add(ring);
 const roots=new Map(),originals=new Map(),warm=new THREE.Color('#ffdda2'),tint=new THREE.Color();let amount=0,disposed=false,current=null;
 function collect(object){if(!object)return [];let cache=roots.get(object);if(cache)return cache;cache=[];object.traverse(node=>{if(!node.isMesh || node===ring || node.userData.skipArrivalGlow)return;for(const m of [node.material].flat()){if(!m?.emissive || cache.includes(m))continue; // Existing lit cores and LEDs retain their authored signal.
if(!originals.has(m) && m.emissive.r+m.emissive.g+m.emissive.b>.01)continue;if(!originals.has(m))originals.set(m,{color:m.emissive.clone(),intensity:m.emissiveIntensity ?? 1});cache.push(m);}});roots.set(object,cache);return cache;}
 function update(dt,{guide=null,element=null,point=null,radius=.13,enabled=true,reducedMotion=false,revision=0}={}){
  if(disposed)return;if(root.userData.revision!==revision){roots.clear();root.userData.revision=revision;}
  let target=enabled?(element || (!point?guide:null)):null;for(let parent=target;parent;parent=parent.parent)if(!parent.visible){target=null;break;}current=target;const active=collect(target);amount=THREE.MathUtils.damp(amount,target || point?1:0,5,Math.min(.1,Math.max(0,dt)));
  for(const [m,base] of originals){const desired=enabled && active.includes(m) ? .16 : 0;const value=THREE.MathUtils.damp(m.userData.teachingGlow || 0,desired,5,Math.min(.1,Math.max(0,dt)));m.userData.teachingGlow=value;m.emissive.copy(base.color).multiplyScalar(base.intensity).add(tint.copy(warm).multiplyScalar(value));m.emissiveIntensity=1;}
  const anchor=point || target?.getWorldPosition(new THREE.Vector3());if(anchor){root.position.copy(anchor);root.position.y+=.008;ring.scale.setScalar(radius);}
  root.visible=false;material.opacity=0;
  return {target:element?'element':target?'zinnia':'none',amount,steady:reducedMotion};
 }
 return {root,update,refresh(){roots.clear();},snapshot:()=>({target:current?.name || null,opacity:material.opacity}),destroy(){if(disposed)return;disposed=true;for(const [m,base] of originals){m.emissive.copy(base.color);m.emissiveIntensity=base.intensity;delete m.userData.teachingGlow;}ring.geometry.dispose();material.dispose();root.removeFromParent();roots.clear();originals.clear();}};
}
