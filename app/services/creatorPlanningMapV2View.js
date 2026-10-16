// Preserved Creator planning-map view experiment. Do not mount as spatial IMAP.
import {loadCreatorWorkspace} from './creatorWorkspaceData.js';
import {createCreatorPlanningMapV2Model} from './creatorPlanningMapV2Model.js';
import {loadProject,renameProjectOnDisk} from './persistence.js';
import {workspaceUrl} from './creatorWorkspaceMode.js';
import {dashboardIcon} from './workspaceIcons.js';

const html=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const number=(value,min,max)=>Math.max(min,Math.min(max,Math.round(value)));
const typeName=kind=>({plant:'Orb',area_checkpoint:'Totem',note:'Note',sub_checkpoint:'Marker',intro_checkpoint:'Entrance'})[kind]||'Record';

function mapSvg(model,presentation,selection){
    const water=presentation.waterSketch?'<path d="M0 455 C180 400 360 510 530 440 S820 380 1000 410" fill="none" stroke="#528aa6" stroke-width="3" stroke-dasharray="9 6"/>':'';
    const mapData=model.geographicMap?.mapData,bounds=mapData?.bounds;
    const sourcedContours=mapData?.status==='sourced'&&bounds&&Array.isArray(mapData.features)
        ?'<g fill="none" stroke="#728a72" stroke-width="1.15" opacity=".5">'+mapData.features.flatMap(feature=>feature.geometry.paths.map(path=>{
            const points=path.map(([longitude,latitude])=>({x:(longitude-bounds.xmin)/(bounds.xmax-bounds.xmin)*1000,y:(bounds.ymax-latitude)/(bounds.ymax-bounds.ymin)*model.height}));
            return points.length>1?'<path d="M'+points.map(point=>point.x.toFixed(1)+' '+point.y.toFixed(1)).join(' L')+'"/>':'';
        })).join('')+'</g><text x="18" y="30" class="imap-v2-map-disclaimer">SOURCED NEARBY CONTOURS · illustrative regional context</text>'
        :'';
    const contours=presentation.terrain==='contour-sketch'
        ? Array.from({length:5},(_,i)=>{const y=65+i*115;return '<path d="M0 '+y+' C230 '+(y-35)+' 300 '+(y+28)+' 520 '+y+' S780 '+(y-26)+' 1000 '+(y+12)+'" fill="none" stroke="#b5c7b6" stroke-width="1"/>';}).join('')
        : presentation.terrain==='slope-sketch'
            ? Array.from({length:8},(_,i)=>'<path d="M'+(i*145-80)+' 0 L'+(i*145+180)+' '+model.height+'" stroke="#bac7b8" stroke-width="1"/>').join('')
            : '';
    const areas=model.areas.map(area=>{
        const records=model.records.filter(record=>record.areaKey===area.key);
        const visible=records.slice(0,8);
        const markers=visible.map(record=>{
            const selected=selection===record.key;
            const shape=record.kind==='area_checkpoint'
                ? '<path d="M0 -11 L11 0 L0 11 L-11 0 Z" fill="#a7602e" stroke="#683813" stroke-width="'+(selected?3:1.5)+'"/>'
                : record.kind==='plant'
                    ? '<circle r="10" fill="#2e7956" stroke="#164c35" stroke-width="'+(selected?3:1.5)+'"/>'
                    : '<rect x="-9" y="-9" width="18" height="18" rx="2" fill="#4e8194" stroke="#275365" stroke-width="'+(selected?3:1.5)+'"/>';
            return '<g class="imap-v2-marker" data-imap-record="'+html(record.key)+'" data-imap-key="'+html(record.key)+'" transform="translate('+record.dx+' '+record.dy+')" role="button" tabindex="0" aria-label="Inspect '+html(typeName(record.kind))+' '+html(record.name)+'"><title>'+html(record.name)+'</title>'+shape+'</g>';
        }).join('');
        return '<g class="imap-v2-area" data-imap-area="'+html(area.key)+'" data-imap-key="'+html(area.key)+'" transform="translate('+area.x+' '+area.y+')" role="button" tabindex="0" aria-label="Inspect Area '+html(area.name)+'">'+
            '<rect x="-94" y="-73" width="188" height="146" rx="5" fill="#ffffff" fill-opacity=".9" stroke="'+(selection===area.key?'#174e83':'#63866b')+'" stroke-width="'+(selection===area.key?3:1.8)+'"/>'+
            '<path d="M-94 -37 H94" stroke="#9cb7a1" stroke-width="1"/><text x="-81" y="-49" class="imap-v2-area-name">'+html(area.name)+'</text>'+
            markers+'<text x="-81" y="60" class="imap-v2-area-count">'+records.length+' record'+(records.length===1?'':'s')+(records.length>8?' · '+(records.length-8)+' more':'')+'</text></g>';
    }).join('');
    return '<svg class="imap-v2-svg" data-imap-svg viewBox="0 0 1000 '+model.height+'" role="group" aria-label="Creator planning map layout for '+html(model.selectedSite?.name||'project')+'">'+
        '<defs><pattern id="imapGrid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0 H0 V40" fill="none" stroke="#d8e2d8" stroke-width="1"/></pattern></defs>'+
        '<rect width="1000" height="'+model.height+'" fill="#f8faf6"/><rect width="1000" height="'+model.height+'" fill="url(#imapGrid)"/>'+sourcedContours+contours+water+
        (areas||'<text x="500" y="295" text-anchor="middle" class="imap-v2-empty-title">Your map grows with the project</text><text x="500" y="324" text-anchor="middle" class="imap-v2-empty-detail">Add an Area, then a Totem, Orb or Note.</text>')+
        '<text x="28" y="'+(model.height-24)+'" class="imap-v2-map-disclaimer">CONCEPTUAL LAYOUT · PHYSICAL POSITIONS NOT VERIFIED</text></svg>';
}

