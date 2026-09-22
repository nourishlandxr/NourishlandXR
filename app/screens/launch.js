import { BUILD_INFO } from '../services/buildInfo.js';
import { html, productHeader, bindProductHeader } from '../services/productExperience.js';

function mountLandingSteps(root){
 const sequence=root?.querySelector('.v2-intro-sequence');if(!sequence)return()=>{};
 const steps=[...sequence.querySelectorAll('article')];if(!steps.length)return()=>{};
 const toggle=sequence.querySelector('[data-intro-toggle]');
 const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)') || {matches:false,addEventListener(){},removeEventListener(){}};
 let index=0,timer=0,disposed=false,paused=Boolean(reduced.matches);
 const show=next=>{index=next%steps.length;steps.forEach((step,i)=>{const active=i===index;step.classList.toggle('is-active',active);step.setAttribute('aria-hidden',String(!active));});};
 const syncToggle=()=>{if(!toggle)return;toggle.textContent=paused?'Resume rotating guidance':'Pause rotating guidance';toggle.setAttribute('aria-pressed',String(paused));};
 const schedule=()=>{clearTimeout(timer);if(disposed||paused)return;timer=setTimeout(()=>{show(index+1);schedule();},6000);};
 const setPaused=next=>{paused=Boolean(next);syncToggle();schedule();};
 const onPreferenceChange=event=>setPaused(event.matches);
 const onToggle=()=>setPaused(!paused);
 toggle?.addEventListener('click',onToggle);
 reduced.addEventListener?.('change',onPreferenceChange);
 show(0);schedule();
 const observer=new MutationObserver(()=>{if(!root.isConnected){disposed=true;clearTimeout(timer);observer.disconnect();}});observer.observe(document.body,{childList:true,subtree:true});
 syncToggle();
 return()=>{disposed=true;clearTimeout(timer);toggle?.removeEventListener('click',onToggle);reduced.removeEventListener?.('change',onPreferenceChange);observer.disconnect();};
}
export function renderLaunchScreen(app) {
 let last=null;try{last=JSON.parse(globalThis.localStorage?.getItem('nxr-v2-last-place') || 'null');}catch{}
 app.innerHTML=`<div class="screen v2-screen v2-welcome">${productHeader('Plant literacy · spatial learning')}
 <section class="v2-hero v2-wheel-hero"><div class="v2-hero-heading"><p class="v2-eyebrow">Knowledge grows here</p><h1>A living world.<br>A closer look.</h1></div><div class="v2-hero-copy"><p class="v2-lead">Explore the living systems that connect plants, people and place.<br>Follow your curiosity through connected knowledge, then experience it in the landscape with NourishlandXR’s immersive AR.</p><div class="v2-actions"><button class="v2-primary" onclick="window.openTemporaryArDemoWindow()">Try the AR introduction →</button><button class="v2-secondary" onclick="window.renderV1Explorer()">Explore a place →</button><button class="v2-secondary" onclick="window.renderDemoProjects()">Create &amp; manage</button></div>${last?.id?`<button class="v2-secondary" data-resume-place>Continue exploring ${html(last.name)}</button>`:''}</div><figure class="v2-living-wheel" data-nl-hero><div data-canvas tabindex="0" role="group" aria-label="Interactive 120-faced botanical discovery die" aria-describedby="nl-instructions"><img src="assets/living-knowledge-seed-atlas.png" alt="A many-faced botanical knowledge die" width="1776" height="887"></div><figcaption class="wheel-status" id="nl-instructions">Drag in any direction to discover another face of living knowledge.</figcaption><span class="wheel-status" data-status role="status"></span></figure></section>
 <section class="v2-intro-sequence" aria-label="Ways to explore"><div class="v2-intro-steps"><article><small>01 · FIND YOUR PLACE</small><h2>Follow your curiosity</h2><p>Visit a garden or food forest. Meet the plants that grow there.</p></article><article><small>02 · LOOK CLOSER</small><h2>Knowledge, connected</h2><p>Follow a plant’s uses, growing needs and relationships. See where each idea comes from.</p></article><article><small>03 · LEARN IN PLACE</small><h2>Step into the landscape</h2><p>Read on screen or try a spatial experience on a compatible device.</p></article></div><button class="v2-intro-toggle" type="button" data-intro-toggle aria-pressed="false">Pause rotating guidance</button></section>
 <footer class="v2-context"><button onclick="window.renderPlatformComingSoon('About This Tool','launch')">About Nourishland XR</button><span class="welcome-version-badge" aria-label="Version and release channel">V${BUILD_INFO.version} · ${BUILD_INFO.target==='production'?'Live':'Local preview'}</span></footer></div>`;
 if(app.querySelector){const wheel=app.querySelector('[data-nl-hero]');if(wheel)import('../services/landingWheel.js?v=09061').then(m=>m.mountLandingWheel(wheel)).catch(()=>{});mountLandingSteps(app);bindProductHeader(app);app.querySelector('[data-resume-place]')?.addEventListener('click',()=>window.openVisitor('place',last.id));}
}
