import {drawArWelcomePanel,welcomeBoundary} from './arWelcomePanel.js';
import {drawHexagon} from './plantInformationMeshCanvas.js';
import {LIM_ALL_CELLS, LIM_FACES, LIM_GRAPHS, LIM_INTRO_BRANCHES} from './limLearning.js';

// Presentation data only: no PIM records, stored IDs or navigation are modified.
export const AR_WELCOME_CORNER_MS = 16000;
export const AR_WELCOME_SHOWCASE_DURATION = AR_WELCOME_CORNER_MS * 8;
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
export const AR_WELCOME_CONTINUE_MS = 2200;
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
  const delta=previous===null?0:now-previous;previous=now;
  if(visible && delta>=0 && delta<500)elapsed+=delta;
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
 const vision={corner:4,phase:0,cycle:0,nodes:[{id:'vision',parent:null,label:'Vision',depth:0,limId:'lim-intro-vision',accent:'#dcef95',accessibilityLabel:'Vision introductory learning cell',...attachedRoot(Math.PI/2),baseRadius:LIM_LAYOUT.radius,radius:LIM_LAYOUT.radius,revealAt:700}]};
 // These are forward/side distances in the root's own direction of growth.
 // Their slight unevenness keeps the branch cellular and connected without
 // arranging every family into the same mechanical honeycomb.
 const foundationOffsets=[[0,0],[158,-7],[294,73],[302,-91],[151,-154],[438,18],[292,238]];
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
 const layout=[vision,...frames];
 settleWelcomeLayout(layout);
 settledLayouts.set(graphs,layout);
 return layout.map(frame=>({...frame,nodes:frame.nodes.map(node=>({...node}))}));
}

