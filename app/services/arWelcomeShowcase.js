import {drawArWelcomePanel,welcomeBoundary} from './arWelcomePanel.js';
import {drawHexagon} from './plantInformationMeshCanvas.js';
import {LIM_ALL_CELLS, LIM_FACES, LIM_GRAPHS, LIM_INTRO_BRANCHES} from './limLearning.js';

// Presentation data only: no PIM records, stored IDs or navigation are modified.
export const AR_WELCOME_CORNER_MS = 16000;
export const AR_WELCOME_SHOWCASE_DURATION = AR_WELCOME_CORNER_MS * 8;
// The opening is rendered on the same LIM surface as the settled mesh. It is
// deliberately unhurried so the authored parent/child sequence can be read
// as it travels around the protected welcome surface.
export const AR_WELCOME_OPENING_MS = 16000;
export const AR_WELCOME_REDUCED_OPENING_MS = 1600;
export const LIM_REVEAL_ANIMATION_MS = 4500;
export function welcomeRevealIsAnimating(elapsed,expandedTimes=[],visionAt=NaN){
 return [visionAt,...expandedTimes].some(start=>Number.isFinite(start)&&elapsed>=start&&elapsed-start<LIM_REVEAL_ANIMATION_MS);
}
// Compatibility export for visual showcase callers. The content authority is
// the separate Learning Information Mesh document.
export const AR_WELCOME_GRAPHS = LIM_GRAPHS;
export const createArWelcomeClusters = () => AR_WELCOME_GRAPHS.map((graph,index)=>({...graph,revealSeed:(index+1)*.173}));
// First cross-branch prototype. These two foundations describe one practical
// relationship: guild design gives plant functions a place in the system.
export const LIM_RELATION_PROTOTYPES = Object.freeze([
 Object.freeze({ids:Object.freeze(['lim-intro-literacy-guilds','lim-intro-food-function']),accent:'#9fbd78',label:'Guilds connect plant relationships with useful forest functions'})
]);
export function welcomeRelationshipFor(limId){return LIM_RELATION_PROTOTYPES.find(item=>item.ids.includes(limId)) || null;}
const smooth = (value,start,duration) => {const t=Math.min(1,Math.max(0,(value-start)/duration));return t*t*(3-2*t);};
export const AR_WELCOME_CANVAS = {width:2500,height:2100};
// The welcome note uses its original local coordinates inside this centred
// inset. LIM cells already use full-canvas coordinates, which are also used by
// DOM and XR hit targets.
export const WELCOME_PANEL_DRAW_OFFSET = Object.freeze({x:550,y:510});
export const WELCOME_DRAW_OFFSET = WELCOME_PANEL_DRAW_OFFSET;
// The eight parent faces sit clockwise around the welcome note. Each local
// cluster uses one flat-top axial lattice, so neighbouring cells share edges.
// The eight small pattern variations give the outside of the mesh an organic,
// deterministic silhouette without changing any cell's position at runtime.
export const LIM_LAYOUT = Object.freeze({
 radius: 92,
 origins: Object.freeze([
  Object.freeze([1250,700]), Object.freeze([1690,710]),
  Object.freeze([1800,1050]), Object.freeze([1690,1405]),
  Object.freeze([1250,1435]), Object.freeze([810,1405]),
  Object.freeze([700,1050]), Object.freeze([810,710])
 ]),
 patterns: Object.freeze([
  Object.freeze([[0,0],[-1,0],[0,-1],[1,-1]]),
  Object.freeze([[0,0],[1,-1],[1,0],[2,-1]]),
  Object.freeze([[0,0],[1,0],[1,-1],[1,1]]),
  Object.freeze([[0,0],[1,0],[0,1],[1,1]]),
  Object.freeze([[0,0],[0,1],[-1,1],[1,0]]),
  Object.freeze([[0,0],[-1,1],[-1,0],[-2,1]]),
  Object.freeze([[0,0],[-1,0],[-1,-1],[-1,1]]),
  Object.freeze([[0,0],[-1,0],[-1,-1],[0,-1]])
 ]),
 reservedRoleOrder: Object.freeze(['face','branch-0','branch-1','attribute-0'])
});
const axialPoint=(q,r,radius)=>({x:q*radius*1.5,y:(r+q*.5)*radius*Math.sqrt(3)});
export function limLayoutPoint(corner,slot){
 const origin=LIM_LAYOUT.origins[corner%LIM_LAYOUT.origins.length]||LIM_LAYOUT.origins[0];
 const axial=LIM_LAYOUT.patterns[corner%LIM_LAYOUT.patterns.length][slot]||[0,0];
 const point=axialPoint(axial[0],axial[1],LIM_LAYOUT.radius);
 return {x:origin[0]+point.x,y:origin[1]+point.y};
}

