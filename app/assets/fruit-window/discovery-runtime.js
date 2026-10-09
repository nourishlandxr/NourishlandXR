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
  this.mode='RIPE';this.time=0;this.playing=false;this.opening=0;this.targetOpening=0;this.picked=false;this.motion=null;this.showStage('RIPE');
 }
 restore() {
  this.growthMixer.stopAllAction();this.cutMixer.stopAllAction();
  if(this.picked){this.parent.attach(this.fruit);this.picked=false;}
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
 pick(host) {
  if(!this.canPick||this.picked||this.standalone)return false;
  this.pause();this.syncBotanicalContext();this.object.updateMatrixWorld(true);const start=this.fruit.getWorldPosition(new THREE.Vector3());host.attach(this.fruit);this.picked=true;
  const end=start.clone().add(new THREE.Vector3(...this.config.inspection_offset_glTF));this.motion={from:start,to:end,elapsed:0,duration:1.5,returning:false};return true;
 }
 dragTo(worldPosition){if(this.picked&&!this.motion)this.fruit.position.copy(worldPosition);}
 returnFruit() {
  if(!this.picked)return;
  this.pause();this.close();this.parent.updateMatrixWorld(true);const end=this.parent.localToWorld(this.attachment.clone());this.motion={from:this.fruit.position.clone(),to:end,elapsed:0,duration:1.5,returning:true};
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
 dispose(){if(this.picked)this.parent.attach(this.fruit);this.growthMixer.stopAllAction();this.cutMixer.stopAllAction();this.growthMixer.uncacheRoot(this.object);this.cutMixer.uncacheRoot(this.fruit);this.object.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose();}}});}
}
