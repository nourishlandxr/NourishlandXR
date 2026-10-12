import * as THREE from '../assets/fruit-window/vendor/three.module.js';
export const MARKING_BRUSHES=Object.freeze({earth:{label:'Earth marks',colour:6,purpose:'Label pots, outline beds and draw symbols.'},water:{label:'Water lines',colour:3,purpose:'Show the direction water moves along your line.'},vine:{label:'Vine lines',colour:0,purpose:'Connect plants or ideas with a leafy line.'},firefly:{label:'Firefly paths',colour:2,purpose:'Guide visitors with softly travelling lights.'}});
export function createMarkingEffects(root,{capacity=384}={}){
 const leafGeometry=new THREE.BufferGeometry();leafGeometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-.012,.014,0,0,.038,0,0,0,0,0,.038,0,.012,.014,0],3));leafGeometry.computeVertexNormals();
 const leafMaterial=new THREE.MeshStandardMaterial({color:'#85b48b',side:THREE.DoubleSide,roughness:1}),lightMaterial=new THREE.MeshBasicMaterial({color:'#ffffff'}),lightGeometry=new THREE.SphereGeometry(1,8,4);
 const leaves=new THREE.InstancedMesh(leafGeometry,leafMaterial,capacity),lights=new THREE.InstancedMesh(lightGeometry,lightMaterial,capacity);
 for(const mesh of [leaves,lights]){mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.userData.livingMapDynamic=true;}lights.setColorAt(0,new THREE.Color());
 const paths=[];let attached=false,last=-Infinity;const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),scale=new THREE.Vector3(),rotation=new THREE.Quaternion();
 function at(path,d){const {points,lengths,length}=path;if(length===0)return position.copy(points[0]);d=Math.max(0,Math.min(length,d));let lo=0,hi=lengths.length-1;while(lo+1<hi){const mid=(lo+hi)>>1;if(lengths[mid]<d)lo=mid;else hi=mid;}return position.copy(points[lo]).lerp(points[hi],(d-lengths[lo])/Math.max(.000001,lengths[hi]-lengths[lo]));}
 function rebuild(strokes){paths.length=0;leaves.count=lights.count=0;last=-Infinity;
  for(const stroke of strokes){if(!['water','vine','firefly'].includes(stroke.brush))continue;if(!attached){root.add(leaves,lights);attached=true;}const points=stroke.points.map(p=>new THREE.Vector3(p.x,p.y,p.z)),lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+points[i].distanceTo(points[i-1]));const path={points,lengths,length:lengths.at(-1),width:stroke.width,brush:stroke.brush,colour:stroke.colour};
   if(stroke.brush==='vine'){for(let d=.025;d<path.length && leaves.count<capacity;d+=.055){at(path,d);rotation.setFromAxisAngle(new THREE.Vector3(0,0,1),(leaves.count%2?1:-1)*.9);matrix.compose(position,rotation,scale.setScalar(Math.max(.45,stroke.width/.005)));leaves.setMatrixAt(leaves.count++,matrix);}leaves.instanceMatrix.needsUpdate=true;}
   else if(paths.length<capacity)paths.push(path);
  }update(0,false);
 }
 function update(time,motion=true){if(!attached || !motion && last!==-Infinity || time-last<1/30 && motion)return;last=time;lights.count=0;rotation.identity();
  for(let i=0;i<paths.length;i++){const p=paths[i],number=Math.min(6,Math.max(1,Math.ceil(p.length/.15)));for(let j=0;j<number && lights.count<capacity;j++){const phase=(j/number+(motion?time*(p.brush==='water' ? .12 : .055):0))%1;at(p,p.length*phase);const radius=Math.max(.002,p.width*.7)*(p.brush==='firefly' && motion ? .8+.2*Math.sin(time*2+j) : 1);matrix.compose(position,rotation,scale.setScalar(radius));lights.setMatrixAt(lights.count,matrix);lights.setColorAt(lights.count++,new THREE.Color(p.brush==='water'?'#c1f4ff':'#fff5af'));}}
  lights.instanceMatrix.needsUpdate=true;lights.instanceColor.needsUpdate=true;
 }
 return {rebuild,update,snapshot:()=>({leaves:leaves.count,lights:lights.count,capacity}),destroy(){leaves.removeFromParent();lights.removeFromParent();leaves.dispose();lights.dispose();leafGeometry.dispose();lightGeometry.dispose();leafMaterial.dispose();lightMaterial.dispose();}};
}
