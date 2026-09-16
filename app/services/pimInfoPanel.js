import { pimAncestors, pimKnowledgeScope } from './pimModel.js';
import { createSpatialTotemCards, hitTotemSurface } from './spatialTotemCards.js';

export const INFO_HELP = 'Select a learning cell, or hold a plant cell to read its details here. Edit information opens the selected topic. Settings adjusts text size or recenters this panel. Hide clears your view; Control panel restores it.';

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
    const center={ x: matrix[12] - right.x * .52 + right.z * .52,
        y: matrix[13] - .63, z: matrix[14] - right.z * .52 - right.x * .52 };
    return {anchorHeading:right,center,...facePanelTowardEyes(center,{x:matrix[12],y:matrix[13],z:matrix[14]})};
}

// Recover an accidentally lost reading position only when it has left the
// viewer's safe forward envelope. Selection, tab changes and re-renders keep
// the existing pose; this check is the boundary for the gentle automatic
// recovery allowed by the companion-panel contract.
export function panelPoseOutsideSafeBounds(matrix, panelPose) {
    if (!matrix || !panelPose?.center) return false;
    const forwardLength = Math.hypot(Number(matrix[8]) || 0, Number(matrix[10]) || 0) || 1;
    const rightLength = Math.hypot(Number(matrix[0]) || 0, Number(matrix[2]) || 0) || 1;
    const forward = {x:-(Number(matrix[8]) || 0) / forwardLength, z:-(Number(matrix[10]) || 0) / forwardLength};
    const right = {x:(Number(matrix[0]) || 0) / rightLength, z:(Number(matrix[2]) || 0) / rightLength};
    const dx=panelPose.center.x-(Number(matrix[12]) || 0);
    const dy=panelPose.center.y-(Number(matrix[13]) || 0);
    const dz=panelPose.center.z-(Number(matrix[14]) || 0);
    const forwardDistance=dx*forward.x+dz*forward.z;
    const lateralDistance=dx*right.x+dz*right.z;
    return forwardDistance < .16 || forwardDistance > 2.4 || Math.abs(lateralDistance) > 1.45 || Math.abs(dy) > 1.35;
}

