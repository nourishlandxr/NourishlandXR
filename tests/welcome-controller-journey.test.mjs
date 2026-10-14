import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {createWelcomePracticeScene} from '../app/services/welcomePracticeScene.js';
import {playWelcomePracticeFeedback} from '../app/services/welcomePracticeFeedback.js';
import {welcomeHandMagicProgress,welcomeControllerMagicPlane} from '../app/services/welcomeControllerMagic.js';
import {welcomeControllerLaserEnd} from '../app/services/welcomeControllerLaser.js';

async function withAssets(run){
    const saved={document:globalThis.document,Image:globalThis.Image,fetch:globalThis.fetch,createImageBitmap:globalThis.createImageBitmap,self:globalThis.self};
    const requests=[],context=new Proxy({measureText:text=>({width:text.length*18}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(target,key)=>target[key] || (()=>{})});
    globalThis.document={createElement:()=>({getContext:()=>context})};globalThis.Image=class {set src(value){requests.push(value);}};
    globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:64,height:64,close(){}});
    globalThis.fetch=async request=>{const url=request.url || String(request);requests.push(url);if(url.startsWith('blob:'))return saved.fetch(request);const bytes=fs.readFileSync(new URL(url));return {ok:true,status:200,statusText:'OK',url,headers:new Headers(),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),json:async()=>JSON.parse(bytes.toString())};};
    try{await run(requests);}finally{await new Promise(resolve=>setTimeout(resolve,30));Object.assign(globalThis,saved);}
}
const settle=async predicate=>{for(let i=0;i<100 && !predicate();i++)await new Promise(resolve=>setTimeout(resolve,5));assert.ok(predicate(),'bundled controllers must be ready');};

