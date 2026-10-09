// Shared pixel geometry for canvas rendering, DOM controls and XR ray targets.
const centre={x:1250,y:1060},tau=Math.PI*2;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function limoConnectionIsAnimating(graph,now=Date.now(),reducedMotion=false){
 return !reducedMotion && Boolean(graph?.cells?.some(cell=>{const age=now-Date.parse(cell.createdAt);return age>=0 && age<2200;}));
}
function angleDelta(a,b){return ((b-a+Math.PI)%tau+tau)%tau-Math.PI;}
function edge(node,toward){const d=distance(node,toward) || 1,r=(node.radius || node.baseRadius || 62)*.96;return {x:node.x+(toward.x-node.x)*r/d,y:node.y+(toward.y-node.y)*r/d};}
function approach(node,orbit,obstacles){
 const angle=Math.atan2(node.y-centre.y,node.x-centre.x),endAngle=Math.atan2(orbit.y-centre.y,orbit.x-centre.x),radius=distance(node,centre),endRadius=distance(orbit,centre);
 let best=null;
 for(const bend of [0,.18,-.18,.34,-.34,.52,-.52,.72,-.72]){
  const points=Array.from({length:33},(_,i)=>{const t=i/32,a=angle+angleDelta(angle,endAngle)*t+bend*Math.sin(Math.PI*t),r=radius+(endRadius-radius)*t;return {x:centre.x+Math.cos(a)*r,y:centre.y+Math.sin(a)*r};});
  const collisions=points.filter(point=>obstacles.some(other=>other!==node && distance(point,other)<(other.radius || other.baseRadius || 62)+8)).length;
  if(!best || collisions<best.collisions)best={points,collisions};if(!collisions)break;
 }
 return [edge(node,best.points[1]),...best.points.slice(1)];
}
export function limoDiscoveryLayout(cells,baseNodes){
 const placed=[...baseNodes],nodes=[];
 for(const cell of [...cells].sort((a,b)=>a.slot-b.slot || a.id.localeCompare(b.id))){
  const wanted=-Math.PI/2+(cell.slot || 0)*2.399963229728653;
  const candidates=[];
  for(const factor of [1,.92,.84,.76])for(let i=0;i<120;i++){
   const angle=wanted+i*tau/120,x=centre.x+Math.cos(angle)*1120*factor,y=centre.y+Math.sin(angle)*900*factor;
   if(Math.hypot(x-centre.x,y-centre.y)<650 || placed.some(node=>Math.hypot(node.x-x,node.y-y)<(node.baseRadius || 62)+74))continue;
   candidates.push({x,y,cost:Math.abs(angleDelta(wanted,angle))*240+(1-factor)*400});
  }
  candidates.sort((a,b)=>a.cost-b.cost);const position=candidates[0];
  if(!position)throw new Error('The discovery orbit is full. Hide an earlier discovery to make space.');
  const node={...position,id:cell.id,limId:cell.id,key:'discovery:'+cell.id,parent:null,label:cell.title,depth:2,baseRadius:62,radius:62,accent:cell.accent,cue:'DISCOVERY',role:'observation',derived:true,sourceIds:cell.sourceIds,createdAt:cell.createdAt,slot:cell.slot,scale:1,opacity:1,progress:1,state:'settled'};
  nodes.push(node);placed.push(node);
 }
 return nodes;
}
export function limoOrbitString(from,to,obstacles=[]){
 const a=Math.atan2(from.y-centre.y,from.x-centre.x),b=Math.atan2(to.y-centre.y,to.x-centre.x),delta=angleDelta(a,b),steps=Math.max(8,Math.ceil(Math.abs(delta)*28));
 const arc=[];
 for(let i=0;i<=steps;i++){
  const angle=a+delta*i/steps;
  // The innermost orbit clears the 520 px frame; step outward around cell rims.
  const candidate=[548,575,605,640,685,735,795,860].map(radius=>({x:centre.x+Math.cos(angle)*radius,y:centre.y+Math.sin(angle)*radius}));
  arc.push(candidate.find(point=>obstacles.every(node=>node===from || node===to || distance(point,node)>(node.radius || node.baseRadius || 62)+10)) || candidate[0]);
 }
 return [...approach(from,arc[0],obstacles),...arc.slice(1),...approach(to,arc.at(-1),obstacles).reverse().slice(1)];
}
export function drawLimoConnectionStrings(ctx,frames,graph,elapsed,reducedMotion=false){
 if(!graph?.cells?.length && !graph?.sourceId)return;
 const nodes=frames.flatMap(frame=>frame.nodes).filter(node=>node.opacity>.5),byId=new Map(nodes.map(node=>[node.limId,node]));
 const selected=graph.selectedId,focus=byId.get(selected),family=new Set([selected,...focus?.sourceIds || []]);
 for(const node of nodes.filter(item=>item.derived)){
  const active=family.has(node.limId) || node.sourceIds.includes(selected),age=Math.max(0,Date.now()-Date.parse(node.createdAt)),reveal=reducedMotion?1:Math.min(1,age/1100);
  for(const sourceId of node.sourceIds){
   const source=byId.get(sourceId);if(!source)continue;
   const points=limoOrbitString(source,node,nodes),count=Math.max(2,Math.ceil(points.length*reveal));
   ctx.save();ctx.globalAlpha=active?.86:.22;ctx.strokeStyle=node.accent;ctx.lineWidth=active?3:1.8;ctx.lineJoin='round';ctx.lineCap='round';
   ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(const point of points.slice(1,count))ctx.lineTo(point.x,point.y);ctx.stroke();
   if(active && !reducedMotion && age<2200){const pulse=points[Math.min(points.length-1,Math.floor((age%1100)/1100*points.length))];ctx.beginPath();ctx.arc(pulse.x,pulse.y,4,0,tau);ctx.fillStyle='#f3edc9';ctx.fill();}
   ctx.restore();
  }
 }
 if(graph.sourceId){
  const source=byId.get(graph.sourceId);if(!source)return;
  for(const id of graph.compatibleIds || []){const target=byId.get(id);if(!target)continue;const points=limoOrbitString(source,target,nodes);ctx.save();ctx.globalAlpha=.38;ctx.strokeStyle='#f2d990';ctx.lineWidth=2;ctx.setLineDash([7,9]);ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(const point of points.slice(1))ctx.lineTo(point.x,point.y);ctx.stroke();ctx.restore();}
 }
}
