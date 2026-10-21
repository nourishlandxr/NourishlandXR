export const TOUR_TEMPLATES=Object.freeze({
    observe:{label:'Observe',instruction:'Look closely. What do you notice?'},
    compare:{label:'Compare',instruction:'Compare these two features. What is similar or different?'},
    listen:{label:'Listen',instruction:'Listen to the explanation, or read its transcript.'},
    investigate:{label:'Investigate',instruction:'Use what you can observe to answer this question.'},
    record:{label:'Record',instruction:'Write a short observation about this place.'}
});
const id=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(value);
const text=(value,max,label,required=false)=>{if(typeof value!=='string'||value.length>max||required&&!value.trim())throw Error('Invalid '+label+'.');};
const fields=(value,allowed)=>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!allowed.includes(key)))throw Error('Unsupported tour fields.');};
export const tourRefKey=ref=>JSON.stringify([ref.siteId,ref.areaId,ref.recordId,ref.kind||'marker']);
export const entryTourRef=entry=>({siteId:entry.siteId,areaId:entry.place.id,recordId:entry.marker.id});
export function safeTourAudio(url){try{const parsed=new URL(url);return ['https:','http:'].includes(parsed.protocol)?parsed.href:'';}catch{return '';}}
export function validateTour(tour){
    fields(tour,['schemaVersion','id','projectId','siteId','title','description','stops']);
    if(!tour||tour.schemaVersion!==1||!id(tour.id)||!id(tour.projectId)||!id(tour.siteId))throw Error('Invalid tour identity.');
    text(tour.title,160,'tour title',true);text(tour.description,2000,'tour description');
    if(!Array.isArray(tour.stops)||tour.stops.length>40)throw Error('A tour supports up to 40 stops.');
    const seen=new Set();
    for(const stop of tour.stops){
        fields(stop,['id','template','title','instructions','directions','question','facilitatorNotes','audioUrl','optional','targets']);
        if(!id(stop.id)||seen.has(stop.id)||!Object.hasOwn(TOUR_TEMPLATES,stop.template))throw Error('Invalid or duplicate tour stop.');seen.add(stop.id);
        for(const [field,max] of [['title',160],['instructions',3000],['directions',1000],['question',1000],['facilitatorNotes',3000],['audioUrl',2000]])text(stop[field],max,'stop '+field);
        if(stop.audioUrl&&!safeTourAudio(stop.audioUrl))throw Error('Use an HTTP or HTTPS audio link.');
        if(typeof stop.optional!=='boolean')throw Error('Invalid optional stop.');
        if(!Array.isArray(stop.targets)||stop.targets.length>2)throw Error('Select up to two stop features.');
        for(const ref of stop.targets){fields(ref,['siteId','areaId','recordId','kind']);if(![ref.siteId,ref.areaId,ref.recordId].every(id)||ref.siteId!==tour.siteId||ref.kind&&!['area','marker'].includes(ref.kind)||ref.kind==='area'&&ref.recordId!==ref.areaId)throw Error('Stop features must belong to this Site.');}
        if(new Set(stop.targets.map(tourRefKey)).size!==stop.targets.length)throw Error('Compare two different features.');
    }
    if(new TextEncoder().encode(JSON.stringify(tour)).byteLength>256*1024)throw Error('Tour exceeds 256 KB.');return tour;
}
export function createTour(projectId,siteId){return {schemaVersion:1,id:crypto.randomUUID(),projectId,siteId,title:'New tour',description:'',stops:[]};}
export function createTourStop(target,template='observe'){
    if(!Object.hasOwn(TOUR_TEMPLATES,template))throw Error('Choose a stop template.');
    return {id:crypto.randomUUID(),template,title:'',instructions:TOUR_TEMPLATES[template].instruction,directions:'',question:'',facilitatorNotes:'',audioUrl:'',optional:false,targets:[{...target}]};
}
export function checkTour(tour,records){
    validateTour(tour);const issues=[],find=ref=>records.find(record=>tourRefKey(record.ref)===tourRefKey(ref));
    if(!tour.stops.length)issues.push({stopId:'',message:'Add at least one stop.'});
    for(const [i,stop] of tour.stops.entries()){
        const add=message=>issues.push({stopId:stop.id,message:`Stop ${i+1}: ${message}`});
        if(stop.targets.length<(stop.template==='compare'?2:1))add(stop.template==='compare'?'choose two different features.':'choose a feature.');
        for(const ref of stop.targets){const record=find(ref);if(!record||record.archived)add('a referenced feature is missing, moved or archived.');}
        if(!stop.instructions.trim())add('add an instruction or transcript.');
        if(!stop.directions.trim())add(i?'describe how to reach this stop.':'describe where the tour starts.');
        if(stop.template==='investigate'&&!stop.question.trim())add('add an investigation question.');
    }return issues;
}
export function recordsForTour(model){return [...model.entries.map(entry=>({ref:entryTourRef(entry),title:entry.marker.name,description:entry.marker.description||'',areaName:entry.place.name,type:entry.marker.type,archived:entry.marker.status==='archived',feature:entry.marker.site_feature||null})),...(model.areas||[]).map(area=>({ref:{siteId:area.siteId,areaId:area.id,recordId:area.id,kind:'area'},title:area.name,description:area.description||'',areaName:area.name,type:area.type==='Path or Route'?'path':'area',archived:area.status==='archived'}))];}
export function visitorTour(tour){validateTour(tour);return {...tour,stops:tour.stops.map(({facilitatorNotes,...stop})=>stop)};}
