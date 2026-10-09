import * as THREE from './vendor/three.module.js';

export class FruitDiscoveryAsset {
 constructor(gltf,config,{standalone=false}={}) {
  this.object=gltf.scene;this.config=config;this.standalone=standalone;
  this.fruit=this.object.getObjectByName(config.fruit_root);if(!this.fruit)throw new Error('FRUIT_ROOT missing');
  this.parent=this.fruit.parent;this.attachment=this.fruit.position.clone();this.attachmentQuaternion=this.fruit.quaternion.clone();
  this.stages=Object.fromEntries(Object.entries(config.stages).map(([s,v])=>[s,this.object.getObjectByName(v.root)]));
  this.clips=Object.fromEntries(gltf.animations.map(c=>[c.name,c]));this.growthMixer=new THREE.AnimationMixer(this.object);this.cutMixer=new THREE.AnimationMixer(this.fruit);
  this.rest=[];this.object.traverse(o=>{this.rest.push([o,o.position.clone(),o.quaternion.clone(),o.scale.clone(),o.morphTargetInfluences?[...o.morphTargetInfluences]:null]);if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  this.proxy=this.object.getObjectByName(config.collision_proxy);if(this.proxy)this.proxy.visible=false;
  this.closed=config.closed_exterior?this.fruit.getObjectByName(config.closed_exterior):null;this.cut=config.cutaway_assembly?this.fruit.getObjectByName(config.cutaway_assembly):null;
  this.internal=(config.internal_meshes||[]).map(n=>this.fruit.getObjectByName(n)).filter(Boolean);
  this.backgroundFlowers=config.seasonal_flower_root?this.object.getObjectByName(config.seasonal_flower_root):null;this.supporting=(config.supporting_fruits||[]).map(n=>this.object.getObjectByName(n)).filter(Boolean);
  this.mainFruit=this.fruit;this.mainParent=this.parent;
  this.pickableRigs=new Map();this.extraMaterials=new Set();
  if(/^P[FD]$/.test(config.prefix))this.preparePigeonPeaPods();
  this.rememberRig(this.fruit).mixer=this.cutMixer;
  // Capture the botanical variations too: playing/replaying never straightens
  // the branch into a repeating arrangement or loses a pod's attachment.
  this.rest=[];this.object.traverse(o=>this.rest.push([o,o.position.clone(),o.quaternion.clone(),o.scale.clone(),o.morphTargetInfluences?[...o.morphTargetInfluences]:null]));
  this.mode='RIPE';this.time=0;this.playing=false;this.opening=0;this.targetOpening=0;this.picked=false;this.motion=null;this.showStage('RIPE');
 }
 rememberRig(fruit){
  const rig={parent:fruit.parent,attachment:fruit.position.clone(),attachmentQuaternion:fruit.quaternion.clone(),closed:fruit.getObjectByName(this.config.closed_exterior),cut:fruit.getObjectByName(this.config.cutaway_assembly),internal:(this.config.internal_meshes||[]).map(n=>fruit.getObjectByName(n)).filter(Boolean),mixer:null};
  this.pickableRigs.set(fruit,rig);return rig;
 }
 preparePigeonPeaPods(){
  this.varyPigeonPeaFoliage();
  this.refinePigeonPeaFlowers();
  const palette=new Map();
  const variation=(material,dry,tone)=>{
   const key=material.uuid+'|'+dry+'|'+tone;if(palette.has(key))return palette.get(key);
   const copy=material.clone();
   if(/pod exterior/i.test(material.name))copy.color.set(dry?'#897046':'#719442').multiplyScalar(.90+tone*.07);
   if(/seed|peas/i.test(material.name) && !/hilum/i.test(material.name))copy.color.set(dry?'#ad895e':'#99ae52');
   palette.set(key,copy);this.extraMaterials.add(copy);return copy;
  };
  for(const [index,pod] of this.supporting.entries()){
   const cluster=Math.floor(index/3),dry=(cluster*7+3)%5<2,tone=index%3;
   // Preserve existing stems/attachment points. Variation is about the pod's
   // stalk, not arbitrary translation of a leaf away from its petiole.
   pod.rotation.z+=(Math.sin(index*2.399)*.10);pod.rotation.y+=Math.sin(index*1.71)*.18;
   pod.scale.multiplyScalar(.93+.12*((index*13)%17)/16);
   pod.userData.harvestMaturity=dry?'dry':'fresh';
   for(const child of [...pod.children]){pod.remove(child);child.traverse(node=>{if(node.isMesh)node.geometry.dispose();});}
   for(const source of [this.closed,this.cut])if(source){const clone=source.clone(true);clone.visible=source===this.closed;clone.traverse(node=>{if(node.isMesh)node.material=Array.isArray(node.material)?node.material.map(m=>variation(m,dry,tone)):variation(node.material,dry,tone);});pod.add(clone);}
   this.rememberRig(pod);
  }
 }
 refinePigeonPeaFlowers(){
  const processed=new Set(),materials=new Map();
  this.object.traverse(node=>{
   if(!node.isMesh || !/flower.*petals/i.test(node.name))return;
   const geometry=node.geometry,positions=geometry.attributes.position;
   if(!processed.has(geometry)){
    processed.add(geometry);geometry.computeBoundingBox();const {min,max}=geometry.boundingBox,height=Math.max(.001,max.y-min.y);
    // Retain the authored pea-flower anatomy: broaden the upper standard,
    // gently cup it, and keep the lower wings/keel compact, as in the photos.
    for(let i=0;i<positions.count;i++){const t=(positions.getY(i)-min.y)/height,x=positions.getX(i),centerX=(min.x+max.x)/2;positions.setX(i,centerX+(x-centerX)*(t>.55?1.10:.96));if(t>.55)positions.setZ(i,positions.getZ(i)+Math.sin((t-.55)/.45*Math.PI)*height*.045);}
    positions.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const colours=new Float32Array(positions.count*3),normals=geometry.attributes.normal;
    for(let i=0;i<positions.count;i++){const t=(positions.getY(i)-min.y)/height,back=t>.5&&normals.getZ(i)<-.3;colours.set(back?[.78,.10,.30]:[1,1,1],i*3);}
    geometry.setAttribute('color',new THREE.BufferAttribute(colours,3));
   }
   const colourMaterial=material=>{if(!materials.has(material)){const copy=material.clone();copy.vertexColors=true;materials.set(material,copy);this.extraMaterials.add(copy);}return materials.get(material);};
   node.material=Array.isArray(node.material)?node.material.map(colourMaterial):colourMaterial(node.material);
  });
 }
 varyPigeonPeaFoliage(){
  const prefix=this.config.prefix,wood=this.object.getObjectByName(prefix+'_Woody_Branch');if(!wood?.geometry?.attributes.position)return;
  this.object.updateMatrixWorld(true);const branches=wood.geometry.attributes.position,step=Math.max(1,Math.floor(branches.count/200)),samples=[];
  for(let i=0;i<branches.count;i+=step)samples.push(new THREE.Vector3().fromBufferAttribute(branches,i).applyMatrix4(wood.matrixWorld));
  for(let i=0;i<14;i++){
   const petiole=this.object.getObjectByName(prefix+'_Natural_Petiole_'+i);if(!petiole?.geometry?.attributes.position)continue;
   // Find the actual stalk/wood contact, then move the whole trifoliate
   // assembly about it. All three leaflets and their petioles remain joined.
   let pivot=null,distance=Infinity;const positions=petiole.geometry.attributes.position;
   for(let j=0;j<positions.count;j++){const point=new THREE.Vector3().fromBufferAttribute(positions,j).applyMatrix4(petiole.matrixWorld);for(const sample of samples){const d=point.distanceToSquared(sample);if(d<distance){distance=d;pivot=point.clone();}}}
   const parts=[petiole];this.object.traverse(node=>{if(node!==petiole && (node.name.startsWith(prefix+'_Natural_Leaflet_'+i+'_') || node.name.startsWith(prefix+'_Individual_Leaflet_Stalk_'+i+'_')))parts.push(node);});
   const parent=petiole.parent,cluster=new THREE.Group();cluster.name=prefix+'_Trifoliate_Cluster_'+i;cluster.position.copy(parent.worldToLocal(pivot));parent.add(cluster);cluster.updateMatrixWorld(true);for(const part of parts)cluster.attach(part);
   cluster.rotation.set(Math.sin(i*1.71)*.08,Math.sin(i*2.399)*.22,Math.cos(i*1.13)*.07);cluster.scale.setScalar(1.01+.17*((i*11)%17)/16);
  }
 }
 selectFruit(fruit=this.mainFruit){
  const rig=this.pickableRigs.get(fruit);if(!rig)return false;
  if(this.picked)this.showStage('RIPE');
  this.cutMixer.stopAllAction();this.fruit=fruit;this.parent=rig.parent;this.attachment=rig.attachment.clone();this.attachmentQuaternion=rig.attachmentQuaternion.clone();this.closed=rig.closed;this.cut=rig.cut;this.internal=rig.internal;
  this.cutMixer=rig.mixer ||= new THREE.AnimationMixer(fruit);this.opening=this.targetOpening=0;this.syncCutVisibility();return true;
 }
 restore() {
  this.growthMixer.stopAllAction();this.cutMixer.stopAllAction();
  if(this.picked){this.parent.attach(this.fruit);this.picked=false;}
  if(this.fruit!==this.mainFruit)this.selectFruit(this.mainFruit);
  this.motion=null;
  for(const [o,p,q,s,w] of this.rest){if(o===this.object)continue;o.position.copy(p);o.quaternion.copy(q);o.scale.copy(s);if(w)o.morphTargetInfluences.splice(0,w.length,...w)}
  this.playing=false;this.opening=this.targetOpening=0;
  for(const s of Object.values(this.stages))if(s){s.visible=false;s.scale.setScalar(1)}
  if(this.proxy)this.proxy.visible=false;
  this.syncCutVisibility();
  this.syncBotanicalContext();this.object.updateMatrixWorld(true);
 }
 syncBotanicalContext(){if(!this.backgroundFlowers)return;const bloom=this.mode==='FLOWER'||this.mode==='BUD'||this.mode==='DEVELOPMENT'&&this.time<8.8;this.backgroundFlowers.visible=bloom;this.backgroundFlowers.scale.setScalar(bloom?1:.00001);for(const o of this.supporting)o.visible=!bloom;}
 showStage(stage) {
  if(!this.stages[stage])throw new Error('Stage is not included in this file');
  this.restore();this.mode=stage;this.time=this.config.stages[stage].position*20;this.stages[stage].visible=true;this.syncBotanicalContext();this.object.updateMatrixWorld(true);
 }
 seek(progress) {
  if(!this.clips.Development)throw new Error('Standalone ripe fruit has no Development clip');
  if(this.picked)this.restore();
  if(this.mode!=='DEVELOPMENT'){this.restore();this.mode='DEVELOPMENT'}
  for(const s of Object.values(this.stages))if(s)s.visible=true;
  this.time=THREE.MathUtils.clamp(progress,0,1)*this.clips.Development.duration;
  const a=this.growthMixer.clipAction(this.clips.Development);a.enabled=true;a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.play();a.paused=true;a.time=this.time;this.growthMixer.update(0);
  for(const s of Object.values(this.stages))if(s)s.visible=s.scale.x>.001;
  if(this.proxy)this.proxy.visible=false;this.syncBotanicalContext();this.object.updateMatrixWorld(true);
 }
 play({reverse=false}={}) {
  const duration=this.clips.Development?.duration;if(!duration)return;
  const start=this.mode==='DEVELOPMENT'&&((!reverse&&this.time<duration)||(reverse&&this.time>0))?this.time/duration:reverse?1:0;
  this.seek(start);this.direction=reverse?-1:1;this.playing=true;
 }
 pause(){this.playing=false;}
 get canPick(){return this.mode==='RIPE'||this.mode==='DEVELOPMENT'&&this.time>=19.95;}
 pick(host,{hold=false}={}) {
  if(!this.canPick||this.picked||this.standalone)return false;
  this.pause();this.syncBotanicalContext();this.object.updateMatrixWorld(true);const start=this.fruit.getWorldPosition(new THREE.Vector3());host.attach(this.fruit);this.picked=true;
  if(hold){this.motion=null;return true;}
  const from=host.worldToLocal(start.clone()),end=host.worldToLocal(start.clone().add(new THREE.Vector3(...this.config.inspection_offset_glTF)));this.motion={from,to:end,elapsed:0,duration:1.5,returning:false};return true;
 }
 dragTo(worldPosition){if(this.picked&&!this.motion)this.fruit.position.copy(worldPosition);}
 returnFruit() {
  if(!this.picked)return;
  this.pause();this.close();this.parent.updateMatrixWorld(true);const end=this.fruit.parent.worldToLocal(this.parent.localToWorld(this.attachment.clone()));this.motion={from:this.fruit.position.clone(),to:end,elapsed:0,duration:1.5,returning:true};
 }
 setCutaway(progress) {
  if(!this.canPick||!this.clips.Open)return;
  this.opening=THREE.MathUtils.clamp(progress,0,1);this.targetOpening=this.opening;
  const a=this.cutMixer.clipAction(this.clips.Open);a.enabled=true;a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.play();a.paused=true;a.time=this.opening*this.clips.Open.duration;this.cutMixer.update(0);this.fruit.updateMatrixWorld(true);
  this.syncCutVisibility();
 }
 syncCutVisibility(){const open=this.opening>1e-6;if(this.closed)this.closed.visible=!open;if(this.cut)this.cut.visible=open;for(const mesh of this.internal)mesh.visible=open;}
 open(){if(this.canPick)this.targetOpening=1;}
 close(){this.targetOpening=0;}
 toggleCutaway(){this.targetOpening>.5?this.close():this.open();}
 update(delta) {
  if(this.playing){const duration=this.clips.Development.duration;const time=THREE.MathUtils.clamp(this.time+delta*(this.direction||1),0,duration);this.seek(time/duration);this.playing=time>0&&time<duration;}
  if(Math.abs(this.opening-this.targetOpening)>1e-5){const target=this.targetOpening;this.setCutaway(this.opening+Math.sign(target-this.opening)*Math.min(Math.abs(target-this.opening),delta/1.5));this.targetOpening=target;}
  if(this.motion){const m=this.motion;m.elapsed+=delta;const t=Math.min(1,m.elapsed/m.duration),smooth=t*t*(3-2*t);this.fruit.position.lerpVectors(m.from,m.to,smooth);if(t>=1){this.motion=null;if(m.returning){this.parent.attach(this.fruit);this.fruit.position.copy(this.attachment);this.fruit.quaternion.copy(this.attachmentQuaternion);this.picked=false;this.setCutaway(0);}}}
 }
 dispose(){if(this.picked)this.parent.attach(this.fruit);this.growthMixer.stopAllAction();this.growthMixer.uncacheRoot(this.object);for(const [fruit,rig] of this.pickableRigs){rig.mixer?.stopAllAction();rig.mixer?.uncacheRoot(fruit);}const geometries=new Set(),materials=new Set(this.extraMaterials),textures=new Set();this.object.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});for(const geometry of geometries)geometry.dispose();for(const material of materials){for(const v of Object.values(material))if(v?.isTexture)textures.add(v);material.dispose();}for(const texture of textures)texture.dispose();this.pickableRigs.clear();}
}
