import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {createSpatialPaintV2} from './spatialPaintV2.js';
import {createPracticeBody} from './welcomePracticePhysics.js';
import {createSpatialPaintTip} from './spatialPaintTip.js';
export function createTutorialMagicBrush(root,{onAssets=()=>{}}={}){
 const body=createPracticeBody('magic-brush',{x:-.52,z:-.04,radius:.045,halfSize:{x:.026,y:.022,z:.085}}),group=new THREE.Group();group.name='Tutorial magic brush';
 const handle=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshStandardMaterial({color:'#526454',roughness:.4}));handle.scale.set(.026,.022,.075);group.add(handle);
 const tip=createSpatialPaintTip(group);tip.root.position.z=-.08;root.add(group);
 const paint=createSpatialPaintV2({capacity:2048});paint.setMotion(false);const marks=paint.root;marks.name='Brush practice marks';root.add(marks);const guide=new THREE.Mesh(new THREE.TorusGeometry(.06,.002,6,32),new THREE.MeshBasicMaterial({color:'#ffe0a0'}));root.add(guide);guide.visible=false;
 body.gripPoint={x:0,y:0,z:0};body.anchored=true;let stroke=null,painted=false,docked=false;
 function end(){const fruit=stroke?.fruit,ready=fruit && stroke.travel>.045 && stroke.touched;stroke=null;paint.end('tutorial-brush');return ready?fruit:null;}
 function update(point,pressed,fruit){
  guide.visible=Boolean(fruit);if(fruit){guide.position.set(fruit.position.x,fruit.position.y,fruit.position.z);guide.rotation.y=Math.PI/2;guide.scale.setScalar(fruit.radius/.06);}
  tip.update(paint.snapshot());
  if(!pressed)return end();
  if(!stroke)stroke={last:point.clone(),travel:0,fruit,touched:false};
  const distance=stroke.last.distanceTo(point);if(distance>.15){stroke=null;return null;}
  stroke.travel+=distance;
  if(fruit){if(stroke.fruit && stroke.fruit!==fruit){stroke=null;return null;}stroke.fruit=fruit;const line=new THREE.Line3(stroke.last,point),nearest=line.closestPointToPoint(new THREE.Vector3(fruit.position.x,fruit.position.y,fruit.position.z),true,new THREE.Vector3());stroke.touched ||= nearest.distanceTo(new THREE.Vector3(fruit.position.x,fruit.position.y,fruit.position.z))<fruit.radius+.015;}
  else if(!stroke.fruit){paint.add('tutorial-brush',point);painted ||= stroke.travel>.025;}
  stroke.last.copy(point);return null;
 }
 return {paint,clear(){end();paint.clear();},destroy(){paint.destroy();},body,group,update,end,tipPoint:()=>new THREE.Vector3(0,0,-.08).applyQuaternion(new THREE.Quaternion(body.rotation.x,body.rotation.y,body.rotation.z,body.rotation.w)).add(new THREE.Vector3(body.position.x,body.position.y,body.position.z)),dock(){end();docked=true;body.anchored=true;Object.assign(body.position,{x:-.52,y:.018,z:-.04});Object.assign(body.rotation,{x:0,y:0,z:0,w:1});Object.assign(body.velocity,{x:0,y:0,z:0});Object.assign(body.angular,{x:0,y:0,z:0});},reset(){end();painted=docked=false;body.anchored=false;guide.visible=false;paint.clear();},hideGuide(){guide.visible=false;},snapshot:()=>({painted,docked,marks:paint.snapshot().strokes})};
}
