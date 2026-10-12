import {MARKING_BRUSHES} from './creatorMarkingBrushes.js';
import {createSpatialPaintV2,PAINT_V2_WIDTHS,PAINT_V2_COLOURS} from './spatialPaintV2.js';
import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {createLivingMapDetailKit} from './demoLivingMapDetail.js';
import {loadTrialButterflies} from './welcomeTrialButterflies.js';
import {createWelcomeTrialState,WELCOME_TRIALS,TRIAL_PLANT_CARDS} from './welcomeTrialState.js';

const colours=['#86e7d0','#e8a1d0','#ffd47c','#9eb8ff','#ffffff'];
const v=()=>new THREE.Vector3();
export function trialTerrainHeight(x,z){return .012+.10*Math.exp(-((x+.105)**2+(z+.11)**2)/.006)+.055*Math.exp(-((x-.13)**2+(z+.09)**2)/.004);}
export function createWelcomePracticeTrials(root,{onAssets=()=>{},onOpen=()=>{},onClose=()=>{},onFeedback=()=>{},getPanelPose=()=>null}={}){
    const state=createWelcomeTrialState(),layer=new THREE.Group(),panel=new THREE.Group();root.add(layer,panel);layer.name='Optional welcome trials';layer.visible=false;panel.name='Welcome trial list';panel.visible=false;
    const canvas=document.createElement('canvas');canvas.width=900;canvas.height=1150;
    const texture=new THREE.CanvasTexture(canvas),panelMesh=new THREE.Mesh(new THREE.PlaneGeometry(.46,.588),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide}));panel.add(panelMesh);panelMesh.renderOrder=25;panel.position.set(-.91,.49,-.12);
    const sphere=new THREE.SphereGeometry(1,12,8),cylinder=new THREE.CylinderGeometry(1,1,1,6),materials=new Map(),groups=new Map(),edges=new Map(),holds=new Map();
    let rows=[],signature='',disposed=false,time=0,cup=null,cloud=null,disk=null,deck=[],wisps=[],rain=[],insects=[],plantSlots=[],paint=null,paintTip=null,palette=null,diskDocked=true,strokeBySource=new Map();
    const consumedSelects=new WeakSet();
    const geometry=g=>g;
    const material=colour=>{if(!materials.has(colour))materials.set(colour,new THREE.MeshStandardMaterial({color:colour,roughness:.8}));return materials.get(colour);};
    const mesh=(geo,colour,x=0,y=0,z=0,sx=1,sy=sx,sz=sx,parent=layer)=>{const node=new THREE.Mesh(geo,material(colour));node.position.set(x,y,z);node.scale.set(sx,sy,sz);parent.add(node);return node;};
    const detail=createLivingMapDetailKit({geometry,mesh,material});
    function label(text,colour,width=.115,height=.16){
        const c=document.createElement('canvas');c.width=320;c.height=450;const ctx=c.getContext('2d');ctx.fillStyle='#f7f0dc';ctx.fillRect(0,0,320,450);ctx.strokeStyle=colour;ctx.lineWidth=17;ctx.strokeRect(10,10,300,430);ctx.fillStyle=colour;ctx.beginPath();ctx.arc(160,158,82,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#456549';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(160,235);ctx.lineTo(160,133);ctx.stroke();ctx.fillStyle='#4b794f';for(const [x,y] of [[131,176],[186,157],[133,139]]){ctx.beginPath();ctx.ellipse(x,y,28,12,x<160?.4:-.4,0,Math.PI*2);ctx.fill();}if(text==='Fruit tree'){ctx.beginPath();ctx.arc(160,126,46,0,Math.PI*2);ctx.fill();}if(text==='Flowers' || text==='Strawberry'){ctx.fillStyle=text==='Flowers'?'#f7e4f9':'#b84353';ctx.beginPath();ctx.arc(163,112,22,0,Math.PI*2);ctx.fill();}
        ctx.fillStyle='#314a35';ctx.textAlign='center';ctx.font='bold 32px system-ui';text.split(' ').forEach((word,i)=>ctx.fillText(word,160,300+i*40,290));ctx.font='20px system-ui';ctx.fillText('HOLD · TRANSFORM · PLANT',160,416,285);
        const map=new THREE.CanvasTexture(c);return new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide}));
    }
    function cloudShape(parent,radius,opacity){const group=new THREE.Group();parent.add(group);const mat=new THREE.MeshStandardMaterial({color:'#eaf4f7',roughness:1,transparent:true,opacity,depthWrite:false});for(const [x,y,z,s] of [[0,0,0,1],[-.65,-.1,0,.75],[.65,-.06,0,.8],[-.15,.45,-.16,.8],[.1,-.2,.35,.65]]){const n=new THREE.Mesh(sphere,mat);n.position.set(x*radius,y*radius,z*radius);n.scale.setScalar(s*radius);group.add(n);}return group;}
    function build(id){
        if(groups.has(id))return;const group=new THREE.Group();group.name='Trial '+id;layer.add(group);groups.set(id,group);
        if(id==='butterflies'){
            cup=new THREE.Group();cup.position.set(0,.068,.06);group.add(cup);
            const shell=new THREE.Mesh(new THREE.CylinderGeometry(.048,.068,.13,32,1,true),material('#c9e0d0'));cup.add(shell);mesh(new THREE.CylinderGeometry(.048,.048,.006,32),'#c9e0d0',0,.067,0,1,1,1,cup);
            const rim=mesh(new THREE.TorusGeometry(.068,.003,8,32),'#f5e4b8',0,-.065,0,1,1,1,cup);rim.rotation.x=Math.PI/2;
            void loadTrialButterflies().then(models=>{if(disposed){disposeModels(models);return;}insects=models;insects.forEach((insect,i)=>{insect.scale.setScalar(.042);insect.visible=false;group.add(insect);});onAssets();}).catch(error=>{console.warn('Trial butterflies:',error.stack || error.message);if(!disposed){group.userData.error='Butterfly model could not load. Reopen the preview to retry.';signature='';}});
        }
        if(id==='garden'){
            disk=new THREE.Group();disk.name='Trial empty Living Disk';disk.position.set(.08,.06,.02);group.add(disk);
            // The demo's round miniature, timber rim and plant geometry, with
            // its populated content removed and a new raised terrain surface.
            mesh(new THREE.CylinderGeometry(.28,.28,.035,64),'#68573e',0,-.016,0,1,1,1,disk);
            const terrain=new THREE.CircleGeometry(.276,64,12);terrain.rotateX(-Math.PI/2);
            // Concentric grid gives the mountain enough interior vertices.
            const positions=[],uv=[],indices=[],rings=18,steps=64;
            for(let r=0;r<=rings;r++)for(let a=0;a<=steps;a++){const angle=a*Math.PI*2/steps,x=.276*r/rings*Math.cos(angle),z=.276*r/rings*Math.sin(angle);positions.push(x,trialTerrainHeight(x,z),z);uv.push(x/.56+.5,z/.56+.5);if(r<rings && a<steps){const k=r*(steps+1)+a;indices.push(k,k+steps+1,k+1,k+1,k+steps+1,k+steps+2);}}
            terrain.dispose();const surface=new THREE.BufferGeometry();surface.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));surface.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));surface.setIndex(indices);surface.computeVertexNormals();
            const soilCanvas=document.createElement('canvas');soilCanvas.width=soilCanvas.height=256;const ctx=soilCanvas.getContext('2d');ctx.fillStyle='#819265';ctx.fillRect(0,0,256,256);for(let i=0;i<1800;i++){ctx.fillStyle=i%3?'#91a374':'#617b51';ctx.fillRect((i*73)%256,(i*131)%256,1+i%3,1+i%2);}const soilTexture=new THREE.CanvasTexture(soilCanvas);soilTexture.colorSpace=THREE.SRGBColorSpace;
            const land=new THREE.Mesh(surface,new THREE.MeshStandardMaterial({map:soilTexture,roughness:1,side:THREE.DoubleSide}));disk.add(land);disk.userData.surface=land;
            const rim=mesh(new THREE.TorusGeometry(.279,.003,6,64),'#c6c893',0,.005,0,1,1,1,disk);rim.rotation.x=Math.PI/2;
            cloud=cloudShape(group,.055,.38);cloud.position.set(-.04,.39,.06);
            wisps=Array.from({length:6},(_,i)=>{const w=cloudShape(group,.027,.26);w.position.set(-.30+(i%3)*.105,.22+Math.floor(i/3)*.12,.22);return {mesh:w,home:w.position.clone(),used:false};});
            deck=TRIAL_PLANT_CARDS.map((card,i)=>{const holder=new THREE.Group();holder.position.set(-.28+i*.14,.095,.36);holder.rotation.x=-.5;group.add(holder);const face=label(card.label,card.colour);holder.add(face);const seed=mesh(sphere,card.colour,0,0,0,.012,.018,.012,holder);seed.visible=false;return {mesh:holder,face,seed,card,home:holder.position.clone(),seeded:false};});
            plantSlots=Array.from({length:16},()=>{const p=new THREE.Group();disk.add(p);p.visible=false;const forms=TRIAL_PLANT_CARDS.map((card,i)=>{const form=new THREE.Group();p.add(form);detail.plant(form,i,{tree:card.tree,grass:card.id==='groundcover'});form.scale.setScalar(card.tree?.09:.055);form.visible=false;return form;});return {mesh:p,forms};});
            rain=Array.from({length:32},(_,i)=>{const drop=mesh(sphere,'#a7dcef',0,0,0,.0018,.008,.0018,group);drop.visible=false;return {mesh:drop,phase:i/32};});
        }
        if(id==='painting'){
            paint=createSpatialPaintV2({markings:true});paint.setBrush('earth');if(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)paint.setMotion(false);group.add(paint.root);
            paintTip=mesh(sphere,colours[0],0,.25,0,.007,.007,.007,group);paintTip.material=paintTip.material.clone();paintTip.visible=false;
            palette=new THREE.Group();palette.position.set(0,.08,.2);group.add(palette);colours.forEach((colour,i)=>mesh(sphere,colour,(i-2)*.065,0,0,.022,.012,.022,palette));
        }
        onAssets();
    }
    function disposeModels(models){const geometries=new Set(),mats=new Set(),maps=new Set();for(const model of models)model.traverse(n=>{if(n.geometry)geometries.add(n.geometry);if(n.material){mats.add(n.material);if(n.material.map)maps.add(n.material.map);}});geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());maps.forEach(t=>t.dispose());}
    function open(id){if(!state.open(id))return false;releaseAll();build(id);layer.visible=true;for(const [key,group] of groups)group.visible=key===id;onOpen();signature='';return true;}
    function close(){if(!state.active)return;releaseAll();state.close();layer.visible=false;onClose();signature='';}
    function command(id){
        if(id.startsWith('open:'))return open(id.slice(5));
        if(id.startsWith('mode:')){releaseAll();state.setMode(id.slice(5));}
        else if(id==='close')close();else if(id==='reset'){releaseAll();state.reset();resetVisuals();}
        else if(id==='dock'){releaseAll();diskDocked=!diskDocked;}
        else if(id==='brush' || id.startsWith('brush:')){releaseAll();const ids=Object.keys(MARKING_BRUSHES);paint?.setBrush(id==='brush'?ids[(ids.indexOf(paint.snapshot().brush)+1)%ids.length]:id.slice(6));}else if(id==='motion'){paint?.setMotion(!paint.snapshot().motion);}else if(id==='colour'){paint?.setColour((paint.snapshot().colour+1)%PAINT_V2_COLOURS.length);}else if(id==='width'){const current=paint.snapshot().width;paint.setWidth(PAINT_V2_WIDTHS[(PAINT_V2_WIDTHS.indexOf(current)+1)%PAINT_V2_WIDTHS.length]);}else if(id==='undo'){paint?.undo();state.undo();strokeBySource.clear();}else if(id==='redo'){const stroke=paint?.redo();if(stroke)state.addStroke(stroke);}else if(id==='save'){try{localStorage.setItem('nlxr.paint.demo.v2',JSON.stringify(paint.serialize()));groups.get('painting').userData.error='Drawing saved on this device.';}catch{groups.get('painting').userData.error='Drawing could not be saved on this device.';}}else if(id==='load'){try{paint.restore(JSON.parse(localStorage.getItem('nlxr.paint.demo.v2')));groups.get('painting').userData.error='Saved drawing loaded.';}catch(error){groups.get('painting').userData.error=error.message;}}
        else if(id==='clear'){paint?.clear();state.clearPaint();strokeBySource.clear();}
        signature='';return true;
    }
    function resetVisuals(){
        if(state.active==='butterflies' && cup){cup.position.set(0,.068,.06);insects.forEach(insect=>{insect.visible=false;insect.userData.emerged=false;});}
        if(state.active==='garden'){cloud.position.set(-.04,.39,.06);wisps.forEach(w=>{w.used=false;w.mesh.visible=true;w.mesh.position.copy(w.home);});deck.forEach(c=>{c.mesh.position.copy(c.home);c.seeded=false;c.face.visible=true;c.seed.visible=false;});diskDocked=true;disk.position.set(.08,.06,.02);disk.quaternion.identity();plantSlots.forEach(p=>p.mesh.visible=false);}
        if(state.active==='painting'){paint?.clear();strokeBySource.clear();}
    }
    function drawPanel(){
        const snap={...state.snapshot(),...(paint?.snapshot() || {})},error=groups.get(state.active)?.userData.error || (state.active==='painting' && paint?.snapshot().limited ? 'Drawing budget reached. Save, then clear or undo.' : ''),next=[snap.active,snap.mode,snap.cloudPieces,Math.round(snap.water*10),snap.plants.length,snap.strokes,snap.colour,snap.width,snap.brush,snap.motion,snap.canRedo,snap.limited,diskDocked,error].join('|');if(signature===next)return;signature=next;
        rows=WELCOME_TRIALS.map(t=>({id:'open:'+t.id,label:(snap.active===t.id?'● ':'')+t.label}));
        if(snap.active){rows.push(...['controllers','gloves','hands'].map((mode,i)=>({id:'mode:'+mode,label:(snap.mode===mode?'● ':'')+['Controllers','Virtual hands','Hand tracking'][i]})));if(snap.active==='garden')rows.push({id:'dock',label:diskDocked?'Carry disk on right hand':'Set disk on table'});if(snap.active==='painting')rows.push({id:'brush',label:(MARKING_BRUSHES[snap.brush]?.label || 'Earth marks')+' · change brush'},{id:'motion',label:snap.motion?'Motion: gentle · turn off':'Motion: still · turn on'},{id:'colour',label:'Colour: '+['Mint','Rose','Gold','Blue','White','Charcoal','Coral','Lavender'][snap.colour]},{id:'width',label:'Brush: '+Math.round(paint.snapshot().width*1000)+' mm'},{id:'undo',label:'Undo last stroke'},{id:'redo',label:'Redo stroke'},{id:'save',label:'Save drawing'},{id:'load',label:'Load saved drawing'},{id:'clear',label:'Clear painting'});rows.push({id:'reset',label:'Reset this trial'},{id:'close',label:'Return to tutorial'});}
        const ctx=canvas.getContext('2d');ctx.clearRect(0,0,900,1150);ctx.fillStyle='rgba(24,47,40,.96)';ctx.beginPath();ctx.roundRect(0,0,900,1150,40);ctx.fill();ctx.fillStyle='#eef3dc';ctx.font='bold 42px system-ui';ctx.textAlign='left';ctx.fillText('PLAY LAB · TRIALS',40,65);ctx.font='25px system-ui';ctx.fillText(snap.active?'Your lesson is waiting here.':'Load a trial whenever you like.',40,108);
        const rowHeight=Math.min(66,Math.floor((1150-140-165)/rows.length));rows.forEach((row,i)=>{row.top=140+i*rowHeight;row.bottom=row.top+rowHeight-9;ctx.fillStyle=row.id==='close'?'#6a8660':'#355c4a';ctx.beginPath();ctx.roundRect(24,row.top,852,rowHeight-9,18);ctx.fill();ctx.fillStyle='#f6f6e9';ctx.font='30px system-ui';ctx.fillText(row.label,43,row.top+(rowHeight>60?39:30),807);});
        const hints=snap.active==='butterflies'?['Lift the cup to release butterflies.','Close both fists: invite them to land.','Open your hands to let them fly.']:snap.active==='garden'?['Grab wisps; bring them into the cloud.','Hold a card; trigger / pinch to make a seed.','Release seeds onto the disk.','Cloud: grip + trigger, or close your fist.','Squeeze above planted seeds to grow them.']:snap.active==='painting'?[MARKING_BRUSHES[snap.brush]?.purpose || 'Make a marking in space.','Trigger / pinch to draw; release to finish.','Water · Vine · Earth · Firefly']:['Three optional experiments.','The guided tutorial stays unchanged.'];
        ctx.fillStyle='#d0dfc4';ctx.font='25px system-ui';hints.forEach((line,i)=>ctx.fillText(line,35,140+rows.length*rowHeight+40+i*34,830));if(error){ctx.fillStyle='#ffc7a5';ctx.fillText(error,35,1105,830);}texture.needsUpdate=true;
    }
    function panelPoint(point){panel.updateWorldMatrix(true,false);const p=point.clone().applyMatrix4(panel.matrixWorld.clone().invert());if(Math.abs(p.x)>.23 || Math.abs(p.y)>.294 || Math.abs(p.z)>.035)return null;const y=(.5-p.y/.588)*1150;return rows.find(row=>y>=row.top && y<=row.bottom)?.id || null;}
    function hit(ray){
        if(!panel.visible || !ray?.origin || !ray.direction)return null;root.updateMatrixWorld(true);const r=new THREE.Ray(v().copy(ray.origin),v().copy(ray.direction).normalize()),local=r.clone().applyMatrix4(root.matrixWorld.clone().invert());let best=null;
        const pick=(p,value)=>{if(!p)return;const worldPoint=p.clone().applyMatrix4(root.matrixWorld),distance=worldPoint.distanceTo(r.origin);if(!best || distance<best.distance)best={...value,point:p,worldPoint,distance};};
        const pr=r.clone().applyMatrix4(panel.matrixWorld.clone().invert()),p=pr.intersectPlane(new THREE.Plane(new THREE.Vector3(0,0,1),0),v());if(p){const world=p.clone().applyMatrix4(panel.matrixWorld),id=panelPoint(world);if(id)pick(world.applyMatrix4(root.matrixWorld.clone().invert()),{kind:'trial-control',id});}
        if(state.active)for(const target of targets()){if(!target.mesh.visible)continue;const radius=target.radius,p=local.intersectSphere(new THREE.Sphere(target.mesh.position,radius),v());pick(p,{kind:'trial-object',trialTarget:target});}
        if(state.active==='garden'){const cast=new THREE.Raycaster(r.origin,r.direction),p=cast.intersectObject(disk.userData.surface)[0];if(p)pick(p.point.clone().applyMatrix4(root.matrixWorld.clone().invert()),{kind:'trial-disk'});}
        return best;
    }
    function targets(){if(state.active==='butterflies')return [{id:'cup',mesh:cup,radius:.085}];if(state.active==='garden')return [{id:'cloud',mesh:cloud,radius:.11},...wisps.filter(w=>!w.used).map((w,i)=>({id:'wisp:'+i,mesh:w.mesh,radius:.055,wisp:w})),...deck.map(c=>({id:'card:'+c.card.id,mesh:c.mesh,radius:.09,card:c}))];return [];}
    function release(source,plantOnRelease=true){const held=holds.get(source);if(!held)return;holds.delete(source);if(held.target.card?.seeded){const card=held.target.card,diskPoint=disk.worldToLocal(root.localToWorld(card.mesh.position.clone()));if(plantOnRelease && Math.hypot(diskPoint.x,diskPoint.z)<.27 && diskPoint.y>-.04 && diskPoint.y<trialTerrainHeight(diskPoint.x,diskPoint.z)+.15){state.plant(card.card.id,diskPoint.x,diskPoint.z);onFeedback('plant',source);}card.mesh.position.copy(card.home);card.face.visible=true;card.seed.visible=false;card.seeded=false;}if(held.target.id==='cup')cup.position.y=Math.max(.068,cup.position.y);}
    function releaseAll(){for(const source of [...holds.keys()])release(source,false);edges.clear();strokeBySource.clear();paint?.endAll();}
    function update(dt,{inputs=[],visible=false,panelPose=null,paused=false}={}){
        panel.visible=visible;drawPanel();if(panelPose || getPanelPose()){
            const pose=panelPose || getPanelPose();if(pose?.center && pose.right && pose.up && pose.normal){const center=v().copy(pose.center).addScaledVector(pose.right,-((pose.width || .60)/2+.28));const m=new THREE.Matrix4().makeBasis(v().copy(pose.right),v().copy(pose.up),v().copy(pose.normal));m.setPosition(center);m.premultiply(root.matrixWorld.clone().invert());m.decompose(panel.position,panel.quaternion,panel.scale);}
        }
        if(!state.active)return;dt=paused?0:Math.min(.06,Math.max(0,dt));time+=dt;const inverse=root.matrixWorld.clone().invert();
        const eligible=inputs.filter(input=>Boolean(input.source.hand)===(state.mode==='hands') && input.matrix);
        for(const source of [...holds.keys()])if(!eligible.some(i=>i.source===source))release(source,false);
        for(const source of [...edges.keys()])if(!eligible.some(i=>i.source===source)){edges.delete(source);strokeBySource.delete(source);paint?.end(source);}
        if(paused){releaseAll();drawPanel();return;}
        for(const input of eligible){
            const {source}=input,pose=new THREE.Matrix4().fromArray(input.matrix).premultiply(inverse),point=v().setFromMatrixPosition(pose),previous=edges.get(source) || {down:false,trigger:false};let held=holds.get(source);
            if(consumedSelects.has(source)){consumedSelects.delete(source);edges.set(source,{down:!!input.down,trigger:!!input.trigger});continue;}
            const tip=input.tip?v().copy(input.tip):root.localToWorld(point.clone()),poke=panelPoint(tip);
            const rayHit=input.ray?hit(input.ray):null,control=rayHit?.kind==='trial-control';
            if(poke && previous.poke!==poke && !input.down){command(poke);edges.set(source,{down:!!input.down,trigger:!!input.trigger,poke});continue;}
            if(control && input.trigger && !previous.trigger){command(rayHit.id);edges.set(source,{down:!!input.down,trigger:!!input.trigger,poke});continue;}
            if(!state.active)break;
            if(input.down && !previous.down && !held && state.active!=='painting'){
                const occupied=new Set([...holds.values()].map(h=>h.target.mesh));const candidate=targets().filter(t=>t.mesh.visible && !occupied.has(t.mesh)).map(t=>({target:t,d:point.distanceTo(t.mesh.position)})).filter(t=>t.d<t.target.radius+.045).sort((a,b)=>a.d-b.d)[0];
                const target=candidate?.target || (state.mode==='controllers' && rayHit?.kind==='trial-object' && !occupied.has(rayHit.trialTarget.mesh)?rayHit.trialTarget:null);
                if(target){held={target,offset:target.mesh.position.clone().sub(point)};holds.set(source,held);onFeedback('grab',source);}
            }
            if(held && !input.down){release(source);held=null;}
            if(held){held.target.mesh.position.copy(point).add(held.offset);if(held.target.id==='cup' && cup.position.y>.17)state.releaseButterflies();
                if(held.target.wisp && held.target.mesh.position.distanceTo(cloud.position)<.12){if(state.merge()){held.target.wisp.used=true;held.target.mesh.visible=false;holds.delete(source);onFeedback('collect',source);}}
                const card=held.target.card;if(card && !card.seeded && (source.hand?input.trigger && !previous.trigger || eligible.some(other=>other.source!==source && other.trigger && v().setFromMatrixPosition(new THREE.Matrix4().fromArray(other.matrix).premultiply(inverse)).distanceTo(card.mesh.position)<.12):input.trigger && !previous.trigger)){card.seeded=true;card.face.visible=false;card.seed.visible=true;onFeedback('open',source);}
            }
            if(state.active==='painting'){
                paintTip.visible=true;paintTip.position.copy(input.tip ? v().copy(input.tip).applyMatrix4(inverse) : point);paintTip.material.color.set(PAINT_V2_COLOURS[paint.snapshot().colour]);
                if(input.down && !previous.down){const colour=palette.children.findIndex(n=>point.distanceTo(palette.position.clone().add(n.position))<.045);if(colour>=0){paint.setColour(colour);}}
                const paintPoint=input.tip?v().copy(input.tip).applyMatrix4(inverse):point;
                if(input.trigger && !control && !poke){
                    if(!paint.isDrawing(source)){const stroke=paint.begin(source,paintPoint);if(stroke){state.addStroke(stroke);strokeBySource.set(source,stroke);}}
                    else paint.add(source,paintPoint,dt);
                }else {paint.end(source);strokeBySource.delete(source);}

            }
            edges.set(source,{down:!!input.down,trigger:!!input.trigger,poke});
        }
        if(state.active==='butterflies'){
            const closed=eligible.filter(i=>i.source.hand?i.fist:i.down),both=closed.some(i=>i.source.handedness==='left') && closed.some(i=>i.source.handedness==='right'),snap=state.snapshot();
            insects.forEach((insect,i)=>{insect.visible=snap.released;if(!snap.released)return;let target;if(both){const input=closed[i%closed.length];target=v().setFromMatrixPosition(new THREE.Matrix4().fromArray(input.matrix).premultiply(inverse));target.y+=.045;target.x+=(i<2?-.014:.014);}else target=new THREE.Vector3(Math.sin(time*.65+i*1.57)*.26,.43+Math.sin(time*.9+i)*.065,.12+Math.cos(time*.6+i)*.14);if(!insect.userData.emerged){insect.position.copy(cup.position);insect.userData.emerged=true;}insect.position.lerp(target,1-Math.exp(-dt*(both?3:1.8)));insect.rotation.y=time*.5+i;insect.children.forEach(n=>{if(n.morphTargetInfluences)n.morphTargetInfluences[0]=both?.08:.5+.5*Math.sin(time*20+i);});});
        }
        if(state.active==='garden'){
            if(diskDocked){disk.position.set(.08,.06,.02);disk.quaternion.identity();}else{const right=eligible.find(i=>i.source.handedness==='right');if(right){disk.position.setFromMatrixPosition(new THREE.Matrix4().fromArray(right.matrix).premultiply(inverse));disk.position.y+=.06;disk.quaternion.identity();}}
            const snap=state.snapshot(),size=1+(snap.cloudPieces-1)*.16;const owner=[...holds].find(([,h])=>h.target.id==='cloud')?.[0],input=eligible.find(i=>i.source===owner),squeezing=Boolean(input && (input.source.hand?input.fist:input.trigger) && snap.water>0);cloud.scale.set(size*(squeezing?.86:1),size*(squeezing?.65:1),size);cloud.children.forEach(n=>n.material.opacity=.28+.055*snap.cloudPieces);
            const amount=squeezing?state.rain(dt):0;disk.updateWorldMatrix(true,true);const rainfall=disk.worldToLocal(root.localToWorld(cloud.position.clone()));
            for(const plant of state.plants)if(amount && rainfall.y>trialTerrainHeight(rainfall.x,rainfall.z) && Math.hypot(plant.x-rainfall.x,plant.z-rainfall.z)<.08*size)state.waterPlant(plant,amount);
            plantSlots.forEach((slot,i)=>{const plant=state.plants[i];slot.mesh.visible=Boolean(plant);if(!plant)return;slot.mesh.position.set(plant.x,trialTerrainHeight(plant.x,plant.z),plant.z);slot.mesh.scale.setScalar(plant.growth);slot.forms.forEach((f,j)=>f.visible=TRIAL_PLANT_CARDS[j].id===plant.card);});
            rain.forEach(({mesh:drop,phase},i)=>{drop.visible=squeezing;if(!squeezing)return;const fall=(time*1.8+phase)%1,angle=i*2.4,r=(.025+i%5*.008)*size;drop.position.set(cloud.position.x+Math.cos(angle)*r,cloud.position.y-fall*Math.max(.06,cloud.position.y-.035),cloud.position.z+Math.sin(angle)*r);});
        }
        if(state.active==='painting')paint.update(time);
        drawPanel();
    }
    return {state,layer,panel,open,close,command,update,hit,releaseAll,consumeSelect(source){if(source)consumedSelects.add(source);},isHolding:source=>holds.has(source) || strokeBySource.has(source),get active(){return state.active;},get mode(){return state.mode;},snapshot:()=>({...state.snapshot(),butterflyAssets:insects.length?'ready':groups.get('butterflies')?.userData.error?'error':'loading',diskDocked,paintSegments:paint?.snapshot().segments || 0,strokes:paint?.snapshot().strokes || 0,paint:paint?.snapshot()}),destroy(){disposed=true;releaseAll();paint?.destroy();}};
}
