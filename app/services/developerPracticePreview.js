import {WELCOME_PRACTICE_LESSONS} from './welcomePracticeContent.js';
import {createFruitWindowXR} from './fruitWindowXR.js';
import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {createWelcomePracticeScene} from './welcomePracticeScene.js';
import {createWelcomePracticeVoice} from './welcomePracticeVoice.js';
import {createZinniaFramePerch} from './zinniaFramePerch.js';
import {MARKING_BRUSHES} from './creatorMarkingBrushes.js';
export async function createDeveloperPracticePreview(host,{id,activity='painting',context=false,input='controllers',onExit=()=>{}}={}){
 let disposed=false,stage=null,perch=null,frame=null,down=false,last=0,frames=0,fps=0,windowStart=0;const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,.01,30),nativeCanvas=document.createElement('canvas'),gl=nativeCanvas.getContext('webgl2',{alpha:true,antialias:true});if(!gl)throw Error('WebGL2 is required for the component preview.');let native=null,needsBuild=true,raf=0,loop=null;const renderer={domElement:nativeCanvas,setSize(width,height){nativeCanvas.width=Math.round(width*Math.min(devicePixelRatio,1.5));nativeCanvas.height=Math.round(height*Math.min(devicePixelRatio,1.5));},setAnimationLoop(fn){cancelAnimationFrame(raf);loop=fn;if(fn){const tick=time=>{if(!loop)return;loop(time);raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);}},render(){if(needsBuild){native?.destroy();native=createFruitWindowXR(gl,scene);while(!native.prepareNext()){}needsBuild=false;}camera.updateMatrixWorld(true);native.update();gl.viewport(0,0,nativeCanvas.width,nativeCanvas.height);gl.clearColor(.09,.19,.15,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);native.draw({projectionMatrix:camera.projectionMatrix.elements,transform:{inverse:{matrix:camera.matrixWorldInverse.elements}}},{position:{x:0,y:0,z:0},quaternion:{x:0,y:0,z:0,w:1}});},dispose(){native?.destroy();}};
 const tools=document.createElement('div'),view=document.createElement('div');view.style.cssText='height:60vh;min-height:360px;touch-action:none;background:#173028;border-radius:16px;overflow:hidden';view.append(renderer.domElement);host.append(tools,view);
 scene.add(new THREE.HemisphereLight('#ffffff','#637455',2));const light=new THREE.DirectionalLight('#fff1dc',2);light.position.set(0,3,2);scene.add(light);
 const voice=createWelcomePracticeVoice({enabled:true});voice.unlock();void voice.preload();
 const viewer=new THREE.Matrix4().makeTranslation(0,1.6,0).elements,source={handedness:'right',hand:input==='hands'?{}:null},point=new THREE.Vector3(0,.95,-1.3),raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,0,1),1.3);
 function button(label,fn){const b=document.createElement('button');b.textContent=label;b.onclick=fn;tools.append(b);return b;}
 button('Speak / replay',()=>{voice.unlock();void voice.speak(WELCOME_PRACTICE_LESSONS.find(lesson=>lesson.id===(id==='zinnia'?'zinnia':activity==='fruit'?'fruit':activity==='water'?'water':'grab')));});button('Pause / resume voice',()=>voice.status().paused?voice.resume():voice.pause());button('Stop voice',()=>voice.stop());if(activity==='tutorial')button('End tutorial',()=>stage?.button('skip'));
 if(id==='zinnia'){
  perch=createZinniaFramePerch({getVoice:()=>voice});scene.add(perch.scene);perch.characterMount.visible=false;void perch.characterMount.children[0].userData.zinnia.ready.then(()=>{if(!disposed){perch.characterMount.visible=true;needsBuild=true;}});const matrix=new THREE.Matrix4().makeTranslation(0,1.5,-2).elements;camera.position.set(-.88,1.55,-.8);camera.lookAt(-.88,1.45,-1.68);
  if(context){const {createLivingFrameModel}=await import('./livingFrameModel.js');frame=createLivingFrameModel({onChange:()=>{if(!disposed&&frame.scene&&!frame.scene.parent){frame.scene.position.set(0,1.5,-2);scene.add(frame.scene);needsBuild=true;}}});void frame.select('sd');camera.position.set(0,1.6,1);camera.lookAt(0,1.4,-2);}
  perch.labMatrix=matrix;
 }else{
  stage=createWelcomePracticeScene({voice,embedded:true,onComplete:onExit,onAssets:()=>needsBuild=true});scene.add(stage.scene);await stage.loading;stage.start(viewer,0);
  if(['painting','garden','butterflies'].includes(activity)){stage.previewLesson('grab');stage.trials.open(activity);stage.trials.command('mode:'+input);}else if(activity!=='tutorial'){stage.previewLesson(activity);stage.setInputMode(input);}
  camera.position.set(0,1.6,.45);camera.lookAt(0,.9,-1.4);
  if(activity==='painting'){for(const [brush,description] of Object.entries(MARKING_BRUSHES))button(description.label,()=>stage.trials.command('brush:'+brush));for(const action of ['undo','redo','clear','save','load','motion'])button(action[0].toUpperCase()+action.slice(1),()=>stage.trials.command(action));}
  if(!context){stage.zinniaMount.visible=false;}
 }
 function resize(){const box=view.getBoundingClientRect();renderer.setSize(box.width,box.height);camera.aspect=box.width/box.height;camera.updateProjectionMatrix();}const observer=new ResizeObserver(resize);observer.observe(view);resize();
 const abort=new AbortController(),canvas=renderer.domElement;
 function locate(event){const box=canvas.getBoundingClientRect();pointer.set((event.clientX-box.left)/box.width*2-1,-(event.clientY-box.top)/box.height*2+1);raycaster.setFromCamera(pointer,camera);raycaster.ray.intersectPlane(plane,point);}
 canvas.addEventListener('pointerdown',e=>{locate(e);down=true;canvas.setPointerCapture(e.pointerId);voice.unlock();},{signal:abort.signal});canvas.addEventListener('pointermove',locate,{signal:abort.signal});for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>down=false,{signal:abort.signal});
 renderer.setAnimationLoop(time=>{if(disposed)return;const dt=Math.min(.05,Math.max(0,(time-last)/1000));last=time;frames++;if(time-windowStart>1000){fps=Math.round(frames*1000/(time-windowStart));frames=0;windowStart=time;}
  if(perch){perch.update({transform:{matrix:viewer}},perch.labMatrix,time,[{source,ray:raycaster.ray,trigger:down}]);frame?.update(time,{show:true,frameToken:time});}
  if(stage){const data={source,matrix:new THREE.Matrix4().makeTranslation(point.x,point.y,point.z).elements,ray:raycaster.ray,tip:point,down,trigger:down,fist:down};stage.update(dt,{viewer,floor:0,inputs:[data],controllers:input==='hands'?[]:[data],hands:[],frameReady:true});if(activity!=='tutorial'&&!stage.trials.active&&stage.phase!==activity)stage.previewLesson(activity);if(!context)stage.zinniaMount.visible=false;}
  renderer.render(scene,camera);
 });
 return {snapshot:()=>({station:id,activity:id==='toys'?activity:undefined,mode:'Desktop component preview',fps,model:perch?.characterMount.children[0]?.userData.zinnia.status,voice:voice.status(),trial:stage?.trials.snapshot().paint,questVerified:false}),cleanup(){if(disposed)return;disposed=true;abort.abort();observer.disconnect();renderer.setAnimationLoop(null);stage?.destroy();perch?.destroy();frame?.destroy();voice.destroy();renderer.dispose();host.replaceChildren();}};
}
