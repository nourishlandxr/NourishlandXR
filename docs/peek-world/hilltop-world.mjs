// True-3D Blender property blockout. No photograph or panorama in this world.
import * as THREE from '../../app/vendor/three.module.min.js';
import {createOpening} from './peek-world.mjs';

export function createHilltopPeekWorld(asset){
 const world=asset.scene,plane=new THREE.Plane(new THREE.Vector3(0,0,-1),0);
 const ownedGeometry=new Set(),ownedMaterials=new Set(),textures=new Set();
 world.name='Editable Blender property blockout';
 world.traverse(obj=>{
  if(!obj.isMesh)return;
  ownedGeometry.add(obj.geometry);obj.renderOrder=1;
  for(const material of Array.isArray(obj.material)?obj.material:[obj.material]){
   ownedMaterials.add(material);
   for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
  }
 });
 // Geometry sky surrounds the viewing volume without a flat background plane.
 const skyGeometry=new THREE.SphereGeometry(74,32,16),colours=[];
 const p=skyGeometry.attributes.position,top=new THREE.Color(0x9aafb5),bottom=new THREE.Color(0xe0e1c9);
 for(let i=0;i<p.count;i++){
  const t=THREE.MathUtils.clamp((p.getY(i)+6)/55,0,1),c=bottom.clone().lerp(top,t);
  colours.push(c.r,c.g,c.b);
 }
 skyGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));
 const skyMaterial=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide});
 const sky=new THREE.Mesh(skyGeometry,skyMaterial);sky.name='Geometry sky';sky.position.set(0,-5,-20);sky.renderOrder=1;
 world.add(sky);ownedGeometry.add(skyGeometry);ownedMaterials.add(skyMaterial);
 for(const material of ownedMaterials){
  material.stencilWrite=true;material.stencilRef=1;material.stencilFunc=THREE.EqualStencilFunc;
  material.stencilWriteMask=0;material.stencilFail=material.stencilZFail=material.stencilZPass=THREE.KeepStencilOp;
  material.clippingPlanes=[plane];material.needsUpdate=true;
 }
 return createOpening({world,plane,ownedGeometry,ownedMaterials,
  extras:{trueGeometry:true},release:()=>{for(const texture of textures)texture.dispose();}});
}
