import {LIMO_ROOTS,LIMO_CELL_BY_ID,LIMO_LAYERS,limoRootFor,limoRouteId,limoEntryKey,limoEntryState,limoIsPlant,limoLayer,queryLimoContext} from './limoProjectLearning.js';
import {createLimoConnections} from './limoConnections.js';
import {LIMO_CONNECTION_RULE_BY_ID,limoConnectionIllustration,connectionRuleFor} from './limoConnectionRules.js';

const clean=value=>String(value ?? '').trim();
const stamp=()=>new Date().toISOString();
const due=days=>new Date(Date.now()+days*86400000).toISOString();
const journalKey=projectId=>`nlxr.limo.journal.v1:${encodeURIComponent(projectId)}`;
const progressKey=projectId=>`nlxr.limo.workspace.v1:${encodeURIComponent(projectId)}`;
function read(storage,key,fallback){try{return JSON.parse(storage?.getItem(key) || 'null') || fallback;}catch{return fallback;}}
export function createLimoSpatialExperience({panel,loadContext,publishRecord=null,onInspect=()=>{},onFocus=()=>{},onSelect=()=>{},onChange=()=>{},onClose=()=>{},storage=globalThis.localStorage}={}){
 let context=null,request=0,closed=false,error='',notice='',pending=false,graphCache=null;
 let state={cellId:'',view:'home',siteId:'',areaId:'',layer:'All layers',targetKey:'',page:0,draft:null,recordId:'',paused:false},records=[];
 const connections=createLimoConnections({storage});
 const activeCell=()=>connections.cell(state.cellId);
 const children=cell=>Object.values(LIMO_CELL_BY_ID).filter(item=>item.parentId===cell?.id);
 const scope=()=>({siteId:state.siteId,areaId:state.areaId});
 const area=()=>context?.areas.find(item=>item.siteId===state.siteId && item.id===state.areaId);
 const target=()=>context?.entries.find(entry=>limoEntryKey(entry)===state.targetKey);
 const scopedRecords=()=>records.filter(record=>record.projectId===context?.projectId && (!state.siteId || record.siteId===state.siteId) && (!state.areaId || record.areaId===state.areaId));
 function store(){
  if(!context)return;
  if(!storage)throw new Error('Personal notebook storage is unavailable on this device.');
  storage.setItem(journalKey(context.projectId),JSON.stringify(records));
  storage.setItem(progressKey(context.projectId),JSON.stringify(state));
 }
 function remember(){try{store();}catch(e){error=e.message;}}
 const action=(id,label,role='action',extra={})=>({id,label,role,...extra});
 function content(){
  const cell=activeCell(),root=cell?limoRootFor(cell,id=>connections.cell(id)):null,query=queryLimoContext(context,scope(),cell?.lens || 'plants',state.layer);
  const where=area()?.name || (state.siteId?context?.sites.find(site=>site.id===state.siteId)?.name:'Whole Project') || 'Whole Project';
  let title=cell?.title || 'Learn from this place',body='',actions=[],role=cell?.role || 'question';
  const back=()=>action('back','‹ Back','navigation');
  const contextActions=[action('scope','Area · '+where,'filter'),action('journal',`Notebook · ${scopedRecords().length}`,'review')];
  if(!context){body=error || 'Loading the Project and its Areas…';actions=[action('reload','Retry Project','action',{disabled:pending})];}
  else if(state.view==='home'){
   title='Learn from this place';role='question';
   body='Read the land, discover its life and connect ideas around the Living Frame. Two related cells reveal a new investigation. A discovery can then connect with another idea to develop a deeper story about this place.';
   actions=LIMO_ROOTS.map(item=>action('cell:'+item.id,item.title,'question',{accent:item.accent,cue:item.cue}));
   if(state.paused)actions.unshift(action('resume','Resume saved question','review'));
   actions.push(action('connections','Explore 10 combinations','connection'),action('discoveries','Saved discoveries · '+connections.cells().length,'connection'),action('tools','Area and notebook','filter'));
  }else if(state.view==='tools'){
   title='Investigate this place';body='Attach discoveries to real records, keep a dated observation and return to check what changed.';
   actions=[back(),action('results','Find Project records','filter'),action('observe','Record an observation','observation'),action('trial','Draft a small trial','action'),...(root?.slug==='vision' || cell?.ruleId==='care-plan' || cell?.ruleId==='adjust-plan'?[action('compare','Compare two plans','scenario')]:[]),...contextActions,...(cell?.derived?[action('remove-discovery','Remove discovery and its descendants','navigation')]:[]),...(loadContext?[action('refresh','Refresh Project records','filter')]:[]),action('pause','Pause this question','review')];
  }else if(state.view==='connections'){
   title='Connect ideas around the Living Frame';role='connection';
   body='Choose an investigation. Its two source cells stay visible while you connect them. The last four combinations build on discoveries you have already made.';
   actions=[back(),...connections.rules.slice(state.page*4,state.page*4+4).map((rule,index)=>{const sources=connections.recipeSources(rule),ready=sources.length===2;return action('recipe:'+rule.id,`${state.page*4+index+1}. ${rule.title}`,'connection',{disabled:!ready,description:ready?sources.map(item=>item.title).join(' + '):'First create: '+rule.sources.filter(id=>id.startsWith('@')).map(id=>LIMO_CONNECTION_RULE_BY_ID[id.slice(1)].title).join(' + ')});}),...pagination(connections.rules.length,4),action('discoveries','Open saved discoveries','connection')];
  }else if(state.view==='discoveries'){
   title='Discoveries in this place';role='connection';body='These connections belong to '+where+'. Reopen one to see its parents, linked records and further combinations.';
   const items=connections.cells();actions=[back(),...items.slice(state.page*4,state.page*4+4).map(item=>action('cell:'+item.id,item.title,'connection',{accent:item.accent})),...pagination(items.length,4),action('connections','Explore combinations','connection'),...contextActions];
  }else if(state.view==='connect' || state.view==='connect-preview'){
   const source=connections.cell(connections.snapshot().sourceId),rule=LIMO_CONNECTION_RULE_BY_ID[state.previewRuleId],candidates=connections.compatible(source?.id);
   title=state.view==='connect-preview' && rule?rule.title:'Choose a cell to connect';role='connection';
   body=rule?`${rule.question}\n\n${rule.explanation}\n\nConnect the two highlighted source cells to reveal this discovery.`:`Source · ${source?.title || 'Choose a source'}\n\nCompatible cells are highlighted around the Living Frame. Choose one to reveal a new investigation. Your source stays visible when you open another branch.`;
   actions=[action('connect-cancel','Cancel connection','navigation'),...candidates.map(item=>{const candidateRule=connectionRuleFor([source,item]);return action('connect-target:'+item.id,item.title,'connection',{description:'Reveals '+candidateRule.title,disabled:pending,accent:item.accent});})];
  }else if(state.view==='target-links'){
   title='Attach plants, patches and Notes';role='connection';body='Keep multiple targets attached to this discovery. Choose the same records for a repeat observation or trial comparison.';
   const items=queryLimoContext(context,scope(),'all').results;
   actions=[back(),...items.slice(state.page*5,state.page*5+5).map(entry=>action('attach-target:'+limoEntryKey(entry),`${entry.marker.name || entry.marker.id} · ${entry.areaName}`,'filter',{selected:cell?.targetKeys?.includes(limoEntryKey(entry))})),...pagination(items.length,5)];
  }else if(state.view==='scope'){
   title='Choose the place';body='Keep observations and plans tied to a named Area. Whole Project results cover all loaded Sites; any loading gaps remain visible.';
   const items=[{id:'',siteId:'',name:'Whole Project'},...context.areas];
   actions=[back(),...items.slice(state.page*6,state.page*6+6).map((item,index)=>action('area:'+(state.page*6+index),item.name+(item.siteName?' · '+item.siteName:''),'filter',{selected:item.id===state.areaId&&item.siteId===state.siteId})),...pagination(items.length)];
  }else if(state.view==='branch'){
   body=root.content;actions=[back(),...children(cell).map(item=>action('cell:'+item.id,item.title,item.role,{accent:item.accent})),action('connections','Explore combinations','connection'),action('tools','Area and notebook','filter')];
  }else if(state.view==='question'){
   const parentTitles=cell.sourceIds?.map(id=>connections.cell(id)?.title || 'Source unavailable'),attached=cell.targetKeys?.map(id=>context.entries.find(entry=>limoEntryKey(entry)===id)?.marker.name || 'Record unavailable');
   body=cell.derived?`${cell.question}\n\nWHY THESE CONNECT\n${cell.explanation}\n\nEXPLORE AN EXAMPLE\n${cell.example}\n\nLOOK HERE\n${cell.lookFor}\n\nTRY NEXT\n${cell.next}\n\nPARENTS\n${parentTitles.join(' + ')}\n\nLOCAL TARGETS\n${attached.length?attached.join(' · '):'No targets attached yet. This is an investigation, not a local finding.'}`:`${cell.question}\n\nLOOK HERE\n${cell.next}\n\nLocal conditions, wildlife and relationships need dated observations.`;
   actions=[back(),...children(cell).map(item=>action('cell:'+item.id,item.title,item.role,{accent:item.accent})),...(cell.derived?[...cell.sourceIds.map(id=>action('cell:'+id,'Parent · '+connections.cell(id)?.title,'connection')),action('target-links','Attach local records','filter')]:[]),action('connect','Connect this cell','connection',{disabled:!connections.compatible(cell.id).length}),action('connections','Explore combinations','connection'),action('tools','Observe, compare or try','observation')];
  }else if(state.view==='results'){
   title='Records · '+(cell?.title || 'This place');role='filter';
   if(cell?.lens==='journal'){return journalContent(query,where,root);}
   body=`${query.results.length} matching records · ${state.layer}. ${query.unknownCount} recorded plants are unclassified. A record does not prove current field conditions. Select a record to inspect its PIMO or Note.\n\n${query.results.length?'':'No matches in the loaded records. This does not establish absence in the field.'}`;
   actions=[back(),action('layer','Layer · '+state.layer,'filter'),...query.results.slice(state.page*5,state.page*5+5).map(entry=>action('record:'+limoEntryKey(entry),`${entry.marker.name || entry.marker.id} · ${entry.areaName}`,'filter',{description:`${limoEntryState(entry)} · ${limoIsPlant(entry)?limoLayer(entry):'Project Note'}`})),...pagination(query.results.length,5),action('observe','Record what you see','observation')];
  }else if(state.view==='layer'){
   title='Filter by authored layer';body='These labels come from plant profiles. Check how the actual plant functions here; unclassified plants stay available.';
   actions=[back(),...LIMO_LAYERS.slice(state.page*6,state.page*6+6).map(layer=>action('set-layer:'+layer,layer,'filter',{selected:state.layer===layer})),...pagination(LIMO_LAYERS.length)];
  }else if(state.view==='target'){
   const entry=target();title=entry?.marker.name || 'Record unavailable';
   body=entry?`${entry.areaName} · ${limoEntryState(entry).toUpperCase()}\n${limoIsPlant(entry)?'Authored layer: '+limoLayer(entry):'Project Note'}\n\n${clean(entry.marker.description) || 'No local description recorded.'}\n\nInspect the canonical record, then add your own dated observation. Species guidance and local evidence remain distinct.`:'This record is no longer available. Choose another target.';
   actions=[back(),action('inspect','Open '+(entry&&limoIsPlant(entry)?'PIMO':'Note'),'filter',{disabled:!entry}),action('focus','Find this Area','filter',{disabled:!entry}),action('observe','Observe this target','observation',{disabled:!entry}),action('trial','Draft a trial here','action',{disabled:!entry})];
  }else if(state.view==='answer'){
   title=state.draft?.kind==='trial'?'What will the trial investigate?':state.draft?.kind==='scenario'?'Choose the purpose':'What did you notice?';
   body=`${cell.question}\n\nTarget: ${target()?.marker.name || area()?.name || 'Whole Project'}\nChoose only an answer supported by your visit. Add more detail later in the Project Note. This starts as a personal record on this device.`;
   actions=[back(),...(cell.choices || []).map((answer,index)=>action('answer:'+index,answer,role)),action('answer:unknown','Not assessed / uncertain','observation')];
  }else if(state.view==='review-date'){
   title='When will you return?';body=`${state.draft.answer}\n\n${state.draft.plan || cell.next}\nChoose a return date for the same place and question.`;
   actions=[back(),...[7,30,90].map(days=>action('due:'+days,days===7?'In one week':days===30?'In one month':'In three months','review'))];
   }else if(state.view==='options'){
   title='Edit option '+state.optionSlot.toUpperCase();body='Choose a manageable proposal for this Area. Suitability, resources and permission still need checking.';
   actions=[back(),...['Small planting pilot','Improve an existing patch','Observe before changing'].map((label,index)=>action('option-choice:'+index,label,'scenario'))];
  }else if(state.view==='care'){
   title='Care capacity for this proposal';body='Choose the commitment you can discuss with the steward. Unconfirmed capacity remains an evidence gap.';
   actions=[back(),...['Weekly check possible','Monthly check possible','Care capacity unconfirmed'].map((label,index)=>action('care-choice:'+index,label,'action'))];
  }else if(state.view==='draft'){
   title='Review before saving';role=state.draft.kind==='scenario'?'scenario':state.draft.kind==='trial'?'action':'observation';
   body=recordBody(state.draft)+'\n\nThis is a personal notebook record. A trial or scenario is a proposal; it does not add plants or change the inventory.';
   actions=[back(),action('answer-edit','Change answer / purpose',role),action('due-edit','Change review date','review'),...(state.draft.kind==='scenario'?[action('option-a','Edit option A','scenario'),action('option-b','Edit option B','scenario')]:[]),...(state.draft.kind!=='observation'?[action('care','Set care commitment','action')]:[]),action('save','Save personal record',role,{primary:true,disabled:pending})];
  }else if(state.view==='journal'){return journalContent(query,where,root);}
  else if(state.view==='saved'){
   const record=records.find(item=>item.id===state.recordId);title=record?.title || 'Notebook';role='review';body=record?recordBody(record):'This record is unavailable.';
   actions=[back(),action('review','Add a return observation','review',{disabled:!record}),...(record?.kind==='trial'?[action('tried','Mark trial as tried','action',{disabled:record?.state==='tried'})]:[]),...(publishRecord?[action('publish',record?.publishedMarkerId?'Project Note saved':'Save draft Project Note','action',{disabled:!record?.areaId || Boolean(record?.publishedMarkerId) || pending})]:[]),action('journal','Back to notebook','review')];
  }
  if(context?.warnings?.length)body+='\n\nLOAD GAPS\n'+context.warnings.slice(0,3).join('\n');
  if(error)body=`${error}\n\n${body}`;
  if(notice)body=`${notice}\n\n${body}`;
  const imageRule=state.view==='connect-preview'?state.previewRuleId:state.view==='question' && cell?.derived?cell.ruleId:'';
  return {id:cell?.id || 'limo-project',title,breadcrumb:`LIMO · ${context?.name || 'Project'} · ${where}`,body,accent:root?.accent || '#a9ce8c',mesh:'lim',controlsType:'LIMO',image:limoConnectionIllustration(imageRule),imageAlt:imageRule?'Learning diagram · '+LIMO_CONNECTION_RULE_BY_ID[imageRule].title:'',limo:{role,cue:state.view==='home'?'LIMO':root?.cue || 'LIMO',scope:where,project:context?.name || 'Project',summary:context?(state.view==='home'?'Observe → connect → explore → try → return':state.view==='connections'?'Two related cells reveal a new investigation':state.view==='discoveries'?'Reopen a discovery or follow its parents':cell?.question || root?.content || 'Explore this place through a useful question'):'Loading Project',coverage:context?.warnings?.length?`Partial coverage · ${context.warnings.length} loading gaps`:context?.illustrative?'Illustrative example · personal device notebook':'Project records · local conditions need observation',actions,onAction:handle}};
 }
 function pagination(count,size=6){return count>size?[action('prev','‹ Previous','navigation',{disabled:state.page===0}),action('next','Next ›','navigation',{disabled:(state.page+1)*size>=count})]:[];}
 function recordBody(record){return [`${record.kind.toUpperCase()} · ${record.state.toUpperCase()}`,`Question · ${record.question}`,`Place · ${record.areaName || 'Whole Project'}${record.targetName?' / '+record.targetName:''}`,`Recorded · ${record.createdAt.slice(0,10)}`,record.observedAt && `Return observation · ${record.observedAt.slice(0,10)}`,`Answer · ${record.answer || 'Not assessed'}`,record.plan && `Plan · ${record.plan}`,record.care && `Care · ${record.care}`,`Return · ${record.reviewAt.slice(0,10)}`,record.history?.length && `Earlier visits · ${record.history.map(item=>`${item.at.slice(0,10)}: ${item.answer}`).join(' / ')}`].filter(Boolean).join('\n\n');}
 function journalContent(query,where,root){
  const items=scopedRecords();
  return {id:'limo-change',title:'Your field notebook',breadcrumb:`LIMO · ${context.name} · ${where}`,body:`${items.length} personal records on this device. Opening a question is separate from recording, trying and returning. Shared Project Notes are saved only with the explicit save action.\n\n${items.length?'Select a dated record to revisit its question and target.':'Start with one observation or a small draft trial.'}`,accent:root?.accent || '#8ebdda',mesh:'lim',controlsType:'LIMO',limo:{role:'review',scope:where,project:context.name,cue:'REVIEW',summary:`${items.filter(item=>item.state==='reviewed').length} revisited · ${items.filter(item=>item.state==='tried').length} tried`,coverage:context.illustrative?'Illustrative example':'Personal notebook · this device',actions:[action('back','‹ Back','navigation'),...items.slice(state.page*5,state.page*5+5).map(item=>action('journal-record:'+item.id,`${item.title} · ${item.state} · ${item.createdAt.slice(0,10)}`,'review')),...pagination(items.length,5),action('home','Choose another question','question')],onAction:handle}};
 }
 function render(){if(closed)return;graphCache=buildGraph();panel?.showLearning(content());panel?.setExplorerOpen(true);panel?.suspend(false);panel?.setCompact(false);onChange(graphCache);}
 function select(id){
  const cell=connections.cell(limoRouteId(id));if(!cell)return false;closed=false;
  if(connections.snapshot().sourceId && connections.compatible(connections.snapshot().sourceId).some(item=>item.id===cell.id)){void handle('connect-target:'+cell.id);return true;}
  state.cellId=cell.id;state.view=cell.parentId || cell.derived?'question':'branch';state.page=0;state.paused=false;error='';notice='';onSelect(cell);remember();render();return true;
 }
 async function open({projectId,siteId='',areaId='',context:given,cellId=''}={}){
  const owner=++request;closed=false;pending=true;context=null;graphCache=null;error='';connections.cancel();render();
  try{
   const loaded=given || await loadContext(projectId);if(owner!==request || closed)return;
   context=loaded;records=read(storage,journalKey(context.projectId),[]).filter(record=>record.projectId===context.projectId);
   const saved=read(storage,progressKey(context.projectId),{});
   state={cellId:'',view:'home',siteId:'',areaId:'',layer:'All layers',targetKey:'',page:0,draft:null,recordId:'',paused:false,...saved,siteId,areaId,page:0};
   if(saved.siteId!==siteId || saved.areaId!==areaId){state.targetKey='';state.view='home';state.draft=null;}
   if(!context.areas.some(item=>item.id===areaId&&item.siteId===siteId)){state.areaId='';state.siteId='';}
   connections.setScope({projectId:context.projectId,...scope()});
   if(!connections.cell(state.cellId)){state.cellId='';state.view='home';}
   if(['connect','connect-preview'].includes(state.view))state.view=state.cellId?'question':'home';
   pending=false;if(cellId)select(cellId);else render();
  }catch(e){if(owner===request){pending=false;error=e.message;render();}}
 }
 async function handle(id){
  if(closed || pending)return;
  error='';notice='';
  try{
   if(id==='reload'){return open({projectId:context?.projectId || lastProjectId});}
   if(id==='refresh' && context && loadContext){return open({projectId:context.projectId,siteId:state.siteId,areaId:state.areaId});}
   if(id.startsWith('cell:')){select(id.slice(5));return;}
   if(id==='connections'){connections.cancel();state.view='connections';state.page=0;}
   else if(id==='discoveries'){connections.cancel();state.view='discoveries';state.page=0;}
   else if(id==='connect'){connections.begin(state.cellId);state.previewRuleId='';state.view='connect';state.page=0;}
   else if(id==='connect-cancel'){connections.cancel();state.view=activeCell()?.derived || activeCell()?.parentId?'question':'home';}
   else if(id.startsWith('recipe:')){
    const rule=LIMO_CONNECTION_RULE_BY_ID[id.slice(7)],sources=rule && connections.recipeSources(rule);if(sources?.length!==2)return;
    connections.cancel();select(sources[0].id);connections.begin(sources[0].id);state.previewRuleId=rule.id;state.view='connect-preview';
   }else if(id.startsWith('connect-target:')){
    const source=connections.snapshot().sourceId;if(!source)return;
    pending=true;render();const discovery=await connections.connect(source,id.slice(15));pending=false;select(discovery.id);notice='Discovery saved in this place. Both parent cells remain connected.';
   }else if(id==='remove-discovery'){
    connections.remove(state.cellId);state.cellId='';state.view='discoveries';state.page=0;notice='Discovery and dependent connections removed. Your notebook records are retained.';
   }else if(id==='target-links'){state.view='target-links';state.page=0;}
   else if(id==='tools'){state.view='tools';state.page=0;}
   else if(id.startsWith('attach-target:')){
    const targetKey=id.slice(14);if(!queryLimoContext(context,scope(),'all').results.some(entry=>limoEntryKey(entry)===targetKey))return;connections.attach(state.cellId,targetKey);
   }
   else if(id==='home'){connections.cancel();state.view='home';state.page=0;}
   else if(id==='resume'){state.paused=false;state.view=activeCell()?.parentId || activeCell()?.derived?'question':'branch';}
   else if(id==='pause'){state.paused=true;state.view='home';}
   else if(id==='close'){close();return;}
   else if(id==='scope'){state.view='scope';state.page=0;}
   else if(id.startsWith('area:')){const selected=[{id:'',siteId:''},...context.areas][Number(id.slice(5))];if(!selected)return;state.areaId=selected.id;state.siteId=selected.siteId;state.targetKey='';connections.setScope({projectId:context.projectId,...scope()});if(!activeCell())state.cellId='';state.view=activeCell()?activeCell().parentId || activeCell().derived?'question':'branch':'home';state.page=0;}
   else if(id==='results'){state.view='results';state.page=0;}
   else if(id==='layer'){state.view='layer';state.page=0;}
   else if(id.startsWith('set-layer:')){state.layer=id.slice(10);state.view='results';state.page=0;}
   else if(id.startsWith('record:')){state.targetKey=id.slice(7);state.view='target';state.page=0;}
   else if(id==='inspect'){const entry=target();if(entry){await onInspect(entry);return;}}
   else if(id==='focus'){const entry=target();if(entry){await onFocus(entry);return;}}
   else if(['observe','trial','compare'].includes(id)){
    if(!activeCell()?.parentId && !activeCell()?.derived)select('limo-action-record');
    const entry=target(),place=area();state.draft={id:globalThis.crypto?.randomUUID?.() || `limo-${Date.now()}-${Math.random().toString(16).slice(2)}`,projectId:context.projectId,siteId:entry?.siteId || state.siteId,areaId:entry?.areaId || state.areaId,areaName:entry?.areaName || place?.name || 'Whole Project',cellId:state.cellId,title:activeCell().title,question:activeCell().question,kind:id==='trial'?'trial':id==='compare'?'scenario':'observation',state:id==='observe'?'recorded':'draft',targetKey:entry?limoEntryKey(entry):'',targetKeys:activeCell().targetKeys || [],targetName:entry?.marker.name || '',createdAt:stamp(),reviewAt:due(7),history:[]};state.view='answer';
   }else if(id==='review'){
    const record=records.find(item=>item.id===state.recordId);if(!record)return;
    state.cellId=record.cellId;state.targetKey=record.targetKey;state.draft={...record,history:[...(record.history || []),{at:record.observedAt || record.createdAt,answer:record.answer || 'Not assessed'}],observedAt:stamp(),state:'reviewed'};state.view='answer';
   }else if(id.startsWith('answer:')){
    const value=id.slice(7),answer=value==='unknown'?'Not assessed / uncertain':activeCell().choices[Number(value)];if(!answer || !state.draft)return;
    state.draft.answer=answer;
    if(state.draft.kind==='trial')state.draft.plan=`Investigate ${answer.toLowerCase()} in one small patch. ${activeCell().next} Check care capacity with the steward. This has not been tried yet.`;
    if(state.draft.kind==='scenario')state.draft.plan=`Purpose: ${answer}. OPTION A · a small pilot in this Area after checking suitability and care. OPTION B · observe the same Area first and defer planting. Compare existing life, available care and evidence gaps before choosing. Both options remain draft.`;
    state.view='review-date';
   }else if(id==='answer-edit'){state.view='answer';}
   else if(id==='due-edit'){state.view='review-date';}
   else if(id==='option-a'||id==='option-b'){state.optionSlot=id.slice(-1);state.view='options';}
   else if(id.startsWith('option-choice:')){state.draft.options ||= {a:'Small planting pilot',b:'Observe before changing'};state.draft.options[state.optionSlot]=['Small planting pilot','Improve an existing patch','Observe before changing'][Number(id.slice(14))];state.draft.plan='Purpose: '+state.draft.answer+'. OPTION A: '+state.draft.options.a+'. OPTION B: '+state.draft.options.b+'. Check site evidence, suitability, existing life and available care. Both remain draft.';state.view='draft';}
   else if(id==='care'){state.view='care';}
   else if(id.startsWith('care-choice:')){state.draft.care=['Weekly check possible','Monthly check possible','Care capacity unconfirmed'][Number(id.slice(12))];state.view='draft';}
   else if(id.startsWith('due:')){state.draft.reviewAt=due(Number(id.slice(4)));state.view='draft';}
   else if(id==='save'){
    state.draft.updatedAt=stamp();
    const prior=[...records];records=[state.draft,...records.filter(item=>item.id!==state.draft.id)];
    try{store();}catch(e){records=prior;throw e;}
    state.recordId=state.draft.id;state.draft=null;state.view='saved';notice='Saved in your personal notebook on this device.';
   }else if(id==='tried'){
    const record=records.find(item=>item.id===state.recordId);if(record){record.state='tried';record.triedAt=stamp();store();notice='Marked tried. Return to record what happened.';}
   }else if(id==='publish'){
    const record=records.find(item=>item.id===state.recordId);if(!record?.areaId || !publishRecord || record.publishedMarkerId)return;
    const owner=request,publishingRecords=records;pending=true;render();
    const marker=await publishRecord(record);record.publishedMarkerId=marker?.marker?.id || marker?.id || 'saved';
    storage.setItem(journalKey(record.projectId),JSON.stringify(publishingRecords));
    if(owner!==request || closed)return;pending=false;notice='Saved as a draft Project Note. Its visibility remains draft.';
   }else if(id==='journal'){state.view='journal';state.page=0;}
   else if(id.startsWith('journal-record:')){state.recordId=id.slice(15);state.view='saved';}
   else if(id==='next'){state.page++;}
   else if(id==='prev'){state.page=Math.max(0,state.page-1);}
   else if(id==='back'){
    const view=state.view;
    if(view==='branch'){state.view='home';}
    else if(view==='question'){if(activeCell()?.derived)state.view='discoveries';else{select(activeCell().parentId);return;}}
    else if(view==='target'||view==='layer'){state.view='results';}
    else if(view==='saved'){state.view='journal';}
    else if(view==='draft'){state.view='review-date';}
    else if(view==='review-date'){state.view='answer';}
    else{state.view=activeCell()?.parentId || activeCell()?.derived?'question':activeCell()?'branch':'home';}
    state.page=0;
   }
   remember();render();
  }catch(e){pending=false;error=e.message;render();}
 }
 let lastProjectId='';
 const start=options=>{lastProjectId=options.projectId || options.context?.projectId || '';return open(options);};
 function buildGraph(){
  if(!context || closed)return {cells:[],pinnedIds:[],revision:0};
  const value=connections.snapshot(),pinned=new Set([value.sourceId,...value.compatibleIds]);
  const focus=connections.cell(state.cellId);if(focus?.derived)pinned.add(focus.id);
  function lineage(id){const item=connections.cell(id);if(!item)return;if(item.parentId && !pinned.has(item.parentId)){pinned.add(item.parentId);lineage(item.parentId);}for(const parent of item.sourceIds || [])if(!pinned.has(parent)){pinned.add(parent);lineage(parent);}}
  for(const id of [...pinned])lineage(id);
  return {...value,selectedId:state.cellId,pinnedIds:[...pinned].filter(Boolean)};
 }
 function graph(){return graphCache || buildGraph();}
 function close(){closed=true;request++;connections.cancel();graphCache=null;remember();onClose();}
 return {open:start,show(){closed=false;render();},select,handle,close,content,graph,cell:connections.cell,snapshot:()=>({context,state:JSON.parse(JSON.stringify(state)),records:JSON.parse(JSON.stringify(records)),connections:connections.snapshot()})};
}
