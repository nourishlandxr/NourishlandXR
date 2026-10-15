import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {loadTrialButterflies} from './welcomeTrialButterflies.js';
import {butterflyOpenHand,butterflyOutlineTargets} from './welcomeButterflyHands.js';
import {createButterflySparkles} from './welcomeButterflySparkles.js';

// Every perch is rebuilt from the current tracked joints. No frozen hand targets.
export function createWelcomeButterflyBucket(root,{onAssets=()=>{},onFeedback=()=>{},load=loadTrialButterflies,getContext=()=>({}),onCue=()=>{},onZinnia=()=>{}}={}){
    const bucket=new THREE.Group();bucket.name='Hand tracking butterfly bucket';bucket.position.set(-.28,.08,.08);root.add(bucket);
    const material=new THREE.MeshStandardMaterial({color:'#b6d2c0',roughness:.75,side:THREE.DoubleSide});
    const shell=new THREE.Mesh(new THREE.CylinderGeometry(.10,.08,.15,32,1,true),material);bucket.add(shell);
    const base=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,.006,32),material);base.position.y=-.073;bucket.add(base);
    const handle=new THREE.Mesh(new THREE.TorusGeometry(.105,.005,8,32,Math.PI),material);bucket.add(handle);handle.position.y=.06;
    const rimMaterial=new THREE.MeshStandardMaterial({color:'#eedca5',emissive:'#ffc977',emissiveIntensity:.03,roughness:.65});
    const rim=new THREE.Mesh(new THREE.TorusGeometry(.10,.0035,6,32),rimMaterial);rim.rotation.x=Math.PI/2;rim.position.y=.075;bucket.add(rim);
    const decoys=[bucket.clone(),bucket.clone()];for(const cup of decoys)root.add(cup);
    const cups=[bucket,...decoys],cupSlots=[-.32,0,.32];
    function placeCups(){const chosen=cupSlots.splice(Math.floor(Math.random()*cupSlots.length),1)[0];cupSlots.unshift(chosen);for(let i=0;i<cups.length;i++){cups[i].position.set(cupSlots[i],.08,.08);cups[i].rotation.set(Math.PI,0,0);}cupSlots.sort((a,b)=>a-b);}
    placeCups();
    const sparkles=createButterflySparkles(root);
    let interactionOwner=null,emergenceAt=null;
    let insects=[],disposed=false,asset='loading',time=0,released=0,landed=0,burst=false;
    const holds=new Map(),edges=new Map(),hands=new Map(),inverse=new THREE.Matrix4();
    let settledAt=null,cueStarted=false,cueDone=false,cueFinishedAt=null,zinniaLandedAt=null,shakeAt=null,shaken=0,generation=0,perchSeed=Math.floor(Math.random()*24);
    const loading=Promise.resolve().then(load).then(models=>{insects=models.map((mesh,i)=>({mesh,state:'bucket',flyUntil:0,home:new THREE.Vector3(Math.cos(i*2.4)*.045,.01+Math.floor(i/5)*.014,Math.sin(i*2.4)*.045)}));
        for(const insect of insects){insect.mesh.scale.setScalar(.0195);insect.mesh.visible=false;root.add(insect.mesh);insect.mesh.position.copy(bucket.position).add(insect.home);}
        if(disposed){destroyModels();return;}asset='ready';onAssets();
    }).catch(error=>{if(!disposed){asset='error';console.warn('Butterfly bucket:',error.message);onAssets();}});
    function destroyModels(){const geometries=new Set(),materials=new Set(),textures=new Set();for(const {mesh} of insects){mesh.removeFromParent();mesh.traverse(n=>{if(n.geometry)geometries.add(n.geometry);for(const m of [n.material].flat().filter(Boolean)){materials.add(m);if(m.map)textures.add(m.map);}});}geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}
    const poseOf=input=>{const matrix=new THREE.Matrix4().fromArray(input.matrix);if(input.pinchPoint)matrix.setPosition(input.pinchPoint.x,input.pinchPoint.y,input.pinchPoint.z);return matrix.premultiply(inverse);};
    function fly(insect,source,credit=true){insect.state='flying';insect.flyStarted=time;insect.flyUntil=time+2.2;insect.emerging=false;insect.perch=null;if(credit){released++;onFeedback('release',source);}}
    function release(source,credit=true){const hold=holds.get(source);if(!hold)return;holds.delete(source);if(hold.sdk)interactionOwner?.cancel(hold.id);if(hold.insect)fly(hold.insect,source,credit);}
    function emerge(source){if(burst)return;burst=true;emergenceAt=time;for(const insect of insects)insect.mesh.visible=true;
        const point=new THREE.Vector3(0,.08,0).applyQuaternion(bucket.quaternion).add(bucket.position);sparkles.burst(point);getContext().onSparkle?.(root.localToWorld(point.clone()));
        onFeedback('magic',source);
    }
    function sdkStep(inputs,dt){
        const owner=getContext().interactionOwner || null;
        if(owner!==interactionOwner){for(const source of [...holds.keys()])release(source,false);interactionOwner=owner;}
        if(!owner)return;
        for(const cup of cups)cup.updateMatrix();
        const bodies=[...cups.map((cup,i)=>({id:i?'butterfly-cup-decoy-'+i:'butterfly-cup',position:new THREE.Vector3(0,-.073,0).applyQuaternion(cup.quaternion).add(cup.position),rotation:cup.quaternion,halfSize:{x:.055,y:.028,z:.035},visible:true})),...insects.map((insect,i)=>({id:'trial-butterfly-'+i,position:insect.mesh.position,rotation:insect.mesh.quaternion,halfSize:{x:.025,y:.025,z:.025},visible:insect.mesh.visible}))];
        const sdkInputs=inputs.filter(input=>input.matrix).map(input=>{const matrix=Array.from(input.matrix);if(input.source.hand && input.pinchPoint){matrix[12]=input.pinchPoint.x;matrix[13]=input.pinchPoint.y;matrix[14]=input.pinchPoint.z;}return {...input,matrix,down:Boolean(input.source.hand?input.trigger:input.down)};});
        owner.step(sdkInputs,bodies,{rootMatrix:root.matrixWorld.elements,dt,time,enabled:dt>0});
        for(const input of sdkInputs){const captured=owner.held(input.source);let hold=holds.get(input.source);
            if(hold?.sdk && (!captured || captured.id!==hold.id)){release(input.source,!input.uiBlocked && !input.down);hold=null;}
            if(!captured)continue;const index=Number(captured.id.replace('trial-butterfly-','')),insect=captured.id.startsWith('butterfly-cup')?null:insects[index],mesh=insect?.mesh || (captured.id==='butterfly-cup'?bucket:decoys[Number(captured.id.at(-1))-1]);
            if(!hold){mesh.updateMatrix();const p=insect?mesh.position:new THREE.Vector3(0,-.073,0).applyQuaternion(mesh.quaternion).add(mesh.position),q=mesh.quaternion,anchor=new THREE.Matrix4().compose(p,q,new THREE.Vector3(1,1,1));hold={sdk:true,id:captured.id,insect,mesh,offset:anchor.invert().multiply(mesh.matrix)};holds.set(input.source,hold);if(insect)insect.state='held';onFeedback('grab',input.source);}
            const p=new THREE.Vector3(),q=new THREE.Quaternion();new THREE.Matrix4().fromArray(captured.matrix).decompose(p,q,new THREE.Vector3());
            new THREE.Matrix4().compose(p,q,new THREE.Vector3(1,1,1)).multiply(hold.offset).decompose(mesh.position,mesh.quaternion,mesh.scale);
            if(mesh===bucket && bucket.position.y>.22)emerge(input.source);
        }
    }
    function perches(inputs,dt,context){const result=[];
        for(const input of inputs){const wrist=input.joints?.get('wrist');if(!wrist)continue;
            const p=new THREE.Vector3(wrist.x,wrist.y,wrist.z),tipJoint=input.joints.get('index-finger-tip'),tip=tipJoint?new THREE.Vector3(tipJoint.x,tipJoint.y,tipJoint.z):p.clone(),previous=hands.get(input.source),delta=previous?p.clone().sub(previous.point):new THREE.Vector3(),tipDelta=previous?tip.clone().sub(previous.tip):new THREE.Vector3();
            // Wrist turns move the fingertips even when the wrist stays put.
            if(tipDelta.lengthSq()>delta.lengthSq())delta.copy(tipDelta);
            const speed=delta.length()/Math.max(.001,dt),open=butterflyOpenHand(input);
            const viewer=context.viewer,near=viewer && p.distanceTo(new THREE.Vector3(viewer[12],viewer[13],viewer[14]))>=.22 && p.distanceTo(new THREE.Vector3(viewer[12],viewer[13],viewer[14]))<=.75 && p.y>viewer[13]-.42;
            const stable=open && near && speed<.065?(previous?.stable || 0)+dt:0;
            const direction=speed>.18 && speed<1.4?delta.normalize():null;
            let turns=cueDone && time-(previous?.lastTurn || -Infinity)<1.4?previous?.turns || 0:0,lastTurn=previous?.lastTurn || -Infinity;
            if(direction && previous?.direction && direction.dot(previous.direction)<-.2){turns=time-lastTurn<1.4?turns+1:1;lastTurn=time;}
            hands.set(input.source,{point:p,tip,stable,direction:direction || previous?.direction,turns,lastTurn});
            if(cueDone && shakeAt===null && turns>=2){shakeAt=time;shaken++;onFeedback('magic',input.source);onZinnia('shake');for(const insect of insects)if(insect.perch?.source===input.source)fly(insect,input.source,false);}
            const hasPerch=insects.some(insect=>insect.state==='landed' && insect.perch?.source===input.source);
            if(open && near && (stable>=.65 || hasPerch && speed<1.4))result.push(...butterflyOutlineTargets(input,inverse));
        }return result;
    }
    function update(dt,inputs=[]){
        root.updateMatrixWorld(true);inverse.copy(root.matrixWorld).invert();const usable=inputs.filter(i=>i.matrix && !i.uiBlocked && i.source.hand);
        for(const source of holds.keys())if(!inputs.some(i=>i.source===source && i.matrix && !i.uiBlocked))release(source,false);
        for(const source of edges.keys())if(!usable.some(i=>i.source===source)){edges.delete(source);hands.delete(source);}
        if(dt<=0)return;time+=Math.min(.06,dt);
        sdkStep(inputs,dt);
        for(const input of usable){if(interactionOwner){edges.set(input.source,Boolean(input.trigger));continue;}const pose=poseOf(input),point=new THREE.Vector3().setFromMatrixPosition(pose),down=Boolean(input.trigger);let hold=holds.get(input.source);
            if(hold && !down){release(input.source);hold=null;}
            if(!hold && down && edges.get(input.source)===false){const occupied=new Set([...holds.values()].map(h=>h.insect));const insect=insects.filter(i=>i.mesh.visible && !occupied.has(i)).sort((a,b)=>a.mesh.position.distanceTo(point)-b.mesh.position.distanceTo(point)).find(i=>i.mesh.position.distanceTo(point)<.065);
                const target=insect?.mesh || cups.find(cup=>point.distanceTo(new THREE.Vector3(0,-.073,0).applyQuaternion(cup.quaternion).add(cup.position))<.085 && ![...holds.values()].some(h=>h.mesh===cup)) || null;
                if(target){target.updateMatrix();hold={mesh:target,insect,offset:pose.clone().invert().multiply(target.matrix)};holds.set(input.source,hold);if(insect)insect.state='held';onFeedback('grab',input.source);}}
            if(hold){pose.multiply(hold.offset).decompose(hold.mesh.position,hold.mesh.quaternion,hold.mesh.scale);if(hold.mesh===bucket && bucket.position.y>.22)emerge(input.source);}
            edges.set(input.source,down);
        }
        const context=getContext(),targets=perches(usable,dt,context);
        // The butterflies stay hidden until the visitor lifts the correct cup.
        for(const [i,insect]of insects.entries())if(insect.state==='bucket' && emergenceAt!==null && time-emergenceAt>i*.045){fly(insect,null,false);insect.emerging=true;}
        sparkles.update(dt,{reducedMotion:Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)});
        const glow=emergenceAt===null?0:Math.max(0,1-(time-emergenceAt)/1.8);rimMaterial.emissiveIntensity=.03+.28*glow;
        if(settledAt!==null && (zinniaLandedAt!==null && time-zinniaLandedAt>.4 || !context.zinniaPerch && time-settledAt>1) && !cueStarted && context.ready!==false){cueStarted=true;const token=generation;const finish=()=>{if(!disposed && token===generation){cueDone=true;cueFinishedAt=time;}};Promise.resolve(onCue('Hold your hands steady. Now give them a gentle little shake and watch the butterflies take flight.')).then(finish,finish);}
        if(cueDone && cueFinishedAt!==null && time-cueFinishedAt>1)onZinnia(time-cueFinishedAt<2.5?'shake':'rest');
        const occupiedPerches=[];
        insects.forEach((insect,i)=>{
            if(insect.state==='held')return;
            if(insect.state==='bucket')insect.mesh.position.copy(insect.home).applyQuaternion(bucket.quaternion).add(bucket.position);
            else {
                const reserved=i===insects.length-1,zinnia=reserved && settledAt!==null && (cueFinishedAt===null || time-cueFinishedAt<1.8) && context.zinniaPerch;
                let target=zinnia?{point:new THREE.Vector3().copy(zinnia.point).applyMatrix4(inverse),q:new THREE.Quaternion().setFromRotationMatrix(inverse).multiply(zinnia.q || new THREE.Quaternion()),source:{handedness:'zinnia'},joint:'zinnia-leaf',index:-1}:!reserved && targets.length && (shakeAt===null || time-shakeAt>2.5)?targets[(i*7+perchSeed)%targets.length]:null;
                if(insect.state==='landed' && insect.perch?.hand!=='zinnia')target=targets.find(candidate=>candidate.source===insect.perch.source && candidate.joint===insect.perch.joint) || null;
                if(target && !zinnia){
                    const fits=candidate=>occupiedPerches.every(point=>point.distanceTo(candidate.point)>.023);
                    if(!fits(target))target=insect.state==='landed'?null:targets.find(fits) || null;
                    if(target)occupiedPerches.push(target.point);
                }
                if(!target && insect.state==='landed')fly(insect,null,false);
                if(target && time>=insect.flyUntil){const distance=insect.mesh.position.distanceTo(target.point);if(distance<.012 && insect.state!=='landed'){insect.state='landed';landed++;if(zinnia)zinniaLandedAt ??= time;else if(settledAt===null){settledAt=time;onZinnia('perch');}onFeedback('collect',target.source);}if(insect.state==='landed')insect.mesh.position.copy(target.point);else insect.mesh.position.add(target.point.clone().sub(insect.mesh.position).clampLength(0,dt*.32));insect.mesh.quaternion.slerp(target.q,1-Math.exp(-dt*5));insect.perch={source:target.source,hand:target.source.handedness,joint:target.joint};}
                else {const rising=insect.emerging && time-insect.flyStarted<.65,targetPoint=rising?new THREE.Vector3(Math.cos(i*2.4)*.025,.20+(time-insect.flyStarted)*.12,Math.sin(i*2.4)*.025).add(bucket.position):new THREE.Vector3(Math.sin(time*1.9+i*1.7)*.25,.35+Math.sin(time*2+i)*.09,.06+Math.cos(time*1.4+i)*.18);insect.mesh.position.lerp(targetPoint,1-Math.exp(-dt*3));insect.mesh.rotation.y=time+i;}
            }
            insect.mesh.traverse(n=>{if(n.morphTargetInfluences)n.morphTargetInfluences[0]=insect.state==='landed'?.08:.5+.5*Math.sin(time*22+i);});
        });
    }
    function reset(){generation++;interactionOwner?.reset();sparkles.reset();rimMaterial.emissiveIntensity=.03;emergenceAt=null;holds.clear();edges.clear();hands.clear();released=landed=shaken=0;settledAt=shakeAt=cueFinishedAt=zinniaLandedAt=null;cueStarted=cueDone=false;onZinnia('rest');burst=false;time=0;placeCups();for(const insect of insects){insect.state='bucket';insect.perch=null;insect.mesh.visible=false;insect.mesh.position.copy(bucket.position).add(insect.home);}}
    return {bucket,cups,loading,update,reset,targets:()=>[],picked(){},moved(){},released(){},act(){},releaseAll(){for(const source of holds.keys())release(source,false);edges.clear();interactionOwner?.reset();sparkles.reset();},isHolding:source=>holds.has(source),
        hints:()=>asset==='error'?['Butterflies could not load. Reset the activity to retry.']:!burst?['Lift the cups to discover where the butterflies are hiding.']:cueDone?['Gently shake your hands to let them take flight.']:['Open your hands wide near your face and hold them still.','Watch them settle along your hand’s outline.'],
        snapshot:()=>({asset,backend:interactionOwner?'iwsdk':'native',sparkles:sparkles.snapshot(),released,landed,shaken,cueStarted,cueDone,burst,complete:shaken>0 && shakeAt!==null && time-shakeAt>2,cups:cups.map(cup=>cup.position.toArray()),insects:insects.map(i=>({state:i.state,position:i.mesh.position.toArray(),perch:i.perch?{hand:i.perch.hand,joint:i.perch.joint}:null}))}),
        destroy(){if(disposed)return;disposed=true;interactionOwner?.reset();sparkles.destroy();generation++;onZinnia('rest');holds.clear();destroyModels();for(const cup of cups)cup.removeFromParent();bucket.traverse(n=>n.geometry?.dispose());material.dispose();rimMaterial.dispose();}};
}
