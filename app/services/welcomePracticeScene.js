import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {GLTFLoader} from '../assets/fruit-window/vendor/GLTFLoader.js';
import {WELCOME_PRACTICE_LESSONS,WELCOME_PRACTICE_RESPONSES} from './welcomePracticeContent.js';
import {PRACTICE_TABLE_RADIUS,createPracticeBody,resetPracticeBody,stepPracticeBodies} from './welcomePracticePhysics.js';

const one=new THREE.Vector3(1,1,1),up=new THREE.Vector3(0,1,0);
const serial=v=>({x:v.x,y:v.y,z:v.z});
function disposeTree(root){const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(n=>{if(n.geometry)geometries.add(n.geometry);for(const m of [n.material].flat().filter(Boolean)){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>{t.image?.close?.();t.dispose();});}
function glass(colour,opacity=1){return new THREE.MeshStandardMaterial({color:colour,roughness:.72,metalness:0,transparent:opacity<1,opacity,depthWrite:true,side:THREE.DoubleSide});}
function tableSurface(colour,opacity){return new THREE.MeshBasicMaterial({color:colour,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide});}
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
export function createWelcomePracticeScene({voice,onComplete=()=>{},onChange=()=>{},onFeedback=()=>{},onAssets=()=>{}}={}){
    const scene=new THREE.Scene(),root=new THREE.Group();scene.add(root);
    const table=new THREE.Group();root.add(table);
    const top=new THREE.Mesh(new THREE.CylinderGeometry(PRACTICE_TABLE_RADIUS,PRACTICE_TABLE_RADIUS-.008,.024,64),tableSurface('#c8d4c0',.32));top.position.y=-.012;table.add(top);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(PRACTICE_TABLE_RADIUS-.009,.004,6,64),glass('#9db59a',.86));rim.rotation.x=Math.PI/2;rim.position.y=.003;table.add(rim);
    const stand=new THREE.Mesh(new THREE.CylinderGeometry(.026,.052,1,24),tableSurface('#bfcfb7',.42));table.add(stand);
    const foot=new THREE.Mesh(new THREE.CylinderGeometry(.19,.21,.024,40),tableSurface('#c4d2bc',.3));table.add(foot);
    const landing=new THREE.Mesh(new THREE.TorusGeometry(.12,.0025,6,48),glass('#b8c8af',.7));landing.rotation.x=Math.PI/2;landing.position.set(.18,.006,.25);table.add(landing);
    const bodies=[createPracticeBody('ball',{x:-.16,z:.3,radius:.075,bounce:.52}),createPracticeBody('orange',{x:-.28,z:.1,radius:.052}),createPracticeBody('lime',{x:.03,z:.14,radius:.043}),createPracticeBody('banana',{x:.28,z:.08,radius:.07,halfSize:{x:.09,y:.026,z:.032}})];
    const objects=new Map();
    for(const body of bodies){const group=new THREE.Group();root.add(group);objects.set(body.id,group);
        const placeholder=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),glass(body.id==='ball'?'#b9cdb7':body.id==='orange'?'#deb067':body.id==='lime'?'#b3bf73':'#e6d298'));
        const half=body.halfSize;placeholder.scale.set(half.x,half.y,half.z);group.add(placeholder);
        if(body.id==='ball'){const band=new THREE.Mesh(new THREE.TorusGeometry(body.radius*1.004,.0018,5,48),glass('#f4f2dc'));band.rotation.x=.34;group.add(band);}
    }
    const dragon=createDragonfly();root.add(dragon.group);
    const plate=textPlate(1400,350,.98,.245);plate.mesh.position.set(0,.48,-.41);root.add(plate.mesh);
    const buttons=new Map();
    for(const [id,x] of [['replay',-.36],['mute',-.12],['skip',.12],['next',.36]]){const p=textPlate(360,100,.222,.062);p.mesh.position.set(x,.288,-.41);root.add(p.mesh);buttons.set(id,{...p,x,y:.288,width:.222,height:.062,enabled:true});}
    let active=false,disposed=false,anchored=false,index=0,elapsed=0,stepStarted=0,tableHeight=.8,lastSignature='',lastImpact=-Infinity;
    let pointed=false,ballGrabbed=false,ballReleased=false,fruitGrabbed=false,fruitReleased=false,dragonDistance=0,dragonReleased=false,handsPresent=false,handStable=0,successAt=null;
    let dragonOwner=null,dragonOffset=null,dragonVelocity=new THREE.Vector3(),dragonManual=false,dragonPhase=Math.random()*Math.PI*2,successCuePlayed=false;
    const activeGrabs=new Map(),inputEdges=new Map(),point=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3(),worldInverse=new THREE.Matrix4(),pendingEvents=new Set();
    const lesson=()=>WELCOME_PRACTICE_LESSONS[index];
    const cue=id=>WELCOME_PRACTICE_RESPONSES.find(value=>value.id===id);
    const spokenLesson=()=>index===3 && handsPresent?cue('fly-hands'):index===4 && handsPresent?cue('hands-ready'):lesson();
    const currentCaption=()=>index===4 && handsPresent?'There are your hands. Reach towards the fruit.':index===3 && handsPresent?'Pinch near the dragonfly. Move your hand, then release.':lesson().caption;
    function snapshot(){return {active,phase:lesson().id,index,caption:currentCaption(),title:lesson().title,handsPresent,held:[...activeGrabs.values()].map(g=>g.body.id),voice:voice?.status(),assets:fruitAssets};}
    function nextAllowed(){return !(voice?.status().playing) && (index===4 || index===6);}
    function paint(){
        const v=voice?.status() || {playing:false,muted:true};
        const label=index===4?'Use controllers':'Continue';
        const caption=currentCaption();
        const signature=[index,caption,v.playing,v.muted,nextAllowed(),handsPresent].join('|');if(signature===lastSignature)return;lastSignature=signature;
        plate.paint(ctx=>{ctx.fillStyle='rgba(242,240,228,.92)';ctx.beginPath();ctx.roundRect(2,2,1396,346,65);ctx.fill();ctx.strokeStyle='rgba(147,168,146,.7)';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#637763';ctx.font='500 27px system-ui';ctx.textAlign='center';ctx.fillText('NOURISHLAND XR  ·  WELCOME 0.1',700,63);ctx.fillStyle='#304334';ctx.font='500 59px system-ui';ctx.fillText(lesson().title,700,147,1310);ctx.font='34px system-ui';ctx.fillStyle='#485c49';
            const words=caption.split(' '),lines=[''];for(const word of words){const i=lines.length-1;if(ctx.measureText(lines[i]+word).width>1280)lines.push(word+' ');else lines[i]+=word+' ';}lines.slice(0,2).forEach((line,i)=>ctx.fillText(line.trim(),700,223+i*47));});
        for(const [id,p] of buttons){p.enabled=id==='next'?nextAllowed():id==='skip' || Boolean(voice);p.mesh.visible=p.enabled;
            p.paint(ctx=>{ctx.fillStyle=id==='next'?'#677f65':'rgba(236,239,225,.92)';ctx.beginPath();ctx.roundRect(2,2,356,96,43);ctx.fill();ctx.fillStyle=id==='next'?'#fff9e9':'#405740';ctx.font='500 28px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(id==='replay'?'Hear again':id==='mute'?(v.muted?'Voice off':'Voice on'):id==='skip'?'Skip practice':label,180,50,338);});
        }
        onChange(snapshot());
    }
    function setLesson(value){index=value;stepStarted=elapsed;successCuePlayed=index===4 && handsPresent;successAt=successCuePlayed?elapsed:null;lastSignature='';if(index===3){dragon.group.position.set(-.22,.25,-.1);dragonVelocity.set(0,0,0);}void voice?.speak(spokenLesson());paint();}
    function start(viewer,floor){if(disposed)return;active=true;elapsed=0;stepStarted=0;if(viewer)anchor(viewer,floor);setLesson(0);}
    function anchor(viewer,floor=viewer[13]-1.65){if(anchored || !viewer)return;const forward=new THREE.Vector3(-viewer[8],0,-viewer[10]).normalize();if(forward.lengthSq()<.1)forward.set(0,0,-1);tableHeight=Math.max(.5,Math.min(1.02,viewer[13]-.65-floor));root.position.set(viewer[12]+forward.x*.75,floor+tableHeight,viewer[14]+forward.z*.75);root.quaternion.setFromAxisAngle(up,Math.atan2(-forward.x,-forward.z));stand.scale.y=tableHeight-.04;stand.position.y=-tableHeight/2-.012;foot.position.y=-tableHeight+.012;root.updateMatrixWorld(true);anchored=true;}
    function localPose(matrix){return new THREE.Matrix4().multiplyMatrices(worldInverse,new THREE.Matrix4().fromArray(matrix));}
    function localRay(ray){if(!ray?.origin || !ray.direction)return null;root.updateMatrixWorld(true);worldInverse.copy(root.matrixWorld).invert();return new THREE.Ray(new THREE.Vector3(ray.origin.x,ray.origin.y,ray.origin.z),new THREE.Vector3(ray.direction.x,ray.direction.y,ray.direction.z).normalize()).applyMatrix4(worldInverse);}
    function hit(ray){if(!active || !anchored)return null;const r=localRay(ray);if(!r)return null;let best=null;
        const pick=(distance,value)=>{if(distance>0 && (!best || distance<best.distance))best={...value,distance};};
        if(index>0)for(const body of bodies){if(!body.visible)continue;const p=r.intersectSphere(new THREE.Sphere(new THREE.Vector3(body.position.x,body.position.y,body.position.z),body.radius+.014),new THREE.Vector3());if(p)pick(p.distanceTo(r.origin),{kind:'body',body,point:p});}
        if(index>=3){const p=r.intersectSphere(new THREE.Sphere(dragon.group.position,.095),new THREE.Vector3());if(p)pick(p.distanceTo(r.origin),{kind:'dragon',point:p});}
        const p=r.intersectPlane(new THREE.Plane(new THREE.Vector3(0,0,1),.41),new THREE.Vector3());
        if(p)for(const [id,b] of buttons)if(b.enabled && Math.abs(p.x-b.x)<b.width/2 && Math.abs(p.y-b.y)<b.height/2)pick(p.distanceTo(r.origin),{kind:'button',id,point:p.clone()});
        const tablePoint=r.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),new THREE.Vector3());
        if(tablePoint && Math.hypot(tablePoint.x,tablePoint.z)<PRACTICE_TABLE_RADIUS)pick(tablePoint.distanceTo(r.origin),{kind:'table',point:tablePoint});
        if(best){best.worldPoint=best.point.clone().applyMatrix4(root.matrixWorld);return best;}return null;
    }
    function finish(){if(!active)return;active=false;voice?.stop();releaseAll(false);dragonOwner=null;root.visible=false;onChange(snapshot());onComplete();}
    function button(id){voice?.unlock();if(id==='skip')finish();else if(id==='replay')void voice?.speak(spokenLesson());else if(id==='mute')voice?.toggleMute();else if(id==='next' && nextAllowed()){if(index===4)setLesson(5);else finish();}paint();}
    function select(ray,source){if(!active)return false;voice?.unlock();const target=hit(ray);if(!target)return false;if(target.kind==='button'){button(target.id);return true;}
        if(target.kind==='body' && index===1 && target.body.id==='ball'){const direction=localRay(ray).direction;target.body.velocity={x:direction.x*.3,y:.2,z:direction.z*.3};pointed=true;onFeedback('point',source);return true;}return false;
    }
    function grab(source,pose){if(index<2 || activeGrabs.has(source))return;pose.decompose(point,rotation,scale);
        const occupied=new Set([...activeGrabs.values()].map(g=>g.body));
        const candidate=bodies.filter(b=>b.visible && !occupied.has(b) && (index>=5 || b.id==='ball')).map(b=>({body:b,d:point.distanceTo(new THREE.Vector3(b.position.x,b.position.y,b.position.z))})).filter(c=>c.d<c.body.radius+.055).sort((a,b)=>a.d-b.d)[0];
        if(candidate){const b=candidate.body,bodyMatrix=new THREE.Matrix4().compose(new THREE.Vector3(b.position.x,b.position.y,b.position.z),new THREE.Quaternion(b.rotation.x,b.rotation.y,b.rotation.z,b.rotation.w),one);activeGrabs.set(source,{body:b,offset:pose.clone().invert().multiply(bodyMatrix),samples:[]});b.held=true;Object.assign(b.velocity,{x:0,y:0,z:0});Object.assign(b.angular,{x:0,y:0,z:0});if(b.id==='ball')ballGrabbed=true;else fruitGrabbed=true;onFeedback('grab',source);return;}
        if(index>=3 && !dragonOwner && point.distanceTo(dragon.group.position)<.13 && source.hand){dragonOwner=source;dragonOffset=dragon.group.position.clone().sub(point);}
    }
    function release(source,throwing=true){const g=activeGrabs.get(source);if(g){const b=g.body,last=g.samples.at(-1),first=g.samples.find(s=>last.time-s.time<=.12);if(throwing && last && first && last.time-first.time>.008){const v=last.p.clone().sub(first.p).divideScalar(last.time-first.time).clampLength(0,3.2);Object.assign(b.velocity,serial(v));const q=last.q.clone().multiply(first.q.clone().invert());if(q.w<0)q.set(-q.x,-q.y,-q.z,-q.w);const angle=2*Math.acos(Math.max(-1,Math.min(1,q.w))),a=new THREE.Vector3(q.x,q.y,q.z).normalize().multiplyScalar(Math.min(8,angle/(last.time-first.time)));Object.assign(b.angular,serial(a));}
            b.held=false;activeGrabs.delete(source);if(throwing){if(b.id==='ball' && ballGrabbed)ballReleased=true;else if(b.id!=='ball' && fruitGrabbed)fruitReleased=true;}onFeedback('release',source);}
        if(dragonOwner===source){dragonOwner=null;dragonManual=false;if(throwing && dragonDistance>.08)dragonReleased=true;}
    }
    function releaseAll(throwing=false){for(const source of [...activeGrabs.keys()])release(source,throwing);dragonOwner=null;dragonManual=false;dragonVelocity.set(0,0,0);}
    const fruitAssets={orange:'loading',lime:'loading',banana:'loading'};
    const loader=new GLTFLoader();
    const loading=Promise.all(bodies.slice(1).map(async body=>{
        try{const gltf=await loader.loadAsync(new URL('../assets/welcome-practice/'+body.id+'.glb',import.meta.url).href);if(disposed){disposeTree(gltf.scene);return;}
            const model=gltf.scene;model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),extent=body.id==='banana'?.19:body.id==='lime'?.088:.108,factor=extent/Math.max(size.x,size.y,size.z);
            const normalized=new THREE.Group();normalized.scale.setScalar(factor);normalized.position.copy(center).multiplyScalar(-factor);normalized.add(model);
            const holder=objects.get(body.id);disposeTree(holder);holder.clear();holder.add(normalized);
            body.halfSize={x:Math.max(.01,size.x*factor/2),y:Math.max(.012,size.y*factor/2),z:Math.max(.01,size.z*factor/2)};body.radius=Math.max(body.halfSize.x,body.halfSize.y,body.halfSize.z);resetPracticeBody(body);fruitAssets[body.id]='ready';
        }catch(error){fruitAssets[body.id]='fallback';console.warn('Practice fruit:',body.id,error.message);}
    })).then(()=>{if(!disposed)onAssets();});
    function update(dt,{viewer,floor,hands=[],controllers=[],inputs=[]}={}){
        if(!active || disposed)return;dt=Math.min(.06,Math.max(0,dt));elapsed+=dt;anchor(viewer,floor);if(!anchored)return;root.visible=true;root.updateMatrixWorld(true);worldInverse.copy(root.matrixWorld).invert();
        handsPresent=hands.some(e=>e.state?.tracked);handStable=handsPresent?handStable+dt:0;
        const appear=Math.min(1,elapsed/1.25),soft=appear*appear*(3-2*appear);table.scale.setScalar(.03+.97*soft);objects.get('ball').scale.setScalar(.03+.97*soft);
        for(const source of [...inputEdges.keys()])if(!inputs.some(i=>i.source===source)){release(source,false);inputEdges.delete(source);}
        const consumed=new Set();
        for(const input of inputs){const {source,matrix,ray,down,trigger}=input,previous=inputEdges.get(source);
            if(!matrix){release(source,false);inputEdges.delete(source);continue;}const pose=localPose(matrix);
            if(down && previous?.down===false)grab(source,pose);else if(!down)release(source,true);
            if(trigger && previous?.trigger===false && source.hand && !activeGrabs.has(source) && dragonOwner!==source){if(select(ray,source))consumed.add(source);}
            const g=activeGrabs.get(source);if(g){const m=pose.clone().multiply(g.offset),p=new THREE.Vector3(),q=new THREE.Quaternion();m.decompose(p,q,scale);if(g.body.position.y>=g.body.support-.015 && Math.hypot(p.x,p.z)<PRACTICE_TABLE_RADIUS)p.y=Math.max(g.body.support,p.y);Object.assign(g.body.position,serial(p));Object.assign(g.body.rotation,{x:q.x,y:q.y,z:q.z,w:q.w});g.samples.push({time:elapsed,p:p.clone(),q:q.clone()});g.samples=g.samples.filter(s=>elapsed-s.time<.18);}
            if(source.hand && index>=3 && dragonOwner===source){pose.decompose(point,rotation,scale);const desired=point.clone().add(dragonOffset),before=dragon.group.position.clone();dragon.group.position.lerp(desired,1-Math.exp(-dt*16));dragonDistance+=before.distanceTo(dragon.group.position);dragonManual=true;}
            // Near finger contact makes audio controls available without rays.
            if(input.tip){const tip=new THREE.Vector3(input.tip.x,input.tip.y,input.tip.z).applyMatrix4(worldInverse),poke=Math.abs(tip.z+.41)<.027;const b=[...buttons].find(([,v])=>v.enabled && Math.abs(tip.x-v.x)<v.width/2 && Math.abs(tip.y-v.y)<v.height/2);const id=poke && b?b[0]:null;if(id && previous?.poke!==id && !down && !g)button(id);input.poke=id;}
            inputEdges.set(source,{down:Boolean(down),trigger:Boolean(trigger),poke:input.poke});
        }
        stepPracticeBodies(bodies,dt,{floor:-tableHeight,onImpact:(body,speed)=>{if(elapsed-lastImpact>.18){lastImpact=elapsed;onFeedback('impact',null,Math.min(1,speed/3));}}});
        for(const b of bodies){b.visible=b.id==='ball' || index>=5;const mesh=objects.get(b.id);mesh.visible=b.visible;mesh.position.set(b.position.x,b.position.y,b.position.z);mesh.quaternion.set(b.rotation.x,b.rotation.y,b.rotation.z,b.rotation.w);}
        dragon.group.visible=index>=3;
        if(index>=3){const pilot=controllers.find(i=>i.trigger && i.source.gamepad?.axes?.length>=2 && !activeGrabs.has(i.source) && !consumed.has(i.source));
            if(pilot && !dragonOwner){dragonManual=true;const axes=pilot.source.gamepad.axes,offset=axes.length>=4?2:0,dead=value=>Math.abs(value)<.18?0:Math.sign(value)*(Math.abs(value)-.18)/.82;
                const desired=new THREE.Vector3(dead(axes[offset])*.35,0,dead(axes[offset+1])*.35);dragonVelocity.lerp(desired,1-Math.exp(-dt*7));const delta=dragonVelocity.clone().multiplyScalar(dt);dragon.group.position.add(delta);dragonDistance+=delta.length();
            }else if(!dragonOwner){if(dragonManual && dragonDistance>.08)dragonReleased=true;dragonManual=false;const t=elapsed+dragonPhase,target=new THREE.Vector3(Math.sin(t*.64)*.29,.27+Math.sin(t*.87)*.055,-.05+Math.cos(t*.53)*.23);const desired=target.sub(dragon.group.position).multiplyScalar(.8).clampLength(0,.2);dragonVelocity.lerp(desired,1-Math.exp(-dt*2.2));dragon.group.position.addScaledVector(dragonVelocity,dt);}
            const pos=dragon.group.position;pos.x=THREE.MathUtils.clamp(pos.x,-.46,.46);pos.z=THREE.MathUtils.clamp(pos.z,-.43,.38);pos.y=THREE.MathUtils.clamp(pos.y,.12,.62);
            if(dragonVelocity.lengthSq()>.0001)dragon.group.rotation.y=Math.atan2(-dragonVelocity.x,-dragonVelocity.z);dragon.wings.forEach(({pivot,side,front})=>{pivot.rotation.z=side*(.06+Math.sin(elapsed*2*Math.PI*28+front*.36)*.28);});
        }
        if(index===0 && elapsed-stepStarted>3 && !voice?.status().playing)setLesson(1);
        const success=index===1?pointed:index===2?ballReleased:index===3?dragonReleased:index===4?handStable>.65:index===5?fruitReleased:false;
        if(success){if(successAt===null)successAt=elapsed;
            if(!successCuePlayed && elapsed-successAt>.45){successCuePlayed=true;successAt=elapsed;const id=index===4?'hands-ready':lesson().id+'-done';void voice?.speak(cue(id));}
            if(successCuePlayed && elapsed-successAt>.8 && !voice?.status().playing)setLesson(index+1);
        }
        paint();scene.updateMatrixWorld(true);
    }
    return {scene,root,bodies,objects,dragon,loading,start,update,hit,select,button,snapshot,releaseAll,get active(){return active;},get phase(){return lesson().id;},get tableHeight(){return tableHeight;},get controllerHandsVisible(){return active && index>=2;},get hands(){return handsPresent;},previewLesson(id){const next=WELCOME_PRACTICE_LESSONS.findIndex(l=>l.id===id);if(next>=0){releaseAll(false);setLesson(next);}},rebase(matrix){releaseAll(false);root.applyMatrix4(new THREE.Matrix4().fromArray(matrix));root.updateMatrixWorld(true);},resetObjects(){releaseAll(false);bodies.forEach(resetPracticeBody);},destroy(){disposed=true;active=false;voice?.stop();releaseAll(false);disposeTree(scene);}};
}
