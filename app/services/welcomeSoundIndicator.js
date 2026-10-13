import * as THREE from '../assets/fruit-window/vendor/three.module.js';

export function drawWelcomeSoundIndicator(ctx,{level=0,listening=false,speaking=false}={}){
    ctx.clearRect(0,0,256,192);ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=8;ctx.strokeStyle='#93b4df';
    for(const [x,y,sx,sy] of [[43,34,1,1],[213,34,-1,1],[43,158,1,-1],[213,158,-1,-1]]){
        ctx.beginPath();ctx.moveTo(x,y+sy*25);ctx.lineTo(x,y+sy*7);ctx.quadraticCurveTo(x,y,x+sx*7,y);ctx.lineTo(x+sx*25,y);ctx.stroke();
    }
    const amount=Math.max(0,Math.min(1,level));ctx.strokeStyle=listening?'#68dda1':speaking?'#90dfbd':'#60957e';ctx.lineWidth=7;
    for(let i=0;i<15;i++){
        const envelope=1-Math.abs(i-7)/8,variation=.65+.35*Math.sin(i*2.17)**2,height=4+amount*43*envelope*variation,x=30+i*14;
        ctx.beginPath();ctx.moveTo(x,96-height);ctx.lineTo(x,96+height);ctx.stroke();
    }
}
export function createWelcomeSoundIndicator(scene){
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=192;
    const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas),material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false});
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.19,.1425),material);mesh.name='Living Frame sound-reactive listening indicator';mesh.visible=false;scene.add(mesh);
    const matrix=new THREE.Matrix4(),right=new THREE.Vector3(),up=new THREE.Vector3(),normal=new THREE.Vector3();let signature='';
    return {mesh,update(frame,signal,visible=true){
        mesh.visible=Boolean(frame && visible);if(!mesh.visible)return;
        right.set(frame.right.x,frame.right.y,frame.right.z);up.set(frame.up.x,frame.up.y,frame.up.z);normal.set(frame.normal.x,frame.normal.y,frame.normal.z);
        matrix.makeBasis(right,up,normal);mesh.quaternion.setFromRotationMatrix(matrix);
        mesh.position.set(frame.center.x,frame.center.y,frame.center.z).addScaledVector(up,-.61).addScaledVector(normal,.02);
        const key=[Math.round((signal.level || 0)*20),signal.listening,signal.speaking].join('|');if(key===signature)return;signature=key;drawWelcomeSoundIndicator(ctx,signal);texture.needsUpdate=true;
    },destroy(){scene.remove(mesh);mesh.geometry.dispose();material.dispose();texture.dispose();}};
}
