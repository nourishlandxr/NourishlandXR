import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {createWelcomePracticeScene} from '../app/services/welcomePracticeScene.js';
import {playWelcomePracticeFeedback} from '../app/services/welcomePracticeFeedback.js';
import {welcomeHandMagicProgress,welcomeControllerMagicPlane} from '../app/services/welcomeControllerMagic.js';
import {welcomeControllerLaserEnd} from '../app/services/welcomeControllerLaser.js';
import {WELCOME_PRACTICE_LESSONS,WELCOME_PRACTICE_RESPONSES} from '../app/services/welcomePracticeContent.js';

async function withAssets(run){
    const saved={document:globalThis.document,Image:globalThis.Image,fetch:globalThis.fetch,createImageBitmap:globalThis.createImageBitmap,self:globalThis.self};
    const requests=[],context=new Proxy({measureText:text=>({width:text.length*18}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(target,key)=>target[key] || (()=>{})});
    globalThis.document={createElement:()=>({getContext:()=>context})};globalThis.Image=class {set src(value){requests.push(value);}};
    globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:64,height:64,close(){}});
    globalThis.fetch=async request=>{const url=request.url || String(request);requests.push(url);if(url.startsWith('blob:'))return saved.fetch(request);const bytes=fs.readFileSync(new URL(url));return {ok:true,status:200,statusText:'OK',url,headers:new Headers(),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),json:async()=>JSON.parse(bytes.toString())};};
    try{await run(requests);}finally{await new Promise(resolve=>setTimeout(resolve,30));Object.assign(globalThis,saved);}
}
const settle=async predicate=>{for(let i=0;i<100 && !predicate();i++)await new Promise(resolve=>setTimeout(resolve,5));assert.ok(predicate(),'bundled controllers must be ready');};

test('controller practice uses brief on-screen instructions while reveal effects stay silent',()=>{
    const quiet=['frame','table-reveal','zinnia-reveal','virtual-hands-reveal','basket-reveal','practice-ready','controls-stick','controls-stick-click','butterflies'];
    for(const lesson of WELCOME_PRACTICE_LESSONS)if(quiet.includes(lesson.id))assert.equal(lesson.silent,true,lesson.id);else{assert.ok(lesson.spoken?.trim(),lesson.id);assert.notEqual(lesson.silent,true,lesson.id);}
    assert.match(WELCOME_PRACTICE_LESSONS.find(l=>l.id==='controls-orb-grab').spoken,/expandable Orb/);
    assert.match(WELCOME_PRACTICE_LESSONS.find(l=>l.id==='settings-open').spoken,/left thumbstick/);
    for(const id of ['controls-intro','controls-trigger','controls-grip','controls-face'])assert.equal(WELCOME_PRACTICE_LESSONS.find(l=>l.id===id).optional,true);
    for(const id of ['controls-stick','controls-stick-click'])assert.ok(WELCOME_PRACTICE_LESSONS.find(l=>l.id===id).caption);
    assert.doesNotMatch(WELCOME_PRACTICE_RESPONSES.find(l=>l.id==='controls-stick-done').spoken,/flying/);
});

