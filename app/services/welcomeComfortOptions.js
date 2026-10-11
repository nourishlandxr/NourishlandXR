import {getSpatialVisualSettings,setSpatialVisualSettings} from './spatialVisualSettings.js';
import {getWelcomeNarrationSettings,setWelcomeNarrationSettings} from './welcomePracticeVoice.js';
import {WELCOME_FRUIT_ASSETS} from './welcomePracticeFruitAssets.js';

// A tutorial presentation of the existing panel. No project or plant actions.
export function createWelcomeComfortOptions({stage,onVisualChange=()=>{},onChange=()=>{}}={}){
    let expanded=false;
    const button=(id,label,x,y,width=220,extra={})=>({action:'Comfort:'+id,label,x,y,width,height:66,kind:'utility',...extra});
    function context(){
        const state=stage.snapshot(),visual=getSpatialVisualSettings(),audio=getWelcomeNarrationSettings(),voice=state.voice || {};
        const disabled=state.exiting;
        const items=[button('pause',voice.paused?'Resume':'Pause',30,112),button('replay','Hear again',270,112),button('mute',audio.enabled?'Voice on':'Voice off',510,112),button('adjust',expanded?'Less options':'Adjust',750,112)];
        if(expanded){
            items.push(button('quieter','Voice −',30,240),button('louder','Voice +',270,240),button('graphics:auto','Auto',510,240,140,{selected:visual.graphicsQuality==='auto'}),button('graphics:low','SD',665,240,140,{selected:visual.graphicsQuality==='low'}),button('graphics:high','HD',820,240,150,{selected:visual.graphicsQuality==='high'}));
            items.push(button('frame:lower','Frame ↓',30,340),button('frame:higher','Frame ↑',270,340),button('frame:sd','Frame SD',510,340),button('frame:hd','Frame HD',750,340));
            items.push(button('table:lower','Table ↓',30,440),button('table:higher','Table ↑',270,440));
        }
        items.push(button('skip','Skip tutorial',30,584,460,{primary:true}),button('next','Continue',510,584,460,{disabled:disabled || voice.playing || voice.paused || state.phase!=='explore'}));
        for(const item of items)item.disabled ||= disabled;
        return {title:'Comfort options',subtitle:expanded?'Voice · visual detail · comfortable height':'Adjust a few things, or take your time.',expanded,items,onAction:act};
    }
    function act(id){
        if(stage.snapshot().exiting)return;
        if(['pause','replay','mute','skip','next'].includes(id))stage.button(id);
        else if(id==='adjust')expanded=!expanded;
        else if(['quieter','louder'].includes(id))setWelcomeNarrationSettings({volume:getWelcomeNarrationSettings().volume+(id==='quieter'?-.15:.15)});
        else if(id.startsWith('graphics:')){setSpatialVisualSettings({graphicsQuality:id.slice(9)});onVisualChange();}
        else if(['frame:sd','frame:hd'].includes(id)){setSpatialVisualSettings({livingFrameQuality:id.slice(6)});onVisualChange();}
        else if(id.startsWith('frame:')){setSpatialVisualSettings({livingFrameHeight:getSpatialVisualSettings().livingFrameHeight+(id.endsWith('higher')?.05:-.05)});onVisualChange();}
        else if(id.startsWith('table:')){const value=setSpatialVisualSettings({practiceTableHeight:getSpatialVisualSettings().practiceTableHeight+(id.endsWith('higher')?.05:-.05)});stage.setTableHeightOffset(value.practiceTableHeight);}
        onChange();
    }
    return {context,act};
}

export function welcomePracticeVisualGuide(state){
    const fruit=state.lastPickedFruit,photos={'african-peach':'african-peach',carambola:'carambola','mamey-sapote':'mamey-sapote','bayberry-cluster':'chinese-bayberry'};
    const illustrations={orange:'15-orange-guide.svg',lime:'16-lime-guide.svg',banana:'17-banana-guide.svg'};
    if(['fruit','explore'].includes(state.phase) && illustrations[fruit])return {image:new URL('../assets/demo-tutorial-art/'+illustrations[fruit],import.meta.url).href,caption:WELCOME_FRUIT_ASSETS[fruit].label+' · illustration'};
    if(['fruit','harvest','explore'].includes(state.phase) && photos[fruit])return {image:new URL('../assets/fruit-window/photos/'+photos[fruit]+'.png',import.meta.url).href,caption:WELCOME_FRUIT_ASSETS[fruit].label};
    const hands=['hands','packet','seed','water','grow','harvest','explore'].includes(state.phase),caption=hands?'Your own hands · point and pinch':state.phase==='gloves' || state.phase==='fruit'?'Gardening hands · keep the controllers':'Controllers · trigger selects, grip holds';
    return {image:new URL('../assets/demo-tutorial-art/'+(hands?'13-hand-pinch-guide.svg':'14-controller-comfort-guide.svg'),import.meta.url).href,caption};
}
