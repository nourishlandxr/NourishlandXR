// LIMO's public spatial tree. Stored encyclopedia references remain in limLearning.js.
const roots = [
 ['place','Read this place','READ','#e3bd7f','Begin with what this land shows you. Keep measured conditions, recorded observations and unanswered questions distinct.'],
 ['life','Meet the life here','LIFE','#a9ce8c','Find the plants and recorded visitors in this Area. Missing records mean we have more to notice; they do not mean life is absent.'],
 ['relationships','See how it works','LINK','#85c6cb','Investigate a relationship between real neighbours. A possible benefit is a question until local evidence supports it.'],
 ['vision','Imagine what comes next','DRAFT','#c3b3e3','Build a small, editable vision around people, existing life and available care. Compare possibilities before changing the land.'],
 ['action','Try something useful','TRY','#e7a789','Choose one manageable action, explain why it belongs here, and plan how you will check its result.'],
 ['change','See what changed','REVIEW','#8ebdda','Return to the same place and question. A new observation can change the plan; opening a cell alone is not progress in the field.']
];
// id, label, question, field choices, useful next step, result lens.
const topics = {
 place:[
  ['sun','Sun & shade','What is the exposure at this place at this time?',['Direct sun here','Shade here','Mixed light here'],'Repeat at another time of day and record the date. A single visit is not a whole-day sun survey.','plants'],
  ['water','Water & drainage','What happened to water here during your visit?',['Water standing','Water moving','No water seen'],'Return after rain. Record where water gathers and moves before planning earthworks.','notes'],
  ['soil','Soil & ground cover','How much of this small patch is covered?',['Mostly covered','Patchy cover','Mostly exposed'],'Compare the same patch later; record cover and soil observations separately.','plants'],
  ['climate','Seasons & extremes','Which condition did you notice here?',['Heat exposure','Cold exposure','Wind exposure'],'Compare dated site notes with a nearby weather station. Climate guidance cannot describe this exact patch by itself.','notes'],
  ['access','Access & constraints','What most needs attention before work here?',['Access route','Existing habitat','Services or boundaries'],'Mark the constraint and ask the steward before changing access, habitat or infrastructure.','notes']
 ],
 life:[
  ['layers','Plants & forest layers','What role does this recorded plant occupy here?',['Overhead cover','Lower vegetation','Ground-level growth'],'Open its PIMO, then record the local height and neighbours. A profile layer is authored guidance until checked here.','layers'],
  ['wildlife','Wildlife visitors','What did you observe during this visit?',['Insect visit','Bird visit','Other animal visit'],'Record the behaviour and time. Keep identity uncertain unless it can be supported.','notes'],
  ['damage','Damage & beneficial life','What can you see on the selected plant?',['Damage visible','Organism present','No damage seen today'],'Photograph the pattern and monitor change. Identify the cause before choosing a treatment.','plants'],
  ['seasonal','Flowers, fruit & change','What stage did you see on this plant today?',['Flowers visible','Fruit or pods visible','Vegetative growth'],'Revisit the same plant, count or photograph the stage and compare dates.','plants'],
  ['gaps','What is unrecorded?','What would make this Area easier to understand?',['Plant identity','Local conditions','Wildlife records'],'Choose one gap and gather a dated observation. Unassessed is different from absent.','unknown']
 ],
 relationships:[
  ['guilds','Guilds & neighbours','Which interaction should we investigate here?',['Shared shade','Shared space','Flower visitors'],'Inspect the actual neighbours and keep the relationship proposed until supported locally.','plants'],
  ['shelter','Shade, shelter & support','What support is visible beside this plant?',['Shade from neighbour','Wind shelter','Physical climbing support'],'Record who provides the support, who receives it and when it matters.','plants'],
  ['cycles','Water, mulch & soil cycles','Which process can you observe in this patch?',['Leaf litter present','Organic cover added','Water reaching soil'],'Record the source, amount or coverage and return to check what changed.','notes'],
  ['pollination','Pollination & habitat','What did the visitor do during your observation?',['Visited a flower','Used cover','Behaviour unclear'],'Record behaviour without assuming pollination or a pest-control benefit.','notes'],
  ['techniques','Techniques in this Project','Which example can you investigate here?',['Mulch or ground cover','Support planting','Water or shelter design'],'Open the linked plant or Area records, then record the intended function and local evidence.','notes']
 ],
 vision:[
  ['purpose','People, purpose & care','What should this small plan prioritise?',['Food to share','Habitat and shelter','Low care effort'],'Compare two options against that purpose and the time people can actually give.','plants'],
  ['starting','Bare land or established?','What starting condition did you observe?',['Mostly open ground','Existing planting','Mixed or uncertain'],'Inventory existing life and constraints first; an open view is not proof that a place is empty.','plants'],
  ['fit','Which plants could fit?','What would you check before proposing a plant?',['Light and space','Water and season','Care and local suitability'],'Inspect PIMO guidance and site evidence. Keep every candidate proposed until its suitability is checked.','plants'],
  ['options','Compare two plans','Which purpose should both alternatives answer?',['Small food planting','Habitat patch','Improve existing Area'],'Draft a small pilot and an observation-first alternative. Neither changes the existing inventory.','plants'],
  ['phases','First steps & later roles','What scale of change is manageable now?',['One plant or patch','One small group','Observation first'],'Define a first phase, a review date and the condition that would justify expanding it.','plants']
 ],
 action:[
  ['planting','A small first planting','What needs checking before this pilot?',['Site conditions','Plant suitability','Care capacity'],'Draft one small pilot with a care commitment and review date. Confirm it with the steward before planting.','plants'],
  ['care','Care for this Area','What care question will you investigate?',['Ground cover','Water access','Crowding or support'],'Record the issue and a proposed response. Do not infer a treatment from a missing record.','plants'],
  ['trial','Try a technique','Which small trial could answer your question?',['Ground-cover trial','Support-plant trial','Observation-only comparison'],'Keep a comparison patch where appropriate. Record the intention before acting, then mark Tried only after you do it.','plants'],
  ['harvest','Harvest, prepare & share','What would you check before using this harvest?',['Identity and suitability','Readiness and method','Permission and sharing'],'Read the actual PIMO uses and safety guidance. Identification, preparation and permission still need confirmation.','plants'],
  ['record','Record a question','What kind of evidence will you gather?',['Plant observation','Site observation','Relationship question'],'Keep the question tied to this Area or plant and choose a return date.','all']
 ],
 change:[
  ['repeat','Repeat an observation','What changed since the earlier visit?',['More of the observed feature','Less of the observed feature','No clear change'],'Compare the same target and method. Keep earlier observations alongside this one.','journal'],
  ['compare','Compare Areas & dates','What might explain the difference?',['Exposure differs','Care differs','Cause still uncertain'],'Choose comparable observations. Different dates, methods and weather can change what you see.','journal'],
  ['results','Results & care effort','What has the activity shown so far?',['Useful result seen','Effort greater than expected','Result still uncertain'],'Review the recorded intention and effort before repeating or expanding the activity.','journal'],
  ['unexpected','Investigate a surprise','What should happen next?',['Gather more evidence','Ask for identification','Reconsider the plan'],'Keep the unexpected result; do not overwrite it with the intended outcome.','journal'],
  ['next','Choose the next step','What does the evidence support now?',['Continue small','Adjust the approach','Pause and observe'],'Save the decision and its reason, then select a new review date if needed.','journal']
 ]
};
export const LIMO_ROOTS = Object.freeze(roots.map(([slug,title,cue,accent,content])=>Object.freeze({id:`limo-${slug}`,slug,title,displayLabel:title,cue,accent,content,parentId:null,role:'question'})));
export const LIMO_CELLS = Object.freeze(LIMO_ROOTS.flatMap(root=>[root,...topics[root.slug].map(([slug,title,question,choices,next,lens])=>Object.freeze({id:`${root.id}-${slug}`,parentId:root.id,title,displayLabel:title,accent:root.accent,cue:root.cue,content:question,question,choices:Object.freeze(choices),next,lens,role:root.slug==='vision'?'scenario':root.slug==='action'?'action':root.slug==='change'?'review':'observation'}))]));
export const LIMO_CELL_BY_ID = Object.freeze(Object.fromEntries(LIMO_CELLS.map(cell=>[cell.id,cell])));
export const LIMO_BRANCHES = Object.freeze(LIMO_ROOTS.map(root=>Object.freeze({...root,children:Object.freeze(LIMO_CELLS.filter(cell=>cell.parentId===root.id))})));
export const LIMO_LEGACY_ROUTES = Object.freeze({
 'lim-intro-analysis':'limo-place','lim-intro-literacy':'limo-life','lim-intro-food-forest':'limo-relationships','lim-intro-smart':'limo-vision',
 'lim-intro-analysis-climate':'limo-place-climate','lim-intro-analysis-topography':'limo-place-water','lim-intro-analysis-landscape':'limo-place-sun','lim-intro-analysis-strategy':'limo-vision-phases',
 'lim-intro-literacy-plants':'limo-life-layers','lim-intro-literacy-guilds':'limo-relationships-guilds','lim-intro-literacy-grow':'limo-action-planting','lim-intro-literacy-fruit':'limo-life-seasonal','lim-intro-literacy-soil-life':'limo-relationships-cycles','lim-intro-literacy-wildlife':'limo-life-wildlife',
 'lim-intro-food-function':'limo-relationships-techniques','lim-intro-food-energy':'limo-place-sun','lim-intro-food-design':'limo-vision-options','lim-intro-food-succession':'limo-vision-phases','lim-intro-food-water':'limo-place-water','lim-intro-food-stewardship':'limo-action-care',
 'lim-intro-vision':'limo-vision-purpose','lim-intro-smart-goals':'limo-vision-purpose','lim-intro-smart-outcomes':'limo-change-results','lim-intro-smart-limitations':'limo-place-access','lim-intro-smart-challenges':'limo-change-unexpected','lim-intro-smart-decisions':'limo-change-next','lim-intro-smart-feedback':'limo-change-repeat',
 'lim-food-forest':'limo-relationships-guilds','lim-plant-propagation':'limo-action-planting','lim-plant':'limo-life-layers','lim-climate':'limo-place-climate','lim-pin':'limo-action-record'
});
export const limoRouteId = id => LIMO_LEGACY_ROUTES[id] || id;
export function limoLearningContent(id){
 const cell=LIMO_CELL_BY_ID[limoRouteId(id)];if(!cell)return null;
 const root=LIMO_CELL_BY_ID[cell.parentId] || cell;
 return {...cell,breadcrumb:`LIMO · ${root.title}${cell.parentId?' · '+cell.title:''}`,body:[cell.question || cell.content,cell.next && `Try next · ${cell.next}`].filter(Boolean).join('\n\n'),image:'',sketchImage:'',accessibilityLabel:`${cell.title} · ${cell.role}`,primaryFaceId:root.id};
}
export const LIMO_LAYERS = Object.freeze(['All layers','Emergent','Canopy','Understory','Shrub','Herbaceous','Groundcover','Root / rhizosphere','Climber / vine','Aquatic','Unclassified']);
const text=value=>String(value ?? '').trim();
const normal=value=>text(value).toLowerCase().replace(/[^a-z]/g,'');
export function limoEntryKey(entry){return [entry.projectId,entry.siteId,entry.areaId,entry.marker?.id].map(encodeURIComponent).join('/');}
export function limoEntryState(entry){
 const m=entry.marker || {};
 if(m.is_template || m.template_id || m.appearance?.is_template)return 'template';
 const states=[m.status,m.visibility].map(normal);
 if(states.some(state=>['draft','proposed','planned','candidate'].includes(state)))return 'proposed';
 return 'recorded';
}
export function limoLayer(entry){
 const value=entry.profile?.layer || entry.marker?.plant_profile?.layer || '';
 return LIMO_LAYERS.find(layer=>normal(layer)===normal(value)) || 'Unclassified';
}
export const limoIsPlant=entry=>['plant','plant-marker'].includes(entry.marker?.type || entry.marker?.markerType) || Boolean(entry.marker?.plantId);
export function queryLimoContext(context,scope={},lens='plants',layer='All layers'){
 const entries=(context?.entries || []).filter(entry=>entry.projectId===context.projectId && (!scope.siteId || entry.siteId===scope.siteId) && (!scope.areaId || entry.areaId===scope.areaId));
 const plants=entries.filter(limoIsPlant),recorded=plants.filter(entry=>limoEntryState(entry)==='recorded');
 const unknown=recorded.filter(entry=>limoLayer(entry)==='Unclassified');
 let results=lens==='notes'?entries.filter(entry=>!limoIsPlant(entry)):lens==='all'?entries:lens==='unknown'?unknown:recorded;
 if(layer!=='All layers')results=results.filter(entry=>limoIsPlant(entry)&&limoLayer(entry)===layer);
 return {results,recordedCount:recorded.length,proposedCount:plants.filter(entry=>limoEntryState(entry)==='proposed').length,templateCount:plants.filter(entry=>limoEntryState(entry)==='template').length,unknownCount:unknown.length,warnings:context?.warnings || []};
}
