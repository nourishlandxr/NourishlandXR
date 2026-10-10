// A hand-authored depth painting from one property reference, not photogrammetry.
import * as THREE from '../vendor/three.module.min.js';
import {createOpening} from './peekOpening.js';
export const STILL_PICTURE_RADIUS=.89;

const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function propertyDepth(u,v){
 const row=1-v;
 let depth=3+29*Math.exp(-Math.max(0,row-.24)*5);
 // Distant sky/farmland, midground house and planting, nearby pond/foliage.
 const house=smooth(.18,.24,u)*(1-smooth(.35,.40,u))*smooth(.29,.33,row)*(1-smooth(.43,.48,row));
 depth=depth*(1-house)+13*house;
 const edge=(1-smooth(.08,.21,u)+smooth(.83,.98,u))*smooth(.01,.14,row);
 depth=depth*(1-Math.min(1,edge)*.82)+4.5*Math.min(1,edge)*.82;
 const foreground=smooth(.82,1,row);depth=depth*(1-foreground)+3.0*foreground;
 return depth;
}
export function createPropertyPeekWorld(texture,{flat=false}={}){
 const world=new THREE.Group();world.name='Painted property depth study';
 const aspect=(texture.image?.width||1672)/(texture.image?.height||941);
 const width=flat?1:96,height=flat?1:54,positions=[],uv=[],indices=[],span=flat ? STILL_PICTURE_RADIUS+.01 : .94,viewDistance=1.8;
 for(let row=0;row<=height;row++)for(let column=0;column<=width;column++){
  const u=column/width,v=row/height,depth=flat ? .004 : propertyDepth(u,v),perspective=flat?1:(viewDistance+depth)/viewDistance;
  // Project the unchanged painting from the initial viewpoint onto a curved
  // depth surface. The centre view retains its composition; leaning adds relief.
  positions.push((u-(flat ? .5 : .46))*2*span*aspect*perspective,(v-.5)*2*span*perspective,-depth);uv.push(u,v);
 }
 for(let row=0;row<height;row++)for(let column=0;column<width;column++){
  const a=row*(width+1)+column,b=a+1,c=a+width+1,d=c+1;indices.push(a,b,d,a,d,c);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
 texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;
 const plane=new THREE.Plane(new THREE.Vector3(0,0,-1),0);
 const material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,stencilWrite:true,stencilRef:1,
  stencilFunc:THREE.EqualStencilFunc,stencilWriteMask:0,stencilZPass:THREE.KeepStencilOp,clippingPlanes:[plane]});
 const painting=new THREE.Mesh(geometry,material);painting.renderOrder=1;painting.name='Property painting on depth relief';world.add(painting);
 return createOpening({world,plane,ownedGeometry:new Set([geometry]),ownedMaterials:new Set([material]),release:()=>texture.dispose(),
  radius:flat?STILL_PICTURE_RADIUS:undefined,extras:{study:flat?'still photograph':'artistic depth approximation',paintingTriangles:width*height*2}});
}
