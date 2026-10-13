import {getSpatialVisualSettings,setSpatialVisualSettings} from './spatialVisualSettings.js';
import {getWelcomeNarrationSettings,setWelcomeNarrationSettings} from './welcomePracticeVoice.js';
import {WELCOME_FRUIT_ASSETS} from './welcomePracticeFruitAssets.js';

// A tutorial presentation of the existing panel. No project or plant actions.
export function createWelcomeComfortOptions({stage,onVisualChange=()=>{},onChange=()=>{}}={}){
    let expanded=false,paintPage='brush';
    const button=(id,label,x,y,width=220,extra={})=>({action:'Comfort:'+id,label,x,y,width,height:66,kind:'utility',...extra});
    function context(){
        const state=stage.snapshot(),visual=getSpatialVisualSettings(),audio=getWelcomeNarrationSettings(),voice=state.voice || {};
        const disabled=state.exiting;
        const painting=state.phase==='brush' || state.trials?.active==='painting';
        const paint=stage.trials.active==='painting'?stage.trials.paint:stage.paint;
        const drawing=paint?.snapshot?.() || {};
        const icon=(id,label,symbol,x,y,extra={})=>button(id,symbol,x,y,112,{height:80,ariaLabel:label,description:label,...extra});
        const items=painting?[
            ...[['brush','Brushes','B'],['colour','Colours','C'],['tools','Tools','⚙']].map(([id,label,symbol],i)=>icon('paint-page:'+id,label,symbol,50+i*300,50,{selected:paintPage===id})),
            ...(paintPage==='brush'?['earth','water','vine','firefly'].map((name,i)=>icon('brush:'+name,name[0].toUpperCase()+name.slice(1)+' brush',['▧','≈','❧','✧'][i],50+i*225,180,{selected:drawing.brush===name})):paintPage==='colour'?['#86e7d0','#e8a1d0','#ffd47c','#9eb8ff','#ffffff','#263b32','#ed795c','#b39add'].map((colour,i)=>icon('paint:colour:'+i,'Colour '+(i+1),'■',50+(i%4)*225,170+Math.floor(i/4)*105,{color:colour,selected:drawing.colour===i})): [icon('paint:undo','Undo','↶',50,175),icon('paint:clear','Clear drawing','⌫',275,175),icon('paint:fine','Fine stroke','╱',500,175,{selected:drawing.width<=.002}),icon('paint:bold','Bold stroke','▰',725,175,{selected:drawing.width>=.01})])
        ]:[icon('paint-tools','Brush tools','✎',30,112),icon('adjust',expanded?'Close settings':'Settings','⚙',850,112)];
        if(painting && state.trials?.active==='painting')items.push(icon('paint-tools','Close brush practice','×',850,26,{width:80,height:60}));
        if(!painting && !expanded){items.push(...['controllers','gloves','hands'].map((mode,i)=>button('input:'+mode,['Controllers','Virtual hands','Hand tracking'][i],30+i*320,240,300)),button('reset','Reset objects',30,340,460));}else if(!painting && expanded){
            items.push(icon('quieter','Quieter voice','−',30,240),icon('louder','Louder voice','+',270,240),button('graphics:auto','Auto',510,240,140,{selected:visual.graphicsQuality==='auto'}),button('graphics:low','SD',665,240,140,{selected:visual.graphicsQuality==='low'}),button('graphics:high','HD',820,240,150,{selected:visual.graphicsQuality==='high'}));
            items.push(button('frame:lower','Frame ↓',30,340),button('frame:higher','Frame ↑',270,340),button('frame:sd','Frame SD',510,340),button('frame:hd','Frame HD',750,340));
            items.push(button('table:lower','Table ↓',30,440),button('table:higher','Table ↑',270,440));
        }
        items.push(button('skip','Skip tutorial',30,painting?414:584,460,{primary:true}),button('next','Continue',510,painting?414:584,460,{disabled:disabled || voice.playing || voice.paused || state.phase!=='explore'}));
        for(const item of items)item.disabled ||= disabled;
        const columns=4,rows=Math.ceil(items.length/columns),height=painting?560:700,cellHeight=(height-54)/Math.max(1,rows);
        items.forEach((item,index)=>{item.x=20+(index%columns)*240;item.y=24+Math.floor(index/columns)*cellHeight;item.width=200;item.height=Math.max(72,cellHeight-8);item.description ||= item.ariaLabel || item.label;item.ariaLabel ||= item.label;});
        return {painting,height,title:'Wrist controls',subtitle:'Raise your left wrist to reach controls.',expanded,items,onAction:act};
    }
    function act(id){
        if(stage.snapshot().exiting)return;
        if(['pause','replay','mute','skip','next'].includes(id))stage.button(id);
        else if(id==='reset')stage.resetObjects();
        else if(id.startsWith('input:'))stage.setInputMode(id.slice(6));
        else if(id.startsWith('paint-page:'))paintPage=id.slice(11);
        else if(id==='paint-tools')stage.trials.active==='painting'?stage.trials.close():stage.trials.open('painting');
        else if(id.startsWith('brush:'))(stage.trials.active==='painting'?stage.trials.paint:stage.paint).setBrush(id.slice(6));
        else if(id.startsWith('paint:colour:'))(stage.trials.active==='painting'?stage.trials.paint:stage.paint).setColour(Number(id.slice(13)));
        else if(id==='paint:undo')(stage.trials.active==='painting'?stage.trials.paint:stage.paint).undo();
        else if(id==='paint:clear')(stage.trials.active==='painting'?stage.trials.paint:stage.paint).clear();
        else if(id==='paint:fine')(stage.trials.active==='painting'?stage.trials.paint:stage.paint).setWidth(.002);
        else if(id==='paint:bold')(stage.trials.active==='painting'?stage.trials.paint:stage.paint).setWidth(.01);
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
