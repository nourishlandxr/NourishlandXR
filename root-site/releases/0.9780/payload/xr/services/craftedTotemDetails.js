import {craftedTotemPoint} from './craftedTotemGeometry.js';

// The inlay is real geometry, shared by the native renderer and the studio.
// Positions use the post's existing local coordinates. UV.y selects an atlas
// material: 2 bronze, 3 dark recess, 4 carved timber, 5 sage, 6 porcelain.
export function createCraftedTotemDetails(style='basic',radial=48){
 const vertices=[],indices=[],segments=Math.max(16,Math.min(48,radial));
 const primary=['basic','carved','botanical','organic'].includes(style);
 const point=(t,a)=>style==='organic'?[Math.cos(a)*(.62+.19*Math.exp(-t*24)+.025*Math.cos(t*Math.PI*2)),t*2-1,Math.min(Math.sin(a)*(.62+.19*Math.exp(-t*24)+.025*Math.cos(t*Math.PI*2)),(.62+.19*Math.exp(-t*24)+.025*Math.cos(t*Math.PI*2))*.91)]:craftedTotemPoint(t,a,style);
 const addTriangle=(a,b,c,material=2)=>{
  const u=b.map((n,i)=>n-a[i]),v=c.map((n,i)=>n-a[i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],length=Math.hypot(...n);
  if(length<1e-10)return;
  const first=vertices.length/8;
  for(const p of [a,b,c])vertices.push(...p,...n.map(value=>value/length),.25+p[0]*.06,material+.2);
  indices.push(first,first+1,first+2);
 };
 const quad=(a,b,c,d,mat)=>{addTriangle(a,b,c,mat);addTriangle(a,c,d,mat);};
 // Raised rolled metal collars follow the actual asymmetrical post.
 function band(t,halfHeight=.006,material=2,standOff=.025){
  const profile=[[-halfHeight,0],[-halfHeight*.60,standOff],[halfHeight*.60,standOff],[halfHeight,0]];
  const p=(j,i)=>{
   const a=i/segments*Math.PI*2,[dy,offset]=profile[j],q=point(Math.max(0,Math.min(1,t+dy/2)),a);
   return [q[0]+Math.cos(a)*offset,q[1],q[2]+Math.sin(a)*offset];
  };
  for(let j=0;j<profile.length-1;j++)for(let i=0;i<segments;i++)quad(p(j,i),p(j+1,i),p(j+1,i+1),p(j,i+1),material);
 }
 // Intersection of the true outline with a front-facing relief. There is no
 // assumed cylinder behind a carving, so details sit on the twisted trunk.
 const sections=new Map();
 function front(x,y){
  const t=Math.max(0,Math.min(1,(y+1)/2)),key=t.toFixed(5);
  if(!sections.has(key))sections.set(key,Array.from({length:129},(_,i)=>point(t,i/128*Math.PI*2)));
  const ring=sections.get(key);let z=-Infinity;
  for(let i=0;i<ring.length-1;i++){
   const a=ring[i],b=ring[i+1],dx=b[0]-a[0];if(Math.abs(dx)<1e-8)continue;
   const u=(x-a[0])/dx;if(u>=0&&u<=1)z=Math.max(z,a[2]+u*(b[2]-a[2]));
  }
  return Number.isFinite(z)?z:0;
 }
 function stem(points,halfWidth=.012,mat=4){
  for(let i=0;i<points.length-1;i++){
   const a=points[i],b=points[i+1],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1,nx=-dy/l*halfWidth,ny=dx/l*halfWidth;
   const p=(q,s,h)=>[q[0]+nx*s,q[1]+ny*s,front(q[0]+nx*s,q[1]+ny*s)+h];
   quad(p(a,-1,.012),p(b,-1,.012),p(b,0,.034),p(a,0,.034),mat);
   quad(p(a,0,.034),p(b,0,.034),p(b,1,.012),p(a,1,.012),mat);
  }
 }
 function leaf(a,b,width,mat=4){
  const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),nx=-dy/length,ny=dx/length,rows=radial>=48?8:5,columns=4;
  const p=(i,j)=>{
   const t=i/rows,s=j/columns*2-1,w=Math.sin(Math.PI*t)*width;
   const x=a[0]+dx*t+nx*w*s,y=a[1]+dy*t+ny*w*s;
   return [x,y,front(x,y)+.010+Math.sin(Math.PI*t)*Math.sqrt(Math.max(0,1-s*s))*.055];
  };
  for(let i=0;i<rows;i++)for(let j=0;j<columns;j++)quad(p(i,j),p(i+1,j),p(i+1,j+1),p(i,j+1),mat);
  const mid=Array.from({length:9},(_,i)=>{const t=i/8;return [a[0]+dx*t,a[1]+dy*t];});
  stem(mid,.004,2);
 }
 function faceLine(a,b,width=.016,mat=2){
  const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1,nx=-dy/length*width,ny=dx/length*width;
  quad([a[0]-nx,a[1]-ny,a[2]],[b[0]-nx,b[1]-ny,b[2]],[b[0]+nx,b[1]+ny,b[2]+.012],[a[0]+nx,a[1]+ny,a[2]+.012],mat);
 }
 function faceRing(cx,cy,rx,ry,z,mat=2){
  for(let i=0;i<segments;i++){
   const a=i/segments*Math.PI*2,b=(i+1)/segments*Math.PI*2;
   faceLine([cx+rx*Math.cos(a),cy+ry*Math.sin(a),z],[cx+rx*Math.cos(b),cy+ry*Math.sin(b),z],.012,mat);
  }
 }
 if(primary){
  for(const t of [.026,.099,.125])band(t,t===.026?.009:.006,2);
  band(.975,.009,2,.032);band(.995,.005,2,.035);
  const count=style==='botanical'?9:style==='organic'?5:7;
  const top=style==='organic'?.06:.19,bottom=style==='organic'?-.36:-.43;
  const fern=Array.from({length:25},(_,i)=>{const u=i/24;return [.035*Math.sin(u*Math.PI*1.2),bottom+(top-bottom)*u];});
  stem(fern,style==='carved'?.018:.011,4);
  for(let i=0;i<count;i++)for(const side of [-1,1]){
   const u=i/(count-1),y=bottom+.035+u*(top-bottom-.07),x=.035*Math.sin(u*Math.PI*1.2);
   const spread=(style==='carved'?.31:style==='botanical'?.18:.26)*(1-u*.64);
   leaf([x,y],[x+side*spread,y+.085],style==='botanical'?.026:.038,style==='botanical'&&i%3===0?6:4);
  }
  // Fine ring cuts on the turned foot are geometry rather than painted stripes.
  band(.058,.003,3,.010);band(.077,.0025,3,.008);
 }
 if(style==='sun'){
  faceRing(0,.70,1.26,.179,.523);faceRing(0,.70,.84,.119,.528);
  for(let i=0;i<24;i++){
   const a=i*Math.PI/12;
   faceLine([.89*Math.cos(a),.70+.126*Math.sin(a),.529],[1.16*Math.cos(a),.70+.164*Math.sin(a),.529],.012,2);
  }
 }
 if(style==='leaf'){
  faceLine([0,.40,.345],[0,.95,.345],.035,2);
  for(const side of [-1,1])for(let i=0;i<5;i++){
   const y=.47+i*.085,reach=1.16-i*.18;
   faceLine([0,y,.345],[side*reach,y+.09,.345],.012,2);
  }
 }
 if(style==='moon'){
  const points=Array.from({length:segments+1},(_,i)=>{const a=Math.PI*.36+i/segments*Math.PI*1.28;return [1.86*Math.cos(a),.72+.273*Math.sin(a),.358];});
  for(let i=0;i<points.length-1;i++)faceLine(points[i],points[i+1],.015,2);
  for(let i=0;i<7;i++){
   const a=Math.PI*.57+i*.35,x=1.48*Math.cos(a),y=.72+.216*Math.sin(a);
   faceRing(x,y,.035,.005,.364,2);
  }
 }
 if(['sun','leaf','moon'].includes(style)){
  for(const y of [-.81,-.77]){
   faceLine([-.81,y,.758],[.81,y,.758],.006,2);
  }
 }
 return {vertices:new Float32Array(vertices),indices:new Uint16Array(indices)};
}

export function appendCraftedTotemDetails(mesh,style,radial=48){
 const detail=createCraftedTotemDetails(style,radial);
 if(!detail.indices.length)return mesh;
 const offset=mesh.vertices.length/8,total=offset+detail.vertices.length/8;
 if(total>65535)throw Error('Crafted Totem exceeds the Uint16 geometry budget');
 const vertices=new Float32Array(mesh.vertices.length+detail.vertices.length);vertices.set(mesh.vertices);vertices.set(detail.vertices,mesh.vertices.length);
 const indices=new Uint16Array(mesh.indices.length+detail.indices.length);indices.set(mesh.indices);
 for(let i=0;i<detail.indices.length;i++)indices[mesh.indices.length+i]=detail.indices[i]+offset;
 return {vertices,indices};
}
