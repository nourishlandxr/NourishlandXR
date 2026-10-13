import {createSpatialTotemCards,hitTotemSurface,hitTotemPoint} from './spatialTotemCards.js';
import {createHandPokeTracker,handIndexCanPoke} from './handPoke.js';
import {zinniaVoiceState,replayZinniaVoice,pauseZinniaVoice,resumeZinniaVoice} from './zinniaVoiceCoordinator.js';
import {getWelcomeNarrationSettings,setWelcomeNarrationSettings} from './welcomePracticeVoice.js';
export function zinniaVoiceBarPose(viewer){
    const right={x:viewer[0],y:viewer[1],z:viewer[2]},up={x:viewer[4],y:viewer[5],z:viewer[6]},normal={x:viewer[8],y:viewer[9],z:viewer[10]};
    const center={x:viewer[12]-right.x*.52-up.x*.31-normal.x*.9,y:viewer[13]-right.y*.52-up.y*.31-normal.y*.9,z:viewer[14]-right.z*.52-up.z*.31-normal.z*.9};
    return {center,right,up,normal};
}
export function zinniaVoiceBarButtons({conversation=false,paused=zinniaVoiceState().paused,enabled=getWelcomeNarrationSettings().enabled,listening=zinniaVoiceState().listening}={}){
    return [{id:listening?'done':'voice',label:listening?'Finish listening':'Microphone',icon:listening?'stop':'mic',active:listening,disabled:!conversation},{id:'pause',label:paused?'Resume':'Pause',icon:paused?'play':'pause'},{id:'replay',label:'Replay',icon:'replay'},{id:'mute',label:enabled?'Mute':'Unmute',icon:enabled?'sound':'muted',active:!enabled}];
}
export function activateZinniaVoiceBar(action,conversation){
    if(action==='voice' || action==='done')conversation?.activate(action);
    else if(action==='pause')zinniaVoiceState().paused?resumeZinniaVoice():pauseZinniaVoice();
    else if(action==='replay')replayZinniaVoice();
    else if(action==='mute')setWelcomeNarrationSettings({enabled:!getWelcomeNarrationSettings().enabled});
    else if(['cancel','confirm','retry'].includes(action))conversation?.activate(action);
}
export function createSpatialZinniaVoiceBar(gl,{getConversation=()=>null,isInputOccupied=()=>false,onAction=()=>{},ray=()=>null,getPanelPose=()=>null,isEnabled=()=>true}={}){
    let pose=null,surfaces=[],disposed=false;const pokes=new Map();
    const renderer=createSpatialTotemCards(gl,{surfaces:()=>surfaces,ray,canvas:card=>{
        const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d');
        ctx.fillStyle=card.active?'#62d8bc':card.disabled?'#202825b8':'#172421ef';ctx.beginPath();ctx.arc(64,64,58,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle=card.active?'#b3ffea':'#6d8c8070';ctx.lineWidth=2;ctx.stroke();
        ctx.strokeStyle=ctx.fillStyle=card.disabled?'#718179':card.active?'#102c24':'#f0f6f3';ctx.lineWidth=7;ctx.lineCap='round';ctx.lineJoin='round';
        const line=(points)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();};
        const icon=card.icon;
        if(icon==='mic'){ctx.beginPath();ctx.roundRect(54,32,20,43,10);ctx.fill();ctx.beginPath();ctx.arc(64,65,22,0,Math.PI);ctx.stroke();line([[64,87],[64,98]]);line([[52,98],[76,98]]);}
        else if(icon==='stop'){ctx.fillRect(45,45,38,38);}
        else if(icon==='pause'){ctx.fillRect(44,39,13,50);ctx.fillRect(71,39,13,50);}
        else if(icon==='play'){ctx.beginPath();ctx.moveTo(48,37);ctx.lineTo(88,64);ctx.lineTo(48,91);ctx.closePath();ctx.fill();}
        else if(icon==='replay'){ctx.beginPath();ctx.arc(65,66,27,-Math.PI*.3,Math.PI*1.4);ctx.stroke();line([[42,34],[43,54],[62,49]]);}
        else if(icon==='sound' || icon==='muted'){ctx.beginPath();ctx.moveTo(33,54);ctx.lineTo(47,54);ctx.lineTo(64,40);ctx.lineTo(64,88);ctx.lineTo(47,74);ctx.lineTo(33,74);ctx.closePath();ctx.fill();if(icon==='sound'){ctx.beginPath();ctx.arc(66,64,23,-.7,.7);ctx.stroke();ctx.beginPath();ctx.arc(66,64,36,-.7,.7);ctx.stroke();}else line([[34,95],[94,33]]);}
        else if(card.id==='confirm')line([[39,65],[56,82],[91,44]]);
        else if(card.id==='retry'){ctx.beginPath();ctx.arc(65,66,27,-Math.PI*.3,Math.PI*1.4);ctx.stroke();line([[42,34],[43,54],[62,49]]);}
        else line([[45,45],[83,83]]),line([[83,45],[45,83]]);
        return canvas;
    }});
    function update(viewer){if(disposed || !viewer)return;if(!isEnabled()){surfaces=[];pose=null;return;}const dock=getPanelPose();if(dock){const offset=(dock.height || .42)/2+.07;pose={...dock,center:{x:dock.center.x-dock.up.x*offset,y:dock.center.y-dock.up.y*offset,z:dock.center.z-dock.up.z*offset}};}else {surfaces=[];pose=null;return;}
        const conversation=getConversation(),buttons=zinniaVoiceBarButtons({conversation:Boolean(conversation)}).filter(button=>!['voice','done'].includes(button.id));if(conversation)buttons.push(...(conversation.buttons?.() || []),{id:'cancel',label:conversation.buttons?'Skip':'Cancel'});
        surfaces=buttons.map((button,index)=>{const offset=(index-(buttons.length-1)/2)*.078;return {card:{id:button.id,title:button.label,disabled:button.disabled,icon:button.icon,active:button.active,fadeDuration:0},center:{x:pose.center.x+pose.right.x*offset,y:pose.center.y+pose.right.y*offset,z:pose.center.z+pose.right.z*offset},right:pose.right,up:pose.up,normal:pose.normal,width:.07,height:.07};});
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
