import * as THREE from './nlxr/vendor/three.module.min.js';
import {BIOME_WALKS,findGroundRoute} from './biome-discovery-model.js';

export function planBiomeWalks({scene,plan,height,landmarks=[]}){
 const terrain=[],walks=[];
  // Sample actual water triangles, rather than treating a pond's rectangular
  // bounds as water. This preserves paths along irregular banks.
  const waterBins=new Map(),waterCell=.12;
  scene.updateMatrixWorld(true);
  scene.traverse(mesh=>{
    if(mesh.isMesh&&['terrain','green_inner_wall','green_rim_collar'].includes(mesh.userData.role))terrain.push(mesh);
    if(!mesh.isMesh||mesh.isInstancedMesh||!mesh.visible||mesh.userData.role!=='water')return;
    const g=mesh.geometry,p=g?.attributes.position,idx=g?.index;if(!p)return;
    const count=idx?.count??p.count;
    for(let i=0;i<count;i+=3){const v=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,idx?idx.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld));
      const den=(v[1].z-v[2].z)*(v[0].x-v[2].x)+(v[2].x-v[1].x)*(v[0].z-v[2].z);if(Math.abs(den)<1e-12)continue;
      const t={v,den};for(let x=Math.floor(Math.min(...v.map(p=>p.x))/waterCell);x<=Math.floor(Math.max(...v.map(p=>p.x))/waterCell);x++)for(let z=Math.floor(Math.min(...v.map(p=>p.z))/waterCell);z<=Math.floor(Math.max(...v.map(p=>p.z))/waterCell);z++){const key=x+','+z,list=waterBins.get(key)||[];list.push(t);waterBins.set(key,list);}
    }
  });
  function dryHeight(x,z){const h=height(x,z,NaN);if(!Number.isFinite(h))return NaN;
    for(const {v:[a,b,c],den}of waterBins.get(Math.floor(x/waterCell)+','+Math.floor(z/waterCell))||[]){const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/den,w=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/den;if(u>=0&&w>=0&&u+w<=1&&u*a.y+w*b.y+(1-u-w)*c.y>h+.001)return NaN;}
    return h;
  }
  const pieces=plan.pieces.map(p=>({...p,p:new THREE.Vector3(...p.label_position)}));
  const owners=landmarks.length===5?landmarks.map(m=>({family_id:m.family,p:new THREE.Vector3(...m.position)})):pieces;
  const familyAt=(x,z)=>owners.reduce((a,b)=>Math.hypot(x-a.p.x,z-a.p.z)<Math.hypot(x-b.p.x,z-b.p.z)?a:b).family_id;
  function anchor(piece,id){const candidates=[piece.p,...(piece.label_candidates||[]).map(p=>new THREE.Vector3(...p))];
    for(let r=0;r<=.22;r+=.035)for(let a=0;a<8;a++)candidates.push(new THREE.Vector3(piece.p.x+Math.cos(a*Math.PI/4)*r,0,piece.p.z+Math.sin(a*Math.PI/4)*r));
    return candidates.find(p=>Number.isFinite(dryHeight(p.x,p.z))&&familyAt(p.x,p.z)===id)?.clone();
  }
  for(const walk of BIOME_WALKS){let positions;const native=landmarks.find(m=>m.family===walk.id);
    if(native?.candidates?.length){
      // Use the current master's inner biome landmarks, which were authored
      // for this camera window. Outer wheel anchors disappear behind canopy.
      const center=new THREE.Vector3(...native.position),radial=new THREE.Vector3(center.x-.125,0,center.z+.2416666783).normalize(),side=new THREE.Vector3(-radial.z,0,radial.x);
      const candidates=native.candidates.map(p=>new THREE.Vector3(...p)).filter(p=>Number.isFinite(dryHeight(p.x,p.z))&&familyAt(p.x,p.z)===walk.id);
      positions=[-.12,0,.12].map(offset=>{const aim=center.clone().addScaledVector(side,offset);return candidates.slice().sort((a,b)=>Math.hypot(a.x-aim.x,a.z-aim.z)-Math.hypot(b.x-aim.x,b.z-aim.z))[0]?.clone();});
    }else positions=walk.pieces.map(id=>anchor(pieces.find(p=>p.id===id),walk.id));
    if(positions.some(p=>!p))continue;positions.forEach(p=>p.y=dryHeight(p.x,p.z));
    const planned=[];
    const connect=(a,b)=>findGroundRoute(a.toArray(),b.toArray(),{height:dryHeight,allowed:(x,z)=>familyAt(x,z)===walk.id});
    for(let i=1;i<positions.length;i++){
      let points=connect(positions[i-1],positions[i]);
      if(!points.length){
        // Wetland stops can share a connected bank rather than insisting on
        // visiting an isolated island. Keep them meaningfully separated.
        const origin=positions[i-1],candidates=[];
        for(const radius of [.14,.21,.28,.35])for(let j=0;j<16;j++){const p=new THREE.Vector3(origin.x+Math.cos(j*Math.PI/8)*radius,0,origin.z+Math.sin(j*Math.PI/8)*radius);p.y=dryHeight(p.x,p.z);if(Number.isFinite(p.y)&&familyAt(p.x,p.z)===walk.id&&positions.slice(0,i).every(q=>q.distanceTo(p)>.10))candidates.push(p);}
        candidates.sort((a,b)=>a.distanceTo(positions[i])-b.distanceTo(positions[i]));
        for(const p of candidates){const route=connect(origin,p);if(route.length>=5){positions[i]=p;points=route;break;}}
      }
      planned.push(points);
    }
    walks.push({...walk,positions,segments:planned});
  }
  return walks;
}
