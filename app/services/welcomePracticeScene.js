import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {GLTFLoader} from '../assets/fruit-window/vendor/GLTFLoader.js';
import {WELCOME_PRACTICE_LESSONS,WELCOME_PRACTICE_RESPONSES} from './welcomePracticeContent.js';
import {PRACTICE_TABLE_RADIUS,onPracticeTable,createPracticeBody,resetPracticeBody,stepPracticeBodies,practiceSupport} from './welcomePracticePhysics.js';
import {createWelcomeControllerGuide} from './welcomeControllerGuide.js';
import {createWelcomePlantPractice} from './welcomePlantPractice.js';
import {createWelcomePracticeProps} from './welcomePracticeProps.js';
import {prepareWelcomeDragonfly} from './welcomeDragonflyModel.js';
import {WELCOME_FRUIT_ASSETS,WELCOME_INITIAL_FRUITS} from './welcomePracticeFruitAssets.js';

import {createWelcomePracticeTable} from './welcomePracticeTable.js';
import {createWelcomeFlightLesson} from './welcomeFlightLesson.js';
import {prepareTutorialFruit,tutorialFruitPrompt} from './tutorialFruitInteraction.js';
import {createZinniaCharacter,animateZinniaCharacter,disposeZinniaCharacter} from './zinniaCharacter.js';
import {createWelcomeObjectReveal} from './welcomeObjectReveal.js';
import {getSpatialVisualSettings} from './spatialVisualSettings.js';
import {createWelcomePracticeTrials} from './welcomePracticeTrials.js';

const one=new THREE.Vector3(1,1,1),up=new THREE.Vector3(0,1,0);
const serial=v=>({x:v.x,y:v.y,z:v.z});
function disposeTree(root){const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(n=>{if(n.geometry)geometries.add(n.geometry);for(const m of [n.material].flat().filter(Boolean)){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>{t.image?.close?.();t.dispose();});}
function glass(colour,opacity=1){return new THREE.MeshStandardMaterial({color:colour,roughness:.72,metalness:0,transparent:opacity<1,opacity,depthWrite:true,side:THREE.DoubleSide});}
function tableSurface(colour,opacity){return new THREE.MeshBasicMaterial({color:colour,transparent:opacity<1,opacity,depthWrite:opacity>=1,side:THREE.DoubleSide});}
function textPlate(width,height,worldWidth,worldHeight){
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const texture=new THREE.CanvasTexture(canvas),material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide});
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(worldWidth,worldHeight),material);mesh.renderOrder=20;
    return {mesh,canvas,texture,paint:fn=>{const ctx=canvas.getContext('2d');ctx.clearRect(0,0,width,height);fn(ctx);texture.needsUpdate=true;}};
}
function createDragonfly(){
    const group=new THREE.Group(),bodyMaterial=glass('#8aaca1'),eyeMaterial=glass('#59796f'),wingMaterial=glass('#e5efdb',.78),round=new THREE.SphereGeometry(1,10,8);
    const abdomen=new THREE.Mesh(new THREE.CylinderGeometry(.006,.003,.095,10),bodyMaterial);abdomen.rotation.x=Math.PI/2;abdomen.position.z=.024;group.add(abdomen);
    for(const [x,y,z,sx,sy,sz,mat] of [[0,0,-.023,.014,.012,.02,bodyMaterial],[-.009,.006,-.042,.007,.007,.006,eyeMaterial],[.009,.006,-.042,.007,.007,.006,eyeMaterial]]){const mesh=new THREE.Mesh(round,mat);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);group.add(mesh);}
    const wings=[];
    for(const side of [-1,1])for(const front of [-1,1]){const pivot=new THREE.Group();pivot.position.set(side*.008,.004,front*.014);const wing=new THREE.Mesh(round,wingMaterial);wing.scale.set(.047,.0013,.013);wing.position.x=side*.044;wing.rotation.y=front*side*.28;pivot.add(wing);group.add(pivot);wings.push({pivot,side,front});}
    return {group,wings};
}

