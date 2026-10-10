import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {createDemoLivingMapXR} from './demoLivingMapXR.js';

// Split multi-material GLB meshes and apply their animated morphs once per
// update. The session renderer then draws the same geometry for both eyes.
export function createFruitWindowXR(gl,source){
    const scene=new THREE.Scene(),entries=[],sharedGeometry=new Map();
    source.traverse(node=>{
        if(!node.isMesh)return;
        const data=node.geometry.index?node.geometry.toNonIndexed():node.geometry.clone();
        const groups=Array.isArray(node.material)?data.groups:[{start:0,count:data.attributes.position.count,materialIndex:0}];
        for(const group of groups){
            const key=Object.keys(data.morphAttributes).length?null:node.geometry.uuid+'|'+group.start+'|'+group.count;
            let geometry=key?sharedGeometry.get(key):null;const base={},morph={};
            const reused=Boolean(geometry);geometry ||= new THREE.BufferGeometry();
            for(const [name,attribute] of Object.entries(data.attributes)){
                if(reused)continue;
                const values=attribute.array.slice(group.start*attribute.itemSize,(group.start+group.count)*attribute.itemSize);
                geometry.setAttribute(name,new THREE.BufferAttribute(values,attribute.itemSize));base[name]=values.slice();
            }
            if(key && !reused)sharedGeometry.set(key,geometry);
            for(const name of ['position','normal'])morph[name]=(data.morphAttributes[name]||[]).map(a=>a.array.slice(group.start*a.itemSize,(group.start+group.count)*a.itemSize));
            const material=Array.isArray(node.material)?node.material[group.materialIndex]:node.material;
            const mesh=new THREE.Mesh(geometry,material);mesh.matrixAutoUpdate=false;scene.add(mesh);
            entries.push({node,mesh,base,morph,relative:data.morphTargetsRelative,weights:null});
        }
        data.dispose();
    });
    const renderer=createDemoLivingMapXR(gl,scene,{worldScale:1,surfaceDetail:true,fadeTransform:false});
    return {
        update(){
            source.updateMatrixWorld(true);
            for(const entry of entries){
                const {node,mesh,base,morph}=entry;mesh.visible=true;
                for(let parent=node;parent;parent=parent.parent)if(!parent.visible){mesh.visible=false;break;}
                mesh.matrix.copy(node.matrixWorld);
                const weights=node.morphTargetInfluences;
                if(weights&&(!entry.weights||weights.some((value,i)=>value!==entry.weights[i]))){
                    for(const name of ['position','normal']){
                        const attribute=mesh.geometry.attributes[name];if(!attribute||!morph[name]?.length)continue;
                        attribute.array.set(base[name]);
                        for(let i=0;i<weights.length;i++)if(weights[i]&&morph[name][i])for(let j=0;j<attribute.array.length;j++)attribute.array[j]+=weights[i]*(morph[name][i][j]-(entry.relative?0:base[name][j]));
                        attribute.needsUpdate=true;
                    }
                    entry.weights=[...weights];
                }
            }
            scene.updateMatrixWorld(true);
        },
        draw(view,anchor,opacity=1){renderer.draw(view,anchor.position,anchor.quaternion,opacity);},
        prepareNext(){return renderer.prepareNext();},
        destroy(){renderer.destroy();for(const geometry of new Set(entries.map(entry=>entry.mesh.geometry)))geometry.dispose();sharedGeometry.clear();}
    };
}
