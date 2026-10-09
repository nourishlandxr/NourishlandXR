import {LIMO_ROOTS,LIMO_CELLS,LIMO_BRANCHES} from '../app/services/limoProjectLearning.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {welcomeNetworkFrame,welcomeExperienceFrames,AR_WELCOME_SHOWCASE_DURATION,AR_WELCOME_OPENING_MS,AR_WELCOME_REDUCED_OPENING_MS,drawArWelcomeShowcase,createArWelcomeClusters,welcomeOpeningFrames,LIM_LAYOUT,LIM_CELL_SHAPE,LIM_RESERVED_POSITIONS,welcomeRevealIsAnimating,fitWelcomeCellLabel} from '../app/services/arWelcomeShowcase.js';
import fs from 'node:fs';

const showcaseSource=fs.readFileSync(new URL('../app/services/arWelcomeShowcase.js',import.meta.url),'utf8');

test('the opening uses the existing LIM mesh with seeded parent-first succession',()=>{
 const first=welcomeOpeningFrames(0,73421),repeat=welcomeOpeningFrames(0,73421),variation=welcomeOpeningFrames(0,73422);
 assert.equal(AR_WELCOME_OPENING_MS,16000);
 assert.equal(AR_WELCOME_REDUCED_OPENING_MS,1600);
 assert.equal(first.reduce((count,frame)=>count+frame.nodes.length,0),36);
 assert.deepEqual(first,repeat,'one opening keeps a stable seeded LIM route');
 assert.notDeepEqual(first,variation,'a new seed changes the organic route and timing');
 const nodes=first.flatMap(frame=>frame.nodes),byId=new Map(nodes.map(node=>[node.id,node]));
 for(const node of nodes.filter(item=>item.openingParentId)){
  const parent=byId.get(node.openingParentId);
  if(node.openingParentId.startsWith('attachment-')){
   assert.equal(node.depth,0,`${node.id} starts at its protected panel edge`);
   assert.deepEqual({x:node.openingCurve.from.x,y:node.openingCurve.from.y},node.attachment);
  }else{
   assert.ok(parent,`${node.id} keeps an opening parent`);
   assert.ok(node.openingMeta.openAt>=parent.openingMeta.bloomAt,`${node.id} waits for ${parent.id} to bloom`);
  }
 }
});

test('the main welcome surface is readable from the first XR frame',()=>{
 const stack=[];
 const ctx={globalAlpha:1,textAlign:'left',textBaseline:'alphabetic',font:'10px system-ui',
  save(){stack.push({globalAlpha:this.globalAlpha,textAlign:this.textAlign,textBaseline:this.textBaseline,font:this.font});},
  restore(){Object.assign(this,stack.pop());},
  measureText(text){return {width:text.length*10};},
  createRadialGradient(){return {addColorStop(){}};},createLinearGradient(){return {addColorStop(){}};}};
 for(const method of ['clearRect','fillRect','translate','rotate','scale','beginPath','moveTo','lineTo','quadraticCurveTo','closePath','fill','stroke','arc','fillText','roundRect','setLineDash','clip'])ctx[method]=()=>{};
 let contentOpacity=0;
 drawArWelcomeShowcase(ctx,0,false,createArWelcomeClusters(),{
  drawCells:false,drawRoots:false,drawContent:context=>{contentOpacity=context.globalAlpha;}
 });
 assert.equal(contentOpacity,1,'the opening heading must not inherit a zero-opacity whole-panel fade');
});

test('existing LIM cells reveal progressively, settle, then fade before copy begins',()=>{
 const early=welcomeOpeningFrames(3500,73421),middle=welcomeOpeningFrames(8000,73421),full=welcomeOpeningFrames(14000,73421),faded=welcomeOpeningFrames(AR_WELCOME_OPENING_MS,73421);
 const visible=frames=>frames.flatMap(frame=>frame.nodes).filter(node=>node.opacity>0).length;
 assert.ok(visible(early)>0 && visible(early)<36);
 assert.ok(visible(middle)>visible(early) && visible(middle)<36);
 assert.equal(visible(full),36);
 assert.equal(visible(faded),0);
 const settled=full.flatMap(frame=>frame.nodes);
 assert.ok(settled.every(node=>node.drawX===node.x && node.drawY===node.y));
});

