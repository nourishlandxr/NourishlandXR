import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
export const LEAF_VARIETIES=['rounded creeping','ovate pointed','elliptic','heart shaped','fern leaflet','lanceolate','soft lobed','rainforest drip tip'];
const seed=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
function shape(kind,t){const s=Math.max(0,Math.sin(Math.PI*t));switch(kind){
 case 0:return s**.45;
 case 1:return s**.65*(1-.55*smooth(.55,1,t));
 case 2:return s**.85;
 case 3:return s**.48*(1-.65*smooth(.45,1,t));
 case 4:return s**1.20*.72;
 case 5:return s**1.45*.78;
 case 6:return s**.65*(.92+.08*Math.cos(t*Math.PI*6)**2)*(1-.42*smooth(.65,1,t));
 default:return s**.58*(1-.82*smooth(.60,1,t));
}}
function normalData(points,indices){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.setIndex(indices);g.computeVertexNormals();const out=Array.from(g.attributes.normal.array);g.dispose();return out;}
function result(poses,uv,indices,extra={}){const normals=poses.map(p=>normalData(p,indices));return {positions:poses[0],normals:normals[0],uv,indices,morphs:[0,1].map(i=>({position:poses[i+1].map((v,n)=>v-poses[i][n]),normal:normals[i+1].map((v,n)=>v-normals[i][n])})),...extra};}
export function refineLeaves(p,name,values,tier){
 const uv=values(p.attributes.TEXCOORD_0),base=values(p.attributes.POSITION),morphs=p.targets.map(t=>values(t.POSITION)),sourceIndices=values(p.indices),grid=[],indices=[],outUv=[],poses=[[],[],[]],varieties=Array(8).fill(0);let leafCount=0;
 for(let start=0;start<base.length/3;){let end=start+3;while(end<base.length/3&&uv[end*2+1]<uv[(end-3)*2+1]-.00001)end+=3;const rows=(end-start)/3;if(rows<3||rows>5)return null;grid.push({start,rows});start=end;}
 const tri=Array.from(sourceIndices.slice(0,3)),area=tri.reduce((sum,i,k)=>sum+uv[i*2]*uv[tri[(k+1)%3]*2+1]-uv[tri[(k+1)%3]*2]*uv[i*2+1],0),hero=/Large foreground|Vine leaves/.test(name),side=/Outer side/.test(name),retention=hero?1:tier==='hd'?(side?.50:.70):(side?.27:.40);
 const family=/fine paired|sage|herb/.test(name)?[4,5]:/rounded|small leaf mats/.test(name)?[0,1]:/lobed/.test(name)?[6,7]:[2,3];
 for(const [number,leaf] of grid.entries()){
  // Evenly spaced survivors keep every planting group, with no runtime randomness.
  if(!hero&&Math.floor((number+1)*retention)===Math.floor(number*retention))continue;
  const mid=(leaf.start+Math.floor(leaf.rows/2)*3+1)*3,mature=[0,1,2].map(c=>base[mid+c]+morphs[0][mid+c]+morphs[1][mid+c]),cluster=Math.floor(mature[0]*16)*73+Math.floor(mature[1]*16)*131+Math.floor(mature[2]*16)*29,kind=family[seed(cluster)>.5?1:0],steps=hero?10:tier==='hd'?6:4,columns=hero?5:3,count=poses[0].length/3;
  for(let pose=0;pose<3;pose++){
   const centres=[];let widest=0,widthVector=new THREE.Vector3();
   for(let row=0;row<leaf.rows;row++){const verts=[0,1,2].map(col=>{const i=(leaf.start+row*3+col)*3;return new THREE.Vector3(...[0,1,2].map(c=>base[i+c]+(pose>0?morphs[0][i+c]:0)+(pose>1?morphs[1][i+c]:0)));});centres.push(verts[1]);const span=verts[2].clone().sub(verts[0]).multiplyScalar(.5);if(span.length()>widest){widest=span.length();widthVector=span.multiplyScalar(hero?1.12:side?1.16:1.22);}}
   const curve=new THREE.CatmullRomCurve3(centres,false,'centripetal'),axis=centres.at(-1).clone().sub(centres[0]),cup=axis.cross(widthVector).normalize();
   for(let row=0;row<=steps;row++){const t=row/steps,centre=curve.getPoint(t),span=widthVector.clone().multiplyScalar(Math.max(shape(kind,t),.002));for(let col=0;col<columns;col++){const across=col/(columns-1)*2-1,point=centre.clone().addScaledVector(span,across).addScaledVector(cup,Math.abs(across)*span.length()*.12*Math.sin(Math.PI*t)),radius=Math.hypot(point.x,point.y);if(radius<.832){point.x*=.832/radius;point.y*=.832/radius;}poses[pose].push(point.x,point.y,point.z);if(pose===0)outUv.push(col/(columns-1),1-t);}}
  }
  for(let row=0;row<steps;row++)for(let col=0;col<columns-1;col++){const a=count+row*columns+col,b=a+1,d=a+columns,e=d+1;indices.push(...(area<0?[a,b,e,a,e,d]:[a,e,b,a,d,e]));}leafCount++;varieties[kind]++;
 }
 return result(poses,outUv,indices,{leafCount,sourceLeafCount:grid.length,varieties});
}

