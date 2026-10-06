// Presentation contracts only. Stored identifiers and spatial data stay unchanged.
import {isDesktopLearningBookTarget,DESKTOP_AR_EXPLANATION} from './desktopLearningBookTarget.js';
import {SUPPORTED_LANGUAGES,currentNxrLanguage,setNxrLanguage,translateNxrText} from './i18n.js';
export const html = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export const key = value => encodeURIComponent(String(value ?? ''));
export const safeImage = value => /^(https?:\/\/|\/?(?:assets|workspace|api)\/|data:image\/(?:png|jpeg|webp);base64,)/i.test(String(value || '')) ? String(value) : '';
export const specimenKey = plant => JSON.stringify([plant.siteId, plant.placeId, plant.instanceId || plant.markerId]);
export const normalizeSearch = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().trim();
export function searchSpecimens(plants, query = '', area = '', layer = '') {
    const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
    return plants.filter(plant => (!area || JSON.stringify([plant.siteId,plant.placeId]) === area)
        && (!layer || plant.layer === layer)
        && words.every(word => normalizeSearch([plant.commonName,plant.scientificName,plant.family,plant.layer,plant.uses,plant.placeName].join(' ')).includes(word)))
        .sort((a,b) => Number(normalizeSearch(b.commonName) === normalizeSearch(query))-Number(normalizeSearch(a.commonName) === normalizeSearch(query)) || String(a.commonName).localeCompare(String(b.commonName)));
}
export function leafArtwork() {
    return `<svg class="v2-botanical" viewBox="0 0 480 430" aria-hidden="true"><circle cx="252" cy="210" r="175" fill="#e4ead9"/><circle cx="252" cy="210" r="146" fill="none" stroke="#c6d3bf" stroke-dasharray="2 10"/><path d="M245 395C222 290 262 175 318 58" fill="none" stroke="#607e61" stroke-width="3"/><path d="M246 306C140 317 113 238 110 196C204 186 255 231 246 306Z" fill="#abc3a4"/><path d="M247 252C344 262 395 203 394 154C301 144 253 188 247 252Z" fill="#c6d4aa"/><path d="M271 171C190 174 165 109 169 69C244 72 278 113 271 171Z" fill="#d3bf9e"/><path d="M293 114C355 128 389 71 383 35C327 39 295 64 293 114Z" fill="#98b6a3"/><g fill="none" stroke="#718868" stroke-width="1.5"><path d="M246 306 130 215M247 252 373 173M271 171 185 89M293 114 367 51"/></g><circle cx="123" cy="333" r="7" fill="#b18d61"/><circle cx="355" cy="299" r="10" fill="#d4b991"/></svg>`;
}
export function productHeader(mode = 'Explore', middle = '') {
    const language=currentNxrLanguage();
    return `<header class="v2-masthead"><button type="button" class="v2-wordmark" data-v2-home aria-label="Nourishland home">nourishland<span>XR</span></button><span>${html(mode)}</span>${middle}<div class="v2-header-tools"><button type="button" class="v2-language-trigger" data-v2-language aria-label="${html(translateNxrText('Language'))}" title="${html(translateNxrText('Language'))}" aria-haspopup="listbox" aria-expanded="false">◎ <span>${html(language.toUpperCase())}</span></button><button type="button" data-v2-settings aria-label="Experience settings">${html(translateNxrText('Settings'))}</button><div class="v2-language-menu" data-v2-language-menu role="listbox" aria-label="${html(translateNxrText('Language'))}" hidden>${Object.entries(SUPPORTED_LANGUAGES).map(([code,label])=>`<button type="button" role="option" data-v2-language-option="${code}" aria-selected="${language===code}">${html(label)}${language===code?' <span aria-hidden="true">✓</span>':''}</button>`).join('')}</div></div></header>`;
}
export function bindProductHeader(root) {
    root.querySelector('[data-v2-home]')?.addEventListener('click', () => window.renderLaunchScreen());
    root.querySelector('[data-v2-settings]')?.addEventListener('click', () => window.openExperienceSettings ? window.openExperienceSettings() : window.renderPlatformComingSoon('Settings','launch'));
    const trigger=root.querySelector('[data-v2-language]'),menu=root.querySelector('[data-v2-language-menu]');
    trigger?.addEventListener('click',()=>{const open=menu?.hidden;if(menu)menu.hidden=!open;trigger.setAttribute('aria-expanded',String(Boolean(open)));});
    root.querySelectorAll('[data-v2-language-option]').forEach(option=>option.addEventListener('click',()=>setNxrLanguage(option.dataset.v2LanguageOption)));
    const closeOnOutside=event=>{if(!event.target.closest?.('.v2-header-tools')){if(menu)menu.hidden=true;trigger?.setAttribute('aria-expanded','false');}};
    const closeOnEscape=event=>{if(event.key==='Escape'&&menu&&!menu.hidden){menu.hidden=true;trigger?.setAttribute('aria-expanded','false');trigger?.focus();}};
    document.addEventListener('pointerdown',closeOnOutside);root.addEventListener('keydown',closeOnEscape);
    globalThis.addEventListener?.('nxr-languagechange',()=>{
        const current=root.querySelector('.v2-header-tools');if(!current)return;
        const template=document.createElement('template');template.innerHTML=productHeader('', '');
        const updated=template.content.querySelector('.v2-header-tools');if(updated)current.replaceWith(updated);
        const screen=root.closest('.screen')||root;bindProductHeader(screen);
    });
}
export function enhanceProductScreen(screen) {
    if (!screen || screen.querySelector('.v2-masthead')) return;
    screen.classList.add('v2-unified');
    if (document.body.dataset.experienceRole === 'creator') screen.classList.add('creator-workspace');
    screen.insertAdjacentHTML('afterbegin',productHeader(document.body.dataset.experienceRole === 'creator' ? 'Create & manage' : 'Explore'));
    bindProductHeader(screen);
}
export const VISITOR_TABS = Object.freeze([{id:'place',label:'Explore'},{id:'plants',label:'Plants'},{id:'map',label:'Map'}]);
export function visitorNavigation(active) {
    return `<nav class="v2-place-nav" aria-label="Explore this place">${VISITOR_TABS.map(tab=>`<button type="button" data-visitor-view="${tab.id}" ${active===tab.id?'aria-current="page"':''}>${tab.label}</button>`).join('')}</nav>`;
}
export function arReadiness({secure = true, xr = false, supported = true, desktop=isDesktopLearningBookTarget()} = {}) {
    if(desktop)return {ready:false,label:'AR needs a spatial device',detail:DESKTOP_AR_EXPLANATION};
    if (!secure) return {ready:false,label:'AR needs a secure connection',detail:'Open this experience using HTTPS. You can still read the field guide.'};
    if (!xr || !supported) return {ready:false,label:'Explore without the camera',detail:'This browser does not offer immersive AR. Plants, knowledge and the map remain available here.'};
    return {ready:true,label:'Your device can try AR',detail:'Start when you are standing safely. Your browser will ask for camera access if needed.'};
}