test('reduced motion composes the complete LIM surface immediately',()=>{
 const opening=welcomeOpeningFrames(0,73421,AR_WELCOME_REDUCED_OPENING_MS,true);
 const nodes=opening.flatMap(frame=>frame.nodes);
 assert.equal(nodes.length,36);
 assert.ok(nodes.every(node=>node.opacity===1 && node.drawX===node.x && node.drawY===node.y));
});

test('main LIM renderer draws one lightweight connection beneath existing cell labels',()=>{
 let beziers=0;
 let lines=0;
 const stack=[];
 const ctx={textAlign:'left',textBaseline:'alphabetic',font:'10px system-ui',
  save(){stack.push({textAlign:this.textAlign,textBaseline:this.textBaseline,font:this.font});},
  restore(){Object.assign(this,stack.pop());},
  measureText(text){return {width:text.length*10};},
  createRadialGradient(){return {addColorStop(){}};},createLinearGradient(){return {addColorStop(){}};},
  bezierCurveTo(){beziers+=1;},lineTo(){lines+=1;}};
 for(const method of ['clearRect','fillRect','translate','rotate','scale','beginPath','moveTo','quadraticCurveTo','closePath','fill','stroke','arc','fillText','roundRect','setLineDash','clip'])ctx[method]=()=>{};
 const frame=drawArWelcomeShowcase(ctx,8000,false,createArWelcomeClusters(),{opening:true,openingSeed:73421,drawRoots:false});
 assert.equal(frame.reduce((count,item)=>count+item.nodes.length,0),36);
 assert.equal(beziers,0,'opening connections avoid expensive multi-pass curves');
 assert.ok(lines>0,'parent-child relationships retain a simple line');
 assert.match(showcaseSource,/startInset=parent\?\.isAttachment\?0:/);
 assert.match(showcaseSource,/endInset=Math\.max\(0,cellEdgeRadius\(Math\.atan2\(-dy,-dx\),\(node\.baseRadius\|\|0\)\*\(node\.scale\|\|1\)\)-3\)/);
});

test('minimal introduction reveals six uniform questions attached to the living frame',()=>{
 let lines=0;
 const stack=[];
 const ctx={textAlign:'left',textBaseline:'alphabetic',font:'10px system-ui',save(){stack.push({textAlign:this.textAlign,textBaseline:this.textBaseline,font:this.font});},restore(){Object.assign(this,stack.pop());},measureText(text){return {width:text.length*10};},createRadialGradient(){return {addColorStop(){}};},createLinearGradient(){return {addColorStop(){}};},lineTo(){lines+=1;}};
 for(const method of ['clearRect','fillRect','translate','rotate','scale','beginPath','moveTo','quadraticCurveTo','closePath','fill','stroke','arc','fillText','roundRect','setLineDash','clip'])ctx[method]=()=>{};
 const pacing={opening:true,minimalIntro:true,openingSeed:73421,openingDuration:30000,minimalStartAt:16000,minimalInterval:4000,minimalRevealDuration:1400,drawPanel:false,drawRoots:false};
 const visibleAt=time=>drawArWelcomeShowcase(ctx,time,false,createArWelcomeClusters(),pacing).flatMap(frame=>frame.nodes).filter(node=>node.opacity>.5);
 assert.equal(visibleAt(15999).length,0);
 assert.equal(visibleAt(17800).length,6);
 assert.equal(visibleAt(21800).length,6);
 assert.equal(visibleAt(25800).length,6);
 const frames=drawArWelcomeShowcase(ctx,29800,false,createArWelcomeClusters(),pacing);
 const nodes=frames.flatMap(frame=>frame.nodes);
 assert.deepEqual(nodes.map(node=>node.label),LIMO_ROOTS.map(root=>root.title));
 assert.equal(lines,0,'uniform primary cells use arcs and have no faceted edge lines');
 const expansion={...pacing,progression:{expandedLimIds:['limo-life'],expandedAt:{'limo-life':22000}}};
 const softChildren=drawArWelcomeShowcase(ctx,22500,false,createArWelcomeClusters(),expansion).flatMap(frame=>frame.nodes).filter(node=>node.depth===1);
 assert.ok(softChildren.length>0 && softChildren.every(node=>node.opacity===1),'selected pathway opens its children immediately');
 const settledChildren=drawArWelcomeShowcase(ctx,25000,false,createArWelcomeClusters(),expansion).flatMap(frame=>frame.nodes).filter(node=>node.depth===1);
 assert.ok(settledChildren.some(node=>node.opacity>.9),'child cells remain after the soft reveal');
 assert.match(showcaseSource,/if\(opening && !options\.minimalIntro\)/);
});

