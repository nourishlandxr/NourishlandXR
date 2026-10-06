import {spatialNote} from './spatialNotes.js';
import {translateApp} from './i18n.js';
import {createNoteWidget,renderNoteWidget,interactNoteWidget,escapeNote as e,WIDGET_LIMIT} from './noteWidgets.js';

export const DEMO_NOTE_WIDGETS=Object.freeze([
    {type:'timer',label:'Timer',title:'Return for an action',configuration:{seconds:864000,actionTag:true,action:'Fruit harvest'}},
    {type:'checklist',label:'Checkbox',title:'Field observations',content:'Flowering\nChecked for pests\nFruit collected'},
    {type:'thick-box',label:'Extra panel',title:'Garden observations',content:'Flowering observed.\nChecked for pests.\nFruit collected.'},
    {type:'image',label:'Photo',title:'Reference photo',configuration:{url:new URL('../assets/pigeon-pea-cajanus-cajan.png',import.meta.url).href,caption:'Pigeon Pea · example reference photo'}}
]);
export function demoNoteWidgetPlacement(count){
    const bays=[{x:.98,y:0},{x:0,y:.46},{x:0,y:-.46},{x:-.98,y:0},{x:.98,y:-.46}];
    return bays.slice(0,count).map((bay,index)=>({...bay,index,width:.86,height:.336}));
}
export function mountDemoNoteShowcase(root,record,{onChange=()=>{},onClose=()=>{}}={}){
    let arm=null,destroyed=false,timer=null;
    const states=new Map(Object.entries(record.demoNoteWidgetStates || {}));
    function render(){
        if(destroyed)return;clearInterval(timer);timer=null;
        const widgets=spatialNote(record).widgets,bays=demoNoteWidgetPlacement(widgets.length+(arm?1:0));
        root.classList?.add('note-experience','demo-note-showcase');
        const cards=widgets.map(widget=>({id:widget.id,html:renderNoteWidget(widget,states.get(widget.id))}));
        if(arm)cards.push({id:arm,html:`<h3>Add a widget</h3>${DEMO_NOTE_WIDGETS.map(item=>`<button type="button" data-demo-note="widget:${item.type}">${item.label}</button>`).join('')}`});
        root.innerHTML=`<div class="note-spatial-board is-expanded"><article class="note-anchor"><h2>${e(record.name)}</h2><p>${e(record.description || record.notes).replace(/\n/g,'<br>')}</p></article><svg class="note-connectors" viewBox="-110 -95 220 190" aria-hidden="true">${bays.map(bay=>`<line x1="0" y1="0" x2="${bay.x*100}" y2="${-bay.y*100}"/>`).join('')}</svg>${cards.map((card,i)=>`<article class="note-widget note-widget-compact${card.id===arm?' note-widget-picker':''}" data-note-widget="${e(card.id)}" style="--widget-x:${bays[i].x};--widget-y:${-bays[i].y}">${card.html}</article>`).join('')}</div>`;
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
        if(id==='add'){
            if(arm || note.widgets.length>=WIDGET_LIMIT)return;
            arm=createNoteWidget('timer').id;
        }else if(id.startsWith('widget:') && arm){
            const sample=DEMO_NOTE_WIDGETS.find(item=>item.type===id.slice(7));if(!sample)return;
            record.appearance={...record.appearance,spatial_note:{...note,type:'dynamic',widgets:[...note.widgets,createNoteWidget(sample.type,{...sample,id:arm})]}};
            arm=null;onChange(record);
        }else return;
        render();
    }
    function click(event){
        const demo=event.target.closest('[data-demo-note]');if(demo){action(demo.dataset.demoNote);return;}
        const button=event.target.closest('[data-widget-action]'),container=button?.closest('[data-note-widget]'),widget=spatialNote(record).widgets.find(item=>item.id===container?.dataset.noteWidget);
        if(widget){states.set(widget.id,interactNoteWidget(widget,states.get(widget.id),button.dataset.widgetAction));record.demoNoteWidgetStates=Object.fromEntries(states);render();}
    }
    root.addEventListener('click',click);render();
    return {action,close:onClose,destroy(){destroyed=true;clearInterval(timer);root.removeEventListener('click',click);root.replaceChildren();}};
}
