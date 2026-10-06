import {SUPPORTED_LANGUAGES,currentNxrLanguage,setNxrLanguage,translateNxrText as t} from './i18n.js';

// Always precedes demo preparation, even when the safety/preload screen was
// remembered. Language is chosen before any XR textures or content are created.
export function renderDemoLanguageChoice(app,{onContinue=()=>{},onCancel=()=>{}}={}){
    let starting=false;
    const render=()=>{
        app.innerHTML=`<section class="screen ar-safety-screen demo-language-choice" data-demo-language-choice><header class="page-header"><p class="welcome-label">NourishlandXR</p><h1>${t('Choose your demo language')}</h1><p class="subtitle">${t('Menus, buttons, learning cells and sample stories use the language you choose.')}</p></header><section class="panel"><div class="button-row" role="group" aria-label="${t('Demo language')}">${Object.entries(SUPPORTED_LANGUAGES).map(([code,label])=>`<button type="button" data-demo-language="${code}" data-nxr-skip aria-pressed="${currentNxrLanguage()===code}" class="${currentNxrLanguage()===code?'primary':''}">${label}</button>`).join('')}</div><p>${t('You can choose a different language when you start again.')}</p></section><p role="status" data-demo-language-status hidden></p><div class="button-row"><button type="button" data-demo-language-back>${t('Back')}</button><button type="button" class="primary" data-demo-language-continue>${t('Continue')}</button></div></section>`;
        app.querySelectorAll('[data-demo-language]').forEach(button=>button.addEventListener('click',()=>{if(starting)return;setNxrLanguage(button.dataset.demoLanguage);render();}));
        app.querySelector('[data-demo-language-back]').addEventListener('click',()=>onCancel());
        app.querySelector('[data-demo-language-continue]').addEventListener('click',async event=>{
            if(starting)return;starting=true;event.currentTarget.disabled=true;
            try{await onContinue();}catch(error){starting=false;event.currentTarget.disabled=false;const status=app.querySelector('[data-demo-language-status]');if(status){status.hidden=false;status.textContent=t('The demo could not start. Please try again.');}console.warn('Demo entry:',error);}
        });
    };render();
}
