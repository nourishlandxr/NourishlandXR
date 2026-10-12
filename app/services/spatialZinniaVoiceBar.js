import {createSpatialTotemCards,hitTotemSurface,hitTotemPoint} from './spatialTotemCards.js';
import {createHandPokeTracker,handIndexCanPoke} from './handPoke.js';
import {zinniaVoiceState,replayZinniaVoice,pauseZinniaVoice,resumeZinniaVoice} from './zinniaVoiceCoordinator.js';
import {getWelcomeNarrationSettings,setWelcomeNarrationSettings} from './welcomePracticeVoice.js';

export function zinniaVoiceBarPose(viewer){
    const right={x:viewer[0],y:viewer[1],z:viewer[2]},up={x:viewer[4],y:viewer[5],z:viewer[6]},normal={x:viewer[8],y:viewer[9],z:viewer[10]};
    const center={x:viewer[12]-right.x*.52-up.x*.42-normal.x*.9,y:viewer[13]-right.y*.52-up.y*.42-normal.y*.9,z:viewer[14]-right.z*.52-up.z*.42-normal.z*.9};
    return {center,right,up,normal};
}
export function zinniaVoiceBarButtons({conversation=false,paused=zinniaVoiceState().paused,enabled=getWelcomeNarrationSettings().enabled}={}){
    return [{id:'voice',label:'Mic',disabled:!conversation},{id:'done',label:'Done',disabled:!conversation},{id:'pause',label:paused?'Resume':'Pause'},{id:'replay',label:'Replay'},{id:'mute',label:enabled?'Mute':'Unmute'}];
}
export function activateZinniaVoiceBar(action,conversation){
    if(action==='voice' || action==='done')conversation?.activate(action);
    else if(action==='pause')zinniaVoiceState().paused?resumeZinniaVoice():pauseZinniaVoice();
    else if(action==='replay')replayZinniaVoice();
    else if(action==='mute')setWelcomeNarrationSettings({enabled:!getWelcomeNarrationSettings().enabled});
    else if(action==='cancel')conversation?.activate('cancel');
}
export function createSpatialZinniaVoiceBar(gl,{getConversation=()=>null,isInputOccupied=()=>false,onAction=()=>{},ray=()=>null}={}){
    let pose=null,surfaces=[],disposed=false;const pokes=new Map();
    const renderer=createSpatialTotemCards(gl,{surfaces:()=>surfaces,ray,canvas:card=>{
        const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;const ctx=canvas.getContext('2d');
        ctx.fillStyle=card.disabled?'#23332dc9':'#244638f2';ctx.beginPath();ctx.roundRect(4,4,248,120,26);ctx.fill();ctx.strokeStyle=card.disabled?'#56685b':'#96baa0';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle=card.disabled?'#8e9c90':'#f2f4dd';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='500 37px system-ui';ctx.fillText(card.title,128,66,230);return canvas;
    }});
    function update(viewer){if(disposed || !viewer)return;pose ||= zinniaVoiceBarPose(viewer);
        const conversation=getConversation(),buttons=zinniaVoiceBarButtons({conversation:Boolean(conversation)});if(conversation)buttons.push({id:'cancel',label:'Cancel'});
        surfaces=buttons.map((button,index)=>{const offset=(index-(buttons.length-1)/2)*.108;return {card:{id:button.id,title:button.label,disabled:button.disabled,fadeDuration:0},center:{x:pose.center.x+pose.right.x*offset,y:pose.center.y+pose.right.y*offset,z:pose.center.z+pose.right.z*offset},right:pose.right,up:pose.up,normal:pose.normal,width:.10,height:.065};});
    }
    function activate(target){if(!target)return false;if(!target.card.disabled){activateZinniaVoiceBar(target.card.id,getConversation());onAction(target.card.id);}return true;}
    return {update,get surfaces(){return surfaces;},reset(){pose=null;pokes.clear();},
        rebase(matrix){if(!pose)return;for(const [key,v] of Object.entries(pose)){const w=key==='center'?1:0,x=v.x,y=v.y,z=v.z;v.x=matrix[0]*x+matrix[4]*y+matrix[8]*z+matrix[12]*w;v.y=matrix[1]*x+matrix[5]*y+matrix[9]*z+matrix[13]*w;v.z=matrix[2]*x+matrix[6]*y+matrix[10]*z+matrix[14]*w;}pokes.clear();},
        hit(ray){const hit=hitTotemSurface(ray,surfaces);return hit?{...hit,kind:'voice-bar',worldPoint:hit.point}:null;},
        select(ray){return activate(hitTotemSurface(ray,surfaces));},
        updateHands(entries,time){for(const {source,state} of entries){let poke=pokes.get(source);if(!poke){poke=createHandPokeTracker();pokes.set(source,poke);}if(isInputOccupied(source) || !handIndexCanPoke(state)){poke.reset();continue;}const tip=state.rawJoints.get('index-finger-tip'),hit=hitTotemPoint(tip,surfaces,{front:.045,back:.025});const target=hit?{...hit,button:{action:hit.card.id,disabled:hit.card.disabled}}:null;if(poke.update(tip,target,time))activate(hit);}for(const source of pokes.keys())if(!entries.some(entry=>entry.source===source))pokes.delete(source);},
        draw(view){if(disposed || !pose)return;renderer.begin();renderer.draw(view,{id:'zinnia-voice-bar'},pose.center,surfaces.map(s=>s.card),'');renderer.end();},
        destroy(){disposed=true;renderer.destroy();pokes.clear();surfaces=[];}
    };
}
