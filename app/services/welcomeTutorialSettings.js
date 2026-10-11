// Keep this preference independent of the demo's visual/settings reset.
const storageKey='nlxr.welcome-tutorial.v1';
export function welcomeTutorialEnabled(){
    try{return globalThis.localStorage?.getItem(storageKey)!=='false';}catch{return true;}
}
export function setWelcomeTutorialEnabled(enabled){
    try{globalThis.localStorage?.setItem(storageKey,String(Boolean(enabled)));}catch{}
}
export function welcomeTutorialToggleMarkup(){
    return `<label class="nlxr-welcome-tutorial"><input type="checkbox" role="switch" data-welcome-tutorial ${welcomeTutorialEnabled()?'checked':''}><span><strong>Welcome tutorial</strong><small data-welcome-tutorial-hint>${tutorialHint(welcomeTutorialEnabled())}</small></span></label>`;
}
function tutorialHint(enabled){return enabled?'XR demo: practise the controls before exploring.':'XR demo: start directly in the demo for testing.';}
export function bindWelcomeTutorialToggle(root){
    const input=root?.querySelector('[data-welcome-tutorial]');if(!input)return;
    input.addEventListener('change',()=>{
        setWelcomeTutorialEnabled(input.checked);
        const hint=root.querySelector('[data-welcome-tutorial-hint]');if(hint)hint.textContent=tutorialHint(input.checked);
    });
}