test('thumbstick instruction stays on screen without delaying the next interaction',()=>withAssets(async()=>{
    let playing=false;const spoken=[],voice={status:()=>({playing,available:true,paused:false}),speak:value=>{if(value){spoken.push(value);playing=true;}},stop(){playing=false;},unlock(){}};
    const stage=createWelcomePracticeScene({voice,embedded:true});
    try{
        await stage.loading;const viewer=new THREE.Matrix4().makeTranslation(0,1.6,0).elements,inputs=['left','right'].map((handedness,i)=>({source:{handedness,gamepad:{axes:[0,0,0,0],buttons:Array.from({length:6},()=>({pressed:false}))}},matrix:new THREE.Matrix4().makeTranslation(i?.2:-.2,1.1,-.3).elements}));
        const tick=(n=1,options={})=>{for(let i=0;i<n;i++)stage.update(.05,{viewer,floor:0,inputs,controllers:inputs,...options});};
        stage.start(viewer,0);stage.previewLesson('controls-stick');spoken.length=0;tick(8,{presentationReady:false});assert.deepEqual(spoken,[]);tick(5);assert.equal(stage.phase,'controls-stick');assert.match(stage.snapshot().caption,/Orb/);
        for(const [x,y] of [[.8,.8],[-.8,.8],[-.8,-.8],[.8,-.8]]){inputs[1].source.gamepad.axes=[0,0,x,y];tick();}tick(30);assert.deepEqual(spoken,[],'stick practice does not queue another voice explanation');
        stage.previewLesson('laser-intro');spoken.length=0;tick(25);assert.deepEqual(spoken,[],'laser extension is silent');tick(12);assert.equal(spoken.at(-1).id,'laser-intro');
        stage.previewLesson('virtual-hands-reveal');spoken.length=0;tick(20);assert.deepEqual(spoken,[],'hand spawn is silent');
    }finally{stage.destroy();}
}));

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
        stage.previewLesson('controls-trigger');tick(.25);assert.equal(stage.snapshot().controllerGuide.filter(e=>e.labelVisible).length,1,'only the current button gets a balloon');for(const entry of stage.snapshot().controllerGuide.filter(e=>e.labelVisible)){assert.ok(entry.labelScale>0 && entry.labelScale<=1);assert.ok(entry.connectorLength>0 && entry.connectorLength<.5);assert.deepEqual(entry.pose,inputs.find(i=>i.source.handedness===entry.id.split('/')[1]).matrix,'skin uses the current grip pose directly');}inputs[0].trigger=true;tick(.05);inputs[1].trigger=true;tick(.05);
        assert.equal(feedback.filter(f=>f.kind==='step').length,2);assert.equal(stage.snapshot().completed,true);tick(2);assert.equal(stage.phase,'controls-orb-grab');assert.equal(stage.zinniaMount.parent.visible,true);
        stage.previewLesson('laser-intro');tick(.7);assert.ok(stage.controllerLaserProgress>0 && stage.controllerLaserProgress<1);assert.equal(stage.controllerHandsVisible,false);assert.equal(stage.snapshot().settingsAvailable,true);assert.equal(feedback.filter(f=>f.kind==='magic').length,2);
        stage.previewLesson('laser-zinnia');tick(.1);const eye=stage.zinniaMount.getObjectByName('Eye_L_expression'),point=new THREE.Box3().setFromObject(eye).getCenter(new THREE.Vector3()),ray={origin:{x:point.x,y:point.y,z:point.z+.45},direction:{x:0,y:0,z:-1}};
        assert.equal(stage.hit(ray)?.kind,'zinnia');assert.equal(stage.select(ray,inputs[1].source),true);assert.equal(stage.snapshot().laserConfirmed,true);assert.equal(stage.zinniaMount.children[0].userData.zinnia.touch.snapshot().reaction,'tickle');
        stage.select(ray,inputs[1].source);assert.equal(feedback.filter(f=>f.kind==='step').length,3,'one selection produces one success');tick(3);assert.equal(stage.phase,'comfort');tick(.4);assert.equal(stage.controllerLasersVisible,false);
        stage.previewLesson('virtual-hands-reveal');tick(.9);const first=stage.controllerHandReveal;assert.ok(first.left>0 && first.left<1);assert.equal(first.right,first.left);assert.equal(stage.controllerLasersVisible,false);assert.equal(stage.objects.get('peach').visible,false);assert.deepEqual(fruitRequests(),[]);
        const frozen={...stage.controllerHandReveal};stage.button('pause');tick(1);assert.deepEqual(stage.controllerHandReveal,frozen);stage.button('pause');tick(5.2);assert.deepEqual(stage.controllerHandReveal,{left:1,right:1});assert.ok(feedback.some(f=>f.kind==='magic-charge'));assert.equal(stage.snapshot().controllerGuide.filter(e=>e.visible).length,0);
        tick(2);assert.equal(stage.phase,'gloves');inputs.forEach(input=>{input.trigger=false;input.down=false;});tick(.05);inputs.forEach(input=>input.down=true);tick(.05);assert.equal(stage.snapshot().completed,false,'both hands must open again');inputs.forEach(input=>input.down=false);tick(.05);assert.equal(stage.snapshot().completed,true);tick(2);assert.equal(stage.phase,'basket');assert.ok(requests.some(url=>/fruit-collection|banana.glb/.test(url)));
    }finally{stage.destroy();}
}));

