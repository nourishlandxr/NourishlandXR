import {fruitExtents,constrainFruitNeighbours} from './welcomeFruitCollision.js';
import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {welcomeBasketSlot} from './welcomeBasketPacking.js';
import {createPracticeBody} from './welcomePracticePhysics.js';

function basketTexture(){const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#897755';ctx.fillRect(0,0,128,128);for(let y=0;y<128;y+=8)for(let x=0;x<128;x+=8){ctx.fillStyle=(x+y)%16?'#a38e64':'#6d654b';ctx.fillRect(x,y,7,7);}const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(5,2);return texture;}
function ceramicTexture(){const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#b6b1a5';ctx.fillRect(0,0,128,128);for(let i=0;i<2500;i++){const x=(i*71)%128,y=(i*37+Math.floor(i/128)*13)%128;ctx.fillStyle=i%2?'#b3aea2':'#b9b4a8';ctx.fillRect(x,y,1,1);}const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;}
function boardTexture(){const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#bda17c';ctx.fillRect(0,0,256,256);for(let i=0;i<220;i++){ctx.strokeStyle=i%3?'rgba(100,66,34,.12)':'rgba(244,222,172,.16)';ctx.lineWidth=i%4===0?2:1;ctx.beginPath();ctx.moveTo(0,i*1.17);ctx.bezierCurveTo(80,i*1.17+Math.sin(i)*4,170,i*1.17-2,256,i*1.17);ctx.stroke();}const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;}
// Quiet ceramic and woven props. Flight is driven by the real controller.
export function createWelcomePracticeProps(root,fruits,{onCollect=()=>{},fruitBoard=false}={}){
    const basket=new THREE.Group();basket.name='WelcomePracticeBasket';basket.position.set(fruitBoard?.48:.51,0,fruitBoard?0:-.16);root.add(basket);
    if(fruitBoard){basket.name='Fruit discovery wooden board';basket.userData.fruitBoard=true;const wood=new THREE.MeshStandardMaterial({map:boardTexture(),color:'#d8bd91',roughness:.92});const plank=new THREE.Mesh(new THREE.BoxGeometry(.76,.018,.72),wood);plank.position.y=.009;basket.add(plank);}else{
    const cloth=new THREE.MeshStandardMaterial({map:basketTexture(),color:'#91a079',roughness:.88,side:THREE.DoubleSide}),trim=new THREE.MeshStandardMaterial({color:'#a6926d',roughness:.75});
    const base=new THREE.Mesh(new THREE.CylinderGeometry(.22,.21,.012,36),cloth);base.position.y=.006;basket.add(base);
    const wall=new THREE.Mesh(new THREE.CylinderGeometry(.225,.22,.10,36,1,true),cloth);wall.position.y=.043;basket.add(wall);
    for(const y of [.014,.038,.08]){const band=new THREE.Mesh(new THREE.TorusGeometry(y===.08?.225:y===.014?.22:.223,.003,6,36),trim);band.rotation.x=Math.PI/2;band.position.y=y;basket.add(band);}
    }
    const feedbackMaterial=new THREE.MeshBasicMaterial({color:'#ffe3a3',transparent:true,opacity:0,depthWrite:false}),feedbackRing=new THREE.Mesh(new THREE.TorusGeometry(.23,.0045,6,36),feedbackMaterial);feedbackRing.rotation.x=Math.PI/2;feedbackRing.position.y=.085;basket.add(feedbackRing);const practicePosition=new THREE.Vector3(fruitBoard?.48:.51,0,fruitBoard?0:-.16),gardenPosition=new THREE.Vector3(.51,0,-.16);
    const plate=new THREE.Group();plate.name='WelcomeFruitPlate';plate.position.set(fruitBoard?-.23:-.52,0,fruitBoard?.10:-.12);plate.visible=false;root.add(plate);
    const ceramic=new THREE.MeshStandardMaterial({map:ceramicTexture(),color:'#bcb9b0',roughness:1,metalness:0});
    const dish=new THREE.Mesh(new THREE.CylinderGeometry(.19,.187,.008,48),ceramic);dish.position.y=.005;plate.add(dish);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(.186,.0035,8,48),ceramic);rim.rotation.x=Math.PI/2;rim.position.y=.009;plate.add(rim);
    const plated=new Set();let plateRevealed=false;
    const slots=Object.fromEntries(fruits.map((b,i)=>[b.id,fruitBoard?{x:((i%3)-1)*.23,z:Math.floor(i/3)*.23-.23}:{x:((i%3)-1)*.06,z:Math.floor(i/3)*.045-.045}])),collected=new Set(),initial=fruits.map(b=>b.id);let flash=0;
    const remoteBody=createPracticeBody('remote',{x:-.61,z:.13,radius:.068,halfSize:{x:.042,y:.022,z:.068},bounce:.06}),remote=new THREE.Group();remote.visible=false;

    function place(body){const slot=slots[body.id],p=body.position;if(!slot || body.plantAttached || Math.hypot(p.x-basket.position.x,p.z-basket.position.z)>.22 || p.y<.025 || p.y>.65)return false;if(body.basketed)return false;
        const best=welcomeBasketSlot(body,fruits.filter(other=>other.basketed).map(other=>({body:other,slot:slots[other.id]})),{x:p.x-basket.position.x,z:p.z-basket.position.z});if(!best)return false;
        Object.assign(slot,best);body.basketed=true;collected.add(body.id);snap(body);flash=1;onCollect(body);return true;}
    function snap(body){const slot=slots[body.id];Object.assign(body.position,{x:basket.position.x+slot.x,y:slot.y || .018+body.halfSize.y,z:basket.position.z+slot.z});Object.assign(body.velocity,{x:0,y:0,z:0});Object.assign(body.rotation,slot.rotation || {x:0,y:0,z:0,w:1});Object.assign(body.angular,{x:0,y:0,z:0});body.support=slot.halfSize?.y || body.halfSize.y;}
    function constrainBasket(body,next,old=body.position){
        if(body.plantAttached || !fruits.includes(body))return next;
        if(fruitBoard){body.basketContact=false;return constrainFruitNeighbours(body,next,old,fruits.filter(other=>other.held || other.anchored));}
        body.basketContact=false;constrainFruitNeighbours(body,next,old,body.held?fruits.filter(other=>other.held || other.anchored):fruits);if(!basket.visible)return next;
        const h=fruitExtents(body),r=Math.max(h.x,h.z),low=Math.min(old.y,next.y)-h.y,high=Math.max(old.y,next.y)+h.y;
        const distance=Math.hypot(next.x-basket.position.x,next.z-basket.position.z);if(old.y-h.y>=.10 && next.y-h.y<.105 && distance+r>.213 && distance-r<.23){next.y=.105+h.y;body.basketContact=true;return next;}
        if(low>.10 || high<0)return next;
        const ox=old.x-basket.position.x,oz=old.z-basket.position.z,inside=Math.hypot(ox,oz)<.225;
        const dx=next.x-old.x,dz=next.z-old.z,radial=Math.hypot(ox,oz),support=radial>1e-6?(Math.abs(ox)*h.x+Math.abs(oz)*h.z)/radial:Math.max(h.x,h.z),inner=-support+Math.sqrt(support*support+.217*.217-h.x*h.x-h.z*h.z),limit=inside?Math.max(.025,inner):.231+r;
        if(next.y-h.y>.105 && next.y>=old.y && Math.hypot(dx,dz)<.003)return next;
        const a=dx*dx+dz*dz,b=2*(ox*dx+oz*dz),c=ox*ox+oz*oz-limit*limit,disc=b*b-4*a*c;
        if(a>.000001 && disc>=0){const t=(-b+(inside?1:-1)*Math.sqrt(disc))/(2*a);if(t>=0 && t<=1 && old.y+(next.y-old.y)*t-h.y<.105){next.x=old.x+dx*Math.max(0,t-.001);next.z=old.z+dz*Math.max(0,t-.001);body.basketContact=true;}}
        return next;
    }
    function remove(body){
        body.anchored=false;body.plated=false;plated.delete(body.id);if(!body.basketed)return;
        body.basketed=false;collected.delete(body.id);if(fruitBoard)return;
        // Preserve horizontal positions so removing support only lowers fruit.
        const packed=[];
        for(const other of fruits.filter(f=>f.basketed).sort((a,b)=>slots[a.id].y-slots[b.id].y)){
            const slot=slots[other.id],h=slot.halfSize;let y=.012+h.y;
            for(const below of packed){const k=below.halfSize;if(Math.abs(slot.x-below.x)<h.x+k.x+.009 && Math.abs(slot.z-below.z)<h.z+k.z+.009)y=Math.max(y,below.y+k.y+h.y+.009);}
            slot.y=y;packed.push(slot);snap(other);
        }
    }
    function placeOnPlate(body){const p=body.position;if(body.plantAttached || Math.hypot(p.x-plate.position.x,p.z-plate.position.z)>.19 || p.y<.015 || p.y>.45)return false;
        const packed=fruits.filter(b=>b.plated && b!==body).map(b=>({body:b,slot:b.plateSlot}));const slot=welcomeBasketSlot(body,packed,{x:p.x-plate.position.x,z:p.z-plate.position.z},.181);if(!slot)return false;
        body.plateSlot=slot;body.plated=true;body.anchored=true;body.basketed=false;plated.add(body.id);Object.assign(body.position,{x:plate.position.x+slot.x,y:slot.y+.012,z:plate.position.z+slot.z});Object.assign(body.rotation,slot.rotation);Object.assign(body.velocity,{x:0,y:0,z:0});Object.assign(body.angular,{x:0,y:0,z:0});onCollect(body);return true;}
    function stockBasket(){if(fruitBoard){for(const body of fruits.filter(b=>initial.includes(b.id))){if(body.held || body.plated)continue;const slot=slots[body.id];body.basketed=true;slot.y=.018+body.halfSize.y;slot.rotation={x:0,y:0,z:0,w:1};slot.halfSize={...body.halfSize};snap(body);Object.assign(body.home,body.position);}return;}const packed=[];for(const body of fruits.filter(b=>initial.includes(b.id))){if(body.held || body.plated)continue;const slot=welcomeBasketSlot(body,packed,slots[body.id]);if(slot){Object.assign(slots[body.id],slot);body.basketed=true;packed.push({body,slot});snap(body);Object.assign(body.home,body.position);}}}
    function update(phase,pilot,dt=0,other=null){const gardening=['packet','seed','water','grow','harvest',...(fruitBoard?[]:['explore'])].includes(phase);basket.position.lerp(gardening?gardenPosition:practicePosition,1-Math.exp(-dt*5));flash=Math.max(0,flash-dt);feedbackRing.visible=false;feedbackMaterial.opacity=flash*.85;feedbackRing.scale.setScalar(1+(1-flash)*.18);basket.visible=['grab','gloves','basket','basket-reveal','fruit','fly','hands','packet','seed','water','grow','harvest','explore'].includes(phase);remoteBody.visible=false;remote.visible=false;if(['basket-reveal','grab','fruit','fly','hands'].includes(phase))plateRevealed=true;plate.visible=plateRevealed && (!fruitBoard || ['basket','basket-reveal','grab','fruit','explore'].includes(phase));for(const body of fruits){if((['harvest','explore'].includes(phase) && body.id.startsWith('strawberry-')) && !body.held && !body.basketed && body.velocity.y<=0 && body.position.y<.18)place(body);if(body.basketed)snap(body);}}
    return {constrainBasket,basket,plate,remote,stockBasket,placeOnPlate,addFruit(body){fruits.push(body);},addHarvest(bodies){for(const body of bodies)body.fruit=true;fruits.push(...bodies);bodies.forEach((b,i)=>slots[b.id]={x:(i-1)*.05,z:i%2?.035:-.025});},get harvestComplete(){return fruits.filter(b=>b.id.startsWith('strawberry-') && collected.has(b.id)).length===3;},body:remoteBody,place,remove,update,get nextFruit(){return initial.find(id=>!plated.has(id));},get full(){return initial.every(id=>collected.has(id));},snapshot:()=>({plated:[...plated],collected:[...collected],full:initial.every(id=>collected.has(id)),harvestCount:[...collected].filter(id=>id.startsWith('strawberry-')).length,plateVisible:plate.visible}),reset(){plateRevealed=false;plate.visible=false;collected.clear();plated.clear();for(const body of fruits){body.basketed=false;body.plated=false;body.anchored=false;body.named=false;}}};
}
