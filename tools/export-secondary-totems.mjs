import {mkdir,writeFile} from 'node:fs/promises';
import {createSecondaryTotemGeometry,SECONDARY_TOTEM_IDS} from '../app/services/secondaryTotemGeometry.js';
// Portable glTF models use exactly the runtime mesh, at 1.35 m, with a separate
// emissive material for communication modules to animate in other applications.
const destination=new URL('../app/assets/totems/',import.meta.url);
await mkdir(destination,{recursive:true});
for(const style of SECONDARY_TOTEM_IDS){
    const geometry=createSecondaryTotemGeometry(style,24),count=geometry.vertices.length/8;
    const positions=new Float32Array(count*3),normals=new Float32Array(count*3),body=[],light=[];
    const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],scale=[.095,.675,.075];
    for(let i=0;i<count;i++){
        const n=scale.map((s,j)=>geometry.vertices[i*8+3+j]/s),length=Math.hypot(...n)||1;
        for(let j=0;j<3;j++){const value=geometry.vertices[i*8+j]*scale[j]+(j===1?.675:0);positions[i*3+j]=value;normals[i*3+j]=n[j]/length;min[j]=Math.min(min[j],value);max[j]=Math.max(max[j],value);}
    }
    for(let i=0;i<geometry.indices.length;i+=3){const target=geometry.vertices[geometry.indices[i]*8+7]>1?light:body;target.push(...geometry.indices.subarray(i,i+3));}
    const arrays=[positions,normals,new Uint16Array(body),new Uint16Array(light)],views=[];let offset=0;
    const buffers=arrays.map((array,i)=>{const data=Buffer.from(array.buffer);views.push({buffer:0,byteOffset:offset,byteLength:data.length,target:i<2?34962:34963});offset+=Math.ceil(data.length/4)*4;const padded=Buffer.alloc(Math.ceil(data.length/4)*4);data.copy(padded);return padded;});
    const colours={sun:[.93,.70,.32],leaf:[.53,.83,.40],rock:[.22,.72,.77],moon:[.69,.59,.89]},colour=colours[style];
    const json={asset:{version:'2.0',generator:'NourishlandXR'},scene:0,scenes:[{nodes:[0]}],nodes:[{name:style+'-totem',mesh:0,extras:{heightMetres:1.35,role:'secondary-area',communicationMaterial:1}}],meshes:[{primitives:[{attributes:{POSITION:0,NORMAL:1},indices:2,material:0},{attributes:{POSITION:0,NORMAL:1},indices:3,material:1}]}],materials:[{name:style==='rock'?'River stone':'Weathered timber',doubleSided:true,pbrMetallicRoughness:{baseColorFactor:style==='rock'?[.43,.44,.39,1]:[.39,.27,.17,1],metallicFactor:0,roughnessFactor:.86}},{name:'Communication light',doubleSided:true,emissiveFactor:colour,pbrMetallicRoughness:{baseColorFactor:[...colour,1],metallicFactor:.12,roughnessFactor:.48}}],buffers:[{byteLength:offset}],bufferViews:views,accessors:[{bufferView:0,componentType:5126,count,type:'VEC3',min,max},{bufferView:1,componentType:5126,count,type:'VEC3'},{bufferView:2,componentType:5123,count:body.length,type:'SCALAR'},{bufferView:3,componentType:5123,count:light.length,type:'SCALAR'}]};
    const text=Buffer.from(JSON.stringify(json)),chunk=Buffer.alloc(Math.ceil(text.length/4)*4,32);text.copy(chunk);const binary=Buffer.concat(buffers),header=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);
    header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+chunk.length+binary.length,8);jh.writeUInt32LE(chunk.length);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(binary.length);bh.writeUInt32LE(0x004e4942,4);
    await writeFile(new URL(style+'.glb',destination),Buffer.concat([header,jh,chunk,bh,binary]));
    console.log(`${style}: ${(body.length+light.length)/3} triangles, ${max[1].toFixed(2)} m`);
}