test('real controller poses start with skins only, extend lasers, select Zinnia, then reveal hands before any fruit request',()=>withAssets(async requests=>{
    const feedback=[],spoken=[],voice={status:()=>({playing:false,paused:false,available:true,muted:false}),speak:value=>spoken.push(value),stop(){},unlock(){},pause(){},resume(){}};
    const stage=createWelcomePracticeScene({voice,embedded:true,onFeedback:(kind,source,intensity)=>feedback.push({kind,source,intensity})});
    try{
        await stage.loading;await settle(()=>stage.snapshot().controllerGuide.filter(e=>e.ready).length===2);
        const viewer=new THREE.Matrix4().makeTranslation(0,1.6,0).elements;
        const inputs=['left','right'].map((handedness,i)=>({source:{handedness,profiles:['meta-quest-touch-plus'],gamepad:{buttons:Array.from({length:6},()=>({pressed:false,value:0})),axes:[0,0,0,0]}},matrix:new THREE.Matrix4().makeTranslation(i?.25:-.25,1.15,-.35).elements,down:false,trigger:false}));
        const tick=seconds=>{for(let i=0;i<Math.ceil(seconds/.05);i++)stage.update(.05,{viewer,floor:0,controllers:inputs,inputs});};
        stage.start(viewer,0);tick(.1);assert.equal(stage.controllerLasersVisible,false);assert.equal(stage.controllerHandsVisible,false);assert.equal(stage.snapshot().controllerGuide.filter(e=>e.visible && e.tool==='standard').length,2);
        const fruitRequests=()=>requests.filter(url=>/fruits\/|strawberry\.glb|strawberry-packet\.jpg|dragonfly\.glb/.test(url));
        assert.deepEqual(fruitRequests(),[]);
        stage.previewLesson('controls-trigger');tick(.05);for(const entry of stage.snapshot().controllerGuide.filter(e=>e.visible)){assert.equal(entry.labelScale,1);assert.ok(entry.connectorLength>0 && entry.connectorLength<.24);assert.deepEqual(entry.pose,inputs.find(i=>i.source.handedness===entry.id.split('/')[1]).matrix,'skin uses the current grip pose directly');}inputs[0].trigger=true;tick(.05);inputs[1].trigger=true;tick(.05);
        assert.equal(feedback.filter(f=>f.kind==='step').length,2);assert.equal(stage.snapshot().completed,true);tick(2);assert.equal(stage.phase,'controls-grip');assert.equal(stage.zinniaMount.parent.visible,true);
        stage.previewLesson('laser-intro');tick(.7);assert.ok(stage.controllerLaserProgress>0 && stage.controllerLaserProgress<1);assert.equal(stage.controllerHandsVisible,false);assert.equal(stage.snapshot().settingsAvailable,true);assert.equal(feedback.filter(f=>f.kind==='magic').length,2);
        stage.previewLesson('laser-zinnia');tick(.1);const eye=stage.zinniaMount.getObjectByName('Eye_L_expression'),point=new THREE.Box3().setFromObject(eye).getCenter(new THREE.Vector3()),ray={origin:{x:point.x,y:point.y,z:point.z+.45},direction:{x:0,y:0,z:-1}};
        assert.equal(stage.hit(ray)?.kind,'zinnia');assert.equal(stage.select(ray,inputs[1].source),true);assert.equal(stage.snapshot().laserConfirmed,true);assert.equal(stage.zinniaMount.children[0].userData.zinnia.touch.snapshot().reaction,'tickle');
        stage.select(ray,inputs[1].source);assert.equal(feedback.filter(f=>f.kind==='step').length,3,'one selection produces one success');tick(1.3);assert.equal(stage.phase,'comfort');tick(.4);assert.equal(stage.controllerLasersVisible,false);
        stage.previewLesson('virtual-hands-reveal');tick(.9);const first=stage.controllerHandReveal;assert.ok(first.left>0 && first.left<1);assert.equal(first.right,0);assert.equal(stage.controllerLasersVisible,false);assert.equal(stage.objects.get('peach').visible,false);assert.deepEqual(fruitRequests(),[]);
        const frozen={...stage.controllerHandReveal};stage.button('pause');tick(1);assert.deepEqual(stage.controllerHandReveal,frozen);stage.button('pause');tick(5.2);assert.deepEqual(stage.controllerHandReveal,{left:1,right:1});assert.ok(feedback.some(f=>f.kind==='magic-charge'));assert.equal(stage.snapshot().controllerGuide.filter(e=>e.visible).length,0);
        tick(2);assert.equal(stage.phase,'gloves');inputs.forEach(input=>{input.trigger=false;input.down=false;});tick(.05);inputs.forEach(input=>input.down=true);tick(.05);assert.equal(stage.snapshot().completed,false,'both hands must open again');inputs.forEach(input=>input.down=false);tick(.05);assert.equal(stage.snapshot().completed,true);tick(2);assert.equal(stage.phase,'basket');assert.ok(fruitRequests().length>0);
    }finally{stage.destroy();}
}));

test('the magic front stays in grip space when the controller rotates, and the right reveal follows the left',()=>{
    const matrix=new THREE.Matrix4().makeRotationZ(.8).setPosition(.2,1,-.4),plane=welcomeControllerMagicPlane(matrix.elements,-.12,.05);
    for(const [y,expected] of [[-.12,0],[.05,1]]){const p=new THREE.Vector3(0,y,0).applyMatrix4(matrix);assert.ok(Math.abs(plane[0]*p.x+plane[1]*p.y+plane[2]*p.z+plane[3]-expected)<1e-6);}
    assert.equal(welcomeHandMagicProgress(0,'left'),0);assert.equal(welcomeHandMagicProgress(.8,'right'),0);assert.ok(welcomeHandMagicProgress(1,'left')>welcomeHandMagicProgress(1,'right'));assert.equal(welcomeHandMagicProgress(6,'right'),1);
    const ray={origin:{x:.1,y:1,z:0},direction:{x:0,y:0,z:-1}};assert.deepEqual(welcomeControllerLaserEnd(ray,null,0),ray.origin);assert.equal(welcomeControllerLaserEnd(ray,null,.5).z,-1.25);assert.equal(welcomeControllerLaserEnd(ray,{x:.1,y:1,z:-1},1).z,-1);
});

