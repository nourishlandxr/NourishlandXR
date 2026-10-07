import {spatialNote} from './spatialNotes.js';
import {WIDGET_LIMIT} from './noteWidgets.js';
import {TOTEM_STYLES} from './totemAppearance.js';
export const TOTEM_LIGHTS=[{label:'Teal',color:'#38d1dc'},{label:'Amber',color:'#ecc276'},{label:'Leaf',color:'#a5db8d'},{label:'Rose',color:'#eaa8b9'}];
export function focusSpatialObjectControls(panel,record,{save=async()=>{},edit=()=>{},open=()=>{},refresh=()=>{},demo=false}={}) {
    let marker=record.marker || record;
    const type=record.demoType || marker.type;
    if(type!=='note' && !['zone','area_checkpoint','intro_checkpoint','special'].includes(type))return false;
    const focus=()=>{
        marker=record.marker || record;
        const note=spatialNote(marker),appearance=marker.appearance || {};
        const signsVisible=record.demoTotemSignsVisible ?? record.totemSignsVisible ?? appearance.signsVisible ?? false;
        const actions=type==='note'?[
            ...['plain','interactive','dynamic'].map(value=>({id:'type:'+value,label:value[0].toUpperCase()+value.slice(1),selected:note.type===value,description:value==='plain'?'A compact spatial message.':value==='interactive'?'A Note with a visitor action.':'Main spatial Note + optional widgets.'})),
            {id:'edit',label:'✎ Edit Note',description:'Edit the title and information. Select a text field to open the keyboard.'},
            ...(note.type!=='plain'?[{id:'open',label:note.type==='dynamic'?'Open widgets':'Try interaction'}]:[]),
            ...(note.type==='dynamic'?[{id:'library',label:'+ ADD WIDGET',disabled:note.widgets.length>=WIDGET_LIMIT},...note.widgets.map(item=>({id:'widget:'+item.id,label:'✎ '+item.title,description:'Edit, reorder or remove this widget.'}))]:[])
        ]:[
            ...(demo?TOTEM_STYLES.slice(0,4):TOTEM_STYLES).map((item,i)=>({id:'style:'+item.id,group:'Totem model',label:String(i+1),ariaLabel:item.label,selected:(appearance.totemStyle || 'basic')===item.id,description:item.description})),
            ...TOTEM_LIGHTS.map(item=>({id:'light:'+item.color,group:'Lights',kind:'swatch',color:item.color,label:item.label,selected:appearance.notificationColor===item.color,description:'Change the glass notification tip colour.'})),
            {id:'signs',group:'Signage',label:'Signage',selected:signsVisible,description:'Toggle the direction and information signs attached to this Totem.'},
            ...(!demo?[{id:'edit',group:'Signage',label:'✎ Edit Totem',description:'Edit the title and information.'}]:[])
        ];
        panel?.setObjectContext({title:`Controls · ${type==='note'?'Note':'Totem'}`,linkedName:marker.name || marker.label || 'Spatial object',hint:type==='note'?'Choose a Note experience, add widgets or use the pencil to edit.':'Top ↔ button opens signage. Lower ◐ button fades or restores the Totem. Select a sign to explore its destination. Model buttons change its shape; coloured buttons change its notification light. Grip moves it; trigger interacts.',actions,onAction:act});
    };
    const act=async action=>{
        marker=record.marker || record;
        if(action==='edit' || action.startsWith('widget:')){edit(record,action.startsWith('widget:')?action.slice(7):'');return;}
        if(action==='open'){open(record);return;}
        if(action==='library'){open(record,{expandWidgets:true,showAddPanel:true});return;}
        const before=structuredClone(marker.appearance || {}),oldSigns=record.demoTotemSignsVisible,oldTotemSigns=record.totemSignsVisible,oldInfo=record.infoVisible;
        marker.appearance={...marker.appearance};
        if(action.startsWith('type:'))marker.appearance.spatial_note={...spatialNote(marker),type:action.slice(5)};
        if(action.startsWith('style:')){marker.appearance.totemStyle=action.slice(6);marker.appearance.totemStyleExplicit=true;}
        if(action.startsWith('light:'))marker.appearance.notificationColor=action.slice(6);
        if(action==='signs'){const visible=!(record.demoTotemSignsVisible ?? record.totemSignsVisible ?? marker.appearance.signsVisible ?? false);record.demoTotemSignsVisible=visible;record.totemSignsVisible=visible;marker.appearance.signsVisible=visible;record.demoSignsChangedAt=performance.now();record.infoVisible=visible;}
        try{await save(record);refresh(record);focus();if(action.startsWith('add:'))open(record,{expandWidgets:true,showAddPanel:true});}
        catch(error){marker.appearance=before;record.demoTotemSignsVisible=oldSigns;record.totemSignsVisible=oldTotemSigns;record.infoVisible=oldInfo;focus();panel?.setContextualHint('Could not save: '+error.message);}
    };
    panel?.restore?.();panel?.showLearning({title:marker.name || 'Spatial object',body:marker.description || marker.notes || 'Information attached to this place.',mesh:'note'});focus();panel?.setExplorerOpen?.(true);return true;
}
