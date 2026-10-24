import {createTotemSculptureGeometry} from "./spatialTotemSculpture.js?v=0.9819";
const meshes=new Map(),mounts=new Map();
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function meshFor(style){if(!meshes.has(style))meshes.set(style,createTotemSculptureGeometry(48,32,style));return meshes.get(style);}
// Intersect the actual cached mesh at the sign's height, rather than assuming
// every post has the same circular radius or depth.
export function totemMountCrossSection(style,y){
 const mesh=meshFor(style),v=mesh.vertices,segments=[];
 for(let i=0;i<mesh.indices.length;i+=3){
  const corners=[0,1,2].map(k=>{const j=mesh.indices[i+k]*8;return [v[j],v[j+1],v[j+2]]}),points=[];
  for(let edge=0;edge<3;edge++){
   const a=corners[edge],b=corners[(edge+1)%3],dy=b[1]-a[1];
   if(Math.abs(a[1]-y)<1e-7)points.push([a[0],a[2]]);
   if(Math.abs(dy)>1e-10){const t=(y-a[1])/dy;if(t>0&&t<1)points.push([a[0]+(b[0]-a[0])*t,a[2]+(b[2]-a[2])*t]);}
  }
  const unique=points.filter((p,index)=>points.findIndex(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<1e-7)===index);
  if(unique.length===2)segments.push(unique);else if(unique.length>2)for(let k=0;k<unique.length;k++)segments.push([unique[k],unique[(k+1)%unique.length]]);
 }
 if(!segments.length)throw Error('No Totem surface at the sign height');
 return segments;
}
export function totemSignMount({style='carved',y,width,height,halfWidth=.07,halfDepth=.035,halfHeight=.69,side=0,boardHalfDepth=.009}){
 const key=[style,y,width,height,halfWidth,halfDepth,halfHeight,side,boardHalfDepth].join(':');
 if(mounts.has(key))return mounts.get(key);
 const section=totemMountCrossSection(style,clamp(y/halfHeight-1,-.999,.999));
 const xs=section.flatMap(segment=>segment.map(p=>p[0]*halfWidth)),lo=Math.min(...xs),hi=Math.max(...xs),mid=(lo+hi)/2,reach=side<0?mid-lo:hi-mid;
 const rootX=mid+side*reach*.35;
 let mountX=side?rootX+side*Math.min(.012,reach*.18):mid;
 const surfaceAt=x=>{
  const hits=[];for(const [a,b]of section){const dx=(b[0]-a[0])*halfWidth;if(Math.abs(dx)<1e-9){if(Math.abs(x-a[0]*halfWidth)<1e-6)hits.push(a[1]*halfDepth,b[1]*halfDepth);continue;}const t=(x-a[0]*halfWidth)/dx;if(t>=-1e-6&&t<=1+1e-6)hits.push((a[1]+(b[1]-a[1])*t)*halfDepth);}
  return hits.length?Math.max(...hits):null;
 };
 let postFront=surfaceAt(mountX);
 if(postFront===null){const point=section.flat().reduce((a,b)=>a[1]>b[1]?a:b);mountX=point[0]*halfWidth;postFront=point[1]*halfDepth;}
 const boardBack=postFront+.003,boardFront=boardBack+boardHalfDepth*2+.003;
 const bracketBack=postFront-.006,bracketFront=boardBack+.006;
 const mount={x:side?rootX+side*width/2:mid,front:boardFront,boardBack,boardHalfDepth,
  bracket:{x:mountX,y,z:(bracketBack+bracketFront)/2,halfWidth:Math.min(.014,(hi-lo)*.22),halfHeight:Math.min(.023,height*.24),halfDepth:(bracketFront-bracketBack)/2},
  postContact:{x:mountX,y,z:postFront}};
 if(mounts.size>=256)mounts.delete(mounts.keys().next().value);mounts.set(key,mount);return mount;
}
