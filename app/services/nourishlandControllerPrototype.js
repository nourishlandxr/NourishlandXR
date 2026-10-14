import {drawWristIcon} from './welcomeWristMenu.js';
import * as THREE from '../assets/fruit-window/vendor/three.module.js';

export const NOURISHLAND_TOOL_GRIP=Object.freeze({y:.045,z:.012,pitch:-1.2353981634});
const authoredTip=new THREE.Vector3(0,.027,-.102).applyEuler(new THREE.Euler(NOURISHLAND_TOOL_GRIP.pitch,0,0)).add(new THREE.Vector3(0,NOURISHLAND_TOOL_GRIP.y,NOURISHLAND_TOOL_GRIP.z));
export const NOURISHLAND_PAINT_TIP=Object.freeze({x:authoredTip.x,y:authoredTip.y,z:authoredTip.z});

function surfaceTexture(wood=false){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
    const c=canvas.getContext('2d');c.fillStyle=wood?'#624732':'#c9c1b3';c.fillRect(0,0,256,256);
    for(let i=0;i<95;i++){
        c.strokeStyle=wood?(i%3?'#73523a':'#4f3929'):(i%3?'#cdc6b9':'#c3baac');
        c.lineWidth=wood?1:.5;c.beginPath();c.moveTo(i*3,0);
        c.bezierCurveTo(i*3+14,75,i*3-18,180,i*3,256);c.stroke();
    }
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    return texture;
}

/** Review prototype. Coordinates use WebXR grip space; forward is -Z.
 * Controls and tool tip expose stable names for a later hardware adapter.
 */
