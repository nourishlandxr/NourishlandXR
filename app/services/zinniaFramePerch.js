import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {createZinniaCharacter,animateZinniaCharacter,disposeZinniaCharacter} from './zinniaCharacter.js';
import {createFruitWindowXR} from './fruitWindowXR.js';
import {playZinniaGiggle,unlockZinniaTouchAudio} from './zinniaTouchReactions.js';
import {zinniaVoiceState,zinniaSpeechLevel,zinniaCharacterCue} from './zinniaVoiceCoordinator.js';

// Kept inside the frame silhouette. Totems occupy the space beside the frame.
// Keep the branch root close to the lower-right edge of the native rim. The
// branch begins at local (-.055,-.10), so this anchor puts that joint just
// inside the rim volume while the perch itself stays in front of the frame.
export const ZINNIA_FRAME_PERCH=Object.freeze({x:.91,y:-.18,z:.32,width:.19,depth:.16});
export function createZinniaFramePerch({character:initialCharacter=null,getVoice=()=>null}={}){
    const scene=new THREE.Scene(),root=new THREE.Group();scene.add(root);root.matrixAutoUpdate=false;
    const home=new THREE.Group();home.position.set(ZINNIA_FRAME_PERCH.x,ZINNIA_FRAME_PERCH.y,ZINNIA_FRAME_PERCH.z);root.add(home);
    // Curved branch grows inward from the right rim, under the pot.
    // Median brown sampled from the rim texture. The rim UV atlas is not
    // reused on tubes: its unused white regions would bleach the branch.
    const wood=new THREE.MeshStandardMaterial({color:'#4c3320',roughness:.92});
    const branch=(points,radius)=>{const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,14,radius,8,false),wood);home.add(mesh);};
    branch([[-.055,-.10,-.24],[.12,-.07,-.20],[.065,-.028,-.08],[0,-.018,.015],[-.095,-.025,.025]],.021);
    branch([[-.055,-.10,-.24],[.11,-.065,-.10],[.045,-.024,-.055],[-.055,-.018,-.045],[-.10,-.028,-.02]],.013);
    const characterMount=new THREE.Group();characterMount.name='Authored Zinnia return mount';home.add(characterMount);
    let character=initialCharacter || createZinniaCharacter();character.visible=true;if(character.userData.zinnia){character.userData.zinnia.time=null;character.userData.zinnia.paused=false;if(character.userData.zinnia.guide?.holder)character.userData.zinnia.guide.holder.visible=true;}character.position.set(0,0,0);character.quaternion.identity();character.scale.setScalar(.75);characterMount.add(character);
    let glContext=null,renderer=null,started=null,disposed=false,lastFrame=null,instant=false,rimMaterialId=null,presentationDrawnAt=null,hitBounds=null,lastVoice={};
    function watchCharacter(value){void value.userData.zinnia.ready.then(ready=>{if(!ready || disposed || character!==value)return;presentationDrawnAt=null;hitBounds=null;renderer?.destroy();renderer=glContext?createFruitWindowXR(glContext,scene,{alphaCompositing:true,welcomeMagic:true}):null;});}
    watchCharacter(character);
    const anchor={position:{x:0,y:0,z:0},quaternion:{x:0,y:0,z:0,w:1}};
    function update(view,matrix,time=performance.now(),inputs=[]){
        if(disposed)return;
        root.matrix.fromArray(matrix);root.updateMatrixWorld(true);
        const direct=getVoice(),directState=direct?.status?.(),shared=zinniaVoiceState();
        // A custom plant/Note conversation temporarily owns Zinnia's voice
        // while the demo narration instance remains alive but idle.
        const sharedActive=Boolean(shared.playing || shared.paused || shared.listening);
        const voice=sharedActive?shared:(directState || shared),cue=zinniaCharacterCue();
        const speechLevel=voice.paused?0:Math.max(sharedActive?zinniaSpeechLevel():0,direct?.speechLevel?.() || 0);
        lastVoice={playing:Boolean(voice.playing),audible:voice.audible ?? speechLevel>.002,paused:Boolean(voice.paused),listening:Boolean(voice.listening),speechLevel};
        animateZinniaCharacter(character,time/1000,voice.playing && !voice.paused,{...cue,lesson:'demo-guide',cue,inputs,paused:voice.paused,viewer:view.transform.matrix,focused:Boolean(cue.focused || voice.listening),speechLevel});
    }
    return {scene,root,characterMount,update,
        snapshot:()=>({voice:{...lastVoice},animation:character.userData.zinnia?.guide?.snapshot(),reaction:character.userData.zinnia?.touch?.snapshot().reaction,ready:character.userData.zinnia?.status==='ready'}),
        react(hit){
            if(disposed || character.userData.zinnia?.status!=='ready' || !hit?.worldPoint)return false;
            unlockZinniaTouchAudio();character.updateWorldMatrix(true,false);
            const point=character.worldToLocal(new THREE.Vector3().copy(hit.worldPoint)),kind=point.y>.43?'pat':'tickle';
            character.userData.zinnia.touch.react(kind);character.userData.zinnia.guide.acknowledge('yes');
            if(kind==='tickle' && !lastVoice.playing && !lastVoice.audible)playZinniaGiggle();
            return true;
        },get presentationReady(){return character.userData.zinnia?.status==='ready' && presentationDrawnAt!==null && performance.now()-presentationDrawnAt>=300;},
        hit(ray,matrix){
            if(disposed || started===null || !renderer || !ray?.origin || !ray.direction)return null;
            if(matrix){root.matrix.fromArray(matrix);root.updateWorldMatrix(true,false);}
            if(!hitBounds){
                characterMount.updateWorldMatrix(true,true);const inverse=root.matrixWorld.clone().invert(),localMatrix=new THREE.Matrix4();hitBounds=new THREE.Box3();
                characterMount.traverse(node=>{if(!node.isMesh)return;node.geometry.computeBoundingBox();localMatrix.multiplyMatrices(inverse,node.matrixWorld);hitBounds.union(node.geometry.boundingBox.clone().applyMatrix4(localMatrix));});
                hitBounds.expandByScalar(.06);
            }
            // A compact collider is enough for selecting the whole character.
            // Triangle-testing 125k vertices for a hover target every XR frame
            // needlessly repeats expensive model work as the frame follows the viewer.
            const inverse=root.matrixWorld.clone().invert(),localRay=new THREE.Ray(new THREE.Vector3(ray.origin.x,ray.origin.y,ray.origin.z),new THREE.Vector3(ray.direction.x,ray.direction.y,ray.direction.z).normalize()).applyMatrix4(inverse),localPoint=localRay.intersectBox(hitBounds,new THREE.Vector3());
            if(!localPoint)return null;
            const point=localPoint.applyMatrix4(root.matrixWorld),distance=point.distanceTo(new THREE.Vector3(ray.origin.x,ray.origin.y,ray.origin.z));
            return {kind:'zinnia',id:'zinnia',distance,point,worldPoint:point};
        },
        matchRim(frameScene){let material=null;frameScene?.traverse(node=>{for(const candidate of [node.material].flat().filter(Boolean))if(candidate.name==='Brown lower soil')material ||= candidate;});if(!material || material.uuid===rimMaterialId)return;rimMaterialId=material.uuid;wood.copy(material);wood.map=null;wood.color.set('#4c3320');wood.name='Living Frame branch';renderer?.destroy();renderer=glContext?createFruitWindowXR(glContext,scene,{alphaCompositing:true,welcomeMagic:true}):null;},
        adoptCharacter(value){if(!value)return;characterMount.remove(character);disposeZinniaCharacter(character);character=value;hitBounds=null;character.visible=true;if(character.userData.zinnia){character.userData.zinnia.time=null;character.userData.zinnia.paused=false;if(character.userData.zinnia.guide?.holder)character.userData.zinnia.guide.holder.visible=true;}character.position.set(0,0,0);character.quaternion.identity();character.scale.setScalar(.75);characterMount.add(character);watchCharacter(character);},
        attach(gl){glContext=gl;presentationDrawnAt=null;renderer?.destroy();renderer=createFruitWindowXR(gl,scene,{alphaCompositing:true,welcomeMagic:true});},
        show(time=performance.now(),{immediate=false}={}){started=time;instant=immediate;presentationDrawnAt=null;},
        draw(view,matrix,time=performance.now(),inputs=[],viewer=null){
            if(disposed || started===null || !renderer)return;
            if(lastFrame!==time){lastFrame=time;update(viewer?{transform:{matrix:viewer}}:view,matrix,time,inputs);renderer.update();renderer.prepareNext();}
            const t=instant?1:Math.max(0,Math.min(1,(time-started)/1800));renderer.draw(view,anchor,t*t*(3-2*t));if(t>=1 && renderer.ready)presentationDrawnAt ??= performance.now();
        },
        destroy(){if(disposed)return;disposed=true;disposeZinniaCharacter(character);renderer?.destroy();const geometries=new Set(),materials=new Set();scene.traverse(node=>{if(node.geometry)geometries.add(node.geometry);for(const material of [node.material].flat().filter(Boolean))materials.add(material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
    };
}