test('the magic front stays in grip space when the controller rotates, and both hands reveal together',()=>{
    const matrix=new THREE.Matrix4().makeRotationZ(.8).setPosition(.2,1,-.4),plane=welcomeControllerMagicPlane(matrix.elements,-.12,.05);
    for(const [y,expected] of [[-.12,0],[.05,1]]){const p=new THREE.Vector3(0,y,0).applyMatrix4(matrix);assert.ok(Math.abs(plane[0]*p.x+plane[1]*p.y+plane[2]*p.z+plane[3]-expected)<1e-6);}
    assert.equal(welcomeHandMagicProgress(0,'left'),0);assert.equal(welcomeHandMagicProgress(.8,'right'),welcomeHandMagicProgress(.8,'left'));assert.equal(welcomeHandMagicProgress(1,'left'),welcomeHandMagicProgress(1,'right'));assert.equal(welcomeHandMagicProgress(6,'right'),1);
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
 assert.equal(stage.phase,'visitor-intro');assert.deepEqual(phases.filter(id=>!['frame'].includes(id)),['title','arrival','table','face','zinnia','living-frame','visitor-intro']);
 assert.equal(stage.zinniaMount.parent.visible,true);assert.ok(stage.root.children.some(child=>child.visible && child.name.toLowerCase().includes('table')));
 assert.equal(stage.controllerLasersVisible,false);assert.equal(stage.snapshot().settingsAvailable,false);assert.equal(requests.some(url=>/fruit-collection/.test(url)),true,'preload fruit during conversation');
 }finally{stage.destroy();}
}));


test('controller Orb walkthrough moves from grab and trigger to quiet stick practice',()=>withAssets(async()=>{
 const spoken=[],voice={status:()=>({playing:false,paused:false,available:true}),speak:value=>{if(value)spoken.push(value);},stop(){},unlock(){}};
 const stage=createWelcomePracticeScene({voice,embedded:true});
 try{await stage.loading;await settle(()=>stage.snapshot().controllerGuide.filter(e=>e.ready).length===2);
 const viewer=new THREE.Matrix4().makeTranslation(0,1.6,0).elements,inputs=['left','right'].map((handedness,i)=>({source:{handedness,profiles:['meta-quest-touch-plus'],gamepad:{buttons:Array.from({length:6},()=>({pressed:false,value:0})),axes:[0,0,0,0]}},matrix:new THREE.Matrix4().makeTranslation(i?.25:-.25,1.15,-.35).elements,down:false,trigger:false}));
 const tick=seconds=>{for(let i=0;i<Math.ceil(seconds/.05);i++)stage.update(.05,{viewer,floor:0,controllers:inputs,inputs});};
 stage.start(viewer,0);stage.previewLesson('controls-orb-grab');spoken.length=0;tick(.3);
 const point=new THREE.Vector3(...stage.snapshot().controlOrb.position);stage.root.localToWorld(point);inputs[1].matrix=new THREE.Matrix4().makeTranslation(point.x,point.y,point.z).elements;tick(.3);inputs[1].down=true;tick(.3);inputs[1].matrix=new THREE.Matrix4().makeTranslation(point.x+.13,point.y+.1,point.z).elements;tick(.3);inputs[1].down=false;tick(1.3);assert.equal(stage.phase,'controls-orb-open');assert.equal(stage.snapshot().controlOrb.moved,true);tick(.3);inputs[1].trigger=true;tick(.3);inputs[1].trigger=false;tick(1.2);assert.equal(stage.phase,'controls-stick');
 for(const hand of ['right','left'])for(const [x,y]of [[.8,.8],[-.8,.8],[-.8,-.8],[.8,-.8]]){inputs.find(i=>i.source.handedness===hand).source.gamepad.axes=[0,0,x,y];tick(.15);}assert.ok(stage.snapshot().controlOrb.rotation>0);inputs.forEach(i=>i.source.gamepad.axes=[0,0,0,0]);tick(1.2);assert.equal(stage.phase,'controls-stick-click');assert.ok(spoken.some(v=>v.id==='controls-orb-grab'));assert.equal(spoken.filter(v=>v.id==='controls-stick-left').length,0);assert.ok(spoken.every(v=>v.recorded===false && v.spokenOverride===true));
 stage.previewLesson('settings-open');tick(.3);const labels=stage.snapshot().controllerGuide.filter(e=>e.labelVisible);assert.equal(labels.length,1);assert.match(labels[0].id,/left/);
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
 tick(60,{frameReady:false});assert.equal(stage.snapshot().frameOpacity,0);assert.equal(stage.snapshot().title,'');tick(10,{frameReady:true,presentationReady:false});assert.equal(stage.snapshot().frameOpacity,0);tick(12);assert.ok(stage.snapshot().frameOpacity>0 && stage.snapshot().frameOpacity<1);tick(25);assert.equal(stage.snapshot().frameOpacity,1);assert.equal(stage.phase,'title');tick(290);assert.equal(stage.phase,'arrival');assert.equal(stage.snapshot().title,'Make yourself comfortable');
 stage.previewLesson('table');tick(5);assert.equal(stage.snapshot().title,'Your practice table');tick(80);assert.equal(stage.snapshot().title,'Your practice table');tick(40);assert.equal(stage.snapshot().title,'Your practice table');assert.ok(stage.root.getObjectByName('Welcome practice table white arrival glow').visible===false);
 stage.previewLesson('face');assert.equal(stage.snapshot().title,'');tick(100);assert.equal(stage.snapshot().title,'Meet Zinnia');assert.ok(stage.snapshot().caption);
 }finally{stage.destroy();}
}));


