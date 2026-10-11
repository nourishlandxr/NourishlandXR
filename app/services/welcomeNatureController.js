import * as THREE from '../assets/fruit-window/vendor/three.module.js';

// Grip-space prop: a rounded palm shell with a thumb deck, front trigger and side grip.
export function createWelcomeNatureController(){
    const group=new THREE.Group();group.name='Nature controller';
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=512;const ctx=canvas.getContext('2d');ctx.fillStyle='#947653';ctx.fillRect(0,0,256,512);
    for(let x=0;x<256;x+=4){ctx.strokeStyle='rgba(55,40,25,.13)';ctx.beginPath();for(let y=0;y<=512;y+=8){const px=x+3*Math.sin(y*.022+x*.12);y?ctx.lineTo(px,y):ctx.moveTo(px,y);}ctx.stroke();}
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const wood=new THREE.MeshStandardMaterial({map:texture,color:'#c5b392',roughness:.82}),green=new THREE.MeshStandardMaterial({color:'#547b4d',roughness:.65}),dark=new THREE.MeshStandardMaterial({color:'#28382c',roughness:.8});
    const oval=new THREE.SphereGeometry(1,24,16);
    const add=(material,position,size)=>{const mesh=new THREE.Mesh(oval,material);mesh.position.set(...position);mesh.scale.set(...size);group.add(mesh);return mesh;};
    const button=(position,size)=>{const [width,height,depth]=size,shape=new THREE.Shape();shape.moveTo(-width/2,-height/2);shape.lineTo(width/2,-height/2);shape.lineTo(width/2,height/2);shape.lineTo(-width/2,height/2);shape.closePath();const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.0018,bevelThickness:.0018,bevelSegments:2,steps:1,curveSegments:2});geometry.translate(0,0,-depth/2);const mesh=new THREE.Mesh(geometry,green);mesh.position.set(...position);group.add(mesh);return mesh;};
    add(wood,[0,0,.014],[.036,.027,.067]);add(wood,[0,.008,-.033],[.045,.021,.035]);
    add(dark,[-.018,.026,-.039],[.016,.004,.016]);
    const stick=new THREE.Group();stick.position.set(-.018,.030,-.039);group.add(stick);
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.004,.004,.014,10),dark);stem.position.y=.007;stick.add(stem);const cap=new THREE.Mesh(oval,green);cap.position.y=.016;cap.scale.set(.014,.006,.014);stick.add(cap);
    add(green,[.019,.028,-.035],[.008,.004,.008]);add(green,[.028,.025,-.016],[.008,.004,.008]);add(dark,[.003,.030,-.012],[.0035,.002,.0035]);
    const trigger=button([0,-.009,-.063],[.04,.018,.012]);trigger.rotation.x=-.16;
    const grip=button([-.034,-.008,.012],[.011,.022,.036]);grip.rotation.z=-.12;
    return {group,stick,trigger,grip};
}
