import {getSpatialVisualSettings,setSpatialVisualSettings} from './spatialVisualSettings.js';
import {getWelcomeNarrationSettings,setWelcomeNarrationSettings} from './welcomePracticeVoice.js';
import {WELCOME_TRIALS} from './welcomeTrialState.js';
import {MARKING_BRUSHES} from './creatorMarkingBrushes.js';
import {PAINT_V2_COLOURS} from './spatialPaintV2.js';

// Six familiar actions on the forearm. Expanded tools stay beside the dock.
export function createWelcomeComfortOptions({stage,onVisualChange=()=>{},onChange=()=>{}}={}){
    let page='home';
    const paint=()=>stage.trials.active==='painting'?stage.trials.paint:stage.paint;
    const item=(id,label,icon,extra={})=>({action:'Comfort:'+id,label,ariaLabel:label,description:label,icon,kind:'utility',...extra});
    function context(){
        const state=stage.snapshot(),voice=state.voice || {},visual=getSpatialVisualSettings(),audio=getWelcomeNarrationSettings(),drawing=paint()?.snapshot?.() || {};
        const expanded=page!=='home',width=expanded?.28:.12,height=Math.round((expanded?.19:.11)/width*1000);
        const items=[item('paint-tools','Brush tools','brush',{selected:page.startsWith('paint')}),item('games','Games','games',{selected:page==='games'}),item('input','Input mode','hand',{selected:page==='input'}),item('audio','Audio','audio',{selected:page==='audio'}),item('adjust','Comfort settings','settings',{selected:page==='settings'}),item('tutorial','Tutorial actions','lesson',{selected:page==='tutorial'})];
        const dockCenter=expanded?-.08:0;
        items.forEach((button,i)=>{
            const x=dockCenter+(i%3-1)*.04,y=(.5-Math.floor(i/3))*.044,size=.034;
            Object.assign(button,{x:(.5+(x-size/2)/width)*1000,y:height/2-(y+size/2)/width*1000,width:size/width*1000,height:size/width*1000,dock:true});
        });
        const titles={games:'Games',input:'Input',audio:'Audio',settings:'Comfort',tutorial:'Tutorial','paint-brush':'Marking brushes','paint-colour':'Colour','paint-options':'Brush settings'};
        const options=[];
        if(expanded)options.push(item('home','Close tools','close',{header:true,x:884,y:18,width:92,height:92}));
        if(page==='games')options.push(...WELCOME_TRIALS.map(trial=>item('game:'+trial.id,trial.label,null,{selected:state.trials?.active===trial.id,text:true})));
        if(page==='input')options.push(...['controllers','gloves','hands'].map((mode,i)=>item('input:'+mode,['Controllers','Virtual hands','Hand tracking'][i],['controller','hand','hand'][i],{selected:(state.trials?.active?stage.trials.mode:state.inputMode)===mode,text:true})));
        if(page==='audio')options.push(item('pause',voice.paused?'Resume narration':'Pause narration',voice.paused?'play':'pause',{selected:voice.paused}),item('replay','Repeat narration','repeat'),item('mute',voice.muted?'Unmute voice':'Mute voice',voice.muted?'mute':'audio',{selected:voice.muted}),item('volume','Voice volume','audio',{kind:'slider',value:audio.volume,min:0,max:1,step:.05,text:true}));
        if(page==='settings')options.push(item('graphics:auto','Automatic',null,{text:true,selected:visual.graphicsQuality==='auto'}),item('graphics:low','SD',null,{text:true,selected:visual.graphicsQuality==='low'}),item('graphics:high','HD',null,{text:true,selected:visual.graphicsQuality==='high'}),item('frame:lower','Lower Living Frame','down'),item('frame:higher','Raise Living Frame','up'),item('table:lower','Lower table','down'),item('table:higher','Raise table','up'));
        if(page==='tutorial')options.push(item('reset','Reset objects','repeat'),item('skip','End tutorial',null,{text:true,primary:true}),item('next','Continue to demo',null,{text:true,disabled:state.phase!=='explore' || voice.playing || voice.paused}));
        if(page==='paint-brush'){
            const choices=[...Object.entries(MARKING_BRUSHES).map(([id,brush])=>item('brush:'+id,brush.label,id,{selected:drawing.brush===id})),item('paint-page:colour','Colours','colour'),item('paint-page:options','Brush settings','settings'),item('paint:undo','Undo stroke','undo',{disabled:!drawing.canUndo})];
            choices.forEach((button,i)=>{const angle=-Math.PI/2+i*Math.PI/4;Object.assign(button,{radial:{x:735,y:355,inner:105,outer:245,start:angle-Math.PI/8,end:angle+Math.PI/8},x:735+175*Math.cos(angle)-50,y:355+175*Math.sin(angle)-50,width:100,height:100});});
            options.push(...choices);
        }
        if(page==='paint-colour')options.push(...PAINT_V2_COLOURS.map((colour,i)=>item('paint:colour:'+i,['Mint','Rose','Gold','Blue','White','Charcoal','Coral','Lavender'][i],'colour',{color:colour,selected:drawing.colour===i})),item('paint-page:brush','Back to brushes','back'));
        if(page==='paint-options')options.push(item('paint-width','Stroke width','brush',{kind:'slider',value:drawing.width || .005,min:.001,max:.02,step:.001,text:true}),item('paint:undo','Undo','undo',{disabled:!drawing.canUndo}),item('paint:redo','Redo','redo',{disabled:!drawing.canRedo}),item('paint:motion','Animate markings','motion',{selected:drawing.motion}),item('paint:clear','Clear drawing','clear'),item('paint-page:brush','Back to brushes','back'));
        const grid=options.filter(button=>!button.header && !button.radial),columns=page==='settings' || page==='paint-colour'?3:2;
        grid.forEach((button,i)=>{const cell=500/columns,row=page==='games'?128:page==='settings'?150:128;Object.assign(button,{x:480+i%columns*cell,y:128+Math.floor(i/columns)*row,width:cell-18,height:110});});
        if(state.trials?.active && expanded && page!=='paint-brush')options.push(item('game-reset','Reset activity','repeat',{x:42,y:height-150,width:120,height:120}),item('game-close','Return to tutorial','back',{x:210,y:height-150,width:120,height:120}));
        items.push(...options);for(const button of items)button.disabled=Boolean(button.disabled || state.exiting);
        return {wrist:true,page,expanded,painting:page.startsWith('paint'),width,height,dockCenter,title:titles[page] || 'Wrist controls',subtitle:state.trials?.gameHint || '',items,onAction:act,onValue:setValue};
    }
    function setValue(id,value){
        if(stage.snapshot().exiting || !Number.isFinite(value))return;
        if(id==='volume')setWelcomeNarrationSettings({volume:Math.max(0,Math.min(1,value))});
        if(id==='paint-width')paint()?.setWidth(Math.max(.001,Math.min(.02,value)));
        onChange();
    }
    function act(id){
        if(stage.snapshot().exiting)return;
        if(id==='home')page='home';
        else if(['games','input','audio','tutorial','adjust'].includes(id)){const next=id==='adjust'?'settings':id;page=page===next?'home':next;}
        else if(id==='paint-tools'){if(stage.snapshot().phase!=='brush' && stage.trials.active!=='painting')stage.trials.open('painting');page=page.startsWith('paint')?'home':'paint-brush';}
        else if(id.startsWith('paint-page:'))page='paint-'+id.slice(11);
        else if(id.startsWith('game:')){stage.trials.open(id.slice(5));page='home';}
        else if(id==='game-reset')stage.trials.command('reset');
        else if(id==='game-close'){stage.trials.close();page='home';}
        else if(['pause','replay','mute','skip','next'].includes(id))stage.button(id);
        else if(id==='reset')stage.resetObjects();
        else if(id.startsWith('input:'))stage.setInputMode(id.slice(6));
        else if(id.startsWith('brush:'))paint()?.setBrush(id.slice(6));
        else if(id.startsWith('paint:colour:'))paint()?.setColour(Number(id.slice(13)));
        else if(id==='paint:undo')paint()?.undo();
        else if(id==='paint:redo')paint()?.redo();
        else if(id==='paint:clear')paint()?.clear();
        else if(id==='paint:motion')paint()?.setMotion(!paint().snapshot().motion);
        else if(id.startsWith('graphics:')){setSpatialVisualSettings({graphicsQuality:id.slice(9)});onVisualChange();}
        else if(id.startsWith('frame:')){setSpatialVisualSettings({livingFrameHeight:getSpatialVisualSettings().livingFrameHeight+(id.endsWith('higher')?.05:-.05)});onVisualChange();}
        else if(id.startsWith('table:')){const value=setSpatialVisualSettings({practiceTableHeight:getSpatialVisualSettings().practiceTableHeight+(id.endsWith('higher')?.05:-.05)});stage.setTableHeightOffset(value.practiceTableHeight);}
        onChange();
    }
    return {context,act,setValue};
}
export function welcomePracticeVisualGuide(){return {image:'',caption:''};}
