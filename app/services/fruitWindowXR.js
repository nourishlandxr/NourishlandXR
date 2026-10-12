import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {createDemoLivingMapXR} from './demoLivingMapXR.js';

// Split multi-material GLB meshes and apply their animated morphs once per
// update. The session renderer then draws the same geometry for both eyes.
export function createFruitWindowXR(gl,source,{alphaCompositing=false,progressive=false}={}){
    const scene=new THREE.Scene(),entries=[],sharedGeometry=new Map(),batches=[];
    const hiddenMatrix=new THREE.Matrix4().makeScale(0,0,0);
    const nodes=[];source.traverse(node=>{if(node.isMesh)nodes.push(node);});
    function* convert(){for(const node of nodes){
        if(node.isInstancedMesh){
            const mesh=new THREE.InstancedMesh(node.geometry.clone(),node.material,node.instanceMatrix.count);mesh.instanceMatrix=node.instanceMatrix;mesh.instanceColor=node.instanceColor;mesh.count=node.count;mesh.matrixAutoUpdate=false;mesh.frustumCulled=false;mesh.userData.livingMapDynamic=true;scene.add(mesh);entries.push({node,mesh,base:{},morph:{},instanced:true});yield;continue;
        }
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
            const mesh=new THREE.Mesh(geometry,material);mesh.matrixAutoUpdate=false;mesh.renderOrder=node.renderOrder;scene.add(mesh);
            entries.push({node,mesh,base,morph,relative:data.morphTargetsRelative,weights:null});
        }
        data.dispose();
        yield;
    }

    // Repeated leaves and supporting pods share geometry/materials. Submit
    // their poses as instances instead of a separate draw for every leaflet.
    const groups=new Map();
    for(const entry of entries){if(entry.instanced || Object.values(entry.morph).some(targets=>targets.length))continue;const key=entry.mesh.geometry.uuid+'|'+entry.mesh.material.uuid;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(entry);}
    for(const group of groups.values())if(group.length>1){
        const mesh=new THREE.InstancedMesh(group[0].mesh.geometry,group[0].mesh.material,group.length);mesh.userData.livingMapDynamic=true;mesh.frustumCulled=false;scene.add(mesh);batches.push(mesh);
        group.forEach((entry,index)=>{scene.remove(entry.mesh);entry.batch=mesh;entry.instanceIndex=index;entry.lastMatrix=new THREE.Matrix4();});
    }
    renderer=createDemoLivingMapXR(gl,scene,{worldScale:1,surfaceDetail:true,fadeTransform:false,maxTextureSize:1024,detailMaps:false,alphaCompositing});
    }
    let renderer=null,disposed=false;const conversion=convert();
    function prepareConversion(){const started=performance.now();let result;do{result=conversion.next();}while(!result.done && (!progressive || performance.now()-started<2));return result.done;}
    if(!progressive)prepareConversion();
    return {
        get ready(){return Boolean(renderer);},
        get stats(){return {...renderer?.stats,sourceMeshes:entries.length,instanceBatches:batches.length};},
        update(){
            source.updateMatrixWorld(true);
            for(const mesh of batches){mesh.visible=false;mesh.userData.poseChanged=false;}
            for(const entry of entries){
                const {node,mesh,base,morph}=entry;mesh.visible=true;
                for(let parent=node;parent;parent=parent.parent)if(!parent.visible){mesh.visible=false;break;}
                if(entry.batch){const pose=mesh.visible?node.matrixWorld:hiddenMatrix;if(!entry.lastMatrix.equals(pose)){entry.batch.setMatrixAt(entry.instanceIndex,pose);entry.lastMatrix.copy(pose);entry.batch.userData.poseChanged=true;}entry.batch.visible ||= mesh.visible;}
                else mesh.matrix.copy(node.matrixWorld);
                if(entry.instanced){mesh.count=node.count;mesh.instanceColor=node.instanceColor;continue;}
                if(!mesh.visible)continue;
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
            for(const mesh of batches)if(mesh.userData.poseChanged)mesh.instanceMatrix.needsUpdate=true;
            scene.updateMatrixWorld(true);
        },
        draw(view,anchor,opacity=1){renderer?.draw(view,anchor.position,anchor.quaternion,opacity);},
        prepareNext(){if(disposed)return false;if(!renderer){if(!prepareConversion())return false;}if(!progressive)return renderer.prepareNext();const started=performance.now();let ready;do{ready=renderer.prepareNext();}while(!ready && performance.now()-started<2);return ready;},
        destroy(){disposed=true;conversion.return();renderer?.destroy();for(const batch of batches)batch.dispose();for(const entry of entries)if(entry.instanced)entry.mesh.dispose();for(const geometry of new Set(entries.map(entry=>entry.mesh.geometry)))geometry.dispose();sharedGeometry.clear();}
    };
}
