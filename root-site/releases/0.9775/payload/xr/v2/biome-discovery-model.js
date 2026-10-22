export const BIOME_WALKS = Object.freeze([
  {id:'R',name:'Rainforest',color:'#b9cda6',pieces:['R1','R4','R2'],stops:[
    {name:'Forest entrance',question:'What changes beneath the canopy?',orbs:['Canopy layers','Light and shade','Forest floor']},
    {name:'Giant fig valley',question:'How can one tree support other life?',orbs:['Roots and shelter','Fruit and wildlife','Epiphytes']},
    {name:'Cloud ridge',question:'Where does the forest hold water?',orbs:['Mist','Leaf surfaces','Water movement']}]},
  {id:'C',name:'Temperate forest',color:'#b8c8d2',pieces:['C1','C2','C5'],stops:[
    {name:'Woodland entrance',question:'How does a forest change through the year?',orbs:['Seasonal light','Deciduous trees','Leaf litter']},
    {name:'Sheltered woodland',question:'What grows below the trees?',orbs:['Understory','Fungi','Shelter']},
    {name:'Orchard edge',question:'How can an orchard support more life?',orbs:['Fruit trees','Pollinators','Ground cover']}]},
  {id:'W',name:'Wetland',color:'#9fc9c6',pieces:['W1','W2','W4'],stops:[
    {name:'Wetland entrance',question:'Where does the water come from?',orbs:['Springs','Soil moisture','Catchment']},
    {name:'Pool edges',question:'What lives between land and water?',orbs:['Reeds','Amphibians','Aquatic insects']},
    {name:'Marsh habitat',question:'How do plants respond to wet ground?',orbs:['Wetland plants','Water levels','Habitat edges']}]},
  {id:'F',name:'Food forest',color:'#d5b98b',pieces:['F2','F1','F4'],stops:[
    {name:'Food forest entrance',question:'How do plants share a growing space?',orbs:['Plant layers','Sunlight','Growing conditions']},
    {name:'Growing together',question:'What belongs beside this plant?',orbs:['Companion choices','Plant spacing','Pollinators']},
    {name:'Harvest and return',question:'What can we harvest, and what returns to the soil?',orbs:['Harvest','Propagation','Mulch']}]},
  {id:'M',name:'Forest meadow',color:'#c7c395',pieces:['M1','M4','M3'],stops:[
    {name:'Meadow entrance',question:'What happens where woodland opens?',orbs:['Forest edge','Grasses','Wildflowers']},
    {name:'Creekside clearing',question:'How does water shape a meadow?',orbs:['Creek edges','Moisture','Wildlife corridors']},
    {name:'Open woodland',question:'Why do some trees grow far apart?',orbs:['Light','Tree spacing','Seasonal growth']}]} 
]);

const smooth=(value,low,high)=>{const t=Math.max(0,Math.min(1,(value-low)/(high-low)));return t*t*(3-2*t);};
export const SHOWCASE_SECONDS=32;
export function showcasePose(time){
  const t=((time%SHOWCASE_SECONDS)+SHOWCASE_SECONDS)%SHOWCASE_SECONDS,fade=1-smooth(t,25,29);
  return {time:t,path:smooth(t,5,13),stops:smooth(t,10,14)*fade,orbs:smooth(t,13,17)*fade,open:smooth(t,17,20)*(1-smooth(t,23,26)),alpha:smooth(t,4,7)*fade,welcome:.06+smooth(t,3,6)*fade*.12};
}

// A terrain-following route, constrained to its biome. A failed route stays
// absent rather than drawing a straight connector through a cliff or opening.
export function findGroundRoute(start,end,{height,allowed=()=>true,step=.035,maxSlope=1.5,maxVisited=12000}={}){
  const minX=Math.min(start[0],end[0])-.3,minZ=Math.min(start[2],end[2])-.3;
  const width=Math.ceil((Math.abs(start[0]-end[0])+.6)/step)+1,depth=Math.ceil((Math.abs(start[2]-end[2])+.6)/step)+1;
  const key=(x,z)=>z*width+x,cells=new Map();
  const cell=(x,z)=>{if(x<0||z<0||x>=width||z>=depth)return null;const id=key(x,z);if(cells.has(id))return cells.get(id);const px=minX+x*step,pz=minZ+z*step,y=height(px,pz);const value=Number.isFinite(y)&&allowed(px,pz)?{id,x,z,p:[px,y,pz]}:null;cells.set(id,value);return value;};
  const nearest=p=>{const x=Math.round((p[0]-minX)/step),z=Math.round((p[2]-minZ)/step);return cell(x,z);};
  const first=nearest(start),last=nearest(end);if(!first||!last)return [];
  const heuristic=c=>Math.hypot(c.x-last.x,c.z-last.z)*step,open=[first],cost=new Map([[first.id,0]]),parents=new Map(),closed=new Set();
  let visited=0;
  while(open.length&&visited++<maxVisited){
    open.sort((a,b)=>(cost.get(b.id)+heuristic(b))-(cost.get(a.id)+heuristic(a)));
    const current=open.pop();if(closed.has(current.id))continue;
    if(current.id===last.id){const result=[current.p];let c=current;while(parents.has(c.id)){c=parents.get(c.id);result.unshift(c.p);}return result;}
    closed.add(current.id);
    for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){
      const next=cell(current.x+dx,current.z+dz);if(!next||closed.has(next.id))continue;
      const rise=Math.abs(next.p[1]-current.p[1]);if(rise/step>maxSlope)continue;
      // Probe between cells too; two valid endpoints can straddle a narrow gap.
      let safe=true;for(const t of [.25,.5,.75]){const x=current.p[0]+dx*step*t,z=current.p[2]+dz*step*t,h=height(x,z);if(!Number.isFinite(h)||!allowed(x,z)||Math.abs(h-(current.p[1]+(next.p[1]-current.p[1])*t))>step*maxSlope*.5){safe=false;break;}}
      if(!safe)continue;const value=cost.get(current.id)+step+rise*2;
      if(value<(cost.get(next.id)??Infinity)){cost.set(next.id,value);parents.set(next.id,current);open.push(next);}
    }
  }
  return [];
}
