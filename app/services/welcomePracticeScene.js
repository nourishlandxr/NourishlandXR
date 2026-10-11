import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {GLTFLoader} from '../assets/fruit-window/vendor/GLTFLoader.js';
import {WELCOME_PRACTICE_LESSONS,WELCOME_PRACTICE_RESPONSES} from './welcomePracticeContent.js';
import {PRACTICE_TABLE_RADIUS,onPracticeTable,createPracticeBody,resetPracticeBody,stepPracticeBodies} from './welcomePracticePhysics.js';
import {createWelcomeControllerGuide} from './welcomeControllerGuide.js';
import {createWelcomePlantPractice} from './welcomePlantPractice.js';
import {createWelcomePracticeProps} from './welcomePracticeProps.js';
import {prepareWelcomeDragonfly} from './welcomeDragonflyModel.js';
import {WELCOME_FRUIT_ASSETS,WELCOME_INITIAL_FRUITS} from './welcomePracticeFruitAssets.js';

import {createWelcomePracticeTable} from './welcomePracticeTable.js';
import {createWelcomeFlightLesson} from './welcomeFlightLesson.js';
import {createWelcomeBayberryCluster} from './welcomeBayberryCluster.js';

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
export function createWelcomePracticeScene({voice,onComplete=()=>{},onChange=()=>{},onFeedback=()=>{},onAssets=()=>{},embedded=false,onSelect=()=>false}={}){
    const scene=new THREE.Scene(),root=new THREE.Group();scene.add(root);
    const controllerGuide=createWelcomeControllerGuide(scene,{onAssets});
    const tableParts=createWelcomePracticeTable(root),table=tableParts.group,stand=tableParts.stand,foot=tableParts.foot;
    const homes=[[0,.22],[-.22,.24],[.26,.25],[-.50,.27],[-.26,-.02],[.16,.05],[.47,.28]];
    const bodies=WELCOME_INITIAL_FRUITS.map((id,i)=>createPracticeBody(id,{x:homes[i][0],z:homes[i][1],radius:WELCOME_FRUIT_ASSETS[id].extent*.4}));
    const practiceFruits=bodies.slice();
    const objects=new Map();
    for(const body of bodies){const group=new THREE.Group();root.add(group);objects.set(body.id,group);
        const placeholder=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),glass(WELCOME_FRUIT_ASSETS[body.id].colour));
        const half=body.halfSize;placeholder.scale.set(half.x,half.y,half.z);group.add(placeholder);
    }
    const props=createWelcomePracticeProps(root,bodies.slice(),{onCollect:body=>onFeedback('collect',body.interactionSource || lastActionSource)});bodies.push(props.body);objects.set(props.body.id,props.remote);
    const garden=createWelcomePlantPractice(root,{onAssets});props.addHarvest(garden.harvestBodies);bodies.push(...garden.bodies);for(const [id,object] of garden.objects)objects.set(id,object);
    const dragon=createDragonfly();root.add(dragon.group);
    const flight=createWelcomeFlightLesson(root,dragon,tableParts.landing,{onFeedback});
    new GLTFLoader().loadAsync(new URL('../assets/welcome-practice/dragonfly.glb',import.meta.url).href).then(gltf=>{if(disposed){disposeTree(gltf.scene);return;}const prepared=prepareWelcomeDragonfly(gltf.scene);disposeTree(dragon.group);dragon.group.clear();dragon.group.add(prepared.model);dragon.wings=prepared.wings;onAssets();}).catch(error=>console.warn('Practice dragonfly:',error.message));
    const plate=textPlate(1400,350,.98,.245);plate.mesh.position.set(0,.48,-.41);root.add(plate.mesh);
    const buttons=new Map();
    for(const [id,x] of [['replay',-.24],['mute',0],['next',.24]]){const p=textPlate(360,100,.222,.062);p.mesh.position.set(x,.288,-.41);root.add(p.mesh);buttons.set(id,{...p,x,y:.288,width:.222,height:.062,enabled:true});}
    let active=false,disposed=false,anchored=false,index=0,elapsed=0,stepStarted=0,tableHeight=1.02,lastSignature='',lastImpact=-Infinity;
    let pointed=false,orangeGrabbed=false,orangeReleased=false,fruitGrabbed=false,fruitReleased=false,dragonDistance=0,dragonReleased=false,handsPresent=false,handStable=0,successAt=null;
    let remoteSource=null,remoteArmed=false;
    let dragonOwner=null,dragonOffset=null,dragonVelocity=new THREE.Vector3(),dragonManual=false,dragonPhase=Math.random()*Math.PI*2,dragonHeading=0,successCuePlayed=false,gloveTried=false,gloveRevealPlayed=false,lastActionSource=null,wasPouring=false;
    const activeGrabs=new Map(),inputEdges=new Map(),point=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3(),worldInverse=new THREE.Matrix4(),pendingEvents=new Set();
    const fruitHighlight=new THREE.Mesh(new THREE.TorusGeometry(.07,.0035,6,40),new THREE.MeshBasicMaterial({color:'#ffe0a0',transparent:true,opacity:.8,depthWrite:false}));fruitHighlight.rotation.x=Math.PI/2;root.add(fruitHighlight);
    const revealHalos=[-1,1].map(()=>{const halo=new THREE.Mesh(new THREE.SphereGeometry(.07,16,10),new THREE.MeshBasicMaterial({color:'#ffe7b2',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));scene.add(halo);return halo;});
    const handsEnabled=()=>['hands','packet','seed','water','grow','harvest','explore'].includes(phase());
    const lesson=()=>WELCOME_PRACTICE_LESSONS[index];
    const phase=()=>lesson().id;
    const gloveOpacity=()=>phase()==='gloves'?THREE.MathUtils.smoothstep(elapsed-stepStarted,.3,1.5):['fruit'].includes(phase())?1:0;
    const cue=id=>WELCOME_PRACTICE_RESPONSES.find(value=>value.id===id);
    const spokenLesson=()=>lesson();
    const currentCaption=()=>phase()==='harvest'?lesson().caption+' '+props.snapshot().harvestCount+' of 3.':phase()==='fruit'?(props.nextFruit?'Next: '+WELCOME_FRUIT_ASSETS[props.nextFruit].label+'. Pick it up and release it into the basket. ':'All fruit gathered. ')+props.snapshot().collected.length+' of '+practiceFruits.length+'.':phase()==='fly'?(remoteSource?flight.cue+' Trigger: forward. Grip: back. Stick: turn and height.':lesson().caption):phase()==='hands' && handsPresent?'Your movements become visible hands. Gently touch thumb and index finger together.':lesson().caption;
    function snapshot(){return {active,phase:phase(),index,caption:currentCaption(),title:lesson().title,handsPresent,held:[...activeGrabs.values()].map(g=>g.body.id),voice:voice?.status(),assets:fruitAssets,flight:flight.snapshot(),nextFruit:props.nextFruit,garden:garden.snapshot(),basket:props.snapshot(),completed:successAt!==null,controllerGuide:controllerGuide.snapshot()};}
    function nextAllowed(){return !(voice?.status().playing || voice?.status().paused) && ['hands','explore'].includes(phase());}
    function paint(){
        const v=voice?.status() || {playing:false,muted:true};
        const label=phase()==='hands'?'Use controllers':'Continue';
        const caption=currentCaption();
        const signature=[index,caption,v.playing,v.paused,v.muted,nextAllowed(),handsPresent].join('|');if(signature===lastSignature)return;lastSignature=signature;
        plate.paint(ctx=>{ctx.fillStyle='rgba(242,240,228,.92)';ctx.beginPath();ctx.roundRect(2,2,1396,346,65);ctx.fill();ctx.strokeStyle='rgba(147,168,146,.7)';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#637763';ctx.font='500 27px system-ui';ctx.textAlign='center';ctx.fillText('NOURISHLAND XR  ·  WELCOME 0.1',700,63);ctx.fillStyle='#304334';ctx.font='500 59px system-ui';ctx.fillText(lesson().title,700,147,1310);ctx.font='34px system-ui';ctx.fillStyle='#485c49';
            const words=caption.split(' '),lines=[''];for(const word of words){const i=lines.length-1;if(ctx.measureText(lines[i]+word).width>1280)lines.push(word+' ');else lines[i]+=word+' ';}lines.slice(0,2).forEach((line,i)=>ctx.fillText(line.trim(),700,223+i*47));});
        for(const [id,p] of buttons){p.enabled=id==='next'?nextAllowed():Boolean(voice);p.mesh.visible=p.enabled && !embedded;
            p.paint(ctx=>{ctx.fillStyle=id==='next'?'#677f65':'rgba(236,239,225,.92)';ctx.beginPath();ctx.roundRect(2,2,356,96,43);ctx.fill();ctx.fillStyle=id==='next'?'#fff9e9':'#405740';ctx.font='500 28px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(id==='replay'?'Hear again':id==='mute'?(v.muted?'Voice off':'Voice on'):label,180,50,338);});
        }
        plate.mesh.visible=!embedded;onChange(snapshot());
    }
    function setLesson(value){releaseAll(false);index=value;stepStarted=elapsed;pointed=false;orangeGrabbed=false;orangeReleased=false;fruitGrabbed=false;fruitReleased=false;dragonDistance=0;dragonReleased=false;handStable=0;lastActionSource=null;wasPouring=false;if(phase()==='packet'){garden.reset();garden.bodies.forEach(resetPracticeBody);}successCuePlayed=false;gloveTried=false;successAt=null;lastSignature='';if(phase()==='fly')flight.reset();if(phase()==='gloves')gloveRevealPlayed=false;void voice?.speak(spokenLesson());paint();}
    function start(viewer,floor){if(disposed)return;active=true;props.reset();elapsed=0;stepStarted=0;if(viewer)anchor(viewer,floor);setLesson(0);}
    function anchor(viewer,floor=viewer[13]-1.65){if(anchored || !viewer)return;const forward=new THREE.Vector3(-viewer[8],0,-viewer[10]).normalize();if(forward.lengthSq()<.1)forward.set(0,0,-1);tableHeight=Math.max(.65,Math.min(1.2,viewer[13]-.48-floor));root.position.set(viewer[12]+forward.x*.75,floor+tableHeight,viewer[14]+forward.z*.75);root.quaternion.setFromAxisAngle(up,Math.atan2(-forward.x,-forward.z));stand.scale.y=tableHeight-.04;stand.position.y=-tableHeight/2-.012;foot.position.y=-tableHeight+.012;root.updateMatrixWorld(true);anchored=true;}
    function localPose(matrix){return new THREE.Matrix4().multiplyMatrices(worldInverse,new THREE.Matrix4().fromArray(matrix));}
    function localRay(ray){if(!ray?.origin || !ray.direction)return null;root.updateMatrixWorld(true);worldInverse.copy(root.matrixWorld).invert();return new THREE.Ray(new THREE.Vector3(ray.origin.x,ray.origin.y,ray.origin.z),new THREE.Vector3(ray.direction.x,ray.direction.y,ray.direction.z).normalize()).applyMatrix4(worldInverse);}
    function hit(ray){if(!active || !anchored)return null;const r=localRay(ray);if(!r)return null;let best=null;
        const pick=(distance,value)=>{if(distance>0 && (!best || distance<best.distance))best={...value,distance};};
        if(index>0)for(const body of bodies){if(!body.visible || phase()==='point' && elapsed-stepStarted<1.65)continue;const p=r.intersectSphere(new THREE.Sphere(new THREE.Vector3(body.position.x,body.position.y,body.position.z),body.radius+.014),new THREE.Vector3());if(p)pick(p.distanceTo(r.origin),{kind:'body',body,point:p});}
        if(['fly','explore'].includes(phase())){const p=r.intersectSphere(new THREE.Sphere(dragon.group.position,.095),new THREE.Vector3());if(p)pick(p.distanceTo(r.origin),{kind:'dragon',point:p});}
        const p=r.intersectPlane(new THREE.Plane(new THREE.Vector3(0,0,1),.41),new THREE.Vector3());
        if(p && !embedded)for(const [id,b] of buttons)if(b.enabled && Math.abs(p.x-b.x)<b.width/2 && Math.abs(p.y-b.y)<b.height/2)pick(p.distanceTo(r.origin),{kind:'button',id,point:p.clone()});
        const tablePoint=r.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),new THREE.Vector3());
        if(tablePoint && onPracticeTable(tablePoint.x,tablePoint.z))pick(tablePoint.distanceTo(r.origin),{kind:'table',point:tablePoint});
        if(best){best.worldPoint=best.point.clone().applyMatrix4(root.matrixWorld);return best;}return null;
    }
    function finish(){if(!active)return;active=false;voice?.stop();releaseAll(false);dragonOwner=null;root.visible=false;onChange(snapshot());onComplete();}
    function button(id,source){voice?.unlock();onFeedback('control',source);if(id==='pause'){releaseAll(false);voice?.status().paused?voice?.resume():voice?.pause();}else if(id==='replay')void voice?.speak(spokenLesson());else if(id==='mute')voice?.toggleMute();else if(id==='next' && nextAllowed()){if(phase()==='hands')setLesson(index+1);else finish();}paint();}
    function select(ray,source){if(!active || source?.hand && !handsEnabled())return false;voice?.unlock();if(onSelect(ray,source))return true;const target=hit(ray);if(!target)return false;if(target.kind==='button'){button(target.id,source);return true;}
        if(target.kind==='body' && phase()==='point' && target.body.id==='orange'){const direction=localRay(ray).direction;target.body.velocity={x:direction.x*.06,y:.14,z:direction.z*.06};pointed=true;lastActionSource=source;onFeedback('point',source);return true;}return false;
    }
    function grab(source,pose){if(source?.hand && !handsEnabled())return;if(voice?.status().paused || ['arrival','point'].includes(phase()) || activeGrabs.has(source))return;pose.decompose(point,rotation,scale);
        const occupied=new Set([...activeGrabs.values()].map(g=>g.body));
        const allowed=b=>phase()==='explore' || phase()==='fruit' && b.id===props.nextFruit || phase()==='hands' && source.hand && b.id==='orange' || phase()==='packet' && b.id==='seed-packet' || phase()==='seed' && b.id==='seed' || phase()==='harvest' && b.id.startsWith('strawberry-') || ['water','grow'].includes(phase()) && b.id==='watering-can' || ['grab','gloves'].includes(phase()) && b.id==='orange' || phase()==='fly' && b.id==='remote' && !source.hand;
        const candidate=bodies.filter(b=>b.visible && !occupied.has(b) && allowed(b)).map(b=>({body:b,d:point.distanceTo(new THREE.Vector3(b.position.x,b.position.y,b.position.z))})).filter(c=>c.d<c.body.radius+(source.hand?.07:.095)).sort((a,b)=>a.d-b.d)[0];
        if(candidate){const b=candidate.body;if(b.id==='remote' && phase()==='fly'){remoteSource=source;remoteArmed=false;}props.remove(b);b.interactionSource=source;const harvested=garden.picked(b);const bodyMatrix=new THREE.Matrix4().compose(new THREE.Vector3(b.position.x,b.position.y,b.position.z),new THREE.Quaternion(b.rotation.x,b.rotation.y,b.rotation.z,b.rotation.w),one);activeGrabs.set(source,{body:b,offset:pose.clone().invert().multiply(bodyMatrix),samples:[],start:new THREE.Vector3(b.position.x,b.position.y,b.position.z),moved:0});b.held=true;Object.assign(b.velocity,{x:0,y:0,z:0});Object.assign(b.angular,{x:0,y:0,z:0});if(phase()==='grab' && b.id==='orange')orangeGrabbed=true;if(['fruit','hands'].includes(phase()))fruitGrabbed=true;onFeedback(harvested?'harvest':'grab',source);return;}
        if(phase()==='explore' && !dragonOwner && point.distanceTo(dragon.group.position)<.13 && source.hand){dragonOwner=source;dragonOffset=dragon.group.position.clone().sub(point);}
    }
    function release(source,throwing=true){const g=activeGrabs.get(source);if(throwing && source===remoteSource && phase()==='fly' && g?.body.id==='remote')return;if(g){const b=g.body,last=g.samples.at(-1),first=g.samples.find(s=>last.time-s.time<=.12);if(throwing && last && first && last.time-first.time>.008){const v=last.p.clone().sub(first.p).divideScalar(last.time-first.time).clampLength(0,3.2);Object.assign(b.velocity,serial(v));const q=last.q.clone().multiply(first.q.clone().invert());if(q.w<0)q.set(-q.x,-q.y,-q.z,-q.w);const angle=2*Math.acos(Math.max(-1,Math.min(1,q.w))),a=new THREE.Vector3(q.x,q.y,q.z).normalize().multiplyScalar(Math.min(8,angle/(last.time-first.time)));Object.assign(b.angular,serial(a));}
            b.held=false;activeGrabs.delete(source);let rewarded=false;if(throwing){lastActionSource=source;if(g.moved>.06){if(phase()==='grab' && b.id==='orange' && orangeGrabbed)orangeReleased=true;else if(phase()==='hands' && source.hand && fruitGrabbed)fruitReleased=true;}if(['fruit','harvest','explore'].includes(phase()))rewarded=props.place(b);if(['seed','explore'].includes(phase()) && garden.plant(b)){rewarded=true;Object.assign(b.velocity,{x:0,y:0,z:0});onFeedback('plant',source);}}if(throwing && !rewarded)onFeedback('release',source);}
        if(dragonOwner===source){dragonOwner=null;dragonManual=false;if(throwing && dragonDistance>.08)dragonReleased=true;}
    }
    function releaseAll(throwing=false){remoteSource=null;remoteArmed=false;for(const source of [...activeGrabs.keys()])release(source,throwing);dragonOwner=null;dragonManual=false;dragonVelocity.set(0,0,0);}
    const fruitAssets=Object.fromEntries(WELCOME_INITIAL_FRUITS.map(id=>[id,'loading']));
    const loader=new GLTFLoader();
    const loading=Promise.all(practiceFruits.map(async body=>{
        try{const gltf=await loader.loadAsync(new URL(WELCOME_FRUIT_ASSETS[body.id].url,import.meta.url).href);if(disposed){disposeTree(gltf.scene);return;}
            const model=body.id==='bayberry-cluster'?createWelcomeBayberryCluster(gltf.scene):gltf.scene;model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),extent=WELCOME_FRUIT_ASSETS[body.id].extent,factor=extent/Math.max(size.x,size.y,size.z);
            const normalized=new THREE.Group();normalized.scale.setScalar(factor);normalized.position.copy(center).multiplyScalar(-factor);normalized.add(model);
            const holder=objects.get(body.id);disposeTree(holder);holder.clear();holder.add(normalized);
            body.halfSize={x:Math.max(.01,size.x*factor/2),y:Math.max(.012,size.y*factor/2),z:Math.max(.01,size.z*factor/2)};body.radius=Math.max(body.halfSize.x,body.halfSize.y,body.halfSize.z);resetPracticeBody(body);fruitAssets[body.id]='ready';
        }catch(error){fruitAssets[body.id]='fallback';console.warn('Practice fruit:',body.id,error.message);}
    })).then(()=>{if(!disposed)onAssets();});
    function update(dt,{viewer,floor,hands=[],controllers=[],inputs=[]}={}){
        if(!active || disposed)return;dt=voice?.status().paused?0:Math.min(.06,Math.max(0,dt));elapsed+=dt;anchor(viewer,floor);if(!anchored)return;root.visible=true;root.updateMatrixWorld(true);worldInverse.copy(root.matrixWorld).invert();
        const handsAllowed=handsEnabled();hands=handsAllowed?hands:[];inputs=inputs.filter(input=>!input.source.hand || handsAllowed);handsPresent=hands.some(e=>e.state?.tracked);handStable=handsPresent?handStable+dt:0;
        const age=elapsed-stepStarted,appear=phase()==='arrival'?0:phase()==='point'?Math.min(1,age/1.25):1,soft=appear*appear*(3-2*appear);table.visible=phase()!=='arrival';table.scale.setScalar(.03+.97*soft);const orangeAppear=phase()==='point'?Math.min(1,Math.max(0,(age-.85)/.8)):1;objects.get('orange').scale.setScalar(Math.max(.001,orangeAppear*orangeAppear*(3-2*orangeAppear)));
        for(const source of [...inputEdges.keys()])if(!inputs.some(i=>i.source===source)){release(source,false);inputEdges.delete(source);}
        const consumed=new Set();
        for(const input of inputs){const {source,matrix,ray,down,trigger}=input,previous=inputEdges.get(source);
            if(!matrix){release(source,false);inputEdges.delete(source);continue;}const pose=localPose(matrix);
            const stickActive=Boolean(trigger && source.gamepad?.axes?.some((value,i)=>i>=(source.gamepad.axes.length>=4?2:0) && Math.abs(value)>.18));
            if(previous && (down && !previous.down && ['grab','fruit','packet','seed','water','harvest'].includes(phase()) || phase()==='fly' && (trigger && !previous.trigger || stickActive && !previous.stickActive))){lastActionSource=source;onFeedback('control',source);}
            if(source===remoteSource && !down)remoteArmed=true;if(down && !activeGrabs.has(source))grab(source,pose);else if(!down)release(source,true);
            if(trigger && previous?.trigger===false && source.hand && !activeGrabs.has(source) && dragonOwner!==source){if(select(ray,source))consumed.add(source);}
            const g=activeGrabs.get(source);if(phase()==='packet' && !garden.opened){const holder=[...activeGrabs].find(([,hold])=>hold.body.id==='seed-packet');let opening=g?.body.id==='seed-packet' && trigger && previous?.down && !previous.trigger;if(source.hand && down && holder && holder[0]!==source){pose.decompose(point,rotation,scale);opening ||= point.distanceTo(garden.sealPoint())<.065;}if(opening && garden.openPacket()){lastActionSource=source;onFeedback('open',source);}}if(g){const m=pose.clone().multiply(g.offset),p=new THREE.Vector3(),q=new THREE.Quaternion();m.decompose(p,q,scale);if(g.body.position.y>=g.body.support-.015 && onPracticeTable(p.x,p.z))p.y=Math.max(g.body.support,p.y);g.moved=Math.max(g.moved,p.distanceTo(g.start));Object.assign(g.body.position,serial(p));Object.assign(g.body.rotation,{x:q.x,y:q.y,z:q.z,w:q.w});g.samples.push({time:elapsed,p:p.clone(),q:q.clone()});g.samples=g.samples.filter(s=>elapsed-s.time<.18);}
            if(source.hand && phase()==='explore' && dragonOwner===source){pose.decompose(point,rotation,scale);const desired=point.clone().add(dragonOffset),before=dragon.group.position.clone();dragon.group.position.lerp(desired,1-Math.exp(-dt*16));dragonDistance+=before.distanceTo(dragon.group.position);dragonManual=true;}
            // Near finger contact makes audio controls available without rays.
            if(input.tip && !embedded){const tip=new THREE.Vector3(input.tip.x,input.tip.y,input.tip.z).applyMatrix4(worldInverse),poke=Math.abs(tip.z+.41)<.027;const b=[...buttons].find(([,v])=>v.enabled && Math.abs(tip.x-v.x)<v.width/2 && Math.abs(tip.y-v.y)<v.height/2);const id=poke && b?b[0]:null;if(id && previous?.poke!==id && !down && !g)button(id);input.poke=id;}
            inputEdges.set(source,{down:Boolean(down),trigger:Boolean(trigger),stickActive,poke:input.poke});
        }
        garden.update(dt,lesson().id);if(garden.pouring && !wasPouring)onFeedback('water',lastActionSource);wasPouring=garden.pouring;
        for(const b of practiceFruits)b.visible=b.id==='orange'?(['point','grab','gloves','fruit','fly'].includes(phase()) || phase()==='explore' && !garden.grown) && (phase()!=='point' || age>.85):['fruit','fly'].includes(phase()) || phase()==='explore' && !garden.grown;
        const heldRemote=controllers.find(i=>activeGrabs.get(i.source)?.body.id==='remote'),pilot=heldRemote?{...heldRemote,reverse:remoteArmed && heldRemote.down}:null;props.update(phase(),pilot,dt);
        stepPracticeBodies(bodies,dt,{floor:-tableHeight,onImpact:(body,speed)=>{if(elapsed-lastImpact>.18){lastImpact=elapsed;onFeedback('impact',null,Math.min(1,speed/3));}}});
        for(const b of bodies){const mesh=objects.get(b.id);mesh.visible=b.visible;mesh.position.set(b.position.x,b.position.y,b.position.z);mesh.quaternion.set(b.rotation.x,b.rotation.y,b.rotation.z,b.rotation.w);}
        flight.update(dt,phase(),pilot);
        fruitHighlight.visible=phase()==='fruit' && Boolean(props.nextFruit);if(fruitHighlight.visible){const b=practiceFruits.find(b=>b.id===props.nextFruit);fruitHighlight.position.set(b.position.x,.006,b.position.z);fruitHighlight.scale.setScalar(1+.045*Math.sin(elapsed*2));}
        if(phase()==='arrival' && elapsed-stepStarted>3 && fruitAssets.orange!=='loading' && !voice?.status().playing && !voice?.status().paused)setLesson(1);
        if(phase()==='gloves' && age>.25 && !gloveRevealPlayed && controllers.length){gloveRevealPlayed=true;for(const input of controllers)onFeedback('transform',input.source);}
        if(phase()==='gloves' && age>3 && controllers.some(i=>i.down))gloveTried=true;
        const success=phase()==='point'?pointed:phase()==='grab'?orangeReleased:phase()==='gloves'?gloveTried:phase()==='fruit'?props.full:phase()==='fly'?flight.complete:phase()==='hands'?handStable>1.2 && inputs.some(input=>input.source.hand && input.trigger):phase()==='packet'?garden.opened:phase()==='seed'?garden.planted:phase()==='water'?garden.watered:phase()==='grow'?garden.grown:phase()==='harvest'?props.harvestComplete:false;
        if(success){if(successAt===null){successAt=elapsed;onFeedback('lesson',lastActionSource);}
            if(!successCuePlayed && elapsed-successAt>.45 && !voice?.status().playing && !voice?.status().paused){successCuePlayed=true;successAt=elapsed;const id=phase()==='hands'?'hands-ready':lesson().id+'-done';void voice?.speak(cue(id));}
            if(successCuePlayed && elapsed-successAt>1.2 && !voice?.status().playing && !voice?.status().paused)setLesson(index+1);
        }
        revealHalos.forEach((halo,i)=>{const input=controllers[i],t=age-.3;halo.visible=phase()==='gloves' && Boolean(input) && t>=0 && t<1.2;if(halo.visible){halo.position.setFromMatrixPosition(new THREE.Matrix4().fromArray(input.matrix));halo.scale.setScalar(1+t*2);halo.material.opacity=.25*(1-t/1.2);}});
        controllerGuide.update(dt,phase()==='fly' && heldRemote?[heldRemote]:controllers,lesson().id,viewer,successAt!==null,1-gloveOpacity());paint();scene.updateMatrixWorld(true);
    }
    return {scene,root,bodies,objects,dragon,loading,start,update,hit,select,button,snapshot,releaseAll,abort:finish,get active(){return active;},get phase(){return lesson().id;},get tableHeight(){return tableHeight;},get controllerHandsVisible(){return active && gloveOpacity()>0;},get controllerHandOpacity(){return gloveOpacity();},get handsEnabled(){return handsEnabled();},get trackedHandOpacity(){return !handsEnabled()?0:phase()==='hands'?Math.min(1,handStable/1.2):1;},get hands(){return handsPresent;},previewLesson(id){const next=WELCOME_PRACTICE_LESSONS.findIndex(l=>l.id===id);if(next>=0){setLesson(next);garden.previewPhase(id);}},rebase(matrix){releaseAll(false);root.applyMatrix4(new THREE.Matrix4().fromArray(matrix));root.updateMatrixWorld(true);},resetObjects(){releaseAll(false);props.reset();bodies.forEach(resetPracticeBody);if(phase()==='seed')garden.reset();},destroy(){disposed=true;active=false;voice?.stop();releaseAll(false);controllerGuide.destroy();garden.destroy();disposeTree(scene);}};
}
