import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {welcomeNetworkFrame,welcomeExperienceFrames,AR_WELCOME_SHOWCASE_DURATION,drawArWelcomeShowcase,createArWelcomeClusters,LIM_LAYOUT,LIM_RESERVED_POSITIONS} from '../app/services/arWelcomeShowcase.js';
import {LIM_ALL_CELLS,LIM_INTRO_CELLS,limLearningContent} from '../app/services/limLearning.js';
const styles=fs.readFileSync(new URL('../app/style.css',import.meta.url),'utf8');
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
test('portrait and landscape phones frame the LIM without shrinking its cells',()=>{
 assert.match(styles, /@media \(max-width:620px\)[\s\S]*width:550px;[\s\S]*min-width:550px;/);
 assert.match(styles, /orientation:landscape\) and \(max-height:720px\)[\s\S]*inset:44% auto auto 67%;[\s\S]*width:620px;/);
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
 assert.deepEqual(order.filter(node=>node.depth===0 && node.label!=='Vision').map(node=>node.label),['Place','Life','Forest','Purpose']);
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
 assert.deepEqual(opening.filter(node=>node.depth===0 && node.label!=='Vision' && node.opacity>.5).map(node=>node.label),['Place']);
 const foundations=welcomeExperienceFrames(activationAt+7200,false,graphs,new Set(),{visionActivated:true,visionActivatedAt:activationAt}).flatMap(frame=>frame.nodes);
 assert.deepEqual(foundations.filter(node=>node.depth===0 && node.label!=='Vision' && node.opacity===1).map(node=>node.label),['Place','Life','Forest','Purpose']);
 assert.ok(foundations.every(node=>node.depth===0 || node.opacity===0));
 const branching=welcomeExperienceFrames(activationAt+9000,false,graphs,new Set(),{visionActivated:true,visionActivatedAt:activationAt,expandedLimIds:['lim-intro-analysis'],expandedAt:{'lim-intro-analysis':activationAt+7200}}).flatMap(frame=>frame.nodes);
 assert.ok(branching.some(node=>node.depth===1 && node.opacity>0));
 assert.ok(branching.filter(node=>node.depth===1 && node.opacity>0).every(node=>node.primaryFaceId===undefined || node.key.startsWith('0:')));
});

test('every pitch-deck cell carries a deep learning prompt without changing its identity',()=>{
 for(const cell of LIM_INTRO_CELLS){
  const content=limLearningContent(cell.id);
  assert.equal(content.id,cell.id);
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
