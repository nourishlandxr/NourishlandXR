import {WELCOME_SHAPE,WELCOME_SHAPE_POINTS} from './arWelcomePanel.js';

// Roots live on the welcome surface, never in the copy's central reading area.
// The paths are fixed once so re-rendering a canvas texture cannot make them jump.
const ROOT_START_MS=600;
const ROOT_GROWTH_MS=14000;
const ROOT_STAGGER_MS=450;
const EDGE_ORDER=[0,8,3,12,5,14,1,10,6,15,4,9];
export const WELCOME_ROOTS_SETTLED_MS=ROOT_START_MS+ROOT_GROWTH_MS+(EDGE_ORDER.length-1)*ROOT_STAGGER_MS;

const keepout=point=>{
 const x=(point.x-WELCOME_SHAPE.cx)/430,y=(point.y-WELCOME_SHAPE.cy)/315;
 return x*x+y*y<1;
};
const distance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
const clamp=value=>Math.max(0,Math.min(1,value));
const fract=value=>value-Math.floor(value);
const jitter=seed=>fract(Math.sin(seed*127.1+23.7)*43758.5453);

function rootedPath(edgeIndex,order){
 const a=WELCOME_SHAPE_POINTS[edgeIndex],b=WELCOME_SHAPE_POINTS[(edgeIndex+1)%WELCOME_SHAPE_POINTS.length];
 const edgeT=.28+jitter(edgeIndex+1)*.43;
 const anchor={x:a.x+(b.x-a.x)*edgeT,y:a.y+(b.y-a.y)*edgeT};
 const radius=distance(anchor,{x:WELCOME_SHAPE.cx,y:WELCOME_SHAPE.cy}),dx=(WELCOME_SHAPE.cx-anchor.x)/radius,dy=(WELCOME_SHAPE.cy-anchor.y)/radius;
 const normal={x:-dy,y:dx};
 const depth=190+45*jitter(edgeIndex+42);
 const points=[anchor];
 for(let step=1;step<=20;step++){
  const t=step/20;
  const bend=(Math.sin(t*5.3+edgeIndex*.8)-Math.sin(edgeIndex*.8))*15*t
   +Math.sin(t*12+edgeIndex*1.7)*6*t;
  const point={x:anchor.x+dx*depth*t+normal.x*bend,y:anchor.y+dy*depth*t+normal.y*bend};
  if(keepout(point))break;
  points.push(point);
 }
 const branches=[];
 for(let fork=0;fork<4;fork++){
  const attachIndex=Math.min(points.length-2,4+fork*4);
  if(attachIndex<2 || branches.some(branch=>branch.attachIndex===attachIndex))continue;
  const origin=points[attachIndex],side=(fork%2?1:-1)*(order%2?1:-1);
  const length=45+25*jitter(edgeIndex*7+fork+11);
  const branch=[origin];
  for(let step=1;step<=8;step++){
   const t=step/8;
   const drift=length*t;
   const point={x:origin.x+normal.x*side*drift+dx*drift*.25+normal.x*side*Math.sin(t*6+fork)*5*t,
    y:origin.y+normal.y*side*drift+dy*drift*.25+normal.y*side*Math.sin(t*6+fork)*5*t};
   if(keepout(point))break;
   branch.push(point);
  }
  if(branch.length>1)branches.push({points:branch,attach:attachIndex/(points.length-1),attachIndex});
 }
 return {points,branches,order};
}

const ROOTS=EDGE_ORDER.map(rootedPath);

function visiblePath(points,progress){
 if(progress<=0 || points.length<2)return [];
 const total=points.slice(1).reduce((sum,point,index)=>sum+distance(points[index],point),0);
 let remaining=total*clamp(progress);
 const visible=[points[0]];
 for(let index=1;index<points.length;index++){
  const segment=distance(points[index-1],points[index]);
  if(remaining>=segment){visible.push(points[index]);remaining-=segment;continue;}
  if(remaining>0)visible.push({x:points[index-1].x+(points[index].x-points[index-1].x)*remaining/segment,
   y:points[index-1].y+(points[index].y-points[index-1].y)*remaining/segment});
  break;
 }
 return visible;
}

export function welcomeRootFrame(elapsed,reducedMotion=false){
 return ROOTS.map(root=>{
  const progress=reducedMotion?1:clamp((elapsed-ROOT_START_MS-root.order*ROOT_STAGGER_MS)/ROOT_GROWTH_MS);
  return {progress,points:visiblePath(root.points,progress),branches:root.branches.map(branch=>{
   const branchProgress=clamp((progress-branch.attach)/(1-branch.attach));
   return visiblePath(branch.points,branchProgress);
  })};
 });
}

export function welcomeRootsAreGrowing(elapsed,reducedMotion=false){
 return !reducedMotion && elapsed<=WELCOME_ROOTS_SETTLED_MS;
}

function drawTaperedPath(ctx,points,fullCount,baseWidth,opacity){
 if(points.length<2)return;
 ctx.strokeStyle=`rgba(173, 209, 132, ${opacity})`;
 ctx.lineCap='round';ctx.lineJoin='round';
 const segments=fullCount-1,first=Math.max(1,Math.floor(segments*.48)),second=Math.max(first+1,Math.floor(segments*.78));
 for(const [start,end,taper] of [[0,first,1],[first,second,.72],[second,segments,.46]]){
  if(start>=points.length-1)continue;
  ctx.beginPath();ctx.moveTo(points[start].x,points[start].y);
  for(let index=start+1;index<=Math.min(end,points.length-1);index++)ctx.lineTo(points[index].x,points[index].y);
  ctx.lineWidth=Math.max(.45,baseWidth*taper);
  ctx.stroke();
 }
}

export function drawArWelcomeRoots(ctx,elapsed,reducedMotion=false){
 const roots=welcomeRootFrame(elapsed,reducedMotion);
 ctx.save();
 ctx.beginPath();WELCOME_SHAPE_POINTS.forEach((point,index)=>index?ctx.lineTo(point.x,point.y):ctx.moveTo(point.x,point.y));
 ctx.closePath();ctx.clip();
 roots.forEach((root,index)=>{
  drawTaperedPath(ctx,root.points,ROOTS[index].points.length,6.2,.7);
  root.branches.forEach((branch,branchIndex)=>drawTaperedPath(ctx,branch,ROOTS[index].branches[branchIndex].points.length,3.2,.52));
  // A tiny living tip follows the continuous line. Nothing flashes over the copy.
  if(!reducedMotion && index%4===0 && root.progress>.08 && root.progress<.98){
   const tip=root.points.at(-1);
   if(tip){ctx.beginPath();ctx.arc(tip.x,tip.y,2.5,0,Math.PI*2);ctx.fillStyle='rgba(220, 239, 167, .74)';ctx.fill();}
  }
 });
 ctx.restore();
}