test('each accepted button step gets its own success tone and tap; magic gets strong bounded haptics',()=>{
    const sounds=[],pulses=[],source={gamepad:{}},feedback={sound:kind=>sounds.push(kind),pulse:(...args)=>pulses.push(args)};
    playWelcomePracticeFeedback(feedback,'step',source);playWelcomePracticeFeedback(feedback,'step',source);playWelcomePracticeFeedback(feedback,'lesson',source);playWelcomePracticeFeedback(feedback,'magic-charge',source,.8);playWelcomePracticeFeedback(feedback,'magic',source);
    assert.deepEqual(sounds,['practice-success','practice-success','practice-reward','practice-magic']);assert.equal(pulses.length,5);assert.equal(pulses[0][1],.45);assert.equal(pulses[2][1],.65);assert.ok(pulses[3][1]>.8);assert.deepEqual(pulses[4],[source,.95,190]);
});


test('fresh startup reaches the table and Zinnia before buttons, with no fruit downloads',()=>withAssets(async requests=>{
 const phases=[],voice={status:()=>({playing:false,paused:false,muted:true}),speak(){},stop(){}};
 const stage=createWelcomePracticeScene({voice,embedded:true,onChange:state=>{if(phases.at(-1)!==state.phase)phases.push(state.phase);}});
 try{await stage.loading;const viewer=new THREE.Matrix4().makeTranslation(0,1.6,0).elements;stage.start(viewer,0);
 for(let i=0;i<2400 && stage.phase!=='visitor-intro';i++)stage.update(.05,{viewer,floor:0,frameReady:true});
 assert.equal(stage.phase,'visitor-intro');assert.deepEqual(phases.filter(id=>!['frame'].includes(id)),['title','arrival','table','face','zinnia','living-frame','controls-intro','visitor-intro']);
 assert.equal(stage.zinniaMount.parent.visible,true);assert.ok(stage.root.children.some(child=>child.visible && child.name.toLowerCase().includes('table')));
 assert.equal(stage.controllerLasersVisible,false);assert.equal(stage.snapshot().settingsAvailable,false);assert.equal(requests.some(url=>/fruit-collection/.test(url)),true,'preload fruit during conversation');
 }finally{stage.destroy();}
}));


test('controller Orb walkthrough uses grip, trigger, face pairs and sticks without new speech or PIMO',()=>withAssets(async()=>{
 const spoken=[],voice={status:()=>({playing:false,paused:false,available:true}),speak:value=>{if(value)spoken.push(value);},stop(){},unlock(){}};
 const stage=createWelcomePracticeScene({voice,embedded:true});
 try{await stage.loading;await settle(()=>stage.snapshot().controllerGuide.filter(e=>e.ready).length===2);
 const viewer=new THREE.Matrix4().makeTranslation(0,1.6,0).elements,inputs=['left','right'].map((handedness,i)=>({source:{handedness,profiles:['meta-quest-touch-plus'],gamepad:{buttons:Array.from({length:6},()=>({pressed:false,value:0})),axes:[0,0,0,0]}},matrix:new THREE.Matrix4().makeTranslation(i?.25:-.25,1.15,-.35).elements,down:false,trigger:false}));
 const tick=seconds=>{for(let i=0;i<Math.ceil(seconds/.05);i++)stage.update(.05,{viewer,floor:0,controllers:inputs,inputs});};
 stage.start(viewer,0);stage.previewLesson('controls-trigger');spoken.length=0;tick(.1);inputs.forEach(i=>i.trigger=true);tick(.05);assert.equal(stage.snapshot().completed,true);assert.equal(stage.snapshot().controllerGuide.some(e=>e.visible && e.labelVisible),false);inputs.forEach(i=>i.trigger=false);tick(1.2);
 assert.equal(stage.phase,'controls-grip');tick(.05);inputs.forEach(i=>i.down=true);tick(.05);inputs.forEach(i=>i.down=false);tick(1.2);assert.equal(stage.phase,'controls-orb-grab');tick(.1);
 const point=new THREE.Vector3(...stage.snapshot().controlOrb.position);stage.root.localToWorld(point);inputs[1].matrix=new THREE.Matrix4().makeTranslation(point.x,point.y,point.z).elements;tick(.1);inputs[1].down=true;tick(.1);inputs[1].matrix=new THREE.Matrix4().makeTranslation(point.x+.13,point.y+.1,point.z).elements;tick(.1);inputs[1].down=false;tick(1.3);assert.equal(stage.phase,'controls-orb-open');assert.equal(stage.snapshot().controlOrb.moved,true);tick(.1);inputs[1].trigger=true;tick(.1);inputs[1].trigger=false;tick(1.2);assert.equal(stage.phase,'controls-face-first');
 for(const [index,phase,colour] of [[4,'controls-face-second',1],[5,'controls-stick',2]]){tick(.1);inputs.forEach(i=>i.source.gamepad.buttons[index]={pressed:true,value:1});tick(.1);assert.equal(stage.snapshot().controlOrb.colour,colour);inputs.forEach(i=>i.source.gamepad.buttons[index]={pressed:false,value:0});tick(1.2);assert.equal(stage.phase,phase);}
 for(const [x,y]of [[.8,.8],[-.8,.8],[-.8,-.8],[.8,-.8]]){inputs.forEach(i=>i.source.gamepad.axes=[0,0,x,y]);tick(.15);}assert.ok(stage.snapshot().controlOrb.rotation>0);inputs.forEach(i=>i.source.gamepad.axes=[0,0,0,0]);tick(1.2);assert.equal(stage.phase,'controls-stick-click');assert.deepEqual(spoken,[]);
 stage.previewLesson('settings-open');tick(.1);const labels=stage.snapshot().controllerGuide.filter(e=>e.labelVisible);assert.equal(labels.length,1);assert.match(labels[0].id,/right/);
 }finally{stage.destroy();}
}));

