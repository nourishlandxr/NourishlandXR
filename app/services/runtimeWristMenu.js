import {createPimInfoPanel} from './pimInfoPanel.js';

// Use the Tutorial wrist renderer and its ray/poke/pinch ownership in every mode.
// Keep this separate from the information panel so opening a plant never removes tools.
export function createRuntimeWristMenu({root,headset=false,phoneAR=false,actions=()=>[],onAction=()=>{},blocked=()=>false,anchorHand='left',shortcutHand='right',title='Wrist controls',toggleIcon='settings',oppositeHandOnly=false}={}){
    let opened=false,session=null,signature='',previous=new WeakMap();
    const inputOccupied=source=>blocked(source) || Boolean(oppositeHandOnly && source?.handedness===anchorHand);
    const panel=createPimInfoPanel({root,headset,phoneAR,simpleDesktop:!headset&&!phoneAR,inputOccupied});
    panel.element.classList.add('is-runtime-wrist');
    function sync(){
        const entries=actions(),key=JSON.stringify([opened,entries]);if(key===signature)return;signature=key;
        const buttons=[{id:'toggle',label:opened?'Close '+title:'Open '+title,icon:opened?'close':toggleIcon},...(opened?entries:[])];
        const bounds={left:-.034,right:.034,top:.073,bottom:.045-(opened?Math.ceil(entries.length/2)*.034+.014:0)},width=.068;
        const items=buttons.map((entry,i)=>{
            const x=i?((i-1)%2-.5)*.034:0,y=i?.020-Math.floor((i-1)/2)*.034:.059,size=i?.030:.024;
            return {...entry,dock:true,action:'Comfort:'+entry.id,ariaLabel:entry.label,description:entry.description||entry.label,kind:'utility',
                x:(x-size/2-bounds.left)/width*1000,y:(bounds.top-y-size/2)/width*1000,width:size/width*1000,height:size/width*1000};
        });
        panel.setComfortContext({wrist:true,anchorHand,page:'home',opened,expanded:false,width,height:(bounds.top-bounds.bottom)/width*1000,bounds,
            centerOffset:{x:0,y:(bounds.top+bounds.bottom)/2},title,subtitle:'',compactHint:true,items,onAction:id=>{if(id==='toggle')opened=!opened;else onAction(id);signature='';sync();}});
        panel.element.classList.toggle('is-runtime-wrist-open',opened);
    }
    sync();
    return {panel,sync,attach:gl=>panel.attach(gl),bindSession(value,space){session=value;panel.bindSession(value,space);},
        update(matrix,time,ray,frame){
            for(const source of session?.inputSources||[]){if(source.hand || source.handedness!==shortcutHand)continue;const down=Boolean(source.gamepad?.buttons?.[3]?.pressed);
                if(down && previous.get(source)===false && !blocked(source)){opened=!opened;signature='';}previous.set(source,down);}
            sync();panel.update(matrix,time,ray,frame,inputOccupied);
        },draw:view=>panel.draw(view),destroy(){session=null;panel.destroy();}};
}

// Creator wrist space is reserved for tracked spatial devices, never camera-only phones.
export function createCreatorWristMenus({root,headset=false,phoneAR=false,generalActions=()=>[],contextActions=()=>[],onAction=()=>{},blocked=()=>false}={}){
    if(!headset || phoneAR)return null;
    const left=createRuntimeWristMenu({root,headset:true,actions:generalActions,onAction,blocked,anchorHand:'left',shortcutHand:'left',title:'General settings',toggleIcon:'settings',oppositeHandOnly:true});
    const right=createRuntimeWristMenu({root,headset:true,actions:contextActions,onAction,blocked,anchorHand:'right',shortcutHand:'right',title:'Current task',toggleIcon:'tools',oppositeHandOnly:true});
    const menus=[left,right],panels=menus.map(menu=>menu.panel);
    return {left,right,panel:{hit:ray=>panels.map(panel=>panel.hit(ray)).filter(Boolean).sort((a,b)=>a.distance-b.distance)[0]||null,isHandInteracting:source=>panels.some(panel=>panel.isHandInteracting(source)),activateHand:(ray,source,state)=>panels.some((panel,index)=>source?.handedness!==['left','right'][index] && panel.activateHand(ray,source,state))},
        sync(){menus.forEach(menu=>menu.sync());},attach:gl=>menus.forEach(menu=>menu.attach(gl)),bindSession:(...args)=>menus.forEach(menu=>menu.bindSession(...args)),update:(...args)=>menus.forEach(menu=>menu.update(...args)),draw:view=>menus.forEach(menu=>menu.draw(view)),destroy(){menus.forEach(menu=>menu.destroy());}};
}
