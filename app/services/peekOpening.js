// Shared aperture mechanics for the isolated app test and artwork preview.
import * as THREE from '../vendor/three.module.min.js';
export const OPENING_RADIUS=.832;
export function createOpening({world,plane,ownedGeometry,ownedMaterials,extras={},release=()=>{},radius=OPENING_RADIUS,allowEntry=false}){
 const root=new THREE.Group();root.name='Independent peek experiment';root.add(world);
 const maskGeometry=new THREE.CircleGeometry(radius,128);ownedGeometry.add(maskGeometry);
 const maskMaterial=new THREE.MeshBasicMaterial({side:THREE.DoubleSide,colorWrite:false,depthWrite:false,depthTest:false,
  stencilWrite:true,stencilRef:1,stencilFunc:THREE.AlwaysStencilFunc,stencilZPass:THREE.ReplaceStencilOp});
 ownedMaterials.add(maskMaterial);const aperture=new THREE.Mesh(maskGeometry,maskMaterial);aperture.renderOrder=0;root.add(aperture);
 const rimGeometry=new THREE.TorusGeometry(radius+.024,.024,8,96);ownedGeometry.add(rimGeometry);
 const rimMaterial=new THREE.MeshLambertMaterial({color:0xa6b3a5});ownedMaterials.add(rimMaterial);
 const rim=new THREE.Mesh(rimGeometry,rimMaterial);rim.name='Temporary test rim only';rim.renderOrder=2;root.add(rim);
 const closedMaterial=new THREE.MeshBasicMaterial({color:0x1c2929,side:THREE.DoubleSide});ownedMaterials.add(closedMaterial);
 const closed=new THREE.Mesh(maskGeometry,closedMaterial);closed.renderOrder=2;closed.visible=false;root.add(closed);
 const inverse=new THREE.Matrix4(),localEye=new THREE.Vector3();let enabled=true,disposed=false,inside=false,entering=false;
 function update(camera,{nearDistance=0}={}){
  root.updateMatrixWorld(true);inverse.copy(root.matrixWorld).invert();
  localEye.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(inverse);
  if(allowEntry){
   if(!inside&&localEye.z<-.025&&Math.hypot(localEye.x,localEye.y)<radius)inside=true;
   if(inside&&localEye.z>.025)inside=false;
   // A planar mask is clipped before the viewer reaches the opening. Open
   // the surrounding world during that short crossing interval, using the
   // head centre for both eyes so stereo views never disagree about entry.
   entering=!inside&&localEye.z>=-.025&&localEye.z<=nearDistance&&Math.hypot(localEye.x,localEye.y)<radius;
   world.traverse(obj=>{for(const material of (Array.isArray(obj.material)?obj.material:[obj.material]))if(material){material.stencilFunc=inside||entering?THREE.AlwaysStencilFunc:THREE.EqualStencilFunc;material.clippingPlanes=inside||entering?[]:[plane];}});
  }
  const visible=enabled&&(inside||entering||localEye.z>.001);
  world.visible=visible;aperture.visible=visible&&!inside&&!entering;closed.visible=!visible;
  plane.set(new THREE.Vector3(0,0,-1),0).applyMatrix4(root.matrixWorld);
 }
 return {root,world,aperture,rim,closed,...extras,
  setEnabled(value){enabled=Boolean(value);},get enabled(){return enabled;},get inside(){return inside;},get unmasked(){return inside||entering;},resetEntry(){inside=false;entering=false;},update,
  dispose(){if(disposed)return;disposed=true;root.removeFromParent();for(const g of ownedGeometry)g.dispose();for(const m of ownedMaterials)m.dispose();release();root.clear();},
  get geometryCount(){return ownedGeometry.size;},get disposed(){return disposed;}};
}
