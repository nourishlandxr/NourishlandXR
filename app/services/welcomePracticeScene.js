import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {GLTFLoader} from '../assets/fruit-window/vendor/GLTFLoader.js';
import {WELCOME_PRACTICE_LESSONS,WELCOME_PRACTICE_RESPONSES} from './welcomePracticeContent.js';
import {PRACTICE_TABLE_RADIUS,createPracticeBody,resetPracticeBody,stepPracticeBodies} from './welcomePracticePhysics.js';
import {createWelcomeControllerGuide} from './welcomeControllerGuide.js';
import {createWelcomePlantPractice} from './welcomePlantPractice.js';
import {createWelcomePracticeProps} from './welcomePracticeProps.js';
import {prepareWelcomeDragonfly} from './welcomeDragonflyModel.js';
import {WELCOME_FRUIT_ASSETS,WELCOME_INITIAL_FRUITS} from './welcomePracticeFruitAssets.js';

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
    const table=new THREE.Group();root.add(table);
    const top=new THREE.Mesh(new THREE.CylinderGeometry(PRACTICE_TABLE_RADIUS,PRACTICE_TABLE_RADIUS-.008,.024,64),tableSurface('#e4ddc7',1));top.position.y=-.012;table.add(top);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(PRACTICE_TABLE_RADIUS-.009,.004,6,64),glass('#c9bfa2',.98));rim.rotation.x=Math.PI/2;rim.position.y=.003;table.add(rim);
    const stand=new THREE.Mesh(new THREE.CylinderGeometry(.026,.052,1,24),tableSurface('#cecbb5',.96));table.add(stand);
    const foot=new THREE.Mesh(new THREE.CylinderGeometry(.19,.21,.024,40),tableSurface('#dcd6be',.98));table.add(foot);
    const landing=new THREE.Mesh(new THREE.TorusGeometry(.12,.0025,6,48),glass('#b8c8af',.7));landing.rotation.x=Math.PI/2;landing.position.set(.18,.006,.25);table.add(landing);
    const bodies=[createPracticeBody('orange',{x:0,z:.18,radius:.052}),createPracticeBody('lime',{x:-.22,z:.16,radius:.043}),createPracticeBody('banana',{x:.26,z:.22,radius:.07,halfSize:{x:.09,y:.026,z:.032}})];
    const objects=new Map();
    for(const body of bodies){const group=new THREE.Group();root.add(group);objects.set(body.id,group);
        const placeholder=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),glass(body.id==='orange'?'#deb067':body.id==='lime'?'#b3bf73':'#e6d298'));
        const half=body.halfSize;placeholder.scale.set(half.x,half.y,half.z);group.add(placeholder);
    }
    const props=createWelcomePracticeProps(root,bodies.slice(),{onCollect:body=>onFeedback('collect',body.interactionSource || lastActionSource)});bodies.push(props.body);objects.set(props.body.id,props.remote);
    const garden=createWelcomePlantPractice(root,{onAssets});props.addHarvest(garden.harvestBodies);bodies.push(...garden.bodies);for(const [id,object] of garden.objects)objects.set(id,object);
    const dragon=createDragonfly();root.add(dragon.group);
    new GLTFLoader().loadAsync(new URL('../assets/welcome-practice/dragonfly.glb',import.meta.url).href).then(gltf=>{if(disposed){disposeTree(gltf.scene);return;}const prepared=prepareWelcomeDragonfly(gltf.scene);disposeTree(dragon.group);dragon.group.clear();dragon.group.add(prepared.model);dragon.wings=prepared.wings;onAssets();}).catch(error=>console.warn('Practice dragonfly:',error.message));
    const plate=textPlate(1400,350,.98,.245);plate.mesh.position.set(0,.48,-.41);root.add(plate.mesh);
    const buttons=new Map();
    for(const [id,x] of [['replay',-.24],['mute',0],['next',.24]]){const p=textPlate(360,100,.222,.062);p.mesh.position.set(x,.288,-.41);root.add(p.mesh);buttons.set(id,{...p,x,y:.288,width:.222,height:.062,enabled:true});}
    let active=false,disposed=false,anchored=false,index=0,elapsed=0,stepStarted=0,tableHeight=1.02,lastSignature='',lastImpact=-Infinity;
    let pointed=false,orangeGrabbed=false,orangeReleased=false,fruitGrabbed=false,fruitReleased=false,dragonDistance=0,dragonReleased=false,handsPresent=false,handStable=0,successAt=null;
    let dragonOwner=null,dragonOffset=null,dragonVelocity=new THREE.Vector3(),dragonManual=false,dragonPhase=Math.random()*Math.PI*2,dragonHeading=0,successCuePlayed=false,gloveTried=false,lastActionSource=null,wasPouring=false;
    const activeGrabs=new Map(),inputEdges=new Map(),point=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3(),worldInverse=new THREE.Matrix4(),pendingEvents=new Set();
    const lesson=()=>WELCOME_PRACTICE_LESSONS[index];
    const phase=()=>lesson().id;
    const gloveOpacity=()=>phase()==='gloves'?Math.min(1,(elapsed-stepStarted)/2):['fruit','fly','explore'].includes(phase())?1:0;
    const cue=id=>WELCOME_PRACTICE_RESPONSES.find(value=>value.id===id);
    const spokenLesson=()=>lesson();
    const currentCaption=()=>phase()==='harvest'?lesson().caption+' '+props.snapshot().harvestCount+' of 3.':phase()==='fruit'?lesson().caption+' '+props.snapshot().collected.length+' of 3.':phase()==='hands' && handsPresent?'There are your hands. Pinch the orange, lift it, then release.':lesson().caption;
    function snapshot(){return {active,phase:phase(),index,caption:currentCaption(),title:lesson().title,handsPresent,held:[...activeGrabs.values()].map(g=>g.body.id),voice:voice?.status(),assets:fruitAssets,garden:garden.snapshot(),basket:props.snapshot(),completed:successAt!==null,controllerGuide:controllerGuide.snapshot()};}
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
    function setLesson(value){releaseAll(false);index=value;stepStarted=elapsed;pointed=false;orangeGrabbed=false;orangeReleased=false;fruitGrabbed=false;fruitReleased=false;dragonDistance=0;dragonReleased=false;handStable=0;lastActionSource=null;wasPouring=false;if(phase()==='packet'){garden.reset();garden.bodies.forEach(resetPracticeBody);}successCuePlayed=false;gloveTried=false;successAt=null;lastSignature='';if(phase()==='fly'){dragonHeading=0;dragon.group.position.set(-.22,.25,-.1);dragonVelocity.set(0,0,0);}void voice?.speak(spokenLesson());paint();}
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
        if(tablePoint && Math.hypot(tablePoint.x,tablePoint.z)<PRACTICE_TABLE_RADIUS)pick(tablePoint.distanceTo(r.origin),{kind:'table',point:tablePoint});
        if(best){best.worldPoint=best.point.clone().applyMatrix4(root.matrixWorld);return best;}return null;
    }
    function finish(){if(!active)return;active=false;voice?.stop();releaseAll(false);dragonOwner=null;root.visible=false;onChange(snapshot());onComplete();}
    function button(id,source){voice?.unlock();onFeedback('control',source);if(id==='pause'){releaseAll(false);voice?.status().paused?voice?.resume():voice?.pause();}else if(id==='replay')void voice?.speak(spokenLesson());else if(id==='mute')voice?.toggleMute();else if(id==='next' && nextAllowed()){if(phase()==='hands')setLesson(index+1);else finish();}paint();}
    function select(ray,source){if(!active)return false;voice?.unlock();if(onSelect(ray,source))return true;const target=hit(ray);if(!target)return false;if(target.kind==='button'){button(target.id,source);return true;}
        if(target.kind==='body' && phase()==='point' && target.body.id==='orange'){const direction=localRay(ray).direction;target.body.velocity={x:direction.x*.06,y:.14,z:direction.z*.06};pointed=true;lastActionSource=source;onFeedback('point',source);return true;}return false;
    }
    function grab(source,pose){if(voice?.status().paused || ['arrival','point'].includes(phase()) || activeGrabs.has(source))return;pose.decompose(point,rotation,scale);
        const occupied=new Set([...activeGrabs.values()].map(g=>g.body));
        const allowed=b=>phase()==='explore' || phase()==='fruit' && ['orange','lime','banana'].includes(b.id) || phase()==='hands' && source.hand && b.id==='orange' || phase()==='packet' && b.id==='seed-packet' || phase()==='seed' && b.id==='seed' || phase()==='harvest' && b.id.startsWith('strawberry-') || ['water','grow'].includes(phase()) && b.id==='watering-can' || ['grab','gloves'].includes(phase()) && b.id==='orange' || phase()==='fly' && b.id==='remote' && !source.hand;
        const candidate=bodies.filter(b=>b.visible && !occupied.has(b) && allowed(b)).map(b=>({body:b,d:point.distanceTo(new THREE.Vector3(b.position.x,b.position.y,b.position.z))})).filter(c=>c.d<c.body.radius+(source.hand?.07:.095)).sort((a,b)=>a.d-b.d)[0];
        if(candidate){const b=candidate.body;props.remove(b);b.interactionSource=source;const harvested=garden.picked(b);const bodyMatrix=new THREE.Matrix4().compose(new THREE.Vector3(b.position.x,b.position.y,b.position.z),new THREE.Quaternion(b.rotation.x,b.rotation.y,b.rotation.z,b.rotation.w),one);activeGrabs.set(source,{body:b,offset:pose.clone().invert().multiply(bodyMatrix),samples:[],start:new THREE.Vector3(b.position.x,b.position.y,b.position.z),moved:0});b.held=true;Object.assign(b.velocity,{x:0,y:0,z:0});Object.assign(b.angular,{x:0,y:0,z:0});if(phase()==='grab' && b.id==='orange')orangeGrabbed=true;if(['fruit','hands'].includes(phase()))fruitGrabbed=true;onFeedback(harvested?'harvest':'grab',source);return;}
        if(phase()==='explore' && !dragonOwner && point.distanceTo(dragon.group.position)<.13 && source.hand){dragonOwner=source;dragonOffset=dragon.group.position.clone().sub(point);}
    }
    function release(source,throwing=true){const g=activeGrabs.get(source);if(g){const b=g.body,last=g.samples.at(-1),first=g.samples.find(s=>last.time-s.time<=.12);if(throwing && last && first && last.time-first.time>.008){const v=last.p.clone().sub(first.p).divideScalar(last.time-first.time).clampLength(0,3.2);Object.assign(b.velocity,serial(v));const q=last.q.clone().multiply(first.q.clone().invert());if(q.w<0)q.set(-q.x,-q.y,-q.z,-q.w);const angle=2*Math.acos(Math.max(-1,Math.min(1,q.w))),a=new THREE.Vector3(q.x,q.y,q.z).normalize().multiplyScalar(Math.min(8,angle/(last.time-first.time)));Object.assign(b.angular,serial(a));}
            b.held=false;activeGrabs.delete(source);let rewarded=false;if(throwing){lastActionSource=source;if(g.moved>.06){if(phase()==='grab' && b.id==='orange' && orangeGrabbed)orangeReleased=true;else if(phase()==='hands' && source.hand && fruitGrabbed)fruitReleased=true;}if(['fruit','harvest','explore'].includes(phase()))rewarded=props.place(b);if(['seed','explore'].includes(phase()) && garden.plant(b)){rewarded=true;Object.assign(b.velocity,{x:0,y:0,z:0});onFeedback('plant',source);}}if(throwing && !rewarded)onFeedback('release',source);}
        if(dragonOwner===source){dragonOwner=null;dragonManual=false;if(throwing && dragonDistance>.08)dragonReleased=true;}
    }
    function releaseAll(throwing=false){for(const source of [...activeGrabs.keys()])release(source,throwing);dragonOwner=null;dragonManual=false;dragonVelocity.set(0,0,0);}
    const fruitAssets=Object.fromEntries(WELCOME_INITIAL_FRUITS.map(id=>[id,'loading']));
    const loader=new GLTFLoader();
    const loading=Promise.all(bodies.slice(0,3).map(async body=>{
        try{const gltf=await loader.loadAsync(new URL(WELCOME_FRUIT_ASSETS[body.id].url,import.meta.url).href);if(disposed){disposeTree(gltf.scene);return;}
            const model=gltf.scene;model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),extent=WELCOME_FRUIT_ASSETS[body.id].extent,factor=extent/Math.max(size.x,size.y,size.z);
            const normalized=new THREE.Group();normalized.scale.setScalar(factor);normalized.position.copy(center).multiplyScalar(-factor);normalized.add(model);
            const holder=objects.get(body.id);disposeTree(holder);holder.clear();holder.add(normalized);
            body.halfSize={x:Math.max(.01,size.x*factor/2),y:Math.max(.012,size.y*factor/2),z:Math.max(.01,size.z*factor/2)};body.radius=Math.max(body.halfSize.x,body.halfSize.y,body.halfSize.z);resetPracticeBody(body);fruitAssets[body.id]='ready';
        }catch(error){fruitAssets[body.id]='fallback';console.warn('Practice fruit:',body.id,error.message);}
    })).then(()=>{if(!disposed)onAssets();});
    function update(dt,{viewer,floor,hands=[],controllers=[],inputs=[]}={}){
        if(!active || disposed)return;dt=voice?.status().paused?0:Math.min(.06,Math.max(0,dt));elapsed+=dt;anchor(viewer,floor);if(!anchored)return;root.visible=true;root.updateMatrixWorld(true);worldInverse.copy(root.matrixWorld).invert();
        handsPresent=hands.some(e=>e.state?.tracked);handStable=handsPresent?handStable+dt:0;
        const age=elapsed-stepStarted,appear=phase()==='arrival'?0:phase()==='point'?Math.min(1,age/1.25):1,soft=appear*appear*(3-2*appear);table.visible=phase()!=='arrival';table.scale.setScalar(.03+.97*soft);const orangeAppear=phase()==='point'?Math.min(1,Math.max(0,(age-.85)/.8)):1;objects.get('orange').scale.setScalar(Math.max(.001,orangeAppear*orangeAppear*(3-2*orangeAppear)));
        for(const source of [...inputEdges.keys()])if(!inputs.some(i=>i.source===source)){release(source,false);inputEdges.delete(source);}
        const consumed=new Set();
        for(const input of inputs){const {source,matrix,ray,down,trigger}=input,previous=inputEdges.get(source);
            if(!matrix){release(source,false);inputEdges.delete(source);continue;}const pose=localPose(matrix);
            const stickActive=Boolean(trigger && source.gamepad?.axes?.some((value,i)=>i>=(source.gamepad.axes.length>=4?2:0) && Math.abs(value)>.18));
            if(previous && (down && !previous.down && ['grab','fruit','packet','seed','water','harvest'].includes(phase()) || phase()==='fly' && (trigger && !previous.trigger || stickActive && !previous.stickActive))){lastActionSource=source;onFeedback('control',source);}
            if(down && !activeGrabs.has(source))grab(source,pose);else if(!down)release(source,true);
            if(trigger && previous?.trigger===false && source.hand && !activeGrabs.has(source) && dragonOwner!==source){if(select(ray,source))consumed.add(source);}
            const g=activeGrabs.get(source);if(phase()==='packet' && !garden.opened){const holder=[...activeGrabs].find(([,hold])=>hold.body.id==='seed-packet');let opening=g?.body.id==='seed-packet' && trigger && previous?.down && !previous.trigger;if(source.hand && down && holder && holder[0]!==source){pose.decompose(point,rotation,scale);opening ||= point.distanceTo(garden.sealPoint())<.065;}if(opening && garden.openPacket()){lastActionSource=source;onFeedback('open',source);}}if(g){const m=pose.clone().multiply(g.offset),p=new THREE.Vector3(),q=new THREE.Quaternion();m.decompose(p,q,scale);if(g.body.position.y>=g.body.support-.015 && Math.hypot(p.x,p.z)<PRACTICE_TABLE_RADIUS)p.y=Math.max(g.body.support,p.y);g.moved=Math.max(g.moved,p.distanceTo(g.start));Object.assign(g.body.position,serial(p));Object.assign(g.body.rotation,{x:q.x,y:q.y,z:q.z,w:q.w});g.samples.push({time:elapsed,p:p.clone(),q:q.clone()});g.samples=g.samples.filter(s=>elapsed-s.time<.18);}
            if(source.hand && phase()==='explore' && dragonOwner===source){pose.decompose(point,rotation,scale);const desired=point.clone().add(dragonOffset),before=dragon.group.position.clone();dragon.group.position.lerp(desired,1-Math.exp(-dt*16));dragonDistance+=before.distanceTo(dragon.group.position);dragonManual=true;}
            // Near finger contact makes audio controls available without rays.
            if(input.tip && !embedded){const tip=new THREE.Vector3(input.tip.x,input.tip.y,input.tip.z).applyMatrix4(worldInverse),poke=Math.abs(tip.z+.41)<.027;const b=[...buttons].find(([,v])=>v.enabled && Math.abs(tip.x-v.x)<v.width/2 && Math.abs(tip.y-v.y)<v.height/2);const id=poke && b?b[0]:null;if(id && previous?.poke!==id && !down && !g)button(id);input.poke=id;}
            inputEdges.set(source,{down:Boolean(down),trigger:Boolean(trigger),stickActive,poke:input.poke});
        }
        garden.update(dt,lesson().id);if(garden.pouring && !wasPouring)onFeedback('water',lastActionSource);wasPouring=garden.pouring;
        for(const b of bodies){if(b.id==='orange')b.visible=(['point','grab','gloves','fruit','fly','hands'].includes(phase()) || phase()==='explore' && !garden.grown) && (phase()!=='point' || age>.85);else if(['lime','banana'].includes(b.id))b.visible=['fruit','fly','hands'].includes(phase()) || phase()==='explore' && !garden.grown;}
        const pilot=controllers.find(i=>activeGrabs.get(i.source)?.body.id==='remote' && i.trigger && i.source.gamepad?.axes?.length>=2 && !consumed.has(i.source));const other=controllers.find(i=>pilot && i.source!==pilot.source);props.update(phase(),pilot,dt,other);
        stepPracticeBodies(bodies,dt,{floor:-tableHeight,onImpact:(body,speed)=>{if(elapsed-lastImpact>.18){lastImpact=elapsed;onFeedback('impact',null,Math.min(1,speed/3));}}});
        for(const b of bodies){const mesh=objects.get(b.id);mesh.visible=b.visible;mesh.position.set(b.position.x,b.position.y,b.position.z);mesh.quaternion.set(b.rotation.x,b.rotation.y,b.rotation.z,b.rotation.w);}
        dragon.group.visible=['fly','explore'].includes(phase());
        if(dragon.group.visible){
            if(pilot && !dragonOwner){dragonManual=true;const axes=pilot.source.gamepad.axes,offset=axes.length>=4?2:0,dead=value=>Math.abs(value)<.18?0:Math.sign(value)*(Math.abs(value)-.18)/.82;
                const orientation=new THREE.Quaternion().setFromRotationMatrix(localPose(pilot.matrix)),forward=new THREE.Vector3(0,0,-1).applyQuaternion(orientation),right=new THREE.Vector3(1,0,0).applyQuaternion(orientation),otherAxes=other?.source.gamepad?.axes || [],otherOffset=otherAxes.length>=4?2:0,vertical=-dead(otherAxes[otherOffset+1] || 0),yaw=dead(otherAxes[otherOffset] || 0)*dt*1.8;dragonHeading+=yaw;forward.applyAxisAngle(up,dragonHeading);right.applyAxisAngle(up,dragonHeading);
                const desired=forward.multiplyScalar(-dead(axes[offset+1])*.8).addScaledVector(right,dead(axes[offset])*.8);desired.y+=vertical*.7;desired.clampLength(0,1);dragonVelocity.lerp(desired,1-Math.exp(-dt*8));const delta=dragonVelocity.clone().multiplyScalar(dt);dragon.group.position.add(delta);dragonDistance+=delta.length();
            }else if(!dragonOwner){if(dragonManual && dragonDistance>.08)dragonReleased=true;dragonManual=false;const t=elapsed+dragonPhase,target=new THREE.Vector3(Math.sin(t*1.7)*.44,.34+Math.sin(t*1.27)*.10,-.05+Math.cos(t*1.43)*.35);const desired=target.sub(dragon.group.position).multiplyScalar(2.4).clampLength(0,.65);dragonVelocity.lerp(desired,1-Math.exp(-dt*2.2));dragon.group.position.addScaledVector(dragonVelocity,dt);}
            const pos=dragon.group.position;pos.x=THREE.MathUtils.clamp(pos.x,-1.25,1.25);pos.z=THREE.MathUtils.clamp(pos.z,-1.25,1.1);pos.y=THREE.MathUtils.clamp(pos.y,.12,1.15);
            if(dragonVelocity.lengthSq()>.0001)dragon.group.rotation.y=Math.atan2(-dragonVelocity.x,-dragonVelocity.z);dragon.wings.forEach(({pivot,side,front})=>{pivot.rotation.z=side*(.06+Math.sin(elapsed*2*Math.PI*42+front*.24)*.52);});
        }
        if(phase()==='arrival' && elapsed-stepStarted>3 && fruitAssets.orange!=='loading' && !voice?.status().playing && !voice?.status().paused)setLesson(1);
        if(phase()==='gloves' && age>3 && (controllers.some(i=>i.down) || handsPresent && inputs.some(i=>i.down)))gloveTried=true;
        const success=phase()==='point'?pointed:phase()==='grab'?orangeReleased:phase()==='gloves'?gloveTried:phase()==='fruit'?props.full:phase()==='fly'?dragonReleased:phase()==='hands'?handStable>.65 && fruitReleased:phase()==='packet'?garden.opened:phase()==='seed'?garden.planted:phase()==='water'?garden.watered:phase()==='grow'?garden.grown:phase()==='harvest'?props.harvestComplete:false;
        if(success){if(successAt===null){successAt=elapsed;onFeedback('lesson',lastActionSource);}
            if(!successCuePlayed && elapsed-successAt>.45 && !voice?.status().playing && !voice?.status().paused){successCuePlayed=true;successAt=elapsed;const id=phase()==='hands'?'hands-ready':lesson().id+'-done';void voice?.speak(cue(id));}
            if(successCuePlayed && elapsed-successAt>1.2 && !voice?.status().playing && !voice?.status().paused)setLesson(index+1);
        }
        controllerGuide.update(dt,controllers,lesson().id,viewer,successAt!==null,1-gloveOpacity());paint();scene.updateMatrixWorld(true);
    }
    return {scene,root,bodies,objects,dragon,loading,start,update,hit,select,button,snapshot,releaseAll,abort:finish,get active(){return active;},get phase(){return lesson().id;},get tableHeight(){return tableHeight;},get controllerHandsVisible(){return active && gloveOpacity()>0;},get controllerHandOpacity(){return gloveOpacity();},get trackedHandOpacity(){return phase()==='hands'?Math.min(1,handStable/1.2):1;},get hands(){return handsPresent;},previewLesson(id){const next=WELCOME_PRACTICE_LESSONS.findIndex(l=>l.id===id);if(next>=0){setLesson(next);garden.previewPhase(id);}},rebase(matrix){releaseAll(false);root.applyMatrix4(new THREE.Matrix4().fromArray(matrix));root.updateMatrixWorld(true);},resetObjects(){releaseAll(false);props.reset();bodies.forEach(resetPracticeBody);if(phase()==='seed')garden.reset();},destroy(){disposed=true;active=false;voice?.stop();releaseAll(false);controllerGuide.destroy();garden.destroy();disposeTree(scene);}};
}