export async function mountCreatorPlanningMapV2(host,projectId,{siteId:requestedSiteId=''}={}){
    let workspace=null,presentation=null,siteId=requestedSiteId,selection='',busy=false,message='',drag=null;
    const controller=new AbortController();
    const style=document.createElement('style');
    style.textContent='.studio-project-map{margin:14px 0}.studio-project-map>[data-project-map]{min-width:0}.imap-v2{display:grid;gap:12px;color:#213a2e}.imap-v2-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:16px;border:1px solid #d5dfd2;border-radius:14px;background:#f7faf5}.imap-v2-eyebrow{margin:0;color:#58755d;font-size:.72rem;font-weight:700;letter-spacing:.12em}.imap-v2-header h3{margin:5px 0;font-size:1.35rem}.imap-v2-header p:last-child{margin:5px 0 0;max-width:62ch;line-height:1.5}.imap-v2-header-actions{display:flex;gap:8px;align-items:center}.imap-v2-icon,.imap-v2-save,.imap-v2-open,.imap-v2-reset-item{min-height:42px;border:1px solid #718b71;border-radius:8px;background:white;color:#243d31;padding:8px 12px;font:600 .9rem system-ui;cursor:pointer}.imap-v2-icon{width:44px;padding:8px}.imap-v2-save{background:#e7efe3}.imap-v2-stats{display:flex;flex-wrap:wrap;gap:8px}.imap-v2-stats span{padding:8px 12px;border:1px solid #d5dfd2;border-radius:8px;background:#fff}.imap-v2-body{display:grid;grid-template-columns:minmax(0,1fr) minmax(230px,290px);gap:12px;align-items:start}.imap-v2-main,.imap-v2-side{min-width:0;padding:12px;border:1px solid #d5dfd2;border-radius:12px;background:#fff}.imap-v2-site-bar{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:10px}.imap-v2-site-bar label{display:flex;gap:8px;align-items:center}.imap-v2-site-bar select,.imap-v2-options select{min-height:40px}.imap-v2-svg{display:block;width:100%;height:auto;max-height:72vh;border:1px solid #dfe7dd;background:#f8faf6;touch-action:none;user-select:none}.imap-v2-area-name{font:600 18px system-ui;fill:#243d31}.imap-v2-area-count{font:13px system-ui;fill:#536c58}.imap-v2-map-disclaimer{font:700 12px system-ui;letter-spacing:.08em;fill:#546b56}.imap-v2-legend{display:flex;flex-wrap:wrap;gap:14px;padding:10px 2px;font-size:.82rem}.imap-v2-legend span{display:flex;align-items:center;gap:6px}.imap-v2-legend i{display:inline-block;width:12px;height:12px;border-radius:50%;background:#2e7956}.imap-v2-legend .imap-v2-totem-key{border-radius:1px;background:#a7602e;transform:rotate(45deg)}.imap-v2-legend .imap-v2-note-key{border-radius:2px;background:#4e8194}.imap-v2-side h4{margin:2px 0 8px}.imap-v2-side p{line-height:1.5}.imap-v2-record-list{padding-left:18px}.imap-v2-record-list button{width:100%;display:grid;gap:3px;text-align:left;padding:8px;border:0;border-radius:6px;background:#f4f7f2;color:inherit}.imap-v2-record-list button span{font-size:.75rem;color:#617564}.imap-v2-open{display:inline-flex;align-items:center;margin:8px 8px 0 0;text-decoration:none}.imap-v2-reset-item{margin-top:8px}.imap-v2-options{margin-top:14px;padding-top:10px;border-top:1px solid #d5dfd2}.imap-v2-options label{display:block;margin:10px 0}.imap-v2-check{display:flex!important;gap:8px;align-items:center}.imap-v2-status,.imap-v2-loading,.imap-v2-error{padding:10px 12px;border-radius:8px;background:#f3f6ef;line-height:1.45}.imap-v2-error{color:#8a3329;background:#fff1ee}.imap-v2 :focus-visible{outline:3px solid #d49a34;outline-offset:2px}@media(max-width:850px){.imap-v2-body{grid-template-columns:1fr}.imap-v2-side{display:grid;grid-template-columns:1fr 1fr;gap:8px}.imap-v2-side h4,.imap-v2-side>p,.imap-v2-options{grid-column:1/-1}}@media(max-width:600px){.imap-v2-header,.imap-v2-site-bar{align-items:flex-start;flex-direction:column}.imap-v2-header-actions{align-self:flex-end}.imap-v2-side{display:block}.imap-v2-svg{max-height:none}}';
    document.head.append(style);
    const stateKey='nlxr.creator-planning-map-v2.selection.'+projectId;
    try{const state=JSON.parse(sessionStorage.getItem(stateKey)||'{}');siteId=siteId||state.siteId||'';selection=state.selection||'';}catch{}
    const load=async()=>{
        host.innerHTML='<p class="imap-v2-loading" role="status">Generating Creator planning map from project Areas and records…</p>';
        try{workspace=await loadCreatorWorkspace(projectId);if(!host.isConnected)return;presentation=structuredClone(workspace.project.creatorPlanningMapV2||{schemaVersion:2,positions:{},terrain:'clean',waterSketch:false});presentation.positions ||= {};render();}
        catch(error){if(host.isConnected)host.innerHTML='<div class="imap-v2-error" role="alert">Creator planning map could not load: '+html(error.message)+' <button type="button" data-imap-retry>Try again</button></div>';}
    };
    const persistSelection=()=>{try{sessionStorage.setItem(stateKey,JSON.stringify({siteId,selection}));}catch{}};
    const current=()=>createCreatorPlanningMapV2Model(workspace,siteId,presentation.positions);
    const chosen=model=>model.areas.find(area=>area.key===selection)||model.records.find(record=>record.key===selection)||null;
    const render=()=>{
        if(!host.isConnected||!workspace)return;
        const model=current();siteId=model.selectedSite?.id||'';
        if(selection&&!chosen(model))selection='';
        persistSelection();
        const selected=chosen(model);
        const records=selected?(selected.areaKey?[selected]:model.records.filter(record=>record.areaKey===selected.key)):[];
        const entry=selected?.areaKey?workspace.entries.find(value=>value.siteId===selected.siteId&&value.place.id===selected.areaId&&value.marker.id===selected.id):null;
        const recordLink=entry?workspaceUrl(projectId,{mode:'desktop',siteId:entry.siteId,recordKey:entry.key,view:'records'}).href:'';
        const areaLink=selected?.siteId?workspaceUrl(projectId,{mode:'desktop',siteId:selected.siteId,view:'records'}).href:'';
        const mapData=model.geographicMap.mapData;
        let sourceName='recorded source';
        try{sourceName=new URL(mapData?.source).hostname||sourceName;}catch{}
        const mapStatus=mapData?.status==='sourced'
            ?`Nearby NSW contours from ${sourceName} · ${mapData.quality}${mapData.limited?' · simplified to fit the map':''}. Terrain is interpolated from contour lines.`
            :mapData?.message||(workspace.offline?'Prepared offline snapshot · saving is unavailable.':'Map content regenerates from the current project. Layout changes save separately.');
        const optionsOpen=Boolean(host.querySelector('.imap-v2-options[open]'));
        host.innerHTML='<section class="imap-v2" aria-label="Creator planning map layout">'+
            '<header class="imap-v2-header"><div><p class="imap-v2-eyebrow">FLAT PLANNING MAP</p><h3>'+html(workspace.project.name||'Project')+'</h3><p>Areas, Totems, Orbs and Notes appear from this project as you add them. Select an item to inspect it; drag to refine its plan position.</p></div><div class="imap-v2-header-actions"><button type="button" class="imap-v2-icon" data-imap-refresh aria-label="Refresh planning map" title="Refresh planning map">'+dashboardIcon('refresh')+'</button><button type="button" class="imap-v2-save" data-imap-save'+(busy||workspace.offline?' disabled':'')+'>Save layout</button></div></header>'+
            '<div class="imap-v2-stats"><span><b>'+model.summary.sites+'</b> Sites</span><span><b>'+model.summary.areas+'</b> Areas</span><span><b>'+model.summary.totems+'</b> Totems</span><span><b>'+model.summary.orbs+'</b> Orbs</span></div>'+
            '<div class="imap-v2-body"><div class="imap-v2-main"><div class="imap-v2-site-bar"><label>Site <select data-imap-site>'+model.sites.map(site=>'<option value="'+html(site.id)+'"'+(site.id===siteId?' selected':'')+'>'+html(site.name)+'</option>').join('')+'</select></label><span>'+model.areas.length+' Areas · '+model.records.length+' records</span></div>'+
            mapSvg(model,presentation,selection)+'<div class="imap-v2-legend"><span><i class="imap-v2-area-key"></i> Area</span><span><i class="imap-v2-totem-key"></i> Totem</span><span><i class="imap-v2-orb-key"></i> Orb</span><span><i class="imap-v2-note-key"></i> Note</span></div></div>'+
            '<aside class="imap-v2-side"><h4>'+html(selected?.name||'Select an item')+'</h4><p>'+html(selected?.areaKey?typeName(selected.kind):selected?'Area':'Choose an Area or marker to see its records and open the Creator workspace.')+'</p>'+
            (selected?'<p class="imap-v2-position">'+html(selected.positionSource)+' position</p>':'')+
            (records.length?'<ul class="imap-v2-record-list">'+records.map(record=>'<li><button type="button" data-imap-select="'+html(record.key)+'"><span>'+html(typeName(record.kind))+'</span><strong>'+html(record.name)+'</strong></button></li>').join('')+'</ul>':'')+
            (recordLink?'<a class="imap-v2-open" href="'+html(recordLink)+'">Open record in Studio</a>':areaLink?'<a class="imap-v2-open" href="'+html(areaLink)+'">Open Site in Studio</a>':'')+
            (selected?'<button type="button" class="imap-v2-reset-item" data-imap-reset-item>Reset map position</button>':'')+
            '<details class="imap-v2-options"'+(optionsOpen?' open':'')+'><summary>Map appearance</summary><label>Terrain style <select data-imap-terrain><option value="clean">Clean plan</option><option value="contour-sketch">Contour sketch</option><option value="slope-sketch">Slope sketch</option></select></label><label class="imap-v2-check"><input type="checkbox" data-imap-water> Water sketch</label><p>Sketch layers illustrate a style. They do not represent surveyed slope, elevation or water.</p></details>'+
            '</aside></div><p class="imap-v2-status" role="status" data-imap-status>'+html(message||mapStatus)+'</p></section>';
        host.querySelector('[data-imap-terrain]').value=presentation.terrain||'clean';
        host.querySelector('[data-imap-water]').checked=Boolean(presentation.waterSketch);
    };
    const save=async()=>{
        if(busy||workspace.offline)return;busy=true;message='Saving Creator planning-map layout…';render();
        try{
            const fresh=await loadProject(projectId);
            if(String(fresh.modified||'')!==String(workspace.project.modified||''))throw new Error('Project changed elsewhere. Refresh the planning map and review the layout before saving.');
            const saved=await renameProjectOnDisk(projectId,{...fresh,preserveId:true,creatorPlanningMapV2:{schemaVersion:2,positions:presentation.positions,terrain:presentation.terrain||'clean',waterSketch:Boolean(presentation.waterSketch)},_expectedModified:fresh.modified||''});
            workspace.project=saved;message='Creator planning-map layout saved to this project.';
        }catch(error){message=error.message;}finally{busy=false;render();}
    };
    host.addEventListener('change',event=>{
        if(event.target.matches('[data-imap-site]')){siteId=event.target.value;selection='';render();}
        if(event.target.matches('[data-imap-terrain]')){presentation.terrain=event.target.value;message='Terrain sketch changed. Save layout to keep it.';render();}
        if(event.target.matches('[data-imap-water]')){presentation.waterSketch=event.target.checked;message='Water sketch changed. Save layout to keep it.';render();}
    },{signal:controller.signal});
    host.addEventListener('click',event=>{
        if(event.target.closest('[data-imap-retry]')){void load();return;}
        if(event.target.closest('[data-imap-refresh]')){void load();return;}
        if(event.target.closest('[data-imap-save]')){void save();return;}
        if(event.target.closest('[data-imap-reset-item]')){delete presentation.positions[selection];message='Position reset. Save layout to keep it.';render();return;}
        const selected=event.target.closest('[data-imap-select]');if(selected){selection=selected.dataset.imapSelect;render();}
    },{signal:controller.signal});
    host.addEventListener('pointerdown',event=>{
        const target=event.target.closest('[data-imap-record],[data-imap-area]');
        const svg=host.querySelector('[data-imap-svg]');
        if(!target||!svg)return;
        const record=target.closest('[data-imap-record]');
        const node=record||target.closest('[data-imap-area]');
        const key=node.dataset.imapRecord||node.dataset.imapArea;
        const model=current(),item=model.records.find(value=>value.key===key)||model.areas.find(value=>value.key===key);
        if(!item)return;
        const pointer=svg.createSVGPoint();pointer.x=event.clientX;pointer.y=event.clientY;
        const from=pointer.matrixTransform(svg.getScreenCTM().inverse());
        drag={key,id:event.pointerId,node,svg,item,from,baseX:item.areaKey?item.dx:item.x,baseY:item.areaKey?item.dy:item.y,moved:false};
        svg.setPointerCapture(event.pointerId);
    },{signal:controller.signal});
    host.addEventListener('pointermove',event=>{
        if(!drag||event.pointerId!==drag.id)return;
        const pointer=drag.svg.createSVGPoint();pointer.x=event.clientX;pointer.y=event.clientY;
        const now=pointer.matrixTransform(drag.svg.getScreenCTM().inverse());
        const dx=now.x-drag.from.x,dy=now.y-drag.from.y;
        if(Math.hypot(dx,dy)>3)drag.moved=true;
        if(!drag.moved)return;
        const x=drag.baseX+dx,y=drag.baseY+dy;
        drag.node.setAttribute('transform','translate('+x+' '+y+')');
    },{signal:controller.signal});
    const finishDrag=event=>{
        if(!drag||event.pointerId!==drag.id)return;
        const active=drag;drag=null;
        selection=active.key;
        if(active.moved){
            const pointer=active.svg.createSVGPoint();pointer.x=event.clientX;pointer.y=event.clientY;
            const now=pointer.matrixTransform(active.svg.getScreenCTM().inverse());
            const dx=now.x-active.from.x,dy=now.y-active.from.y;
            presentation.positions[active.key]=active.item.areaKey
                ?{dx:number(active.baseX+dx,-78,78),dy:number(active.baseY+dy,-43,60)}
                :{x:number(active.baseX+dx,115,885),y:number(active.baseY+dy,130,current().height-115)};
            message='Layout changed. Save layout to keep it.';
        }
        render();
    };
    host.addEventListener('pointerup',finishDrag,{signal:controller.signal});
    host.addEventListener('pointercancel',event=>{if(drag?.id===event.pointerId){drag=null;render();}});
    host.addEventListener('keydown',event=>{
        if(!['Enter',' '].includes(event.key))return;
        const node=event.target.closest('[data-imap-key]');if(!node)return;
        event.preventDefault();selection=node.dataset.imapKey;render();
        [...host.querySelectorAll('[data-imap-key]')].find(item=>item.dataset.imapKey===selection)?.focus();
    },{signal:controller.signal});
    await load();
    return {refresh:load,dispose(){controller.abort();style.remove();host.replaceChildren();}};
}
