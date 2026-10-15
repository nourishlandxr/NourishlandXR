import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {createNourishlandControllerPrototype} from './nourishlandControllerPrototype.js';

export function createWelcomeToolStation(root,{onFeedback=()=>{}}={}){
    const brush=createNourishlandControllerPrototype({mode:'paint',hand:'right'}),bug=createNourishlandControllerPrototype({mode:'insect',hand:'right'});
    root.add(brush.group,bug.group);brush.group.name='Pick up painting controller';bug.group.name='Special insect controller preview';
    brush.group.position.set(-.46,.07,.10);bug.group.position.set(-.70,.07,.10);brush.group.rotation.x=bug.group.rotation.x=-Math.PI/2;
    for(const tool of [brush,bug]){tool.group.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(tool.group);tool.group.position.y+=.024-bounds.min.y;tool.group.visible=false;}
    let selected=false,previous=new WeakMap();
    return {reset(){selected=false;previous=new WeakMap();},update(dt,inputs,{visible=false,time=0}={}){
        brush.group.visible=bug.group.visible=visible && !selected;if(!brush.group.visible || dt<=0)return false;brush.update(time,{});bug.update(time,{});
        root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert();
        for(const input of inputs){if(!input.matrix || input.uiBlocked || input.source.hand || input.source.handedness!=='right')continue;const point=new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().fromArray(input.matrix).premultiply(inverse)),down=Boolean(input.down),before=previous.get(input.source);previous.set(input.source,down);
            if(down && before===false && point.distanceTo(brush.group.position)<.095){selected=true;brush.group.visible=bug.group.visible=false;onFeedback('grab',input.source);return true;}}
        return false;
    },snapshot:()=>({selected,visible:brush.group.visible}),destroy(){brush.group.removeFromParent();bug.group.removeFromParent();brush.dispose();bug.dispose();}};
}
