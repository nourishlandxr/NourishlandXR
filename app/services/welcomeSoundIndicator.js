import * as THREE from '../assets/fruit-window/vendor/three.module.js';

export function drawWelcomeSoundIndicator(ctx,{level=0,listening=false}={}){
    const width=512,height=192;ctx.clearRect(0,0,width,height);if(!listening)return;
    ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=8;ctx.strokeStyle='#93b4df';
    for(const [x,y,sx,sy] of [[43,34,1,1],[469,34,-1,1],[43,158,1,-1],[469,158,-1,-1]]){
        ctx.beginPath();ctx.moveTo(x,y+sy*25);ctx.lineTo(x,y+sy*7);ctx.quadraticCurveTo(x,y,x+sx*7,y);ctx.lineTo(x+sx*25,y);ctx.stroke();
    }
    const amount=Math.max(0,Math.min(1,level)),gradient=ctx.createLinearGradient(24,0,488,0);
    gradient.addColorStop(0,'#55d9c4');gradient.addColorStop(.28,'#71e68f');gradient.addColorStop(.53,'#d8ef72');gradient.addColorStop(.76,'#ffbd70');gradient.addColorStop(1,'#e89cff');
    ctx.strokeStyle=gradient;ctx.lineWidth=8;
    for(let i=0;i<31;i++){
        const envelope=1-Math.abs(i-15)/16,variation=.55+.45*Math.sin(i*2.17)**2,height=3+amount*67*envelope*variation,x=32+i*15;
        ctx.beginPath();ctx.moveTo(x,96-height);ctx.lineTo(x,96+height);ctx.stroke();
    }
}

export function createWelcomeSoundIndicator(scene){
    let canvas=null,ctx=null,texture=null,material=null,mesh=null,signature='';
    const matrix=new THREE.Matrix4(),right=new THREE.Vector3(),up=new THREE.Vector3(),normal=new THREE.Vector3();
    function create(){
        canvas=document.createElement('canvas');canvas.width=512;canvas.height=192;ctx=canvas.getContext('2d');
        texture=new THREE.CanvasTexture(canvas);material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false});
        mesh=new THREE.Mesh(new THREE.PlaneGeometry(.38,.1425),material);mesh.name='Living Frame user microphone level';mesh.visible=false;scene.add(mesh);
    }
    return {get mesh(){return mesh;},update(frame,signal,{requested=false}={}){
        if(!requested || !signal?.listening || !frame){if(mesh)mesh.visible=false;return;}
        if(!mesh)create();mesh.visible=true;
        right.set(frame.right.x,frame.right.y,frame.right.z);up.set(frame.up.x,frame.up.y,frame.up.z);normal.set(frame.normal.x,frame.normal.y,frame.normal.z);
        matrix.makeBasis(right,up,normal);mesh.quaternion.setFromRotationMatrix(matrix);
        mesh.position.set(frame.center.x,frame.center.y,frame.center.z).addScaledVector(up,-.61).addScaledVector(normal,.02);
        const key=[Math.round((signal.level || 0)*40),signal.listening].join('|');if(key===signature)return;signature=key;drawWelcomeSoundIndicator(ctx,signal);texture.needsUpdate=true;
    },destroy(){if(!mesh)return;scene.remove(mesh);mesh.geometry.dispose();material.dispose();texture.dispose();canvas=null;ctx=null;texture=null;material=null;mesh=null;signature='';}};
}
