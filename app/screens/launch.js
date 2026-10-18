import {developerToolsEnabled} from '../services/developerLabAccess.js';
import { BUILD_INFO } from '../services/buildInfo.js';
import { html, productHeader, bindProductHeader } from '../services/productExperience.js';
import {isDesktopLearningBookTarget} from '../services/desktopLearningBookTarget.js';
import {welcomeTutorialToggleMarkup,bindWelcomeTutorialToggle} from '../services/welcomeTutorialSettings.js';
import {questTutorialCaptureEnabled,renderQuestTutorialReport,savedQuestTutorialReport,setQuestTutorialCaptureEnabled} from '../services/questTutorialCapture.js';

function mountLandingSteps(root){
 const sequence=root?.querySelector('.v2-intro-sequence');if(!sequence)return()=>{};
 const steps=[...sequence.querySelectorAll('article')];if(!steps.length)return()=>{};
 const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)') || {matches:false,addEventListener(){},removeEventListener(){}};
 let index=0,timer=0,transitionTimer=0,disposed=false,paused=Boolean(reduced.matches);
 const show=next=>{index=next%steps.length;steps.forEach((step,i)=>{const active=i===index;step.classList.remove('is-leaving');step.classList.toggle('is-active',active);step.setAttribute('aria-hidden',String(!active));});};
 const advance=()=>{
  const next=(index+1)%steps.length;
  if(reduced.matches){show(next);return;}
  const current=steps[index];current.classList.add('is-leaving');current.setAttribute('aria-hidden','true');
  clearTimeout(transitionTimer);transitionTimer=setTimeout(()=>{if(disposed)return;show(next);},440);
 };
 const schedule=()=>{clearTimeout(timer);if(disposed||paused)return;timer=setTimeout(()=>{advance();schedule();},6000);};
 const onPreferenceChange=event=>{paused=event.matches;clearTimeout(transitionTimer);show(index);schedule();};
 reduced.addEventListener?.('change',onPreferenceChange);
 show(0);schedule();
 const observer=new MutationObserver(()=>{if(!root.isConnected){disposed=true;clearTimeout(timer);clearTimeout(transitionTimer);observer.disconnect();}});observer.observe(document.body,{childList:true,subtree:true});
 return()=>{disposed=true;clearTimeout(timer);clearTimeout(transitionTimer);reduced.removeEventListener?.('change',onPreferenceChange);observer.disconnect();};
}
export function renderLaunchScreen(app) {
 let last=null;try{last=JSON.parse(globalThis.localStorage?.getItem('nxr-v2-last-place') || 'null');}catch{}
 const introductionLabel=isDesktopLearningBookTarget()?'View illustrated introduction →':'Try our demo →';
 const performanceTestOn=questTutorialCaptureEnabled();
 const questReportVisible=Boolean(savedQuestTutorialReport()) || new URLSearchParams(globalThis.location?.search || '').has('questPerf');
 const headerMeta=`<nav class="v2-masthead-meta" aria-label="About and release"><span class="welcome-version-badge" aria-label="Version and release channel">V${BUILD_INFO.version} · ${BUILD_INFO.target==='production'?'Live':'Local preview'}</span>${questReportVisible?'<button type="button" data-quest-report>Quest report</button>':''}<button type="button" data-v2-about>About</button></nav>`;
 app.innerHTML=`<div class="screen v2-screen v2-welcome">${productHeader('Plant literacy · spatial learning',headerMeta)}
 <section class="v2-hero v2-wheel-hero"><div class="v2-hero-heading"><p class="v2-eyebrow">Knowledge grows here</p><h1>A living world.<br>A closer look.</h1></div><div class="v2-hero-copy"><p class="v2-lead">Explore the living systems that connect plants, people and place.<br>Follow your curiosity through connected knowledge, then experience it in the landscape with NourishlandXR’s immersive AR.</p><div class="v2-actions"><button class="v2-primary" onclick="window.openTemporaryArDemoWindow()">${introductionLabel}</button><button class="v2-secondary" onclick="window.renderV1Explorer()">Explore a place →</button><button class="v2-secondary" onclick="window.renderDemoProjects()">Create &amp; manage</button><button class="v2-secondary" onclick="window.openDemoChapters()">Demo chapters →</button></div><div class="v2-performance-tools" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:12px"><button type="button" class="v2-secondary" data-performance-test aria-pressed="${performanceTestOn}">Performance test: ${performanceTestOn?'ON':'OFF'}</button><small data-performance-test-status role="status">${performanceTestOn?'Ready to record the next tutorial run.':'Turn on before starting the tutorial.'}</small></div>${last?.id?`<button class="v2-secondary" data-resume-place>Continue exploring ${html(last.name)}</button>`:''}</div><figure class="v2-living-wheel" data-nl-hero><div data-canvas tabindex="0" role="group" aria-label="Interactive 120-faced botanical discovery die" aria-describedby="nl-instructions"><img src="assets/living-knowledge-seed-atlas.png" alt="A many-faced botanical knowledge die" width="1776" height="887"></div><figcaption class="wheel-status" id="nl-instructions">Drag in any direction to discover another face of living knowledge.</figcaption><span class="wheel-status" data-status role="status"></span></figure></section>
 <section class="v2-intro-sequence" aria-label="Ways to explore"><div class="v2-intro-steps"><article><small>01 · FIND YOUR PLACE</small><h2>Follow your curiosity</h2><p>Visit a garden or food forest. Meet the plants that grow there.</p></article><article><small>02 · LOOK CLOSER</small><h2>Knowledge, connected</h2><p>Follow a plant’s uses, growing needs and relationships. See where each idea comes from.</p></article><article><small>03 · LEARN IN PLACE</small><h2>Step into the landscape</h2><p>Read on screen or try a spatial experience on a compatible device.</p></article></div></section>
 </div>`;
 if(app.querySelector){
  const demoButton=app.querySelector('.v2-actions .v2-primary');demoButton?.insertAdjacentHTML('afterend','<button class="v2-secondary" onclick="window.openBiomeWheelXR()">Try biome wheel →</button>');
  const field = globalThis.navigator?.userAgentData?.mobile || /Android|iPhone|iPad|Mobile/i.test(globalThis.navigator?.userAgent || '');
  const platformEntry = new URL(field ? '../field/index.html' : '../platform.html', import.meta.url);
  app.querySelector('.v2-actions')?.insertAdjacentHTML('afterbegin',`<a class="v2-secondary" href="${html(platformEntry.href)}">${field ? 'Open Field Multitool' : 'Browse content'}</a>`);
  app.querySelector('.v2-actions')?.insertAdjacentHTML('beforebegin',welcomeTutorialToggleMarkup());bindWelcomeTutorialToggle(app);const wheel=app.querySelector('[data-nl-hero]');if(wheel)import('../services/landingWheel.js?v=09061').then(m=>m.mountLandingWheel(wheel)).catch(()=>{});mountLandingSteps(app);bindProductHeader(app);
  const performanceButton=app.querySelector('[data-performance-test]'),performanceStatus=app.querySelector('[data-performance-test-status]');
  performanceButton?.addEventListener('click',()=>{try{const enabled=setQuestTutorialCaptureEnabled(!questTutorialCaptureEnabled());performanceButton.textContent=`Performance test: ${enabled?'ON':'OFF'}`;performanceButton.setAttribute('aria-pressed',String(enabled));performanceStatus.textContent=enabled?'Ready to record the next tutorial run.':'Performance recording is off.';}
   catch(error){performanceStatus.textContent=`Cannot save performance test setting: ${error.message}`;}});
  app.querySelector('[data-quest-report]')?.addEventListener('click',()=>renderQuestTutorialReport(app));app.querySelector('[data-v2-about]')?.addEventListener('click',()=>window.renderPlatformComingSoon('About This Tool','launch'));app.querySelector('[data-resume-place]')?.addEventListener('click',()=>window.openVisitor('place',last.id));}
}
