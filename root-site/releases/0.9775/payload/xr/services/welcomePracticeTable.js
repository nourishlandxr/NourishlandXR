import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {PRACTICE_TABLE_HALF_WIDTH as width,PRACTICE_TABLE_HALF_DEPTH as depth} from './welcomePracticePhysics.js';
import {createCraftedTimberCanvas} from './craftedSurfaceTextures.js';
// Table V2: bevels supply real edge highlights; one bounded wood texture
// supplies the surface detail in the native Quest renderer as well as Three.
function roundedOutline(w,d,r){const p=new THREE.Shape(),x=w/2,z=d/2;p.moveTo(-x+r,-z);p.lineTo(x-r,-z);p.quadraticCurveTo(x,-z,x,-z+r);p.lineTo(x,z-r);p.quadraticCurveTo(x,z,x-r,z);p.lineTo(-x+r,z);p.quadraticCurveTo(-x,z,-x,z-r);p.lineTo(-x,-z+r);p.quadraticCurveTo(-x,-z,-x+r,-z);return p;}
function roundedSlab(shape,height,bevel){return new THREE.ExtrudeGeometry(shape,{depth:height-bevel*2,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,steps:1,curveSegments:6});}
export function createWelcomePracticeTable(root){
 const canvas=createCraftedTimberCanvas({width:1024,height:512,pale:true,horizontal:true});
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
 const group=new THREE.Group();group.name='Welcome practice table';group.userData.tableVersion=2;root.add(group);
 const geometry=roundedSlab(roundedOutline(width*2-.012,depth*2-.012,.048),.035,.006);
 // Explicit top UVs preserve long grain across the full tabletop; extrude's
 // default world-unit UVs crop a canvas texture on a table under two metres.
 const uv=geometry.attributes.uv,pos=geometry.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,(pos.getX(i)+width)/(width*2),(pos.getY(i)+depth)/(depth*2));
 const top=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({map:texture,color:'#ffffff',roughness:.78,metalness:0}));top.name='Table V2 rounded timber top';top.rotation.x=-Math.PI/2;top.position.y=-.029;group.add(top);
 const material=new THREE.MeshStandardMaterial({color:'#64715a',roughness:.86,metalness:0});
 const rimShape=roundedOutline(width*2-.006,depth*2-.006,.051),hole=roundedOutline(width*2-.044,depth*2-.044,.032);rimShape.holes.push(hole);
 const edge=new THREE.Mesh(roundedSlab(rimShape,.045,.003),material);edge.name='Table V2 continuous rounded retaining rim';edge.rotation.x=-Math.PI/2;edge.position.y=.003;group.add(edge);
 const stand=new THREE.Mesh(new THREE.CylinderGeometry(.045,.075,1,24),material);group.add(stand);
 const foot=new THREE.Mesh(new THREE.CylinderGeometry(.22,.25,.03,32),material);group.add(foot);
 const landing=new THREE.Mesh(new THREE.TorusGeometry(.11,.003,6,40),new THREE.MeshBasicMaterial({color:'#9caa83',transparent:true,opacity:.35,depthWrite:false}));landing.name='Dragonfly landing marker';landing.visible=false;landing.userData.skipArrivalGlow=true;landing.rotation.x=Math.PI/2;landing.position.set(-.43,.005,-.20);group.add(landing);
 const revealMaterials=[top.material,material];
 const grip=new THREE.Group();grip.name='Table height grip';grip.position.set(0,-.018,depth+.035);group.add(grip);
 const handleMaterial=new THREE.MeshStandardMaterial({color:'#ab8850',roughness:.64,metalness:.32});
 const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.09,0,-.035),new THREE.Vector3(-.09,0,.025),new THREE.Vector3(-.065,0,.045),new THREE.Vector3(.065,0,.045),new THREE.Vector3(.09,0,.025),new THREE.Vector3(.09,0,-.035)]);
 const handle=new THREE.Mesh(new THREE.TubeGeometry(curve,32,.008,8,false),handleMaterial);handle.name='Rounded table pull handle';grip.add(handle);revealMaterials.push(handleMaterial);
 function setHeight(height){
  // Keep the whole pedestal beneath the underside, including during reveal.
  const underside=-.038,footTop=-height+.030;
  stand.scale.y=Math.max(.05,underside-footTop);stand.position.y=(underside+footTop)/2;
  foot.position.y=-height+.015;
 }
 function alignFootToFloor(floorY){
  if(!Number.isFinite(floorY))return;
  root.updateMatrixWorld(true);
  const origin=group.getWorldPosition(new THREE.Vector3());
  const localFloor=group.worldToLocal(origin.setY(floorY));
  setHeight(Math.max(.08,-localFloor.y));
 }
 setHeight(.8);
 return {group,stand,foot,landing,grip,revealMaterials,setHeight,alignFootToFloor};
}
