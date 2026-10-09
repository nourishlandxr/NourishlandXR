import {spatialNote} from './spatialNotes.js';
import {translateApp} from './i18n.js';
import {createNoteWidget,renderNoteWidget,interactNoteWidget,escapeNote as e,WIDGET_LIMIT} from './noteWidgets.js';

export const DEMO_NOTE_WIDGETS=Object.freeze([
    {type:'timer',label:'Timer',title:'Return for an action',configuration:{seconds:864000,actionTag:true,action:'Fruit harvest'}},
    {type:'checklist',label:'Checkbox',title:'Field observations',content:'Flowering\nChecked for pests\nFruit collected'},
    {type:'thick-box',label:'Extra panel',title:'Garden observations',content:'Flowering observed.\nChecked for pests.\nFruit collected.'},
    {type:'image',label:'Photo',title:'Choose a LIMO image'}
]);
export const DEMO_NOTE_PHOTOS=Object.freeze([
 {id:'eye',label:'Eye · observe',image:new URL('../assets/limo-cell-art/lim-intro-analysis.png',import.meta.url).href},
 {id:'learning',label:'Learning · discover',image:new URL('../assets/limo-cell-art/lim-intro-literacy.png',import.meta.url).href},
 {id:'vision',label:'Vision · imagine',image:new URL('../assets/limo-cell-art/lim-intro-vision.png',import.meta.url).href}
]);
export function demoNoteWidgetPlacement(count){
    const bays=[{x:.98,y:0},{x:0,y:.46},{x:0,y:-.46},{x:-.98,y:0},{x:.98,y:-.46}];
    return bays.slice(0,count).map((bay,index)=>({...bay,index,width:.86,height:.336}));
}
export function mountDemoNoteShowcase(root,record,{onChange=()=>{},onSelect=()=>{},onClose=()=>{}}={}){
    let arm=null,photoPicker=false,destroyed=false,timer=null;
    const states=new Map(Object.entries(record.demoNoteWidgetStates || {}));
    function render(){
        if(destroyed)return;clearInterval(timer);timer=null;
        const widgets=spatialNote(record).widgets,bays=demoNoteWidgetPlacement(widgets.length+(arm?1:0));
        root.classList?.add('note-experience','demo-note-showcase');
        root.classList?.toggle('is-note-put-away',Boolean(record.demoNoteCollapsed));
        if(record.demoNoteCollapsed){root.innerHTML=`<div class="note-spatial-board"><article class="note-anchor is-note-collapsed"><button type="button" data-demo-note="reopen" aria-label="Reopen ${e(record.name)}">✦</button></article></div>`;return;}
        const cards=widgets.map(widget=>({id:widget.id,html:renderNoteWidget(widget,states.get(widget.id))}));
        if(arm && photoPicker)cards.push({id:arm,html:`<h3>Choose an image</h3><div class="demo-note-photo-options">${DEMO_NOTE_PHOTOS.map(item=>`<button type="button" data-demo-note="photo:${item.id}"><img src="${e(item.image)}" alt="${e(item.label)}"><span>${e(item.label)}</span></button>`).join('')}</div>`});
        else if(arm)cards.push({id:arm,html:`<h3>Add a widget</h3>${DEMO_NOTE_WIDGETS.map(item=>`<button type="button" data-demo-note="widget:${item.type}">${item.label}</button>`).join('')}`});
        root.innerHTML=`<div class="note-spatial-board is-expanded"><article class="note-anchor"><h2>${e(record.name)}</h2><p>${e(record.description || record.notes).replace(/\n/g,'<br>')}</p><button type="button" class="note-minimize" data-demo-note="collapse" aria-label="Minimize Note" title="Minimize Note">▁</button></article><svg class="note-connectors" viewBox="-110 -95 220 190" aria-hidden="true">${bays.map(bay=>`<line x1="0" y1="0" x2="${bay.x*100}" y2="${-bay.y*100}"/>`).join('')}</svg>${cards.map((card,i)=>`<article class="note-widget note-widget-compact${card.id===arm?' note-widget-picker':''}" data-note-widget="${e(card.id)}" style="--widget-x:${bays[i].x};--widget-y:${-bays[i].y}">${card.html}</article>`).join('')}</div>`;
        if(root.querySelectorAll)translateApp(root);
        if(widgets.some(widget=>widget.type==='timer' && states.get(widget.id)?.endsAt>Date.now())){
            const renderedDay=new Date().toDateString();
            // Action dates change by day; keep their cards steady between actions.
            timer=setInterval(()=>{if(new Date().toDateString()!==renderedDay || widgets.some(widget=>widget.type==='timer' && !widget.configuration?.actionTag && states.get(widget.id)?.endsAt>Date.now()))render();},1000);
        }
    }
    function action(id){
        if(destroyed)return;
        const note=spatialNote(record);
        if(id==='collapse' || id==='reopen'){
            record.demoNoteCollapsed=id==='collapse';render();onChange(record);return;
        }else if(id==='add'){
            record.demoNoteCollapsed=false;
            if(arm || note.widgets.length>=WIDGET_LIMIT)return;
            arm=createNoteWidget('timer').id;
        }else if(id.startsWith('delete:')){
            const widgetId=id.slice(7);if(widgetId===arm){arm=null;photoPicker=false;}
            record.appearance={...record.appearance,spatial_note:{...note,widgets:note.widgets.filter(widget=>widget.id!==widgetId)}};
            states.delete(widgetId);record.demoNoteWidgetStates=Object.fromEntries(states);delete record.demoNoteWidgetPositions?.[widgetId];onChange(record);
        }else if(id.startsWith('photo:') && arm){
            const sample=DEMO_NOTE_PHOTOS.find(item=>item.id===id.slice(6));if(!sample)return;record.appearance={...record.appearance,spatial_note:{...note,type:'dynamic',widgets:[...note.widgets,createNoteWidget('image',{id:arm,title:sample.label,configuration:{url:sample.image,caption:sample.label}})]}};arm=null;photoPicker=false;onChange(record);
        }else if(id.startsWith('widget:') && arm){
            if(id==='widget:image'){photoPicker=true;render();return;}
            const sample=DEMO_NOTE_WIDGETS.find(item=>item.type===id.slice(7));if(!sample)return;
            record.appearance={...record.appearance,spatial_note:{...note,type:'dynamic',widgets:[...note.widgets,createNoteWidget(sample.type,{...sample,id:arm})]}};
            arm=null;onChange(record);
        }else return;
        render();
    }
    function click(event){
        onSelect(record,event.target.closest('[data-note-widget]')?.dataset.noteWidget || 'main');
        const demo=event.target.closest('[data-demo-note]');if(demo){action(demo.dataset.demoNote);return;}
        const button=event.target.closest('[data-widget-action]'),container=button?.closest('[data-note-widget]'),widget=spatialNote(record).widgets.find(item=>item.id===container?.dataset.noteWidget);
        if(widget){states.set(widget.id,interactNoteWidget(widget,states.get(widget.id),button.dataset.widgetAction));record.demoNoteWidgetStates=Object.fromEntries(states);render();}
    }
    root.addEventListener('click',click);render();
    return {action,close:onClose,destroy(){destroyed=true;clearInterval(timer);root.removeEventListener('click',click);root.replaceChildren();}};
}