test('basket speech waits through slow fruit download and a fresh renderer revision',()=>withAssets(async()=>{
 let release;const gate=new Promise(done=>release=done),spoken=[];const stage=createWelcomePracticeScene({embedded:true,voice:{status:()=>({playing:false}),speak:value=>{if(value)spoken.push(value.id);},stop(){}},loadFruit:async()=>{await gate;return {scene:new THREE.Mesh(new THREE.SphereGeometry(.05,8,6),new THREE.MeshBasicMaterial())};}});
 try{await stage.loading;const viewer=new THREE.Matrix4().makeTranslation(0,1.6,0).elements;stage.start(viewer,0);stage.previewLesson('basket');for(let i=0;i<300;i++)stage.update(.05,{viewer,floor:0});assert.equal(stage.phase,'basket');assert.equal(spoken.includes('basket'),false);assert.equal(stage.objects.get('peach').visible,false);release();await stage.loadPracticeAssets();const oldRevision=stage.snapshot().sceneRevision;for(let i=0;i<80;i++)stage.update(.05,{viewer,floor:0,renderRevision:oldRevision});assert.ok(stage.snapshot().sceneRevision>oldRevision);assert.equal(spoken.includes('basket'),false,'newly visible fruit must be included in renderer');stage.update(.05,{viewer,floor:0,renderRevision:stage.snapshot().sceneRevision});assert.equal(spoken.at(-1),'basket');assert.equal(stage.objects.get('peach').visible,true);}
 finally{release();stage.destroy();}
}));


test('wooden board has no basket wall to interrupt a held fruit',()=>withAssets(async()=>{
 const feedback=[],stage=createWelcomePracticeScene({embedded:true,voice:{status:()=>({playing:false,muted:true}),speak(){},stop(){}},onFeedback:kind=>feedback.push(kind),loadFruit:async()=>({scene:new THREE.Mesh(new THREE.SphereGeometry(.05,8,6),new THREE.MeshBasicMaterial())})});
 try{await stage.loading;const viewer=new THREE.Matrix4().makeTranslation(0,1.6,0).elements;stage.start(viewer,0);stage.previewLesson('grab');await stage.loadPracticeAssets();stage.update(.05,{viewer,floor:0});const body=stage.bodies.filter(b=>b.fruit).sort((a,b)=>(b.position.y+b.support)-(a.position.y+a.support))[0],source={handedness:'right'};const input=(point,down)=>{stage.root.updateMatrixWorld(true);const matrix=stage.root.matrixWorld.clone().multiply(new THREE.Matrix4().makeTranslation(point.x,point.y,point.z)).elements;stage.update(.05,{viewer,floor:0,inputs:[{source,matrix,down,trigger:false}]});};
 const start={...body.position};input(start,false);input(start,true);assert.equal(stage.isHolding(source),true);input({...start,y:.65},true);input({x:.735,y:.65,z:-.16},true);input({x:.735,y:.06,z:-.16},true);assert.equal(stage.isHolding(source),true);assert.ok(body.position.y>=body.support);assert.equal(feedback.filter(kind=>kind==='basket-contact').length,0);input(body.position,false);assert.equal(stage.isHolding(source),false);}
 finally{stage.destroy();}
}));

