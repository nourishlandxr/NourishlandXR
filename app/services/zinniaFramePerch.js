import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {createFruitWindowXR} from './fruitWindowXR.js';

// Kept inside the frame silhouette. Totems occupy the space beside the frame.
export const ZINNIA_FRAME_PERCH=Object.freeze({x:-.73,y:.31,z:.10,width:.17,depth:.105});
export function createZinniaFramePerch(){
    const scene=new THREE.Scene(),root=new THREE.Group();scene.add(root);root.matrixAutoUpdate=false;
    const home=new THREE.Group();home.position.set(ZINNIA_FRAME_PERCH.x,ZINNIA_FRAME_PERCH.y,ZINNIA_FRAME_PERCH.z);root.add(home);
    const wood=new THREE.MeshStandardMaterial({color:'#485347',roughness:1}),potMaterial=new THREE.MeshStandardMaterial({color:'#65775b',roughness:.92});
    const ledge=new THREE.Mesh(new THREE.BoxGeometry(.17,.018,.105),wood);ledge.position.y=-.009;home.add(ledge);
    // Short bracket meets the Living Frame rim, rather than an unsupported shelf.
    const bracket=new THREE.Mesh(new THREE.BoxGeometry(.032,.105,.09),wood);bracket.position.set(-.068,-.055,-.027);bracket.rotation.z=-.18;home.add(bracket);
    const pot=new THREE.Mesh(new THREE.CylinderGeometry(.045,.032,.072,16),potMaterial);pot.position.y=.036;home.add(pot);
    const soil=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,.004,16),new THREE.MeshStandardMaterial({color:'#3c382d',roughness:1}));soil.position.y=.071;home.add(soil);
    const characterMount=new THREE.Group();characterMount.name='Zinnia return mount';characterMount.position.y=.074;home.add(characterMount);
    let renderer=null,started=null,disposed=false;
    const anchor={position:{x:0,y:0,z:0},quaternion:{x:0,y:0,z:0,w:1}};
    return {scene,root,characterMount,
        attach(gl){renderer?.destroy();renderer=createFruitWindowXR(gl,scene,{alphaCompositing:true});},
        show(time=performance.now()){started=time;},
        draw(view,matrix,time=performance.now()){
            if(disposed || started===null || !renderer)return;
            root.matrix.fromArray(matrix);renderer.update();renderer.prepareNext();
            const t=Math.max(0,Math.min(1,(time-started)/1800));renderer.draw(view,anchor,t*t*(3-2*t));
        },
        destroy(){if(disposed)return;disposed=true;renderer?.destroy();const geometries=new Set(),materials=new Set();scene.traverse(node=>{if(node.geometry)geometries.add(node.geometry);for(const material of [node.material].flat().filter(Boolean))materials.add(material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
    };
}
