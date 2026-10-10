import * as THREE from '../assets/fruit-window/vendor/three.module.js';

// Twelve rounded pentagonal shell cells; one reusable mesh for both XR eyes.
export function createLivingSphereGeometry(quality='medium'){
 const ico=new THREE.IcosahedronGeometry(1,0),points=ico.attributes.position,vertices=[],faces=[];
 for(let i=0;i<points.count;i+=3){const ids=[];for(let j=0;j<3;j++){const v=new THREE.Vector3().fromBufferAttribute(points,i+j).normalize();let id=vertices.findIndex(x=>x.distanceTo(v)<.001);if(id<0){id=vertices.length;vertices.push(v);}ids.push(id);}faces.push({ids,center:vertices[ids[0]].clone().add(vertices[ids[1]]).add(vertices[ids[2]]).normalize()});}ico.dispose();
 const rings=quality==='low'?5:quality==='high'?12:8,steps=quality==='low'?3:quality==='high'?6:4,packed=[],allIndices=[];
 vertices.forEach((axis,id)=>{
  const ref=Math.abs(axis.y)<.9?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0),right=new THREE.Vector3().crossVectors(ref,axis).normalize(),up=new THREE.Vector3().crossVectors(axis,right).normalize();
  const corners=faces.filter(f=>f.ids.includes(id)).map(f=>f.center).sort((a,b)=>Math.atan2(a.dot(up),a.dot(right))-Math.atan2(b.dot(up),b.dot(right))),outline=[];
  corners.forEach((v,i)=>{const prev=corners[(i+4)%5],next=corners[(i+1)%5],a=v.clone().lerp(prev,.22),b=v.clone().lerp(next,.22);
   for(let j=0;j<steps;j++){const t=j/steps;outline.push(a.clone().multiplyScalar((1-t)**2).addScaledVector(v,2*t*(1-t)).addScaledVector(b,t*t).lerp(axis,.012).normalize());}
   const end=next.clone().lerp(v,.22);for(let j=0;j<steps;j++)outline.push(b.clone().lerp(end,j/steps).lerp(axis,.012).normalize());
  });
  const n=outline.length,p=[],ix=[];
  for(let r=0;r<=rings;r++){const t=r/rings;for(const edge of outline){const v=axis.clone().lerp(edge,t).normalize().multiplyScalar(1+.052*Math.pow(1-t*t,1.4));p.push(v.x,v.y,v.z);}}
  for(let r=0;r<rings;r++)for(let j=0;j<n;j++){const a=r*n+j,b=r*n+(j+1)%n,c=(r+1)*n+j,d=(r+1)*n+(j+1)%n;ix.push(a,b,c,b,d,c);}
  for(let i=0;i<ix.length;i+=3){const b=ix[i+1];ix[i+1]=ix[i+2];ix[i+2]=b;}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setIndex(ix);geo.computeVertexNormals();const normals=geo.attributes.normal.array,base=packed.length/10;
  for(let i=0;i<p.length;i+=3)packed.push(p[i],p[i+1],p[i+2],normals[i],normals[i+1],normals[i+2],axis.x,axis.y,axis.z,id);
  allIndices.push(...ix.map(i=>i+base));geo.dispose();
 });
 return {vertices:new Float32Array(packed),indices:new Uint16Array(allIndices),stride:10};
}