test('LIM cells distinguish idle, hover and selected without a progress fill',()=>{
 assert.doesNotMatch(showcaseSource,/Rear rim gives the transparent face physical depth/);
 assert.doesNotMatch(showcaseSource,/ctx\.lineTo\(x\+5,y\+thickness\)/);
 assert.doesNotMatch(showcaseSource,/ctx\.moveTo\(-r,0\)/);
 assert.doesNotMatch(showcaseSource,/r\*\.34,r\*\.18/);
 assert.doesNotMatch(showcaseSource,/Centre-out paint|const activation=/);
 assert.match(showcaseSource,/accentRgba\(accent,hue,hoverOnly\?\.24:\.28\)/);
 assert.match(showcaseSource,/ctx\.lineWidth=hoverOnly\?6:5/);
});

test('the four archetypes fade in after learning cells are activated late in the demo',()=>{
 const activatedAt=90000,progression={cellsActivatedAt:activatedAt};
 const before=welcomeExperienceFrames(activatedAt,false,undefined,new Set(),progression)[0].nodes[0];
 const fading=welcomeExperienceFrames(activatedAt+1400,false,undefined,new Set(),progression)[0].nodes[0];
 const settled=welcomeExperienceFrames(activatedAt+3000,false,undefined,new Set(),progression)[0].nodes[0];
 assert.equal(before.opacity,0);
 assert.ok(fading.opacity>0&&fading.opacity<1);
 assert.equal(settled.opacity,1);
});

test('a late cell selection reveals all children immediately',()=>{
 const selectedAt=AR_WELCOME_SHOWCASE_DURATION+20000;
 assert.equal(welcomeRevealIsAnimating(selectedAt+100,[selectedAt]),true);
 assert.equal(welcomeRevealIsAnimating(selectedAt+4400,[selectedAt]),true);
 assert.equal(welcomeRevealIsAnimating(selectedAt+4500,[selectedAt]),false);
 const progression={expandedLimIds:['limo-life'],expandedAt:{'limo-life':selectedAt}};
 const first=welcomeExperienceFrames(selectedAt,false,undefined,new Set(),progression).find(frame=>frame.corner===1).nodes.filter(node=>node.depth===1);
 const later=welcomeExperienceFrames(selectedAt+2500,false,undefined,new Set(),progression).find(frame=>frame.corner===1).nodes.filter(node=>node.depth===1);
 assert.ok(first.every(node=>node.opacity===1));
 assert.equal(later.filter(node=>node.opacity>0).length,first.filter(node=>node.opacity>0).length);
});
import {LIM_ALL_CELLS,LIM_INTRO_CELLS,LIM_INTRO_BRANCHES,limLearningContent} from '../app/services/limLearning.js';
test('one LIM face grows through three levels, fades and passes around the octagon',()=>{
 assert.ok(welcomeNetworkFrame(1000).nodes.every(n=>n.opacity===0));
 assert.equal(welcomeNetworkFrame(3000).nodes.filter(n=>n.opacity>0).length,1);
 const full=welcomeNetworkFrame(12000);assert.equal(full.nodes.length,4);assert.ok(full.nodes.every(n=>n.opacity===1));assert.equal(full.nodes.filter(n=>n.depth===2).length,1);
 assert.ok(welcomeNetworkFrame(15999).nodes.every(n=>n.opacity<.00001));
 assert.deepEqual([16000,32000,48000,64000,80000,96000,112000].map(time=>welcomeNetworkFrame(time).corner),[1,2,3,4,5,6,7]);
 assert.ok(welcomeNetworkFrame(AR_WELCOME_SHOWCASE_DURATION).nodes.every(n=>n.opacity===0));
});
test('eight face clusters retain parent identity, share edges and avoid the welcome panel',()=>{
 for(let corner=0;corner<8;corner++){const {nodes}=welcomeNetworkFrame(corner*16000+12000);for(const [i,n] of nodes.entries()){
 assert.ok(n.x-n.radius>0 && n.x+n.radius<2500 && n.y-n.radius>0 && n.y+n.radius<2100);
 assert.ok(n.y+n.radius<=810 || n.y-n.radius>=1310 || n.x+n.radius<=800 || n.x-n.radius>=1700);
 if(n.parent)assert.ok(nodes.find(p=>p.id===n.parent));
 for(const other of nodes.slice(i+1))assert.ok(Math.hypot(n.x-other.x,n.y-other.y)>=n.radius*1.49);
 }}
});
test('all LIM cells have deterministic reserved positions and one global shape hierarchy',()=>{
 assert.equal(Object.keys(LIM_RESERVED_POSITIONS).length,LIM_ALL_CELLS.length);
 const reserved=Object.values(LIM_RESERVED_POSITIONS).map(item=>`${item.corner}:${item.axial.join(',')}`);
 assert.equal(new Set(reserved).size,LIM_ALL_CELLS.length);
 const first=welcomeNetworkFrame(12000,true).nodes;
 assert.equal(LIM_CELL_SHAPE.sides,16);
 assert.ok(first.every(node=>node.limId && node.scale===1));
 assert.ok(first.filter(node=>node.depth===0).every(node=>node.radius===LIM_CELL_SHAPE.archetypeRadius));
 assert.ok(first.filter(node=>node.depth>0).every(node=>node.radius===LIM_CELL_SHAPE.childRadius));
 assert.ok(LIM_CELL_SHAPE.archetypeRadius>LIM_CELL_SHAPE.childRadius);
 assert.deepEqual(first.map(node=>[node.x,node.y]),welcomeNetworkFrame(64000,true).nodes.map(node=>[node.x,node.y]));
});
test('reduced motion remains static and later loops explore additional branches',()=>{
 assert.deepEqual(welcomeNetworkFrame(0,true),welcomeNetworkFrame(999999,true));
 assert.notDeepEqual(welcomeNetworkFrame(12000).nodes.map(n=>n.label),welcomeNetworkFrame(76000).nodes.map(n=>n.label));
});

