import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {panelOpenerControls,panelViewControls} from '../app/services/pimInfoPanel.js';
import {butterflyElementVisit} from '../app/services/butterflyElementVisit.js';
import {avoidLivingFrameDisk} from '../app/services/livingFramePlacement.js';
import {createLivingFramePeekXR,peekAperturePoint} from '../app/services/livingFramePeekXR.js';

test('VIEW owns visibility and PEEK; the welcome and main action rail have no peek shortcut',()=>{
 const openers=panelOpenerControls({hasView:true,settingsOpen:true,viewOpen:true,guidesOpen:true,hasGuides:true});
 assert.equal(openers.find(item=>item.action==='View').expanded,true);assert.equal(openers.find(item=>item.action==='Guides').expanded,true);
 assert.equal(openers.find(item=>item.action==='Settings').expanded,true);
 const controls=panelViewControls([{id:'plant',label:'ORBS',selected:false}]);
 assert.equal(controls.find(item=>item.action==='Utility:visibility:plant').label,'Show');
 for(const id of ['plant','zone','note'])assert.ok(controls.some(item=>item.action==='Utility:visibility:'+id));
 assert.equal(controls.find(item=>item.action==='Utility:peek-3d').label,'PEEK 3D 1');
 const demo=readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8'),launch=readFileSync(new URL('../app/screens/launch.js',import.meta.url),'utf8');
 assert.doesNotMatch(launch,/openLivingPaintingTest/);
 assert.doesNotMatch(demo,/actions.push\(\{id:'peek-3d'/);
 assert.match(demo,/openDemoPeek\(action==='peek-3d-2'\?2:1\)/);
 assert.equal(controls.find(item=>item.action==='Utility:peek-3d-2').label,'PEEK 3D 2');
 assert.match(demo,/if\(livingPeekActive && livingPeekPose\)/);
 assert.match(demo,/livingPeekPinches/);
});

test('shaking a perch starts a brief flight, then returns; quiet motion and reduced motion do not startle',()=>{
 const home={id:'fruit',center:{x:0,y:1,z:-1},right:{x:1,y:0,z:0},normal:{x:0,y:0,z:1}},insect={seed:0,size:.04};
 butterflyElementVisit(insect,home,home,0);
 const moved={...home,center:{x:.04,y:1,z:-1}};
 butterflyElementVisit(insect,home,moved,32);assert.ok(insect.visit.startle);
 const flying=butterflyElementVisit(insect,home,moved,1032);assert.equal(flying.pose.state,'flying');assert.ok(flying.position.z>moved.center.z+.1);
 const landed=butterflyElementVisit(insect,home,moved,3232);assert.deepEqual(landed.position,moved.center);assert.equal(landed.pose.state,'landed');
 const quiet={seed:1};butterflyElementVisit(quiet,home,home,0);butterflyElementVisit(quiet,home,{...home,center:{x:.002,y:1,z:-1}},32);assert.equal(quiet.visit.startle,undefined);
 const reduced={seed:2};butterflyElementVisit(reduced,home,home,0,true);butterflyElementVisit(reduced,home,moved,32,true);assert.equal(reduced.visit.startle,undefined);
});

test('rim clearance includes outer petals and catches sideways flight through the depth slab',()=>{
 const pose={center:{x:0,y:0,z:0},right:{x:1,y:0,z:0},up:{x:0,y:1,z:0},normal:{x:0,y:0,z:1},radius:.832};
 assert.ok(avoidLivingFrameDisk({x:.9,y:0,z:.09},pose).z>=.219);
 const previous={x:-1.2,y:0,z:.09},next={x:1.2,y:0,z:.09},safe=avoidLivingFrameDisk(next,pose,0,previous);
 assert.equal(safe.x,previous.x);assert.ok(safe.z>=.219);
 assert.equal(avoidLivingFrameDisk({x:1.2,y:0,z:.3},pose,0,{x:-1.2,y:0,z:.3}).x,1.2);
});

test('peek clips each eye at the aperture, draws shared depth geometry and disposes resources',async()=>{
 const oldFetch=globalThis.fetch,oldBitmap=globalThis.createImageBitmap,calls=[];
 globalThis.fetch=async()=>({ok:true,blob:async()=>({})});globalThis.createImageBitmap=async()=>({width:1672,height:941,close(){calls.push(['closeBitmap']);}});
 const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true,getUniformLocation:(_p,name)=>name,getAttribLocation:(_p,name)=>name==='p'?0:1},{get(target,key){if(key in target)return target[key];if(key===key.toUpperCase())return key;if(key.startsWith('create'))return ()=>({});return (...args)=>calls.push([key,...args]);}});
 try{
  const renderer=await createLivingFramePeekXR(gl),identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
  for(const x of [-.032,.032]){const transform=identity.slice();transform[12]=x;transform[14]=1.8;renderer.draw({projectionMatrix:identity,transform:{matrix:transform,inverse:{matrix:identity}}},{matrix:identity,radius:.832});}
  assert.equal(calls.filter(call=>call[0]==='bufferData').length,1);assert.equal(calls.filter(call=>call[0]==='drawArrays').length,2);
  const left=peekAperturePoint({x:2,y:1,z:-10},{x:-.032,y:0,z:1.8}),right=peekAperturePoint({x:2,y:1,z:-10},{x:.032,y:0,z:1.8});assert.notEqual(left.x,right.x);
  renderer.destroy();for(const name of ['deleteBuffer','deleteTexture','deleteProgram'])assert.equal(calls.filter(call=>call[0]===name).length,1);
  assert.equal(calls.filter(call=>call[0]==='closeBitmap').length,1);
 }finally{globalThis.fetch=oldFetch;globalThis.createImageBitmap=oldBitmap;}
});

