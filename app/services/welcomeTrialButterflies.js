import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {createDemoButterflyTrialSource} from './demoButterflyModel.js';

// Reuse the demo's attributed butterfly asset. Bake two wing poses as morphs
// so the shared welcome XR renderer can animate it without a second GL context.
export const WELCOME_BUTTERFLY_COUNT=8;
export const WELCOME_BUTTERFLY_COLOURS=Object.freeze(Array.from({length:WELCOME_BUTTERFLY_COUNT},(_,i)=>'#'+new THREE.Color().setHSL(i/WELCOME_BUTTERFLY_COUNT,.72,.57+(i%3)*.035).getHexString()));
export function colourTrialButterfly(model,index){
    const colour=WELCOME_BUTTERFLY_COLOURS[index%WELCOME_BUTTERFLY_COUNT];model.userData.butterflyColour=colour;
    model.traverse(node=>{if(!node.isMesh)return;node.material=node.material.clone();node.material.color.set(colour);node.material.emissive?.set(colour);node.material.emissiveIntensity=.08;});
    return model;
}
export async function loadTrialButterflies(){
    const model=await createDemoButterflyTrialSource(),mixer=model.mixer,clip=model.flying.getClip(),meshes=model.meshes;
    model.idle.setEffectiveWeight(0);model.flying.setEffectiveWeight(1);
    const point=new THREE.Vector3(),bounds=new THREE.Box3(),poses=[];
    for(const time of [0,clip?clip.duration*.25:0]){
        mixer.setTime(time);model.wrapper.updateMatrixWorld(true);
        const parts=meshes.map(mesh=>{
            mesh.skeleton?.update();const data=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone(),position=data.attributes.position;
            for(let i=0;i<position.count;i++){point.fromBufferAttribute(position,i);if(mesh.isSkinnedMesh)mesh.applyBoneTransform(mesh.geometry.index?mesh.geometry.index.getX(i):i,point);point.applyMatrix4(mesh.matrixWorld);position.setXYZ(i,point.x,point.y,point.z);bounds.expandByPoint(point);}
            data.computeVertexNormals();return data;
        });poses.push(parts);
    }
    const center=bounds.getCenter(new THREE.Vector3()),factor=1/Math.max(...bounds.getSize(new THREE.Vector3()).toArray());
    for(const parts of poses)for(const geometry of parts){const p=geometry.attributes.position;for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).sub(center).multiplyScalar(factor);p.setXYZ(i,point.x,point.y,point.z);}}
    // Give this trial its own image lifetime: the demo owns the cached bitmap.
    const image=document.createElement('canvas');image.width=model.bitmap.width;image.height=model.bitmap.height;const ink=image.getContext('2d');ink.filter='grayscale(1) brightness(1.5)';ink.drawImage(model.bitmap,0,0);const texture=new THREE.CanvasTexture(image);texture.flipY=false;texture.colorSpace=THREE.SRGBColorSpace;
    const prototype=new THREE.Group();
    meshes.forEach((source,i)=>{
        const geometry=poses[0][i];geometry.morphAttributes.position=[poses[1][i].attributes.position.clone()];geometry.morphAttributes.normal=[poses[1][i].attributes.normal.clone()];
        const material=source.material.clone();if(material.map)material.map=texture;material.side=THREE.DoubleSide;material.transparent=false;material.alphaTest=.45;material.emissive?.set('#000000');
        prototype.add(new THREE.Mesh(geometry,material));
    });
    poses[1].forEach(g=>g.dispose());mixer.stopAllAction();mixer.uncacheRoot(model.wrapper.children[0].children[0]);model.geometries.forEach(g=>g.dispose());model.materials.forEach(m=>m.dispose());model.texture.dispose();
    const insects=Array.from({length:WELCOME_BUTTERFLY_COUNT},(_,i)=>colourTrialButterfly(prototype.clone(),i));
    // Variant materials are owned by the clones; discard the unused prototype.
    prototype.traverse(node=>{if(node.isMesh)node.material.dispose();});
    return insects;
}
