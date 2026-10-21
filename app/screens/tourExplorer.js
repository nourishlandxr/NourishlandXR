import {tourRequest} from '../services/tourApi.js';
import {mountTourPlayer} from '../services/tourPlayer.js';
import {escapeWorkspaceHtml as html} from '../services/creatorWorkspaceFrame.js';
import {BUILD_INFO} from '../services/buildInfo.js';

export async function renderTourExplorer(app,projectId,tourId=''){
    const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';stylesheet.href=new URL(`../creator-studio.css?v=${BUILD_INFO.version}`,import.meta.url);if(!document.querySelector('link[data-tour-styles]')){stylesheet.dataset.tourStyles='';document.head.append(stylesheet);}
    const listUrl=new URL(location.href);listUrl.search='';listUrl.searchParams.set('tour','1');listUrl.searchParams.set('project',projectId);
    app.innerHTML='<main class="tour-public-page"><p role="status">Opening guided tours…</p></main>';const host=app.firstElementChild;
    try{
        if(tourId&&tourId!=='1'){
            const payload=await tourRequest(projectId,{id:tourId,visitor:true});if(!host.isConnected)return;
            const player=mountTourPlayer(host,{...payload,preview:false,onClose:()=>{location.href=listUrl.href;},onRead:record=>{
                if(record.type!=='plant')return;
                const url=new URL(location.href);url.search='';url.searchParams.set('visit','plant');url.searchParams.set('explore',projectId);url.searchParams.set('plant',JSON.stringify([record.ref.siteId,record.ref.areaId,record.specimenId||record.ref.recordId]));location.href=url.href;
            }});
            const observer=new MutationObserver(()=>{if(!host.isConnected){player.destroy();observer.disconnect();}});observer.observe(app,{childList:true});return;
        }
        const {tours}=await tourRequest(projectId,{visitor:true});if(!host.isConnected)return;
        host.innerHTML=`<p class="studio-eyebrow">Nourishland · Guided tours</p><h1>Choose a walk.</h1><p>Follow the stops at your own pace.</p><div class="tour-public-list">${tours.map(tour=>{const url=new URL(listUrl);url.searchParams.set('tour',tour.id);return `<a href="${html(url.href)}"><h2>${html(tour.title)}</h2><p>${html(tour.description)}</p><strong>${tour.stopCount} stops · Start tour →</strong></a>`;}).join('')||'<p>No tours have been published for this place yet.</p>'}</div><a href="${new URL('../index.html',import.meta.url).href}">Back to Nourishland</a>`;
    }catch(error){if(host.isConnected)host.innerHTML=`<h1>Tour unavailable</h1><p role="alert">${html(error.message)}</p><a href="${html(listUrl.href)}">Browse published tours</a>`;}
}
