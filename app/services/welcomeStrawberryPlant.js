import * as THREE from '../assets/fruit-window/vendor/three.module.js';

// Shared geometry keeps a recognisable trifoliate strawberry inexpensive in XR.
export function createWelcomeStrawberryPlant(){
    const group=new THREE.Group(),foliage=new THREE.Group(),flowers=new THREE.Group(),stems=new THREE.Group();group.add(foliage,flowers,stems);
    const green=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.86,side:THREE.DoubleSide}),stemMaterial=new THREE.MeshStandardMaterial({color:'#779253',roughness:.9}),white=new THREE.MeshStandardMaterial({color:'#fffbe9',roughness:.76}),yellow=new THREE.MeshBasicMaterial({color:'#e4b63f'});
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#668b49';ctx.fillRect(0,0,256,256);ctx.strokeStyle='#bac88c';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,128);ctx.lineTo(256,128);ctx.stroke();ctx.lineWidth=1.5;for(let i=30;i<240;i+=25)for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(i-25,128);ctx.quadraticCurveTo(i+3,128+side*20,i+15,128+side*95);ctx.stroke();}green.map=new THREE.CanvasTexture(canvas);green.map.colorSpace=THREE.SRGBColorSpace;
    const positions=[],uv=[],indices=[],rows=24,columns=6;
    for(let i=0;i<=rows;i++){const t=i/rows,width=.029*Math.sin(Math.PI*t)*(i%2?.87:1.08);for(let j=0;j<=columns;j++){const u=j/columns*2-1;positions.push(.081*t,.008*Math.sin(Math.PI*t)*(1-u*u),width*u);uv.push(t,(u+1)/2);}}
    for(let i=0;i<rows;i++)for(let j=0;j<columns;j++){const a=i*(columns+1)+j,b=a+columns+1;indices.push(a,a+1,b,a+1,b+1,b);}
    const leafGeometry=new THREE.BufferGeometry();leafGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));leafGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));leafGeometry.setIndex(indices);leafGeometry.computeVertexNormals();
    const cylinder=new THREE.CylinderGeometry(1,1,1,7),round=new THREE.SphereGeometry(1,10,7);
    function stalk(parent,a,b,r=.0015){const mesh=new THREE.Mesh(cylinder,stemMaterial),direction=b.clone().sub(a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.set(r,direction.length(),r);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());parent.add(mesh);return mesh;}
    const leafSets=[];
    for(let set=0;set<11;set++){
        const rosette=new THREE.Group();foliage.add(rosette);leafSets.push(rosette);
        const angle=set*2.399,radius=set<3?.012:.022+(set%3)*.006,junction=new THREE.Vector3(Math.cos(angle)*radius,.032+(set%4)*.007,Math.sin(angle)*radius);
        stalk(rosette,new THREE.Vector3(0,0,0),junction);
        for(const spread of [-.85,0,.85]){const leaf=new THREE.Mesh(leafGeometry,green);leaf.position.copy(junction);leaf.rotation.y=-angle-spread;leaf.rotation.z=.18+(set%3)*.10;leaf.rotation.x=(set%2?.14:-.14);leaf.scale.setScalar((spread===0?1.15:.93)+(set%3)*.07);rosette.add(leaf);}
    }
    for(const [x,y,z] of [[-.048,.135,-.025],[.045,.105,.04]]){const centre=new THREE.Vector3(x,y,z);stalk(flowers,new THREE.Vector3(0,.02,0),centre,.0012);const flower=new THREE.Group();flower.position.copy(centre);flowers.add(flower);for(let i=0;i<5;i++){const angle=i*Math.PI*2/5,petal=new THREE.Mesh(round,white);petal.position.set(Math.cos(angle)*.011,.001,Math.sin(angle)*.011);petal.scale.set(.011,.003,.008);petal.rotation.y=-angle;flower.add(petal);const sepal=new THREE.Mesh(round,green);sepal.position.set(Math.cos(angle)*.009,-.003,Math.sin(angle)*.009);sepal.scale.set(.012,.0015,.003);sepal.rotation.y=-angle;flower.add(sepal);}const core=new THREE.Mesh(round,yellow);core.scale.set(.006,.0035,.006);core.position.y=.003;flower.add(core);for(let i=0;i<10;i++){const angle=i*Math.PI/5,anther=new THREE.Mesh(round,yellow);anther.position.set(Math.cos(angle)*.006,.006,Math.sin(angle)*.006);anther.scale.setScalar(.0011);flower.add(anther);}}
    const fruitPositions=[new THREE.Vector3(-.125,.032,.035),new THREE.Vector3(.125,.034,.045),new THREE.Vector3(.015,.034,.13)];
    for(const p of fruitPositions){const points=[new THREE.Vector3(0,.04,0),new THREE.Vector3(p.x*.55,.10,p.z*.55),p.clone().add(new THREE.Vector3(0,.029,0))],curve=new THREE.CatmullRomCurve3(points);stems.add(new THREE.Mesh(new THREE.TubeGeometry(curve,8,.0012,5,false),stemMaterial));}
    function update(progress,time){
        const leaf=THREE.MathUtils.smoothstep(progress,0,.78),bloom=THREE.MathUtils.smoothstep(progress,.42,.67);
        foliage.scale.setScalar(.10+.90*leaf);
        leafSets.forEach((rosette,i)=>rosette.scale.setScalar(Math.max(.003,THREE.MathUtils.smoothstep(progress,i<3?0:.08+(i-3)*.035,.45+i*.025))));
        flowers.visible=bloom>0;flowers.scale.setScalar(Math.max(.001,bloom));stems.visible=progress>.66;
        foliage.rotation.y=Math.sin(time*.6)*.015;
    }
    return {group,fruitPositions,update};
}
