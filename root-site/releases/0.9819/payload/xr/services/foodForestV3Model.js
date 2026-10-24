import {foodForestBoundary,validFoodForestBoundary,boardPointInside,foodForestFootprintOverlaps} from "./foodForestBoardModel.js?v=0.9819";
import {sampleImapV2TerrainHeight} from "./imapV2Terrain.js?v=0.9819";
import {forestSpaceFields,normalizeForestLearning} from "./foodForestV4Model.js?v=0.9819";
export const TERRAIN_COLS=25,TERRAIN_ROWS=17;
export const GROWTH_STAGES=[{name:'Newly planted',scale:.28},{name:'Young forest',scale:.58},{name:'Older forest',scale:1}];
export const FOREST_ROLES=['shelter','ground-cover','pollinator-habitat','mulch','nitrogen-support'];
export const PLAN_HEIGHTS={canopy:12,'small-tree':6,shrub:2,herb:.8,groundcover:.2,root:.4,climber:3};
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n)),finite=Number.isFinite,text=(v,n=120)=>typeof v==='string'?v.slice(0,n):'';
export function terrainDefaults(){return {cols:TERRAIN_COLS,rows:TERRAIN_ROWS,heights:Array(TERRAIN_COLS*TERRAIN_ROWS).fill(0),basis:'user-design-assumption'};}
export function normalizeFoodForestStudy(raw){
    if(!raw||!validFoodForestBoundary(raw.boundary)||!finite(raw.widthM)||raw.widthM<2||raw.widthM>1000||!finite(raw.depthM)||raw.depthM<2||raw.depthM>1000||!Array.isArray(raw.pieces)||raw.pieces.length>160)throw Error('Invalid Food Forest board.');
    const original=raw.mapImport?.original;if(original&&(!Array.isArray(original.elements||[])||(original.elements||[]).length>160||(original.elements||[]).some(e=>!e||typeof e!=='object')||!Array.isArray(original.terrainEdits||[])||JSON.stringify(original).length>400000))throw Error('Invalid preserved IMAP sketch.');
    const ids=new Set();const pieces=raw.pieces.map(item=>{
        if(!item||!text(item.id)||item.id.length>120||ids.has(item.id)||!Object.hasOwn(PLAN_HEIGHTS,item.layer)||!finite(item.x)||Math.abs(item.x)>3||!finite(item.z)||Math.abs(item.z)>2||!Number.isInteger(item.variant)||item.variant<0||item.variant>3)throw Error('Invalid or duplicate plant piece.');
        ids.add(item.id);return {id:text(item.id),layer:item.layer,variant:item.variant,x:item.x,z:item.z,size:clamp(finite(item.size)?item.size:1,.4,1.8),rotation:finite(item.rotation)?item.rotation:0,plantId:text(item.plantId),label:text(item.label),sourceUrl:text(item.sourceUrl,1000),canopyDiameterM:clamp(finite(item.canopyDiameterM)?item.canopyDiameterM:0,0,60),plannedHeightM:clamp(finite(item.plannedHeightM)?item.plannedHeightM:PLAN_HEIGHTS[item.layer],.1,40),...forestSpaceFields(item),footprintBasis:'user-design-assumption',roles:Array.isArray(item.roles)?FOREST_ROLES.filter(role=>item.roles.includes(role)):[]};
    });
    const terrain=terrainDefaults();if(raw.terrain!==undefined){if(raw.terrain?.cols!==TERRAIN_COLS||raw.terrain?.rows!==TERRAIN_ROWS||raw.terrain?.heights?.length!==TERRAIN_COLS*TERRAIN_ROWS||!raw.terrain.heights.every(v=>finite(v)&&v>=-3&&v<=6))throw Error('Invalid terrain grid.');terrain.heights=[...raw.terrain.heights];terrain.basis=text(raw.terrain.basis)||terrain.basis;}
    const paths=(Array.isArray(raw.paths)?raw.paths:[]).slice(0,64).map(p=>{if(!['path','water'].includes(p.kind)||!Array.isArray(p.points)||p.points.length>256||!p.points.every(v=>finite(v.x)&&finite(v.z)&&Math.abs(v.x)<=3&&Math.abs(v.z)<=2))throw Error('Invalid landscape path.');return {id:text(p.id),kind:p.kind,points:p.points.map(v=>({x:v.x,z:v.z}))};});
    const links=(Array.isArray(raw.links)?raw.links:[]).slice(0,200).filter(l=>ids.has(l.from)&&ids.has(l.to)&&l.from!==l.to).map(l=>({from:l.from,to:l.to,kind:FOREST_ROLES.includes(l.kind)?l.kind:'investigate',evidence:text(l.evidence,500),basis:l.basis==='local-observation'?'local-observation':'design-hypothesis'}));
    for(const piece of pieces)if(piece.supportKind==='plant'&&!pieces.some(p=>p.id===piece.supportId&&['canopy','small-tree'].includes(p.layer))){piece.supportId='';piece.supportKind='trellis';}
    return {schemaVersion:4,learning:normalizeForestLearning(raw.learning,pieces.length>0),shape:['rectangle','round','custom'].includes(raw.shape)?raw.shape:'custom',boundary:structuredClone(raw.boundary),widthM:raw.widthM,depthM:raw.depthM,goal:['diverse','fruit-focus','lower-input'].includes(raw.goal)?raw.goal:'diverse',pieces,wishlist:[...new Set((Array.isArray(raw.wishlist)?raw.wishlist:[]).filter(v=>typeof v==='string'&&v.length<120))].slice(0,2500),terrain,paths,links,growth:clamp(Number.isInteger(raw.growth)?raw.growth:2,0,2),pruning:clamp(finite(raw.pruning)?raw.pruning:0,0,60),scenario:['calm','wind','dry','shade','pests'].includes(raw.scenario)?raw.scenario:'calm',windAngle:clamp(finite(raw.windAngle)?raw.windAngle:0,0,360),sunAngle:clamp(finite(raw.sunAngle)?raw.sunAngle:45,15,80),mission:['sandbox','shelter','diversity','fruit'].includes(raw.mission)?raw.mission:'sandbox',investigations:[...new Set((raw.investigations||[]).filter?.(x=>['inspect','roles','experiment','compare'].includes(x))||[])],mapImport:raw.mapImport?{kind:text(raw.mapImport.kind),note:text(raw.mapImport.note,500),...(raw.mapImport.original&&JSON.stringify(raw.mapImport.original).length<=400000?{original:structuredClone(raw.mapImport.original)}:{})}:null};
}
export function sampleForestTerrain(state,x,z){
    const t=state.terrain;if(!t)return 0;const u=clamp((x+3)/6*(TERRAIN_COLS-1),0,TERRAIN_COLS-1),v=clamp((z+2)/4*(TERRAIN_ROWS-1),0,TERRAIN_ROWS-1),a=Math.floor(u),b=Math.floor(v),c=Math.min(a+1,TERRAIN_COLS-1),d=Math.min(b+1,TERRAIN_ROWS-1),fx=u-a,fz=v-b,h=t.heights;
    return (h[b*TERRAIN_COLS+a]*(1-fx)+h[b*TERRAIN_COLS+c]*fx)*(1-fz)+(h[d*TERRAIN_COLS+a]*(1-fx)+h[d*TERRAIN_COLS+c]*fx)*fz;
}
export function forestSurfaceY(state,x,z){return .16+sampleForestTerrain(state,x,z)*6/state.widthM;}
export function sculptForestTerrain(state,point,tool,radius=.65,strength=.35){
    if(!boardPointInside(point,state.boundary))return false;const old=state.terrain.heights,next=[...old];
    for(let row=0;row<TERRAIN_ROWS;row++)for(let col=0;col<TERRAIN_COLS;col++){
        const x=-3+col/(TERRAIN_COLS-1)*6,z=-2+row/(TERRAIN_ROWS-1)*4,d=Math.hypot(x-point.x,z-point.z);if(d>radius||!boardPointInside({x,z},state.boundary))continue;
        const i=row*TERRAIN_COLS+col,w=(1-d/radius)**2;
        if(tool==='smooth'){const neighbours=[old[i],old[Math.max(0,row-1)*TERRAIN_COLS+col],old[Math.min(TERRAIN_ROWS-1,row+1)*TERRAIN_COLS+col],old[row*TERRAIN_COLS+Math.max(0,col-1)],old[row*TERRAIN_COLS+Math.min(TERRAIN_COLS-1,col+1)]];next[i]=old[i]+(neighbours.reduce((a,b)=>a+b)/5-old[i])*w*.7;}
        else next[i]=clamp(old[i]+strength*w*(tool==='raise'?1:-1),-3,6);
    }
    state.terrain.heights=next;return true;
}
export function forestGrowthScale(state){return GROWTH_STAGES[state.growth??2].scale;}
export function forestDisplayDiameter(state,item){return (item.canopyDiameterM||0)*forestGrowthScale(state)*(1-(state.pruning||0)/100);}
export function forestStudySummary(state){
    const footprints=state.pieces.map(p=>({...p,canopyDiameterM:forestDisplayDiameter(state,p)}));
    return {plants:state.pieces.length,layers:new Set(state.pieces.map(p=>p.layer)).size,declaredFootprints:footprints.filter(p=>p.canopyDiameterM>0).length,overlaps:foodForestFootprintOverlaps(footprints,state.widthM,state.depthM).length,roles:FOREST_ROLES.filter(role=>state.pieces.some(p=>p.roles?.includes(role))),terrainRange:[Math.min(...state.terrain.heights),Math.max(...state.terrain.heights)],paths:state.paths.length,stage:GROWTH_STAGES[state.growth].name,scenario:state.scenario};
}
export function forestPlantEvidence(item,database){
    const record=database?.records?.find(r=>r.id===item?.plantId);return {record,candidates:(record?.functions||[]).filter(f=>f.polarity==='positive'),conditional:(record?.functions||[]).filter(f=>f.polarity==='conditional'),declared:item?.roles||[]};
}
export function forestConnections(state,selected,database){
    const item=state.pieces.find(p=>p.id===selected);if(!item)return [];
    const connections=state.links.filter(l=>l.from===selected||l.to===selected).map(l=>({...l,label:l.kind.replaceAll('-',' ')})),record=forestPlantEvidence(item,database).record;
    for(const other of state.pieces){if(other.id===selected||!other.plantId)continue;if(record?.pollinisers?.some(group=>group.ids?.includes(other.plantId)))connections.push({from:selected,to:other.id,kind:'polliniser',label:'Supplier-listed polliniser',basis:'supplier-link',evidence:record.sourceUrl});}
    return connections;
}
export function makeForestComparison(state,name){return {id:globalThis.crypto.randomUUID(),name:text(name)||'Forest study',savedAt:new Date().toISOString(),board:normalizeFoodForestStudy(state),summary:forestStudySummary(state)};}
export function compareForestStudies(a,b){const x=forestStudySummary(a),y=forestStudySummary(b);return {plants:y.plants-x.plants,layers:y.layers-x.layers,overlaps:y.overlaps-x.overlaps,rolesAdded:y.roles.filter(r=>!x.roles.includes(r)),scenario:[x.scenario,y.scenario],stage:[x.stage,y.stage]};}
export function forestGuideText(state,selected,database,topic='next'){
    const item=state.pieces.find(p=>p.id===selected),info=forestPlantEvidence(item,database);
    if(topic==='plant'&&item)return `${item.label||'This '+item.layer+' piece'} is part of your design. ${info.candidates.length?'Its supplier description mentions '+info.candidates.map(f=>f.id.replaceAll('-',' ')).join(', ')+'. These are candidates to investigate in your conditions.':'No verified supporting roles are assigned here yet.'} Your miniature, root shape and growth stage are illustrations. What would you like to learn about this plant?`;
    if(topic==='scenario')return `You are exploring ${state.scenario==='calm'?'a calm day':state.scenario+' conditions'}. Save a comparison, change one part of your design, and look again. These effects help you ask questions; they do not calculate survival, shelter or harvest.`;
    return `Start with a plant you want to grow. Select it, explore its information, then investigate shelter, ground cover and other supporting roles. You do not have to fill every layer. Save two layouts to compare what you changed.`;
}
export function forestMissionSteps(state){
    if(state.mission==='shelter')return [{label:'Place a main tree',done:state.pieces.some(p=>['canopy','small-tree'].includes(p.layer))},{label:'Mark a shelter role to investigate',done:state.pieces.some(p=>p.roles?.includes('shelter'))},{label:'Try the wind scenario',done:state.scenario==='wind'},{label:'Compare a changed design',done:state.investigations.includes('compare')}];
    if(state.mission==='fruit')return [{label:'Place a fruit-tree symbol',done:state.pieces.some(p=>p.layer==='small-tree')},{label:'Sketch its assumed canopy footprint',done:state.pieces.some(p=>p.layer==='small-tree'&&p.canopyDiameterM>0)},{label:'Investigate two supporting roles',done:forestStudySummary(state).roles.length>=2},{label:'Compare a changed design',done:state.investigations.includes('compare')}];
    if(state.mission==='diversity')return [{label:'Explore at least three layers',done:new Set(state.pieces.map(p=>p.layer)).size>=3},{label:'Inspect a planted piece',done:state.investigations.includes('inspect')},{label:'Draw a relationship to investigate',done:state.links.length>0},{label:'Try a scenario',done:state.investigations.includes('experiment')}];
    return [];
}
export function importImapForest(raw){
    if(!raw||JSON.stringify(raw).length>400000||!Array.isArray(raw.terrainEdits)||raw.terrainEdits.length>48)throw Error('Choose an exported IMAP terrain sketch.');
    const base=normalizeFoodForestStudy({boundary:foodForestBoundary(raw.shape==='square'?'rectangle':'round'),shape:raw.shape==='square'?'rectangle':'round',widthM:20,depthM:20,pieces:[],wishlist:[]});
    base.terrain.heights=base.terrain.heights.map((_,i)=>sampleImapV2TerrainHeight(raw.terrainEdits,(-3+i%TERRAIN_COLS/(TERRAIN_COLS-1)*6)*6.3/3,(-2+Math.floor(i/TERRAIN_COLS)/(TERRAIN_ROWS-1)*4)*6.3/2,{radius:6.3,shape:raw.shape==='square'?'square':'circular'})*2);
    base.terrain.basis='imap-visual-conversion-assumption';base.mapImport={original:structuredClone(raw),kind:'IMAP terrain sketch',note:'Visual sculpt units converted to assumed terrain metres at ×2; not surveyed elevation.'};
    for(const e of (raw.elements||[]).slice(0,160)){
        const layer=({'tree-canopy':'canopy','tree-fruit':'small-tree','tree-palm':'canopy','tree-young':'small-tree',shrub:'shrub',groundcover:'groundcover'})[e.type];
        if(layer&&finite(e.x)&&finite(e.z))base.pieces.push({id:crypto.randomUUID(),layer,variant:0,x:clamp(e.x/6.3*3,-3,3),z:clamp(e.z/6.3*2,-2,2),size:1,label:text(e.name),plantId:''});
        if(['path','contour','fence'].includes(e.type)&&Array.isArray(e.points))base.paths.push({id:crypto.randomUUID(),kind:'path',points:e.points.filter(p=>finite(p.x)&&finite(p.z)).slice(0,256).map(p=>({x:clamp(p.x/6.3*3,-3,3),z:clamp(p.z/6.3*2,-2,2)}))});
    }
    return normalizeFoodForestStudy(base);
}
