import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {createPracticeBody} from './welcomePracticePhysics.js';
export function createTutorialMagicBrush(root,{onAssets=()=>{}}={}){
 const body=createPracticeBody('magic-brush',{x:-.52,z:-.04,radius:.045,halfSize:{x:.014,y:.014,z:.13}}),group=new THREE.Group();group.name='Tutorial magic brush';
 const handle=new THREE.Mesh(new THREE.CylinderGeometry(.012,.016,.19,12),new THREE.MeshStandardMaterial({color:'#675293',roughness:.4}));handle.rotation.x=Math.PI/2;group.add(handle);
 const tip=new THREE.Mesh(new THREE.ConeGeometry(.014,.055,12),new THREE.MeshBasicMaterial({color:'#86e7d0'}));tip.rotation.x=-Math.PI/2;tip.position.z=-.12;group.add(tip);root.add(group);
 const marks=new THREE.Group();marks.name='Brush practice marks';root.add(marks);const guide=new THREE.Mesh(new THREE.TorusGeometry(.06,.002,6,32),new THREE.MeshBasicMaterial({color:'#ffe0a0'}));root.add(guide);guide.visible=false;
 body.anchored=true;let stroke=null,painted=false,docked=false;
 function end(){const fruit=stroke?.fruit,ready=fruit && stroke.travel>.045 && stroke.touched;stroke=null;return ready?fruit:null;}
 function update(point,pressed,fruit){
  guide.visible=Boolean(fruit);if(fruit){guide.position.set(fruit.position.x,fruit.position.y,fruit.position.z);guide.rotation.y=Math.PI/2;guide.scale.setScalar(fruit.radius/.06);}
  tip.material.color.set(fruit?'#ffe0a0':'#86e7d0');
  if(!pressed)return end();
  if(!stroke)stroke={last:point.clone(),travel:0,fruit,touched:false};
  const distance=stroke.last.distanceTo(point);if(distance>.15){stroke=null;return null;}
  stroke.travel+=distance;
  if(fruit){if(stroke.fruit && stroke.fruit!==fruit){stroke=null;return null;}stroke.fruit=fruit;const line=new THREE.Line3(stroke.last,point),nearest=line.closestPointToPoint(new THREE.Vector3(fruit.position.x,fruit.position.y,fruit.position.z),true,new THREE.Vector3());stroke.touched ||= nearest.distanceTo(new THREE.Vector3(fruit.position.x,fruit.position.y,fruit.position.z))<fruit.radius+.015;}
  else if(!stroke.fruit && distance>.006 && marks.children.length<80){const delta=point.clone().sub(stroke.last),mesh=new THREE.Mesh(new THREE.CylinderGeometry(.0025,.0025,distance,6),new THREE.MeshBasicMaterial({color:'#86e7d0'}));mesh.position.copy(point).add(stroke.last).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());marks.add(mesh);painted=true;onAssets();}
  stroke.last.copy(point);return null;
 }
 return {body,group,update,end,tipPoint:()=>new THREE.Vector3(0,0,-.148).applyQuaternion(new THREE.Quaternion(body.rotation.x,body.rotation.y,body.rotation.z,body.rotation.w)).add(new THREE.Vector3(body.position.x,body.position.y,body.position.z)),dock(){end();docked=true;body.anchored=true;Object.assign(body.position,{x:-.52,y:.018,z:-.04});Object.assign(body.rotation,{x:0,y:0,z:0,w:1});Object.assign(body.velocity,{x:0,y:0,z:0});Object.assign(body.angular,{x:0,y:0,z:0});},reset(){end();painted=docked=false;body.anchored=false;guide.visible=false;for(const mesh of [...marks.children]){mesh.geometry.dispose();mesh.material.dispose();marks.remove(mesh);}onAssets();},hideGuide(){guide.visible=false;},snapshot:()=>({painted,docked,marks:marks.children.length})};
}
