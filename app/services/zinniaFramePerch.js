import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {createZinniaCharacter,animateZinniaCharacter,disposeZinniaCharacter} from './zinniaCharacter.js';
import {createFruitWindowXR} from './fruitWindowXR.js';
import {zinniaVoiceState,zinniaSpeechLevel,zinniaCharacterCue} from './zinniaVoiceCoordinator.js';

// Kept inside the frame silhouette. Totems occupy the space beside the frame.
export const ZINNIA_FRAME_PERCH=Object.freeze({x:-.88,y:-.18,z:.32,width:.19,depth:.16});
export function createZinniaFramePerch({character:initialCharacter=null,getVoice=()=>null}={}){
    const scene=new THREE.Scene(),root=new THREE.Group();scene.add(root);root.matrixAutoUpdate=false;
    const home=new THREE.Group();home.position.set(ZINNIA_FRAME_PERCH.x,ZINNIA_FRAME_PERCH.y,ZINNIA_FRAME_PERCH.z);root.add(home);
    const wood=new THREE.MeshStandardMaterial({color:'#485347',roughness:1});
    const ledge=new THREE.Mesh(new THREE.BoxGeometry(ZINNIA_FRAME_PERCH.width,.018,ZINNIA_FRAME_PERCH.depth),wood);ledge.position.y=-.009;home.add(ledge);
    // Short bracket meets the Living Frame rim, rather than an unsupported shelf.
    const bracket=new THREE.Mesh(new THREE.BoxGeometry(.032,.105,.25),wood);bracket.position.set(-.068,-.055,-.105);bracket.rotation.z=-.18;home.add(bracket);
    const characterMount=new THREE.Group();characterMount.name='Authored Zinnia return mount';home.add(characterMount);
    let character=initialCharacter || createZinniaCharacter();character.scale.setScalar(.75);characterMount.add(character);
    let glContext=null,renderer=null,started=null,disposed=false,lastFrame=null;
    function watchCharacter(value){void value.userData.zinnia.ready.then(ready=>{if(!ready || disposed || character!==value)return;renderer?.destroy();renderer=glContext?createFruitWindowXR(glContext,scene,{alphaCompositing:true}):null;});}
    watchCharacter(character);
    const anchor={position:{x:0,y:0,z:0},quaternion:{x:0,y:0,z:0,w:1}};
    function update(view,matrix,time=performance.now(),inputs=[]){
        if(disposed)return;
        root.matrix.fromArray(matrix);root.updateMatrixWorld(true);
        const direct=getVoice(),directState=direct?.status?.(),shared=zinniaVoiceState();
        const voice=directState?.playing || directState?.paused?directState:shared,cue=zinniaCharacterCue();
        const speechLevel=voice.paused?0:Math.max(zinniaSpeechLevel(),direct?.speechLevel?.() || 0);
        animateZinniaCharacter(character,time/1000,voice.playing && !voice.paused,{...cue,cue,inputs,paused:voice.paused,viewer:view.transform.matrix,focused:Boolean(cue.focused || voice.listening),speechLevel});
    }
    return {scene,root,characterMount,update,
        adoptCharacter(value){if(!value)return;characterMount.remove(character);disposeZinniaCharacter(character);character=value;character.scale.setScalar(.75);characterMount.add(character);watchCharacter(character);},
        attach(gl){glContext=gl;renderer?.destroy();renderer=createFruitWindowXR(gl,scene,{alphaCompositing:true});},
        show(time=performance.now()){started=time;},
        draw(view,matrix,time=performance.now(),inputs=[],viewer=null){
            if(disposed || started===null || !renderer)return;
            if(lastFrame!==time){lastFrame=time;update(viewer?{transform:{matrix:viewer}}:view,matrix,time,inputs);renderer.update();renderer.prepareNext();}
            const t=Math.max(0,Math.min(1,(time-started)/1800));renderer.draw(view,anchor,t*t*(3-2*t));
        },
        destroy(){if(disposed)return;disposed=true;disposeZinniaCharacter(character);renderer?.destroy();const geometries=new Set(),materials=new Set();scene.traverse(node=>{if(node.geometry)geometries.add(node.geometry);for(const material of [node.material].flat().filter(Boolean))materials.add(material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
    };
}
