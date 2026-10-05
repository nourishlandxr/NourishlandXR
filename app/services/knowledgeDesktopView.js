import {mountKnowledgeObjectDesktop} from './knowledgeObjectDesktop.js';
import {isPimoDeveloperOverride} from './pimoSpatialCapabilities.js';
import {knowledgeExplorer} from './knowledgeExplorer.js';
import {syncPimConnectionLayer} from './plantInformationMeshView.js';

// Curiosity stays planar; Explorer owns a manipulable hero-derived object field.
const flatViews=new WeakMap(),objectViews=new WeakMap();
function prepareFlatView(container){
    const map=container.querySelector('[data-pim-renderer="canonical"]');if(!map)return;
    const wrapper=map.closest('.knowledge-flat-view');if(wrapper){container.append(map);wrapper.remove();}
    flatViews.delete(container);syncPimConnectionLayer(map);
}
export function disposeKnowledgeDesktopViews(root){root?.querySelectorAll('.knowledge-object-field').forEach(host=>{const container=host.parentElement;objectViews.get(container)?.destroy();objectViews.delete(container);});root?.querySelectorAll('.knowledge-flat-view').forEach(wrapper=>flatViews.delete(wrapper.parentElement));}
export function mountKnowledgeDesktopView(container,{record,knowledge,expanded,onSelect}={}){
    if(!container)return;
    const state=knowledgeExplorer(record);
    container.dataset.knowledgeMode=state.mode;
    const map=container.querySelector('[data-pim-renderer="canonical"]'),flat=map?.closest('.knowledge-flat-view');
    if(state.mode==='explore' && isPimoDeveloperOverride()){
        if(state.curiositySnapshot && flat && !objectViews.has(container))state.curiositySnapshot.viewport={left:flat.scrollLeft,top:flat.scrollTop};
        if(flat)flat.hidden=true;else if(map)map.hidden=true;
        let view=objectViews.get(container);if(view && !view.host.isConnected){view.destroy();view=null;}
        if(!view){view=mountKnowledgeObjectDesktop(container,{record,knowledge,expanded,onSelect});objectViews.set(container,view);}else view.update({record,knowledge,expanded,onSelect});
        return;
    }
    objectViews.get(container)?.destroy();objectViews.delete(container);if(map)map.hidden=false;if(flat)flat.hidden=false;
    prepareFlatView(container,record,knowledge,expanded);
    if(state.previousMode==='explore' && state.curiositySnapshot?.viewport){const wrapper=container.querySelector('.knowledge-flat-view');if(wrapper){wrapper.scrollLeft=state.curiositySnapshot.viewport.left;wrapper.scrollTop=state.curiositySnapshot.viewport.top;}state.previousMode=state.mode;}
}
