import { pimAncestors, pimKnowledgeScope } from './pimModel.js';
import { createSpatialTotemCards, hitTotemSurface } from './spatialTotemCards.js';

export const INFO_HELP = 'Hold a PIM cell to read its details here. Edit information opens the selected topic. Settings adjusts text size or recenters this panel. Hide clears your view; Control panel restores it.';

// This is a reading projection, never a second store of plant knowledge.
export function pimInfoContent(document, path) {
    const node = document?.nodes?.find(item => item.id === path || item.path === path);
    if (!node) return null;
    return { id: node.id, path: node.path, title: node.title,
        plant: document.identity?.commonName || document.identity?.scientificName || document.plantId,
        breadcrumb: [...pimAncestors(document, node.id).map(item => item.title), node.title].join(' › '),
        body: node.body || 'No detailed information has been added to this cell yet.',
        scope: pimKnowledgeScope(node), status: node.status, evidence: node.evidenceStatus,
        safety: node.safetyNote || '',
        sources: (node.sourceIds || []).map(id => document.sources?.find(source => source.id === id))
            .filter(Boolean).map(source => source.title || source.name || source.url || source.id) };
}

export function infoPages(text, columns = 48, rows = 10) {
    const lines = [];
    for (const paragraph of String(text || '').split('\n')) {
        let line = '';
        for (let word of paragraph.split(/\s+/).filter(Boolean)) {
            if (line && line.length + word.length + 1 > columns) { lines.push(line); line = ''; }
            while (word.length > columns) { lines.push(word.slice(0, columns)); word = word.slice(columns); }
            line += (line ? ' ' : '') + word;
        }
        lines.push(line);
    }
    const pages = [];
    for (let i = 0; i < lines.length; i += rows) pages.push(lines.slice(i, i + rows));
    return pages.length ? pages : [['']];
}

// A body-relative approximation: keep the initial heading while translating
// with the viewer. Following head yaw would move it away when looking left.
export function facePanelTowardEyes(center, eyes) {
    const dx=eyes.x-center.x,dy=eyes.y-center.y,dz=eyes.z-center.z;
    const length=Math.hypot(dx,dy,dz)||1;
    const normal={x:dx/length,y:dy/length,z:dz/length};
    const horizontal=Math.hypot(normal.x,normal.z);
    const right=horizontal>1e-6?{x:normal.z/horizontal,y:0,z:-normal.x/horizontal}:{x:1,y:0,z:0};
    const up={x:normal.y*right.z,y:normal.z*right.x-normal.x*right.z,z:-normal.y*right.x};
    return {right,up,normal};
}

export function infoPanelPose(matrix, heading = null) {
    if (!matrix) return null;
    const length = Math.hypot(matrix[0], matrix[2]) || 1;
    const right = heading || { x: matrix[0] / length, y: 0, z: matrix[2] / length };
    const center={ x: matrix[12] - right.x * .46 + right.z * .62,
        y: matrix[13] - .30, z: matrix[14] - right.z * .46 - right.x * .62 };
    return {anchorHeading:right,center,...facePanelTowardEyes(center,{x:matrix[12],y:matrix[13],z:matrix[14]})};
}

// Shared rectangles are used by the spatial artwork and its ray hit testing.
export function controlPanelControls({hidden=false,tab='Details',selected=false,page=0,pageCount=1,height=680,largeText=false}={}) {
    if(hidden)return [{action:'Restore',label:'Control panel',x:30,y:36,width:940,height:70}];
    const buttons=[{action:'Hide',label:'Hide',x:18,y:height-76,width:174,height:54}];
    ['Details','Help','Settings'].forEach((label,i)=>buttons.push({action:label,label,kind:'tab',selected:tab===label,x:18,y:148+i*76,width:174,height:62}));
    if(tab==='Details')buttons.push({action:'Previous',label:'Previous',x:238,y:height-70,width:150,height:48,disabled:page===0},{action:'Next',label:'Next',x:408,y:height-70,width:150,height:48,disabled:page>=pageCount-1},{action:'Edit',label:'Edit information',x:648,y:height-70,width:322,height:48,disabled:!selected});
    if(tab==='Settings')buttons.push({action:'TextSize',label:largeText?'Standard text':'Larger text',x:238,y:height-70,width:350,height:48},{action:'Recenter',label:'Recenter panel',x:608,y:height-70,width:362,height:48});
    return buttons;
}
export function controlPanelHeight(lines,largeText=false){return Math.max(560,390+Math.min(7,lines)*(largeText?46:38));}

