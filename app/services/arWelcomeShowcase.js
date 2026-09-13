import {drawArWelcomePanel} from './arWelcomePanel.js';
import {drawHexagon} from './plantInformationMeshCanvas.js';
import {LIM_CELLS, LIM_GRAPHS, LIM_GROUPS} from './limLearning.js';

// Presentation data only: no PIM records, stored IDs or navigation are modified.
export const AR_WELCOME_CORNER_MS = 16000;
export const AR_WELCOME_SHOWCASE_DURATION = AR_WELCOME_CORNER_MS * 4;
// Compatibility export for visual showcase callers. The content authority is
// the separate Learning Information Mesh document.
export const AR_WELCOME_GRAPHS = LIM_GRAPHS;
export const createArWelcomeClusters = () => AR_WELCOME_GRAPHS.map((graph,index)=>({...graph,revealSeed:(index+1)*.173}));
const smooth = (value,start,duration) => {const t=Math.min(1,Math.max(0,(value-start)/duration));return t*t*(3-2*t);};
export const AR_WELCOME_CANVAS = {width:2500,height:2100};
// LIM uses one flat-top hex lattice. Axial coordinates share full edges when
// converted with these spacings. Each corner has a deterministic silhouette;
// no random seed participates in layout or cell identity.
export const LIM_LAYOUT = Object.freeze({
 radius: 82,
 origins: Object.freeze([[760,720],[1740,720],[760,1410],[1740,1410]]),
 patterns: Object.freeze([
  Object.freeze([[0,0],[-1,0],[0,-1],[1,-1],[-1,-1],[-1,1],[0,-2],[1,-2]]),
  Object.freeze([[0,0],[0,-1],[1,-1],[1,0],[0,-2],[1,-2],[2,-1],[2,0]]),
  Object.freeze([[0,0],[-1,0],[-1,1],[0,1],[-2,0],[-2,1],[-1,2],[0,2]]),
  Object.freeze([[0,0],[0,1],[1,1],[1,0],[0,2],[1,2],[2,1],[2,0]])
 ]),
 reservedRoleOrder: Object.freeze(['root','branch-0','branch-1','branch-2','attribute-0','attribute-1','attribute-2','attribute-3'])
});
const axialPoint=(q,r,radius)=>({x:q*radius*1.5,y:(r+q*.5)*radius*Math.sqrt(3)});
export function limLayoutPoint(corner,slot){
 const origin=LIM_LAYOUT.origins[corner%LIM_LAYOUT.origins.length]||LIM_LAYOUT.origins[0];
 const axial=LIM_LAYOUT.patterns[corner%LIM_LAYOUT.patterns.length][slot]||[0,0];
 const point=axialPoint(axial[0],axial[1],LIM_LAYOUT.radius);
 return {x:origin[0]+point.x,y:origin[1]+point.y};
}

// Reserve every authored LIM cell in a stable axial row map. The showcase
// reveals eight slots per corner, while future cells already have positions and
// can be faded in without moving any existing cell.
const reservedAxial=(index)=>{
 if(index===0)return [0,0];
 let ring=1,first=1;
 while(index>=first+ring*6){first+=ring*6;ring++;}
 let q=0,r=-ring,offset=index-first;
 const directions=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
 for(const [dq,dr] of directions){const steps=Math.min(ring,offset);q+=dq*steps;r+=dr*steps;offset-=steps;if(!offset)break;}
 return [q,r];
};
export const LIM_RESERVED_POSITIONS = Object.freeze(Object.fromEntries(LIM_CELLS.map((cell,index)=>{
 const groupIndex=Math.max(0,LIM_GROUPS.findIndex(group=>group.id===cell.groupId));
 return [cell.id,Object.freeze({group:cell.groupId,corner:groupIndex,axial:Object.freeze(reservedAxial(index)),role:cell.layoutRole})];
})));

