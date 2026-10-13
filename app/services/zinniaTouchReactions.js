import * as THREE from '../assets/fruit-window/vendor/three.module.js';

// Contact histories are per input source; losing contact cannot count as a stroke.
export function createZinniaTouchReactions(){
    const histories=new Map();let reaction=null,remaining=0,cooldown=0;
    return {update(dt,contacts=[]){
        if(dt<=0)return reaction;
        remaining=Math.max(0,remaining-dt);cooldown=Math.max(0,cooldown-dt);if(!remaining)reaction=null;
        const present=new Set();let candidate=null;
        for(const {source,point,head=false,pressed} of contacts){
            if(pressed===false)continue;
            present.add(source);const old=histories.get(source),p=new THREE.Vector3(point.x,point.y,point.z);
            if(!old){histories.set(source,{p,age:0,distance:0,turns:0,sign:0});if(pressed)candidate=head?'pat':'tickle';continue;}
            const delta=p.clone().sub(old.p),distance=delta.length(),speed=distance/dt;old.p.copy(p);
            // Discontinuous tracking samples are reacquisitions, not rough touch.
            if(distance>.18){old.age=old.distance=old.turns=0;continue;}
            old.age+=dt;old.distance+=distance;
            const sign=Math.abs(delta.x)>.001?Math.sign(delta.x):0;
            if(sign && old.sign && sign!==old.sign)old.turns++;if(sign)old.sign=sign;
            if(head && old.age>.22 && speed<.65 && old.distance>.008)candidate='pat';
            else if(!candidate && !head && old.age>.28 && old.turns>=3 && old.distance>.025 && speed<.9)candidate='tickle';
        }
        for(const source of histories.keys())if(!present.has(source))histories.delete(source);
        if(candidate && cooldown===0){reaction=candidate;remaining=1.8;cooldown=remaining;for(const h of histories.values())h.age=h.distance=h.turns=0;}
        return reaction;
    },react(kind='tickle'){reaction=kind;remaining=cooldown=1.8;histories.clear();},reset(){histories.clear();reaction=null;remaining=cooldown=0;},snapshot:()=>({reaction,remaining})};
}

export function zinniaContacts(root,inputs=[],{includeHover=false}={}){
    inputs=inputs.filter(input=>input.tip || includeHover || input.trigger || input.down);
    if(!inputs.length)return [];
    if(!root.userData.zinnia || root.userData.zinnia.status!=='ready')return [];
    for(let node=root;node;node=node.parent)if(!node.visible)return [];
    root.updateWorldMatrix(true,true);
    const box=new THREE.Box3().setFromObject(root),height=box.max.y-box.min.y,contacts=[],caster=new THREE.Raycaster();
    for(const input of inputs){
        let point=null;
        if(input.tip){const tip=new THREE.Vector3(input.tip.x,input.tip.y,input.tip.z);if(box.distanceToPoint(tip)<.018)point=tip;}
        else if((includeHover || input.trigger || input.down) && input.ray?.origin && input.ray.direction){caster.set(new THREE.Vector3().copy(input.ray.origin),new THREE.Vector3().copy(input.ray.direction).normalize());caster.far=8;point=caster.intersectObject(root,true)[0]?.point;}
        if(point){const local=root.worldToLocal(point.clone());contacts.push({source:input.source,point:local,pressed:input.tip?undefined:Boolean(input.trigger || input.down),head:point.y>box.min.y+height*.86});}
    }
    return contacts;
}

let audio=null;
// A quiet, three-pulse voiced giggle; never competes with recorded narration.
export function playZinniaGiggle(){
    const Audio=globalThis.AudioContext || globalThis.webkitAudioContext;if(!Audio)return;
    try{audio ||= new Audio();if(audio.state!=='running')return;
        for(let i=0;i<3;i++){const start=audio.currentTime+i*.16,osc=audio.createOscillator(),gain=audio.createGain(),filter=audio.createBiquadFilter();osc.type='triangle';osc.frequency.setValueAtTime(540-i*35,start);osc.frequency.exponentialRampToValueAtTime(340,start+.11);filter.type='bandpass';filter.frequency.value=1100;filter.Q.value=.8;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.07,start+.025);gain.gain.exponentialRampToValueAtTime(.001,start+.13);osc.connect(filter).connect(gain).connect(audio.destination);osc.start(start);osc.stop(start+.14);osc.onended=()=>{osc.disconnect();filter.disconnect();gain.disconnect();};}
    }catch{/* Audio availability does not prevent facial reactions. */}
}
export function unlockZinniaTouchAudio(){const Audio=globalThis.AudioContext || globalThis.webkitAudioContext;if(!Audio)return;try{audio ||= new Audio();void audio.resume().catch(()=>{});}catch{}}
