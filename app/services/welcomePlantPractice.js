import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {GLTFLoader} from '../assets/fruit-window/vendor/GLTFLoader.js';
import {createPracticeBody,resetPracticeBody} from './welcomePracticePhysics.js';
import {welcomeWaterStream,welcomeWaterDrop} from './welcomeWaterStream.js';
import {createWelcomeStrawberryPlant} from './welcomeStrawberryPlant.js';

// A complete, deliberately accelerated strawberry cycle: packet to harvest.
export function createWelcomePlantPractice(root,{onAssets=()=>{}}={}){
    const pot=new THREE.Group();pot.name='WelcomeStrawberryPot';pot.position.set(0,0,-.08);root.add(pot);
    const material=colour=>new THREE.MeshStandardMaterial({color:colour,roughness:.85});
    const clay=material('#b9c7b1'),soil=material('#726552'),water=new THREE.MeshBasicMaterial({color:'#acd9df',transparent:true,opacity:.75,depthWrite:false});
    const wall=new THREE.Mesh(new THREE.CylinderGeometry(.077,.055,.09,32,1,true),clay);wall.position.y=.045;pot.add(wall);
    const lip=new THREE.Mesh(new THREE.TorusGeometry(.075,.005,6,32),clay);lip.rotation.x=Math.PI/2;lip.position.y=.094;pot.add(lip);
    const dirt=new THREE.Mesh(new THREE.CylinderGeometry(.069,.069,.008,32),soil);dirt.position.y=.081;pot.add(dirt);
    const targetMaterial=new THREE.MeshBasicMaterial({color:'#efdaac'}),target=new THREE.Mesh(new THREE.TorusGeometry(.03,.0018,5,24),targetMaterial);target.rotation.x=Math.PI/2;target.position.y=.087;pot.add(target);
    const packetBody=createPracticeBody('seed-packet',{x:-.24,z:.16,radius:.085,halfSize:{x:.054,y:.006,z:.072},bounce:.03}),seedBody=createPracticeBody('seed',{x:-.24,z:.16,radius:.008,halfSize:{x:.0013,y:.0008,z:.0007},bounce:.03}),canScale=1.18,canBody=createPracticeBody('watering-can',{x:.24,z:.17,radius:.075*canScale,halfSize:{x:.111*canScale,y:.05*canScale,z:.041*canScale},bounce:.08});
    const packet=new THREE.Group(),seed=new THREE.Group(),can=new THREE.Group();root.add(packet,seed,can);can.name='Metal watering can';can.scale.setScalar(canScale);
    const pouchMaterial=new THREE.MeshStandardMaterial({color:'#f0e8d1',roughness:.42,transparent:true,opacity:.94,depthWrite:true}),pouch=new THREE.Mesh(new THREE.BoxGeometry(.108,.01,.144),pouchMaterial);packet.add(pouch);
    const labelCanvas=document.createElement('canvas');labelCanvas.width=384;labelCanvas.height=512;const labelCtx=labelCanvas.getContext('2d'),labelTexture=new THREE.CanvasTexture(labelCanvas);labelTexture.colorSpace=THREE.SRGBColorSpace;
    const label=new THREE.Mesh(new THREE.PlaneGeometry(.098,.13),new THREE.MeshBasicMaterial({map:labelTexture,side:THREE.DoubleSide}));label.rotation.x=-Math.PI/2;label.position.y=.0055;packet.add(label);
    function paintLabel(image){labelCtx.fillStyle='#f6f0dc';labelCtx.fillRect(0,0,384,512);labelCtx.fillStyle='#456244';labelCtx.textAlign='center';labelCtx.font='500 31px system-ui';labelCtx.fillText('STRAWBERRY',192,54);labelCtx.font='24px system-ui';labelCtx.fillText('Seeds · Fragaria',192,91);if(image)labelCtx.drawImage(image,20,123,344,224);else {labelCtx.fillStyle='#bd4145';labelCtx.beginPath();labelCtx.moveTo(90,183);labelCtx.bezierCurveTo(120,119,252,119,283,183);labelCtx.bezierCurveTo(298,236,220,322,192,342);labelCtx.bezierCurveTo(164,322,77,233,90,183);labelCtx.fill();labelCtx.fillStyle='#617e47';labelCtx.fillRect(170,120,44,42);}labelCtx.fillStyle='#456244';labelCtx.font='23px system-ui';labelCtx.fillText('Open · sow · grow',192,411);labelCtx.font='20px system-ui';labelCtx.fillText('Tiny seeds. A new beginning.',192,452);labelTexture.needsUpdate=true;}
    paintLabel();const picture=new Image();picture.onload=()=>paintLabel(picture);picture.src=new URL('../assets/welcome-practice/strawberry-packet.jpg',import.meta.url).href;
    const seal=new THREE.Group();seal.position.set(0,.008,-.057);packet.add(seal);const sealStrip=new THREE.Mesh(new THREE.BoxGeometry(.11,.003,.022),new THREE.MeshBasicMaterial({color:'#d9bb79'}));sealStrip.position.z=-.007;seal.add(sealStrip);
    const kernel=new THREE.Mesh(new THREE.SphereGeometry(1,10,7),material('#bd9264'));kernel.scale.set(.0013,.0008,.0007);seed.add(kernel);
    const seedHint=new THREE.Mesh(new THREE.TorusGeometry(.009,.0008,5,24),new THREE.MeshBasicMaterial({color:'#e5c17c',transparent:true,opacity:.85}));seedHint.rotation.x=Math.PI/2;seedHint.position.y=.003;seed.add(seedHint);
    const steel=new THREE.MeshStandardMaterial({color:'#b8c5ca',metalness:.85,roughness:.26}),edge=new THREE.MeshStandardMaterial({color:'#83949d',metalness:.9,roughness:.2});
    const shell=new THREE.Mesh(new THREE.CylinderGeometry(.041,.035,.085,32),steel);can.add(shell);
    for(const [y,radius] of [[-.041,.035],[.042,.041]]){const rim=new THREE.Mesh(new THREE.TorusGeometry(radius,.0025,8,32),edge);rim.rotation.x=Math.PI/2;rim.position.y=y;can.add(rim);}
    const handle=new THREE.Mesh(new THREE.TorusGeometry(.04,.006,6,24,Math.PI*1.8),edge);handle.position.set(-.04,.004,0);handle.rotation.z=.3;can.add(handle);
    const spoutDirection=new THREE.Vector3(.074,.05,0).normalize(),spout=new THREE.Mesh(new THREE.CylinderGeometry(.011,.015,.09,16),steel);spout.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),spoutDirection);spout.position.set(.064,.012,0);can.add(spout);
    const tip=new THREE.Vector3(.101,.037,0).multiplyScalar(canScale),plant=createWelcomeStrawberryPlant();plant.group.position.y=.084;pot.add(plant.group);
    const harvestBodies=plant.fruitPositions.map((p,i)=>createPracticeBody('strawberry-'+i,{x:p.x,z:p.z-.08,radius:.024,halfSize:{x:.02,y:.022,z:.02},bounce:.08})),harvestObjects=harvestBodies.map(body=>{const group=new THREE.Group();root.add(group);const berry=new THREE.Mesh(new THREE.SphereGeometry(1,14,10),material('#c34b45'));berry.scale.set(.019,.024,.019);group.add(berry);return group;});
    const dropGeometry=new THREE.SphereGeometry(.003,6,4),drops=[];for(let i=0;i<8;i++){const drop=new THREE.Mesh(dropGeometry,water);drop.visible=false;root.add(drop);drops.push(drop);}
    const jetMaterial=new THREE.MeshBasicMaterial({color:'#b8e0e9',transparent:true,opacity:.6,depthWrite:false}),jetGeometry=new THREE.CylinderGeometry(.0017,.0022,1,6),jet=[];
    for(let i=0;i<12;i++){const segment=new THREE.Mesh(jetGeometry,jetMaterial);segment.name='Water stream segment';segment.visible=false;root.add(segment);jet.push(segment);}
    const rippleGeometry=new THREE.TorusGeometry(.016,.0008,4,20),ripples=[];
    for(let i=0;i<2;i++){const ripple=new THREE.Mesh(rippleGeometry,new THREE.MeshBasicMaterial({color:'#c8e9ed',transparent:true,opacity:0,depthWrite:false}));ripple.name='Water soil ripple';ripple.rotation.x=-Math.PI/2;ripple.visible=false;root.add(ripple);ripples.push(ripple);}
    const streamAxis=new THREE.Vector3(0,1,0),streamStart=new THREE.Vector3(),streamEnd=new THREE.Vector3(),streamDirection=new THREE.Vector3();let lastStream=null,flow=0;
    let opened=false,planted=false,poured=0,growTime=0,elapsed=0,pouring=false,openAt=-Infinity,plantAt=-Infinity,seedTaken=false,disposed=false,asset='loading';
    const loading=new GLTFLoader().loadAsync(new URL('../assets/welcome-practice/strawberry.glb',import.meta.url).href).then(gltf=>{
        if(disposed)return;const model=gltf.scene;model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),centre=bounds.getCenter(new THREE.Vector3()),factor=.045/Math.max(size.x,size.y,size.z),normalised=new THREE.Group();normalised.scale.setScalar(factor);normalised.position.copy(centre).multiplyScalar(-factor);normalised.add(model);
        for(const group of harvestObjects){for(const child of [...group.children]){child.geometry?.dispose();child.material?.dispose();}group.clear();group.add(normalised.clone(true));}asset='ready';onAssets();
    }).catch(error=>{asset='fallback';console.warn('Practice strawberry:',error.message);});
    function reset(){opened=false;planted=false;poured=0;growTime=0;pouring=false;flow=0;lastStream=null;seedTaken=false;openAt=plantAt=-Infinity;seedBody.anchored=true;harvestBodies.forEach(body=>{resetPracticeBody(body);body.anchored=true;body.plantAttached=true;});}
    reset();
    function openPacket(){if(opened)return false;opened=true;openAt=elapsed;return true;}
    function sealPoint(){return new THREE.Vector3(0,.015,-.055).applyQuaternion(new THREE.Quaternion(packetBody.rotation.x,packetBody.rotation.y,packetBody.rotation.z,packetBody.rotation.w)).add(new THREE.Vector3(packetBody.position.x,packetBody.position.y,packetBody.position.z));}
    function picked(body){if(body.id==='seed'){seedTaken=true;body.anchored=false;}if(body.id.startsWith('strawberry-') && body.plantAttached){body.plantAttached=false;body.anchored=false;return true;}return false;}
    function plantSeed(body){if(body.id!=='seed' || planted || !opened)return false;const p=body.position;if(Math.hypot(p.x-pot.position.x,p.z-pot.position.z)>.061 || p.y<.06 || p.y>.32)return false;planted=true;plantAt=elapsed;seedBody.visible=false;seedBody.anchored=true;return true;}
    function update(dt,phase){elapsed+=dt;const visible=['packet','seed','water','grow','harvest','explore'].includes(phase);pot.visible=visible;plant.group.visible=visible && poured>=1.2;target.visible=visible && (!planted || elapsed-plantAt<1);targetMaterial.color.set(elapsed-plantAt<1?'#ffe2a3':'#efdaac');
        packetBody.visible=visible && ['packet','seed','explore'].includes(phase);seedBody.visible=visible && opened && !planted && phase!=='packet';canBody.visible=visible && ['water','grow','harvest','explore'].includes(phase);seal.rotation.x=opened?-Math.min(1,(elapsed-openAt)/.7)*1.4:0;
        if(!seedTaken && opened){const q=new THREE.Quaternion(packetBody.rotation.x,packetBody.rotation.y,packetBody.rotation.z,packetBody.rotation.w),p=new THREE.Vector3(.015,.015,-.034).applyQuaternion(q).add(new THREE.Vector3(packetBody.position.x,packetBody.position.y,packetBody.position.z));Object.assign(seedBody.position,{x:p.x,y:p.y,z:p.z});}
        if(phase==='seed' && seedTaken && !seedBody.held && seedBody.position.y<=.089)plantSeed(seedBody);
        packet.visible=packetBody.visible;seed.visible=seedBody.visible;can.visible=canBody.visible;seedHint.visible=!seedBody.held;
        const wasPouring=pouring;pouring=false;if(visible && planted && poured<1.2 && canBody.held && ['water','explore'].includes(phase)){
            const q=new THREE.Quaternion(canBody.rotation.x,canBody.rotation.y,canBody.rotation.z,canBody.rotation.w),origin=tip.clone().applyQuaternion(q).add(new THREE.Vector3(canBody.position.x,canBody.position.y,canBody.position.z)),direction=spoutDirection.clone().applyQuaternion(q);
            const stream=welcomeWaterStream(origin,direction,pot.position,wasPouring);pouring=Boolean(stream);
            if(stream){lastStream=stream;poured=Math.min(1.2,poured+dt);}
        }
        flow=THREE.MathUtils.damp(flow,pouring?1:0,pouring?24:20,dt);const waterVisible=visible && lastStream && flow>.015;
        water.opacity=.75*flow;jetMaterial.opacity=.6*flow;
        drops.forEach((drop,i)=>{drop.visible=Boolean(waterVisible);if(!waterVisible)return;const p=welcomeWaterDrop(lastStream,(elapsed/lastStream.duration+i/drops.length)%1);drop.position.set(p.x,p.y,p.z);drop.scale.set(.65,1.6,.65);});
        jet.forEach((segment,i)=>{segment.visible=Boolean(waterVisible);if(!waterVisible)return;const a=welcomeWaterDrop(lastStream,i/jet.length),b=welcomeWaterDrop(lastStream,(i+1)/jet.length);streamStart.set(a.x,a.y,a.z);streamEnd.set(b.x,b.y,b.z);streamDirection.subVectors(streamEnd,streamStart);segment.position.copy(streamStart).add(streamEnd).multiplyScalar(.5);const length=streamDirection.length();segment.quaternion.setFromUnitVectors(streamAxis,streamDirection.divideScalar(Math.max(length,.000001)));const width=(1-i/jet.length*.3)*flow;segment.scale.set(width,length,width);});
        ripples.forEach((ripple,i)=>{ripple.visible=Boolean(waterVisible);if(!waterVisible)return;const t=(elapsed*1.8+i*.5)%1;ripple.position.set(lastStream.end.x,.088,lastStream.end.z);ripple.scale.setScalar(.4+t*1.6);ripple.material.opacity=(1-t)*flow*.65;});
        if(plant.group.visible){if(['grow','harvest','explore'].includes(phase))growTime=Math.min(12,growTime+dt);plant.update(growTime/12,elapsed);}
        harvestBodies.forEach((body,i)=>{body.visible=visible && growTime>7.5;const progress=THREE.MathUtils.smoothstep(growTime,7.5,12);if(body.plantAttached){body.anchored=true;const p=plant.fruitPositions[i];Object.assign(body.position,{x:p.x,y:p.y+.084,z:p.z-.08});}harvestObjects[i].scale.setScalar(body.plantAttached?Math.max(.001,progress):1);});
    }
    return {bodies:[packetBody,seedBody,canBody,...harvestBodies],objects:new Map([['seed-packet',packet],['seed',seed],['watering-can',can],...harvestBodies.map((b,i)=>[b.id,harvestObjects[i]])]),harvestBodies,loading,openPacket,sealPoint,picked,plant:plantSeed,update,reset,previewPhase(phase){if(['seed','water','grow','harvest'].includes(phase))opened=true;if(['water','grow','harvest'].includes(phase)){planted=true;seedBody.visible=false;poured=['grow','harvest'].includes(phase)?1.2:0;growTime=phase==='harvest'?12:0;}},get opened(){return opened;},get planted(){return planted;},get watered(){return poured>=1.2;},get grown(){return growTime>=12;},get pouring(){return pouring;},snapshot:()=>({opened,planted,water:poured/1.2,grown:growTime>=12,pouring,strawberry:asset,harvested:harvestBodies.filter(b=>!b.plantAttached).length}),destroy(){disposed=true;picture.onload=null;}};
}
