import test from 'node:test';
import assert from 'node:assert/strict';
import {welcomeNetworkFrame,AR_WELCOME_SHOWCASE_DURATION,drawArWelcomeShowcase} from '../app/services/arWelcomeShowcase.js';
test('one corner grows through three levels, fades and passes to the next',()=>{
 assert.ok(welcomeNetworkFrame(1000).nodes.every(n=>n.opacity===0));
 assert.equal(welcomeNetworkFrame(3500).nodes.filter(n=>n.opacity>0).length,1);
 const full=welcomeNetworkFrame(14000);assert.equal(full.nodes.length,8);assert.ok(full.nodes.every(n=>n.opacity===1));assert.equal(full.nodes.filter(n=>n.depth===2).length,4);
 assert.ok(welcomeNetworkFrame(15999).nodes.every(n=>n.opacity<.00001));
 assert.equal(welcomeNetworkFrame(16000).corner,1);assert.equal(welcomeNetworkFrame(32000).corner,2);assert.equal(welcomeNetworkFrame(48000).corner,3);
 assert.ok(welcomeNetworkFrame(AR_WELCOME_SHOWCASE_DURATION).nodes.every(n=>n.opacity===0));
});
test('nodes retain parent identity and fit without overlap or central text intrusion',()=>{
 for(let corner=0;corner<4;corner++){const {nodes}=welcomeNetworkFrame(corner*16000+12000);for(const [i,n] of nodes.entries()){
 assert.ok(n.x-n.radius>0 && n.x+n.radius<2500 && n.y-n.radius>0 && n.y+n.radius<2100);
 assert.ok(n.y+n.radius<560 || n.y-n.radius>1540 || n.x+n.radius<598 || n.x-n.radius>1902);
 if(n.parent)assert.ok(nodes.find(p=>p.id===n.parent));
 for(const other of nodes.slice(i+1))assert.ok(Math.hypot(n.x-other.x,n.y-other.y)>n.radius+other.radius);
 }}
});
test('reduced motion remains static and later loops explore additional branches',()=>{
 assert.deepEqual(welcomeNetworkFrame(0,true),welcomeNetworkFrame(999999,true));
 assert.notDeepEqual(welcomeNetworkFrame(12000).nodes.map(n=>n.label),welcomeNetworkFrame(76000).nodes.map(n=>n.label));
});

// Exercise the renderer with canvas state restoration, which caused the label bug.
test('cell labels stay centred and fitted even when the caller uses left-aligned text',()=>{
 const stack=[],labels=[];
 const ctx={textAlign:'left',textBaseline:'alphabetic',font:'10px system-ui',
 save(){stack.push({textAlign:this.textAlign,textBaseline:this.textBaseline,font:this.font});},
 restore(){Object.assign(this,stack.pop());},
 measureText(text){return {width:text.length*parseFloat(this.font.split(' ')[1]||10)*.56};},
 fillText(text,x,y){labels.push({text,x,y,align:this.textAlign,baseline:this.textBaseline,width:this.measureText(text).width});},
 createLinearGradient(){return {addColorStop(){}};},createRadialGradient(){return {addColorStop(){}};}};
 for(const method of ['clearRect','translate','rotate','scale','beginPath','moveTo','lineTo','quadraticCurveTo','closePath','fill','stroke','roundRect','arc'])ctx[method]=()=>{};
 drawArWelcomeShowcase(ctx,64000,true);
 const frame=welcomeNetworkFrame(12000,true);
 for(const node of frame.nodes){for(const word of node.label.split(' ')){
  const label=labels.find(l=>l.text===word && l.x===0);
  assert.ok(label,`missing cell label: ${word}`);assert.equal(label.align,'center');assert.equal(label.baseline,'middle');assert.ok(label.width<=node.baseRadius*1.48);
 }}
 assert.equal(ctx.textAlign,'left');assert.equal(ctx.textBaseline,'alphabetic');
});