// Reserve every authored LIM cell in a stable axial row map. The showcase
// reveals a compact sample, while every source cell already has a position and
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
const reservedCounts=new Map();
export const LIM_RESERVED_POSITIONS = Object.freeze(Object.fromEntries(LIM_ALL_CELLS.map(cell=>{
 const faceIndex=Math.max(0,LIM_FACES.findIndex(face=>face.id===cell.primaryFaceId));
 const faceCount=reservedCounts.get(cell.primaryFaceId)||0;reservedCounts.set(cell.primaryFaceId,faceCount+1);
 return [cell.id,Object.freeze({face:cell.primaryFaceId,faceIndex,corner:faceIndex,axial:Object.freeze(reservedAxial(faceCount)),role:cell.layoutRole})];
})));

// Derive a bounded, three-level graph for the active corner. Later loops explore
// different branches instead of crowding the entire knowledge tree onto the panel.
export function welcomeNetworkFrame(elapsed,reducedMotion=false,graphs=AR_WELCOME_GRAPHS) {
 const time=reducedMotion?12000:Math.max(0,elapsed);
 const corner=Math.floor(time/AR_WELCOME_CORNER_MS)%graphs.length;
 const phase=time%AR_WELCOME_CORNER_MS;
 const cycle=Math.floor(time/(AR_WELCOME_CORNER_MS*graphs.length));
 const tree=graphs[corner];
 const children=Array.from({length:Math.min(2,tree.children.length)},(_,i)=>tree.children[(i+cycle)%tree.children.length]);
 const nodes=[{id:'face',parent:null,label:tree.label,depth:0,at:1800,slot:0,limId:tree.limId,accent:tree.accent,accessibilityLabel:tree.accessibilityLabel}];
 children.forEach((child,i)=>nodes.push({id:`branch-${i}`,parent:'face',label:child.label,depth:1,at:3300+i*1450,slot:i+1,limId:child.limId,accent:child.accent,accessibilityLabel:child.accessibilityLabel}));
 const firstChildren=children[0]?.children || [];
 if(firstChildren.length){const item=firstChildren[cycle%firstChildren.length];nodes.push({id:'attribute-0',parent:'branch-0',label:item.label,depth:2,at:6800,slot:3,limId:item.limId,accent:item.accent,accessibilityLabel:item.accessibilityLabel});}
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
export const AR_WELCOME_CONTINUE_MS = 0;
export const AR_WELCOME_POST_VISION_CONTINUE_MS = 0;
export function welcomeCanContinue(elapsed,visionActivatedAt){
 if(!Number.isFinite(elapsed))return false;
 // The cells are optional exploration. The welcome panel can advance after
 // its short entrance, whether or not Vision has been selected.
 return elapsed>=AR_WELCOME_CONTINUE_MS;
}

// Count presented time rather than time spent in a permission dialog, another
// tab, or a suspended XR session. Multiple eyes share the same clock.
export function createWelcomePresentationClock() {
 let previous=null,elapsed=0;
 return {get elapsed(){return elapsed;},tick(now,visible=true){
  if(!Number.isFinite(now))return elapsed;
  if(previous===null){previous=now;return elapsed;}
  // A DOM rAF timestamp can be slightly older than performance.now() from
  // the XR renderer. Never rewind the reference point or the same rendering
  // work is counted twice and the opening races ahead.
  if(now<previous)return elapsed;
  const delta=now-previous;previous=now;
  // Visible phone and embedded-browser frames can occasionally arrive a
  // second apart. Count those frames so the opening does not crawl, while a
  // permission dialog or suspended tab still cannot skip the sequence.
  if(visible && delta>=0 && delta<2000)elapsed+=delta;
  return elapsed;
 }};
}

function attachedRoot(angle) {
 const edge=welcomeBoundary(angle);
 // Fixed root footprint just outside the shared board perimeter.
 return {x:edge.x+WELCOME_PANEL_DRAW_OFFSET.x+Math.cos(angle)*94,
  y:edge.y+WELCOME_PANEL_DRAW_OFFSET.y+Math.sin(angle)*94,
  growthAngle:angle,
  attachment:{x:edge.x+WELCOME_PANEL_DRAW_OFFSET.x,y:edge.y+WELCOME_PANEL_DRAW_OFFSET.y}};
}
const settledLayouts=new WeakMap();
function settleWelcomeLayout(frames) {
 const placed=frames.flatMap(frame=>frame.nodes.filter(node=>node.depth===0));
 const byId=new Map(frames.flatMap(frame=>frame.nodes.map(node=>[`${frame.corner}:${node.id}`,node])));
 const moving=frames.flatMap(frame=>frame.nodes.filter(node=>node.depth>0).map(node=>({frame,node})))
  .sort((a,b)=>a.node.depth-b.node.depth||a.node.revealAt-b.node.revealAt||a.frame.corner-b.frame.corner);
 const minGap=LIM_LAYOUT.radius*2+12;
 const angleSteps=[0,1,-1,2,-2,3,-3,4,-4,5,-5,6,-6,7,-7,8,-8,9,-9,10,-10,11,-11,12];
 for(const {frame,node} of moving){
  const parent=byId.get(`${frame.corner}:${node.parent}`);
  if(!parent)continue;
  const outward=parent.growthAngle??Math.atan2(parent.y-1050,parent.x-1250);
  const root=frame.nodes[0];
  const rootDirection={x:Math.cos(root.growthAngle),y:Math.sin(root.growthAngle)};
  const seeded=Math.atan2(node.y-parent.y,node.x-parent.x);
  const base=node.depth===1?outward:seeded;
  let best=null;
  // Begin at the shared-edge distance and widen only when another cell truly
  // occupies that space. Extra candidates prevent the old fallback overlap.
  const radii=[186,192,200,210,222,238,258,282,310,344,382,424,470,520,580,640,720,800,900,1000];
  for(const distance of radii){
   for(const step of angleSteps){
    const angle=base+step*Math.PI/12;
    const x=parent.x+Math.cos(angle)*distance,y=parent.y+Math.sin(angle)*distance;
    if(x<105||x>2395||y<105||y>1995)continue;
    // Every descendant stays on the outside of its root and clears the
    // welcome note by a full cell radius, including its glass rim.
    if((x-root.x)*rootDirection.x+(y-root.y)*rootDirection.y<0)continue;
    const boardX=Math.max(800,Math.min(1700,x)),boardY=Math.max(810,Math.min(1310,y));
    if(Math.hypot(x-boardX,y-boardY)<LIM_LAYOUT.radius+20)continue;
    if(placed.some(other=>Math.hypot(other.x-x,other.y-y)<minGap))continue;
    const angleCost=Math.abs(step)*3,seedCost=Math.hypot(node.x-x,node.y-y)*.08;
    const cost=distance+angleCost+seedCost;
    if(!best||cost<best.cost)best={x,y,cost};
   }
   if(best)break;
  }
  if(best){node.x=best.x;node.y=best.y;}
  placed.push(node);
 }
}
function revealFrames(graphs) {
 const cached=settledLayouts.get(graphs);
 if(cached)return cached.map(frame=>({...frame,nodes:frame.nodes.map(node=>({...node}))}));
 const legacy=graphs.map((_,corner)=>welcomeNetworkFrame(corner*AR_WELCOME_CORNER_MS+12000,false,graphs));
 const archetypeConfig=[
  {id:'analysis',limId:'lim-intro-analysis',quadrant:0,at:800,legacy:[0,3],legacyParents:['lim-intro-analysis-climate','lim-intro-analysis-landscape']},
  {id:'literacy',limId:'lim-intro-literacy',quadrant:1,at:1400,legacy:[2,4,5],legacyParents:['lim-intro-literacy-plants','lim-intro-literacy-fruit','lim-intro-literacy-guilds']},
  {id:'food-forest',limId:'lim-intro-food-forest',quadrant:2,at:2000,legacy:[1,6],legacyParents:['lim-intro-food-design','lim-intro-food-function']},
  {id:'smart',limId:'lim-intro-smart',quadrant:3,at:2600,legacy:[7],legacyParents:['lim-intro-smart-goals']}
 ];
 const archetypes=archetypeConfig.map(config=>{
  const branch=LIM_INTRO_BRANCHES.find(item=>item.id===config.limId);
  return {...config,label:branch?.displayLabel||branch?.title||config.id,accent:branch?.accent||'#dcef95',children:(branch?.children||[]).map(child=>[child.title,child.id])};
 });
 // These are forward/side distances in the root's own direction of growth.
 // Their slight unevenness keeps the branch cellular and connected without
 // arranging every family into the same mechanical honeycomb.
 const foundationOffsets=[[0,0],[158,-7],[294,73],[302,-91],[151,-154],[438,18],[292,238],[304,-244]];
 const foundationPoint=(quadrant,slot,root)=>{
  const [forward,side]=foundationOffsets[slot]||foundationOffsets.at(-1);
  const angle=root.growthAngle;
  const drift=((quadrant*11+slot*7)%13)-6;
  return {x:root.x+Math.cos(angle)*(forward+drift)-Math.sin(angle)*(side-drift*.45),
   y:root.y+Math.sin(angle)*(forward+drift)+Math.cos(angle)*(side-drift*.45)};
 };
 const reservedSlots=[[2,1],[1,1],[3,1],[2,0],[2,2],[1,0],[3,0],[1,2],[3,2],[0,1],[4,1],[0,0],[4,0],[0,2],[4,2],[2,3],[1,3],[3,3],[0,3],[4,3],
  [5,0],[5,1],[5,2],[5,3],[6,0],[6,1],[6,2],[6,3]];
 const reservedPoint=(quadrant,slot)=>{
  const [column,row]=reservedSlots[slot]||reservedSlots.at(-1),topY=160+row*159+(column%2)*79;
  const leftX=220+column*138;
  const offsets=[[65,-28],[22,15],[48,12],[65,-18]];
  const [shiftX,shiftY]=offsets[quadrant],seed=(quadrant*37+slot*19)%17-8;
  return {x:(quadrant===1||quadrant===2?2500-leftX:leftX)+shiftX+seed,
   y:(quadrant>=2?2150-topY:topY)+shiftY+((quadrant*11+slot*13)%17-8)};
 };
 const frames=archetypes.map((archetype,corner)=>{
  const nodes=[];
  const rootPoint=attachedRoot([3.92,5.48,.73,2.43][archetype.quadrant]);
  nodes.push({id:archetype.id,parent:null,label:archetype.label,depth:0,limId:archetype.limId,accent:archetype.accent,accessibilityLabel:`${archetype.label} archetype learning cell`,...rootPoint,baseRadius:LIM_LAYOUT.radius,radius:LIM_LAYOUT.radius,revealAt:archetype.at});
  archetype.children.forEach(([label,limId],index)=>{
   const position=foundationPoint(archetype.quadrant,index+1,rootPoint);
   nodes.push({id:limId,parent:archetype.id,label,depth:1,limId,accent:archetype.accent,accessibilityLabel:`${label} foundational learning cell`,...position,baseRadius:LIM_LAYOUT.radius,radius:LIM_LAYOUT.radius,revealAt:archetype.at+1800+index*700});
  });
  let slot=5;
  const nextReservedPosition=()=>{
   while(slot<reservedSlots.length){
    const candidate=reservedPoint(archetype.quadrant,slot++);
    if(nodes.every(node=>Math.hypot(node.x-candidate.x,node.y-candidate.y)>=LIM_LAYOUT.radius*1.49))return candidate;
   }
   return reservedPoint(archetype.quadrant,slot++);
  };
  archetype.legacy.forEach((legacyCorner,legacyIndex)=>{
   const source=legacy[legacyCorner],foundationParent=archetype.legacyParents[legacyIndex];
   // Keep the established four-cell showcase sample for each LIM face. The
   // complete LIM stays available through limLearningContent; presenting all
   // authored records at once would crowd the spatial board and create the
   // overlaps this fixed lattice is intended to prevent.
   const sourceCells=source.nodes;
   const idMap=new Map(sourceCells.map(cell=>[cell.id,`legacy-${legacyCorner}-${cell.id}`]));
   const foundation=nodes.find(node=>node.id===foundationParent);
   const faceAt=Math.max(archetype.at+6500+(legacyIndex*2100),foundation.revealAt+1700);
   sourceCells.forEach((cell,nodeIndex)=>{
    const position=nextReservedPosition(),id=idMap.get(cell.id);
    const parent=cell.parent===null?foundationParent:(idMap.get(cell.parent)||foundationParent);
    const parentNode=nodes.find(item=>item.id===parent);
    nodes.push({id,parent,label:cell.label,depth:cell.parent===null?2:3,limId:cell.limId,accent:cell.accent||archetype.accent,accessibilityLabel:cell.accessibilityLabel,...position,baseRadius:LIM_LAYOUT.radius,radius:LIM_LAYOUT.radius,revealAt:Math.max(faceAt+nodeIndex*560,(parentNode?.revealAt||0)+1700)});
   });
  });
  return {corner,phase:0,cycle:0,nodes};
 });
 const layout=frames;
 settleWelcomeLayout(layout);
 settledLayouts.set(graphs,layout);
 return layout.map(frame=>({...frame,nodes:frame.nodes.map(node=>({...node}))}));
}

// Keep developed cells in place. Dismissal uses stable corner/node identities,
// so hidden branches stay hidden while the rest of the demo continues.
export function welcomeExperienceFrames(elapsed,reducedMotion=false,graphs=AR_WELCOME_GRAPHS,hidden=new Set(),progression={}) {
 return revealFrames(graphs).map(frame=>{
  const corner=frame.corner,totalTime=Number.isFinite(elapsed)?Math.max(0,elapsed):0;
  const cellsActivatedAt=Number.isFinite(progression?.cellsActivatedAt)?progression.cellsActivatedAt:0;
  const time=Math.max(0,totalTime-cellsActivatedAt);
  const expanded=new Set(Array.isArray(progression?.expandedLimIds)?progression.expandedLimIds:[]);
  const expandedAt=progression?.expandedAt || {};
  frame.nodes.forEach(node=>{
   node.progress=smooth(time,node.revealAt,1450);
   node.opacity=node.progress;
   // Reveal uses opacity only. The reserved cell footprint never grows or
   // shifts when another LIM cell is selected or a later step begins.
   node.scale=1;
   node.radius=node.baseRadius*node.scale;
   node.emphasis=reducedMotion?0:(1-smooth(time,node.revealAt+1800,1800))*node.progress;
   node.state=node.progress===0?'hidden':node.progress<1?'revealing':'settled';
   // Every branch is an invitation, not ambient clutter. The four archetypes
   // are the stable roots. Selecting one blooms its immediate children in a
   // short, staggered sequence; Vision belongs to Shape the Outcome.
   if(!progression?.opening && node.depth>=1){
    const parent=frame.nodes.find(candidate=>candidate.id===node.parent);
    const parentId=parent?.limId || node.parent;
    const parentExpanded=expanded.has(node.parent)||expanded.has(parentId);
    if(!parentExpanded){node.progress=0;node.opacity=0;node.emphasis=0;node.state='hidden';}
    else if(Number.isFinite(expandedAt[parentId])){
     const siblings=frame.nodes.filter(candidate=>candidate.parent===node.parent);
     const siblingIndex=Math.max(0,siblings.indexOf(node));
     const branchTime=Math.max(0,totalTime-expandedAt[parentId]);
     node.progress=smooth(branchTime,180+siblingIndex*430,900);
     node.opacity=node.progress;node.emphasis=reducedMotion?0:(1-smooth(branchTime,1180+siblingIndex*430,950))*node.progress;
     node.state=node.progress===0?'hidden':node.progress<1?'revealing':'settled';
    }
   }
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
 let font=32;
 do {ctx.font=`620 ${font}px system-ui`;if(lines.every(line=>ctx.measureText(line).width<=maxWidth))break;font--;}
 while(font>16);
 return {lines,font,lineHeight:font*1.12,maxWidth};
}

function accentRgba(value,hue,alpha=.7){
 const match=String(value||'').trim().match(/^#([\da-f]{6})$/i);
 if(!match)return `hsla(${hue},52%,58%,${alpha})`;
 const hex=match[1];return `rgba(${parseInt(hex.slice(0,2),16)},${parseInt(hex.slice(2,4),16)},${parseInt(hex.slice(4),16)},${alpha})`;
}

function drawGlassCell(ctx,node,hue,elapsed,reducedMotion,drawLabel=true,visual={}) {
 ctx.save();ctx.globalAlpha=node.opacity;
 ctx.translate(node.drawX,node.drawY);
 ctx.rotate(0);
 ctx.scale(node.scale,node.scale);
 const r=node.baseRadius, hollow=Boolean(node.hollow);
 const selected=Boolean(visual.selected);
 const accent=node.accent || '';
 // Keep cells deliberately flat in XR: one face and one outline, with no
 // false rear rim, bevel, perspective edge or drop shadow.
 drawHexagon(ctx,0,0,r,accentRgba(accent,hue,hollow?.035:.10),`hsla(${hue},30%,86%,${hollow?.46:.62})`,hollow?2.5:3);
 if(visual.pathway && !selected){
  ctx.globalAlpha=node.opacity*.72;ctx.setLineDash([7,6]);ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=2.5;
  ctx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3,x=Math.cos(a)*(r-7),y=Math.sin(a)*(r-7);if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.stroke();ctx.setLineDash([]);
 }
 if(selected || visual.hovered){
  const hoverOnly=visual.hovered && !selected;
  drawHexagon(ctx,0,0,r-4,accentRgba(accent,hue,hoverOnly?.24:.28),'rgba(255,255,255,0)',0);
  ctx.globalAlpha=node.opacity*(hoverOnly?.98:.9);ctx.shadowColor=accentRgba(accent,hue,.72);ctx.shadowBlur=hoverOnly?18:14;ctx.strokeStyle=hoverOnly?'#f4ffe7':accent||`hsl(${hue},52%,58%)`;ctx.lineWidth=hoverOnly?5:4;
  ctx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3,x=Math.cos(a)*(r-2),y=Math.sin(a)*(r-2);if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.stroke();ctx.shadowBlur=0;
 }
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

const clamp01=value=>Math.min(1,Math.max(0,value));
const seededRandom=seed=>{
 let state=(Number(seed)>>>0)||0x7f4a7c15;
 return ()=>{
  state+=0x6d2b79f5;
  let value=state;value=Math.imul(value^(value>>>15),value|1);value^=value+Math.imul(value^(value>>>7),value|61);
  return ((value^(value>>>14))>>>0)/4294967296;
 };
};
const organicCurve=(from,to,random,bendScale=.24)=>{
 const dx=to.x-from.x,dy=to.y-from.y,length=Math.hypot(dx,dy)||1,nx=-dy/length,ny=dx/length;
 const firstBend=(random()-.5)*length*bendScale,secondBend=(random()-.5)*length*bendScale*.82;
 return {from:{...from},c1:{x:from.x+dx*(.2+random()*.12)+nx*firstBend,y:from.y+dy*(.2+random()*.12)+ny*firstBend},
  c2:{x:from.x+dx*(.66+random()*.12)+nx*secondBend,y:from.y+dy*(.66+random()*.12)+ny*secondBend},to:{...to}};
};
const cubicPoint=(curve,t)=>{
 const inverse=1-t,a=inverse*inverse*inverse,b=3*inverse*inverse*t,c=3*inverse*t*t,d=t*t*t;
 return {x:a*curve.from.x+b*curve.c1.x+c*curve.c2.x+d*curve.to.x,y:a*curve.from.y+b*curve.c1.y+c*curve.c2.y+d*curve.to.y};
};
const partialCubic=(curve,t)=>{
 const mix=(a,b)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
 const p01=mix(curve.from,curve.c1),p12=mix(curve.c1,curve.c2),p23=mix(curve.c2,curve.to),p012=mix(p01,p12),p123=mix(p12,p23);
 return {from:curve.from,c1:p01,c2:p012,to:mix(p012,p123)};
};
const bloomScale=progress=>{
 const value=clamp01(progress);
 return .12+.88*(1+.14*Math.sin(value*Math.PI));
};
function openingHash(value){
 let hash=2166136261;
 for(const character of String(value||'')){hash^=character.charCodeAt(0);hash=Math.imul(hash,16777619);}
 return hash>>>0;
}

function drawOrganicTendril(ctx,node,frame){
 if(!node.openingCurve || node.openingPathProgress<=0)return;
 const curve=partialCubic(node.openingCurve,node.openingPathProgress);
 const dx=curve.to.x-curve.from.x,dy=curve.to.y-curve.from.y,length=Math.hypot(dx,dy)||1;
 const parent=node.openingMeta?.parent;
 const startInset=parent?.isAttachment?0:(parent?.baseRadius||0)*(parent?.scale||0)*.94;
 const endInset=(node.baseRadius||0)*(node.scale||0)*.94;
 if(length<=startInset+endInset)return;
 const start={x:curve.from.x+dx/length*startInset,y:curve.from.y+dy/length*startInset};
 const end={x:curve.to.x-dx/length*endInset,y:curve.to.y-dy/length*endInset};
 // One quiet connection is enough to explain the relationship. Keeping it
 // strictly edge-to-edge avoids hidden line segments beneath either cell.
 ctx.save();ctx.globalAlpha=frame.organismOpacity*(.22+node.openingPathProgress*.34);ctx.lineCap='round';
 ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.lineTo(end.x,end.y);
 ctx.strokeStyle=accentRgba(node.accent,108,.58);ctx.lineWidth=node.openingDepth===1?4:3;ctx.stroke();
 ctx.restore();
}

function prepareOrganicOpeningFrames(frames,elapsed,seed,duration,reducedMotion){
 const allNodes=frames.flatMap(frame=>frame.nodes),byId=new Map(allNodes.map(node=>[node.id,node]));
 const vision=byId.get('vision');
 const maxReveal=Math.max(1,...allNodes.map(node=>Number(node.revealAt)||0));
 const openingNodes=allNodes.slice().sort((a,b)=>(a.revealAt||0)-(b.revealAt||0)||a.depth-b.depth);
 const meta=new Map();
 for(const node of openingNodes){
  const random=seededRandom((Number(seed)>>>0)^openingHash(node.key||node.id));
  // Root branches grow outward from their own edge attachment. Connecting
  // every root back to Vision sent long tendrils through the central welcome
  // surface, especially in the wide Quest view.
  const parent=node.id==='vision'?null:(node.parent?byId.get(node.parent):(node.attachment?{...node.attachment,id:`attachment-${node.id}`,isAttachment:true}:vision));
  const openingDepth=parent?(node.depth===0?1:node.depth):0;
  let openAt=700+(Number(node.revealAt)||0)/maxReveal*(duration*0.60)+(random()-.5)*280;
  if(parent && !parent.isAttachment)openAt=Math.max(openAt,(meta.get(parent.id)?.bloomAt||0)+360+random()*260);
  const travel=parent?Math.round((parent.isAttachment?760:820)+random()*420):0;
  const bloomAt=openAt+travel*.72;
  const bloomDuration=parent?Math.round(760+random()*320):1100;
  const curve=parent?organicCurve(parent,node,random,parent.isAttachment?.08:.14+random()*.14):null;
  meta.set(node.id,{parent,openingDepth,openAt,travel,bloomAt,bloomDuration,curve});
 }
 const time=reducedMotion?duration*32:Math.max(0,Number(elapsed)||0);
 const openingOpacity=reducedMotion?1:1-smooth(time,duration-3000,2600);
 const openingFrame={time,organismOpacity:openingOpacity};
 for(const node of allNodes){
  const entry=meta.get(node.id),parent=entry?.parent;
  const openingPathProgress=parent?smooth(time,entry.openAt,entry.travel):1;
  const bloomProgress=smooth(time,entry.bloomAt,entry.bloomDuration);
  node.openingParentId=parent?.id||null;
  node.openingDepth=entry?.openingDepth||0;
  node.openingCurve=entry?.curve||null;
  node.openingPathProgress=openingPathProgress;
  node.openingBloomProgress=bloomProgress;
  node.progress=bloomProgress;
  node.opacity=bloomProgress*openingOpacity;
  node.openingOpacity=openingOpacity;
  node.emphasis=reducedMotion?0:(1-smooth(time,entry.bloomAt+900,1200))*bloomProgress;
  node.scale=bloomScale(bloomProgress);
  const position=entry?.curve&&openingPathProgress<1?cubicPoint(entry.curve,openingPathProgress):node;
  node.drawX=position.x;node.drawY=position.y;
  node.openingMeta=entry;
 }
 return {frames,frame:openingFrame,parents:meta};
}

// Pure frame access for regression tests and non-DOM previews. This returns
// the existing LIM mesh nodes, never a second intro-specific cell set.
export function welcomeOpeningFrames(elapsed,seed=0x4e4c5852,duration=AR_WELCOME_OPENING_MS,reducedMotion=false,graphs=AR_WELCOME_GRAPHS){
 const frames=welcomeExperienceFrames(AR_WELCOME_SHOWCASE_DURATION,reducedMotion,graphs,new Set(),{opening:true});
 return prepareOrganicOpeningFrames(frames,elapsed,seed,duration,reducedMotion).frames;
}

export function drawArWelcomeShowcase(ctx,elapsed,reducedMotion=false,graphs=AR_WELCOME_GRAPHS,options={}) {
 ctx.clearRect(0,0,2500,2100);ctx.save();ctx.save();ctx.translate(WELCOME_PANEL_DRAW_OFFSET.x,WELCOME_PANEL_DRAW_OFFSET.y);ctx.globalAlpha=reducedMotion?1:smooth(elapsed,0,1800);
 if(options.drawPanel!==false){
 drawArWelcomePanel(ctx);
 if(options.drawContent){options.drawContent(ctx);}else{
 ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.globalAlpha=reducedMotion?1:smooth(elapsed,500,3000);ctx.fillStyle='#dcef95';ctx.font='750 30px system-ui';ctx.fillText('A LIVING WORLD OF KNOWLEDGE',700,412);
 ctx.fillStyle='#fff';ctx.font='760 72px system-ui';ctx.fillText('NourishlandXR',700,500);
  ctx.font='24px system-ui';ctx.fillText(welcomeCanContinue(elapsed)?'Continue when ready · hold a cell to explore':'Let the knowledge unfold',700,690);
 }
 }
 ctx.restore();
 const opening=Boolean(options.opening);
 const baseFrames=welcomeExperienceFrames(opening?AR_WELCOME_SHOWCASE_DURATION:elapsed,reducedMotion,graphs,options.hidden,opening?{...options.progression,opening:true}:options.progression);
 const openingState=opening?prepareOrganicOpeningFrames(baseFrames,elapsed,options.openingSeed||0x4e4c5852,options.openingDuration||AR_WELCOME_OPENING_MS,reducedMotion):null;
 let frames=openingState?.frames||baseFrames;
 if(options.minimalIntro){
  const roots=frames.flatMap(frame=>frame.nodes).filter(node=>node.depth===0 && node.id!=='vision');
  const order=new Map(roots.map((node,index)=>[node.key,index]));
  const expanded=new Set(options.progression?.expandedLimIds || []),expandedAt=options.progression?.expandedAt || {};
  frames=frames.map(frame=>({...frame,nodes:frame.nodes.filter(node=>{
   if(order.has(node.key))return true;
   const parent=frame.nodes.find(candidate=>candidate.id===node.parent),parentId=parent?.limId || node.parent;
   return expanded.has(node.parent) || expanded.has(parentId);
  }).map(node=>{
   if(order.has(node.key)){
    const index=order.get(node.key),start=Number(options.minimalStartAt)||4800,revealDuration=Number(options.minimalRevealDuration)||1100;
    const progress=reducedMotion?1:opening?smooth(elapsed,start,revealDuration):1;
    return {...node,progress,opacity:progress,scale:1,radius:node.baseRadius,drawX:node.x,drawY:node.y,
     emphasis:reducedMotion?0:progress*(.10+Math.sin(elapsed/900+index)*.04)};
   }
   const parent=frame.nodes.find(candidate=>candidate.id===node.parent),parentId=parent?.limId || node.parent;
   const siblings=frame.nodes.filter(candidate=>candidate.parent===node.parent),siblingIndex=Math.max(0,siblings.indexOf(node));
   const branchStartedAt=Number(expandedAt[parentId]);
   const branchElapsed=Math.max(0,elapsed-(Number.isFinite(branchStartedAt)?branchStartedAt:elapsed));
   const progress=reducedMotion?1:smooth(branchElapsed,180+siblingIndex*430,900);
   return {...node,progress,opacity:progress,scale:1,radius:node.baseRadius,drawX:node.x,drawY:node.y,emphasis:0};
  })})).filter(frame=>frame.nodes.length);
 }
 if(options.drawCells===false){ctx.restore();return frames;}
 const allNodes=frames.flatMap(frame=>frame.nodes);
 const selectedNode=allNodes.find(node=>node.key===options.selectedKey);
 const relationship=welcomeRelationshipFor(selectedNode?.limId);
 const linkedNodes=relationship?relationship.ids.map(id=>allNodes.find(node=>node.limId===id && node.opacity>.55)).filter(Boolean):[];
 const linkedKeys=new Set(linkedNodes.map(node=>node.key));
 if(linkedNodes.length===2){
  const [from,to]=linkedNodes,dx=to.x-from.x,dy=to.y-from.y,distance=Math.hypot(dx,dy)||1;
  const nx=-dy/distance,ny=dx/distance,bend=Math.min(230,distance*.29),pulse=reducedMotion?.34:.27+Math.sin(elapsed/720)*.05;
  const startInset=(from.radius || from.baseRadius || 0)*.9,endInset=(to.radius || to.baseRadius || 0)*.9;
  const start={x:from.x+dx/distance*startInset,y:from.y+dy/distance*startInset};
  const end={x:to.x-dx/distance*endInset,y:to.y-dy/distance*endInset};
  ctx.save();ctx.globalAlpha=pulse;ctx.strokeStyle=relationship.accent;ctx.lineWidth=2.5;ctx.setLineDash([10,12]);
  ctx.beginPath();ctx.moveTo(start.x,start.y);
  ctx.quadraticCurveTo((start.x+end.x)/2+nx*bend,(start.y+end.y)/2+ny*bend,end.x,end.y);ctx.stroke();ctx.setLineDash([]);ctx.restore();
 }
 for(const frame of frames){
  const hue=[226,34,105,56,17,273,157,198][frame.corner];
 // The opening keeps these same authored LIM cells and positions, but lets
 // each daughter travel along a seeded curved hypha before blooming. Once the
 // opening settles, the familiar straight LIM relationships return.
 if(opening && !options.minimalIntro){
  for(const node of frame.nodes)drawOrganicTendril(ctx,node,openingState.frame);
 } else if(!options.minimalIntro) {
  for(const node of frame.nodes){node.drawX=node.x;node.drawY=node.y;}
  for(const node of frame.nodes){
   if(node.opacity>0){
    const parent=frame.nodes.find(candidate=>candidate.id===node.parent);
    const start=parent && parent.opacity>0?parent:node.attachment;
    if(start){
     const dx=node.x-start.x,dy=node.y-start.y,length=Math.hypot(dx,dy)||1;
     const inset=parent?parent.radius*.88:0,endInset=node.radius*.88;
     ctx.save();ctx.globalAlpha=node.opacity*.55;ctx.strokeStyle=node.accent||'#dcef95';ctx.lineWidth=3;
     ctx.beginPath();ctx.moveTo(start.x+dx/length*inset,start.y+dy/length*inset);
     ctx.lineTo(node.x-dx/length*endInset,node.y-dy/length*endInset);ctx.stroke();ctx.restore();
    }
   }
  }
 } else {
  for(const node of frame.nodes){node.drawX=node.x;node.drawY=node.y;}
  for(const node of frame.nodes.filter(node=>node.depth>=1 && node.opacity>0)){
   const parent=frame.nodes.find(candidate=>candidate.id===node.parent);
   if(!parent || parent.opacity<=0)continue;
   const dx=node.x-parent.x,dy=node.y-parent.y,length=Math.hypot(dx,dy)||1;
   ctx.save();ctx.globalAlpha=Math.min(parent.opacity,node.opacity)*.42;ctx.strokeStyle=node.accent||'#dcef95';ctx.lineWidth=2;
   ctx.beginPath();ctx.moveTo(parent.x+dx/length*parent.radius*.94,parent.y+dy/length*parent.radius*.94);
   ctx.lineTo(node.x-dx/length*node.radius*.94,node.y-dy/length*node.radius*.94);ctx.stroke();ctx.restore();
  }
 }
 for(const node of frame.nodes){
  const pathway=options.pathwayKey===node.key,current=pathway && node.opacity<.72?{...node,opacity:.72,scale:Math.max(.94,node.scale)}:node;
  const linked=linkedKeys.has(node.key),linkedCurrent=linked?{...current,accent:relationship.accent}:current;
  if(linkedCurrent.opacity)drawGlassCell(ctx,linkedCurrent,hue,elapsed,reducedMotion,options.drawCellLabels!==false,{selected:options.selectedKey===node.key,hovered:options.hoverKey===node.key,pathway});
 }
 }
 ctx.restore();
 return frames;
}