test('direct PEEK hides the current DOM and restores its visibility without ending XR',async()=>{
 const source=readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
 const functions=source.slice(source.indexOf('let livingPeek=null'),source.indexOf('function handleDemoPanelAction('));
 const children=[{style:{visibility:''},isConnected:true},{style:{visibility:'hidden'},isConnected:true}],suspensions=[];
 const root={children,querySelector(){return {classList:{add(){},remove(){}},remove(){}};},append(){}};
 const scope=vm.createContext({simulatedMode:false,gl:{},session:{},infoPanel:{suspend(value){suspensions.push(value);}},appRoot:root,WeakMap,performance:{now:()=>100},createLivingFramePeekXR:async()=>({destroy(){}}),introWorldAnchor:{},viewerMatrix:[],introWorldAnchorFromViewer:()=>({}),introLocalPosition:()=>({}),AR_PHONE_COMFORT:{boardPosition:[],boardScale:[1,1]},livingFramePose:()=>({radius:.832}),billboardMatrix:()=>[],document:{createElement:()=>({dataset:{},style:{}})},setGuide(){},console});
 await vm.runInContext(functions+';openLivingPeek()',scope);
 assert.deepEqual(children.map(node=>node.style.visibility),['hidden','hidden']);assert.equal(vm.runInContext('livingPeekActive',scope),true);assert.deepEqual(suspensions,[true]);
 vm.runInContext('closeLivingPeek()',scope);assert.deepEqual(children.map(node=>node.style.visibility),['','hidden']);assert.deepEqual(suspensions,[true,false]);assert.equal(vm.runInContext('livingPeekActive',scope),false);
});

test('return trigger is consumed through a long hold and cannot activate the restored scene',()=>{
 const source=readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
 const start=source.indexOf("        for(const type of ['selectstart','selectend','select','squeezestart','squeezeend'])session.addEventListener");
 const binding=source.slice(start,source.indexOf('        demoLivingMapGrip?.destroy();',start)),handlers=new Map(),inputSource={},stopped=[];
 const scope=vm.createContext({session:{addEventListener(type,handler){handlers.set(type,handler);}},livingPeekActive:true,livingPeekSuppressUntil:0,livingPeekConsumedSources:new WeakMap(),performance:{now:()=>scope.time},time:0,closeLivingPeek(){scope.livingPeekActive=false;}});
 vm.runInContext(binding,scope);
 const fire=type=>handlers.get(type)({inputSource,stopImmediatePropagation(){stopped.push(type);},preventDefault(){}});
 fire('selectstart');scope.time=2000;fire('selectend');fire('select');fire('selectstart');
 assert.deepEqual(stopped,['selectstart','selectend','select']);assert.equal(scope.livingPeekActive,false);
});