test('Continue protects an eight-second opening while the full bloom continues',async()=>{
 const {welcomeCanContinue,AR_WELCOME_CONTINUE_MS}=await import('../app/services/arWelcomeShowcase.js');
 assert.equal(AR_WELCOME_CONTINUE_MS,8000);
 for(const elapsed of [-1,0,7999,NaN])assert.equal(welcomeCanContinue(elapsed),false);
 assert.equal(welcomeCanContinue(8000),true);assert.equal(welcomeCanContinue(96000),true);
});

test('developed corners persist across the midpoint, narration and later demo steps',async()=>{
 const {welcomeExperienceFrames}=await import('../app/services/arWelcomeShowcase.js');
 const early=welcomeExperienceFrames(14500).flatMap(f=>f.nodes).filter(n=>n.opacity===1).length;
 const middle=welcomeExperienceFrames(32000).flatMap(f=>f.nodes).filter(n=>n.opacity===1).length;
 assert.ok(early>0 && early<middle && middle<32);
 const settled=welcomeExperienceFrames(64000);assert.equal(settled.flatMap(f=>f.nodes).filter(n=>n.opacity===1).length,32);
 assert.deepEqual(welcomeExperienceFrames(640000),settled);
 assert.ok(welcomeExperienceFrames(0,true).flatMap(f=>f.nodes).every(n=>n.opacity===0));
 assert.deepEqual(welcomeExperienceFrames(64000,true),settled);
});

test('welcome buds alternate corners, preserve ancestry, and fade progressively in reduced motion',async()=>{
 const {welcomeExperienceFrames,createArWelcomeClusters}=await import('../app/services/arWelcomeShowcase.js');
 const graphs=createArWelcomeClusters();
 const nodes=welcomeExperienceFrames(0,false,graphs).flatMap(f=>f.nodes);
 assert.ok(nodes.every(n=>n.opacity===0));
 const order=[...nodes].sort((a,b)=>a.revealAt-b.revealAt);
 for(let i=1;i<order.length;i++)assert.notEqual(order[i].key[0],order[i-1].key[0]);
 for(const node of nodes)if(node.parent){const parent=nodes.find(p=>p.key===node.key[0]+':'+node.parent);assert.ok(node.revealAt>parent.revealAt+1450);}
 const opening=welcomeExperienceFrames(order[0].revealAt+700,true,graphs).flatMap(f=>f.nodes).find(n=>n.key===order[0].key);
 assert.ok(opening.opacity>0 && opening.opacity<1);assert.equal(opening.scale,1);
 assert.deepEqual(welcomeExperienceFrames(15000,false,graphs),welcomeExperienceFrames(15000,false,graphs));
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
 const hidden=new Set(['0:branch-0','2:root']);
 const frames=welcomeExperienceFrames(64000,false,undefined,hidden);
 const climate=frames[0].nodes;
 assert.equal(climate.find(n=>n.id==='branch-0').hollow,true);
 for(const id of ['attribute-0','attribute-1'])assert.equal(climate.find(n=>n.id===id).opacity,0);
 assert.equal(climate.find(n=>n.id==='branch-1').opacity,1);
 assert.equal(frames[2].nodes.find(n=>n.id==='root').hollow,true);
 assert.ok(frames[2].nodes.filter(n=>n.id!=='root').every(n=>n.opacity===0));assert.ok(frames[3].nodes.every(n=>n.opacity===1));
 const cell=climate.find(n=>n.id==='branch-1');assert.equal(welcomeCellAtPoint(frames,cell.x,cell.y).key,cell.key);
 const gone=climate.find(n=>n.id==='branch-0');
 assert.equal(welcomeCellAtPoint(frames,gone.x,gone.y).key,gone.key);
 assert.equal(gone.hollow,true);
 assert.equal(welcomeCellAtPoint(frames,1250,1050),null);
 assert.deepEqual(welcomeExperienceFrames(640000,false,undefined,hidden),frames);
});
