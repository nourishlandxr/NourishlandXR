import * as THREE from '../vendor/three.module.min.js';
import {createOpening} from './peekOpening.js';

// Original placeholder geometry for portal mechanics, not the purchased flower.
export function createPortalPlantStudy(){
 const world=new THREE.Group(),plane=new THREE.Plane(new THREE.Vector3(0,0,-1),0);
 const ownedGeometry=new Set(),ownedMaterials=new Set();
 const material=(color,emissive=0)=>{const m=new THREE.MeshStandardMaterial({color,emissive,emissiveIntensity:.6,roughness:.65,side:THREE.DoubleSide,stencilWrite:true,stencilRef:1,stencilFunc:THREE.EqualStencilFunc,stencilWriteMask:0,clippingPlanes:[plane]});ownedMaterials.add(m);return m;};
 const green=material(0x235e43),blue=material(0x438fd4,0x163a69),gold=material(0xffd589,0xc89638),earth=material(0x30271e);
 function mesh(geometry,m,x,y,z,sx=1,sy=1,sz=1){ownedGeometry.add(geometry);const o=new THREE.Mesh(geometry,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.renderOrder=1;world.add(o);return o;}
 const stemCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,-1.5,-2.8),new THREE.Vector3(-.22,-.6,-2.65),new THREE.Vector3(.18,.35,-2.9),new THREE.Vector3(0,1,-2.8)]);
 mesh(new THREE.TubeGeometry(stemCurve,36,.065,10,false),green,0,0,0);
 for(let i=0;i<9;i++){const a=i*2.4,y=-1.2+i*.22,z=-2.8+Math.sin(a)*.65,x=Math.cos(a)*.65;const leaf=mesh(new THREE.SphereGeometry(1,20,12),green,x,y,z,.55,.07,.2);leaf.rotation.set(.3,a,.35*Math.sin(a));}
 for(let i=0;i<7;i++){const a=i*Math.PI*2/7;const petal=mesh(new THREE.SphereGeometry(1,24,16),blue,Math.cos(a)*.48,1+Math.sin(a)*.48,-2.8,.48,.24,.12);petal.rotation.z=a;}
 mesh(new THREE.SphereGeometry(.22,24,16),gold,0,1,-2.63);
 for(let i=0;i<5;i++){const a=i*2.4;mesh(new THREE.SphereGeometry(.045,12,8),gold,Math.cos(a)*.15,1+Math.sin(a)*.15,-2.35);}
 mesh(new THREE.CylinderGeometry(2.5,2.5,.12,48),earth,0,-1.6,-2.8);
 // Nearby and distant objects make head translation and occlusion obvious.
 mesh(new THREE.SphereGeometry(1,20,12),green,-.65,-.2,-.85,.45,.08,.23).rotation.z=.4;
 mesh(new THREE.SphereGeometry(.3,20,12),blue,1.3,.45,-4.8);
 mesh(new THREE.SphereGeometry(.23,20,12),gold,-1.4,.1,-4);
 const shell=mesh(new THREE.SphereGeometry(12,32,20),material(0x142932),0,0,-3);shell.material.side=THREE.BackSide;
 return createOpening({world,plane,ownedGeometry,ownedMaterials,radius:.89,allowEntry:true,extras:{study:'head entry plant portal'}});
}
