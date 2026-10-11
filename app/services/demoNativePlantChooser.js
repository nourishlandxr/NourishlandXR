import {createZinniaPlantDiscovery,mountZinniaPlantDiscovery} from './zinniaPlantDiscovery.js';
export function mountDemoNativePlantChooser(root,record,{onChoose=()=>{}}={}){
    let view;
    const discovery=createZinniaPlantDiscovery({onChange:state=>view?.render(state),onReady:onChoose});
    view=mountZinniaPlantDiscovery(root,discovery);view.render(discovery.state());
    return {action:()=>view.render(discovery.state()),close(){discovery.destroy();view.destroy();},destroy(){discovery.destroy();view.destroy();}};
}
