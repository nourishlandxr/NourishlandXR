import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {createNourishlandControllerPrototype} from './nourishlandControllerPrototype.js';
import {createFruitWindowXR} from './fruitWindowXR.js';

// Reuse the calibrated Tutorial grip. The survey ring distinguishes mapping
// from paint while standard trigger / grip / wrist controls keep their roles.
export function createMappingController(gl){
    const scene=new THREE.Scene(),mount=new THREE.Group();mount.matrixAutoUpdate=false;scene.add(mount);
    const controller=createNourishlandControllerPrototype({mode:'paint',hand:'right'});mount.add(controller.group);
    controller.group.name='Mapping controller';controller.tip.visible=false;
    const material=new THREE.MeshStandardMaterial({color:'#a2d6bd',roughness:.9,metalness:0,emissive:'#254838'});
    const geometry=new THREE.TorusGeometry(.018,.0016,6,32),ring=new THREE.Mesh(geometry,material);ring.position.set(0,.035,-.055);controller.group.add(ring);
    const markerGeometry=new THREE.SphereGeometry(.0025,8,4);
    for(const [x,y] of [[-.018,0],[.018,0],[0,.018],[0,-.018]]){const dot=new THREE.Mesh(markerGeometry,material);dot.position.set(x,.035+y,-.055);controller.group.add(dot);}
    // Face keys are not remapped: the wrist offers Undo / Save explicitly.
    controller.group.traverse(node=>{if(node.name==='Button label')node.visible=false;});
    const renderer=createFruitWindowXR(gl,scene,{alphaCompositing:true,progressive:true});let visible=false;
    const anchor={position:{x:0,y:0,z:0},quaternion:{x:0,y:0,z:0,w:1}};
    return {update(frame,space){
        const source=Array.from(frame.session.inputSources).find(s=>!s.hand&&s.handedness==='right'&&s.gripSpace),pose=source&&frame.getPose(source.gripSpace,space);
        visible=Boolean(pose);mount.visible=visible;if(pose){mount.matrix.fromArray(pose.transform.matrix);controller.update(performance.now()/1000,{trigger:source.gamepad?.buttons?.[0]?.value||0,squeeze:source.gamepad?.buttons?.[1]?.value||0});controller.tip.visible=false;}
        renderer.prepareNext();renderer.update();
    },draw(view){if(visible)renderer.draw(view,anchor);},destroy(){renderer.destroy();controller.dispose();geometry.dispose();markerGeometry.dispose();material.dispose();}};
}
