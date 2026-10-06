import {spatialNote,noteWidgetPlacement} from './spatialNotes.js';
import {escapeNote as e,renderNoteWidget,interactNoteWidget,loadNoteWidgetState,saveNoteWidgetState} from './noteWidgets.js';
export function mountNoteExperience(root,marker,{onClose=()=>{}}={}) {
    const note=spatialNote(marker),states=new Map(note.widgets.map(widget=>[widget.id,loadNoteWidgetState(marker,widget)]));
    const activity={id:'main',type:'task'},saved=loadNoteWidgetState(marker,activity);
    let expanded=false,found=Boolean(saved.complete),hint=Boolean(saved.revealed),timer=null,closingTimer=null;
    const render=()=>{
        clearInterval(timer);timer=null;
        root.classList.add('creator-ar-knowledge-workspace','note-experience');root.setAttribute('role','dialog');root.setAttribute('aria-label',marker.name || 'Spatial Note');
        const layout=noteWidgetPlacement(note.widgets.length);
        root.innerHTML=`<header><small>${note.type.toUpperCase()} NOTE · KNOWLEDGE IN PLACE</small><button type="button" data-note-close>Back to AR</button></header><div class="note-spatial-board ${expanded?'is-expanded':''}"><article class="note-anchor"><h2>${e(marker.name)}</h2><p>${e(marker.description || marker.notes).replace(/\n/g,'<br>')}</p>${note.type==='dynamic'?`<button type="button" data-note-expand aria-expanded="${expanded}">${expanded?'Collapse widgets':'Open widgets'}</button>`:note.type==='interactive'?`${note.interaction.hint?'<button type="button" data-note-hint>Show hint</button>':''}${hint?`<p>${e(note.interaction.hint)}</p>`:''}<button type="button" data-note-found ${found?'disabled':''}>${found?'✓ Found':e(note.interaction.label || 'I found it')}</button>${found && note.interaction.nextTitle?`<section class="note-next-discovery"><small>NEXT DISCOVERY</small><h3>${e(note.interaction.nextTitle)}</h3><p>${e(note.interaction.nextContent)}</p></section>`:''}`:''}</article>${expanded?`<svg class="note-connectors" viewBox="-110 -95 220 190" aria-hidden="true">${layout.map(bay=>`<line x1="0" y1="0" x2="${bay.x*100}" y2="${-bay.y*100}"/>`).join('')}</svg>${note.widgets.map((widget,index)=>`<article class="note-widget" data-note-widget="${e(widget.id)}" style="--widget-x:${layout[index].x};--widget-y:${-layout[index].y};--widget-order:${index}">${renderNoteWidget(widget,states.get(widget.id))}</article>`).join('')}`:''}</div>`;
        if(expanded && note.widgets.some(item=>item.type==='timer' && states.get(item.id)?.endsAt>Date.now()))timer=setInterval(()=>{
            for(const widget of note.widgets.filter(item=>item.type==='timer')){const node=[...root.querySelectorAll('[data-note-widget]')].find(item=>item.dataset.noteWidget===widget.id);if(node)node.innerHTML=renderNoteWidget(widget,states.get(widget.id));}if(!note.widgets.some(item=>item.type==='timer' && states.get(item.id)?.endsAt>Date.now())){clearInterval(timer);timer=null;}
        },1000);
    };
    const click=event=>{
        if(event.target.closest('[data-note-close]')){onClose();return;}
        if(event.target.closest('[data-note-expand]')){if(closingTimer)return;if(expanded && !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches){root.querySelector('.note-spatial-board')?.classList.add('is-collapsing');closingTimer=setTimeout(()=>{closingTimer=null;expanded=false;render();},260);}else{expanded=!expanded;render();}return;}
        if(event.target.closest('[data-note-hint]')){hint=true;saveNoteWidgetState(marker,activity,{complete:found,revealed:hint});render();return;}
        if(event.target.closest('[data-note-found]')){found=true;saveNoteWidgetState(marker,activity,{complete:found,revealed:hint});render();return;}
        const button=event.target.closest('[data-widget-action]'),container=button?.closest('[data-note-widget]'),widget=note.widgets.find(item=>item.id===container?.dataset.noteWidget);
        if(!widget)return;const state=interactNoteWidget(widget,states.get(widget.id),button.dataset.widgetAction,Date.now(),container.querySelector('[data-widget-input]')?.value || '');states.set(widget.id,state);saveNoteWidgetState(marker,widget,state);render();
    };
    const key=event=>{if(event.key==='Escape')onClose();};
    root.addEventListener('click',click);root.addEventListener('keydown',key);render();root.querySelector('[data-note-close]')?.focus();
    return {close:onClose,destroy(){clearInterval(timer);clearTimeout(closingTimer);root.removeEventListener('click',click);root.removeEventListener('keydown',key);root.replaceChildren();}};
}
