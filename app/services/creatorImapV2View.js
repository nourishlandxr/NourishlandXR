import { loadCreatorWorkspace } from './creatorWorkspaceData.js';
import { createCreatorImapV2DiscModel, toImapV2LandscapeInput } from './imapV2DiscModel.js';
import { createImapV2Landscape3D } from './imapV2Landscape3D.js';

const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

// Mounts the same project mapData package into the Creator 3D IMAP. Terrain is
// read from the saved project and does not trigger a second contour request.
export async function mountCreatorImapV2View(host,projectId,{onSelect=()=>{},siteId=''}={}){
    host.innerHTML='<section class="creator-imap-v2"><header><div><p>INTERACTIVE MAP</p><h2>Project landscape</h2><span data-map-status role="status" aria-live="polite">Loading project map…</span></div><nav aria-label="Map view controls"><button type="button" data-map-refresh aria-label="Refresh map from project" title="Refresh project data">↻</button><button type="button" data-map-prev aria-label="Previous map page" title="Previous map page">‹</button><span data-map-page-state aria-live="polite">1 / 1</span><button type="button" data-map-next aria-label="Next map page" title="Next map page">›</button><button type="button" data-map-reset aria-label="Reset map view" title="Reset map view">↺</button><button type="button" data-map-top aria-label="View map from above" title="View from above">⊤</button></nav></header><canvas data-map-canvas tabindex="0" aria-label="Interactive 3D map. Hover over a Totem to reveal its name. Drag to orbit, scroll to zoom."></canvas></section>';
    const section=host.querySelector('.creator-imap-v2'),canvas=host.querySelector('[data-map-canvas]'),status=host.querySelector('[data-map-status]');
    const controller=new AbortController();
    let renderer=null,workspace=null,model=null,disposed=false,page=0;
    const style=document.createElement('style');style.textContent='.creator-imap-v2{height:min(72vh,760px);min-height:420px;display:flex;flex-direction:column;overflow:hidden;border:1px solid #46624d;border-radius:16px;background:radial-gradient(ellipse at 45% 38%,#304a3c,#101c18 76%);color:#edf3e8}.creator-imap-v2 header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:13px 16px;background:#172820}.creator-imap-v2 header p{margin:0;color:#b9c9b9;font-size:10px;letter-spacing:.14em}.creator-imap-v2 h2{margin:3px 0;color:#f0f5eb;font-size:18px}.creator-imap-v2 header span{font-size:12px;color:#c8d8ca}.creator-imap-v2 nav{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;max-width:320px}.creator-imap-v2 nav button{width:44px;height:44px;border:1px solid #66836f;border-radius:8px;background:#213c30;color:#fff2cf;font:22px system-ui;cursor:pointer}.creator-imap-v2 nav button:disabled{opacity:.45;cursor:default}.creator-imap-v2 nav button:hover:not(:disabled){background:#355b44}.creator-imap-v2 nav span{display:grid;place-items:center;min-width:38px;color:#edf3e8}.creator-imap-v2 :focus-visible{outline:3px solid #ffe2a2;outline-offset:3px}.creator-imap-v2 canvas{display:block;flex:1;min-height:0;width:100%;touch-action:none;cursor:grab}.creator-imap-v2 canvas:active{cursor:grabbing}@media(max-width:600px){.creator-imap-v2{height:62vh;min-height:380px}.creator-imap-v2 header{padding:10px;flex-direction:column}.creator-imap-v2 nav{align-self:flex-end;max-width:none}}';
    style.textContent += '.creator-imap-v2 header>div{min-width:0;flex:1}.creator-imap-v2 header span{display:block;overflow-wrap:anywhere}.creator-imap-v2 h2{color:#edf3e8}.creator-imap-v2 nav{flex-shrink:0}.creator-imap-v2 nav button{min-width:44px;padding:0}';
    host.append(style);
    const render=async()=>{
        try{
            workspace=await loadCreatorWorkspace(projectId);
            if(disposed)return;
            model=createCreatorImapV2DiscModel(workspace,{siteId,page});
            page=model.page;
            renderer ||= createImapV2Landscape3D(canvas,{hoverLabels:true,onSelect:id=>{
                const item=model.elements.find(element=>element.id===id)||model.areas.find(area=>area.key===id)?.totem;
                const record=model.areas.flatMap(area=>area.nodes).find(node=>node.key===id);
                status.textContent=`Selected ${escapeHtml(item?.name||record?.name||'map item')}.`;
                onSelect({id,item:model.elements.find(element=>element.id===id)||null,record:record||null});
            }});
            renderer.setData(toImapV2LandscapeInput(model),null);
            section.querySelector('[data-map-page-state]').textContent=`${model.page+1} / ${model.pageCount}`;
            section.querySelector('[data-map-prev]').disabled=model.page<=0;
            section.querySelector('[data-map-next]').disabled=model.page>=model.pageCount-1;
            const map=model.geographicMap.mapData;
            let sourceHost='source recorded';
            try { sourceHost=new URL(map?.source).hostname || sourceHost; } catch {}
            status.textContent=map?.status==='sourced'
                ?`Nearby NSW contour data · ${sourceHost} · ${map.quality}. Hover over a Totem to see its name.`
                :map?.message||'Schematic terrain. Save a project origin and load map information to add nearby contours.';
        }catch(error){status.textContent=`Project map could not load: ${error.message}`;}
    };
    section.addEventListener('click',event=>{
        if(event.target.closest('[data-map-refresh]'))void render();
        if(event.target.closest('[data-map-prev]')&&page>0){page--;void render();}
        if(event.target.closest('[data-map-next]')&&model&&page<model.pageCount-1){page++;void render();}
        if(event.target.closest('[data-map-reset]'))renderer?.reset();
        if(event.target.closest('[data-map-top]'))renderer?.top();
    },{signal:controller.signal});
    await render();
    return {refresh:render,dispose(){disposed=true;controller.abort();renderer?.dispose();style.remove();host.replaceChildren();}};
}
