import {drawArWelcomePanel} from './arWelcomePanel.js';
import {drawHexagon} from './plantInformationMeshCanvas.js';

// Presentation data only: no PIM records, stored IDs or navigation are modified.
export const AR_WELCOME_CORNER_MS = 16000;
export const AR_WELCOME_SHOWCASE_DURATION = AR_WELCOME_CORNER_MS * 4;
const topic = (label, children=[]) => ({label,children:children.map(item=>typeof item==='string'?{label:item,children:[]}:item)});
export const AR_WELCOME_GRAPHS = [
 topic('Climate',[
  topic('Subtropical',['Temperature','Rainfall','Frost tolerance','Seasonal growth','Suitable plants','Planting conditions']),
  topic('Tropical',['Humidity','Rainfall','Growth']),topic('Temperate',['Seasons','Frost','Dormancy']),
  topic('Cool',['Shelter','Wind exposure']),topic('Dry',['Water needs','Soil cover']),topic('Humid',['Airflow','Cloud cover'])]),
 topic('Food forest',[
  topic('Layers',['Canopy','Understorey','Shrub','Herb','Ground cover','Climbers','Roots']),
  topic('Function',['Habitat','Yield','Soil relationships']),topic('Light',['Shade','Height','Growth habit']),
  topic('Ecology',['Companions','Pollinators','Soil life'])]),
 topic('Plant',[
  topic('Identity',['Species','Cultivar','Characteristics']),topic('Propagation',['Seed','Cutting','Graft','Marcot','Division']),
  topic('Range',['Warmth','Latitude','Exposure']),topic('Layer',['Evergreen','Mature size','Form']),
  topic('Harvest',['Fruit','Flower','Season']),topic('Soil',['Moisture','Soil life'])]),
 topic('Pin',[
  topic('Place',['Story','Learning','Photo']),topic('Specimen',['Genus','Variety','Canopy layer','Method']),
  topic('Observation',['Date','Condition','Growth','Fruiting','Problem','Action']),
  topic('Note',['Task','Data','Learning'])])
];
export const createArWelcomeClusters = () => AR_WELCOME_GRAPHS.map(graph=>({...graph,revealSeed:Math.random()}));
const smooth = (value,start,duration) => {const t=Math.min(1,Math.max(0,(value-start)/duration));return t*t*(3-2*t);};
export const AR_WELCOME_CANVAS = {width:2500,height:2100};
// Transparent margins let cells grow OUTSIDE the unchanged welcome glass.
const positions=[[535,435],[215,338],[408,245],[656,266],[110,112],[309,93],[516,94],[786,105]];

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
 const fading=1-smooth(phase,14000,2000);
 for(const node of nodes){
  const [x,y]=positions[node.slot];node.x=corner%2?2500-x:x;node.y=corner<2?y:2100-y;
  node.progress=reducedMotion?1:smooth(phase,node.at,1500+(node.slot%3)*80);
  node.opacity=node.progress*(reducedMotion?1:fading);
  node.scale=(.38+.62*node.progress)*(reducedMotion?1:.86+.14*fading);
  node.baseRadius=node.depth?[92,94,90,84,86,82,88][node.slot-1]:104;
  node.radius=node.baseRadius*node.scale;
  node.hollow=false;
  node.emphasis=(1-smooth(phase,node.at+1800,1800))*node.progress;
  node.state=node.opacity===0?'hidden':phase>=14000?'contracting':node.progress<1?'revealing':'settled';
 }
 return {corner,phase,cycle,nodes};
}

export const AR_WELCOME_CONTINUE_MS = AR_WELCOME_SHOWCASE_DURATION / 2;
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
 // order; the per-session seed is stable across draws and hit testing.
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
   node.scale=reducedMotion?1:.38+.62*node.progress;
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

 function drawGlassCell(ctx,node,hue,elapsed,reducedMotion) {
 const wave=reducedMotion?0:Math.sin(elapsed/2800+node.slot*1.3);
 const opening=1-node.progress;
 ctx.save();ctx.globalAlpha=node.opacity;
 ctx.translate(node.drawX,node.drawY);
 ctx.rotate(reducedMotion?0:(opening*-.14+wave*.022));
 ctx.scale(node.scale*(reducedMotion?1:1-opening*.18),node.scale);
 const r=node.baseRadius, thickness=10+(reducedMotion?0:opening*12), hollow=Boolean(node.hollow);
 // Rear rim and connecting facets give the transparent face physical depth.
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
 const label=fitWelcomeCellLabel(ctx,node.label,r,node.depth);
 label.lines.forEach((line,i)=>ctx.fillText(line,0,(i-(label.lines.length-1)/2)*label.lineHeight));
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
 const byId=new Map(frame.nodes.map(node=>[node.id,node]));
 // Draw stems first; glass faces sit above their connections.
 for(const node of frame.nodes){
  const parent=byId.get(node.parent);
  const anchorX=frame.corner%2?1883:617,anchorY=frame.corner<2?580:1520;
  const originX=parent?parent.x:anchorX,originY=parent?parent.y:anchorY;
  const drift=reducedMotion?0:Math.sin(elapsed/2700+node.slot*1.7)*3*node.progress;
  node.drawX=node.x+(reducedMotion?0:(originX-node.x)*.16*(1-node.progress))+drift;
  node.drawY=node.y+(reducedMotion?0:(originY-node.y)*.16*(1-node.progress)+Math.cos(elapsed/3300+node.slot)*2*node.progress);
  if(!node.opacity)continue;
  const px=parent?parent.drawX:anchorX,py=parent?parent.drawY:anchorY;
  const dx=node.drawX-px,dy=node.drawY-py,length=Math.hypot(dx,dy)||1;
  const startRadius=parent?parent.radius:0;
  const ax=px+dx/length*startRadius,ay=py+dy/length*startRadius;
  const bx=node.drawX-dx/length*node.radius,by=node.drawY-dy/length*node.radius;
  const bend=(frame.corner%2?-1:1)*9;
  const cx=(ax+bx)/2-dy/length*bend,cy=(ay+by)/2+dx/length*bend;
  ctx.globalAlpha=node.opacity;ctx.strokeStyle=`hsla(${hue},32%,82%,.48)`;ctx.lineWidth=2.4;
  ctx.beginPath();ctx.moveTo(ax,ay);ctx.quadraticCurveTo(cx,cy,bx,by);ctx.stroke();
  if(!reducedMotion && node.progress<1){
   const t=node.progress,u=1-t;
   ctx.globalAlpha=node.opacity*(1-node.progress);ctx.fillStyle='#ecfbd7';
   ctx.beginPath();ctx.arc(u*u*ax+2*u*t*cx+t*t*bx,u*u*ay+2*u*t*cy+t*t*by,3,0,Math.PI*2);ctx.fill();
  }
 }
 for(const node of frame.nodes)if(node.opacity)drawGlassCell(ctx,node,hue,elapsed,reducedMotion);
 }
 ctx.restore();
 return frames;
}