test('tutorial speech waits for completed reveals and renderer readiness',()=>withAssets(async()=>{
 const spoken=[],voice={status:()=>({playing:false,paused:false,available:true}),speak:value=>{if(value)spoken.push(value);},stop(){}};
 const stage=createWelcomePracticeScene({voice,embedded:true});
 try{await stage.loading;const viewer=new THREE.Matrix4().makeTranslation(0,1.6,0).elements;stage.start(viewer,0);stage.previewLesson('table');spoken.length=0;
 for(let i=0;i<130;i++)stage.update(.05,{viewer,floor:0,presentationReady:false});assert.deepEqual(spoken,[]);assert.equal(stage.phase,'table');assert.equal(stage.snapshot().waitingForPresentation,true);
 stage.update(.05,{viewer,floor:0,presentationReady:true});assert.equal(spoken.at(-1).id,'table');assert.equal(stage.snapshot().waitingForPresentation,false);
 stage.previewLesson('face');spoken.length=0;for(let i=0;i<45;i++)stage.update(.05,{viewer,floor:0,presentationReady:true});assert.deepEqual(spoken,[],'Zinnia remains silent during her 2.4-second spawn');
 for(let i=0;i<20;i++)stage.update(.05,{viewer,floor:0,presentationReady:true});assert.equal(spoken.at(-1).id,'face','introduction starts after the glow and settling pause');
 stage.previewLesson('basket');await stage.loadPracticeAssets();spoken.length=0;for(let i=0;i<25;i++)stage.update(.05,{viewer,floor:0,presentationReady:true});assert.deepEqual(spoken,[]);
 for(let i=0;i<50;i++)stage.update(.05,{viewer,floor:0,presentationReady:true});assert.equal(spoken.at(-1).id,'basket');assert.ok(stage.objects.get('peach').visible,'real fruit is pickable once models are ready');
 }finally{stage.destroy();}
}));


