import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {livingMapHeldContact,livingMapWorldPoint,livingMapWorldDropAccepted} from '../app/services/demoLivingMapReveal.js';
const source=readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
const between=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
test('closing a LIMO branch clears its descendants and allows reopening',()=>{
 const nodes=[{id:'root',limId:'outcome',key:'root'},{id:'child',parent:'root',limId:'uses',key:'child'},{id:'grandchild',parent:'child',limId:'detail',key:'grandchild'}];
 const ctx=vm.createContext({demoLimo:null,limNodeByKey:key=>nodes.find(n=>n.key===key),welcomeFrames:()=>[{nodes}],limExpandedCells:new Set(['outcome','uses','detail']),limExpandedAt:new Map([['outcome',0],['uses',0],['detail',0]]),nativeConnectionState:null,LIMO_CELL_BY_ID:{},limoRouteId:id=>id,limLearningContent:id=>({id}),demoFeedback:null,appRoot:null,meshComposition:{setActiveRef(){}},performance:{now:()=>100},syncDemoPanelActions(){},limMeshRef:id=>id,arWelcomeClock:{elapsed:10},infoPanel:null,learningModule:null,understandPlacePathway:()=>null,limPathwayState:{status:'idle'},limDiagnostic(){}});
 vm.runInContext(between('function activateLimCell(', 'function limRevealIsAnimating('),ctx);
 assert.equal(vm.runInContext('activateLimCell("root")',ctx),true);
 assert.equal(ctx.limExpandedCells.size,0);assert.equal(ctx.limExpandedAt.size,0);
 assert.equal(vm.runInContext('activateLimCell("root")',ctx),true);
 assert.deepEqual([...ctx.limExpandedCells],['outcome']);
 vm.runInContext('activateLimCell("root",{toggle:false})',ctx);
 assert.deepEqual([...ctx.limExpandedCells],['outcome']);
});
test('connection examples reset LIMO expansion instead of preopening the target lineage',()=>{
 const body=between('function startNativeConnectionExperience(', 'function acceptNativePimCell(');
 assert.match(body,/limExpandedCells=new Set\(\);limExpandedAt=new Map\(\);selectedLimCell=''/);
 assert.doesNotMatch(body,/for\(const id of targetLineage.ancestors\)/);
});
test('right grip preserves the Totem pickup offset and follows hand translation without weight lag',()=>{
 const piece={demoMapPiece:true,demoInteractive:true,position:{x:.6,y:1.1,z:-1},demoHalfHeight:.095};
 const pose=new Float32Array(16);pose[0]=pose[5]=pose[10]=pose[15]=1;pose[12]=.5;pose[13]=1;pose[14]=-1;
 const ctx=vm.createContext({markers:[piece],simulatedMode:false,demoHeldIndex:-1,demoHoldTimer:null,clearTimeout,placementReady:false,demoGrabInputSource:{gripSpace:{}},referenceSpace:{},demoLivingMapOrigin:{x:0,y:1,z:-1},demoLivingMapOrientation:{x:0,y:0,z:0,w:1},demoInfoTarget:()=>null,demoPointerWorldOrigin:()=>({x:pose[12],y:pose[13],z:pose[14]}),demoPointerWorldRay:()=>({x:0,y:0,z:-1}),pulseDemoHaptics(){},setGuide(){},demoTotemHalfHeight:()=>.095,livingMapHeldContact,livingMapRayPoint:()=>({x:.8,y:1,z:-.6}),frame:{getPose:()=>({transform:{matrix:pose}})}});
 const grabStart=source.indexOf('function captureDemoGrabPose(');vm.runInContext(source.slice(grabStart,source.indexOf('\nfunction ',grabStart+10)),ctx);
 vm.runInContext(between('function beginControllerDemoHold(', 'function beginHandDemoGrab(')+between('function updateHeldDemoRecordPosition(', 'function captureDemoGrabPose('),ctx);
 assert.equal(vm.runInContext('beginControllerDemoHold({record:markers[0],index:0},frame)',ctx),true);
 assert.equal(ctx.demoHeldIndex,0);
 pose[12]=.8;pose[13]=1.25;pose[14]=-.6;
 ctx.demoKnowledgeWorkspace={};ctx.demoKnowledgeIsModal=()=>false;ctx.runXrFrameStep=(_name,update)=>update();
 const xrUpdate=source.match(/runXrFrameStep\('held element update',[^\n]+/)[0];
 vm.runInContext(xrUpdate,ctx);
 assert.ok(Math.abs(piece.position.x-.9)<1e-6);assert.ok(Math.abs(piece.position.y-1.35)<1e-6);assert.ok(Math.abs(piece.position.z+.6)<1e-6);
 pose[0]=pose[10]=0;pose[2]=-1;pose[8]=1;
 vm.runInContext('updateHeldDemoRecordPosition(frame)',ctx);
 assert.ok(Math.abs(piece.position.x-.9)<1e-6);assert.ok(Math.abs(piece.position.z+.6)<1e-6,'grip pose does not pull the Totem to the hand');
 const last={...piece.position};ctx.livingMapRayPoint=()=>null;
 vm.runInContext('updateHeldDemoRecordPosition(frame)',ctx);assert.deepEqual({...piece.position},last);
});
test('release projects a nearby Totem onto tilted terrain and rejects off-map or distant drops',()=>{
 const origin={x:0,y:1,z:-1},rotation={x:.1,y:0,z:0,w:Math.sqrt(.99)},target=livingMapWorldPoint({x:1,z:1},origin,rotation);
 const contact=livingMapHeldContact({...target,y:target.y+.15},origin,rotation);
 assert.ok(contact);assert.equal(livingMapWorldDropAccepted({...contact,y:contact.y+.095},target),true);
 assert.equal(livingMapHeldContact({x:3,y:1,z:-1},origin,rotation),null);
 assert.equal(livingMapHeldContact({...target,y:target.y+1},origin,rotation),null);
});
test('selecting the connection source preserves the expanded Pigeon Pea PIMO',()=>{
 const plant={demoExpanded:true},ctx=vm.createContext({plant,nativeConnectionPlant:()=>plant,nativeConnectionState:{sourcePath:'uses',targetTitle:'Uses'},acceptDemoNativeSource:()=>true,refreshDemoPimProfile(){},guidedDemoStep:()=>({title:'Connection',main:'Uses and Making'}),showIntroBoard(){},DEMO_TUTORIAL_STEPS:{GUIDED:1},nativeConnectionPanelGuide(){},navigator:{}});
 vm.runInContext(between('function acceptNativePimCell(', 'async function acceptNativeLimCell('),ctx);
 assert.equal(vm.runInContext('acceptNativePimCell(plant,"uses")',ctx),true);assert.equal(plant.demoExpanded,true);
});
test('Learning Pathways fades Totems over time rather than hiding them immediately',()=>{
 const record={demoType:'zone'},ctx=vm.createContext({markers:[record],collapseDemoNotes(){},performance:{now:()=>100},updateSimulatedMarkers(){},spatialTransitionProgress:(now,start,duration)=>Math.max(0,Math.min(1,(now-start)/duration)),SPATIAL_OBJECT_VISUALS:{totem:{fadeTransitionMs:1000}}});
 vm.runInContext(between('function demoTotemVisualOpacity(', 'function selectDemoTotemSign(')+between('function fadeMappedSceneForLimo(', 'function restoreMappedSceneAfterLimo('),ctx);
 vm.runInContext('fadeMappedSceneForLimo()',ctx);assert.equal(record.demoHiddenForLimo,false);
 assert.equal(vm.runInContext('demoTotemVisualOpacity(markers[0],100)',ctx),.98);
 assert.ok(vm.runInContext('demoTotemVisualOpacity(markers[0],900)',ctx)>.4);
 assert.equal(vm.runInContext('demoTotemVisualOpacity(markers[0],1700)',ctx),0);
});
