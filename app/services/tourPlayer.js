import {TOUR_TEMPLATES,tourRefKey,safeTourAudio} from './tourModel.js';
import {escapeWorkspaceHtml as html} from './creatorWorkspaceFrame.js';
import {dashboardIcon} from './workspaceIcons.js';

export function mountTourPlayer(root,{tour,records,revision='preview',preview=false,onClose=()=>{},onRead=null}={}){
    const storageKey=`nlxr.tour-progress.v1.${tour.projectId}.${tour.id}.${revision}`,abort=new AbortController();let index=0,paused=false,complete=false;
    let progress={index:0,answers:{}};try{if(!preview){const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved&&Number.isInteger(saved.index)&&saved.index>=0&&saved.index<tour.stops.length)progress={index:saved.index,answers:saved.answers&&typeof saved.answers==='object'?saved.answers:{},complete:Boolean(saved.complete)};}}catch{}
    index=progress.index;complete=Boolean(progress.complete);
    const save=()=>{progress.index=index;progress.complete=complete;try{if(!preview)localStorage.setItem(storageKey,JSON.stringify(progress));}catch{}};
    const stopAudio=()=>root.querySelector('audio')?.pause();
    function render(){
        stopAudio();const stop=tour.stops[index];
        if(!stop){root.innerHTML='<p>No stops yet. Add a stop before previewing.</p><button type="button" data-player-close>Back to tour</button>';return;}
        const targets=stop.targets.map(ref=>records.find(record=>tourRefKey(record.ref)===tourRefKey(ref))),primary=targets[0];
        root.innerHTML=`<article class="tour-player"><header><div><p class="studio-eyebrow">${preview?'Creator preview · draft':'Guided tour'} · ${html(tour.title)}</p><p role="status">${complete?'Complete':`Stop ${index+1} of ${tour.stops.length}`}${paused?' · Paused':''}</p></div><button class="tour-icon" type="button" data-player-close aria-label="Close tour" title="Close tour">${dashboardIcon('close')}</button></header>
        ${complete?`<h2>You completed the tour.</h2><p>${html(tour.description)}</p><button type="button" data-restart>Start again</button>`:paused?'<h2>Tour paused</h2><button type="button" data-pause>Resume tour</button>':`
        <p class="studio-eyebrow">${html(TOUR_TEMPLATES[stop.template].label)}${stop.optional?' · Optional stop':''}</p><h2 tabindex="-1" data-player-heading>${html(stop.title||primary?.title||'Stop feature unavailable')}</h2>
        <p class="tour-directions"><strong>${index?'Find this stop':'Start here'}</strong> ${html(stop.directions||'Directions have not been added.')}</p>
        <div class="tour-features">${targets.map(record=>record?`<section><strong>${html(record.title)}</strong><small>${html(record.areaName)}</small>${record.description?`<p>${html(record.description)}</p>`:''}${onRead&&record.type==='plant'?`<button type="button" data-read-feature="${html(tourRefKey(record.ref))}">Read plant information</button>`:''}</section>`:'<p role="alert">This feature is unavailable. Ask the tour host for help.</p>').join('')}</div>
        <p class="tour-instructions">${html(stop.instructions)}</p>${stop.question?`<p><strong>${html(stop.question)}</strong></p>`:''}
        ${stop.template==='listen'&&safeTourAudio(stop.audioUrl)?`<audio controls preload="none" aria-label="Stop audio" src="${html(safeTourAudio(stop.audioUrl))}"></audio><p data-audio-status role="status"></p>`:''}
        ${['record','investigate','compare'].includes(stop.template)?`<label>Your observation<textarea data-answer rows="4" maxlength="4000">${html(progress.answers[stop.id]||'')}</textarea></label><small>${preview?'Practice response; cleared when you close preview.':'Saved on this device only. It is not submitted to an educator.'}</small>`:''}
        ${preview&&stop.facilitatorNotes?`<details><summary>Facilitator notes · creator only</summary><p>${html(stop.facilitatorNotes)}</p></details>`:''}
        <nav class="tour-player-actions"><button type="button" class="tour-icon" data-previous aria-label="Previous stop" title="Previous stop"${index===0?' disabled':''}>←</button><button type="button" data-next>${index===tour.stops.length-1?'Finish tour':'Continue'}</button>${stop.optional?'<button type="button" data-next>Skip optional stop</button>':''}<button class="tour-icon" type="button" data-pause aria-label="Pause tour" title="Pause tour">Ⅱ</button></nav>`}
        <footer>${preview?'Preview uses current site records. Nothing is published.':'Progress is saved on this device.'} Directions are written by the creator; this view does not track your location.</footer></article>`;
        root.querySelector('audio')?.addEventListener('error',()=>{root.querySelector('[data-audio-status]').textContent='Audio is unavailable. Continue with the written instructions.';},{once:true});
    }
    root.addEventListener('input',event=>{if(event.target.matches('[data-answer]')){progress.answers[tour.stops[index].id]=event.target.value;save();}},{signal:abort.signal});
    root.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;
        if(button.hasAttribute('data-player-close')){stopAudio();onClose();return;}
        if(button.dataset.readFeature){const record=records.find(r=>tourRefKey(r.ref)===button.dataset.readFeature);if(record)onRead?.(record);return;}
        if(button.hasAttribute('data-pause'))paused=!paused;
        if(button.hasAttribute('data-previous'))index=Math.max(0,index-1);
        if(button.hasAttribute('data-next')){if(index===tour.stops.length-1)complete=true;else index++;}
        if(button.hasAttribute('data-restart')){index=0;complete=false;progress.answers={};}
        save();render();root.querySelector('[data-player-heading]')?.focus();
    },{signal:abort.signal});render();
    return {destroy(){stopAudio();abort.abort();}};
}
