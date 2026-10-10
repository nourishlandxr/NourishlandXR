import { escapeWorkspaceHtml as html } from './creatorWorkspaceFrame.js';

export function mountCreatorXrWorklist(root,{projectName,areaName,getRecords,onInspect,onPlace,onKnowledge,onClose}) {
    const abort=new AbortController();let page=0,busy=false;
    function render() {
        const records=getRecords().filter(record=>record.marker.status!=='archived');
        page=Math.min(page,Math.max(0,Math.ceil(records.length/5)-1));
        root.innerHTML=`<section class="creator-xr-worklist"><header><h1>${html(areaName || 'Area elements')}</h1><button type="button" data-close>Close</button></header><p>${html(projectName)} · spatial placement and inspection</p>${records.slice(page*5,page*5+5).map(record=>`<div class="xr-worklist-row"><button type="button" data-inspect="${html(record.marker.id)}">${html(record.marker.name)}</button><button type="button" data-place="${html(record.marker.id)}">Place</button>${record.marker.type==='plant'?`<button type="button" data-knowledge="${html(record.marker.id)}">Read</button>`:''}</div>`).join('') || '<p>No elements in this Area. Prepare records in Desktop Studio first.</p>'}<footer class="xr-worklist-pages"><button type="button" data-page="-1"${page===0?' disabled':''}>Previous</button><span>${page+1} / ${Math.max(1,Math.ceil(records.length/5))}</span><button type="button" data-page="1"${(page+1)*5>=records.length?' disabled':''}>Next</button></footer><p role="status" data-status>Choose an element to inspect, place or read.</p></section>`;
    }
    root.addEventListener('click',async event=>{
        const button=event.target.closest('button');if(!button||busy)return;
        if(Object.hasOwn(button.dataset,'close')){onClose();return;}
        if(button.dataset.page){page+=Number(button.dataset.page);render();return;}
        const id=button.dataset.inspect || button.dataset.place || button.dataset.knowledge;
        const record=getRecords().find(record=>record.marker.id===id);if(!record)return;
        busy=true;button.disabled=true;
        try {if(button.dataset.place)await onPlace(record);else if(button.dataset.knowledge)await onKnowledge(record);else await onInspect(record);}
        catch(error){const status=root.querySelector('[data-status]');if(status)status.textContent=error.message;}
        finally{busy=false;if(button.isConnected)button.disabled=false;}
    },{signal:abort.signal});
    render();return {destroy(){abort.abort();}};
}