test('welcome screen and rim share a prepared fade before the tutorial introduction',()=>withAssets(async()=>{
 const voice={status:()=>({playing:false,paused:false,muted:true}),speak(){},stop(){}};const stage=createWelcomePracticeScene({voice,embedded:true});
 try{await stage.loading;assert.equal(stage.root.getObjectByName('Fruit selection highlight').visible,false);assert.equal(stage.root.getObjectByName('Dragonfly landing marker').visible,false);const viewer=new THREE.Matrix4().makeTranslation(0,1.6,0).elements;stage.start(viewer,0);const tick=(n,options={})=>{for(let i=0;i<n;i++)stage.update(.05,{viewer,floor:0,...options});};
 tick(60,{frameReady:false});assert.equal(stage.snapshot().frameOpacity,0);assert.equal(stage.snapshot().title,'Welcome to NourishlandXR');tick(10,{frameReady:true,presentationReady:false});assert.equal(stage.snapshot().frameOpacity,0);tick(12);assert.ok(stage.snapshot().frameOpacity>0 && stage.snapshot().frameOpacity<1);tick(25);assert.equal(stage.snapshot().frameOpacity,1);assert.equal(stage.phase,'title');tick(100);assert.equal(stage.phase,'arrival');assert.equal(stage.snapshot().title,'Your hands tutorial');
 stage.previewLesson('table');assert.equal(stage.snapshot().title,'');tick(100);assert.equal(stage.snapshot().title,'Your practice table');assert.ok(stage.root.getObjectByName('Welcome practice table white arrival glow').visible===false);
 stage.previewLesson('face');assert.equal(stage.snapshot().title,'');tick(100);assert.equal(stage.snapshot().title,'Meet Zinnia');assert.ok(stage.snapshot().caption);
 }finally{stage.destroy();}
}));


test('basket speech waits through slow fruit download and a fresh renderer revision',()=>withAssets(async()=>{
 let release;const gate=new Promise(done=>release=done),spoken=[];const stage=createWelcomePracticeScene({embedded:true,voice:{status:()=>({playing:false}),speak:value=>{if(value)spoken.push(value.id);},stop(){}},loadFruit:async()=>{await gate;return {scene:new THREE.Mesh(new THREE.SphereGeometry(.05,8,6),new THREE.MeshBasicMaterial())};}});
 try{await stage.loading;const viewer=new THREE.Matrix4().makeTranslation(0,1.6,0).elements;stage.start(viewer,0);stage.previewLesson('basket');for(let i=0;i<300;i++)stage.update(.05,{viewer,floor:0});assert.equal(stage.phase,'basket');assert.equal(spoken.includes('basket'),false);assert.equal(stage.objects.get('peach').visible,false);release();await stage.loadPracticeAssets();const oldRevision=stage.snapshot().sceneRevision;for(let i=0;i<80;i++)stage.update(.05,{viewer,floor:0,renderRevision:oldRevision});assert.ok(stage.snapshot().sceneRevision>oldRevision);assert.equal(spoken.includes('basket'),false,'newly visible fruit must be included in renderer');stage.update(.05,{viewer,floor:0,renderRevision:stage.snapshot().sceneRevision});assert.equal(spoken.at(-1),'basket');assert.equal(stage.objects.get('peach').visible,true);}
 finally{release();stage.destroy();}
}));


test('basket rim contact releases held fruit once and waits for a fresh grip',()=>withAssets(async()=>{
 const feedback=[],stage=createWelcomePracticeScene({embedded:true,voice:{status:()=>({playing:false,muted:true}),speak(){},stop(){}},onFeedback:kind=>feedback.push(kind),loadFruit:async()=>({scene:new THREE.Mesh(new THREE.SphereGeometry(.05,8,6),new THREE.MeshBasicMaterial())})});
 try{await stage.loading;const viewer=new THREE.Matrix4().makeTranslation(0,1.6,0).elements;stage.start(viewer,0);stage.previewLesson('grab');await stage.loadPracticeAssets();stage.update(.05,{viewer,floor:0});const body=stage.bodies.filter(b=>b.fruit).sort((a,b)=>(b.position.y+b.support)-(a.position.y+a.support))[0],source={handedness:'right'};const input=(point,down)=>{stage.root.updateMatrixWorld(true);const matrix=stage.root.matrixWorld.clone().multiply(new THREE.Matrix4().makeTranslation(point.x,point.y,point.z)).elements;stage.update(.05,{viewer,floor:0,inputs:[{source,matrix,down,trigger:false}]});};
 const start={...body.position};input(start,false);input(start,true);assert.equal(stage.isHolding(source),true);input({...start,y:.65},true);input({x:.735,y:.65,z:-.16},true);input({x:.735,y:.06,z:-.16},true);assert.equal(stage.isHolding(source),false);assert.ok(body.position.y-body.support>=.10);assert.equal(feedback.filter(kind=>kind==='basket-contact').length,1);input(body.position,true);assert.equal(stage.isHolding(source),false,'held grip cannot reacquire a blocked fruit');}
 finally{stage.destroy();}
}));