// Exercise the renderer with canvas state restoration, which caused the label bug.
test('cell labels stay centred and fitted even when the caller uses left-aligned text',()=>{
 const stack=[],labels=[];let curves=0,radials=0;
 const ctx={textAlign:'left',textBaseline:'alphabetic',font:'10px system-ui',
 save(){stack.push({textAlign:this.textAlign,textBaseline:this.textBaseline,font:this.font});},
 restore(){Object.assign(this,stack.pop());},
 measureText(text){return {width:text.length*parseFloat(this.font.split(' ')[1]||10)*.56};},
 fillText(text,x,y){labels.push({text,x,y,align:this.textAlign,baseline:this.textBaseline,width:this.measureText(text).width});},
 createLinearGradient(){return {addColorStop(){}};},createRadialGradient(){radials+=1;return {addColorStop(){}};}};
 for(const method of ['clearRect','translate','rotate','scale','beginPath','moveTo','lineTo','closePath','fill','stroke','roundRect','arc','clip','fillRect','setLineDash','bezierCurveTo','ellipse'])ctx[method]=()=>{};
 ctx.quadraticCurveTo=()=>{curves+=1;};
 drawArWelcomeShowcase(ctx,64000,true,undefined,{drawRoots:false});
 const frame=welcomeExperienceFrames(64000,true).flatMap(frame=>frame.nodes).filter(node=>node.opacity>0);
 for(const node of frame){for(const word of fitWelcomeCellLabel(ctx,node.label,node.baseRadius*.94,node.depth).lines){
  const label=labels.find(l=>l.text===word && l.x===0);
  assert.ok(label,`missing cell label: ${word}`);assert.equal(label.align,'center');assert.equal(label.baseline,'middle');assert.ok(label.width<=node.baseRadius*1.48);
 }}
 assert.equal(ctx.textAlign,'left');assert.equal(ctx.textBaseline,'alphabetic');assert.ok(curves>0,'leaves and roots use curves without changing label alignment');
 const active=welcomeExperienceFrames(12000,true).flatMap(frame=>frame.nodes).find(node=>node.opacity>0);
 drawArWelcomeShowcase(ctx,64000,true,undefined,{activeKey:active.key,activeProgress:.5,selectedKey:active.key});
 assert.ok(radials>0,'activation uses a centre-out radial fill');
});

test('Continue unlocks after the welcome entrance without requiring Vision',async()=>{
 const {welcomeCanContinue,AR_WELCOME_CONTINUE_MS,AR_WELCOME_POST_VISION_CONTINUE_MS}=await import('../app/services/arWelcomeShowcase.js');
 assert.equal(AR_WELCOME_CONTINUE_MS,0);
 assert.equal(AR_WELCOME_POST_VISION_CONTINUE_MS,0);
 for(const elapsed of [-1,NaN])assert.equal(welcomeCanContinue(elapsed),false);
 assert.equal(welcomeCanContinue(0),true);
 assert.equal(welcomeCanContinue(0,NaN),true);
 assert.equal(welcomeCanContinue(0,1000),true);
 assert.equal(welcomeCanContinue(96000),true);
});

