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
        const items=[button('paint-tools','Brush tools',30,112,460),button('adjust',expanded?'Less options':'Settings',510,112,460)];
        if(state.phase==='brush' || state.trials?.active==='painting'){
            items.push(...['earth','water','vine','firefly'].map((name,i)=>button('brush:'+name,name[0].toUpperCase()+name.slice(1),30+i*240,240)));
            items.push(button('paint:undo','Undo',30,340),button('paint:clear','Clear drawing',270,340),button('paint:fine','Fine',510,340),button('paint:bold','Bold',750,340));
        }else if(!expanded){items.push(...['controllers','gloves','hands'].map((mode,i)=>button('input:'+mode,['Controllers','Virtual hands','Hand tracking'][i],30+i*320,240,300)),button('reset','Reset objects',30,340,460));}else if(expanded){
            items.push(button('quieter','Voice −',30,240),button('louder','Voice +',270,240),button('graphics:auto','Auto',510,240,140,{selected:visual.graphicsQuality==='auto'}),button('graphics:low','SD',665,240,140,{selected:visual.graphicsQuality==='low'}),button('graphics:high','HD',820,240,150,{selected:visual.graphicsQuality==='high'}));
            items.push(button('frame:lower','Frame ↓',30,340),button('frame:higher','Frame ↑',270,340),button('frame:sd','Frame SD',510,340),button('frame:hd','Frame HD',750,340));
            items.push(button('table:lower','Table ↓',30,440),button('table:higher','Table ↑',270,440));
        }
        items.push(button('skip','Skip tutorial',30,584,460,{primary:true}),button('next','Continue',510,584,460,{disabled:disabled || voice.playing || voice.paused || state.phase!=='explore'}));
        for(const item of items)item.disabled ||= disabled;
        return {title:'Control panel',subtitle:expanded?'Voice · visual detail · comfortable height':'Grip and move this panel. Take your time.',expanded,items,onAction:act};
    }
    function act(id){
        if(stage.snapshot().exiting)return;
        if(['pause','replay','mute','skip','next'].includes(id))stage.button(id);
        else if(id==='reset')stage.resetObjects();
        else if(id.startsWith('input:'))stage.setInputMode(id.slice(6));
        else if(id==='paint-tools')stage.trials.active==='painting'?stage.trials.close():stage.trials.open('painting');
        else if(id.startsWith('brush:'))(stage.trials.paint || stage.paint).setBrush(id.slice(6));
        else if(id==='paint:undo')(stage.trials.paint || stage.paint).undo();
        else if(id==='paint:clear')(stage.trials.paint || stage.paint).clear();
        else if(id==='paint:fine')(stage.trials.paint || stage.paint).setWidth(.002);
        else if(id==='paint:bold')(stage.trials.paint || stage.paint).setWidth(.01);
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

export function welcomePracticeVisualGuide(){return {image:'',caption:''};}
