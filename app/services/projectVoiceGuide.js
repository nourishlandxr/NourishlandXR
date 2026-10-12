import {createProjectNarration} from './projectNarration.js';
import {getWelcomeNarrationSettings,setWelcomeNarrationSettings} from './welcomePracticeVoice.js';
import {spokenFrameLead} from './demoVoiceTextFlow.js';
import {setZinniaVoiceContext} from './zinniaVoiceCoordinator.js';

// Page guidance is user initiated. Never read inputs, saved Notes or editor fields.
export function pageGuidanceText(root){
    const screen=root.querySelector('.screen') || root;
    const title=screen.querySelector('h1')?.textContent?.trim() || '';
    const copy=[...screen.querySelectorAll('.subtitle,.v2-lead,.lead,.page-header > p,.guide p,.page-intro p,[data-zinnia-guidance]')]
        .filter(node=>!node.closest('form,[contenteditable],.plant-knowledge-map,.pim-simple-workspace'))
        .map(node=>node.textContent.trim()).filter(Boolean);
    const sections=[...screen.querySelectorAll('.panel h2,main h2')].filter(node=>!node.closest('form,[contenteditable]')).slice(0,4).map(node=>node.textContent.trim()).filter(Boolean);
    const orientation=sections.length?'Explore '+sections.join(', ')+'. Select an item to see its details.':'';
    return [...new Set(copy),orientation].filter(Boolean).join('. ') || title;
}
export function mountProjectVoiceGuide(root){
    const bar=document.createElement('nav');bar.setAttribute('aria-label','Zinnia voice guidance');bar.className='zinnia-page-voice-bar';
    bar.style.cssText='position:fixed;left:max(12px,env(safe-area-inset-left));bottom:max(12px,env(safe-area-inset-bottom));z-index:80;display:flex;align-items:center;gap:6px;padding:7px 10px;background:#203d30f2;color:#f2f4dd;border:1px solid #91ad91;border-radius:24px;box-shadow:0 4px 18px #0003;max-width:calc(100vw - 24px);font:13px system-ui';
    const name=document.createElement('span');name.textContent='Zinnia';bar.append(name);
    const buttons={};for(const [action,label] of [['hear','Hear this page'],['pause','Pause'],['mute','Mute']]){const button=document.createElement('button');button.type='button';button.textContent=label;button.style.cssText='border:0;border-radius:18px;padding:9px;background:#42654a;color:inherit;font:inherit;cursor:pointer';buttons[action]=button;bar.append(button);}
    const voice=createProjectNarration({onChange:state=>{buttons.pause.textContent=state.paused?'Resume':'Pause';buttons.pause.disabled=!state.playing && !state.paused;}});
    let currentText='',contextual=null,releaseContext=null,introTimer=null,interacted=false,lastSignature='',currentScreen=null,inDemo=false,screenHeading='';
    const hear=()=>{if(currentText)voice.speak(spokenFrameLead(currentText));};
    const voiceContext={replay:hear,pause:voice.pause,resume:voice.resume,status:voice.status};
    buttons.hear.onclick=hear;
    buttons.pause.onclick=()=>voice.status().paused?voice.resume():voice.pause();
    buttons.mute.onclick=()=>{setWelcomeNarrationSettings({enabled:!getWelcomeNarrationSettings().enabled});sync();};
    document.body.append(bar);
    function sync(){const screen=root.querySelector('.screen') || root.querySelector('main') || root.firstElementChild,demo=Boolean(root.querySelector('.tryit-demo,.v2-welcome,[data-dev-lab],.demo-chapters'));
        const heading=screen?.querySelector('h1')?.textContent || '';
        if(screen!==currentScreen || demo!==inDemo || heading!==screenHeading){clearTimeout(introTimer);voice.stop();contextual=null;lastSignature='';releaseContext?.();releaseContext=null;currentScreen=screen;inDemo=demo;screenHeading=heading;}
        bar.hidden=demo || Boolean(root.querySelector('.ar-mode,[data-ar-overlay]'));bar.style.display=bar.hidden?'none':'flex';
        if(!demo){const copy=contextual || pageGuidanceText(root);if(copy!==lastSignature){clearTimeout(introTimer);voice.stop();currentText=copy;lastSignature=copy;releaseContext?.();releaseContext=setZinniaVoiceContext(voiceContext);if(interacted && getWelcomeNarrationSettings().enabled)introTimer=setTimeout(hear,250);}}
        buttons.hear.textContent=contextual?'Hear this selection':'Hear this page';buttons.mute.textContent=getWelcomeNarrationSettings().enabled?'Mute':'Unmute';}
    const interaction=()=>{interacted=true;};
    const contextChanged=event=>{if(root.querySelector('.tryit-demo'))return;sync();const detail=event.detail || {};contextual=[detail.title,typeof detail.body==='string'?detail.body:''].filter(Boolean).join('. ');sync();};
    const observer=new MutationObserver(sync);observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    globalThis.addEventListener('nlxr-zinnia-context',contextChanged);globalThis.addEventListener('nlxr-narration-change',sync);document.addEventListener('pointerdown',interaction,true);document.addEventListener('keydown',interaction,true);sync();
    return {voice,bar,destroy(){clearTimeout(introTimer);releaseContext?.();observer.disconnect();globalThis.removeEventListener('nlxr-zinnia-context',contextChanged);globalThis.removeEventListener('nlxr-narration-change',sync);document.removeEventListener('pointerdown',interaction,true);document.removeEventListener('keydown',interaction,true);voice.destroy();bar.remove();}};
}
