// Offline BSP subtraction. Cap polygons retain a separate flesh material;
// there is no boolean geometry work during an XR frame.
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
const EPSILON=1e-5;
class Vertex{
    constructor(position,normal,uv){this.position=position;this.normal=normal;this.uv=uv;}
    clone(){return new Vertex(this.position.clone(),this.normal.clone(),this.uv.clone());}
    flip(){this.normal.negate();}
    interpolate(other,t){return new Vertex(this.position.clone().lerp(other.position,t),this.normal.clone().lerp(other.normal,t),this.uv.clone().lerp(other.uv,t));}
}
class Polygon{
    constructor(vertices,material){this.vertices=vertices;this.material=material;this.normal=new THREE.Vector3().subVectors(vertices[1].position,vertices[0].position).cross(new THREE.Vector3().subVectors(vertices[2].position,vertices[0].position)).normalize();this.w=this.normal.dot(vertices[0].position);}
    clone(){return new Polygon(this.vertices.map(v=>v.clone()),this.material);}
    flip(){this.vertices.reverse().forEach(v=>v.flip());this.normal.negate();this.w=-this.w;}
}
class BSP{
    constructor(polygons=[]){this.polygons=[];this.front=null;this.back=null;this.plane=null;if(polygons.length)this.build(polygons);}
    split(polygon,front,back,coplanarFront=front,coplanarBack=back){
        let type=0;const types=polygon.vertices.map(v=>{const t=this.plane.normal.dot(v.position)-this.plane.w,result=t< -EPSILON?2:t>EPSILON?1:0;type|=result;return result;});
        if(type===0)(this.plane.normal.dot(polygon.normal)>0?coplanarFront:coplanarBack).push(polygon);
        else if(type===1)front.push(polygon);else if(type===2)back.push(polygon);
        else{const f=[],b=[];polygon.vertices.forEach((v,i)=>{const j=(i+1)%polygon.vertices.length,other=polygon.vertices[j];if(types[i]!==2)f.push(v);if(types[i]!==1)b.push(types[i]!==2?v.clone():v);if((types[i]|types[j])===3){const t=(this.plane.w-this.plane.normal.dot(v.position))/this.plane.normal.dot(other.position.clone().sub(v.position)),point=v.interpolate(other,t);f.push(point);b.push(point.clone());}});if(f.length>=3)front.push(new Polygon(f,polygon.material));if(b.length>=3)back.push(new Polygon(b,polygon.material));}
    }
    build(polygons){if(!polygons.length)return;if(!this.plane)this.plane={normal:polygons[0].normal.clone(),w:polygons[0].w};const front=[],back=[];for(const p of polygons)this.split(p,front,back,this.polygons,this.polygons);if(front.length){this.front ||= new BSP();this.front.build(front);}if(back.length){this.back ||= new BSP();this.back.build(back);}}
    all(){return [...this.polygons,...(this.front?.all() || []),...(this.back?.all() || [])];}
    invert(){for(const p of this.polygons)p.flip();if(this.plane){this.plane.normal.negate();this.plane.w=-this.plane.w;}this.front?.invert();this.back?.invert();[this.front,this.back]=[this.back,this.front];}
    clip(polygons){if(!this.plane)return polygons.slice();let front=[],back=[];for(const p of polygons)this.split(p,front,back);if(this.front)front=this.front.clip(front);back=this.back?this.back.clip(back):[];return front.concat(back);}
    clipTo(other){this.polygons=other.clip(this.polygons);this.front?.clipTo(other);this.back?.clipTo(other);}
}
function polygons(part,material=0){const result=[];for(let i=0;i<part.indices.length;i+=3){const vertices=part.indices.slice(i,i+3).map(index=>new Vertex(new THREE.Vector3(...part.positions.slice(index*3,index*3+3)),new THREE.Vector3(...part.normals.slice(index*3,index*3+3)),new THREE.Vector2(...part.uvs.slice(index*2,index*2+2))));const p=new Polygon(vertices,material);if(p.normal.lengthSq()>.5)result.push(p);}return result;}
export function carveAppleBite(parts,center,radius=.34){
    const sphere=new THREE.SphereGeometry(radius,10,8);sphere.translate(...center);const cutter={positions:Array.from(sphere.attributes.position.array),normals:Array.from(sphere.attributes.normal.array),uvs:Array.from(sphere.attributes.uv.array),indices:Array.from(sphere.index.array)};
    const a=new BSP(parts.flatMap(p=>polygons(p,p.material || 0))),b=new BSP(polygons(cutter,1));a.invert();a.clipTo(b);b.clipTo(a);b.invert();b.clipTo(a);b.invert();a.build(b.all());a.invert();sphere.dispose();
    const groups=new Map();for(const p of a.all()){if(!groups.has(p.material))groups.set(p.material,{positions:[],normals:[],uvs:[],indices:[],material:p.material});const group=groups.get(p.material);for(let i=1;i<p.vertices.length-1;i++)for(const v of [p.vertices[0],p.vertices[i],p.vertices[i+1]]){group.indices.push(group.positions.length/3);group.positions.push(...v.position.toArray());group.normals.push(...v.normal.clone().normalize().toArray());group.uvs.push(...v.uv.toArray());}}return [...groups.values()].map(group=>{const result={positions:[],normals:[],uvs:[],indices:[],material:group.material},vertices=new Map();for(let i=0;i<group.indices.length;i++){const values=[...group.positions.slice(i*3,i*3+3),...group.normals.slice(i*3,i*3+3),...group.uvs.slice(i*2,i*2+2)],key=values.map(v=>Math.round(v*1e5)).join(',');if(!vertices.has(key)){vertices.set(key,result.positions.length/3);result.positions.push(...values.slice(0,3));result.normals.push(...values.slice(3,6));result.uvs.push(...values.slice(6));}result.indices.push(vertices.get(key));}return result;});
}