test('six roots stay calm and only the selected question family opens',()=>{
 const waiting=welcomeExperienceFrames(32000).flatMap(frame=>frame.nodes);
 assert.equal(waiting.filter(node=>node.opacity===1).length,6);
 const expandedIds=['limo-place','limo-relationships'];
 const settled=welcomeExperienceFrames(64000,false,undefined,new Set(),{expandedLimIds:expandedIds});
 const visible=settled.flatMap(frame=>frame.nodes).filter(node=>node.opacity===1);
 assert.equal(visible.length,11);assert.ok(visible.filter(node=>node.depth===1).every(node=>node.parent==='limo-relationships'));
 assert.deepEqual(welcomeExperienceFrames(640000,false,undefined,new Set(),{expandedLimIds:expandedIds}),settled);
});

test('six practical questions replace the old four archetypes, with bounded stable geometry',()=>{
 const graphs=createArWelcomeClusters(),nodes=welcomeExperienceFrames(0,false,graphs).flatMap(frame=>frame.nodes);
 assert.equal(nodes.length,36);assert.ok(nodes.every(node=>node.opacity===0));
 assert.deepEqual(nodes.filter(node=>node.depth===0).map(node=>node.label),LIMO_ROOTS.map(root=>root.title));
 for(const node of nodes)if(node.parent){const parent=nodes.find(item=>item.id===node.parent);assert.ok(parent);assert.ok(node.revealAt>parent.revealAt+1450);}
 for(const [index,node] of nodes.entries())for(const other of nodes.slice(index+1))assert.ok(Math.hypot(node.x-other.x,node.y-other.y)>=node.baseRadius+other.baseRadius+10,node.id+' overlaps '+other.id);
 assert.ok(nodes.every(node=>node.x-node.radius>0&&node.x+node.radius<2500&&node.y-node.radius>0&&node.y+node.radius<2100));
 for(const node of nodes.filter(item=>item.depth===0)){assert.ok(node.attachment);assert.ok(Math.abs(Math.hypot(node.x-node.attachment.x,node.y-node.attachment.y)-(LIM_CELL_SHAPE.archetypeRadius+42))<.001);}
 assert.deepEqual(welcomeExperienceFrames(15000,false,graphs),welcomeExperienceFrames(15000,false,graphs));
});

test('the six roots stay available while one family shows its five branches immediately',()=>{
 const at=30000,graphs=createArWelcomeClusters(),progression={expandedLimIds:['limo-vision'],expandedAt:{'limo-vision':at}};
 const nodes=welcomeExperienceFrames(at+900,false,graphs,new Set(),progression).flatMap(frame=>frame.nodes);
 assert.equal(nodes.filter(node=>node.depth===0&&node.opacity===1).length,6);
 const children=nodes.filter(node=>node.depth===1&&node.opacity===1);assert.equal(children.length,5);assert.ok(children.every(node=>node.parent==='limo-vision'));
});

test('all six questions are readable when pathway choice appears',()=>{const roots=welcomeExperienceFrames(30000,false).flatMap(frame=>frame.nodes).filter(node=>node.depth===0);assert.equal(roots.length,6);assert.ok(roots.every(node=>node.opacity===1));});

test('the spatial tree has thirty practical branches while legacy learning references remain intact',()=>{
 assert.equal(LIMO_CELLS.length,36);assert.deepEqual(LIMO_BRANCHES.map(branch=>branch.children.length),[5,5,5,5,5,5]);
 assert.equal(LIM_INTRO_CELLS.length,27);for(const legacy of LIM_INTRO_CELLS)assert.equal(limLearningContent(legacy.id).id,legacy.id);
 const feedback=limLearningContent('limo-change-repeat');assert.match(feedback.body,/same target and method/);
});

test('every pitch-deck cell carries a deep learning prompt without changing its identity',()=>{
 for(const cell of LIM_INTRO_CELLS){
  const content=limLearningContent(cell.id);
  assert.equal(content.id,cell.id);
  assert.match(content.body,/Explore ·/);
  assert.match(content.body,/Look for ·/);
  assert.match(content.body,/Ask ·/);
  assert.match(content.body,/Next ·/);
  assert.ok(content.body.length>420,`${cell.id} needs a fuller learning body`);
 }
});