// One unbroken descending axis. Thin feeders connect directly to that axis.
export function taprootGeometry(feeders=false){
 const anchor=new THREE.Vector3(0,-.946,.055),axis=t=>new THREE.Vector3(.008*Math.sin(t*4)*t,-.946-.654*t,.055-.045*t),paths=[];
 if(!feeders)paths.push({points:Array.from({length:25},(_,i)=>axis(i/24)),width:.016,sides:8});
 else for(let i=0;i<16;i++){const t=.15+i*.046,start=axis(t),sign=i%2?-1:1,reach=.055+seed(i)*.07,drop=.045+seed(i+30)*.075;paths.push({points:Array.from({length:9},(_,j)=>{const u=j/8;return start.clone().add(new THREE.Vector3(sign*reach*Math.sin(u*Math.PI/2),-drop*u,.018*Math.sin(u*4+i)*u));}),width:.00075+seed(i+50)*.0003,sides:4});}
 const positions=[],uv=[],indices=[];
 for(const path of paths){const count=positions.length/3;for(const [i,point] of path.points.entries()){const t=i/(path.points.length-1),tangent=path.points[Math.min(i+1,path.points.length-1)].clone().sub(path.points[Math.max(0,i-1)]).normalize(),normal=tangent.clone().cross(new THREE.Vector3(0,0,1)).normalize(),other=tangent.clone().cross(normal).normalize(),radius=path.width*(1-t)**1.2+path.width*.025;for(let j=0;j<path.sides;j++){const a=j/path.sides*Math.PI*2,p=point.clone().addScaledVector(normal,Math.cos(a)*radius).addScaledVector(other,Math.sin(a)*radius);positions.push(p.x,p.y,p.z);uv.push(j/path.sides,1-t);}}
  for(let i=0;i<path.points.length-1;i++)for(let j=0;j<path.sides;j++){const a=count+i*path.sides+j,b=count+i*path.sides+(j+1)%path.sides,c=b+path.sides,d=a+path.sides;indices.push(a,b,c,a,c,d);}
 }
 const early=[],middle=[];for(let i=0;i<positions.length;i+=3){const p=new THREE.Vector3(...positions.slice(i,i+3)),a=anchor.clone().lerp(p,.012),progress=feeders?.55:.50,cut=axis(progress),m=p.y>=cut.y?p:cut.clone().lerp(p,.02);early.push(a.x,a.y,a.z);middle.push(m.x,m.y,m.z);}
 return result([early,middle,positions],uv,indices,{primaryAxes:feeders?0:1,feederRoots:feeders?16:0,maxFeederDiameter:feeders?.00216:0});
}

export function rainforestPalette(material){
 const name=material.name||'',p=material.pbrMetallicRoughness;if(!p)return;
 const palette=/fine paired/.test(name)?[.026,.085,.056]:/herbs/.test(name)?[.050,.110,.083]:/rounded/.test(name)?[.035,.105,.064]:/lobed/.test(name)?[.016,.065,.037]:/leaf mats/.test(name)?[.025,.080,.047]:/oval/.test(name)?[.020,.075,.043]:/moss cushion/.test(name)?[.025,.085,.043]:null;
 if(palette){p.baseColorFactor=[...palette,1];delete p.baseColorTexture;p.roughnessFactor=/rounded/.test(name)?.53:.65;}
}

export function slimRootCrown(p,values){
 const base=values(p.attributes.POSITION),morphs=p.targets.map(t=>values(t.POSITION)),poses=[0,1,2].map(pose=>Array.from(base,(v,i)=>v+(pose>0?morphs[0][i]:0)+(pose>1?morphs[1][i]:0)));
 for(const points of poses)for(let start=0;start<points.length;start+=21){const centre=[0,0,0];for(let n=0;n<7;n++)for(let c=0;c<3;c++)centre[c]+=points[start+n*3+c]/7;for(let n=0;n<7;n++)for(let c=0;c<3;c++)points[start+n*3+c]=centre[c]+(points[start+n*3+c]-centre[c])*.38;}
 return result(poses,Array.from(values(p.attributes.TEXCOORD_0)),Array.from(values(p.indices)));
}