export function createNourishlandControllerPrototype({mode='paint',hand='right'}={}){
    const group=new THREE.Group();group.name='Nourishland '+mode+' controller prototype';group.userData.handedness=hand;group.position.set(0,NOURISHLAND_TOOL_GRIP.y,NOURISHLAND_TOOL_GRIP.z);group.rotation.x=NOURISHLAND_TOOL_GRIP.pitch;
    const materials=new Set(),geometries=new Set(),textures=new Set();
    const wood=surfaceTexture(true),pearl=surfaceTexture(false);textures.add(wood);textures.add(pearl);
    const material=(color,roughness=.65,metalness=0)=>{const m=new THREE.MeshStandardMaterial({color,roughness,metalness});materials.add(m);return m;};
    const shell=material('#fff2dd',.58),deckMaterial=material('#f6e7d0',.72),trim=material('#c7ad7a',.38,.45),gripMaterial=material('#a99cba',.84),accent=material('#88bbb7',.35,.2),buttonMaterial=material('#b8a2c4',.42,.15),ink=material('#493b59',.8);
    const ribbons=[material('#85babd',.32,.18),material('#b4a1c6',.38,.16),material('#c6a5b3',.4,.12)];
    const mesh=(geo,mat,name,parent=group)=>{geometries.add(geo);const node=new THREE.Mesh(geo,mat);node.name=name;parent.add(node);return node;};
    const sphereGeometry=new THREE.SphereGeometry(1,20,12);
    const oval=(name,mat,position,scale,parent=group)=>{const node=mesh(sphereGeometry,mat,name,parent);node.position.set(...position);node.scale.set(...scale);return node;};
    const tube=(name,points,radius,mat,parent=group)=>mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),32,radius,6,false),mat,name,parent);
    const handed=hand==='left'?-1:1;
    // Elliptical sections: narrow neck, fuller palm, rounded heel. Keep the
    // controls in one anatomical cluster while tool heads carry the identity.
    const sections=[[-.123,.001,.001,.015],[-.119,.012,.015,.016],[-.103,.020,.023,.014],[-.076,.024,.028,.010],[-.050,.024,.026,.005],[-.027,.021,.021,0],[-.006,.018,.018,-.006],[.012,.021,.020,-.010],[.025,.014,.015,-.012],[.029,.001,.001,-.012]];
    const positions=[],uvs=[],indices=[],segments=32;
    sections.forEach(([y,rx,rz,cz],row)=>{for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;positions.push(Math.cos(a)*rx,y,Math.sin(a)*rz+cz);uvs.push(i/segments,row/(sections.length-1));if(row<sections.length-1 && i<segments){const p=row*(segments+1)+i,q=p+segments+1;indices.push(p,q,p+1,p+1,q,q+1);}}});
    const gripGeometry=new THREE.BufferGeometry();gripGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));gripGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));gripGeometry.setIndex(indices);gripGeometry.computeVertexNormals();
    const body=mesh(gripGeometry,shell,'Contoured palm shell');
    const topShell=oval('Rounded shoulder',shell,[0,.022,-.017],[.044,.019,.043]);
    const thumbCluster=new THREE.Group();thumbCluster.name='Sloped thumb control deck';thumbCluster.position.set(0,.032,-.010);thumbCluster.rotation.x=-.18;thumbCluster.rotation.z=handed*.08;group.add(thumbCluster);
    const thumbDeck=oval('Thumb deck',deckMaterial,[0,0,-.006],[.040,.007,.039],thumbCluster);
    const edge=[];for(let i=0;i<=48;i++){const a=i/48*Math.PI*2;edge.push([Math.cos(a)*.040,.005,Math.sin(a)*.039-.006]);}
    const deckRim=tube('Flush deck rim',edge,.0009,trim,thumbCluster);
    const thumbRest=oval('Inner thumb rest',gripMaterial,[-handed*.034,.006,.010],[.008,.003,.015],thumbCluster);
    const palmPad=oval('Palm cushioning',gripMaterial,[handed*.015,-.074,.032],[.014,.032,.005]);
    function pointedHead(name,mat,width,length,height,y,z){
        const shape=new THREE.Shape();shape.moveTo(0,-length);
        shape.bezierCurveTo(width*.25,-length*.96,width,-length*.35,width,.008);
        shape.quadraticCurveTo(width,.032,0,.034);shape.quadraticCurveTo(-width,.032,-width,.008);
        shape.bezierCurveTo(-width,-length*.35,-width*.25,-length*.96,0,-length);
        const node=mesh(new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:true,bevelThickness:.003,bevelSize:.003,bevelSegments:3,steps:1,curveSegments:18}),mat,name);
        node.rotation.x=Math.PI/2;node.position.set(0,y,z);return node;
    }
    const paintNose=pointedHead('Tapered artist nose',shell,.022,.072,.016,.024,-.018);
    const insectHead=pointedHead('Pointed leaf flight head',shell,.046,.085,.018,.023,-.018);
    const insectLeaf=pointedHead('Leaf head centre',gripMaterial,.038,.079,.003,.027,-.018);
    const paintLines=[],leafVeins=[];
    for(const side of [-1,1]){
        paintLines.push(tube('Paint nose inlay',[[side*.020,.027,-.020],[side*.014,.028,-.052],[side*.003,.027,-.084]],.001,ribbons[side===1?0:1]));
        leafVeins.push(tube('Flight leaf edge',[[0,.028,-.103],[side*.021,.028,-.074],[side*.042,.028,-.035],[side*.031,.028,.002]],.001,trim));
        for(let i=0;i<3;i++)leafVeins.push(tube('Flight leaf vein',[[0,.031,-.085+i*.022],[side*.014,.031,-.072+i*.022],[side*(.021+i*.005),.030,-.061+i*.022]],.0007,trim));
    }
    for(let side of [-1,1]){
        oval('Soft grip insert',gripMaterial,[side*.022,-.073,.010],[.003,.031,.018]);
        const surface=(x,y,r)=>[side*x,y,Math.sqrt(Math.max(.00001,r*r-x*x))-.159*y+.001];
        for(let i=0;i<3;i++)tube('Flow inlay '+side+' '+i,[[side*(.003+i*.003),-.112,.030],[side*(.005+i*.003),-.080,.037],[side*(.006+i*.003),-.050,.030],[side*(.008+i*.003),-.027,.019]],.0008,ribbons[i]);
        for(let i=0;i<3;i++){
            const leaf=oval('Leaf inlay',ribbons[i],[side*(.025+i*.004),.019,-.024-i*.010],[.007,.001,.004]);leaf.rotation.y=side*.65;
        }
    }
    const triggerPivot=new THREE.Group();triggerPivot.name='Index trigger hinge';triggerPivot.position.set(0,.005,-.035);group.add(triggerPivot);
    const hinge=mesh(new THREE.CylinderGeometry(.003,.003,.038,12),trim,'Trigger hinge pin',triggerPivot);hinge.rotation.z=Math.PI/2;
    const paddleShape=new THREE.Shape();paddleShape.moveTo(-.011,0);paddleShape.quadraticCurveTo(-.015,-.010,-.009,-.022);paddleShape.quadraticCurveTo(0,-.028,.009,-.022);paddleShape.quadraticCurveTo(.015,-.010,.011,0);paddleShape.closePath();
    const frontTrigger=mesh(new THREE.ExtrudeGeometry(paddleShape,{depth:.0035,bevelEnabled:true,bevelSize:.0015,bevelThickness:.0015,bevelSegments:3,curveSegments:12}),gripMaterial,'Curved index trigger paddle',triggerPivot);frontTrigger.rotation.x=.24;
    const triggerCollar=oval('Trigger hinge housing',shell,[0,.007,-.031],[.017,.007,.009]);
    const grip=oval('Side squeeze paddle',gripMaterial,[-handed*.024,-.049,.002],[.004,.020,.014]);
    const stick=new THREE.Group();stick.name='Thumbstick';stick.position.set(-handed*.015,.008,-.019);thumbCluster.add(stick);
    const stickBase=mesh(new THREE.CylinderGeometry(.011,.012,.002,24),trim,'Thumbstick collar',stick);
    const stem=mesh(new THREE.CylinderGeometry(.005,.005,.008,16),gripMaterial,'Thumbstick stem',stick);stem.position.y=.004;
    oval('Thumbstick cap',accent,[0,.010,0],[.011,.003,.011],stick);
    const settingsRing=mesh(new THREE.TorusGeometry(.0135,.0011,6,32),material('#ed6259'),'Thumbstick settings function ring',stick);settingsRing.rotation.x=-Math.PI/2;settingsRing.position.y=.010;settingsRing.visible=false;
    const buttons=[],legends=[];
    function button(text,x,z,r=.009){
        const node=new THREE.Group();node.name='Button '+text;node.position.set(x,.009,z);thumbCluster.add(node);
        oval('Button face',buttonMaterial,[0,0,0],[r,.005,r],node);
        const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');ctx.font='600 44px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#413950';if(mode==='paint' && ['A','B','X','Y'].includes(text))drawWristIcon(ctx,text==='B' || text==='Y'?'undo':'eraser',32,32,46);else ctx.fillText(text,32,33);
        const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;textures.add(map);legends.push({canvas:c,map,text});
        const label=new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,side:THREE.DoubleSide});materials.add(label);
        const face=mesh(new THREE.PlaneGeometry(r*1.55,r*1.55),label,'Button label',node);face.rotation.x=-Math.PI/2;face.position.y=.0053;buttons.push(node);
    }
    button(hand==='left'?'Y':'B',handed*.015,-.024,.008);
    button(hand==='left'?'X':'A',handed*.023,-.004,.008);
    button('∞',handed*.003,.017,.006);
    const crystalMaterial=material('#4387a9',.25,.18);crystalMaterial.emissive.set('#408ab9');
    const jewel=mesh(new THREE.OctahedronGeometry(.012,0),crystalMaterial,'Flight crystal');jewel.position.set(0,.029,-.087);jewel.scale.set(.67,.8,1.5);
    const tip=new THREE.Group();tip.name='Precision paint tip';tip.position.set(0,.027,-.102);group.add(tip);
    const pigment=material('#82c7bb',.4,.1);pigment.emissive.set('#82c7bb');pigment.emissiveIntensity=.28;
    const triangle=tube('Precision triangle',[[0,.012,0],[-.009,-.005,0],[.009,-.005,0],[0,.012,0]],.0011,pigment,tip);
    const centre=mesh(new THREE.ConeGeometry(.003,.005,3),pigment,'Precise contact point',tip);centre.rotation.x=Math.PI/2;
    const spray=mesh(new THREE.SphereGeometry(.005,12,8),pigment,'Spray tip',tip);spray.visible=false;
    const dots=new THREE.Group();tip.add(dots);dots.visible=false;
    const dotGeometry=new THREE.SphereGeometry(.00045,5,4);geometries.add(dotGeometry);
    for(let i=0;i<12;i++){const a=i*2.4,r=.0038*Math.sqrt((i+.5)/12),dot=new THREE.Mesh(dotGeometry,ink);dot.position.set(Math.cos(a)*r,Math.sin(a)*r,.0035);dots.add(dot);}
    const lights=[];for(let i=0;i<3;i++)lights.push(oval('Flight status light '+i,accent,[(i-1)*.009,.048,.023],[.0015,.001,.0015]));
    let currentMode=mode;
    function setMode(next){
        currentMode=next==='insect'?'insect':'paint';const insect=currentMode==='insect';for(const {canvas,map,text} of legends){const ctx=canvas.getContext('2d');ctx.clearRect(0,0,64,64);ctx.fillStyle='#413950';if(!insect && ['A','B','X','Y'].includes(text))drawWristIcon(ctx,text==='B' || text==='Y'?'undo':'eraser',32,32,46);else {ctx.font='600 44px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,32,33);}map.needsUpdate=true;}
        shell.map=deckMaterial.map=insect?wood:pearl;shell.color.set(insect?'#cfbba1':'#fff4df');deckMaterial.color.set(insect?'#c5ad92':'#f7eddf');
        gripMaterial.color.set(insect?'#56634b':'#aaa0ba');trim.color.set(insect?'#a18050':'#c9b58e');
        accent.color.set(insect?'#4387a9':'#91c7c2');accent.emissive.set(insect?'#346983':'#546d70');accent.emissiveIntensity=.15;
        buttonMaterial.color.set(insect?'#667154':'#b9a5c8');ribbons.forEach((m,i)=>m.color.set(insect?['#768764','#5f7659','#9b9364'][i]:['#85babd','#b4a1c6','#c6a5b3'][i]));
        topShell.scale.set(insect?.044:.041,.019,insect?.043:.040);thumbDeck.scale.set(.040,.007,.039);deckRim.scale.set(1,1,1);
        body.scale.set(1,1,1);
        paintNose.visible=!insect;paintLines.forEach(n=>n.visible=!insect);
        insectHead.visible=insectLeaf.visible=jewel.visible=insect;leafVeins.forEach(n=>n.visible=insect);
        frontTrigger.scale.x=1;
        tip.visible=!insect;lights.forEach(light=>light.visible=insect);shell.needsUpdate=deckMaterial.needsUpdate=true;
    }
    setMode(mode);
    return {group,tip,setMode,setSettingsUnlocked(value){settingsRing.visible=Boolean(value);},setColour(colour){pigment.color.set(colour);pigment.emissive.set(colour);},setBrush(brush){const isSpray=brush==='spray';triangle.visible=centre.visible=!isSpray;spray.visible=dots.visible=isSpray;},update(time,{trigger=0,squeeze=0,stickX=0,stickY=0,buttons:inputButtons=[],flying=false,speed=0}={}){triggerPivot.rotation.x=trigger*.30;grip.position.x=(hand==='left'?1:-1)*(.024-squeeze*.0015);stick.rotation.set(stickY*.18,0,-stickX*.18);buttons.forEach((button,i)=>button.position.y=.009-(inputButtons[[5,4,3][i]]?.value || 0)*.002);crystalMaterial.emissiveIntensity=flying?.45+Math.min(1,speed)*.65:.04;crystalMaterial.color.set(flying?'#72c8ef':'#32617b');pigment.emissiveIntensity=.22+trigger*.35;},get mode(){return currentMode;},dispose(){group.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}
