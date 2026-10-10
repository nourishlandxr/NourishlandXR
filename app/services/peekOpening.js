// Shared aperture mechanics for the isolated app test and artwork preview.
import * as THREE from '../vendor/three.module.min.js';
export const OPENING_RADIUS=.832;
export function createOpening({world,plane,ownedGeometry,ownedMaterials,extras={},release=()=>{}}){
 const root=new THREE.Group();root.name='Independent peek experiment';root.add(world);
 const maskGeometry=new THREE.CircleGeometry(OPENING_RADIUS,96);ownedGeometry.add(maskGeometry);
 const maskMaterial=new THREE.MeshBasicMaterial({side:THREE.DoubleSide,colorWrite:false,depthWrite:false,depthTest:false,
  stencilWrite:true,stencilRef:1,stencilFunc:THREE.AlwaysStencilFunc,stencilZPass:THREE.ReplaceStencilOp});
 ownedMaterials.add(maskMaterial);const aperture=new THREE.Mesh(maskGeometry,maskMaterial);aperture.renderOrder=0;root.add(aperture);
 const rimGeometry=new THREE.TorusGeometry(OPENING_RADIUS+.024,.024,8,96);ownedGeometry.add(rimGeometry);
 const rimMaterial=new THREE.MeshLambertMaterial({color:0xa6b3a5});ownedMaterials.add(rimMaterial);
 const rim=new THREE.Mesh(rimGeometry,rimMaterial);rim.name='Temporary test rim only';rim.renderOrder=2;root.add(rim);
 const closedMaterial=new THREE.MeshBasicMaterial({color:0x1c2929,side:THREE.DoubleSide});ownedMaterials.add(closedMaterial);
 const closed=new THREE.Mesh(maskGeometry,closedMaterial);closed.renderOrder=2;closed.visible=false;root.add(closed);
 const inverse=new THREE.Matrix4(),localEye=new THREE.Vector3();let enabled=true,disposed=false;
 function update(camera){
  root.updateMatrixWorld(true);inverse.copy(root.matrixWorld).invert();
  localEye.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(inverse);
  // Remain a peek: approaching/crossing the opening never teleports the user.
  const visible=enabled&&localEye.z>.04;
  world.visible=aperture.visible=visible;closed.visible=!visible;
  plane.set(new THREE.Vector3(0,0,-1),0).applyMatrix4(root.matrixWorld);
 }
 return {root,world,aperture,rim,closed,...extras,
  setEnabled(value){enabled=Boolean(value);},get enabled(){return enabled;},update,
  dispose(){if(disposed)return;disposed=true;root.removeFromParent();for(const g of ownedGeometry)g.dispose();for(const m of ownedMaterials)m.dispose();release();root.clear();},
  get geometryCount(){return ownedGeometry.size;},get disposed(){return disposed;}};
}
