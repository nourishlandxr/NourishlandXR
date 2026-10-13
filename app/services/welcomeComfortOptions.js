import {getSpatialVisualSettings,setSpatialVisualSettings} from './spatialVisualSettings.js';
import {getWelcomeNarrationSettings,setWelcomeNarrationSettings} from './welcomePracticeVoice.js';
import {WELCOME_TRIALS} from './welcomeTrialState.js';
import {MARKING_BRUSHES} from './creatorMarkingBrushes.js';
import {PAINT_V2_COLOURS} from './spatialPaintV2.js';

// A pulse button opens six controls in two columns down the forearm.
export function createWelcomeComfortOptions({stage,onVisualChange=()=>{},onChange=()=>{}}={}){
    let page='home',opened=false;
    const paint=()=>stage.trials.active==='painting'?stage.trials.paint:stage.paint;
    const item=(id,label,icon,extra={})=>({action:'Comfort:'+id,label,ariaLabel:label,description:label,icon,kind:'utility',...extra});
    function context(){
        const state=stage.snapshot(),voice=state.voice || {},visual=getSpatialVisualSettings(),audio=getWelcomeNarrationSettings(),drawing=paint()?.snapshot?.() || {};
        const expanded=opened && page!=='home';
        const items=[item('toggle','Wrist menu',opened?'close':'pulse',{pulse:true,selected:opened})];
        if(opened)items.push(item('paint-tools','Brush tools','brush',{selected:page.startsWith('paint'),accent:'#8bbdd4'}),item('games','Games','games',{selected:page==='games',accent:'#c7ad76'}),item('input','Input mode','hand',{selected:page==='input',accent:'#a4c3a0'}),item('audio','Audio','audio',{selected:page==='audio',accent:'#b8a6d2'}),item('adjust','Comfort settings','settings',{selected:page==='settings',accent:'#83bfae'}),item('tutorial','Tutorial actions','lesson',{selected:page==='tutorial',accent:'#cb9c8b'}));
        items[0].worldBox={x:0,y:.059,size:.022};
        items.slice(1).forEach((button,i)=>{button.dock=true;button.worldBox={x:(i%2-.5)*.034,y:.020-Math.floor(i/2)*.034,size:.030};});
        const titles={games:'Games',input:'Input',audio:'Audio',settings:'Comfort',tutorial:'Tutorial','paint-brush':'Marking brushes','paint-colour':'Colour','paint-options':'Brush settings'};
        const options=[];
        if(expanded)options.push(item('home','Close tools','close',{header:true}));
        if(page==='games')options.push(...WELCOME_TRIALS.map(trial=>item('game:'+trial.id,trial.label,null,{selected:state.trials?.active===trial.id,text:true})));
        if(page==='input')options.push(...['controllers','gloves','hands'].map((mode,i)=>item('input:'+mode,['Controllers','Virtual hands','Hand tracking'][i],['controller','hand','hand'][i],{selected:(state.trials?.active?stage.trials.mode:state.inputMode)===mode,text:true})));
        if(page==='audio'){
            options.push(item('pause',voice.paused?'Resume narration':'Pause narration',voice.paused?'play':'pause',{selected:voice.paused}),item('replay','Repeat narration','repeat'),item('mute',voice.muted?'Unmute voice':'Mute voice',voice.muted?'mute':'audio',{selected:voice.muted}),item('volume','Voice volume','audio',{kind:'slider',value:audio.volume,min:0,max:2,step:.05,text:true}));
            if(stage.conversation){const listening=stage.conversation.state?.().listening;options.push(item('conversation:'+ (listening?'done':'voice'),listening?'Finish listening':'Listen again',listening?'stop':'mic'));options.push(...(stage.conversation.buttons?.() || []).map(button=>item('conversation:'+button.id,button.label,button.id==='confirm'?'check':'repeat')));}
        }
        if(page==='settings')options.push(item('graphics:auto','Automatic',null,{text:true,selected:visual.graphicsQuality==='auto'}),item('graphics:low','SD',null,{text:true,selected:visual.graphicsQuality==='low'}),item('graphics:high','HD',null,{text:true,selected:visual.graphicsQuality==='high'}),item('frame:lower','Lower Living Frame','down'),item('frame:higher','Raise Living Frame','up'),item('table:lower','Lower table','down'),item('table:higher','Raise table','up'));
        if(page==='tutorial')options.push(item('reset','Reset objects','repeat'),item('skip','End tutorial',null,{text:true,primary:true}),item('next','Continue to demo',null,{text:true,disabled:state.phase!=='explore' || voice.playing || voice.paused}));
        if(page==='paint-brush'){
            const choices=[...Object.entries(MARKING_BRUSHES).map(([id,brush])=>item('brush:'+id,brush.label,id,{selected:drawing.brush===id})),item('paint-page:colour','Colours','colour'),item('paint-page:options','Brush settings','settings'),item('paint:undo','Undo stroke','undo',{disabled:!drawing.canUndo})];
            const positions=[[.123,.012],[.102,-.020],[.144,-.020],[.085,-.052],[.161,-.052],[.083,-.091],[.123,-.091],[.163,-.091]];
            choices.forEach((button,i)=>{button.worldBox={x:positions[i][0],y:positions[i][1],size:.030};button.brushChoice=i<5;});
            options.push(...choices);
        }
        if(page==='paint-colour')options.push(...PAINT_V2_COLOURS.map((colour,i)=>item('paint:colour:'+i,['Mint','Rose','Gold','Blue','White','Charcoal','Coral','Lavender'][i],'colour',{color:colour,selected:drawing.colour===i})),item('paint-page:brush','Back to brushes','back'));
        if(page==='paint-options')options.push(item('paint-width','Stroke width','brush',{kind:'slider',value:drawing.width || .005,min:.001,max:.02,step:.001,text:true}),item('paint:undo','Undo','undo',{disabled:!drawing.canUndo}),item('paint:redo','Redo','redo',{disabled:!drawing.canRedo}),item('paint:motion','Animate markings','motion',{selected:drawing.motion}),item('paint:clear','Clear drawing','clear'),item('paint-page:brush','Back to brushes','back'));
        const grid=options.filter(button=>!button.header && !button.worldBox),columns=page==='paint-colour'?3:2;
        grid.forEach((button,i)=>{button.worldBox={x:.046+(i%columns+.5)*(.152/columns),y:.012-Math.floor(i/columns)*.029,w:.152/columns-.004,h:.025};});
        const gridBottom=grid.length?.012-(Math.ceil(grid.length/columns)-1)*.029-.0125:-.065;
        if(state.trials?.active && expanded){const y=Math.min(-.075,gridBottom-.020);options.push(item('game-reset','Reset activity','repeat',{worldBox:{x:.081,y,size:.027}}),item('game-close','Return to tutorial','back',{worldBox:{x:.162,y,size:.027}}));}
        const header=options.find(button=>button.header);if(header)header.worldBox={x:.184,y:.052,size:.027};
        const visibleOptions=expanded?options:[],all=[...items,...visibleOptions];
        const bounds=opened?{left:-.034,right:expanded?.202:.034,top:.073,bottom:Math.min(-.067,...visibleOptions.map(button=>button.worldBox.y-(button.worldBox.h || button.worldBox.size)/2-.004))}:{left:-.014,right:.014,top:.073,bottom:.045};
        const width=bounds.right-bounds.left,height=Math.round((bounds.top-bounds.bottom)/width*1000),centerOffset={x:(bounds.left+bounds.right)/2,y:(bounds.top+bounds.bottom)/2};
        for(const button of all){const box=button.worldBox,w=box.w || box.size,h=box.h || box.size;Object.assign(button,{x:(box.x-w/2-bounds.left)/width*1000,y:(bounds.top-box.y-h/2)/width*1000,width:w/width*1000,height:h/width*1000,disabled:Boolean(button.disabled || state.exiting)});}
        return {wrist:true,page,opened,expanded,painting:page.startsWith('paint'),width,height,bounds,centerOffset,title:titles[page] || 'Wrist controls',subtitle:expanded?state.trials?.gameHint || '':'',items:all,onAction:act,onValue:setValue};
    }
    function setValue(id,value){
        if(stage.snapshot().exiting || !Number.isFinite(value))return;
        if(id==='volume')setWelcomeNarrationSettings({volume:Math.max(0,Math.min(2,value))});
        if(id==='paint-width')paint()?.setWidth(Math.max(.001,Math.min(.02,value)));
        onChange();
    }
    function act(id){
        if(stage.snapshot().exiting)return;
        if(id==='toggle'){opened=!opened;page='home';}
        else if(id==='home')page='home';
        else if(['games','input','audio','tutorial','adjust'].includes(id)){const next=id==='adjust'?'settings':id;page=page===next?'home':next;}
        else if(id==='paint-tools'){if(stage.snapshot().phase!=='brush' && stage.trials.active!=='painting')stage.trials.open('painting');page=page.startsWith('paint')?'home':'paint-brush';}
        else if(id.startsWith('paint-page:'))page='paint-'+id.slice(11);
        else if(id.startsWith('game:')){stage.trials.open(id.slice(5));page='home';}
        else if(id==='game-reset')stage.trials.command('reset');
        else if(id==='game-close'){stage.trials.close();page='home';}
        else if(id.startsWith('conversation:'))stage.conversation?.activate(id.slice(13));
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
        if(id!=='toggle')opened=true;onChange();
    }
    return {context,act,setValue};
}
export function welcomePracticeVisualGuide(){return {image:'',caption:''};}