// Derive a bounded, three-level graph for the active corner. Later loops explore
// different branches instead of crowding the entire knowledge tree onto the panel.
export function welcomeNetworkFrame(elapsed,reducedMotion=false,graphs=AR_WELCOME_GRAPHS) {
 const time=reducedMotion?12000:Math.max(0,elapsed);
 const corner=Math.floor(time/AR_WELCOME_CORNER_MS)%graphs.length;
 const phase=time%AR_WELCOME_CORNER_MS;
 const cycle=Math.floor(time/(AR_WELCOME_CORNER_MS*graphs.length));
 const tree=graphs[corner];
 const children=Array.from({length:Math.min(3,tree.children.length)},(_,i)=>tree.children[(i+cycle)%tree.children.length]);
 const nodes=[{id:'root',parent:null,label:tree.label,depth:0,at:2000,slot:0}];
 children.forEach((child,i)=>nodes.push({id:`branch-${i}`,parent:'root',label:child.label,depth:1,at:3500+i*1500,slot:i+1}));
 // First branch demonstrates two descendants; other branches each add one.
 const leaves=[[0,0],[0,1],[1,0],[2,0]];
 leaves.forEach(([parent,index],i)=>{const list=children[parent]?.children || [];if(!list.length)return;const item=list[(index+cycle)%list.length];nodes.push({id:`attribute-${i}`,parent:`branch-${parent}`,label:item.label,depth:2,at:8200+i*1300,slot:4+i});});
 const cellForPath=path=>LIM_CELLS.find(cell=>cell.path.length===path.length&&cell.path.every((label,index)=>label===path[index]));
 nodes.forEach(node=>{const parent=nodes.find(candidate=>candidate.id===node.parent);const path=parent?[...(parent.path||[tree.label]),node.label]:[tree.label];node.path=path;node.limId=cellForPath(path)?.id||'';});
 const fading=1-smooth(phase,14000,2000);
 for(const node of nodes){
  const point=limLayoutPoint(corner,node.slot);node.x=point.x;node.y=point.y;
  node.progress=reducedMotion?1:smooth(phase,node.at,1500+(node.slot%3)*80);
  node.opacity=node.progress*(reducedMotion?1:fading);
  node.scale=1;
  node.baseRadius=LIM_LAYOUT.radius;
  node.radius=node.baseRadius*node.scale;
  node.hollow=false;
  node.emphasis=(1-smooth(phase,node.at+1800,1800))*node.progress;
  node.state=node.opacity===0?'hidden':phase>=14000?'contracting':node.progress<1?'revealing':'settled';
 }
 return {corner,phase,cycle,nodes};
}

// Protect the first few discoveries without making the full bloom a loading gate.
export const AR_WELCOME_CONTINUE_MS = 8000;
export const welcomeCanContinue = elapsed => Number.isFinite(elapsed) && elapsed >= AR_WELCOME_CONTINUE_MS;

// Count presented time rather than time spent in a permission dialog, another
// tab, or a suspended XR session. Multiple eyes share the same clock.
export function createWelcomePresentationClock() {
 let previous=null,elapsed=0;
 return {get elapsed(){return elapsed;},tick(now,visible=true){
  if(!Number.isFinite(now))return elapsed;
  const delta=previous===null?0:now-previous;previous=now;
  if(visible && delta>=0 && delta<500)elapsed+=delta;
  return elapsed;
 }};
}

function revealFrames(graphs) {
 const frames=graphs.map((_,corner)=>welcomeNetworkFrame(corner*AR_WELCOME_CORNER_MS+12000,false,graphs));
 let seed=Math.floor((graphs[0]?.revealSeed ?? .3721)*2147483646)+1;
 const random=()=>{seed=seed*16807%2147483647;return (seed-1)/2147483646;};
 let at=2200,last=-1;
 // A different corner buds on each beat. Each wave retains parent-before-child
 // order; the deterministic seed is stable across sessions, draws and hit testing.
 for(let slot=0;slot<8;slot++){
  const order=frames.map((_,i)=>i);
  for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  if(order[0]===last && order.length>1)[order[0],order[1]]=[order[1],order[0]];
  for(const corner of order){const node=frames[corner].nodes[slot];if(!node)continue;node.revealAt=at;at+=1350+random()*400;last=corner;}
 }
 return frames;
}

// Keep developed cells in place. Dismissal uses stable corner/node identities,
// so hidden branches stay hidden while the rest of the demo continues.
export function welcomeExperienceFrames(elapsed,reducedMotion=false,graphs=AR_WELCOME_GRAPHS,hidden=new Set()) {
 return revealFrames(graphs).map(frame=>{
  const corner=frame.corner,time=Number.isFinite(elapsed)?Math.max(0,elapsed):0;
  frame.nodes.forEach(node=>{
   node.progress=smooth(time,node.revealAt,1450);
   node.opacity=node.progress;
   // Reveal uses opacity only. The reserved cell footprint never grows or
   // shifts when another LIM cell is selected or a later step begins.
   node.scale=1;
   node.radius=node.baseRadius*node.scale;
   node.emphasis=reducedMotion?0:(1-smooth(time,node.revealAt+1800,1800))*node.progress;
   node.state=node.progress===0?'hidden':node.progress<1?'revealing':'settled';
  });
  const dismissed=new Set();
  for(const node of frame.nodes){
   node.key=`${corner}:${node.id}`;
   const collapsed=hidden.has(node.key);
   if(collapsed && node.progress>.02){
    node.hollow=true;
    node.opacity=Math.max(node.opacity,.76);
    dismissed.add(node.id);
   } else if(dismissed.has(node.parent)){
    node.opacity=0;
    dismissed.add(node.id);
   }
  }
  return frame;
 });
}

export function welcomeCellAtPoint(frames,x,y) {
 for(const frame of frames)for(const node of frame.nodes){
  // Inscribed hexagon area: a hit cannot leak into neighbouring empty space.
  if(node.opacity>.5 && Math.hypot(x-node.x,y-node.y)<node.radius*.86)return node;
 }
 return null;
}