// Shared rectangles are used by the spatial artwork and its ray hit testing.
export function controlPanelControls({hidden=false,tab='Details',selected=false,page=0,pageCount=1,height=680,largeText=false,contentKind='lim',pathwayActions=[],moduleActions=[],utilityActions=[]}={}) {
    if(hidden)return [{action:'Restore',label:'Control panel',x:30,y:36,width:940,height:70}];
    const utilities=utilityActions.slice(0,8),primary=utilities.find(item=>item.primary || item.id==='continue'),secondary=utilities.filter(item=>item!==primary);
    const secondaryRows=Math.ceil(secondary.length/2),utilityRows=secondaryRows+(primary?1:0),moduleRows=tab==='Modules'?moduleActions.length:0,actionY=height-70-(utilityRows+moduleRows)*58;
    const buttons=[{action:'Hide',label:'Hide',x:18,y:height-76,width:174,height:54}];
    ['Details','Modules','Help','Settings'].forEach((action,i)=>buttons.push({action,label:action==='Details'?(contentKind==='pim'?'Plant':'Learning'):action==='Modules'?'Learning modules':action,kind:'tab',selected:tab===action,x:18,y:148+i*76,width:174,height:62}));
    if(tab==='Details')buttons.push({action:'Previous',label:'Previous',x:238,y:actionY,width:150,height:48,disabled:page===0},{action:'Next',label:'Next',x:408,y:actionY,width:150,height:48,disabled:page>=pageCount-1},{action:'Edit',label:'Edit information',x:648,y:actionY,width:322,height:48,disabled:!selected});
    if(tab==='Settings')buttons.push({action:'TextSize',label:largeText?'Standard text':'Larger text',x:238,y:actionY,width:350,height:48},{action:'Recenter',label:'Recenter panel',x:608,y:actionY,width:362,height:48});
    pathwayActions.slice(0,3).forEach((item,index)=>buttons.push({action:item.action,label:item.label,kind:'pathway',primary:Boolean(item.primary),disabled:Boolean(item.disabled),x:238+index*244,y:actionY-62,width:226,height:48}));
    if(tab==='Modules')moduleActions.forEach((item,index)=>buttons.push({action:'Module:'+item.id,label:item.label,kind:'module',primary:Boolean(item.primary),disabled:Boolean(item.disabled),x:238,y:actionY+index*58,width:732,height:48}));
    secondary.forEach((item,index)=>buttons.push({action:'Utility:'+item.id,label:item.label,kind:'utility',disabled:Boolean(item.disabled),x:index%2?608:238,y:height-70-(primary?1:0)*58-(secondaryRows-1-Math.floor(index/2))*58,width:index%2?362:350,height:48}));
    if(primary)buttons.push({action:'Utility:'+primary.id,label:primary.label,kind:'utility',primary:true,disabled:Boolean(primary.disabled),x:238,y:height-70,width:732,height:48});
    return buttons;
}
export function controlPanelHeight(lines,largeText=false,pathway=false,utilities=0,moduleCount=0){
    const items=Array.isArray(utilities)?utilities.slice(0,8):[],count=items.length || Math.min(8,Number(utilities)||0);
    const hasPrimary=items.some(item=>item.primary || item.id==='continue');
    const rows=Math.ceil((count-(hasPrimary?1:0))/2)+(hasPrimary?1:0);
    return Math.max(pathway?760:560,390+Math.min(7,lines)*(largeText?46:38)+(pathway?120:0))+(rows+moduleCount)*58;
}

