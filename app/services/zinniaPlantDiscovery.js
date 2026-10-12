import {searchINaturalistPlants} from './inaturalistPlantSearch.js';
import {resolvePlantPim} from './pimLegacyAdapter.js';
import {pimToArKnowledge} from './pimModel.js';
import {createZinniaVoice} from './zinniaVoice.js';
import {searchDaleysPlants} from './daleysPlantSearch.js';

const clean=value=>String(value || '').trim();
const plantLabel=value=>clean(value).replace(/[<>"\u0000-\u001f]/g,'');
const safeUrl=value=>{try{const url=new URL(value);return url.protocol==='https:'?url.href:'';}catch{return '';}};
export const ZINNIA_PLANT_COPY='Your second Orb can become a plant you choose. Tell Zinnia its common or scientific name. Confirm the species, then explore its photograph and Plant cells.';

function plantQuery(value){
    return clean(value).replace(/^\s*(?:hey\s+)?zinnia[,:]?\s*/i,'').replace(/^(?:please\s+)?(?:find|show|load|search for|tell me about)\s+(?:me\s+)?(?:a |an |the )?/i,'').replace(/[.!?]+$/,'').slice(0,120);
}

async function summaryFor(taxon,signal){
    const page=safeUrl(clean(taxon.rawSourceData?.wikipedia_url).replace(/^http:\/\/en\.wikipedia\.org\//,'https://en.wikipedia.org/'));
    if(!page || new URL(page).hostname!=='en.wikipedia.org')return null;
    const summaryController=new AbortController(),cancel=()=>summaryController.abort();
    signal.addEventListener('abort',cancel,{once:true});if(signal.aborted)cancel();
    const timeout=setTimeout(cancel,4000);
    try{
        const title=decodeURIComponent(new URL(page).pathname.split('/wiki/')[1] || '');
        if(!title)return null;
        const response=await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(title),{signal:summaryController.signal});
        if(!response.ok)return null;
        const data=await response.json();
        return data.type==='standard' && clean(data.extract)?{body:clean(data.extract),url:page}:null;
    }catch(error){if(signal.aborted)throw error;return null;}
    finally{clearTimeout(timeout);signal.removeEventListener('abort',cancel);}
}

function loadPhoto(url,signal){
    return new Promise((resolve,reject)=>{
        const image=new Image();image.crossOrigin='anonymous';
        const abort=()=>{image.src='';finish(new DOMException('Cancelled','AbortError'));};
        const timer=setTimeout(()=>finish(new Error('The reference photograph could not load. Try another result.')),12000);
        function finish(error){clearTimeout(timer);signal.removeEventListener('abort',abort);image.onload=image.onerror=null;error?reject(error):resolve(image);}
        image.onload=()=>finish();image.onerror=()=>finish(new Error('The reference photograph could not load. Try another result.'));
        signal.addEventListener('abort',abort,{once:true});if(signal.aborted){abort();return;}image.src=url;
    });
}

async function referencePhoto(taxon,signal){
    try{await loadPhoto(safeUrl(taxon.thumbnailUrl),signal);return taxon;}catch(error){if(error.name==='AbortError')throw error;}
    // Some default taxon photos lack the CORS headers needed by WebGL.
    // Licensed observation photos use the open-data image host instead.
    const id=Number(taxon.rawSourceData?.id);if(!Number.isInteger(id) || id<=0)throw new Error('No spatial-compatible photograph was found. Try another plant.');
    const params=new URLSearchParams({taxon_id:String(id),photos:'true',photo_license:'cc0,cc-by,cc-by-sa',per_page:'5'});
    const response=await fetch('https://api.inaturalist.org/v1/observations?'+params,{signal});
    if(!response.ok)throw new Error('Reference photographs are temporarily unavailable. Please try again.');
    const payload=await response.json();
    const photos=(payload.results || []).flatMap(observation=>(observation.photos || []).map(photo=>({...photo,observationUrl:observation.uri})));
    for(const photo of photos.slice(0,5)){
        const url=safeUrl(clean(photo.url).replace('/square.','/medium.'));
        if(!url || !['cc0','cc-by','cc-by-sa'].includes(clean(photo.license_code)))continue;
        try{await loadPhoto(url,signal);return {...taxon,thumbnailUrl:url,imageAttribution:clean(photo.attribution),imageLicense:photo.license_code,photoSourceUrl:safeUrl(photo.observationUrl)};}catch(error){if(error.name==='AbortError')throw error;}
    }
    throw new Error('No spatial-compatible photograph was found. Try another plant.');
}

export function discoveredPlantProfile(taxon,summary=null){
    const name=plantLabel(taxon.commonName || taxon.scientificName),scientific=plantLabel(taxon.scientificName);
    const plantId=clean(taxon.externalId).replace(/[^a-z0-9-]/gi,'-');
    const introduction=summary?.body || `${name}, scientifically named ${scientific}, is a plant${taxon.family?` in the ${taxon.family} family`:''}. This reference photograph is supplied by iNaturalist.`;
    const provenance={sourceDatabase:'iNaturalist',sourceRecordId:taxon.externalId,sourceUrl:taxon.sourceUrl,retrievalDate:new Date().toISOString(),reviewStatus:'needs_review',importStatus:'search'};
    const node=(id,parentId,title,body,type='fact',sourceIds=['inat'])=>({id,parentId,title,body,preview:body,informationType:type,evidenceStatus:type==='activity'?'local_observation':'sourced',status:'published',sourceIds,provenance:type==='activity'?[]:sourceIds.includes('summary')?[{...provenance,sourceDatabase:'Wikipedia',sourceRecordId:summary.url,sourceUrl:summary.url}]:[provenance]});
    return {common_name:name,scientific_name:scientific,pim:{schemaVersion:1,plantId,
        identity:{commonName:name,scientificName:scientific,identityStatement:introduction,image:safeUrl(taxon.thumbnailUrl),imageAlt:`${name} (${scientific}) · reference photograph`,imageCaption:[name,taxon.imageAttribution,taxon.imageLicense].filter(Boolean).join(' · '),tags:['Plant discovery']},
        sources:[{id:'inat',title:'iNaturalist taxon record',url:taxon.sourceUrl},...(taxon.photoSourceUrl?[{id:'photo',title:'Reference photograph observation',url:taxon.photoSourceUrl}]:[]),...(summary?[{id:'summary',title:'Wikipedia overview',url:summary.url}]:[])],
        metadata:{discoveredAt:new Date().toISOString(),reviewStatus:'needs_review',photoAttribution:taxon.imageAttribution,photoLicense:taxon.imageLicense},
        nodes:[node('scientific-information',null,'Identity',`${name}\n${scientific}${taxon.family?`\nFamily: ${taxon.family}`:''}\nTaxon rank: ${taxon.rank || 'not provided'}`),
            node('discovery-overview','scientific-information','Plant overview',introduction,'fact',summary?['summary']:['inat']),
            node('discovery-photo','scientific-information','Reference photograph',[taxon.imageAttribution,taxon.imageLicense?`Licence: ${taxon.imageLicense}`:'Licence not supplied.'].filter(Boolean).join('\n')),
            node('discovery-observe','food-forest','Look closely','Compare leaves, stems and growth form with the reference photograph. Record what you notice. A requested name and reference photo do not identify a plant in front of you.','activity',[]),
            node('discovery-learn','uses','What to learn next','Uses, growing conditions and propagation have not been verified in this starter profile. These cells can grow as reliable information is added.','activity',[])]}};
}

export function applyDiscoveredPlant(record,profile){
    if(record?.tutorialStage!=='plant2')return false;
    Object.assign(record,{name:profile.common_name,demoPlantPreset:profile.pim.plantId,demoKnowledgeProfile:profile,
        demoKnowledgeProjection:pimToArKnowledge(resolvePlantPim(profile)),demoNativeChoice:profile.pim.plantId,demoNativeChoicePending:false,
        demoOrbColor:'#b28bd2',demoArriveAt:performance.now(),demoExpanded:false,demoInteractive:true,demoAlive:true,awaitingProfileReveal:true});
    return true;
}


export const ZINNIA_NOTE_COLORS={green:'#8ebf9b',blue:'#8ebbd0',amber:'#d8bc82',rose:'#d7a5bb'};
export function applyZinniaNote(record,draft){
    record.name=draft.text.length>42?draft.text.slice(0,39)+'…':draft.text;
    record.description=draft.text;record.notes=draft.text;
    record.demoContent={title:record.name,description:draft.text,lines:[draft.text]};
    record.appearance={...record.appearance,color:ZINNIA_NOTE_COLORS[draft.color] || ZINNIA_NOTE_COLORS.green};
}
function plainDescription(value){return String(value || '').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();}
function daleysProfile(taxon){
    const profile=discoveredPlantProfile(taxon),description=plainDescription(taxon.description);
    profile.pim.identity.identityStatement=description || 'Daleys catalogue entry. Growing information was not supplied.';
    profile.pim.identity.tags=['Daleys catalogue','Cultivar selection'];
    profile.pim.sources=[{id:'daleys',title:'Daleys Fruit Tree Nursery',url:taxon.sourceUrl}];
    profile.pim.metadata.catalogueId=taxon.externalId;profile.pim.metadata.photoKind=taxon.photoKind || 'catalogue';
    profile.pim.nodes=profile.pim.nodes.filter(node=>!['discovery-overview','discovery-photo','discovery-learn'].includes(node.id));
    profile.pim.nodes.push({id:'daleys-description',parentId:'scientific-information',title:'Nursery description',body:profile.pim.identity.identityStatement,preview:profile.pim.identity.identityStatement,informationType:'fact',evidenceStatus:'sourced',status:'published',sourceIds:['daleys'],provenance:[{sourceDatabase:'Daleys Fruit Tree Nursery',sourceRecordId:taxon.externalId,sourceUrl:taxon.sourceUrl,reviewStatus:'needs_review'}]});
    for(const node of profile.pim.nodes)if(node.id==='scientific-information'){node.sourceIds=['daleys'];node.provenance=[{sourceDatabase:'Daleys Fruit Tree Nursery',sourceRecordId:taxon.externalId,sourceUrl:taxon.sourceUrl}];}
    return profile;
}
export function createZinniaPlantDiscovery({onChange=()=>{},onReady=()=>{},onSpeak=()=>{},onCancel=()=>{},mode='plant'}={}){
    let state={mode,query:'',phase:'idle',message:mode==='note'?'What would you like written on your Note?':'Let’s create a custom Orb. Tap Speak and suggest a plant or fruit.',results:[]},controller,disposed=false,generation=0,catalogue=[],page=0,selected,draft='';
    const emit=patch=>{if(!disposed){state={...state,...patch};onChange(state);}};
    const voice=createZinniaVoice({onSpeak,onText:value=>void receive(value),onStatus:message=>emit({voiceMessage:message})});
    const say=message=>{emit({message,voiceMessage:''});void voice.speak(message);};
    function showResults(message){emit({phase:'results',results:catalogue.slice(page*3,page*3+3),hasMore:catalogue.length>3});say(message || 'These are catalogue matches. Say a name, first, second, or third. You can also ask for a dwarf variety.');}
    async function search(value=state.query){
        const query=plantQuery(value);if(query.length<2){say('Please say a plant or fruit name.');return;}
        voice.cancel();controller?.abort();controller=new AbortController();const token=++generation,signal=controller.signal;
        emit({query,phase:'searching',results:[],voiceMessage:''});say('I’m finding '+query+'. Cultivars can have different sizes, shapes and flavours.');
        const timeout=setTimeout(()=>controller?.signal===signal && controller.abort(),45000);
        try{
            let results;try{results=await searchDaleysPlants(query,{signal});}catch(error){if(signal.aborted)throw error;results=[];}
            if(!results.length)results=(await searchINaturalistPlants(query,{signal,rank:'species',limit:20})).filter(item=>item.rank==='species' && safeUrl(item.thumbnailUrl));
            if(disposed || token!==generation)return;catalogue=results;page=0;
            if(!catalogue.length){emit({phase:'idle'});say('I couldn’t find a matching plant. Try another name.');return;}showResults();
        }catch(error){if(!disposed && token===generation){emit({phase:'idle'});say(error.name==='AbortError'?'That search took too long. Please try again.':'Plant search is unavailable. Please retry.');}}
        finally{clearTimeout(timeout);}
    }
    function select(index){if(state.phase!=='results')return;selected=state.results[index];if(!selected)return;emit({phase:'confirm'});say('Would you like '+(selected.commonName || selected.scientificName)+'? Say yes to create your Orb, or no to see the choices again.');}
    async function confirm(){
        if(mode==='note'){
            if(state.phase==='confirm-note'){emit({phase:'color'});say('What colour would you like? Green, blue, amber, or rose.');return;}
            if(state.phase==='confirm-color'){emit({phase:'ready'});const presented=onReady({text:draft,color:state.color});if(presented!==true && !disposed)void voice.speak('Your Note is ready. You can place it and move it to the right spot.');return;}return;
        }
        if(state.phase!=='confirm' || !selected)return;
        controller?.abort();controller=new AbortController();const token=++generation,signal=controller.signal;emit({phase:'loading'});say('I’ll prepare the photograph and Plant cells for '+selected.commonName+'.');
        const timeout=setTimeout(()=>controller?.signal===signal && controller.abort(),30000);
        try{
            let photo=selected;
            if(selected.source==='daleys'){
                try{await loadPhoto(safeUrl(selected.thumbnailUrl),signal);}catch(error){if(signal.aborted)throw error;
                    const species=(await searchINaturalistPlants(selected.scientificName || state.query,{signal,rank:'species',limit:10})).find(item=>item.rank==='species' && (!selected.scientificName || item.scientificName.toLowerCase()===selected.scientificName.toLowerCase()));
                    if(!species)throw new Error('No usable catalogue photograph or matching species reference was found. Choose another variety.');
                    const reference=await referencePhoto(species,signal);photo={...selected,thumbnailUrl:reference.thumbnailUrl,imageAttribution:reference.imageAttribution,imageLicense:reference.imageLicense,photoKind:'species reference',photoSourceUrl:reference.photoSourceUrl};
                }
            }else photo=await referencePhoto(selected,signal);
            if(disposed || token!==generation)return;
            const profile=selected.source==='daleys'?daleysProfile(photo):discoveredPlantProfile(photo,await summaryFor(photo,signal));
            if(photo.photoKind==='species reference'){profile.pim.identity.imageCaption+=' · species reference, not this cultivar';profile.pim.sources.push({id:'photo',title:'Species reference photograph',url:photo.photoSourceUrl});}
            emit({phase:'ready'});
            // A host that opens the next Frame owns its narration. Speaking
            // again here would cancel that flow and strand its Continue action.
            const presented=onReady(profile);
            if(presented!==true && !disposed)void voice.speak('Here is a photograph of '+profile.common_name+'. '+profile.pim.identity.identityStatement.slice(0,350)+' Your Plant cells are ready.');
        }catch(error){if(!disposed && token===generation){emit({phase:'confirm'});say(signal.aborted?'Loading took too long. Please try again.':error.message);}}
        finally{clearTimeout(timeout);}
    }
    function chooseColor(color){if(mode!=='note' || !['color','confirm-color'].includes(state.phase) || !ZINNIA_NOTE_COLORS[color])return;emit({phase:'confirm-color',color});say('Save your Note in '+color+'? Say yes, or choose another colour.');}
    async function receive(value){
        const text=clean(value).slice(0,2000),lower=text.toLowerCase().replace(/[.!?]+$/,'').trim();
        if(/^(cancel|stop|never mind)$/.test(lower)){generation++;controller?.abort();voice.cancel();emit({phase:'cancelled',message:'Cancelled. Nothing was saved.'});onCancel();return;}
        if(['loading','searching','ready'].includes(state.phase))return;
        emit({voiceMessage:'',heard:text});
        if(mode==='note'){
            if(state.phase==='idle'){draft=text;emit({phase:'confirm-note',query:text});say('I heard: '+text+'. Is that correct? Say yes to keep it, or no to record it again.');return;}
            if(/^yes\b|^correct$|^save\b|^confirm$/.test(lower)){void confirm();return;}
            if(/^no\b|^retry$|^again$/.test(lower)){if(state.phase==='confirm-color'){emit({phase:'color'});say('Choose green, blue, amber, or rose.');}else{emit({phase:'idle',query:''});say('Let’s try again. What should your Note say?');}return;}
            const color=Object.keys(ZINNIA_NOTE_COLORS).find(name=>new RegExp('\\b'+name+'\\b').test(lower));if(color){chooseColor(color);return;}
            say('Tap Speak, then say yes, no, or your chosen colour.');return;
        }
        if(state.phase==='confirm'){
            if(/^yes\b|^confirm$|^create\b/.test(lower)){void confirm();return;}
            if(/^no\b|^back$/.test(lower)){showResults();return;}
        }
        if(state.phase==='results'){
            if(/more|other choices|next/.test(lower)){page=(page+1)%Math.ceil(catalogue.length/3);showResults();return;}
            const ordinal=lower.match(/\b(first|second|third|one|two|three|1|2|3)\b/);if(ordinal){select(({first:0,one:0,'1':0,second:1,two:1,'2':1,third:2,three:2,'3':2})[ordinal[1]]);return;}
            const exact=state.results.findIndex(item=>lower.includes((item.commonName || item.scientificName).toLowerCase()));if(exact>=0){select(exact);return;}
            const filters=lower.match(/\b(dwarf|compact|sweet|seedless|red|yellow)\b/g);
            if(filters){const matching=catalogue.filter(item=>filters.every(word=>new RegExp('\\b'+word+'\\b','i').test(item.commonName+' '+plainDescription(item.description))));if(matching.length){catalogue=matching;page=0;showResults('These descriptions match '+filters.join(' and ')+'. Choose a name or say first, second, or third.');}else say('Those catalogue descriptions do not confirm that preference. Choose a listed variety or try another plant.');return;}
        }
        await search(text);
    }
    const api={state:()=>state,search,select,confirm,receive,listen:()=>voice.listen(),speak:voice.speak,
        activate(action){if(action==='voice')void voice.listen();else if(action==='done')voice.finish();else if(action==='confirm')void confirm();else if(action==='retry'){emit({phase:'idle',query:'',results:[]});say(mode==='note'?'What would you like written?':'Which plant would you like?');}else if(action==='back')showResults();else if(action==='more'){page=(page+1)%Math.ceil(catalogue.length/3);showResults();}else if(action==='cancel')void receive('cancel');else if(action.startsWith('result:'))select(Number(action.split(':')[1]));else if(action.startsWith('color:'))chooseColor(action.slice(6));},
        destroy(){disposed=true;generation++;controller?.abort();voice.destroy();}};return api;
}
export function zinniaPlantButtons(state,{voiceControls=false}={}){
    const busy=['loading','searching','ready','cancelled'].includes(state.phase);
    const choices=voiceControls?(busy?(['loading','searching'].includes(state.phase)?[{action:'cancel',label:'Cancel'}]:[]):[{action:'voice',label:'Speak'},{action:'done',label:'Done speaking'},{action:'cancel',label:'Cancel'}]):[];
    if(['confirm','confirm-note','confirm-color'].includes(state.phase))choices.push({action:'confirm',label:'Yes, confirm'},{action:state.mode==='note'?'retry':'back',label:'No, change it'});
    if(state.phase==='color' || state.phase==='confirm-color')for(const color of Object.keys(ZINNIA_NOTE_COLORS))choices.push({action:'color:'+color,label:color});
    if(state.phase==='results'){state.results.forEach((item,index)=>choices.push({action:'result:'+index,label:(index+1)+'. '+(item.commonName || item.scientificName)}));if(state.hasMore)choices.push({action:'more',label:'More varieties'});}
    return choices.map((choice,index)=>({...choice,x:280+(index%2)*430,y:570+Math.floor(index/2)*88,width:410,height:74}));
}
function canvasLines(ctx,text,x,y,width,lineHeight,maximum){const words=String(text || '').split(/\s+/);let line='',row=0;for(const word of words){const next=line?line+' '+word:word;if(ctx.measureText(next).width>width && line){ctx.fillText(line,x,y+row*lineHeight,width);row++;line=word;if(row>=maximum)return;}else line=next;}ctx.fillText(line,x,y+row*lineHeight,width);}
export function drawZinniaPlantDiscovery(ctx,state){
    ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#f3faf5';ctx.font='600 44px Manrope, sans-serif';ctx.fillText(state.mode==='note'?'Create a Note with Zinnia':'Create an Orb with Zinnia',700,350,980);
    ctx.font='400 25px sans-serif';ctx.fillStyle='#cfddd4';canvasLines(ctx,state.voiceMessage || state.message,700,408,880,34,4);
    for(const button of zinniaPlantButtons(state)){ctx.fillStyle=button.action.startsWith('color:')?ZINNIA_NOTE_COLORS[button.action.slice(6)]:'#23493a';ctx.beginPath();ctx.roundRect(button.x,button.y,button.width,button.height,14);ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#83ba9b';ctx.stroke();ctx.fillStyle=button.action.startsWith('color:')?'#17362b':'#f5faf7';ctx.font='500 24px sans-serif';ctx.fillText(button.label,button.x+button.width/2,button.y+button.height/2,button.width-20);}
    ctx.font='400 19px sans-serif';ctx.fillStyle='#b9cdbf';ctx.fillText('Use the microphone bar at lower left · confirm before saving · AI-generated voice',700,1140,980);ctx.restore();
}
export function mountZinniaPlantDiscovery(root,discovery){
    const panel=document.createElement('section');panel.className='living-frame-plant-choices zinnia-plant-discovery';panel.style.cssText='position:relative;display:grid;gap:12px;max-width:600px;margin:18px auto;padding:18px;background:#16362be8;border:1px solid #89b59d;border-radius:18px;color:#eef8f2;pointer-events:auto';
    const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');panel.append(status);const actions=document.createElement('div');actions.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:12px';panel.append(actions);const disclosure=document.createElement('small');disclosure.textContent='Tap Speak for each reply. AI-generated voice. Recordings are processed by the configured voice provider.';panel.append(disclosure);root.append(panel);
    return {render(state){status.textContent=state.voiceMessage || state.message;actions.replaceChildren();for(const choice of zinniaPlantButtons(state)){const button=document.createElement('button');button.type='button';button.textContent=choice.label;button.style.cssText='padding:14px;border-radius:12px';button.onclick=()=>discovery.activate(choice.action);actions.append(button);}},destroy(){panel.remove();}};
}