test('welcome clock does not skip the opening after hidden or suspended frames',async()=>{
 const {createWelcomePresentationClock}=await import('../app/services/arWelcomeShowcase.js');
 const clock=createWelcomePresentationClock();
 assert.equal(clock.tick(10000),0);assert.equal(clock.tick(10100),100);
 assert.equal(clock.tick(74100),100);assert.equal(clock.tick(74200),200);
 assert.equal(clock.tick(74300,false),200);assert.equal(clock.tick(74400),300);
 assert.equal(clock.tick(74400),300);
 const slowVisibleClock=createWelcomePresentationClock();
 assert.equal(slowVisibleClock.tick(1000),0);assert.equal(slowVisibleClock.tick(1950),950);
 const interleavedClock=createWelcomePresentationClock();
 assert.equal(interleavedClock.tick(1000),0);assert.equal(interleavedClock.tick(1100),100);
 assert.equal(interleavedClock.tick(1050),100);assert.equal(interleavedClock.tick(1200),200);
});

test('dismissed question roots retain a hollow target, hide their children and do not move other cells',async()=>{
 const {welcomeCellAtPoint}=await import('../app/services/arWelcomeShowcase.js');
 const hidden=new Set(['0:limo-place']),progression={expandedLimIds:['limo-place']};
 const frames=welcomeExperienceFrames(64000,false,undefined,hidden,progression),nodes=frames.flatMap(frame=>frame.nodes),root=nodes.find(node=>node.id==='limo-place');
 assert.equal(root.hollow,true);assert.ok(nodes.filter(node=>node.parent===root.id).every(node=>node.opacity===0));
 assert.equal(nodes.filter(node=>node.depth===0&&node.opacity===1).length,6);
 assert.equal(welcomeCellAtPoint(frames,root.x,root.y)?.key,root.key);assert.equal(welcomeCellAtPoint(frames,1250,1050),null);
 assert.deepEqual(welcomeExperienceFrames(640000,false,undefined,hidden,progression),frames);
});

test('shared welcome silhouette matches the regular 16-sided reference',async()=>{const {WELCOME_SHAPE_POINTS,WELCOME_SHAPE}=await import('../app/services/arWelcomePanel.js');assert.equal(WELCOME_SHAPE_POINTS.length,16);assert.equal(new Set(WELCOME_SHAPE_POINTS.map(p=>p.x+','+p.y)).size,16);assert.ok(WELCOME_SHAPE_POINTS.every(point=>Math.abs(Math.hypot(point.x-WELCOME_SHAPE.cx,point.y-WELCOME_SHAPE.cy)-WELCOME_SHAPE.radius)<.001));});


test('LIMO opacity hides only its background, preserving label and outline alpha',()=>{
 function paint(opacity){
  const fills=[],text=[],strokes=[],stack=[];
  const ctx={globalAlpha:1,fillStyle:'',strokeStyle:'',font:'',save(){stack.push({globalAlpha:this.globalAlpha,fillStyle:this.fillStyle,strokeStyle:this.strokeStyle});},restore(){Object.assign(this,stack.pop());},fill(){fills.push([this.fillStyle,this.globalAlpha]);},fillText(){text.push(this.globalAlpha);},stroke(){strokes.push(this.globalAlpha);},measureText(value){return {width:value.length*12};}};
  for(const method of ['clearRect','translate','rotate','scale','beginPath','moveTo','lineTo','closePath','arc','clip','setLineDash','quadraticCurveTo','bezierCurveTo'])ctx[method]=()=>{};
  drawArWelcomeShowcase(ctx,300000,true,undefined,{drawPanel:false,drawRoots:false,cellOpacity:opacity,progression:{opening:true}});
  return {fills:fills.filter(([colour])=>colour==='#102b22').map(([,alpha])=>alpha),text,strokes};
 }
 const clear=paint(0),opaque=paint(1);assert.ok(clear.fills.length>0);assert.ok(clear.fills.every(alpha=>alpha===0));assert.ok(opaque.fills.every(alpha=>alpha>0));
 assert.deepEqual(clear.text,opaque.text);assert.deepEqual(clear.strokes,opaque.strokes);assert.ok(clear.text.some(alpha=>alpha>0));
});
