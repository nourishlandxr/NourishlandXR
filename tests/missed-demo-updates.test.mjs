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
 assert.equal(controls.find(item=>item.action==='Utility:peek-3d').label,'PEEK 3D');
 const demo=readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8'),launch=readFileSync(new URL('../app/screens/launch.js',import.meta.url),'utf8');
 assert.doesNotMatch(launch,/openLivingPaintingTest/);
 assert.doesNotMatch(demo,/actions.push\(\{id:'peek-3d'/);
 assert.match(demo,/if\(action==='peek-3d'\)\{void openDemoPeek\(\);return;\}/);
 assert.equal(controls.some(item=>item.action==='Utility:peek-3d-2'),false);
 assert.match(demo,/if\(livingPeekActive && livingPeekPose\)/);
 assert.match(demo,/livingPeekPinches/);
});

test('shaking a perch starts an individual flight; quiet motion and reduced motion do not startle',()=>{
 const home={id:'fruit',center:{x:0,y:1,z:-1},right:{x:1,y:0,z:0},normal:{x:0,y:0,z:1}},insect={seed:0,size:.04};
 butterflyElementVisit(insect,home,home,0);
 const moved={...home,center:{x:.04,y:1,z:-1}};
 butterflyElementVisit(insect,home,moved,32);assert.ok(insect.visit.startle);
 const flight=insect.visit.startle;
 const flying=butterflyElementVisit(insect,home,moved,flight.at+flight.duration*.5);assert.equal(flying.pose.state,'flying');assert.ok(flying.position.z>moved.center.z+.1);
 const returned=butterflyElementVisit(insect,home,moved,flight.at+flight.duration+1);for(const axis of ['x','y','z'])assert.ok(Math.abs(returned.position[axis]-moved.center[axis])<1e-12,`returned ${axis} stays on its perch`);assert.equal(Boolean(insect.visit.hover),!flight.lands);
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

test('Peek choices share one bounded row and shake reactions vary per butterfly',()=>{
 const choices=panelViewControls().filter(item=>item.settingGroup==='peek');
 assert.deepEqual(choices.map(item=>item.label),['PEEK 3D','OFF']);
 assert.equal(new Set(choices.map(item=>item.y)).size,1);
 for(let i=1;i<choices.length;i++)assert.ok(choices[i].x>=choices[i-1].x+choices[i-1].width);
 const home={id:'p',center:{x:0,y:1,z:-1},right:{x:1,y:0,z:0},normal:{x:0,y:0,z:1}},moved={...home,center:{x:.04,y:1,z:-1}};
 const reactions=Array.from({length:8},(_,seed)=>{const insect={seed};butterflyElementVisit(insect,home,home,0);butterflyElementVisit(insect,home,moved,32);return insect.visit.startle;});
 assert.equal(new Set(reactions.map(r=>r.duration)).size,8);assert.equal(new Set(reactions.map(r=>r.at)).size,8);
 assert.equal(new Set(reactions.map(r=>r.side)).size,8);
 const source=readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
 assert.match(source,/ambientBeesStartedAt=0/);assert.match(source,/surface.kind==='living-frame-rim'\?\.012/);
});

test('Living Frame peek uses the same 3D portal, keeps eye poses and releases it',async()=>{
 const calls=[],gl={},portal={active:false,ready:Promise.resolve(true),setContext:value=>calls.push(['context',value]),begin(matrix,_exit,options){this.active=true;calls.push(['begin',matrix,options]);},setAnchor:matrix=>calls.push(['anchor',matrix]),drawNative:(_gl,view)=>calls.push(['eye',view.transform.matrix[12]]),destroy:()=>calls.push(['destroy'])};
 const renderer=await createLivingFramePeekXR(gl,{createPortal:()=>portal}),identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
 for(const x of [-.032,.032]){const matrix=identity.slice();matrix[12]=x;renderer.draw({projectionMatrix:identity,transform:{matrix,inverse:{matrix:identity}}},{matrix:identity,radius:.832});}
 assert.deepEqual(calls.filter(c=>c[0]==='eye').map(c=>c[1]),[-.032,.032]);assert.equal(calls.filter(c=>c[0]==='begin').length,1);assert.equal(calls[0][1],gl);const moved=identity.slice();moved[12]=.2;renderer.draw({transform:{matrix:identity}},{matrix:moved,radius:.832});assert.equal(calls.filter(c=>c[0]==='begin').length,1,'moving the frame must not restart its fade or garden');assert.equal(calls.filter(c=>c[0]==='anchor').length,1);renderer.destroy();assert.equal(calls.at(-1)[0],'destroy');
 const source=readFileSync(new URL('../app/services/livingFramePeekXR.js',import.meta.url),'utf8');assert.doesNotMatch(source,/property-painting|propertyDepth|createImageBitmap/);assert.match(source,/createPeekPortalExperience/);
 const left=peekAperturePoint({x:2,y:1,z:-10},{x:-.032,y:0,z:1.8}),right=peekAperturePoint({x:2,y:1,z:-10},{x:.032,y:0,z:1.8});assert.notEqual(left.x,right.x);
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


test('randomized butterfly flights finish exactly at their end timestamp',()=>{
 const home={id:'home',center:{x:0,y:1,z:-1},right:{x:1,y:0,z:0},normal:{x:0,y:0,z:1}},target={...home,id:'fruit',center:{x:.8,y:1,z:-1}},moved={...home,center:{x:.04,y:1,z:-1}};
 for(let i=0;i<1000;i++){
  const insect={seed:i};butterflyElementVisit(insect,home,target,0);const departure=insect.visit.pending.at;butterflyElementVisit(insect,home,target,departure);const end=departure+insect.visit.trip.duration;
  const landed=butterflyElementVisit(insect,home,target,end);assert.deepEqual(landed.position,target.center);assert.equal(landed.pose.flight,0);assert.equal(insect.visit.trip,null);
  const startled={seed:i};butterflyElementVisit(startled,home,home,0);butterflyElementVisit(startled,home,moved,32);const flight=startled.visit.startle;
  const returned=butterflyElementVisit(startled,home,moved,flight.at+flight.duration);assert.deepEqual(returned.position,moved.center);assert.equal(returned.pose.flight,0);assert.equal(startled.visit.startle,null);assert.equal(Boolean(startled.visit.hover),!flight.lands);
 }
});