test('table outline waits for any-button placement and commits on release',()=>withAssets(async()=>{
 const stage=createWelcomePracticeScene({embedded:true,voice:{status:()=>({playing:false,muted:true}),speak(){},stop(){}}});
 try{await stage.loading;const viewer=new THREE.Matrix4().makeTranslation(0,1.6,0).elements;stage.start(viewer,0);stage.previewLesson('table');const source={handedness:'right',gamepad:{buttons:Array.from({length:6},()=>({pressed:false}))}},input={source,matrix:viewer,ray:{origin:{x:0,y:1.6,z:-.75},direction:{x:0,y:-1,z:0}},down:false,trigger:false};const tick=()=>stage.update(.05,{viewer,floor:0,inputs:[input]});tick();assert.equal(stage.root.getObjectByName('Practice table placement outline').visible,true);assert.equal(stage.root.getObjectByName('Welcome practice table').visible,false);const height=stage.tableHeight;assert.ok(height<.67);source.gamepad.buttons[4].pressed=true;tick();input.matrix=new THREE.Matrix4().makeTranslation(.25,1.8,0).elements;input.ray.origin.x=.25;tick();assert.ok(stage.root.position.x>.2);source.gamepad.buttons[4].pressed=false;tick();assert.equal(stage.root.getObjectByName('Practice table placement outline').visible,false);for(let i=0;i<100;i++)tick();assert.equal(stage.root.getObjectByName('Welcome practice table').visible,true);}
 finally{stage.destroy();}
}));

test('each actual fruit can lift clear of the packed basket without becoming stuck',()=>withAssets(async()=>{
 const stage=createWelcomePracticeScene({embedded:true,voice:{status:()=>({playing:false,muted:true}),speak(){},stop(){}}});
 try{await stage.loading;const viewer=new THREE.Matrix4().makeTranslation(0,1.6,0).elements;stage.start(viewer,0);stage.previewLesson('grab');await stage.loadPracticeAssets();const source={handedness:'right'};const input=(point,down)=>{stage.root.updateMatrixWorld(true);stage.update(.05,{viewer,floor:0,inputs:[{source,matrix:stage.root.matrixWorld.clone().multiply(new THREE.Matrix4().makeTranslation(point.x,point.y,point.z)).elements,down,trigger:false}]});};for(const id of ['peach','fig','mango','pomegranate','apple','carambola','banana']){stage.resetObjects();stage.update(.05,{viewer,floor:0});const body=stage.bodies.find(b=>b.id===id),start={...body.position};input(start,false);input(start,true);assert.ok(stage.snapshot().held.includes(id),id+' picked');for(let i=1;i<=12;i++)input({...start,y:start.y+i*.04},true);assert.ok(stage.snapshot().held.includes(id),id+' remains held');assert.ok(body.position.y>=start.y+.4,id+' lifted');input(body.position,false);}}
 finally{stage.destroy();}
}));

test('Zinnia leaf dance locks matching hands before the spoken tickle and retraction',()=>withAssets(async()=>{
 const stage=createWelcomePracticeScene({embedded:true,voice:{status:()=>({playing:false,muted:true}),speak(){},stop(){}}});
 try{await stage.loading;const viewer=new THREE.Matrix4().makeTranslation(0,1.6,0).elements;stage.start(viewer,0);stage.previewLesson('laser-dance');stage.update(.05,{viewer,floor:0});const guide=stage.zinniaMount.children[0].userData.zinnia.guide,inputs=['left','right'].map((handedness,i)=>{const p=new THREE.Box3().setFromObject(guide.leaf(i?'R':'L')).getCenter(new THREE.Vector3());return {source:{handedness},matrix:new THREE.Matrix4().makeTranslation(p.x,p.y,p.z+.4).elements,ray:{origin:{x:p.x,y:p.y,z:p.z+.4},direction:{x:0,y:0,z:-1}},down:true,trigger:false};});stage.update(.05,{viewer,floor:0,inputs,controllers:inputs});assert.equal(stage.snapshot().leafContacts.length,2);assert.deepEqual(stage.snapshot().leafContacts.map(c=>c.hand),['left','right']);for(let i=0;i<210 && stage.phase==='laser-dance';i++)stage.update(.05,{viewer,floor:0,inputs,controllers:inputs});assert.equal(stage.phase,'laser-zinnia');assert.equal(stage.snapshot().leafContacts.length,0);stage.previewLesson('comfort');for(let i=0;i<10;i++)stage.update(.05,{viewer,floor:0});assert.equal(stage.controllerLasersVisible,false);}
 finally{stage.destroy();}
}));

