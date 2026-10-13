import {getSpatialVisualSettings,setSpatialVisualSettings} from './spatialVisualSettings.js';
import {getWelcomeNarrationSettings,setWelcomeNarrationSettings} from './welcomePracticeVoice.js';
import {WELCOME_TRIALS} from './welcomeTrialState.js';
import {MARKING_BRUSHES} from './creatorMarkingBrushes.js';
import {PAINT_V2_COLOURS} from './spatialPaintV2.js';

// Right thumbstick toggles settings; hand tracking retains an icon entry.
export function createWelcomeComfortOptions({stage,onVisualChange=()=>{},onChange=()=>{}}={}){
    let page='home',opened=false;
    const paint=()=>stage.trials.active==='painting'?stage.trials.paint:stage.paint;
    const item=(id,label,icon,extra={})=>({action:'Comfort:'+id,label,ariaLabel:label,description:label,icon,kind:'utility',...extra});
    function context(){
        const state=stage.snapshot(),voice=state.voice || {},visual=getSpatialVisualSettings(),audio=getWelcomeNarrationSettings(),drawing=paint()?.snapshot?.() || {};
        if(state.settingsAvailable===false){opened=false;page='home';}
        if((page.startsWith('paint') || page==='controller-tools') && state.controllerTool==='standard')page='home';
        const expanded=opened && page!=='home';
        const items=[item('toggle','Wrist menu',opened?'close':'settings',{selected:opened})];
        if(opened)items.push(item('reset','Reset objects','repeat',{accent:'#8bbdd4'}),item('games','Games','games',{selected:page==='games',accent:'#c7ad76'}),item('input','Change controllers','controller',{selected:page==='input',accent:'#a4c3a0'}),item('audio','Audio','audio',{selected:page==='audio',accent:'#b8a6d2'}),item('adjust','Comfort settings','settings',{selected:page==='settings',accent:'#83bfae'}),item('tutorial','Tutorial actions','lesson',{selected:page==='tutorial',accent:'#cb9c8b'}));
        items[0].worldBox={x:0,y:.059,size:.022};
        items.slice(1).forEach((button,i)=>{button.dock=true;button.worldBox={x:(i%2-.5)*.034,y:.020-Math.floor(i/2)*.034,size:.030};});
        const titles={games:'Games',input:'Controllers',audio:'Audio',settings:'Comfort',tutorial:'Tutorial','paint-brush':'Marking brushes','paint-colour':'Colour','paint-options':'Brush settings'};
        const options=[];
        if(expanded)options.push(item('home','Close tools','close',{header:true}));
        if(page==='games')options.push(...WELCOME_TRIALS.map(trial=>item('game:'+trial.id,trial.label,null,{selected:state.trials?.active===trial.id,text:true})));
        if(page==='input'){
            options.push(item('tool:standard','Standard controllers','controller',{selected:state.controllerTool==='standard',text:true}),item('tool:paint','Precision paint','triangle',{selected:state.controllerTool==='paint',text:true}),item('tool:insect','Insect flight','firefly',{selected:state.controllerTool==='insect',disabled:!state.insectControllerAvailable,text:true}));
            options.push(...['controllers','gloves','hands'].map((mode,i)=>item('input:'+mode,['Controllers','Virtual hands','Hand tracking'][i],['controller','hand','hand'][i],{selected:(state.trials?.active?stage.trials.mode:state.inputMode)===mode && state.controllerTool==='standard',text:true})));
        }
        if(page==='audio'){
            options.push(item('pause',voice.paused?'Resume narration':'Pause narration',voice.paused?'play':'pause',{selected:voice.paused}),item('replay','Repeat narration','repeat'),item('mute',voice.muted?'Unmute voice':'Mute voice',voice.muted?'mute':'audio',{selected:voice.muted}),item('volume','Voice volume','audio',{kind:'slider',value:audio.volume,min:0,max:2,step:.05,text:true}));
            if(stage.conversation){const listening=stage.conversation.state?.().listening;options.push(item('conversation:'+ (listening?'done':'voice'),listening?'Finish listening':'Listen again',listening?'stop':'mic'));options.push(...(stage.conversation.buttons?.() || []).map(button=>item('conversation:'+button.id,button.label,button.id==='confirm'?'check':'repeat')));}
        }
        if(page==='settings'){
            options.push(...['auto','low','high'].map((quality,i)=>item('graphics:'+quality,['Auto','SD','HD'][i],null,{text:true,selected:visual.graphicsQuality===quality,worldBox:{x:.069+i*.050,y:.016,w:.046,h:.024}})));
            options.push(item('frame-height','Frame height','up',{kind:'slider',value:visual.livingFrameHeight,min:-1,max:1,step:.05,text:true,worldBox:{x:.122,y:-.027,w:.142,h:.034}}),item('table-height','Table height','up',{kind:'slider',value:visual.practiceTableHeight,min:-.2,max:.25,step:.025,text:true,worldBox:{x:.122,y:-.073,w:.142,h:.034}}));
        }
        if(page==='tutorial')options.push(item('reset','Reset objects','repeat'),item('skip','End tutorial',null,{text:true,primary:true}),item('next','Continue to demo',null,{text:true,disabled:state.phase!=='explore' || voice.playing || voice.paused}));
        if(page==='paint-brush'){
            const choices=[...Object.entries(MARKING_BRUSHES).map(([id,brush])=>item('brush:'+id,brush.label,id,{selected:drawing.brush===id})),item('paint-page:colour','Colours','colour'),item('paint-page:options','Brush settings','settings'),item('paint:undo','Undo stroke','undo',{disabled:!drawing.canUndo})];
            const positions=[[.123,.012],[.102,-.020],[.144,-.020],[.085,-.052],[.161,-.052],[.083,-.091],[.123,-.091],[.163,-.091]];
            choices.forEach((button,i)=>{button.worldBox={x:positions[i][0],y:positions[i][1],size:.030};button.brushChoice=i<5;});
            options.push(...choices);
        }
        if(page==='paint-colour')options.push(...PAINT_V2_COLOURS.map((colour,i)=>item('paint:colour:'+i,['Mint','Rose','Gold','Blue','White','Charcoal','Coral','Lavender'][i],'colour',{color:colour,selected:drawing.colour===i})),item('paint-page:brush','Back to brushes','back'));
        if(page==='paint-options')options.push(item('paint-width','Stroke width','brush',{kind:'slider',value:drawing.width || .005,min:.001,max:.02,step:.001,text:true}),item('paint:undo','Undo','undo',{disabled:!drawing.canUndo}),item('paint:redo','Redo','redo',{disabled:!drawing.canRedo}),item('paint:motion','Animate markings','motion',{selected:drawing.motion}),item('paint:clear','Clear drawing','clear'),item('paint-page:brush','Back to brushes','back'));
        const controllerMounted=page.startsWith('paint') && state.controllerTool==='paint' || page==='controller-tools' && state.controllerTool==='insect';
        if(controllerMounted){
            items.length=0;
            items.push(item('controller-toggle','Close controller tools','close',{worldBox:{x:.184,y:.052,size:.027}}));
            const header=options.find(button=>button.header);if(header)options.splice(options.indexOf(header),1);
            options.push(item('tool:standard','Standard controllers','controller',{worldBox:{x:.068,y:.090,w:.044,h:.026}}),item('tool:insect','Insect flight','firefly',{selected:state.controllerTool==='insect',disabled:!state.insectControllerAvailable,worldBox:{x:.122,y:.090,w:.044,h:.026}}),item('tool:paint','Precision paint','triangle',{selected:state.controllerTool==='paint',worldBox:{x:.176,y:.090,w:.044,h:.026}}));
        }
        const grid=options.filter(button=>!button.header && !button.worldBox),columns=page==='paint-colour'?3:2;
        grid.forEach((button,i)=>{button.worldBox={x:.046+(i%columns+.5)*(.152/columns),y:.012-Math.floor(i/columns)*.029,w:.152/columns-.004,h:.025};});
        const gridBottom=grid.length?.012-(Math.ceil(grid.length/columns)-1)*.029-.0125:-.065;
        if(state.trials?.active && expanded){const y=Math.min(-.075,gridBottom-.020);options.push(item('game-reset','Reset activity','repeat',{worldBox:{x:.081,y,size:.027}}),item('game-close','Return to tutorial','back',{worldBox:{x:.162,y,size:.027}}));}
        const header=options.find(button=>button.header);if(header)header.worldBox={x:.184,y:.052,size:.027};
        const visibleOptions=expanded?options:[],all=[...items,...visibleOptions].filter(button=>state.settingsAvailable!==false && (button.action!=='Comfort:toggle' || state.inputMode==='hands' || opened));
        const bounds=controllerMounted?{left:.043,right:.202,top:.109,bottom:Math.min(-.035,...visibleOptions.map(button=>button.worldBox.y-(button.worldBox.h || button.worldBox.size)/2-.004))}:opened?{left:-.034,right:expanded?.202:.034,top:.073,bottom:Math.min(-.067,...visibleOptions.map(button=>button.worldBox.y-(button.worldBox.h || button.worldBox.size)/2-.004))}:{left:-.014,right:.014,top:.073,bottom:.045};
        const width=bounds.right-bounds.left,height=Math.round((bounds.top-bounds.bottom)/width*1000),centerOffset={x:(bounds.left+bounds.right)/2,y:(bounds.top+bounds.bottom)/2};
        for(const button of all){const box=button.worldBox,w=box.w || box.size,h=box.h || box.size;Object.assign(button,{x:(box.x-w/2-bounds.left)/width*1000,y:(bounds.top-box.y-h/2)/width*1000,width:w/width*1000,height:h/width*1000,disabled:Boolean(button.disabled || state.exiting)});}
        if(state.phase==='brush' && state.controllerTool!=='paint'){const target=!opened?'toggle':page==='input'?'tool:paint':'input';const button=all.find(item=>item.action==='Comfort:'+target);if(button)button.guided=true;}
        return {wrist:true,controllerMounted,anchorHand:controllerMounted?'right':'left',page,opened,expanded,painting:page.startsWith('paint'),width,height,bounds,centerOffset,title:titles[page] || (controllerMounted?'Controller tools':'Wrist controls'),subtitle:expanded?state.trials?.gameHint || '':'',items:all,onAction:act,onValue:setValue};
    }
    function setValue(id,value){
        if(stage.snapshot().exiting || !Number.isFinite(value))return;
        if(id==='volume')setWelcomeNarrationSettings({volume:Math.max(0,Math.min(2,value))});
        if(id==='paint-width')paint()?.setWidth(Math.max(.001,Math.min(.02,value)));
        if(id==='frame-height'){setSpatialVisualSettings({livingFrameHeight:value});onVisualChange();}
        if(id==='table-height'){const settings=setSpatialVisualSettings({practiceTableHeight:value});stage.setTableHeightOffset(settings.practiceTableHeight);}
        onChange();
    }
    function act(id){
        if(stage.snapshot().exiting || stage.snapshot().settingsAvailable===false)return;
        if(id==='toggle'){opened=!opened;page='home';}
        else if(id==='controller-toggle'){opened=!opened;page=opened && stage.snapshot().controllerTool==='paint'?'paint-brush':opened && stage.snapshot().controllerTool==='insect'?'controller-tools':'home';}
        else if(id==='home')page='home';
        else if(['games','input','audio','tutorial','adjust'].includes(id)){const next=id==='adjust'?'settings':id;page=page===next?'home':next;}
        else if(id==='paint-tools'){page=stage.snapshot().controllerTool!=='paint'?'input':page.startsWith('paint')?'home':'paint-brush';}
        else if(id.startsWith('paint-page:'))page='paint-'+id.slice(11);
        else if(id.startsWith('game:')){stage.trials.open(id.slice(5));page='home';}
        else if(id==='game-reset')stage.trials.command('reset');
        else if(id==='game-close'){stage.trials.close();page='home';}
        else if(id.startsWith('conversation:'))stage.conversation?.activate(id.slice(13));
        else if(['pause','replay','mute','skip','next'].includes(id))stage.button(id);
        else if(id==='reset')stage.resetObjects();
        else if(id.startsWith('tool:')){const tool=id.slice(5);if(tool==='insect' && !stage.snapshot().insectControllerAvailable)return;if(tool==='paint' && !['brush','fruit','paint-pot','grab'].includes(stage.snapshot().phase) && stage.trials.active!=='painting')stage.trials.open('painting');if(stage.setControllerTool?.(tool)!==false)page=tool==='paint'?'paint-brush':tool==='insect'?'controller-tools':'input';}
        else if(id.startsWith('input:')){stage.setControllerTool?.('standard');stage.setInputMode(id.slice(6));}
        else if(id.startsWith('brush:'))paint()?.setBrush(id.slice(6));
        else if(id.startsWith('paint:colour:'))paint()?.setColour(Number(id.slice(13)));
        else if(id==='paint:undo')paint()?.undo();
        else if(id==='paint:redo')paint()?.redo();
        else if(id==='paint:clear')paint()?.clear();
        else if(id==='paint:motion')paint()?.setMotion(!paint().snapshot().motion);
        else if(id.startsWith('graphics:')){setSpatialVisualSettings({graphicsQuality:id.slice(9)});onVisualChange();}
        else if(id.startsWith('frame:')){setSpatialVisualSettings({livingFrameHeight:getSpatialVisualSettings().livingFrameHeight+(id.endsWith('higher')?.05:-.05)});onVisualChange();}
        else if(id.startsWith('table:')){const value=setSpatialVisualSettings({practiceTableHeight:getSpatialVisualSettings().practiceTableHeight+(id.endsWith('higher')?.05:-.05)});stage.setTableHeightOffset(value.practiceTableHeight);}
        if(!['toggle','controller-toggle'].includes(id))opened=true;onChange();
    }
    return {context,act,setValue};
}
export function welcomePracticeVisualGuide(){return {image:'',caption:''};}