let panelInstance=0;
export function createPimInfoPanel({ root, onEdit = () => {}, onPathwayAction = () => {}, onModuleAction = () => {}, onUtilityAction = () => {} } = {}) {
    let selection=null,record=null,identity=null,page=0,hidden=false,tab='Details',largeText=false;
    let renderer=null,pose=null,heading=null,lastTime=0,detached=false,guided=false,pathwayContext=null,moduleContext=null,utilityActions=[];
    let removeXrControls=()=>{};
    const element=document.createElement('aside'),contentId='control-panel-content-'+(++panelInstance);
    element.className='nlxr-info-panel';element.setAttribute('aria-label','Control panel');root?.append(element);
    const text=()=>tab==='Modules'?(moduleContext?.body || 'Choose a short learning module. It will guide you through a few cells and return you to the demo when you end learning.') : tab==='Help'?INFO_HELP:tab==='Settings'
        ? 'Make this panel comfortable to read. Choose a larger text size, or recenter it to the left of your current view. Your plant selection stays in place.'
        : selection?[selection.body,selection.safety && 'Safety: '+selection.safety,selection.sources.length && 'Sources: '+selection.sources.join('; ')].filter(Boolean).join('\n\n')
        : identity?'Explore the honeycomb around '+identity.plant+'. Hold a cell to read its details here.'
        :'This is your Control panel. It stays nearby to help you read selected topics, follow the tutorial and adjust the experience.';
    const pages=()=>infoPages(text(),largeText?32:38,pathwayContext?4:7);
    const title=()=>tab==='Modules'?(moduleContext?.title || 'Learning modules'):tab==='Help'?'Explore at your own pace':tab==='Settings'?'Reading comfort':selection?.title || (identity?'Choose a topic':'Ready to explore');
    const metadata=()=>selection && tab==='Details'?[selection.scope==='specimen'?'Local observation':selection.scope==='species'?'Species knowledge':'',selection.status==='draft'?'Draft':'',selection.evidence==='needs_review'?'Awaiting review':''].filter(Boolean).join(' · '):'';
    const height=()=>controlPanelHeight(pages()[page]?.length || 0,largeText,Boolean(pathwayContext),utilityActions,tab==='Modules'?(moduleContext?.actions?.length||0):0);
    const contentKind=()=>selection?.mesh==='lim' || (!selection && !identity) ? 'lim' : 'pim';
    const controls=()=>controlPanelControls({hidden,tab,selected:Boolean(selection && selection.editable!==false),page,pageCount:pages().length,height:height(),largeText,contentKind:contentKind(),pathwayActions:pathwayContext?.actions || [],moduleActions:moduleContext?.actions || [],utilityActions});
    function act(action){
        const button=controls().find(item=>item.action===action);if(button?.disabled)return;
        if(action==='Restore')hidden=false;
        if(action==='Hide')hidden=true;
        if(['Details','Modules','Help','Settings'].includes(action)){tab=action;page=0;}
        if(action==='Previous')page=Math.max(0,page-1);
        if(action==='Next')page=Math.min(pages().length-1,page+1);
        if(action==='Edit' && selection && selection.editable!==false)onEdit(record,selection.path || selection.id);
        if(action==='TextSize'){largeText=!largeText;page=0;}
        if(action==='Recenter'){heading=null;pose=null;lastTime=0;}
        if(action.startsWith('Path')){onPathwayAction(action);return;}
        if(action.startsWith('Module:')){onModuleAction(action.slice(7));return;}
        if(action.startsWith('Utility:')){onUtilityAction(action.slice(8));return;}
        render();
    }
    function makeButton(item){
        const button=document.createElement('button');button.type='button';button.textContent=item.label;button.dataset.infoAction=item.action;button.disabled=Boolean(item.disabled);
        button.dataset.controlKind=item.kind || 'action';button.classList.toggle('is-primary-action',Boolean(item.primary) || ['Next','PathNext'].includes(item.action));
        button.setAttribute('aria-label',item.action==='Restore'?'Restore Control panel':item.label);
        if(item.kind==='tab'){button.setAttribute('role','tab');button.setAttribute('aria-selected',String(item.selected));button.setAttribute('aria-controls',contentId);button.id=contentId+'-'+item.action;button.tabIndex=item.selected?0:-1;}
        button.addEventListener('click',event=>{event.stopPropagation();act(item.action);});return button;
    }
    function render(){
        if(detached)return;
        const focused=element.contains(document.activeElement)?document.activeElement?.dataset.infoAction:null;
        element.replaceChildren();element.classList.toggle('is-hidden',hidden);element.classList.toggle('is-large-text',largeText);
        element.dataset.contentKind=contentKind();
        element.dataset.primaryFaceId=contentKind()==='lim' ? (selection?.primaryFaceId || '') : '';
        element.dataset.relatedFaceIds=contentKind()==='lim' ? (selection?.relatedFaceIds || []).join(',') : '';
        element.dataset.pathwayMode=pathwayContext?.mode || '';
        element.style.setProperty('--lim-accent',selection?.mesh==='lim' ? (selection.accent || '#719b62') : 'transparent');
        if(hidden)element.append(makeButton(controls()[0]));
        else{
            const header=document.createElement('header');header.className='nlxr-control-header';
            const label=document.createElement('small');label.textContent='CONTROL PANEL';
            const plant=document.createElement('h2');plant.textContent=identity?.plant || selection?.plant || 'Control panel';
            const scientific=document.createElement('p');scientific.className='nlxr-control-identity';scientific.textContent=identity?.scientific || (identity?'Selected plant':'Your exploration guide');
            header.append(label,plant,scientific);element.append(header);
            const tabs=document.createElement('nav');tabs.className='nlxr-control-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-orientation','vertical');tabs.setAttribute('aria-label','Control panel sections');
            controls().filter(item=>item.kind==='tab').forEach(item=>tabs.append(makeButton(item)));tabs.append(makeButton(controls()[0]));element.append(tabs);
            if(pathwayContext){
                const pathway=document.createElement('section');pathway.className='nlxr-pathway-context';pathway.setAttribute('aria-live','polite');
                const heading=document.createElement('div');heading.className='nlxr-pathway-heading';
                const name=document.createElement('strong');name.textContent=pathwayContext.title || 'Learning Paths';heading.append(name);
                if(pathwayContext.preview){const badge=document.createElement('small');badge.textContent='Preview';heading.append(badge);}
                const progress=document.createElement('span');progress.textContent=pathwayContext.progress || '';
                const explanation=document.createElement('p');explanation.textContent=pathwayContext.explanation || '';
                const actions=document.createElement('nav');actions.setAttribute('aria-label','Learning Path actions');
                controls().filter(item=>item.kind==='pathway').forEach(item=>actions.append(makeButton(item)));
                pathway.append(heading,progress,explanation,actions);element.append(pathway);
            }
            const content=document.createElement('section');content.id=contentId;content.setAttribute('role','tabpanel');content.setAttribute('aria-labelledby',contentId+'-'+tab);content.tabIndex=0;
            const heading=document.createElement('h3');heading.textContent=title();
            const trail=document.createElement('p');trail.className='nlxr-info-trail';trail.textContent=tab==='Details'?selection?.breadcrumb || 'Explore → Details':'';
            const body=document.createElement('p');body.className='nlxr-info-body';body.textContent=pages()[page].join('\n');
            const status=document.createElement('small');status.textContent=metadata();content.append(heading,trail,body,status);element.append(content);
            const nav=document.createElement('nav');nav.className='nlxr-control-actions';nav.setAttribute('aria-label','Control panel actions');
            controls().filter(item=>(!item.kind || item.kind==='module') && item.action!=='Hide' && !item.disabled).forEach(item=>nav.append(makeButton(item)));element.append(nav);
            if(utilityActions.length){const utilities=document.createElement('nav');utilities.className='nlxr-control-utilities';utilities.setAttribute('aria-label','Experience controls');controls().filter(item=>item.kind==='utility').forEach(item=>utilities.append(makeButton(item)));element.append(utilities);}
            if(tab==='Details'){const count=document.createElement('small');count.className='nlxr-control-page';count.textContent=(page+1)+' / '+pages().length;element.append(count);}
        }
        if(focused)(element.querySelector('[data-info-action="'+focused+'"]') || element.querySelector('button'))?.focus({preventScroll:true});
    }
    element.addEventListener('keydown',event=>{
        if(event.target.getAttribute('role')!=='tab' || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
        event.preventDefault();const tabs=['Details','Modules','Help','Settings'],index=tabs.indexOf(tab);
        act(event.key==='Home'?'Details':event.key==='End'?'Settings':tabs[(index+(['ArrowRight','ArrowDown'].includes(event.key)?1:tabs.length-1))%tabs.length]);
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
            const contentTop=card.pathway?292:187,titleX=card.accent?258:238,titleWidth=card.accent?712:732;
            if(card.pathway){
                ctx.fillStyle='#aaccc1';ctx.font='600 22px system-ui';ctx.fillText(card.pathway.title+(card.pathway.preview?' · PREVIEW':''),238,178,560);
                ctx.fillStyle='#b7c5c9';ctx.font='500 19px system-ui';ctx.fillText(card.pathway.progress,790,180,180);ctx.font='400 19px system-ui';
                infoPages(card.pathway.explanation,72,2)[0].forEach((line,index)=>ctx.fillText(line,238,218+index*24,732));
            }
            if(card.accent){ctx.fillStyle=card.accent;ctx.globalAlpha=.92;ctx.fillRect(238,contentTop-7,7,42);ctx.globalAlpha=1;}
            ctx.fillStyle='#f1f4f4';ctx.font='600 32px system-ui';ctx.fillText(card.title,titleX,contentTop,titleWidth);
            ctx.fillStyle='#b4c3c7';ctx.font='400 20px system-ui';ctx.fillText(card.trail,238,contentTop+45,732);
            ctx.fillStyle='#f1f4f4';ctx.font=(card.largeText?'400 40px':'400 34px')+' system-ui';card.lines.forEach((line,i)=>ctx.fillText(line,238,contentTop+93+i*(card.largeText?46:38),732));
            const footerY=card.pathway?card.height-218:card.height-106;
            ctx.fillStyle='#b4c3c7';ctx.font='400 20px system-ui';ctx.fillText(card.metadata,238,footerY,600);
            if(card.tab==='Details')ctx.fillText(card.page,882,footerY,88);
        }
        card.controls.forEach(button=>{
            ctx.fillStyle=button.primary?'rgba(190,222,164,.88)':button.selected?'rgba(159,187,184,.30)':button.disabled?'rgba(211,220,225,.04)':'rgba(211,220,225,.12)';ctx.beginPath();ctx.roundRect(button.x,button.y,button.width,button.height,button.kind==='tab'?7:3);ctx.fill();
            if(button.selected){ctx.fillStyle='#aaccc1';ctx.fillRect(button.x,button.y+9,3,button.height-18);}
            ctx.fillStyle=button.disabled?'#899297':button.primary?'#15261c':'#f1f4f4';ctx.font=(button.primary?'700 ':'500 ')+'25px system-ui';ctx.textAlign='center';ctx.fillText(button.label,button.x+button.width/2,button.y+(button.height-30)/2,button.width-16);
        });return c;
    }
    function hit(ray){if(!pose || !renderer || detached)return null;return hitTotemSurface(ray,[{...pose,width:hidden?.30:.82,height:hidden?.07:height()/1000*.82}]);}
    const api={element,
        showLearning(content){record=null;identity=null;selection={...content,sources:[],editable:false,mesh:content?.mesh || 'lim'};tab=moduleContext?'Modules':'Details';hidden=false;page=0;render();},
        setLearningModules(value,{open=false}={}){moduleContext=value?{...value,actions:[...(value.actions||[])]}:null;if(open && moduleContext)tab='Modules';else if(!moduleContext && tab==='Modules')tab='Details';page=0;render();},
        setUtilityActions(items=[]){utilityActions=items.slice(0,8).map(item=>({...item}));render();},
        recenter(){heading=null;pose=null;lastTime=0;render();},
        setPathwayContext(value){pathwayContext=value ? {...value,actions:[...(value.actions || [])]} : null;render();},
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
            if(panelPoseOutsideSafeBounds(matrix,pose)){heading=null;pose=null;lastTime=0;}
            const next=infoPanelPose(matrix,heading);if(!next)return;heading=next.anchorHeading;
            const amount=pose?1-Math.exp(-Math.min(100,Math.max(0,time-lastTime))/160):1;
            if(!pose)pose=next;else for(const key of ['x','y','z'])pose.center[key]+=(next.center[key]-pose.center[key])*amount;
            Object.assign(pose,facePanelTowardEyes(pose.center,{x:matrix[12],y:matrix[13],z:matrix[14]}));lastTime=time;
        },
        recenter(){heading=null;pose=null;lastTime=0;},
        getPosition(){return pose?.center ? {...pose.center} : null;},
        draw(view){
            if(!renderer || !pose || detached)return;const p=pages();page=Math.min(page,p.length-1);
            const card={id:'control',hidden,tab,height:height(),largeText,guided,controls:controls(),pathway:pathwayContext,accent:selection?.mesh==='lim'?selection.accent:'',plant:identity?.plant || selection?.plant || 'Control panel',scientific:identity?.scientific || (identity?'Selected plant':'Your exploration guide'),title:title(),trail:tab==='Details'?selection?.breadcrumb || 'Explore → Details':'',lines:p[page],page:(page+1)+' / '+p.length,metadata:metadata()};
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
