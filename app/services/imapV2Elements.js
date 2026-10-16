// Reusable, illustrative object palette for Creator IMAP composition.
// Every item is a compact map symbol; it does not create or edit project records.
export const IMAP_V2_ELEMENT_LIMIT=160;
export const IMAP_V2_ELEMENT_CATALOG=Object.freeze([
    {id:'house',label:'House',group:'Built',icon:'⌂',shape:'object',size:1.35},
    {id:'shelter',label:'Shelter',group:'Built',icon:'⌃',shape:'object',size:1.05},
    {id:'shed',label:'Shed',group:'Built',icon:'⌂',shape:'object',size:.8},
    {id:'fence',label:'Fence',group:'Built',icon:'╫',shape:'line',size:.58},
    {id:'gate',label:'Gate',group:'Built',icon:'Π',shape:'line',size:.7},
    {id:'path',label:'Path',group:'Built',icon:'⌁',shape:'line',size:.72},
    {id:'tree-canopy',label:'Canopy tree',group:'Plants',icon:'♣',shape:'tree',size:1.25},
    {id:'tree-fruit',label:'Fruit tree',group:'Plants',icon:'✿',shape:'tree',size:1.12},
    {id:'tree-palm',label:'Palm',group:'Plants',icon:'♠',shape:'tree',size:1.2},
    {id:'tree-young',label:'Young tree',group:'Plants',icon:'♧',shape:'tree',size:.62},
    {id:'shrub',label:'Shrub',group:'Plants',icon:'❋',shape:'tree',size:.7},
    {id:'groundcover',label:'Groundcover',group:'Plants',icon:'⁙',shape:'object',size:.7},
    {id:'pond',label:'Pond',group:'Water',icon:'◉',shape:'object',size:1.1},
    {id:'water-tank',label:'Water tank',group:'Water',icon:'◍',shape:'object',size:.78},
    {id:'garden-bed',label:'Garden bed',group:'Food garden',icon:'▤',shape:'object',size:1},
    {id:'compost',label:'Compost',group:'Food garden',icon:'♨',shape:'object',size:.72},
    {id:'orb',label:'Plant Orb',group:'Nourishland',icon:'●',shape:'marker',size:.58,recordKind:'plant'},
    {id:'totem',label:'Area Totem',group:'Nourishland',icon:'◆',shape:'marker',size:.68,recordKind:'area_checkpoint'},
    {id:'note',label:'Learning Note',group:'Nourishland',icon:'▤',shape:'marker',size:.58,recordKind:'note'},
    {id:'intro-checkpoint',label:'Intro checkpoint',group:'Nourishland',icon:'◎',shape:'marker',size:.58,recordKind:'intro_checkpoint'},
    {id:'sub-checkpoint',label:'Sub checkpoint',group:'Nourishland',icon:'◇',shape:'marker',size:.58,recordKind:'sub_checkpoint'},
    {id:'area-boundary',label:'Area boundary',group:'Nourishland',icon:'◌',shape:'line',size:.55},
    {id:'contour',label:'Elevation contour',group:'Terrain',icon:'〰',shape:'line',size:.5}
]);
export const IMAP_V2_ELEMENT_GROUPS=Object.freeze(['Built','Plants','Water','Food garden','Nourishland','Terrain']);

const catalogById=new Map(IMAP_V2_ELEMENT_CATALOG.map(item=>[item.id,item]));
const elementClamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const elementFinite=value=>typeof value==='number'&&Number.isFinite(value);
const elementRound=value=>Math.round(value*1000)/1000;
const elementWrapAngle=value=>((value%360)+360)%360;

export function normalizeImapV2Elements(input,{shape='circular',radius=6.3,limit=IMAP_V2_ELEMENT_LIMIT}={}){
    if(!Array.isArray(input))return [];
    const maxItems=Math.max(IMAP_V2_ELEMENT_LIMIT,Math.min(360,Number.isInteger(limit)?limit:IMAP_V2_ELEMENT_LIMIT));
    const edge=Math.max(.2,Math.min(radius-.35,6.3-.35));
    return input.slice(0,maxItems).flatMap((raw,index)=>{
        const definition=catalogById.get(raw?.type);
        if(!definition)return [];
        const id=typeof raw.id==='string'&&raw.id.length<=160?raw.id:`imap-item-${index+1}`;
        const name=typeof raw.name==='string'?raw.name.trim().slice(0,80):'';
        const size=elementRound(elementClamp(elementFinite(raw.size)?raw.size:definition.size,.35,2.2));
        const rotation=elementRound(elementWrapAngle(elementFinite(raw.rotation)?raw.rotation:0));
        if(definition.shape==='line'){
            if(!Array.isArray(raw.points))return [];
            const points=raw.points.slice(0,32).filter(point=>elementFinite(point?.x)&&elementFinite(point?.z)).map(point=>({
                x:elementRound(elementClamp(point.x,-edge,edge)),z:elementRound(elementClamp(point.z,-edge,edge))
            }));
            if(points.length<2)return [];
            return [{id,type:definition.id,group:definition.group,shape:definition.shape,points,size,rotation,...(name?{name}:{})}];
        }
        if(!elementFinite(raw.x)||!elementFinite(raw.z))return [];
        let x=elementClamp(raw.x,-edge,edge),z=elementClamp(raw.z,-edge,edge);
        if(shape!=='square'){
            const length=Math.hypot(x,z),max=edge;
            if(length>max){x*=max/length;z*=max/length;}
        }
        return [{id,type:definition.id,group:definition.group,shape:definition.shape,x:elementRound(x),z:elementRound(z),size,rotation,...(name?{name}:{}),
            ...(definition.recordKind?{recordKind:definition.recordKind}:{})}];
    });
}

export function createImapV2Element(input,{shape='circular',radius=6.3}={}){
    return normalizeImapV2Elements([input],{shape,radius})[0]||null;
}

export function imapV2ElementDefinition(type){return catalogById.get(type)||null;}
