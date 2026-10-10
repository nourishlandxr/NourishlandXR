// Isolated mechanical study. No Living Frame artwork, copy or app lifecycle imports.
import {createOpening} from './peekOpening.js';
import * as THREE from '../vendor/three.module.min.js';
import {mergeGeometries} from '../assets/fruit-window/vendor/BufferGeometryUtils.js';

export const OPENING_RADIUS=.832;
export const HOUSE_POSITION={x:.9,z:-10};
export function groundHeight(x,z){
 return 2.55*Math.exp(-((x-.8)**2/32+(z+10)**2/60))
  +1.45*Math.exp(-((x+7)**2/52+(z+26)**2/160))
  +.12*Math.sin(x*.5+z*.25)*Math.cos(z*.3)-1.6;
}
export function rayThroughOpening(origin,direction,radius=OPENING_RADIUS){
 if(origin.z<=0||direction.z>=-1e-8)return null;
 const t=-origin.z/direction.z,x=origin.x+t*direction.x,y=origin.y+t*direction.y;
 return x*x+y*y<=radius*radius?{x,y,t}:null;
}

export function createPeekWorld({allowEntry=false,radius=OPENING_RADIUS}={}){
 const world=new THREE.Group();world.name='Mock landscape only';
 const plane=new THREE.Plane(new THREE.Vector3(0,0,-1),0);
 const buckets=new Map(),ownedGeometry=new Set(),ownedMaterials=new Set();
 const palette={grass:0x527454,leaf:0x314f3d,trunk:0x725540,wall:0xe3cfab,roof:0x8b5141,
  window:0x345365,path:0xbfa879,mountain:0x849c9b,sky:0xb8d8e3};
 function add(key,geometry,position=[0,0,0],rotation=[0,0,0],scale=[1,1,1]){
  geometry=geometry.index?geometry.toNonIndexed():geometry;
  geometry.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...position),
   new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(...scale)));
  if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(geometry);
 }
 const ground=new THREE.PlaneGeometry(36,48,48,56);ground.rotateX(-Math.PI/2);ground.translate(0,0,-24.1);
 const gp=ground.attributes.position,colors=[];
 for(let i=0;i<gp.count;i++){
  const x=gp.getX(i),z=gp.getZ(i),y=groundHeight(x,z);gp.setY(i,y);
  const shade=.92+.08*Math.sin(x*.7+z*.3),c=new THREE.Color(palette.grass).multiplyScalar(shade);
  colors.push(c.r,c.g,c.b);
 }
 ground.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));ground.computeVertexNormals();add('terrain',ground);
 // Distant ridges are actual mesh surfaces at different depths.
 for(let i=0;i<6;i++)add('mountain',new THREE.ConeGeometry(3.8+i*.25,5+i%3,5),[-15+i*6,-.1,-39-i%2*3],[0,i*.5,0],[1,1,.55]);
 add('sky',new THREE.PlaneGeometry(90,55),[0,10,-49]);
 const {x,z}=HOUSE_POSITION,y=groundHeight(x,z);
 add('wall',new THREE.BoxGeometry(2.3,1.55,1.9),[x,y+.775,z]);
 // Gabled roof prism, rather than a flat picture or texture.
 const roof=new THREE.BufferGeometry();roof.setAttribute('position',new THREE.Float32BufferAttribute([
  -1.3,0,1.1, 1.3,0,1.1, 0,.95,1.1, -1.3,0,-1.1,0,.95,-1.1,1.3,0,-1.1,
  -1.3,0,-1.1,-1.3,0,1.1,0,.95,1.1, -1.3,0,-1.1,0,.95,1.1,0,.95,-1.1,
  1.3,0,1.1,1.3,0,-1.1,0,.95,-1.1, 1.3,0,1.1,0,.95,-1.1,0,.95,1.1
 ],3));roof.computeVertexNormals();add('roof',roof,[x,y+1.55,z]);
 add('trunk',new THREE.BoxGeometry(.32,1,.35),[x+.55,y+2.1,z-.35]);
 add('trunk',new THREE.BoxGeometry(.45,1.05,.035),[x,y+.525,z+.97]);
 for(const dx of [-.74,.74])add('window',new THREE.BoxGeometry(.40,.43,.04),[x+dx,y+.91,z+.975]);
 // Winding ground-following path provides a foreground/midground depth cue.
 const pathVertices=[];
 for(let i=0;i<42;i++){
  const za=-2.9-i*.15,zb=za-.15,xa=.9+.65*Math.sin((za+10)*.43),xb=.9+.65*Math.sin((zb+10)*.43),width=.24;
  const points=[[xa-width,groundHeight(xa-width,za)+.015,za],[xa+width,groundHeight(xa+width,za)+.015,za],
   [xb-width,groundHeight(xb-width,zb)+.015,zb],[xb+width,groundHeight(xb+width,zb)+.015,zb]];
  for(const index of [0,2,1,1,2,3])pathVertices.push(...points[index]);
 }
 const path=new THREE.BufferGeometry();path.setAttribute('position',new THREE.Float32BufferAttribute(pathVertices,3));path.computeVertexNormals();add('path',path);
 for(const [tx,tz,height] of [[-1.8,-4,2.4],[2.9,-5.4,2],[-3.5,-10,2.6],[4.1,-12,2.8],[-7,-18,2.5],[6,-23,3]]){
  const ty=groundHeight(tx,tz);
  add('trunk',new THREE.CylinderGeometry(.06,.09,height,6),[tx,ty+height/2,tz]);
  add('leaf',new THREE.IcosahedronGeometry(.70,1),[tx,ty+height,tz],[0,tx,0],[1,height/2,1]);
 }
 for(const [key,geometries] of buckets){
  const geometry=mergeGeometries(geometries,false);for(const g of geometries)g.dispose();ownedGeometry.add(geometry);
  const Material=key==='sky'?THREE.MeshBasicMaterial:THREE.MeshLambertMaterial;
  const material=new Material({color:key==='terrain'?0xffffff:palette[key],vertexColors:key==='terrain',
   side:THREE.DoubleSide,stencilWrite:true,stencilRef:1,stencilFunc:THREE.EqualStencilFunc,
   stencilWriteMask:0,stencilFail:THREE.KeepStencilOp,stencilZFail:THREE.KeepStencilOp,stencilZPass:THREE.KeepStencilOp,
   clippingPlanes:[plane]});
  ownedMaterials.add(material);const mesh=new THREE.Mesh(geometry,material);mesh.name='Mock '+key;mesh.renderOrder=1;world.add(mesh);
 }
 return createOpening({world,plane,ownedGeometry,ownedMaterials,allowEntry,radius,extras:{houseCentre:new THREE.Vector3(x,y+1.4,z)}});
}

export {createOpening} from './peekOpening.js';
