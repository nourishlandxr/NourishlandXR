import {createNoteWidget, WIDGET_LIMIT} from './noteWidgets.js';
export const NOTE_TYPES = Object.freeze([
    {id:'plain',label:'Plain',description:'One compact message attached to a place.'},
    {id:'interactive',label:'Interactive',description:'A message with a visitor action, hint or discovery.'},
    {id:'dynamic',label:'Dynamic',description:'A main spatial Note with optional connected widgets.'}
]);
export function spatialNote(marker) {
    const data=marker?.appearance?.spatial_note || {};
    const type=NOTE_TYPES.some(item=>item.id===data.type)?data.type:'plain';
    return {...data,type,interaction:{label:'I found it',hint:'',nextTitle:'',nextContent:'',...data.interaction},widgets:Array.isArray(data.widgets)?data.widgets.filter(item=>item && typeof item.id==='string' && typeof item.type==='string').slice(0,WIDGET_LIMIT):[]};
}
export const spatialNoteEnabled = marker => marker?.type==='note' && spatialNote(marker).type!=='plain';
// Keep the anchor unobscured. Three side bays and two vertical bays fit up to five widgets.
export function noteWidgetPlacement(count) {
    const bays=[{x:-.70,y:0},{x:0,y:.50},{x:.70,y:0},{x:0,y:-.50},{x:.70,y:-.50}];
    return bays.slice(0,Math.min(WIDGET_LIMIT,count)).map((bay,index)=>({...bay,width:.58,height:.36,index}));
}
const widget=(type,title,content='',configuration={})=>({type,title,content,configuration});
export const DYNAMIC_NOTE_STARTERS=Object.freeze([
    {id:'information',label:'Information board',title:'Knowledge from this place',content:'Open this Note to explore its references.',widgets:[widget('thick-box','Information'),widget('image','Reference image'),widget('tip','Reference / tip')]},
    {id:'field',label:'Field instructions',title:'Care for this garden',content:'Follow the instructions and check your materials.',widgets:[widget('thick-box','Instructions'),widget('checklist','Materials','Tools\nWater\nMulch'),widget('image','Reference image')]},
    {id:'collection',label:'Plant collection',title:'Plants found here',content:'Look closely and record the plants you recognise.',widgets:[widget('plant-list','Plants found','Pigeon Pea\nComfrey'),widget('image','Identification image'),widget('task','Record your discovery')]},
    {id:'hunt',label:'Treasure hunt',title:'Find a Pigeon Pea',content:'Find a plant with trifoliate leaves.',widgets:[widget('clue','First clue','Look near the edge of the garden.'),widget('tip','Leaf hint','Look for three leaflets.'),widget('task','I found it','Record your discovery.',{label:'I found it'})]},
    {id:'observation',label:'Observation activity',title:'Observe this place',content:'Notice one change in the garden.',widgets:[widget('thick-box','Instructions','Look at light, moisture and visiting insects.'),widget('plant-list','Observations / items'),widget('image','Reference image')]},
    {id:'timed',label:'Timed task',title:'Build a hot compost pile',content:'Prepare your materials, then start the four-day observation timer.',widgets:[widget('thick-box','Instructions','Layer your materials. Observe moisture and changes over time.'),widget('image','Reference photo','',{url:'assets/demo-tutorial-art/07-add-a-plant-note.png',caption:'A spatial garden Note. Replace with your compost reference photo.'}),widget('checklist','Material checklist','Carbon material\nGreen material\nWater\nMulch'),widget('timer','Four-day timer','',{seconds:345600}),widget('task','Complete the observation')]}
]);
export function noteStarter(id) {
    const starter=DYNAMIC_NOTE_STARTERS.find(item=>item.id===id) || DYNAMIC_NOTE_STARTERS[0];
    return {title:starter.title,content:starter.content,note:{type:'dynamic',interaction:{},widgets:starter.widgets.map(item=>createNoteWidget(item.type,item))}};
}
export function validateSpatialNote(value) {
    return {...value,type:NOTE_TYPES.some(item=>item.id===value?.type)?value.type:'plain',widgets:(value?.widgets || []).slice(0,WIDGET_LIMIT).map(item=>({...item,configuration:{...item.configuration}}))};
}
