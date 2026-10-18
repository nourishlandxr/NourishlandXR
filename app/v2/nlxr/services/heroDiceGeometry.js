import * as THREE from '../vendor/three.module.min.js';

// The playful intro retains its spherical construction.
export const HERO_DICE_STYLE = Object.freeze({radius:1.72, widthSegments:12, heightSegments:6, roughness:.78, metalness:.025, edgeColour:0x304534, edgeOpacity:.2});
export function createHeroDiceGeometry(radius=HERO_DICE_STYLE.radius){
    const indexed=new THREE.SphereGeometry(radius,HERO_DICE_STYLE.widthSegments,HERO_DICE_STYLE.heightSegments);
    const geometry=indexed.toNonIndexed();indexed.dispose();geometry.computeVertexNormals();return geometry;
}
export function diceRegionDirections(count=6){
    const directions=[[0,0,1],[1,0,0],[0,1,0],[-1,0,0],[0,-1,0],[0,0,-1]];
    if(count>6)directions.push([.577,.577,-.577]);
    if(count>7)directions.push([-.577,-.577,.577]);
    return directions.slice(0,Math.max(1,Math.min(8,count))).map(([x,y,z])=>new THREE.Vector3(x,y,z).normalize());
}
// Explorer uses the confirmed pentagonal reference: a regular dodecahedron.
// Six pentagons carry topics, one carries context; other faces stay textured.
export function createKnowledgeDiceGeometry(radius=.12){
 const template=new THREE.DodecahedronGeometry(radius,0),points=template.attributes.position,planes=[],a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
 for(let i=0;i<points.count;i+=3){
  a.fromBufferAttribute(points,i);b.fromBufferAttribute(points,i+1);c.fromBufferAttribute(points,i+2);
  const normal=b.clone().sub(a).cross(c.clone().sub(a)).normalize();if(normal.dot(a)<0)normal.negate();
  if(!planes.some(plane=>plane.normal.dot(normal)>1-1e-6))planes.push({normal,distance:normal.dot(a),region:Math.min(planes.length,7)});
 }
 template.dispose();
 const orientation=new THREE.Quaternion().setFromUnitVectors(planes[0].normal,new THREE.Vector3(0,0,1));
 for(const plane of planes)plane.normal.applyQuaternion(orientation);
 const vertices=[];
 for(let i=0;i<planes.length;i++)for(let j=i+1;j<planes.length;j++)for(let k=j+1;k<planes.length;k++){
  const a=planes[i],b=planes[j],c=planes[k],bc=b.normal.clone().cross(c.normal),det=a.normal.dot(bc);if(Math.abs(det)<1e-7)continue;
  const point=bc.multiplyScalar(a.distance).addScaledVector(c.normal.clone().cross(a.normal),b.distance).addScaledVector(a.normal.clone().cross(b.normal),c.distance).divideScalar(det);
  if(planes.some(p=>p.normal.dot(point)>p.distance+radius*1e-5) || vertices.some(v=>v.distanceTo(point)<radius*1e-5))continue;vertices.push(point);
 }
 const positions=[],normals=[],uvs=[],regions=[],frames=[];
 for(const plane of planes){
  const polygon=vertices.filter(v=>Math.abs(plane.normal.dot(v)-plane.distance)<radius*1e-5);if(polygon.length<3)continue;
  const centre=polygon.reduce((sum,p)=>sum.add(p),new THREE.Vector3()).divideScalar(polygon.length),right=new THREE.Vector3(0,1,0).cross(plane.normal);if(right.length()<.01)right.set(1,0,0);right.normalize();const up=plane.normal.clone().cross(right).normalize();
  polygon.sort((a,b)=>Math.atan2(a.clone().sub(centre).dot(up),a.clone().sub(centre).dot(right))-Math.atan2(b.clone().sub(centre).dot(up),b.clone().sub(centre).dot(right)));
  const inradius=Math.min(...polygon.map((p,i)=>{const next=polygon[(i+1)%polygon.length],edge=next.clone().sub(p);return centre.clone().sub(p).cross(edge).length()/edge.length();}));
  // Uniform UV scale keeps circular targets circular on each pentagonal face.
  // Leave enough margin for the port outline and keep every vertex in its tile.
  const extent=Math.max(...polygon.map(p=>{const delta=p.clone().sub(centre);return Math.max(Math.abs(delta.dot(right)),Math.abs(delta.dot(up)));}));
  const uvDiameter=Math.max(inradius*2.4,extent*2.04);
  if(plane.region<7)frames[plane.region]={centre,normal:plane.normal.clone(),right,up,inradius};
  for(let i=0;i<polygon.length;i++){
   regions.push(plane.region);
   for(const p of [centre,polygon[i],polygon[(i+1)%polygon.length]]){
    positions.push(p.x,p.y,p.z);normals.push(plane.normal.x,plane.normal.y,plane.normal.z);
    // The complete polygon fits inside its atlas tile. A circular link target
    // stays inside the face's inradius, and text never wraps around an edge.
    const delta=p.clone().sub(centre),x=.5+delta.dot(right)/uvDiameter,y=.5-delta.dot(up)/uvDiameter;
    uvs.push((plane.region%4+x)/4,(Math.floor(plane.region/4)+y)/2);
   }
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.userData.knowledgeRegions=regions;geometry.userData.knowledgeFrames=frames;return geometry;
}
let knowledgeFrames;
export function knowledgeDiceFaceFrames(radius=.12){
 if(!knowledgeFrames){const geometry=createKnowledgeDiceGeometry(1);knowledgeFrames=geometry.userData.knowledgeFrames;geometry.dispose();}
 return knowledgeFrames.map(f=>({...f,centre:f.centre.clone().multiplyScalar(radius),inradius:f.inradius*radius}));
}
const regionCache=new WeakMap();
export function diceFacetRegions(geometry,count=6){
    if(geometry.userData.knowledgeRegions)return geometry.userData.knowledgeRegions;
    let cache=regionCache.get(geometry);if(!cache){cache=new Map();regionCache.set(geometry,cache);}if(cache.has(count))return cache.get(count);
    const directions=diceRegionDirections(count),positions=geometry.attributes.position,regions=[];
    for(let i=0;i<positions.count;i+=3){
        const centre=new THREE.Vector3();for(let j=0;j<3;j++)centre.add(new THREE.Vector3().fromBufferAttribute(positions,i+j));centre.normalize();
        let best=0;directions.forEach((direction,index)=>{if(centre.dot(direction)>centre.dot(directions[best]))best=index;});regions.push(best);
    }
    cache.set(count,regions);return regions;
}