let panelInstance=0;
export function createPimInfoPanel({ root, onEdit = () => {} } = {}) {
    let selection=null,record=null,identity=null,page=0,hidden=false,tab='Details',largeText=false;
    let renderer=null,pose=null,heading=null,lastTime=0,detached=false,guided=false;
    let removeXrControls=()=>{};
    const element=document.createElement('aside'),contentId='control-panel-content-'+(++panelInstance);
    element.className='nlxr-info-panel';element.setAttribute('aria-label','Control panel');root?.append(element);
    const text=()=>tab==='Help'?INFO_HELP:tab==='Settings'
        ? 'Make this panel comfortable to read. Choose a larger text size, or recenter it to the left of your current view. Your plant selection stays in place.'
        : selection?[selection.body,selection.safety && 'Safety: '+selection.safety,selection.sources.length && 'Sources: '+selection.sources.join('; ')].filter(Boolean).join('\n\n')
        : identity?'Explore the honeycomb around '+identity.plant+'. Hold a cell to read its details here.'
        :'Follow the green welcome panel to begin. Select a plant and explore its PIM to bring information here.';
    const pages=()=>infoPages(text(),largeText?32:38,7);
    const title=()=>tab==='Help'?'Explore at your own pace':tab==='Settings'?'Reading comfort':selection?.title || (identity?'Choose a topic':'Ready to explore');
    const metadata=()=>selection && tab==='Details'?[selection.scope==='specimen'?'Local observation':selection.scope==='species'?'Species knowledge':'',selection.status==='draft'?'Draft':'',selection.evidence==='needs_review'?'Awaiting review':''].filter(Boolean).join(' · '):'';
    const height=()=>controlPanelHeight(pages()[page]?.length || 0,largeText);
    const controls=()=>controlPanelControls({hidden,tab,selected:Boolean(selection),page,pageCount:pages().length,height:height(),largeText});
    function act(action){
        const button=controls().find(item=>item.action===action);if(button?.disabled)return;
        if(action==='Restore')hidden=false;
        if(action==='Hide')hidden=true;
        if(['Details','Help','Settings'].includes(action)){tab=action;page=0;}
        if(action==='Previous')page=Math.max(0,page-1);
        if(action==='Next')page=Math.min(pages().length-1,page+1);
        if(action==='Edit' && selection)onEdit(record,selection.path || selection.id);
        if(action==='TextSize'){largeText=!largeText;page=0;}
        if(action==='Recenter'){heading=null;pose=null;}
        render();
    }
    function makeButton(item){
        const button=document.createElement('button');button.type='button';button.textContent=item.label;button.dataset.infoAction=item.action;button.disabled=Boolean(item.disabled);
        button.setAttribute('aria-label',item.action==='Restore'?'Restore Control panel':item.label);
        if(item.kind==='tab'){button.setAttribute('role','tab');button.setAttribute('aria-selected',String(item.selected));button.setAttribute('aria-controls',contentId);button.id=contentId+'-'+item.action;button.tabIndex=item.selected?0:-1;}
        button.addEventListener('click',event=>{event.stopPropagation();act(item.action);});return button;
    }
    function render(){
        if(detached)return;
        const focused=element.contains(document.activeElement)?document.activeElement?.dataset.infoAction:null;
        element.replaceChildren();element.classList.toggle('is-hidden',hidden);element.classList.toggle('is-large-text',largeText);
        if(hidden)element.append(makeButton(controls()[0]));
        else{
            const header=document.createElement('header');header.className='nlxr-control-header';
            const label=document.createElement('small');label.textContent='CONTROL PANEL';
            const plant=document.createElement('h2');plant.textContent=identity?.plant || selection?.plant || 'No plant selected';
            const scientific=document.createElement('p');scientific.className='nlxr-control-identity';scientific.textContent=identity?.scientific || (identity?'Selected plant':'Your exploration companion');
            header.append(label,plant,scientific);element.append(header);
            const tabs=document.createElement('nav');tabs.className='nlxr-control-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-orientation','vertical');tabs.setAttribute('aria-label','Control panel sections');
            controls().filter(item=>item.kind==='tab').forEach(item=>tabs.append(makeButton(item)));tabs.append(makeButton(controls()[0]));element.append(tabs);
            const content=document.createElement('section');content.id=contentId;content.setAttribute('role','tabpanel');content.setAttribute('aria-labelledby',contentId+'-'+tab);content.tabIndex=0;
            const heading=document.createElement('h3');heading.textContent=title();
            const trail=document.createElement('p');trail.className='nlxr-info-trail';trail.textContent=tab==='Details'?selection?.breadcrumb || 'PIM → Details':'';
            const body=document.createElement('p');body.className='nlxr-info-body';body.textContent=pages()[page].join('\n');
            const status=document.createElement('small');status.textContent=metadata();content.append(heading,trail,body,status);element.append(content);
            const nav=document.createElement('nav');nav.className='nlxr-control-actions';nav.setAttribute('aria-label','Control panel actions');
            controls().filter(item=>!item.kind && item.action!=='Hide').forEach(item=>nav.append(makeButton(item)));element.append(nav);
            if(tab==='Details'){const count=document.createElement('small');count.className='nlxr-control-page';count.textContent=(page+1)+' / '+pages().length;element.append(count);}
        }
        if(focused)(element.querySelector('[data-info-action="'+focused+'"]') || element.querySelector('button'))?.focus({preventScroll:true});
    }
    element.addEventListener('keydown',event=>{
        if(event.target.getAttribute('role')!=='tab' || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
        event.preventDefault();const tabs=['Details','Help','Settings'],index=tabs.indexOf(tab);
        act(event.key==='Home'?'Details':event.key==='End'?'Settings':tabs[(index+(['ArrowRight','ArrowDown'].includes(event.key)?1:2))%3]);
        element.querySelector('[data-info-action="'+tab+'"]')?.focus();
    });
    element.addEventListener('beforexrselect',event=>event.preventDefault());
    element.addEventListener('pointerdown',event=>event.stopPropagation());
    function canvas(card){
        const c=document.createElement('canvas');c.width=1000;c.height=card.hidden?160:card.height;const ctx=c.getContext('2d');
        const gradient=ctx.createLinearGradient(0,0,1000,c.height);gradient.addColorStop(0,'rgba(48,53,59,.90)');gradient.addColorStop(1,'rgba(19,24,29,.85)');
        ctx.fillStyle=gradient;ctx.beginPath();ctx.roundRect(4,4,992,c.height-8,14);ctx.fill();ctx.strokeStyle=card.guided?'#b7dcc8':'rgba(220,228,230,.45)';ctx.lineWidth=card.guided?4:2;ctx.stroke();ctx.textBaseline='top';
        if(!card.hidden){
            ctx.fillStyle='rgba(15,20,23,.48)';ctx.fillRect(6,6,204,c.height-12);ctx.fillStyle='rgba(19,24,29,.40)';ctx.fillRect(214,6,780,155);
            ctx.fillStyle='#b7c5c9';ctx.font='600 21px system-ui';ctx.fillText('CONTROL',24,32,170);ctx.fillText('PANEL',24,61,170);
            ctx.fillStyle='#f1f4f4';ctx.font='600 38px system-ui';ctx.fillText(card.plant,238,30,732);
            ctx.fillStyle='#bdc9cc';ctx.font='400 23px system-ui';ctx.fillText(card.scientific,238,91,732);
            ctx.fillStyle='#f1f4f4';ctx.font='600 32px system-ui';ctx.fillText(card.title,238,187,732);
            ctx.fillStyle='#b4c3c7';ctx.font='400 20px system-ui';ctx.fillText(card.trail,238,232,732);
            ctx.fillStyle='#f1f4f4';ctx.font=(card.largeText?'400 40px':'400 34px')+' system-ui';card.lines.forEach((line,i)=>ctx.fillText(line,238,280+i*(card.largeText?46:38),732));
            ctx.fillStyle='#b4c3c7';ctx.font='400 20px system-ui';ctx.fillText(card.metadata,238,card.height-106,600);
            if(card.tab==='Details')ctx.fillText(card.page,882,card.height-106,88);
        }
        card.controls.forEach(button=>{
            ctx.fillStyle=button.selected?'rgba(159,187,184,.30)':button.disabled?'rgba(211,220,225,.04)':'rgba(211,220,225,.12)';ctx.beginPath();ctx.roundRect(button.x,button.y,button.width,button.height,7);ctx.fill();
            if(button.selected){ctx.fillStyle='#aaccc1';ctx.fillRect(button.x,button.y+9,3,button.height-18);}
            ctx.fillStyle=button.disabled?'#899297':'#f1f4f4';ctx.font='500 25px system-ui';ctx.textAlign='center';ctx.fillText(button.label,button.x+button.width/2,button.y+(button.height-30)/2,button.width-16);
        });return c;
    }
    function hit(ray){if(!pose || !renderer || detached)return null;return hitTotemSurface(ray,[{...pose,width:hidden?.30:.82,height:hidden?.07:height()/1000*.82}]);}
    const api={element,
        setGuided(value){guided=Boolean(value);element.classList.toggle('is-guided',guided);},
        focusPlant(nextRecord,document){
            if(record===nextRecord && identity)return;
            record=nextRecord;selection=null;identity={plant:document.identity?.commonName || document.identity?.scientificName || 'Plant',scientific:document.identity?.scientificName || ''};tab='Details';page=0;render();
        },
        select(nextRecord,document,path){const next=pimInfoContent(document,path);if(!next)return false;record=nextRecord;selection=next;identity={plant:next.plant,scientific:document.identity?.scientificName || ''};tab='Details';hidden=false;page=0;render();return true;},
        refresh(nextRecord,document){if(record===nextRecord && selection)api.select(record,document,selection.id);},
        suspend(value){element.style.visibility=value?'hidden':'';detached=Boolean(value);if(!value)render();},
        attach(gl){renderer?.destroy();renderer=createSpatialTotemCards(gl,{canvas,surfaces:(_position,_right,cards)=>pose?[{...pose,width:hidden?.30:.82,height:hidden?.07:height()/1000*.82,card:cards[0]}]:[]});element.hidden=true;},
        update(matrix,time=performance.now()){
            const next=infoPanelPose(matrix,heading);if(!next)return;heading=next.anchorHeading;
            const amount=pose?1-Math.exp(-Math.min(100,Math.max(0,time-lastTime))/160):1;
            if(!pose)pose=next;else for(const key of ['x','y','z'])pose.center[key]+=(next.center[key]-pose.center[key])*amount;
            Object.assign(pose,facePanelTowardEyes(pose.center,{x:matrix[12],y:matrix[13],z:matrix[14]}));lastTime=time;
        },
        recenter(){heading=null;pose=null;},
        draw(view){
            if(!renderer || !pose || detached)return;const p=pages();page=Math.min(page,p.length-1);
            const card={id:'control',hidden,tab,height:height(),largeText,guided,controls:controls(),plant:identity?.plant || selection?.plant || 'No plant selected',scientific:identity?.scientific || (identity?'Selected plant':'Your exploration companion'),title:title(),trail:tab==='Details'?selection?.breadcrumb || 'PIM → Details':'',lines:p[page],page:(page+1)+' / '+p.length,metadata:metadata()};
            renderer.begin();renderer.draw(view,{id:'companion'},pose.center,[card],'');renderer.end();
        },hit,
        activate(ray){const target=hit(ray);if(!target)return false;const x=(target.localX/target.width+.5)*1000,y=(.5-target.localY/target.height)*(hidden?160:height());
            const button=controls().find(item=>x>=item.x && x<=item.x+item.width && y>=item.y && y<=item.y+item.height);if(button)act(button.action);return true;},
        bindSession(session,referenceSpace){removeXrControls();const handle=event=>{
            const transform=event.frame?.getPose(event.inputSource.targetRaySpace,referenceSpace)?.transform.matrix;if(!transform)return;
            const ray={origin:{x:transform[12],y:transform[13],z:transform[14]},direction:{x:-transform[8],y:-transform[9],z:-transform[10]}};
            if(hit(ray)){event.stopImmediatePropagation();if(event.type==='select')api.activate(ray);}
        };for(const type of ['selectstart','selectend','select'])session.addEventListener(type,handle,true);
            removeXrControls=()=>{for(const type of ['selectstart','selectend','select'])session.removeEventListener(type,handle,true);};},
        destroy(){removeXrControls();renderer?.destroy();renderer=null;element.remove();}
    };render();return api;
}
