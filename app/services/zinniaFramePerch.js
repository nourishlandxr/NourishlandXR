import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {createZinniaCharacter,animateZinniaCharacter,disposeZinniaCharacter} from './zinniaCharacter.js';
import {createFruitWindowXR} from './fruitWindowXR.js';

// Kept inside the frame silhouette. Totems occupy the space beside the frame.
export const ZINNIA_FRAME_PERCH=Object.freeze({x:-.73,y:.31,z:.10,width:.17,depth:.105});
export function createZinniaFramePerch({character:initialCharacter=null}={}){
    const scene=new THREE.Scene(),root=new THREE.Group();scene.add(root);root.matrixAutoUpdate=false;
    const home=new THREE.Group();home.position.set(ZINNIA_FRAME_PERCH.x,ZINNIA_FRAME_PERCH.y,ZINNIA_FRAME_PERCH.z);root.add(home);
    const wood=new THREE.MeshStandardMaterial({color:'#485347',roughness:1});
    const ledge=new THREE.Mesh(new THREE.BoxGeometry(.17,.018,.105),wood);ledge.position.y=-.009;home.add(ledge);
    // Short bracket meets the Living Frame rim, rather than an unsupported shelf.
    const bracket=new THREE.Mesh(new THREE.BoxGeometry(.032,.105,.09),wood);bracket.position.set(-.068,-.055,-.027);bracket.rotation.z=-.18;home.add(bracket);
    const characterMount=new THREE.Group();characterMount.name='Authored Zinnia return mount';home.add(characterMount);
    let character=initialCharacter || createZinniaCharacter();character.scale.setScalar(.75);characterMount.add(character);
    let glContext=null,renderer=null,started=null,disposed=false;
    function watchCharacter(value){void value.userData.zinnia.ready.then(ready=>{if(!ready || disposed || character!==value)return;renderer?.destroy();renderer=glContext?createFruitWindowXR(glContext,scene,{alphaCompositing:true}):null;});}
    watchCharacter(character);
    const anchor={position:{x:0,y:0,z:0},quaternion:{x:0,y:0,z:0,w:1}};
    return {scene,root,characterMount,
        adoptCharacter(value){if(!value)return;characterMount.remove(character);disposeZinniaCharacter(character);character=value;character.scale.setScalar(.75);characterMount.add(character);watchCharacter(character);},
        attach(gl){glContext=gl;renderer?.destroy();renderer=createFruitWindowXR(gl,scene,{alphaCompositing:true});},
        show(time=performance.now()){started=time;},
        draw(view,matrix,time=performance.now()){
            if(disposed || started===null || !renderer)return;
            animateZinniaCharacter(character,time/1000);root.matrix.fromArray(matrix);renderer.update();renderer.prepareNext();
            const t=Math.max(0,Math.min(1,(time-started)/1800));renderer.draw(view,anchor,t*t*(3-2*t));
        },
        destroy(){if(disposed)return;disposed=true;disposeZinniaCharacter(character);renderer?.destroy();const geometries=new Set(),materials=new Set();scene.traverse(node=>{if(node.geometry)geometries.add(node.geometry);for(const material of [node.material].flat().filter(Boolean))materials.add(material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
    };
}
