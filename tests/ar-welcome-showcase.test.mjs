import test from 'node:test';
import assert from 'node:assert/strict';
import {welcomeNetworkFrame,welcomeExperienceFrames,AR_WELCOME_SHOWCASE_DURATION,AR_WELCOME_OPENING_MS,AR_WELCOME_REDUCED_OPENING_MS,drawArWelcomeShowcase,createArWelcomeClusters,welcomeOpeningFrames,LIM_LAYOUT,LIM_RESERVED_POSITIONS,welcomeRevealIsAnimating} from '../app/services/arWelcomeShowcase.js';

test('the opening uses the existing LIM mesh with seeded parent-first succession',()=>{
 const first=welcomeOpeningFrames(0,73421),repeat=welcomeOpeningFrames(0,73421),variation=welcomeOpeningFrames(0,73422);
 assert.equal(AR_WELCOME_OPENING_MS,9800);
 assert.equal(AR_WELCOME_REDUCED_OPENING_MS,1400);
 assert.equal(first.reduce((count,frame)=>count+frame.nodes.length,0),59);
 assert.deepEqual(first,repeat,'one opening keeps a stable seeded LIM route');
 assert.notDeepEqual(first,variation,'a new seed changes the organic route and timing');
 const nodes=first.flatMap(frame=>frame.nodes),byId=new Map(nodes.map(node=>[node.id,node]));
 for(const node of nodes.filter(item=>item.openingParentId)){
  const parent=byId.get(node.openingParentId);
  assert.ok(parent,`${node.id} keeps an opening parent`);
  assert.ok(node.openingMeta.openAt>=parent.openingMeta.bloomAt,`${node.id} waits for ${parent.id} to bloom`);
 }
});

test('existing LIM cells reveal progressively and settle on their authored positions',()=>{
 const early=welcomeOpeningFrames(1800,73421),middle=welcomeOpeningFrames(5200,73421),full=welcomeOpeningFrames(AR_WELCOME_OPENING_MS,73421);
 const visible=frames=>frames.flatMap(frame=>frame.nodes).filter(node=>node.opacity>0).length;
 assert.ok(visible(early)>0 && visible(early)<59);
 assert.ok(visible(middle)>visible(early) && visible(middle)<59);
 assert.equal(visible(full),59);
 const settled=full.flatMap(frame=>frame.nodes);
 assert.ok(settled.every(node=>node.drawX===node.x && node.drawY===node.y));
});

test('reduced motion composes the complete LIM surface immediately',()=>{
 const opening=welcomeOpeningFrames(0,73421,AR_WELCOME_REDUCED_OPENING_MS,true);
 const nodes=opening.flatMap(frame=>frame.nodes);
 assert.equal(nodes.length,59);
 assert.ok(nodes.every(node=>node.opacity===1 && node.drawX===node.x && node.drawY===node.y));
});

test('main LIM renderer draws curved tendrils while retaining existing cell labels',()=>{
 let beziers=0;
 const stack=[];
 const ctx={textAlign:'left',textBaseline:'alphabetic',font:'10px system-ui',
  save(){stack.push({textAlign:this.textAlign,textBaseline:this.textBaseline,font:this.font});},
  restore(){Object.assign(this,stack.pop());},
  measureText(text){return {width:text.length*10};},
  createRadialGradient(){return {addColorStop(){}};},createLinearGradient(){return {addColorStop(){}};},
  bezierCurveTo(){beziers+=1;}};
 for(const method of ['clearRect','fillRect','translate','rotate','scale','beginPath','moveTo','lineTo','closePath','fill','stroke','arc','fillText','roundRect','setLineDash','clip'])ctx[method]=()=>{};
 const frame=drawArWelcomeShowcase(ctx,3000,false,createArWelcomeClusters(),{opening:true,openingSeed:73421});
 assert.equal(frame.reduce((count,item)=>count+item.nodes.length,0),59);
 assert.ok(beziers>0,'parent-child tendrils use cubic curves');
});

test('Vision fades in after learning cells are activated late in the demo',()=>{
 const activatedAt=90000,progression={cellsActivatedAt:activatedAt,visionActivated:false};
 const before=welcomeExperienceFrames(activatedAt,false,undefined,new Set(),progression)[0].nodes[0];
 const fading=welcomeExperienceFrames(activatedAt+1400,false,undefined,new Set(),progression)[0].nodes[0];
 const settled=welcomeExperienceFrames(activatedAt+3000,false,undefined,new Set(),progression)[0].nodes[0];
 assert.equal(before.opacity,0);
 assert.ok(fading.opacity>0&&fading.opacity<1);
 assert.equal(settled.opacity,1);
});

