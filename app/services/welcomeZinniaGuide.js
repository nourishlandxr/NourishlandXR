import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {GLTFLoader} from '../assets/fruit-window/vendor/GLTFLoader.js';
import {mergeGeometries} from '../assets/fruit-window/vendor/BufferGeometryUtils.js';

// Recorded narration drives the mouth; task state drives gaze and gestures.
// No speech synthesis, timers advancing lessons, or new interface.
export function createWelcomeZinniaGuide(root,{voice,onAssets=()=>{},onError=()=>{},load=url=>new GLTFLoader().loadAsync(url)}={}){
    const holder=new THREE.Group();holder.name='ZinniaWelcomeGuide';holder.visible=true;root.add(holder);
    let model=null,mixer=null,disposed=false,ready=false,age=0,phase='',level=0,rewardAge=10,ack=null,ackAge=10,smileNow=.45,eyeSmile=.65,mouthOpen=0,mouthRound=0,mouthWide=0,mouthNarrow=0,mouthClosed=0,blink=0,cueId=null,cueIntent='explain',presentingFruit=false;
    const parts={},fruitSockets={},petals=[],target=new THREE.Vector3(),worldTarget=new THREE.Vector3(),local=new THREE.Vector3(),bodyTarget=new THREE.Vector3(),gazeEuler=new THREE.Euler(),gazeQuaternion=new THREE.Quaternion(),armQuaternion=new THREE.Quaternion();let bodyYaw=0,bodyPitch=0,bodyLean=0;
    const wrapper=node=>{const pivot=new THREE.Group();pivot.position.copy(node.position);node.parent.add(pivot);pivot.add(node);node.position.set(0,0,0);return pivot;};
    function dispose(object){object.traverse(n=>{n.geometry?.dispose();for(const material of [n.material].flat().filter(Boolean))material.dispose();});}
    const loading=load(new URL('../assets/welcome-practice/zinnia.glb',import.meta.url).href).then(gltf=>{
        if(disposed){dispose(gltf.scene);return;}
        model=gltf.scene;model.name='Zinnia';
        // Extend the stem above its pot while keeping the flower head round.
        const stemRoot=model.getObjectByName('Body_sway_root'),flower=model.getObjectByName('Head_nod_root');if(stemRoot){stemRoot.scale.y*=1.5;if(flower)flower.scale.y/=1.5;for(const side of ['L','R']){const arm=model.getObjectByName('Leaf_arm_'+side);if(arm){arm.scale.set(1.5,1/1.5,1.5);}}}
        model.updateMatrixWorld(true);
        const pot=model.getObjectByName('Pot'),saucer=model.getObjectByName('Saucer');if(pot && saucer){const p=new THREE.Box3().setFromObject(pot),dish=new THREE.Box3().setFromObject(saucer);saucer.position.y+=p.min.y-dish.max.y-.006;}
        model.traverse(node=>{if(node.isMesh && /^(Pot|Saucer|Soil|Rolled_pot_lip)$/.test(node.name))node.material.userData.frontFaceOnly=true;});model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),centre=box.getCenter(new THREE.Vector3());model.position.sub(new THREE.Vector3(centre.x,box.min.y,centre.z));model.scale.setScalar(.54/size.y);model.position.multiplyScalar(.54/size.y);holder.add(model);
        model.traverse(node=>{if(['Head_nod_root','Body_sway_root','Leaf_arm_L','Leaf_arm_R','Mouth_speech','Eye_L_expression','Eye_R_expression','Eyebrow_L','Eyebrow_R'].includes(node.name))parts[node.name]=node;});
        const head=parts.Head_nod_root;
        // Bake individual petal poses into material batches. Keep irregular
        // shapes and colours, with subtle group motion instead of 80 draw calls.
        if(head){model.updateMatrixWorld(true);const inverse=head.matrixWorld.clone().invert(),groups=new Map(),remove=[];
            model.traverse(node=>{if(!node.isMesh || !/(?:^|_)petal_\d+(?:_\d+)*$/i.test(node.name))return;const geometry=node.geometry.clone();geometry.morphAttributes={};geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,node.matrixWorld));const key=node.material.uuid;if(!groups.has(key))groups.set(key,{material:node.material,geometries:[]});groups.get(key).geometries.push(geometry);remove.push(node);});
            for(const {material,geometries} of groups.values()){const geometry=mergeGeometries(geometries);if(geometry){const mesh=new THREE.Mesh(geometry,material);mesh.name='ZinniaPetalBatch';head.add(mesh);petals.push(mesh);}geometries.forEach(g=>g.dispose());}
            for(const node of remove){node.removeFromParent();node.geometry.dispose();}
        }
        const mouth=parts.Mouth_speech;
        if(mouth){const geometry=mouth.geometry,base=geometry.attributes.position;let xmin=Infinity,xmax=-Infinity;for(let i=0;i<base.count;i++){xmin=Math.min(xmin,base.getX(i));xmax=Math.max(xmax,base.getX(i));}
            // This authored face lies in local X/Z: local Y is depth.
            // Open and rounded vowels must expand across the face, not into it.
            const centre=(xmin+xmax)/2,half=(xmax-xmin)/2;
            for(const [name,width,height] of [['Open',1,.065],['Round',.65,.082],['Wide',1.22,.035],['Narrow',.46,.065],['Closed',.9,.004]]){const shape=base.clone();
                for(let i=0;i<base.count;i++){const u=(base.getX(i)-centre)/half,sign=i%2?-1:1;shape.setXYZ(i,centre+(base.getX(i)-centre)*width,base.getY(i),sign*height*Math.sqrt(Math.max(0,1-u*u)));}
                if(geometry.morphTargetsRelative)for(let i=0;i<base.count;i++)shape.setXYZ(i,shape.getX(i)-base.getX(i),shape.getY(i)-base.getY(i),shape.getZ(i)-base.getZ(i));
                const index=geometry.morphAttributes.position.length;geometry.morphAttributes.position.push(shape);
                // Three requires matching channels for every added morph target.
                if(geometry.morphAttributes.normal){const normal=geometry.attributes.normal.clone();if(geometry.morphTargetsRelative)normal.array.fill(0);geometry.morphAttributes.normal.push(normal);}
                mouth.morphTargetDictionary[name]=index;mouth.morphTargetInfluences.push(0);
            }
        }
        for(const name of ['Eye_L_expression','Eye_R_expression']){const eye=parts[name];if(!eye)continue;const highlight=new THREE.Mesh(new THREE.SphereGeometry(.009,8,6),new THREE.MeshBasicMaterial({color:'#fff8dd'}));highlight.name='Zinnia eye catchlight';highlight.position.set(-.017,-.006,-.006);eye.add(highlight);eye.userData.catchlight=highlight;}
        // Decorative animation stays; the current explanation owns gaze and arms.
        mixer=new THREE.AnimationMixer(model);for(const clip of gltf.animations){const filtered=clip.clone();filtered.tracks=filtered.tracks.filter(track=>!/(?:^|_)petal_\d|^(Head_nod_root|Body_sway_root|Leaf_arm_[LR])/i.test(track.name) && !/^(Eye_[LR]_expression|Mouth_speech|Eyebrow_[LR])\.morphTargetInfluences/.test(track.name));mixer.clipAction(filtered).play();}
        for(const name of ['Head_nod_root','Body_sway_root','Leaf_arm_L','Leaf_arm_R'])if(parts[name])parts[name].userData.guidePivot=wrapper(parts[name]);
          for(const side of ['L','R']){const arm=parts['Leaf_arm_'+side],pivot=arm?.userData.guidePivot;if(!pivot)continue;const socket=new THREE.Group();socket.name='Zinnia micro-fruit hand socket '+side;socket.position.set(side==='L' ? -.09 : .09,.035,.025);pivot.add(socket);fruitSockets[side]=socket;}
        ready=true;onAssets();
    }).catch(error=>{if(!disposed)onError(error);});
    function acknowledge(kind='yes'){ack=kind;ackAge=0;}
    function celebrate(){rewardAge=0;acknowledge('yes');}
    function update(dt,{lesson,target:taskTarget,viewer,success=false,focused=false,cue=null,reaction=null,leafTargets=null}={}){
        // The tutorial owns visibility and its white silhouette reveal.
        if(!ready || disposed)return;
        if(!holder.visible){age=0;level=0;phase=lesson;return;}
        dt=Math.max(0,Math.min(.06,dt));age+=dt;rewardAge+=dt;ackAge+=dt;mixer.update(dt);
        if(lesson!==phase){phase=lesson;rewardAge=10;ackAge=10;if(lesson==='zinnia')acknowledge('yes');}
        if(cue && cue.id!==cueId){cueId=cue.id;cueIntent=cue.intent || 'explain';rewardAge=10;ackAge=10;if(cueIntent==='celebrate')celebrate();else if(cueIntent==='acknowledge')acknowledge('yes');}
        // Preserve the authored shape; the reveal fades materials rather than scaling it.
        const paused=voice?.status().paused,raw=voice?.speechLevel?.() || 0;
        level=paused?0:THREE.MathUtils.damp(level,raw,raw>level?24:14,dt);
        const tickled=reaction==='tickle',patted=reaction==='pat';
        const celebrating=rewardAge<2.4;
        const task=taskTarget && !celebrating && lesson!=='zinnia' && lesson!=='hands';
        holder.updateWorldMatrix(true,false);
        if(task)worldTarget.copy(taskTarget).applyMatrix4(root.matrixWorld);
        else if(viewer)worldTarget.set(viewer[12],viewer[13],viewer[14]);
        else worldTarget.set(0,1.5,1).applyMatrix4(root.matrixWorld);
        const body=parts.Body_sway_root?.userData.guidePivot;
        if(body && !paused){bodyTarget.copy(worldTarget);body.parent.worldToLocal(bodyTarget).sub(body.position);const yaw=THREE.MathUtils.clamp(Math.atan2(bodyTarget.x,bodyTarget.z),-1,1),pitch=THREE.MathUtils.clamp(Math.atan2(bodyTarget.y,Math.hypot(bodyTarget.x,bodyTarget.z)),-.65,.65);bodyYaw=THREE.MathUtils.damp(bodyYaw,yaw*.4,5,dt);bodyPitch=THREE.MathUtils.damp(bodyPitch,-pitch*.32,5,dt);bodyLean=THREE.MathUtils.damp(bodyLean,-Math.sin(yaw)*.24,5,dt);body.rotation.set(bodyPitch+Math.sin(age*1.7)*.012,bodyYaw,bodyLean+Math.sin(age*1.4)*(.015+level*.025));}
        const head=parts.Head_nod_root?.userData.guidePivot;
        if(head){local.copy(worldTarget);head.parent.worldToLocal(local).sub(head.position);let yaw=THREE.MathUtils.clamp(Math.atan2(local.x,local.z),-1.05,1.05),pitch=THREE.MathUtils.clamp(Math.atan2(local.y,Math.hypot(local.x,local.z)),-.65,.65);
            if(ackAge<1.8){const fade=Math.min(1,ackAge*6)*Math.max(0,Math.min(1,(1.8-ackAge)*5)),wave=Math.sin(ackAge*Math.PI*3.4)*fade;if(ack==='no')yaw+=wave*.32;else pitch+=wave*.23;}
            if(tickled)pitch+=Math.sin(age*26)*.075;else if(patted)pitch+=Math.sin(age*6)*.06;
            target.set(-pitch,yaw,tickled?Math.sin(age*22)*.06:level*.025*Math.sin(age*3));gazeQuaternion.setFromEuler(gazeEuler.set(target.x,target.y,target.z));head.quaternion.slerp(gazeQuaternion,1-Math.exp(-8*dt));
        }

        for(const [i,petal] of petals.entries())petal.rotation.x=Math.sin(age*1.6+i*.8)*.007*(.4+level);
        const attentive=focused || Boolean(task) || level>.025 || ['grab','fruit','packet','seed','water','grow','harvest'].includes(lesson);
        const happy=celebrating || success || tickled || patted || presentingFruit;
        eyeSmile=THREE.MathUtils.damp(eyeSmile,happy?.9:attentive?0:.65,10,dt);
        const blinkTime=age%4.7;blink=blinkTime>4.43?Math.sin((blinkTime-4.43)/.27*Math.PI):0;
        mouthOpen=THREE.MathUtils.clamp(level*2.4,0,1);mouthRound=THREE.MathUtils.smoothstep(level,.22,.65)*.8;
        // Audio energy controls openness; syllable motion varies the vowel silhouette.
        const voiced=level>.025,syllable=(Math.sin(age*11)+Math.sin(age*17.3)*.35)*.5;
        mouthWide=voiced?mouthOpen*(.18+.14*(syllable+1)):.0;
        mouthNarrow=voiced?mouthOpen*Math.max(0,-syllable)*.35:0;
        mouthClosed=voiced?Math.max(0,1-mouthOpen)*.55:0;
        mouthRound=voiced?THREE.MathUtils.clamp(mouthRound*(.7+.3*Math.sin(age*8.1)),.04,.8):0;
        if(tickled && level<.025)mouthOpen=.3+.25*Math.max(0,Math.sin(age*26));
        smileNow=THREE.MathUtils.damp(smileNow,happy?1:mouthOpen>.02?.12:attentive?.3:.75,8,dt);
        for(const name of ['Eye_L_expression','Eye_R_expression']){const eye=parts[name];if(!eye)continue;const map=eye.morphTargetDictionary;eye.morphTargetInfluences[map.Smile]=eyeSmile*(1-blink);eye.morphTargetInfluences[map.Sad]=0;eye.morphTargetInfluences[map.Blink]=blink;eye.userData.catchlight.visible=eyeSmile<.4 && blink<.5;}
        for(const name of ['Eyebrow_L','Eyebrow_R']){const brow=parts[name];if(!brow)continue;brow.morphTargetInfluences[brow.morphTargetDictionary.Smile]=attentive?.2+mouthOpen*.25:smileNow*.5;brow.morphTargetInfluences[brow.morphTargetDictionary.Sad]=0;}
        const mouth=parts.Mouth_speech;if(mouth){const map=mouth.morphTargetDictionary;for(const [key,value] of [['Smile',smileNow*(1-mouthOpen)],['Sad',0],['Open',mouthOpen*(1-mouthRound)],['Round',mouthOpen*mouthRound],['Wide',mouthWide],['Narrow',mouthNarrow],['Closed',mouthClosed]])mouth.morphTargetInfluences[map[key]]=value;}
        for(const side of ['L','R']){const pivot=parts['Leaf_arm_'+side]?.userData.guidePivot;if(!pivot)continue;const q=armQuaternion.identity(),sign=side==='L'?-1:1;
            if(leafTargets?.[side]){local.copy(leafTargets[side]);pivot.parent.worldToLocal(local).sub(pivot.position);q.setFromUnitVectors(new THREE.Vector3(sign,.1,.2).normalize(),local.normalize());}
            else if(presentingFruit && side==='L')q.setFromEuler(new THREE.Euler(-.08,.04,.32));
            else if(celebrating){const fade=Math.min(1,rewardAge*3)*Math.max(0,Math.min(1,(2.4-rewardAge)*3)),angle=(1.05+.34*Math.sin(rewardAge*Math.PI*5))*fade;q.setFromEuler(new THREE.Euler(0,side==='L'?angle:-angle,-sign*.2*fade));}
            else if(lesson==='fruit' && level>.025){const peel=cue?.id?.includes(':banana:'),spread=.25+.5*(.5+.5*Math.sin(age*2));q.setFromEuler(new THREE.Euler(peel?spread*.7:0,-sign*spread,peel?sign*.4:-sign*.18));}
            else if(task){local.copy(worldTarget);pivot.parent.worldToLocal(local).sub(pivot.position);const selected=holder.worldToLocal(worldTarget.clone()).x>=0?'R':'L';if(side===selected)q.setFromUnitVectors(new THREE.Vector3(sign,.1,.2).normalize(),local.normalize());}
            else if(lesson==='zinnia' || cueIntent==='greet')q.setFromEuler(new THREE.Euler(0,-sign*.25,sign*(.32+.06*Math.sin(age*3))));
            else if(cue && level>.025)q.setFromEuler(new THREE.Euler(0,-sign*(.12+.08*Math.sin(age*2.4)),sign*.12));
            pivot.quaternion.slerp(q,1-Math.exp(-7*dt));
        }
    }
    return {holder,leaf(side){return parts['Leaf_arm_'+side];},fruitSocket(side='L'){return fruitSockets[side] || null;},presentFruit(){presentingFruit=true;rewardAge=10;acknowledge('yes');},releaseFruit(){presentingFruit=false;},loading,update,celebrate,acknowledge,snapshot:()=>({ready,visible:holder.visible,visibleAge:age,phase,cueId,cueIntent,bodyYaw,bodyPitch,bodyLean,petalBatches:petals.length,speaking:level>.02,speechLevel:level,eyeSmile,mouthOpen,mouthRound,mouthWide,mouthNarrow,mouthClosed,blink,celebrating:rewardAge<2.4,presentingFruit}),destroy(){disposed=true;mixer?.stopAllAction();}};
}
