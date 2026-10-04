import {knowledgeExplorer} from './knowledgeExplorer.js';
import {pimVisibleNodes} from './plantInformationMesh.js';
import {syncPimConnectionLayer} from './plantInformationMeshView.js';

// Desktop knowledge remains flat. Spatial depth belongs to immersive AR.
const flatViews=new WeakMap();
function prepareFlatView(container,record,knowledge,expanded){
    const map=container.querySelector('[data-pim-renderer="canonical"]');if(!map)return;
    if(knowledgeExplorer(record).mode==='tag'){
        const wrapper=map.closest('.knowledge-flat-view');if(wrapper){container.append(map);wrapper.remove();}flatViews.delete(container);return;
    }
    // A scrollable field keeps words and targets readable. Do not shrink the
    // whole molecule every time another generation of knowledge is opened.
    const nodes=pimVisibleNodes(knowledge,expanded,{explorer:knowledgeExplorer(record),selectedNodeId:record.demoSelectedNodeId || record.pimSelectedNodeId || '',connectedPath:record.knowledgeConnectedPath,includeAllChildren:true});
    const cell=100,points=[{x:0,y:0},...nodes.map(node=>node.knowledgeLocal)],xs=points.map(p=>p.x*cell),ys=points.map(p=>p.y*cell);
    const width=Math.max(container.clientWidth,Math.max(...xs)-Math.min(...xs)+cell*1.5),height=Math.max(container.clientHeight,Math.max(...ys)-Math.min(...ys)+cell*1.5);
    const cx=cell*.75-Math.min(...xs)+(width-(Math.max(...xs)-Math.min(...xs)+cell*1.5))/2,cy=cell*.75-Math.min(...ys)+(height-(Math.max(...ys)-Math.min(...ys)+cell*1.5))/2;
    let wrapper=map.closest('.knowledge-flat-view');if(!wrapper){wrapper=document.createElement('div');wrapper.className='knowledge-flat-view';container.append(wrapper);wrapper.append(map);}
    let field=wrapper.querySelector('.knowledge-flat-field');if(!field){field=document.createElement('div');field.className='knowledge-flat-field';wrapper.append(field);field.append(map);}
    field.style.width=width+'px';field.style.height=height+'px';
    map.style.setProperty('--pim-mesh-scale','1');map.style.setProperty('--pim-cell-size',cell+'px');
    for(const node of nodes){const el=[...map.querySelectorAll('[data-pim-node]')].find(el=>el.dataset.pimNode===node.path);if(!el)continue;el.style.setProperty('--pim-node-x',(cx+node.knowledgeLocal.x*cell)/width*100+'%');el.style.setProperty('--pim-node-y',(cy+node.knowledgeLocal.y*cell)/height*100+'%');}
    const core=map.querySelector('[data-pim-role="center"]');core?.style.setProperty('--pim-core-x',cx/width*100+'%');core?.style.setProperty('--pim-core-y',cy/height*100+'%');
    const selected=record.demoSelectedNodeId || record.pimSelectedNodeId || '',prior=flatViews.get(container);wrapper.scrollLeft+=prior?cx-prior.cx:cx-wrapper.clientWidth/2;wrapper.scrollTop+=prior?cy-prior.cy:cy-wrapper.clientHeight/2;
    if(selected && selected!==prior?.selected){
        const local=nodes.filter(node=>node.path===selected || node.parentPath===selected),bounds=local.map(node=>({x:cx+node.knowledgeLocal.x*cell,y:cy+node.knowledgeLocal.y*cell}));
        if(bounds.length){const left=Math.min(...bounds.map(p=>p.x))-cell*.6,right=Math.max(...bounds.map(p=>p.x))+cell*.6,top=Math.min(...bounds.map(p=>p.y))-cell*.6,bottom=Math.max(...bounds.map(p=>p.y))+cell*.6;
            if(left<wrapper.scrollLeft)wrapper.scrollLeft=left;else if(right>wrapper.scrollLeft+wrapper.clientWidth)wrapper.scrollLeft=right-wrapper.clientWidth;
            if(top<wrapper.scrollTop)wrapper.scrollTop=top;else if(bottom>wrapper.scrollTop+wrapper.clientHeight)wrapper.scrollTop=bottom-wrapper.clientHeight;
        }
    }
    flatViews.set(container,{cx,cy,selected});syncPimConnectionLayer(map);
}
export function disposeKnowledgeDesktopViews(root){root?.querySelectorAll('.knowledge-flat-view').forEach(wrapper=>flatViews.delete(wrapper.parentElement));}
export function mountKnowledgeDesktopView(container,{record,knowledge,expanded}={}){
    if(!container)return;
    const state=knowledgeExplorer(record);
    if(state.mode==='explore'){state.mode='curiosity';state.revision++;}
    prepareFlatView(container,record,knowledge,expanded);
}