test('a late cell selection keeps repainting until its children finish fading',()=>{
 const selectedAt=AR_WELCOME_SHOWCASE_DURATION+20000;
 assert.equal(welcomeRevealIsAnimating(selectedAt+100,[selectedAt]),true);
 assert.equal(welcomeRevealIsAnimating(selectedAt+4400,[selectedAt]),true);
 assert.equal(welcomeRevealIsAnimating(selectedAt+4500,[selectedAt]),false);
 const progression={visionActivated:true,visionActivatedAt:0,expandedLimIds:['lim-intro-literacy'],expandedAt:{'lim-intro-literacy':selectedAt}};
 const first=welcomeExperienceFrames(selectedAt+1000,false,undefined,new Set(),progression).find(frame=>frame.corner===1).nodes.filter(node=>node.depth===1);
 const later=welcomeExperienceFrames(selectedAt+2500,false,undefined,new Set(),progression).find(frame=>frame.corner===1).nodes.filter(node=>node.depth===1);
 assert.ok(first.some(node=>node.opacity>0 && node.opacity<1));
 assert.ok(later.filter(node=>node.opacity>0).length>first.filter(node=>node.opacity>0).length);
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
test('all LIM cells have deterministic reserved positions and visible cells use edge-sharing spacing',()=>{
 assert.equal(Object.keys(LIM_RESERVED_POSITIONS).length,LIM_ALL_CELLS.length);
 const reserved=Object.values(LIM_RESERVED_POSITIONS).map(item=>`${item.corner}:${item.axial.join(',')}`);
 assert.equal(new Set(reserved).size,LIM_ALL_CELLS.length);
 const first=welcomeNetworkFrame(12000,true).nodes;
 assert.ok(first.every(node=>node.limId && node.scale===1 && node.radius===LIM_LAYOUT.radius));
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
 for(const method of ['clearRect','translate','rotate','scale','beginPath','moveTo','lineTo','closePath','fill','stroke','roundRect','arc','clip','fillRect','setLineDash'])ctx[method]=()=>{};
 ctx.quadraticCurveTo=()=>{curves+=1;};
 drawArWelcomeShowcase(ctx,64000,true);
 const frame=welcomeExperienceFrames(64000,true).flatMap(frame=>frame.nodes).filter(node=>node.opacity>0);
 for(const node of frame){for(const word of node.label.split(' ')){
  const label=labels.find(l=>l.text===word && l.x===0);
  assert.ok(label,`missing cell label: ${word}`);assert.equal(label.align,'center');assert.equal(label.baseline,'middle');assert.ok(label.width<=node.baseRadius*1.48);
 }}
 assert.equal(ctx.textAlign,'left');assert.equal(ctx.textBaseline,'alphabetic');assert.equal(curves,0);
 const active=welcomeExperienceFrames(12000,true).flatMap(frame=>frame.nodes).find(node=>node.opacity>0);
 drawArWelcomeShowcase(ctx,64000,true,undefined,{activeKey:active.key,activeProgress:.5,selectedKey:active.key});
 assert.ok(radials>0,'activation uses a centre-out radial fill');
});

test('Continue unlocks after the welcome entrance without requiring Vision',async()=>{
 const {welcomeCanContinue,AR_WELCOME_CONTINUE_MS,AR_WELCOME_POST_VISION_CONTINUE_MS}=await import('../app/services/arWelcomeShowcase.js');
 assert.equal(AR_WELCOME_CONTINUE_MS,2200);
 assert.equal(AR_WELCOME_POST_VISION_CONTINUE_MS,0);
 for(const elapsed of [-1,0,2199,NaN])assert.equal(welcomeCanContinue(elapsed),false);
 assert.equal(welcomeCanContinue(2200),true);
 assert.equal(welcomeCanContinue(2200,NaN),true);
 assert.equal(welcomeCanContinue(2200,1000),true);
 assert.equal(welcomeCanContinue(96000),true);
});

test('archetypes stay calm until a selected parent opens a deeper branch',async()=>{
 const {welcomeExperienceFrames}=await import('../app/services/arWelcomeShowcase.js');
 const early=welcomeExperienceFrames(14500).flatMap(f=>f.nodes).filter(n=>n.opacity===1).length;
 const middle=welcomeExperienceFrames(32000).flatMap(f=>f.nodes).filter(n=>n.opacity===1).length;
 assert.equal(early,5);assert.equal(middle,5);
 const expandedIds=['lim-intro-analysis','lim-intro-analysis-climate','lim-intro-food-forest','lim-intro-food-function'];
 const settled=welcomeExperienceFrames(64000,false,undefined,new Set(),{expandedLimIds:expandedIds});
 assert.ok(settled.flatMap(f=>f.nodes).filter(n=>n.opacity===1).length>5);
 assert.ok(settled.flatMap(f=>f.nodes).filter(n=>n.depth>=2 && n.opacity>0).every(n=>expandedIds.some(id=>n.parent===id || n.limId===id || n.parent?.includes(id))));
 assert.deepEqual(welcomeExperienceFrames(640000,false,undefined,new Set(),{expandedLimIds:expandedIds}),settled);
 assert.ok(welcomeExperienceFrames(0,true).flatMap(f=>f.nodes).every(n=>n.opacity===0));
 assert.equal(welcomeExperienceFrames(64000,true).flatMap(f=>f.nodes).filter(n=>n.opacity===1).length,5);
});

test('Vision opens first, then four archetypes preserve ancestry and spacing',async()=>{
 const {welcomeExperienceFrames,createArWelcomeClusters}=await import('../app/services/arWelcomeShowcase.js');
 const graphs=createArWelcomeClusters();
 const nodes=welcomeExperienceFrames(0,false,graphs).flatMap(f=>f.nodes);
 assert.ok(nodes.every(n=>n.opacity===0));
 const order=[...nodes].sort((a,b)=>a.revealAt-b.revealAt);
 assert.equal(order[0].label,'Vision');
 assert.deepEqual(order.filter(node=>node.depth===0 && node.label!=='Vision').map(node=>node.label),['Read the Place','Understand Life','Design the Forest','Shape the Outcome']);
 for(const node of nodes)if(node.parent){const parent=nodes.find(p=>p.key===node.key[0]+':'+node.parent);assert.ok(parent);assert.ok(node.revealAt>parent.revealAt+1450);}
 for(const [index,node] of nodes.entries())for(const other of nodes.slice(index+1))assert.ok(Math.hypot(node.x-other.x,node.y-other.y)>=node.radius*1.49);
 assert.ok(nodes.every(node=>node.x-node.radius>0 && node.x+node.radius<2500 && node.y-node.radius>0 && node.y+node.radius<2100));
 for(const node of nodes.filter(node=>node.depth===0)){assert.ok(node.attachment);assert.ok(Math.abs(Math.hypot(node.x-node.attachment.x,node.y-node.attachment.y)-94)<.001);}
 const opening=welcomeExperienceFrames(order[0].revealAt+700,true,graphs).flatMap(f=>f.nodes).find(n=>n.key===order[0].key);
 assert.ok(opening.opacity>0 && opening.opacity<1);assert.equal(opening.scale,1);
 assert.deepEqual(welcomeExperienceFrames(15000,false,graphs),welcomeExperienceFrames(15000,false,graphs));
});

test('Vision is the only live cell until activation releases the four archetypes',()=>{
 const graphs=createArWelcomeClusters(),activationAt=5000;
 const waiting=welcomeExperienceFrames(30000,false,graphs,new Set(),{visionActivated:false,visionActivatedAt:NaN}).flatMap(frame=>frame.nodes);
 assert.deepEqual(waiting.filter(node=>node.opacity>.5).map(node=>node.label),['Vision']);
 const opening=welcomeExperienceFrames(activationAt+1800,false,graphs,new Set(),{visionActivated:true,visionActivatedAt:activationAt}).flatMap(frame=>frame.nodes);
 assert.deepEqual(opening.filter(node=>node.depth===0 && node.label!=='Vision' && node.opacity>.5).map(node=>node.label),['Read the Place']);
 const foundations=welcomeExperienceFrames(activationAt+7200,false,graphs,new Set(),{visionActivated:true,visionActivatedAt:activationAt}).flatMap(frame=>frame.nodes);
 assert.deepEqual(foundations.filter(node=>node.depth===0 && node.label!=='Vision' && node.opacity===1).map(node=>node.label),['Read the Place','Understand Life','Design the Forest','Shape the Outcome']);
 assert.ok(foundations.every(node=>node.depth===0 || node.opacity===0));
 const branching=welcomeExperienceFrames(activationAt+9000,false,graphs,new Set(),{visionActivated:true,visionActivatedAt:activationAt,expandedLimIds:['lim-intro-analysis'],expandedAt:{'lim-intro-analysis':activationAt+7200}}).flatMap(frame=>frame.nodes);
 assert.ok(branching.some(node=>node.depth===1 && node.opacity>0));
 assert.ok(branching.filter(node=>node.depth===1 && node.opacity>0).every(node=>node.primaryFaceId===undefined || node.key.startsWith('0:')));
});

test('expanded LIM content forms a logical four-branch learning cycle',()=>{
 assert.equal(LIM_INTRO_CELLS.length,27);
 assert.deepEqual(LIM_INTRO_BRANCHES.map(branch=>branch.title),['Read the Place','Understand Life','Design the Forest','Shape the Outcome']);
 assert.deepEqual(LIM_INTRO_BRANCHES.map(branch=>branch.children.length),[4,6,6,6]);
 const ids=new Set(LIM_INTRO_CELLS.map(cell=>cell.id));
 assert.equal(ids.size,LIM_INTRO_CELLS.length);
 for(const cell of LIM_INTRO_CELLS){
  assert.ok(cell.topics.length>=4,`${cell.id} needs practical exploration topics`);
  if(cell.parentId)assert.ok(ids.has(cell.parentId),`${cell.id} has a missing parent`);
  for(const relatedId of cell.relatedIds)assert.ok(ids.has(relatedId),`${cell.id} has a missing connection`);
 }
 assert.deepEqual(LIM_INTRO_CELLS.filter(cell=>cell.parentId==='lim-intro-literacy').map(cell=>cell.title),['Plants','Guilds','Grow','Fruit','Soil Life','Wildlife']);
 assert.deepEqual(LIM_INTRO_CELLS.filter(cell=>cell.parentId==='lim-intro-food-forest').map(cell=>cell.title),['Function','Energy','Design','Succession','Water','Stewardship']);
 assert.deepEqual(LIM_INTRO_CELLS.filter(cell=>cell.parentId==='lim-intro-smart').map(cell=>cell.title),['Goals','Outcomes','Limitations','Challenges','Decisions','Feedback']);
 const revealAt=10000,progression={visionActivated:true,visionActivatedAt:0,expandedLimIds:['lim-intro-literacy'],expandedAt:{'lim-intro-literacy':revealAt}};
 const openingChildren=welcomeExperienceFrames(revealAt+900,false,undefined,new Set(),progression).find(frame=>frame.corner===1).nodes.filter(node=>node.depth===1);
 assert.ok(openingChildren.some(node=>node.opacity>0 && node.opacity<1),'new siblings fade rather than appearing instantly');
 assert.ok(openingChildren.some(node=>node.opacity===0),'later siblings remain staged');
 const settledChildren=welcomeExperienceFrames(revealAt+4000,false,undefined,new Set(),progression).find(frame=>frame.corner===1).nodes.filter(node=>node.depth===1);
 assert.ok(settledChildren.every(node=>node.opacity===1),'all six children eventually settle');
 const feedback=limLearningContent('lim-intro-smart-feedback');
 assert.match(feedback.body,/Explore · Observe · Record · Compare · Learn · Adjust · Return to place/);
 assert.match(feedback.body,/Next · Return to Read the Place/);
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
});

test('hiding a cell removes only its descendants and stays dismissed',async()=>{
 const {welcomeExperienceFrames,welcomeCellAtPoint}=await import('../app/services/arWelcomeShowcase.js');
 const hidden=new Set(['0:lim-intro-analysis-climate','2:food-forest']);
 const progression={expandedLimIds:['lim-intro-analysis','lim-intro-food-forest']};
 const frames=welcomeExperienceFrames(64000,false,undefined,hidden,progression);
 const analysis=frames.find(frame=>frame.corner===0),food=frames.find(frame=>frame.corner===2),smart=frames.find(frame=>frame.corner===3);
 const hiddenClimate=analysis.nodes.find(n=>n.id==='lim-intro-analysis-climate');
 assert.equal(hiddenClimate.hollow,true);
 assert.ok(analysis.nodes.filter(n=>n.parent===hiddenClimate.id).every(n=>n.opacity===0));
 assert.equal(analysis.nodes.find(n=>n.id==='lim-intro-analysis-topography').opacity,1);
 assert.equal(food.nodes.find(n=>n.id==='food-forest').hollow,true);
 assert.ok(food.nodes.filter(n=>n.id!=='food-forest').every(n=>n.opacity===0));assert.equal(smart.nodes.find(n=>n.id==='smart').opacity,1);
 const cell=analysis.nodes.find(n=>n.id==='lim-intro-analysis-topography');assert.equal(welcomeCellAtPoint(frames,cell.x,cell.y).key,cell.key);
 const gone=hiddenClimate;
 assert.equal(welcomeCellAtPoint(frames,gone.x,gone.y).key,gone.key);
 assert.equal(gone.hollow,true);
 assert.equal(welcomeCellAtPoint(frames,1250,1050),null);
 assert.deepEqual(welcomeExperienceFrames(640000,false,undefined,hidden,progression),frames);
});

test('shared welcome silhouette matches the regular 16-sided reference',async()=>{const {WELCOME_SHAPE_POINTS,WELCOME_SHAPE}=await import('../app/services/arWelcomePanel.js');assert.equal(WELCOME_SHAPE_POINTS.length,16);assert.equal(new Set(WELCOME_SHAPE_POINTS.map(p=>p.x+','+p.y)).size,16);assert.ok(WELCOME_SHAPE_POINTS.every(point=>Math.abs(Math.hypot(point.x-WELCOME_SHAPE.cx,point.y-WELCOME_SHAPE.cy)-WELCOME_SHAPE.radius)<.001));});