test('introduced leaf holding remains available in controllers, virtual hands and tracked hands',()=>withAssets(async()=>{
 const stage=createWelcomePracticeScene({embedded:true,voice:{status:()=>({playing:false,muted:true}),speak(){},stop(){},unlock(){}}});
 try{await stage.loading;const viewer=new THREE.Matrix4().makeTranslation(0,1.6,0).elements;stage.start(viewer,0);
  for(const mode of ['controllers','gloves','hands']){
   stage.previewLesson('comfort');stage.setInputMode(mode);stage.update(.05,{viewer,floor:0});
   const guide=stage.zinniaMount.children[0].userData.zinnia.guide,p=new THREE.Box3().setFromObject(guide.leaf('R')).getCenter(new THREE.Vector3());
   const source={handedness:'right',hand:mode==='hands'?{}:null},near=mode!=='controllers',origin=p.clone().add(new THREE.Vector3(0,0,near?0:.4));
   const input={source,matrix:new THREE.Matrix4().makeTranslation(origin.x,origin.y,origin.z).elements,ray:{origin,direction:new THREE.Vector3(0,0,-1)},down:true,trigger:false};
   stage.update(.05,{viewer,floor:0,inputs:[input],controllers:source.hand?[]:[input]});
   assert.equal(stage.snapshot().leafContacts.length,1,mode);assert.equal(stage.isHolding(source),true,mode+' owns its input');
   input.down=false;input.trigger=true;stage.releaseLeaf(source);assert.equal(stage.heldLeafPoint('right'),null,'grip release frees the pointer immediately while trigger remains held');stage.update(.05,{viewer,floor:0,inputs:[input]});assert.equal(stage.snapshot().leafContacts.length,0);
  }
 }finally{stage.destroy();}
}));

test('Zinnia keeps the Orb as her focus during its spoken lesson and waves at exit',()=>withAssets(async()=>{
 let playing=true;const stage=createWelcomePracticeScene({embedded:true,voice:{status:()=>({playing,paused:false,muted:false}),speechLevel:()=>.4,unlock(){},speak(){playing=true;},stop(){playing=false;}}});
 try{await stage.loading;const viewer=new THREE.Matrix4().makeTranslation(0,1.6,0).elements;stage.start(viewer,0);stage.previewLesson('controls-orb-grab');playing=true;
  for(let i=0;i<70;i++)stage.update(.03,{viewer,floor:0});
  const head=stage.zinniaMount.getObjectByName('Head_nod_root').userData.guidePivot;assert.ok(new THREE.Euler().setFromQuaternion(head.quaternion).y<-.1,'gaze follows the Orb to the left during speech');
  stage.button('skip');for(let i=0;i<25;i++)stage.update(.03,{viewer,floor:0});const guide=stage.zinniaMount.children[0].userData.zinnia.guide;assert.equal(guide.snapshot().gesture,'farewell');assert.ok(guide.leaf('R').userData.guidePivot.quaternion.angleTo(new THREE.Quaternion())>.4);
 }finally{stage.destroy();}
}));

test('basket and fruit remain at full size when narrated exploration advances to pickup',()=>withAssets(async()=>{
 const stage=createWelcomePracticeScene({embedded:true,voice:{status:()=>({playing:false,muted:true}),speak(){},stop(){}}});
 try{await stage.loading;const viewer=new THREE.Matrix4().makeTranslation(0,1.6,0).elements;stage.start(viewer,0);stage.previewLesson('basket');await stage.loadPracticeAssets();
  for(let i=0;i<80;i++)stage.update(.05,{viewer,floor:0});const fruit=stage.objects.get('apple'),basket=stage.root.getObjectByName('Fruit discovery wooden board');assert.equal(fruit.visible,true);assert.equal(basket.visible,true);const position=fruit.position.clone();
  stage.previewLesson('grab');stage.update(.01,{viewer,floor:0});assert.equal(fruit.scale.x,1,'pickup lesson must not regrow previously presented fruit');assert.equal(basket.visible,true);assert.ok(fruit.position.distanceTo(position)<.005);
 }finally{stage.destroy();}
}));
