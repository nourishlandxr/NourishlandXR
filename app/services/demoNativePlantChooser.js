import {DEMO_NATIVE_PLANTS} from './demoNativePlants.js';
import {translateApp} from './i18n.js';
export function mountDemoNativePlantChooser(root,record,{onChoose=()=>{}}={}){
    let destroyed=false;
    function render(){if(destroyed)return;root.classList.add('note-experience','demo-note-showcase');root.innerHTML='<div class="note-spatial-board is-expanded"><article class="note-anchor"><h2>Choose the next plant</h2><p>Australian rainforest samples</p>'+DEMO_NATIVE_PLANTS.map(plant=>`<button type="button" data-native-plant="${plant.id}">${plant.name}</button>`).join('')+'</article></div>';translateApp(root);}
    const click=event=>{const button=event.target.closest('[data-native-plant]');if(button && !destroyed)onChoose(button.dataset.nativePlant);};
    root.addEventListener('click',click);render();return {action:render,close(){},destroy(){destroyed=true;root.removeEventListener('click',click);root.replaceChildren();}};
}
