import * as THREE from '../vendor/three.module.min.js';

// Closed, curved surfaces with shared vertices: silhouettes and lighting stay
// smooth when the viewer leans into the portal. No transparent leaf cards.
export function botanicalLeaf(length, width, {bend=.16, roundness=.8, thickness=.002, rows=22}={}) {
 rows=Math.min(rows,12); const across=4,positions=[],uv=[],indices=[];
 for(let face=0;face<2;face++)for(let i=0;i<=rows;i++)for(let j=0;j<=across;j++){
  const t=i/rows,u=j/across*2-1;
  const envelope=Math.pow(Math.max(0,Math.sin(Math.PI*t)),roundness);
  const centre=bend*length*Math.sin(Math.PI*t*.85);
  const cup=width*.18*u*u*envelope;
  const skin=(face===0?1:-1)*thickness*Math.sin(Math.PI*t)*Math.sqrt(Math.max(0,1-u*u));
  positions.push(u*width*envelope,t*length,centre+cup+skin);
  uv.push(j/across,t);
 }
 const stride=across+1,faceSize=(rows+1)*stride;
 for(let face=0;face<2;face++)for(let i=0;i<rows;i++)for(let j=0;j<across;j++){
  const a=face*faceSize+i*stride+j,b=a+1,c=a+stride,d=c+1;
  if(face===0)indices.push(a,b,c,b,d,c);else indices.push(a,c,b,b,c,d);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

export function botanicalBranch(points,radius,{tip=radius*.3,segments=20,sides=12}={}) {
 segments=Math.min(segments,12);sides=Math.min(sides,8);
 const curve=new THREE.CatmullRomCurve3(points.map(p=>p.isVector3?p.clone():new THREE.Vector3(...p)));
 const g=new THREE.TubeGeometry(curve,segments,radius,sides,false),p=g.attributes.position;
 for(let i=0;i<=segments;i++){
  const centre=curve.getPointAt(i/segments),factor=1+(tip/radius-1)*Math.pow(i/segments,.85);
  for(let j=0;j<=sides;j++){const k=i*(sides+1)+j;p.setXYZ(k,centre.x+(p.getX(k)-centre.x)*factor,centre.y+(p.getY(k)-centre.y)*factor,centre.z+(p.getZ(k)-centre.z)*factor);}
 }
 g.computeVertexNormals();return g;
}

// Rose-apple inspired: narrow neck, widening shoulders, soft basal lobes.
export function botanicalRoseApple(size=.1) {
 const profile=[];for(let i=0;i<=14;i++){const t=i/14,r=size*(.18+.76*Math.pow(Math.sin(Math.PI*t*.84),1.35));profile.push(new THREE.Vector2(i===14?0:r,size*(.9-t*1.8)));}
 const g=new THREE.LatheGeometry(profile,20),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),a=Math.atan2(z,x),y=p.getY(i),lobe=1+.055*Math.cos(a*4)*Math.max(0,-y/size);p.setXYZ(i,x*lobe,y,z*lobe);}
 g.computeVertexNormals();return g;
}
