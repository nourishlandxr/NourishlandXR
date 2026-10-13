import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {welcomeBasketSlot} from './welcomeBasketPacking.js';
import {createPracticeBody} from './welcomePracticePhysics.js';
import {createWelcomeNatureController} from './welcomeNatureController.js';

function basketTexture(){const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#897755';ctx.fillRect(0,0,128,128);for(let y=0;y<128;y+=8)for(let x=0;x<128;x+=8){ctx.fillStyle=(x+y)%16?'#a38e64':'#6d654b';ctx.fillRect(x,y,7,7);}const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(5,2);return texture;}
// Quiet, solid props: an open basket and a small handheld RC transmitter.
export function createWelcomePracticeProps(root,fruits,{onCollect=()=>{}}={}){
    const basket=new THREE.Group();basket.name='WelcomePracticeBasket';basket.position.set(.51,0,-.16);root.add(basket);
    const cloth=new THREE.MeshStandardMaterial({map:basketTexture(),color:'#91a079',roughness:.88,side:THREE.DoubleSide}),trim=new THREE.MeshStandardMaterial({color:'#a6926d',roughness:.75});
    const base=new THREE.Mesh(new THREE.CylinderGeometry(.22,.21,.012,36),cloth);base.position.y=.006;basket.add(base);
    const wall=new THREE.Mesh(new THREE.CylinderGeometry(.225,.22,.10,36,1,true),cloth);wall.position.y=.043;basket.add(wall);
    for(const y of [.014,.038,.08]){const band=new THREE.Mesh(new THREE.TorusGeometry(y===.08?.225:y===.014?.22:.223,.003,6,36),trim);band.rotation.x=Math.PI/2;band.position.y=y;basket.add(band);}
    const feedbackMaterial=new THREE.MeshBasicMaterial({color:'#ffe3a3',transparent:true,opacity:0,depthWrite:false}),feedbackRing=new THREE.Mesh(new THREE.TorusGeometry(.23,.0045,6,36),feedbackMaterial);feedbackRing.rotation.x=Math.PI/2;feedbackRing.position.y=.085;basket.add(feedbackRing);const practicePosition=new THREE.Vector3(.51,0,-.16),gardenPosition=new THREE.Vector3(.51,0,-.16);
    const plate=new THREE.Group();plate.name='WelcomeFruitPlate';plate.position.set(-.27,0,.19);plate.visible=false;root.add(plate);
    const ceramic=new THREE.MeshStandardMaterial({color:'#9bbecb',roughness:.92});
    const dish=new THREE.Mesh(new THREE.CylinderGeometry(.24,.235,.012,48),ceramic);dish.position.y=.008;plate.add(dish);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(.235,.009,8,48),ceramic);rim.rotation.x=Math.PI/2;rim.position.y=.015;plate.add(rim);
    const plated=new Set();let plateRevealed=false;
    const slots=Object.fromEntries(fruits.map((b,i)=>[b.id,{x:((i%3)-1)*.06,z:Math.floor(i/3)*.045-.045}])),collected=new Set(),initial=fruits.map(b=>b.id);let flash=0;
    const remoteBody=createPracticeBody('remote',{x:-.61,z:.13,radius:.068,halfSize:{x:.042,y:.022,z:.068},bounce:.06}),remote=new THREE.Group();root.add(remote);
    const nature=createWelcomeNatureController();remote.add(nature.group);const sticks=[nature.stick],lamp=nature.trigger;
    function place(body){const slot=slots[body.id],p=body.position;if(!slot || body.plantAttached || Math.hypot(p.x-basket.position.x,p.z-basket.position.z)>.22 || p.y<.025 || p.y>.65)return false;if(body.basketed)return false;
        const best=welcomeBasketSlot(body,fruits.filter(other=>other.basketed).map(other=>({body:other,slot:slots[other.id]})),{x:p.x-basket.position.x,z:p.z-basket.position.z});if(!best)return false;
        Object.assign(slot,best);body.basketed=true;collected.add(body.id);snap(body);flash=1;onCollect(body);return true;}
    function snap(body){const slot=slots[body.id];Object.assign(body.position,{x:basket.position.x+slot.x,y:slot.y || .018+body.halfSize.y,z:basket.position.z+slot.z});Object.assign(body.velocity,{x:0,y:0,z:0});Object.assign(body.rotation,slot.rotation || {x:0,y:0,z:0,w:1});}
    function constrainBasket(body,next,old=body.position){
        if(!basket.visible || body.plantAttached || !fruits.includes(body))return next;
        const r=body.radius,low=Math.min(old.y,next.y)-body.support,high=Math.max(old.y,next.y)+body.support;
        if(low>.10 || high<0)return next;
        const ox=old.x-basket.position.x,oz=old.z-basket.position.z,inside=Math.hypot(ox,oz)<.225;
        const dx=next.x-old.x,dz=next.z-old.z,limit=inside?Math.max(.03,.22-r):.225+r;
        const a=dx*dx+dz*dz,b=2*(ox*dx+oz*dz),c=ox*ox+oz*oz-limit*limit,disc=b*b-4*a*c;
        if(a>.000001 && disc>=0){const t=(-b+(inside?1:-1)*Math.sqrt(disc))/(2*a);if(t>=0 && t<=1){next.x=old.x+dx*Math.max(0,t-.001);next.z=old.z+dz*Math.max(0,t-.001);}}
        return next;
    }
    function remove(body){body.anchored=false;body.plated=false;plated.delete(body.id);if(!body.basketed)return;body.basketed=false;collected.delete(body.id);const packed=[];for(const other of fruits.filter(f=>f.basketed)){const next=welcomeBasketSlot(other,packed,slots[other.id]);if(next){Object.assign(slots[other.id],next);packed.push({body:other,slot:next});snap(other);}}}
    function placeOnPlate(body){const p=body.position;if(body.plantAttached || Math.hypot(p.x-plate.position.x,p.z-plate.position.z)>.24 || p.y<.015 || p.y>.45)return false;
        const packed=fruits.filter(b=>b.plated && b!==body).map(b=>({body:b,slot:b.plateSlot}));const slot=welcomeBasketSlot(body,packed,{x:p.x-plate.position.x,z:p.z-plate.position.z});if(!slot)return false;
        body.plateSlot=slot;body.plated=true;body.anchored=true;body.basketed=false;plated.add(body.id);Object.assign(body.position,{x:plate.position.x+slot.x,y:slot.y+.012,z:plate.position.z+slot.z});Object.assign(body.rotation,slot.rotation);Object.assign(body.velocity,{x:0,y:0,z:0});Object.assign(body.angular,{x:0,y:0,z:0});onCollect(body);return true;}
    function stockBasket(){const packed=[];for(const body of fruits.filter(b=>initial.includes(b.id))){if(body.held || body.plated)continue;const slot=welcomeBasketSlot(body,packed,slots[body.id]);if(slot){Object.assign(slots[body.id],slot);body.basketed=true;packed.push({body,slot});snap(body);Object.assign(body.home,body.position);}}}
    function update(phase,pilot,dt=0,other=null){const gardening=['packet','seed','water','grow','harvest','explore'].includes(phase);basket.position.lerp(gardening?gardenPosition:practicePosition,1-Math.exp(-dt*5));flash=Math.max(0,flash-dt);feedbackRing.visible=flash>0;feedbackMaterial.opacity=flash*.85;feedbackRing.scale.setScalar(1+(1-flash)*.18);basket.visible=['grab','gloves','basket','basket-reveal','fruit','fly','hands','packet','seed','water','grow','harvest','explore'].includes(phase);remoteBody.visible=phase==='fly';remote.visible=remoteBody.visible;if(phase==='basket-reveal')plateRevealed=true;plate.visible=plateRevealed;for(const body of fruits){if((['harvest','explore'].includes(phase) && body.id.startsWith('strawberry-')) && !body.held && !body.basketed && body.velocity.y<=0 && body.position.y<.18)place(body);if(body.basketed)snap(body);}const axes=pilot?.source.gamepad?.axes || [],offset=axes.length>=4?2:0;sticks[0].rotation.z=-(axes[offset] || 0)*.32;sticks[0].rotation.x=(axes[offset+1] || 0)*.32;lamp.scale.setScalar(pilot?.trigger?1.3:1);}
    return {constrainBasket,basket,plate,remote,stockBasket,placeOnPlate,addFruit(body){fruits.push(body);},addHarvest(bodies){fruits.push(...bodies);bodies.forEach((b,i)=>slots[b.id]={x:(i-1)*.05,z:i%2?.035:-.025});},get harvestComplete(){return fruits.filter(b=>b.id.startsWith('strawberry-') && collected.has(b.id)).length===3;},body:remoteBody,place,remove,update,get nextFruit(){return initial.find(id=>!plated.has(id));},get full(){return initial.every(id=>collected.has(id));},snapshot:()=>({plated:[...plated],collected:[...collected],full:initial.every(id=>collected.has(id)),harvestCount:[...collected].filter(id=>id.startsWith('strawberry-')).length,plateVisible:plate.visible}),reset(){plateRevealed=false;plate.visible=false;collected.clear();plated.clear();for(const body of fruits){body.basketed=false;body.plated=false;body.anchored=false;body.named=false;}}};
}
