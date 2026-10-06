import {spatialNote} from './spatialNotes.js';
import {translateApp} from './i18n.js';
import {createNoteWidget,renderNoteWidget,interactNoteWidget,escapeNote as e,WIDGET_LIMIT} from './noteWidgets.js';

// Deliberately a showcase, not the creator's authoring form or keyboard.
export const DEMO_NOTE_WIDGETS=Object.freeze([
    {type:'thick-box',label:'Information',title:'Garden instructions',content:'Keep mulch clear of stems. Water gently at the roots.'},
    {type:'timer',label:'Timer',title:'Watering timer',configuration:{seconds:120}},
    {type:'checklist',label:'Checklist',title:'Garden check',content:'Check soil moisture\nWater at the roots\nReplace mulch'}
]);
export function demoNoteWidgetPlacement(count){
    // The demo's Control panel docks left. Grow the first arm to the right.
    const bays=[{x:.98,y:0},{x:0,y:.46},{x:0,y:-.46},{x:-.98,y:0},{x:.98,y:-.46}];
    return bays.slice(0,count).map((bay,index)=>({...bay,index,width:.86,height:.336}));
}
export function mountDemoNoteShowcase(root,record,{onChange=()=>{},onClose=()=>{}}={}){
    let editing=false,arm=false,expanded=true,destroyed=false,timer=null;
    const original=record.demoNoteOriginalText ??= record.description || record.notes || '';
    const states=new Map();
    function render(){
        if(destroyed)return;clearInterval(timer);timer=null;
        const note=spatialNote(record),widgets=expanded?note.widgets:[],bays=demoNoteWidgetPlacement(widgets.length+(arm?1:0));
        root.className='creator-ar-knowledge-workspace note-experience demo-note-showcase';
        root.innerHTML=`<header><small>NOTE · DEMO SHOWCASE</small><button type="button" data-note-close>Done</button></header><div class="note-spatial-board is-expanded"><article class="note-anchor"><h2>${e(record.name)}</h2><p>${e(record.description || record.notes).replace(/\n/g,'<br>')}</p>${editing?'<small>Sample editing preview · full authoring comes later.</small><button type="button" data-demo-note="sample">Try sample edit</button><button type="button" data-demo-note="reset">Reset text</button><button type="button" data-demo-note="done-edit">Done editing</button>':'<button type="button" data-demo-note="edit">✎ Edit preview</button><button type="button" data-demo-note="add">+ Add widget</button>'}</article><svg class="note-connectors" viewBox="-110 -95 220 190" aria-hidden="true">${bays.map(bay=>`<line x1="0" y1="0" x2="${bay.x*100}" y2="${-bay.y*100}"/>`).join('')}</svg>${widgets.map((widget,i)=>`<article class="note-widget" data-note-widget="${e(widget.id)}" style="--widget-x:${bays[i].x};--widget-y:${-bays[i].y}">${renderNoteWidget(widget,states.get(widget.id))}</article>`).join('')}${arm?`<article class="note-widget note-widget-picker" data-note-widget="demo-add-arm" style="--widget-x:${bays.at(-1).x};--widget-y:${-bays.at(-1).y}"><h3>Add a widget</h3><p>Choose what belongs on this connected arm.</p>${DEMO_NOTE_WIDGETS.map(item=>`<button type="button" data-demo-note="widget:${item.type}">${item.label}</button>`).join('')}<button type="button" data-demo-note="cancel-arm">Cancel</button></article>`:''}</div>`;
        if(root.querySelectorAll)translateApp(root);
        if(widgets.some(widget=>widget.type==='timer' && states.get(widget.id)?.endsAt>Date.now()))timer=setInterval(render,1000);
    }
    function action(id){
        if(destroyed)return;
        const note=spatialNote(record);
        if(id==='edit')editing=true;
        else if(id==='done-edit')editing=false;
        else if(id==='sample' || id==='reset'){
            record.description=record.notes=id==='reset'?original:'A small observation becomes useful knowledge: check moisture, water at the roots and return to this place.';
            onChange(record);
        }else if(id==='add'){if(note.widgets.length>=WIDGET_LIMIT)return;arm=true;expanded=true;}
        else if(id==='cancel-arm')arm=false;
        else if(id==='toggle'){expanded=!expanded;arm=false;}
        else if(id.startsWith('widget:') && arm && note.widgets.length<WIDGET_LIMIT){
            const sample=DEMO_NOTE_WIDGETS.find(item=>item.type===id.slice(7));if(!sample)return;
            record.appearance={...record.appearance,spatial_note:{...note,type:'dynamic',widgets:[...note.widgets,createNoteWidget(sample.type,sample)]}};
            arm=false;onChange(record);
        }
        render();
    }
    function click(event){
        if(event.target.closest('[data-note-close]')){onClose();return;}
        const demo=event.target.closest('[data-demo-note]');if(demo){action(demo.dataset.demoNote);return;}
        const button=event.target.closest('[data-widget-action]'),container=button?.closest('[data-note-widget]'),widget=spatialNote(record).widgets.find(item=>item.id===container?.dataset.noteWidget);
        if(widget){states.set(widget.id,interactNoteWidget(widget,states.get(widget.id),button.dataset.widgetAction));render();}
    }
    root.addEventListener('click',click);render();
    return {action,close:onClose,destroy(){destroyed=true;clearInterval(timer);root.removeEventListener('click',click);root.replaceChildren();}};
}
