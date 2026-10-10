import {spatialNote} from './spatialNotes.js';
import {WIDGET_LIMIT} from './noteWidgets.js';
import {TOTEM_MODEL_CHOICES,renderedTotemStyle} from './totemAppearance.js';
export const TOTEM_LIGHTS=[{label:'Teal',color:'#38d1dc'},{label:'Amber',color:'#ecc276'},{label:'Leaf',color:'#a5db8d'},{label:'Rose',color:'#eaa8b9'}];
export function focusSpatialObjectControls(panel,record,{save=async()=>{},edit=()=>{},open=()=>{},refresh=()=>{},demo=false}={}) {
    let marker=record.marker || record;
    const type=record.demoType || marker.type;
    if(type!=='note' && !['zone','area_checkpoint','intro_checkpoint','special'].includes(type))return false;
    const focus=()=>{
        marker=record.marker || record;
        const note=spatialNote(marker),appearance=marker.appearance || {};
        const signsVisible=record.demoTotemSignsVisible ?? record.totemSignsVisible ?? appearance.signsVisible ?? false;
        const modelIndex=Math.max(0,TOTEM_MODEL_CHOICES.findIndex(item=>item.id===renderedTotemStyle(marker))),model=TOTEM_MODEL_CHOICES[modelIndex];
        const actions=type==='note'?[
            ...['plain','interactive','dynamic'].map(value=>({id:'type:'+value,label:value[0].toUpperCase()+value.slice(1),selected:note.type===value,description:value==='plain'?'A compact spatial message.':value==='interactive'?'A Note with a visitor action.':'Main spatial Note + optional widgets.'})),
            {id:'edit',label:'✎ Edit Note',description:'Edit the title and information. Select a text field to open the keyboard.'},
            ...(note.type!=='plain'?[{id:'open',label:note.type==='dynamic'?'Open widgets':'Try interaction'}]:[]),
            ...(note.type==='dynamic'?[{id:'library',label:'+ ADD WIDGET',disabled:note.widgets.length>=WIDGET_LIMIT},...note.widgets.map(item=>({id:'widget:'+item.id,label:'✎ '+item.title,description:'Edit, reorder or remove this widget.'}))]:[])
        ]:[
            {id:'previous-model',group:'Choose your Totem',label:'← Previous',description:'Rotate through eight Totems, like choosing a character.'},
            {id:'preview-light',group:'Choose your Totem',label:`${model.label} · ${modelIndex+1}/8`,selected:true,description:model.description+' Select to preview its communication light.'},
            {id:'next-model',group:'Choose your Totem',label:'Next →',description:'Choose a form to represent this ecosystem, guild or area.'},
            ...TOTEM_LIGHTS.map(item=>({id:'light:'+item.color,group:'Lights',kind:'swatch',color:item.color,label:item.label,selected:appearance.notificationColor===item.color,description:'Change the glass notification tip colour.'})),
            {id:'signs',group:'Signage',label:'Signage',selected:signsVisible,description:'Toggle the direction and information signs attached to this Totem.'},
            ...(!demo?[{id:'edit',group:'Signage',label:'✎ Edit Totem',description:'Edit the title and information.'}]:[])
        ];
        panel?.setObjectContext({title:`Controls · ${type==='note'?'Note':'Totem'}`,linkedName:type==='note'?(marker.name || 'Note'):model.label,hint:type==='note'?'Choose a Note experience, add widgets or use the pencil to edit.':model.description+' Previous / Next rotates through eight designs. Select the name to preview the light. Grip moves it; trigger opens signage.',actions,onAction:act});
    };
    const act=async action=>{
        marker=record.marker || record;
        if(action==='edit' || action.startsWith('widget:')){edit(record,action.startsWith('widget:')?action.slice(7):'');return;}
        if(action==='open'){open(record);return;}
        if(action==='library'){open(record,{expandWidgets:true,showAddPanel:true});return;}
        if(action==='preview-light'){record.communicationSignal={startedAt:performance.now(),duration:4200};refresh(record);return;}
        if(action==='previous-model' || action==='next-model'){
            const index=Math.max(0,TOTEM_MODEL_CHOICES.findIndex(item=>item.id===renderedTotemStyle(marker)));
            action='style:'+TOTEM_MODEL_CHOICES[(index+(action==='next-model'?1:7))%8].id;
        }
        const before=structuredClone(marker.appearance || {}),oldSigns=record.demoTotemSignsVisible,oldTotemSigns=record.totemSignsVisible,oldInfo=record.infoVisible;
        marker.appearance={...marker.appearance};
        if(action.startsWith('type:'))marker.appearance.spatial_note={...spatialNote(marker),type:action.slice(5)};
        if(action.startsWith('style:')){
            const model=TOTEM_MODEL_CHOICES.find(item=>item.id===action.slice(6));
            if(!model)return;
            marker.appearance.totemStyle=model.id;marker.appearance.totemStyleExplicit=true;
            marker.appearance.heightPreset=model.secondary?'secondary':'area';
            if(model.color)marker.appearance.notificationColor=model.color;
        }
        if(action.startsWith('light:'))marker.appearance.notificationColor=action.slice(6);
        if(action==='signs'){const visible=!(record.demoTotemSignsVisible ?? record.totemSignsVisible ?? marker.appearance.signsVisible ?? false);record.demoTotemSignsVisible=visible;record.totemSignsVisible=visible;marker.appearance.signsVisible=visible;record.demoSignsChangedAt=performance.now();record.infoVisible=visible;}
        try{await save(record);
            if(demo && action.startsWith('style:') && !record.demoMapPiece){
                const ground=record.groundBaseY ?? record.position.y-(record.demoHalfHeight || 1.25);
                record.demoHalfHeight=marker.appearance.heightPreset==='secondary'?.675:1.25;
                record.groundBaseY=ground;record.position.y=ground+record.demoHalfHeight;
            }
            if(action.startsWith('style:') || action.startsWith('light:'))record.communicationSignal={startedAt:performance.now(),duration:4200};
            refresh(record);focus();if(action.startsWith('add:'))open(record,{expandWidgets:true,showAddPanel:true});}
        catch(error){marker.appearance=before;record.demoTotemSignsVisible=oldSigns;record.totemSignsVisible=oldTotemSigns;record.infoVisible=oldInfo;focus();panel?.setContextualHint('Could not save: '+error.message);}
    };
    panel?.restore?.();panel?.showLearning({title:marker.name || 'Spatial object',body:marker.description || marker.notes || 'Information attached to this place.',mesh:'note'});focus();panel?.setExplorerOpen?.(true);return true;
}
