import fs from 'node:fs';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';

// Original lightweight dragonfly: segmented abdomen, six legs, four shaped
// wings and raised veins. Wing pivots stay separate for runtime flapping.
const root=new THREE.Group();root.name='Welcome dragonfly';
const material=(name,color)=>new THREE.MeshStandardMaterial({name,color,roughness:.56,metalness:.12});
const teal=material('Soft teal body','#628f89'),bronze=material('Abdomen bands','#bdac77'),eyes=material('Turquoise eyes','#89c5c8'),wing=material('Pearl wings','#e4ead6'),vein=material('Wing veins','#a7bba7'),legs=material('Legs','#627b68');
const sphere=new THREE.SphereGeometry(1,16,10);
function ellipsoid(name,position,scale,mat){const mesh=new THREE.Mesh(sphere,mat);mesh.name=name;mesh.position.set(...position);mesh.scale.set(...scale);root.add(mesh);return mesh;}
ellipsoid('Thorax',[0,0,-.015],[.013,.011,.023],teal);
ellipsoid('Head',[0,.005,-.046],[.014,.01,.011],teal);
for(const side of [-1,1])ellipsoid('Eye '+side,[side*.011,.008,-.049],[.007,.008,.007],eyes);
for(let i=0;i<9;i++)ellipsoid('Abdomen '+i,[0,-.001,.011+i*.009],[.006-i*.0004,.005-i*.0003,.007],i%3===1?bronze:teal);
function rod(a,b,r,mat,parent=root){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start),mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r*.8,delta.length(),6),mat);mesh.position.copy(start.add(end).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());parent.add(mesh);return mesh;}
for(const side of [-1,1])for(let i=0;i<3;i++){const z=-.029+i*.012,a=[side*.008,-.005,z],b=[side*.022,-.018,z+.008],c=[side*.032,-.026,z-.009];rod(a,b,.001,legs);rod(b,c,.0008,legs);}
for(const side of [-1,1])for(const front of [-1,1]){
 const pivot=new THREE.Group();pivot.name=`Wing_${side}_${front}`;pivot.position.set(side*.009,.007,front*.013-.012);root.add(pivot);
 const shape=new THREE.Shape();shape.moveTo(0,0);shape.bezierCurveTo(.018,-.008,.065,-.013,.089,0);shape.bezierCurveTo(.071,.012,.027,.018,0,0);
 const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.0007,bevelEnabled:false,curveSegments:10}),wing);mesh.rotation.x=-Math.PI/2;mesh.scale.x=side;mesh.rotation.y=front*side*.23;pivot.add(mesh);
 for(const z of [-1,1])rod([0,.001,0],[side*.078,.001,z*.006],.00035,vein,pivot);
}

const gltf={asset:{version:'2.0',generator:'NourishlandXR original dragonfly'},scene:0,scenes:[{nodes:[0]}],nodes:[],meshes:[],materials:[],accessors:[],bufferViews:[],buffers:[{byteLength:0}]};
const chunks=[],geometries=new Map(),materials=new Map();let length=0;
function accessor(array,itemSize,target){const bytes=Buffer.from(array.buffer,array.byteOffset,array.byteLength),padding=(4-length%4)%4;if(padding){chunks.push(Buffer.alloc(padding));length+=padding;}const view=gltf.bufferViews.length;gltf.bufferViews.push({buffer:0,byteOffset:length,byteLength:bytes.length,target});chunks.push(bytes);length+=bytes.length;const result={bufferView:view,componentType:array instanceof Float32Array?5126:array instanceof Uint32Array?5125:5123,count:array.length/itemSize,type:itemSize===1?'SCALAR':itemSize===2?'VEC2':'VEC3'};if(itemSize===3){result.min=[Infinity,Infinity,Infinity];result.max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<array.length;i++) {const axis=i%3;result.min[axis]=Math.min(result.min[axis],array[i]);result.max[axis]=Math.max(result.max[axis],array[i]);}}gltf.accessors.push(result);return gltf.accessors.length-1;}
function visit(node){const index=gltf.nodes.length,entry={name:node.name || 'Detail',translation:node.position.toArray(),rotation:node.quaternion.toArray(),scale:node.scale.toArray()};gltf.nodes.push(entry);
 if(node.isMesh){let geo=geometries.get(node.geometry);if(!geo){geo={attributes:{POSITION:accessor(node.geometry.attributes.position.array,3,34962),NORMAL:accessor(node.geometry.attributes.normal.array,3,34962)}};if(node.geometry.index)geo.indices=accessor(node.geometry.index.array,1,34963);geometries.set(node.geometry,geo);}let mat=materials.get(node.material);if(mat===undefined){mat=gltf.materials.length;gltf.materials.push({name:node.material.name,doubleSided:true,pbrMetallicRoughness:{baseColorFactor:[...node.material.color.toArray(),1],metallicFactor:.12,roughnessFactor:.56}});materials.set(node.material,mat);}entry.mesh=gltf.meshes.length;gltf.meshes.push({primitives:[{...geo,material:mat}]});}
 if(node.children.length)entry.children=node.children.map(visit);return index;
}
visit(root);const binary=Buffer.concat(chunks),binPadding=(4-binary.length%4)%4;gltf.buffers[0].byteLength=binary.length;const json=Buffer.from(JSON.stringify(gltf)),jsonPadding=(4-json.length%4)%4,jsonChunk=Buffer.concat([json,Buffer.alloc(jsonPadding,32)]),binChunk=Buffer.concat([binary,Buffer.alloc(binPadding)]),header=Buffer.alloc(20),binHeader=Buffer.alloc(8);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+jsonChunk.length+binChunk.length,8);header.writeUInt32LE(jsonChunk.length,12);header.writeUInt32LE(0x4e4f534a,16);binHeader.writeUInt32LE(binChunk.length);binHeader.writeUInt32LE(0x004e4942,4);
const target=new URL('../app/assets/welcome-practice/dragonfly.glb',import.meta.url);fs.writeFileSync(target,Buffer.concat([header,jsonChunk,binHeader,binChunk]));console.log('Dragonfly GLB:',fs.statSync(target).size,'bytes');