// The scene/state are shared by native WebXR and the desktop visual preview.
// The anchor stays in the world; moving one's head never moves the table.
export function createWelcomePracticeScene({voice,onComplete=()=>{},onChange=()=>{},onFeedback=()=>{},onAssets=()=>{},embedded=false,onSelect=()=>false,loadZinnia,getTrialPanelPose=()=>null}={}){
    const scene=new THREE.Scene(),root=new THREE.Group();scene.add(root);root.visible=false;
    const controllerGuide=createWelcomeControllerGuide(scene,{onAssets});
    const tableParts=createWelcomePracticeTable(root),table=tableParts.group,stand=tableParts.stand,foot=tableParts.foot;
    // Reserve a quiet physical home for the separately authored Zinnia character.
    const zinniaPot=new THREE.Group();zinniaPot.name='Zinnia pot · character mount';zinniaPot.position.set(.02,0,-.28);root.add(zinniaPot);
    const zinniaMount=new THREE.Group();zinniaMount.name='Authored Zinnia attachment';zinniaPot.add(zinniaMount);
    let zinniaReveal=null;
    const zinniaCharacter=createZinniaCharacter({load:loadZinnia,onReady:()=>{if(disposed)return;zinniaReveal?.removeGlow();zinniaReveal=createWelcomeObjectReveal(zinniaPot);zinniaReveal?.update(reveals.zinnia===null?-1:elapsed-reveals.zinnia);onAssets();lastSignature='';if(active)paint();},onError:()=>{if(!disposed){lastSignature='';if(active)paint();}}});zinniaMount.add(zinniaCharacter);
    const homes=[[0,.22],[-.22,.24],[.26,.25],[-.50,.27],[-.26,-.02],[.16,.05],[.47,.28]];
    const bodies=WELCOME_INITIAL_FRUITS.map((id,i)=>createPracticeBody(id,{x:homes[i][0],z:homes[i][1],radius:WELCOME_FRUIT_ASSETS[id].extent*.4}));
    const practiceFruits=bodies.slice();
    const objects=new Map();
    for(const body of bodies){const group=new THREE.Group();root.add(group);objects.set(body.id,group);
        const placeholder=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),glass(WELCOME_FRUIT_ASSETS[body.id].colour));
        const half=body.halfSize;placeholder.scale.set(half.x,half.y,half.z);group.add(placeholder);
    }
    const props=createWelcomePracticeProps(root,bodies.slice(),{onCollect:body=>onFeedback('collect',body.interactionSource || lastActionSource)});bodies.push(props.body);objects.set(props.body.id,props.remote);
    const tableReveal=createWelcomeObjectReveal(table,{duration:.9,glowStrength:0}),basketReveal=createWelcomeObjectReveal(props.basket);zinniaPot.visible=false;
    tableReveal.update(-1);zinniaReveal?.update(-1);basketReveal.update(-1);
    const garden=createWelcomePlantPractice(root,{onAssets});props.addHarvest(garden.harvestBodies);bodies.push(...garden.bodies);for(const [id,object] of garden.objects)objects.set(id,object);
    const dragon=createDragonfly();dragon.group.scale.setScalar(.8);root.add(dragon.group);
    const flight=createWelcomeFlightLesson(root,dragon,tableParts.landing,{onFeedback});
    new GLTFLoader().loadAsync(new URL('../assets/welcome-practice/dragonfly.glb',import.meta.url).href).then(gltf=>{if(disposed){disposeTree(gltf.scene);return;}const prepared=prepareWelcomeDragonfly(gltf.scene);disposeTree(dragon.group);dragon.group.clear();dragon.group.add(prepared.model);dragon.wings=prepared.wings;onAssets();}).catch(error=>console.warn('Practice dragonfly:',error.message));
    const plate=textPlate(1400,350,.98,.245);plate.mesh.position.set(0,.48,-.41);root.add(plate.mesh);
    const buttons=new Map();
    for(const [id,x] of [['replay',-.36],['mute',-.12],['skip',.12],['next',.36]]){const p=textPlate(360,100,.222,.062);p.mesh.position.set(x,.288,-.41);root.add(p.mesh);buttons.set(id,{...p,x,y:.288,width:.222,height:.062,enabled:true});}
    let active=false,disposed=false,anchored=false,index=0,elapsed=0,stepStarted=0,tableHeight=1.02,lastSignature='',lastImpact=-Infinity;
    let exiting=false,exitStarted=0,fadeStarted=null,exitOpacity=1,exitSkipped=false,lastPickedFruit=null,tableHeightOffset=getSpatialVisualSettings().practiceTableHeight;
    let pointed=false,orangeGrabbed=false,orangeReleased=false,fruitGrabbed=false,fruitReleased=false,dragonDistance=0,dragonReleased=false,handsPresent=false,handStable=0,successAt=null;
    let remoteSource=null,remoteArmed=false,narrationFinishedAt=null,fruitMessage='',fruitCue=null;const fruitVariants=new Map(),fruitParts=new Map();
    let frameLoadError=null,tutorialPaused=false,presentationRevision=0;
    const reveals={table:null,zinnia:null,basket:null};
    let dragonOwner=null,dragonOffset=null,dragonVelocity=new THREE.Vector3(),dragonManual=false,dragonPhase=Math.random()*Math.PI*2,dragonHeading=0,successCuePlayed=false,gloveTried=false,gloveRevealPlayed=false,lastActionSource=null,wasPouring=false;
    const activeGrabs=new Map(),inputEdges=new Map(),point=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3(),worldInverse=new THREE.Matrix4(),pendingEvents=new Set();
    let trialVisibility=null,trialVoiceWasPaused=false;
    const trials=createWelcomePracticeTrials(root,{onAssets,onFeedback,getPanelPose:getTrialPanelPose,onOpen:()=>{
        releaseAll(false);if(!trialVisibility){trialVisibility=new Map(root.children.filter(child=>child!==trials.layer && child!==trials.panel).map(child=>[child,child.visible]));trialVoiceWasPaused=Boolean(voice?.status().paused);voice?.pause();}
        for(const child of trialVisibility.keys())child.visible=false;tableReveal.update(4);lastSignature='';
    },onClose:()=>{for(const [child,visible] of trialVisibility || [])child.visible=visible;trialVisibility=null;inputEdges.clear();if(!trialVoiceWasPaused && !tutorialPaused)voice?.resume();lastSignature='';paint();}});
    const fruitHighlight=new THREE.Mesh(new THREE.TorusGeometry(.07,.0035,6,40),new THREE.MeshBasicMaterial({color:'#ffe0a0',transparent:true,opacity:.8,depthWrite:false}));fruitHighlight.rotation.x=Math.PI/2;root.add(fruitHighlight);
    const revealHalos=[-1,1].map(()=>{const halo=new THREE.Mesh(new THREE.SphereGeometry(.07,16,10),new THREE.MeshBasicMaterial({color:'#ffe7b2',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));scene.add(halo);return halo;});
    let inputOverride=null;
    const handsEnabled=()=>inputOverride?inputOverride==='hands':trials.active?trials.mode==='hands':['hands','packet','seed','water','grow','harvest','explore'].includes(phase());
    const lesson=()=>WELCOME_PRACTICE_LESSONS[index];
    const phase=()=>lesson().id;
    const gloveOpacity=()=>inputOverride?inputOverride==='gloves'?1:0:phase()==='gloves'?THREE.MathUtils.smoothstep(elapsed-stepStarted,1.2,3.4):['fruit','water','grow'].includes(phase())?1:0;
    const cue=id=>WELCOME_PRACTICE_RESPONSES.find(value=>value.id===id);
    const spokenLesson=()=>lesson().silent?null:{...lesson(),recorded:true};
    const comfortVisible=()=>Boolean(frameLoadError) || zinniaCharacter.userData.zinnia.status==='error' || index>=WELCOME_PRACTICE_LESSONS.findIndex(l=>l.id==='comfort');
    const textOpacity=()=>phase()==='frame' && !frameLoadError?0:THREE.MathUtils.smoothstep(elapsed-stepStarted,0,1.2);
    const currentCaption=()=>successCuePlayed && successAt!==null && cue(phase()==='hands'?'hands-ready':lesson().id+'-done')?.spoken?cue(phase()==='hands'?'hands-ready':lesson().id+'-done').spoken:['face','zinnia-reveal','zinnia'].includes(phase()) && zinniaCharacter.userData.zinnia.status==='error'?'Zinnia’s model could not load. Check your connection and restart the tutorial.':phase()==='frame' && frameLoadError?'The 3D Living Frame could not load. Use Adjust, then Frame SD or HD, to retry.':phase()==='harvest'?lesson().caption+' '+props.snapshot().harvestCount+' of 3.':['grab','fruit'].includes(phase()) && fruitMessage?fruitMessage:phase()==='fruit'?'Pick another fruit. Open it if you like, then place it on the plate.':phase()==='fly'?(remoteSource?flight.cue+' Trigger: forward. Grip: back. Stick: turn and height.':lesson().caption):phase()==='hands' && handsPresent?'Your movements become visible hands. Gently touch thumb and index finger together.':lesson().caption;
    const exitCopy=()=>exitSkipped?'You chose to end the tutorial. You can always come back here later. Let’s continue with the NourishlandXR main demo.':'You’re ready. Let’s continue with the NourishlandXR main demo.';
    function snapshot(){return {active,exiting,exitOpacity,lastPickedFruit,fruitMessage,openedFruits:[...fruitVariants].filter(([,v])=>v.opened).map(([id])=>id),phase:phase(),index,caption:exiting?exitCopy():currentCaption(),title:exiting?'At your pace':lesson().title,handsPresent,held:[...activeGrabs.values()].map(g=>g.body.id),comfortVisible:comfortVisible(),textOpacity:textOpacity(),voice:{...voice?.status(),paused:trials.active?tutorialPaused:tutorialPaused || Boolean(voice?.status().paused)},assets:fruitAssets,zinniaAsset:zinniaCharacter.userData.zinnia.status,flight:flight.snapshot(),nextFruit:props.nextFruit,garden:garden.snapshot(),basket:props.snapshot(),completed:successAt!==null,controllerGuide:controllerGuide.snapshot(),trials:trials.snapshot()};}
    function nextAllowed(){return !(voice?.status().playing || voice?.status().paused || tutorialPaused) && phase()==='explore';}
    function paint(){
        const v=voice?.status() || {playing:false,muted:true};
        const label=phase()==='hands'?'Try a pinch':'Continue';
        const caption=currentCaption();
        const signature=[index,caption,v.playing,v.paused,tutorialPaused,v.muted,nextAllowed(),handsPresent,exiting,lastPickedFruit,Math.round(textOpacity()*20)].join('|');if(signature===lastSignature)return;lastSignature=signature;
        plate.paint(ctx=>{ctx.fillStyle='rgba(242,240,228,.92)';ctx.beginPath();ctx.roundRect(2,2,1396,346,65);ctx.fill();ctx.strokeStyle='rgba(147,168,146,.7)';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#637763';ctx.font='500 27px system-ui';ctx.textAlign='center';ctx.fillText('NOURISHLAND XR  ·  WELCOME 0.1',700,63);ctx.fillStyle='#304334';ctx.font='500 59px system-ui';ctx.fillText(lesson().title,700,147,1310);ctx.font='34px system-ui';ctx.fillStyle='#485c49';
            const words=caption.split(' '),lines=[''];for(const word of words){const i=lines.length-1;if(ctx.measureText(lines[i]+word).width>1280)lines.push(word+' ');else lines[i]+=word+' ';}lines.slice(0,2).forEach((line,i)=>ctx.fillText(line.trim(),700,223+i*47));});
        for(const [id,p] of buttons){p.enabled=id==='next'?nextAllowed():Boolean(voice);p.mesh.visible=p.enabled && !embedded;
            p.paint(ctx=>{ctx.fillStyle=id==='next'?'#677f65':'rgba(236,239,225,.92)';ctx.beginPath();ctx.roundRect(2,2,356,96,43);ctx.fill();ctx.fillStyle=id==='next'?'#fff9e9':'#405740';ctx.font='500 28px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(id==='skip'?'Skip hands tutorial':id==='replay'?'Hear again':id==='mute'?(v.muted?'Voice off':'Voice on'):label,180,50,338);});
        }
        plate.mesh.material.opacity=textOpacity();plate.mesh.visible=!embedded && phase()!=='frame';onChange(snapshot());
    }
    function setLesson(value){presentationRevision++;releaseAll(false);index=value;stepStarted=elapsed;narrationFinishedAt=null;
        fruitMessage='';fruitCue=null;if(['basket-reveal','grab','fruit'].includes(phase()))props.stockBasket();if(phase()==='table-reveal')reveals.table=elapsed;if(phase()==='zinnia-reveal')reveals.zinnia=elapsed;if(phase()==='basket-reveal')reveals.basket=elapsed;pointed=false;orangeGrabbed=false;orangeReleased=false;fruitGrabbed=false;fruitReleased=false;dragonDistance=0;dragonReleased=false;handStable=0;lastActionSource=null;wasPouring=false;if(phase()==='packet'){garden.reset();garden.bodies.forEach(resetPracticeBody);}successCuePlayed=false;gloveTried=false;successAt=null;lastSignature='';if(phase()==='fly')flight.reset();if(phase()==='gloves')gloveRevealPlayed=false;void voice?.speak(spokenLesson());paint();}
    function start(viewer,floor){if(disposed)return;trials.close();active=true;exiting=false;tutorialPaused=false;exitOpacity=1;fadeStarted=null;lastPickedFruit=null;for(const variants of fruitVariants.values()){variants.opened=false;variants.whole.visible=true;if(variants.half)variants.half.visible=false;}for(const part of fruitParts.values())part.visible=false;props.reset();reveals.table=reveals.zinnia=reveals.basket=null;tableReveal.update(-1);zinniaReveal?.update(-1);basketReveal.update(-1);for(const mesh of objects.values())mesh.visible=false;dragon.group.visible=false;elapsed=0;stepStarted=0;if(viewer)anchor(viewer,floor);setLesson(0);}
    function anchor(viewer,floor=viewer[13]-1.65){if(anchored || !viewer)return;const forward=new THREE.Vector3(-viewer[8],0,-viewer[10]).normalize();if(forward.lengthSq()<.1)forward.set(0,0,-1);tableHeight=Math.max(.58,Math.min(.88,viewer[13]-.65-floor))+tableHeightOffset;root.position.set(viewer[12]+forward.x*.75,floor+tableHeight,viewer[14]+forward.z*.75);root.quaternion.setFromAxisAngle(up,Math.atan2(-forward.x,-forward.z));stand.scale.y=tableHeight-.04;stand.position.y=-tableHeight/2-.012;foot.position.y=-tableHeight+.012;root.updateMatrixWorld(true);anchored=true;}
    function setTableHeightOffset(value){const next=Math.max(-.2,Math.min(.25,value)),delta=next-tableHeightOffset;tableHeightOffset=next;if(!anchored)return;releaseAll(false);root.position.y+=delta;tableHeight+=delta;stand.scale.y=tableHeight-.04;stand.position.y=-tableHeight/2-.012;foot.position.y=-tableHeight+.012;root.updateMatrixWorld(true);}
    function localPose(matrix){return new THREE.Matrix4().multiplyMatrices(worldInverse,new THREE.Matrix4().fromArray(matrix));}
    function localRay(ray){if(!ray?.origin || !ray.direction)return null;root.updateMatrixWorld(true);worldInverse.copy(root.matrixWorld).invert();return new THREE.Ray(new THREE.Vector3(ray.origin.x,ray.origin.y,ray.origin.z),new THREE.Vector3(ray.direction.x,ray.direction.y,ray.direction.z).normalize()).applyMatrix4(worldInverse);}
    function hit(ray){if(!active || !anchored)return null;const r=localRay(ray);if(!r)return null;let best=null;
        const trialHit=trials.hit(ray);if(trials.active)return trialHit;if(trialHit)best=trialHit;
        const pick=(distance,value)=>{if(distance>0 && (!best || distance<best.distance))best={...value,distance};};
        if(index>0)for(const body of bodies){if(!body.visible)continue;const p=r.intersectSphere(new THREE.Sphere(new THREE.Vector3(body.position.x,body.position.y,body.position.z),body.radius+.014),new THREE.Vector3());if(p)pick(p.distanceTo(r.origin),{kind:'body',body,point:p});}
        if(['fly','explore'].includes(phase())){const p=r.intersectSphere(new THREE.Sphere(dragon.group.position,.095),new THREE.Vector3());if(p)pick(p.distanceTo(r.origin),{kind:'dragon',point:p});}
        const p=r.intersectPlane(new THREE.Plane(new THREE.Vector3(0,0,1),.41),new THREE.Vector3());
        if(p && !embedded)for(const [id,b] of buttons)if(b.enabled && Math.abs(p.x-b.x)<b.width/2 && Math.abs(p.y-b.y)<b.height/2)pick(p.distanceTo(r.origin),{kind:'button',id,point:p.clone()});
        const tablePoint=r.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),new THREE.Vector3());
        if(table.visible && tablePoint && onPracticeTable(tablePoint.x,tablePoint.z))pick(tablePoint.distanceTo(r.origin),{kind:'table',point:tablePoint});
        if(best){best.worldPoint=best.point.clone().applyMatrix4(root.matrixWorld);return best;}return null;
    }
    function finish(skipped=false){if(!active || exiting)return;trials.close();exiting=true;tutorialPaused=false;exitSkipped=skipped;exitStarted=elapsed;fadeStarted=null;releaseAll(false);voice?.stop();void voice?.speak({...cue(skipped?'practice-exit':'practice-complete'),recorded:true});lastSignature='';paint();}
    function abort(){trials.close();active=false;exiting=false;exitOpacity=0;voice?.stop();releaseAll(false);root.visible=false;onChange(snapshot());onComplete({aborted:true});}
    function button(id,source){if(exiting)return;voice?.unlock();onFeedback('control',source);if(trials.active && id==='pause'){releaseAll(false);tutorialPaused=!tutorialPaused;paint();return;}if(trials.active && id==='replay')return;if(id==='skip'){finish(true);return;}else if(id==='pause'){releaseAll(false);tutorialPaused=!(tutorialPaused || voice?.status().paused);tutorialPaused?voice?.pause():voice?.resume();}else if(id==='replay'){presentationRevision++;void voice?.speak(spokenLesson());}else if(id==='mute')voice?.toggleMute();else if(id==='next' && nextAllowed()){finish();}paint();}
    function select(ray,source){if(!active || exiting)return false;voice?.unlock();const trialTarget=trials.hit(ray);if(trialTarget?.kind==='trial-control'){trials.command(trialTarget.id);trials.consumeSelect(source);return true;}const held=activeGrabs.get(source);if(held && openFruit(held.body,source))return true;if(onSelect(ray,source))return true;if(source?.hand && !handsEnabled())return false;const target=hit(ray);if(!target)return false;if(target.kind==='button'){button(target.id,source);return true;}
        return false;
    }
    function grab(source,pose){if(source?.hand && !handsEnabled() || !source?.hand && ['hands','packet','seed','harvest'].includes(phase()))return;if(tutorialPaused || voice?.status().paused || lesson().automatic || activeGrabs.has(source))return;pose.decompose(point,rotation,scale);
        const occupied=new Set([...activeGrabs.values()].map(g=>g.body));
        const allowed=b=>phase()==='explore' || phase()==='fruit' && practiceFruits.includes(b) || phase()==='hands' && source.hand && b.id===WELCOME_INITIAL_FRUITS[0] || phase()==='packet' && b.id==='seed-packet' || phase()==='seed' && b.id==='seed' || phase()==='harvest' && b.id.startsWith('strawberry-') || ['water','grow'].includes(phase()) && b.id==='watering-can' || ['grab','gloves'].includes(phase()) && practiceFruits.includes(b) || phase()==='fly' && b.id==='remote' && !source.hand;
        const candidate=bodies.filter(b=>b.visible && !occupied.has(b) && allowed(b)).map(b=>({body:b,d:point.distanceTo(new THREE.Vector3(b.gripPoint?.x || 0,b.gripPoint?.y || 0,b.gripPoint?.z || 0).applyQuaternion(new THREE.Quaternion(b.rotation.x,b.rotation.y,b.rotation.z,b.rotation.w)).add(new THREE.Vector3(b.position.x,b.position.y,b.position.z)))})).filter(c=>c.d<c.body.radius+(source.hand?.07:.095)).sort((a,b)=>a.d-b.d)[0];
        if(candidate){const b=candidate.body;if(WELCOME_FRUIT_ASSETS[b.id])lastPickedFruit=b.id;if(b.id==='remote' && phase()==='fly'){remoteSource=source;remoteArmed=false;}props.remove(b);b.interactionSource=source;const harvested=garden.picked(b);const bodyMatrix=new THREE.Matrix4().compose(new THREE.Vector3(b.position.x,b.position.y,b.position.z),new THREE.Quaternion(b.rotation.x,b.rotation.y,b.rotation.z,b.rotation.w),one);if(b.gripPoint){const grip=new THREE.Vector3(b.gripPoint.x,b.gripPoint.y,b.gripPoint.z).applyQuaternion(new THREE.Quaternion(b.rotation.x,b.rotation.y,b.rotation.z,b.rotation.w));bodyMatrix.setPosition(point.clone().sub(grip));}activeGrabs.set(source,{body:b,offset:b.id==='remote' && !source.hand?new THREE.Matrix4():pose.clone().invert().multiply(bodyMatrix),samples:[],started:elapsed,start:new THREE.Vector3(b.position.x,b.position.y,b.position.z),moved:0});b.held=true;Object.assign(b.velocity,{x:0,y:0,z:0});Object.assign(b.angular,{x:0,y:0,z:0});if(['grab','fruit','explore'].includes(phase()) && !b.named && WELCOME_FRUIT_ASSETS[b.id]){b.named=true;const info=WELCOME_FRUIT_ASSETS[b.id];fruitMessage=tutorialFruitPrompt(info,Boolean(fruitVariants.get(b.id)?.half));fruitCue={id:'fruit-pick-'+b.id,spoken:fruitMessage,recorded:true};}if(phase()==='grab' && practiceFruits.includes(b))orangeGrabbed=true;if(['fruit','hands'].includes(phase()))fruitGrabbed=true;onFeedback(harvested?'harvest':'grab',source);return;}
        if(phase()==='explore' && !dragonOwner && point.distanceTo(dragon.group.position)<.13 && source.hand){dragonOwner=source;dragonOffset=dragon.group.position.clone().sub(point);}
    }
    function release(source,throwing=true){const g=activeGrabs.get(source);if(throwing && source===remoteSource && phase()==='fly' && g?.body.id==='remote')return;if(g){const b=g.body,last=g.samples.at(-1),first=g.samples.find(s=>last.time-s.time<=.12);if(throwing && last && first && last.time-first.time>.008){const v=last.p.clone().sub(first.p).divideScalar(last.time-first.time).clampLength(0,3.2);Object.assign(b.velocity,serial(v));const q=last.q.clone().multiply(first.q.clone().invert());if(q.w<0)q.set(-q.x,-q.y,-q.z,-q.w);const angle=2*Math.acos(Math.max(-1,Math.min(1,q.w))),a=new THREE.Vector3(q.x,q.y,q.z).normalize().multiplyScalar(Math.min(8,angle/(last.time-first.time)));Object.assign(b.angular,serial(a));}
            b.held=false;activeGrabs.delete(source);let rewarded=false;if(throwing){lastActionSource=source;if(g.moved>.06){if(phase()==='grab' && practiceFruits.includes(b) && orangeGrabbed && elapsed-g.started>1.2)orangeReleased=true;else if(phase()==='hands' && source.hand && fruitGrabbed)fruitReleased=true;}if(['grab','fruit','explore'].includes(phase()) && !b.id.startsWith('strawberry-'))rewarded=props.placeOnPlate(b);else if(['harvest','explore'].includes(phase()))rewarded=props.place(b);if(['seed','explore'].includes(phase()) && garden.plant(b)){rewarded=true;Object.assign(b.velocity,{x:0,y:0,z:0});onFeedback('plant',source);}}if(throwing && !rewarded)onFeedback('release',source);}
        if(dragonOwner===source){dragonOwner=null;dragonManual=false;if(throwing && dragonDistance>.08)dragonReleased=true;}
    }
    function releaseAll(throwing=false){trials.releaseAll();remoteSource=null;remoteArmed=false;for(const source of [...activeGrabs.keys()])release(source,throwing);dragonOwner=null;dragonManual=false;dragonVelocity.set(0,0,0);}
    const fruitAssets=Object.fromEntries(WELCOME_INITIAL_FRUITS.map(id=>[id,'loading']));
    const loader=new GLTFLoader();
    const fruitLoading=Promise.all(practiceFruits.map(async body=>{
        try{const gltf=await loader.loadAsync(new URL(WELCOME_FRUIT_ASSETS[body.id].url,import.meta.url).href);if(disposed){disposeTree(gltf.scene);return;}
            const info=WELCOME_FRUIT_ASSETS[body.id],prepared=prepareTutorialFruit(gltf.scene,info.extent),holder=objects.get(body.id);disposeTree(holder);holder.clear();holder.add(prepared.group);const variants={whole:prepared.group,half:null,opened:false};fruitVariants.set(body.id,variants);
            body.halfSize=prepared.halfSize;body.radius=Math.max(...Object.values(body.halfSize));resetPracticeBody(body);fruitAssets[body.id]='ready';
            if(info.halfUrl){try{const cut=await loader.loadAsync(new URL(info.halfUrl,import.meta.url).href);if(disposed){disposeTree(cut.scene);return;}const half=prepareTutorialFruit(cut.scene,info.extent);variants.half=half.group;variants.halfSize=half.halfSize;variants.axis=half.axis;half.group.visible=false;holder.add(half.group);}catch(error){console.warn('Fruit opening unavailable:',body.id,error.message);}}
        }catch(error){fruitAssets[body.id]='fallback';console.warn('Practice fruit:',body.id,error.message);}
    })).then(()=>{if(!disposed)onAssets();});
    const loading=Promise.all([fruitLoading,zinniaCharacter.userData.zinnia.ready]);
    function openFruit(body,source){
        const variants=fruitVariants.get(body.id);if(!variants?.half || variants.opened || !['grab','fruit','explore'].includes(phase()))return false;
        variants.opened=true;variants.whole.visible=false;variants.half.visible=true;
        let part=fruitParts.get(body.id);if(!part){part=createPracticeBody(body.id+':half',{radius:body.radius,halfSize:variants.halfSize,bounce:.05});part.home={...body.home};fruitParts.set(body.id,part);bodies.push(part);practiceFruits.push(part);props.addFruit(part);const group=new THREE.Group(),half=variants.half.clone(true);half.visible=true;half.scale[variants.axis]*=-1;group.add(half);root.add(group);objects.set(part.id,group);}
        part.visible=true;part.held=false;part.anchored=false;part.plated=false;part.basketed=false;Object.assign(part.position,body.position);Object.assign(part.rotation,body.rotation);part.position.x+=body.radius*1.4;Object.assign(part.velocity,{x:0,y:0,z:0});
        fruitMessage=WELCOME_FRUIT_ASSETS[body.id].remark+' Place it on the plate.';fruitCue={id:'fruit-open-'+body.id,spoken:fruitMessage,recorded:true};zinniaCharacter.userData.zinnia.guide.celebrate();onFeedback('open',source);onAssets();return true;
    }
    function practiceZinniaTarget(){
        const id={grab:lastPickedFruit || WELCOME_INITIAL_FRUITS[0],packet:'seed-packet',water:'watering-can',seed:'seed'}[phase()];
        const held=[...activeGrabs.values()].find(g=>practiceFruits.includes(g.body));if(held)return objects.get(held.body.id)?.getWorldPosition(new THREE.Vector3());
        const object=phase()==='fruit' || phase()==='basket-reveal'?props.basket:phase()==='grow' || phase()==='harvest'?root.getObjectByName('WelcomeStrawberryPot'):phase()==='table-reveal'?table:id?objects.get(id):phase()==='fly' || phase()==='explore'?dragon.group:null;
        return object?.visible?object.getWorldPosition(new THREE.Vector3()):null;
    }
    function update(dt,{viewer,floor,hands=[],controllers=[],inputs=[],frameReady=true,frameError=null}={}){
        if(active && !disposed && !exiting){anchor(viewer,floor);if(anchored){root.visible=true;root.updateMatrixWorld(true);trials.update(dt,{inputs,visible:comfortVisible(),paused:tutorialPaused});if(trials.active){for(const child of trialVisibility?.keys() || [])if(child!==table)child.visible=false;controllerGuide.update(tutorialPaused?0:Math.min(.06,dt),trials.mode==='controllers'?controllers:[],'trial',viewer,false,1);onChange(snapshot());return;}}}
        if(!active || disposed)return;dt=!exiting && (tutorialPaused || voice?.status().paused)?0:Math.min(.06,Math.max(0,dt));elapsed+=dt;frameLoadError=phase()==='frame'?frameError:null;anchor(viewer,floor);if(!anchored)return;
        if(exiting){if(fadeStarted===null && elapsed-exitStarted>2.5 && (!voice?.status().playing || elapsed-exitStarted>24)){voice?.stop();fadeStarted=elapsed;}if(fadeStarted!==null){const t=Math.min(1,(elapsed-fadeStarted)/1.8);exitOpacity=1-t*t*(3-2*t);if(t>=1){active=false;root.visible=false;onChange(snapshot());onComplete({skipped:exitSkipped});return;}}paint();return;}
        root.visible=true;root.updateMatrixWorld(true);worldInverse.copy(root.matrixWorld).invert();
        const handsAllowed=handsEnabled();hands=handsAllowed?hands:[];inputs=inputs.filter(input=>!input.source.hand || handsAllowed);handsPresent=hands.some(e=>e.state?.tracked);handStable=handsPresent?handStable+dt:0;
        const age=elapsed-stepStarted;
        tableReveal.update(reveals.table===null?-1:elapsed-reveals.table);
        zinniaReveal?.update(reveals.zinnia===null?-1:elapsed-reveals.zinnia);
        animateZinniaCharacter(zinniaCharacter,elapsed,Boolean(voice?.status().playing),{lesson:phase(),viewer,inputs:inputs.filter(input=>!activeGrabs.has(input.source)),speechLevel:voice?.speechLevel?.() || 0,targetWorld:practiceZinniaTarget(),paused:tutorialPaused || Boolean(voice?.status().paused),cue:{id:phase()+':'+(lastPickedFruit || '')+':'+Boolean(fruitVariants.get(lastPickedFruit)?.opened)+':'+presentationRevision+':'+(successAt!==null),intent:successAt!==null?'celebrate':phase()==='zinnia'?'greet':'explain'},success:successAt!==null});
        const orangeAppear=phase()==='grab'?THREE.MathUtils.smoothstep(age,0,1.8):1;
        for(const fruit of practiceFruits)objects.get(fruit.id)?.scale.setScalar(Math.max(.001,orangeAppear));
        for(const source of [...inputEdges.keys()])if(!inputs.some(i=>i.source===source)){release(source,false);inputEdges.delete(source);}
        const consumed=new Set();
        for(const input of inputs){const {source,matrix,ray,down,trigger}=input,previous=inputEdges.get(source);
            if(!matrix){release(source,false);inputEdges.delete(source);continue;}const pose=localPose(matrix);
            const stickActive=Boolean(trigger && source.gamepad?.axes?.some((value,i)=>i>=(source.gamepad.axes.length>=4?2:0) && Math.abs(value)>.18));
            if(previous && (down && !previous.down && ['grab','fruit','packet','seed','water','harvest'].includes(phase()) || phase()==='fly' && (trigger && !previous.trigger || stickActive && !previous.stickActive))){lastActionSource=source;onFeedback('control',source);}
            if(trigger && !previous?.trigger && activeGrabs.has(source))openFruit(activeGrabs.get(source).body,source);if(source.hand && down && !previous?.down && !activeGrabs.has(source)){pose.decompose(point,rotation,scale);const held=[...activeGrabs.values()].find(g=>practiceFruits.includes(g.body) && point.distanceTo(new THREE.Vector3(g.body.position.x,g.body.position.y,g.body.position.z))<g.body.radius+.08);if(held)openFruit(held.body,source);}
            if(source===remoteSource && !down)remoteArmed=true;if(down && !activeGrabs.has(source))grab(source,pose);else if(!down)release(source,true);
            if(trigger && previous?.trigger===false && source.hand && !activeGrabs.has(source) && dragonOwner!==source){if(select(ray,source))consumed.add(source);}
            const g=activeGrabs.get(source);if(g && trigger && g.started===elapsed)openFruit(g.body,source);if(phase()==='packet' && !garden.opened){const holder=[...activeGrabs].find(([,hold])=>hold.body.id==='seed-packet');let opening=g?.body.id==='seed-packet' && trigger && previous?.down && !previous.trigger;if(source.hand && down && holder && holder[0]!==source){pose.decompose(point,rotation,scale);opening ||= point.distanceTo(garden.sealPoint())<.065;}if(opening && garden.openPacket()){lastActionSource=source;onFeedback('open',source);}}if(g){const m=pose.clone().multiply(g.offset),p=new THREE.Vector3(),q=new THREE.Quaternion();m.decompose(p,q,scale);Object.assign(g.body.rotation,{x:q.x,y:q.y,z:q.z,w:q.w});g.body.support=practiceSupport(g.body);if(!g.body.gripPoint && onPracticeTable(p.x,p.z))p.y=Math.max(g.body.support,p.y);g.moved=Math.max(g.moved,p.distanceTo(g.start));Object.assign(g.body.position,serial(p));Object.assign(g.body.rotation,{x:q.x,y:q.y,z:q.z,w:q.w});g.samples.push({time:elapsed,p:p.clone(),q:q.clone()});g.samples=g.samples.filter(s=>elapsed-s.time<.18);}
            if(source.hand && phase()==='explore' && dragonOwner===source){pose.decompose(point,rotation,scale);const desired=point.clone().add(dragonOffset),before=dragon.group.position.clone();dragon.group.position.lerp(desired,1-Math.exp(-dt*16));dragonDistance+=before.distanceTo(dragon.group.position);dragonManual=true;}
            // Near finger contact makes audio controls available without rays.
            if(input.tip && !embedded){const tip=new THREE.Vector3(input.tip.x,input.tip.y,input.tip.z).applyMatrix4(worldInverse),poke=Math.abs(tip.z+.41)<.027;const b=[...buttons].find(([,v])=>v.enabled && Math.abs(tip.x-v.x)<v.width/2 && Math.abs(tip.y-v.y)<v.height/2);const id=poke && b?b[0]:null;if(id && previous?.poke!==id && !down && !g)button(id);input.poke=id;}
            inputEdges.set(source,{down:Boolean(down),trigger:Boolean(trigger),stickActive,poke:input.poke});
        }
        if(fruitCue && !voice?.status().playing && !voice?.status().paused){void voice?.speak(fruitCue);fruitCue=null;}
        garden.update(dt,lesson().id);if(garden.pouring && !wasPouring)onFeedback('water',lastActionSource);wasPouring=garden.pouring;
        for(const b of practiceFruits)b.visible=(!b.id.includes(':half') || Boolean(fruitVariants.get(b.id.split(':')[0])?.opened)) && (['grab','gloves','basket','basket-reveal','fruit','fly'].includes(phase()) || phase()==='explore' && !garden.grown);
        const heldRemote=controllers.find(i=>activeGrabs.get(i.source)?.body.id==='remote'),pilot=heldRemote?{...heldRemote,reverse:remoteArmed && heldRemote.down}:null;props.update(phase(),pilot,dt);basketReveal.update(reveals.basket===null?-1:elapsed-reveals.basket);
        stepPracticeBodies(bodies,dt,{floor:-tableHeight,onImpact:(body,speed)=>{if(elapsed-lastImpact>.18){lastImpact=elapsed;onFeedback('impact',body.interactionSource || lastActionSource,Math.min(1,speed/3));}}});
        for(const b of bodies){const mesh=objects.get(b.id);mesh.visible=b.visible;mesh.position.set(b.position.x,b.position.y,b.position.z);mesh.quaternion.set(b.rotation.x,b.rotation.y,b.rotation.z,b.rotation.w);}
        flight.update(dt,phase(),pilot);
        fruitHighlight.visible=false;
        if(lesson().automatic){
            const speaking=tutorialPaused || voice?.status().playing || voice?.status().paused;
            if(speaking)narrationFinishedAt=null;else if(narrationFinishedAt===null)narrationFinishedAt=elapsed;
            const readTime=voice?.status().muted || !voice?.status().available?Math.max(5,(lesson().spoken || '').split(/\s+/).length/2.6):0;
            const ready=phase()!=='frame' || frameReady;
            const assetsReady=(phase()!=='practice-ready' || fruitAssets[WELCOME_INITIAL_FRUITS[0]]!=='loading') && (phase()!=='face' || zinniaCharacter.userData.zinnia.status==='ready');
            if(ready && assetsReady && !speaking && age>Math.max(lesson().hold || 2,readTime) && elapsed-narrationFinishedAt>(lesson().silent?0:2))setLesson(index+1);
        }
        if(phase()==='gloves' && age>.8 && !gloveRevealPlayed && controllers.length){gloveRevealPlayed=true;for(const input of controllers)onFeedback('transform',input.source);}
        if(phase()==='gloves' && age>4.5 && controllers.some(i=>i.down))gloveTried=true;
        const success=phase()==='grab'?orangeReleased && props.snapshot().plated.length>0:phase()==='gloves'?gloveTried:phase()==='fruit'?new Set(props.snapshot().plated.map(id=>id.split(':')[0])).size>=2:phase()==='fly'?flight.complete:phase()==='hands'?handStable>1.2 && inputs.some(input=>input.source.hand && input.trigger):phase()==='packet'?garden.opened:phase()==='seed'?garden.planted:phase()==='water'?garden.watered:phase()==='grow'?garden.grown:phase()==='harvest'?props.harvestComplete:false;
        if(success){if(successAt===null){successAt=elapsed;zinniaCharacter.userData.zinnia.guide.celebrate();onFeedback('lesson',lastActionSource);}
            if(!successCuePlayed && elapsed-successAt>.45 && !voice?.status().playing && !voice?.status().paused && !tutorialPaused){successCuePlayed=true;successAt=elapsed;const id=phase()==='hands'?'hands-ready':lesson().id+'-done';void voice?.speak(cue(id)?{...cue(id),recorded:true}:null);}
            if(successCuePlayed && elapsed-successAt>1.2 && !voice?.status().playing && !voice?.status().paused && !tutorialPaused)setLesson(index+1);
        }
        revealHalos.forEach((halo,i)=>{const input=controllers[i],t=age-.8;halo.visible=phase()==='gloves' && Boolean(input) && t>=0 && t<2.8;if(halo.visible){halo.position.setFromMatrixPosition(new THREE.Matrix4().fromArray(input.matrix));halo.scale.setScalar(1+t*.55);halo.material.opacity=.22*(1-t/2.8);}});
        controllerGuide.update(dt,lesson().automatic || handsEnabled()?[]:phase()==='fly' && heldRemote?[heldRemote]:controllers,lesson().id,viewer,successAt!==null,1-gloveOpacity());paint();
    }
    return {scene,root,bodies,objects,dragon,trials,loading,start,setInputMode(mode){inputOverride=['controllers','gloves','hands'].includes(mode)?mode:null;},update,hit,select,button,snapshot,releaseAll,isHolding:source=>trials.isHolding(source) || activeGrabs.has(source) || dragonOwner===source,abort,setTableHeightOffset,zinniaMount,takeZinniaCharacter(){zinniaReveal?.removeGlow();zinniaCharacter.removeFromParent();return zinniaCharacter;},get exitOpacity(){return exitOpacity;},get exiting(){return exiting;},get active(){return active;},get phase(){return lesson().id;},get tableHeight(){return tableHeight;},get controllerHandsVisible(){return active && (trials.active?trials.mode==='gloves':gloveOpacity()>0);},get controllerHandOpacity(){return trials.active?trials.mode==='gloves'?1:0:gloveOpacity();},get handsEnabled(){return handsEnabled();},get trackedHandOpacity(){return !handsEnabled()?0:trials.active?1:phase()==='hands'?THREE.MathUtils.smoothstep(handStable,.4,2.4):1;},get hands(){return handsPresent;},previewLesson(id){trials.close();const next=WELCOME_PRACTICE_LESSONS.findIndex(l=>l.id===id);if(next>=0){reveals.table=next>=WELCOME_PRACTICE_LESSONS.findIndex(l=>l.id==='table-reveal')?elapsed-4:null;reveals.zinnia=next>=WELCOME_PRACTICE_LESSONS.findIndex(l=>l.id==='zinnia-reveal')?elapsed-4:null;reveals.basket=next>=WELCOME_PRACTICE_LESSONS.findIndex(l=>l.id==='basket-reveal')?elapsed-4:null;setLesson(next);garden.previewPhase(id);}},rebase(matrix){releaseAll(false);root.applyMatrix4(new THREE.Matrix4().fromArray(matrix));root.updateMatrixWorld(true);},resetObjects(){releaseAll(false);fruitMessage='';fruitCue=null;lastPickedFruit=null;for(const variants of fruitVariants.values()){variants.opened=false;variants.whole.visible=true;if(variants.half)variants.half.visible=false;}for(const part of fruitParts.values())part.visible=false;if(trials.active){trials.command('reset');return;}props.reset();bodies.forEach(resetPracticeBody);if(['grab','fruit','explore'].includes(phase()))props.stockBasket();if(phase()==='seed')garden.reset();},destroy({stopVoice=true}={}){disposed=true;active=false;if(stopVoice)voice?.stop();releaseAll(false);trials.destroy();controllerGuide.destroy();garden.destroy();if(zinniaCharacter.parent)disposeZinniaCharacter(zinniaCharacter);disposeTree(scene);}};
}