// Labels share the face transform, so their centre cannot drift off the cell.
export function fitWelcomeCellLabel(ctx,label,radius,depth) {
 const lines=label.split(' '), maxWidth=radius*1.48;
 let font=depth?34:39;
 do {ctx.font=`${depth?'550':'650'} ${font}px system-ui`;if(lines.every(line=>ctx.measureText(line).width<=maxWidth))break;font--;}
 while(font>12);
 return {lines,font,lineHeight:font*1.12,maxWidth};
}

 function drawGlassCell(ctx,node,hue,elapsed,reducedMotion,drawLabel=true) {
 const opening=1-node.progress;
 ctx.save();ctx.globalAlpha=node.opacity;
 ctx.translate(node.drawX,node.drawY);
 ctx.rotate(0);
 ctx.scale(node.scale,node.scale);
 const r=node.baseRadius, thickness=10+(reducedMotion?0:opening*12), hollow=Boolean(node.hollow);
 // Rear rim gives the transparent face physical depth without separating cells.
 drawHexagon(ctx,5,thickness,r,'rgba(15,43,32,.04)',`hsla(${hue},24%,64%,${hollow?.42:.24})`,2);
 for(let i=0;i<6;i++){
  const a=i*Math.PI/3,x=Math.cos(a)*r,y=Math.sin(a)*r;
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+5,y+thickness);
  ctx.strokeStyle=`hsla(${hue},36%,83%,.28)`;ctx.lineWidth=1.6;ctx.stroke();
 }
 const glass=ctx.createLinearGradient(-r,-r,r*.6,r);
 glass.addColorStop(0,`hsla(${hue},28%,90%,${hollow?.035:.26})`);
 glass.addColorStop(.45,`hsla(${hue},23%,78%,${hollow?.015:.09})`);
 glass.addColorStop(1,`rgba(15,53,36,${hollow?.025:.17})`);
 const rim=ctx.createLinearGradient(-r,-r,r,r);
 rim.addColorStop(0,'rgba(246,255,231,.92)');rim.addColorStop(.5,`hsla(${hue},31%,78%,.58)`);rim.addColorStop(1,'rgba(232,251,217,.3)');
 ctx.shadowColor='rgba(7,29,18,.22)';ctx.shadowBlur=12;ctx.shadowOffsetY=5;
 drawHexagon(ctx,0,0,r,glass,rim,hollow?2.5:3);
 ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 drawHexagon(ctx,0,0,r-6,'rgba(255,255,255,0)',`hsla(${hue},28%,91%,${hollow?.4:.16})`,hollow?2:1);
 // A quiet change in edge light follows the opening, without flashing.
 ctx.globalAlpha=node.opacity*(.12+node.emphasis*.3);ctx.strokeStyle='#efffe2';ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(-r,0);ctx.lineTo(-r/2,-r*.866);ctx.lineTo(r/2,-r*.866);ctx.stroke();
 ctx.globalAlpha=node.opacity*smooth(node.progress,.35,.65);
 ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.fillStyle='rgba(255,255,245,.98)';
 ctx.shadowColor='rgba(6,28,15,.8)';ctx.shadowBlur=4;ctx.shadowOffsetY=1;
 if(drawLabel){
  const label=fitWelcomeCellLabel(ctx,node.label,r,node.depth);
  label.lines.forEach((line,i)=>ctx.fillText(line,0,(i-(label.lines.length-1)/2)*label.lineHeight));
 }
 ctx.restore();
}

export function drawArWelcomeShowcase(ctx,elapsed,reducedMotion=false,graphs=AR_WELCOME_GRAPHS,options={}) {
 ctx.clearRect(0,0,2500,2100);ctx.save();ctx.save();ctx.translate(550,510);ctx.globalAlpha=reducedMotion?1:smooth(elapsed,0,1800);
 if(options.drawPanel!==false){
 drawArWelcomePanel(ctx);
 if(options.drawContent){options.drawContent(ctx);}else{
 ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.globalAlpha=reducedMotion?1:smooth(elapsed,500,3000);ctx.fillStyle='#dcef95';ctx.font='750 30px system-ui';ctx.fillText('A LIVING WORLD OF KNOWLEDGE',700,412);
 ctx.fillStyle='#fff';ctx.font='760 72px system-ui';ctx.fillText('NourishlandXR',700,500);
 ctx.font='500 32px system-ui';ctx.fillText('Explore the wonders of plants and ecosystems',700,577);
 ctx.fillText('in an immersive, interactive way.',700,622);
 ctx.font='24px system-ui';ctx.fillText(welcomeCanContinue(elapsed)?'Continue to explore · select a cell to hide its branch':'Let the knowledge unfold',700,690);
 }
 }
 ctx.restore();
 const frames=welcomeExperienceFrames(elapsed,reducedMotion,graphs,options.hidden);
 for(const frame of frames){
 const hue=[105,42,165,85][frame.corner];
 // LIM cells are drawn directly on their reserved lattice positions. There
 // are no connector strokes; shared hex edges provide the relationship cue.
 for(const node of frame.nodes){node.drawX=node.x;node.drawY=node.y;}
 for(const node of frame.nodes)if(node.opacity)drawGlassCell(ctx,node,hue,elapsed,reducedMotion,options.drawCellLabels!==false);
 }
 ctx.restore();
 return frames;
}