// Keep developed cells in place. Dismissal uses stable corner/node identities,
// so hidden branches stay hidden while the rest of the demo continues.
export function welcomeExperienceFrames(elapsed,reducedMotion=false,graphs=AR_WELCOME_GRAPHS,hidden=new Set(),progression={}) {
 return revealFrames(graphs).map(frame=>{
  const corner=frame.corner,totalTime=Number.isFinite(elapsed)?Math.max(0,elapsed):0;
  const isVision=frame.nodes[0]?.id==='vision';
  const visionActivated=progression?.visionActivated!==false;
  const visionActivatedAt=Number.isFinite(progression?.visionActivatedAt)?progression.visionActivatedAt:0;
  const time=isVision?totalTime:visionActivated?Math.max(0,totalTime-visionActivatedAt):0;
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
   // Every branch is an invitation, not ambient clutter. Vision reveals only
   // the four archetypes. Selecting an archetype or child then blooms its
   // immediate children in a short, staggered sequence.
   if(node.depth>=1){
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
 let font=depth?34:39;
 do {ctx.font=`${depth?'550':'650'} ${font}px system-ui`;if(lines.every(line=>ctx.measureText(line).width<=maxWidth))break;font--;}
 while(font>12);
 return {lines,font,lineHeight:font*1.12,maxWidth};
}

function accentRgba(value,hue,alpha=.7){
 const match=String(value||'').trim().match(/^#([\da-f]{6})$/i);
 if(!match)return `hsla(${hue},52%,58%,${alpha})`;
 const hex=match[1];return `rgba(${parseInt(hex.slice(0,2),16)},${parseInt(hex.slice(2,4),16)},${parseInt(hex.slice(4),16)},${alpha})`;
}

function drawGlassCell(ctx,node,hue,elapsed,reducedMotion,drawLabel=true,visual={}) {
 const opening=1-node.progress;
 ctx.save();ctx.globalAlpha=node.opacity;
 ctx.translate(node.drawX,node.drawY);
 ctx.rotate(0);
 ctx.scale(node.scale,node.scale);
 const r=node.baseRadius, thickness=10+(reducedMotion?0:opening*12), hollow=Boolean(node.hollow);
 const activation=Math.max(0,Math.min(1,Number(visual.activation)||0));
 const selected=Boolean(visual.selected);
 const accent=node.accent || '';
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
 if(activation>0){
  // Centre-out paint is clipped to the fixed hexagon; geometry never scales.
  ctx.save();ctx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3,x=Math.cos(a)*r,y=Math.sin(a)*r;if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.clip();
  const reach=Math.max(1,r*1.48*activation),fill=ctx.createRadialGradient(0,0,0,0,0,reach);
  fill.addColorStop(0,accentRgba(accent,hue,.78));fill.addColorStop(.72,accentRgba(accent,hue,.58));fill.addColorStop(1,accentRgba(accent,hue,0));
  ctx.globalAlpha=node.opacity;ctx.fillStyle=fill;ctx.fillRect(-r,-r,r*2,r*2);ctx.restore();
 }
 // A quiet change in edge light follows the opening, without flashing.
 ctx.globalAlpha=node.opacity*(.12+node.emphasis*.3);ctx.strokeStyle='#efffe2';ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(-r,0);ctx.lineTo(-r/2,-r*.866);ctx.lineTo(r/2,-r*.866);ctx.stroke();
 if(visual.pathway && !selected){
  ctx.globalAlpha=node.opacity*.72;ctx.setLineDash([7,6]);ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=2.5;
  ctx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3,x=Math.cos(a)*(r-7),y=Math.sin(a)*(r-7);if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.stroke();ctx.setLineDash([]);
 }
 if(selected){
  ctx.globalAlpha=node.opacity*.9;ctx.shadowColor=accentRgba(accent,hue,.55);ctx.shadowBlur=18;ctx.strokeStyle=accent||`hsl(${hue},52%,58%)`;ctx.lineWidth=5;
  ctx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3,x=Math.cos(a)*(r-2),y=Math.sin(a)*(r-2);if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.stroke();ctx.shadowBlur=0;
  ctx.setLineDash([r*.34,r*.18]);ctx.globalAlpha=node.opacity*.65;ctx.lineWidth=2;ctx.strokeStyle='rgba(255,255,255,.86)';
  ctx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3,x=Math.cos(a)*(r-8),y=Math.sin(a)*(r-8);if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.stroke();ctx.setLineDash([]);
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

export function drawArWelcomeShowcase(ctx,elapsed,reducedMotion=false,graphs=AR_WELCOME_GRAPHS,options={}) {
 ctx.clearRect(0,0,2500,2100);ctx.save();ctx.save();ctx.translate(WELCOME_PANEL_DRAW_OFFSET.x,WELCOME_PANEL_DRAW_OFFSET.y);ctx.globalAlpha=reducedMotion?1:smooth(elapsed,0,1800);
 if(options.drawPanel!==false){
 drawArWelcomePanel(ctx);
 if(options.drawContent){options.drawContent(ctx);}else{
 ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.globalAlpha=reducedMotion?1:smooth(elapsed,500,3000);ctx.fillStyle='#dcef95';ctx.font='750 30px system-ui';ctx.fillText('A LIVING WORLD OF KNOWLEDGE',700,412);
 ctx.fillStyle='#fff';ctx.font='760 72px system-ui';ctx.fillText('NourishlandXR',700,500);
 ctx.font='500 32px system-ui';ctx.fillText('Explore the wonders of plants and ecosystems',700,577);
 ctx.fillText('in an immersive, interactive way.',700,622);
  ctx.font='24px system-ui';ctx.fillText(welcomeCanContinue(elapsed)?'Continue when ready · hold a cell to explore':'Let the knowledge unfold',700,690);
 }
 }
 ctx.restore();
 const frames=welcomeExperienceFrames(elapsed,reducedMotion,graphs,options.hidden,options.progression);
 if(options.drawCells===false){ctx.restore();return frames;}
 const allNodes=frames.flatMap(frame=>frame.nodes);
 const selectedNode=allNodes.find(node=>node.key===options.selectedKey);
 const relationship=welcomeRelationshipFor(selectedNode?.limId);
 const linkedNodes=relationship?relationship.ids.map(id=>allNodes.find(node=>node.limId===id && node.opacity>.55)).filter(Boolean):[];
 const linkedKeys=new Set(linkedNodes.map(node=>node.key));
 if(linkedNodes.length===2){
  const [from,to]=linkedNodes,dx=to.x-from.x,dy=to.y-from.y,distance=Math.hypot(dx,dy)||1;
  const nx=-dy/distance,ny=dx/distance,bend=Math.min(150,distance*.16),pulse=reducedMotion?.72:.58+Math.sin(elapsed/520)*.14;
  ctx.save();ctx.globalAlpha=pulse;ctx.strokeStyle=relationship.accent;ctx.lineWidth=5;ctx.setLineDash([18,13]);
  ctx.shadowColor=relationship.accent;ctx.shadowBlur=18;ctx.beginPath();ctx.moveTo(from.x,from.y);
  ctx.quadraticCurveTo((from.x+to.x)/2+nx*bend,(from.y+to.y)/2+ny*bend,to.x,to.y);ctx.stroke();ctx.setLineDash([]);ctx.restore();
 }
 for(const frame of frames){
  const hue=[226,34,105,56,17,273,157,198][frame.corner];
 // LIM cells are drawn directly on their reserved lattice positions. There
 // are no connector strokes; shared hex edges provide the relationship cue.
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
 for(const node of frame.nodes){
  const pathway=options.pathwayKey===node.key,current=pathway && node.opacity<.72?{...node,opacity:.72,scale:Math.max(.94,node.scale)}:node;
  const linked=linkedKeys.has(node.key),linkedCurrent=linked?{...current,accent:relationship.accent}:current;
  if(linkedCurrent.opacity)drawGlassCell(ctx,linkedCurrent,hue,elapsed,reducedMotion,options.drawCellLabels!==false,{activation:options.activeKey===node.key?options.activeProgress:(options.selectedKey===node.key||linked)?1:0,selected:options.selectedKey===node.key||linked,pathway});
 }
 }
 ctx.restore();
 return frames;
}
