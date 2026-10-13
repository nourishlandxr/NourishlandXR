import * as THREE from '../assets/fruit-window/vendor/three.module.js';

function finishTexture(mode){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');
    ctx.fillStyle=mode==='paint'?'#bdb7a9':'#66503a';ctx.fillRect(0,0,256,256);
    if(mode==='paint'){
        for(let i=0;i<5;i++){ctx.strokeStyle=['#83b7b6','#ac9eba','#bda0a5'][i%3];ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(i*60-30,256);ctx.bezierCurveTo(i*60+90,190,i*60-100,85,i*60+30,0);ctx.stroke();}
    }else{
        for(let i=0;i<45;i++){ctx.strokeStyle=i%3?'#705840':'#59452f';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(i*6,0);ctx.bezierCurveTo(i*6+10,90,i*6-15,160,i*6,256);ctx.stroke();}
        ctx.strokeStyle='#718568';ctx.lineWidth=10;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(i*100-10,256);ctx.bezierCurveTo(i*100+100,180,i*100-55,80,i*100+20,0);ctx.stroke();}
    }
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;return texture;
}

// Reuse the actual hardware silhouette, controls and animation. Only its shell
// receives a finish; the original atlas remains on the buttons and thumbstick.
export function createWelcomeControllerSkin(model){
    const white=new THREE.Color('#ffffff'),shells=[],textures={paint:finishTexture('paint'),insect:finishTexture('insect')};
    model.traverse(node=>{if(!node.isMesh || !/^(controller|controller_mesh)$|body|shell/i.test(node.name))return;
        const materials=[node.material].flat().map(original=>{const material=original.clone();shells.push({material,map:original.map,colour:original.color.clone(),roughness:original.roughness});return material;});
        node.material=Array.isArray(node.material)?materials:materials[0];
    });
    let mode='standard',age=2;
    function update(dt,next='standard'){
        if(next!==mode){mode=next;age=0;}age=Math.min(1.2,age+dt);
        const fade=1-.22*Math.sin(Math.PI*Math.min(1,age/1.2));
        for(const shell of shells){shell.material.map=mode==='standard'?shell.map:textures[mode];shell.material.color.copy(mode==='standard'?shell.colour:white).multiplyScalar(fade);shell.material.roughness=mode==='standard'?shell.roughness:1;}
    }
    return {update,get mode(){return mode;},get transitioning(){return age<1.2;},destroy(){Object.values(textures).forEach(t=>t.dispose());}};
}
