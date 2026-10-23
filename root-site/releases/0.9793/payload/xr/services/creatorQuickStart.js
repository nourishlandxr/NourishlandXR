export const CREATOR_PRACTICE_COMPLETE='Open your Orb and explore its honeycomb. Open your Note and try its controls. Select a Totem sign to open its information. Practice objects stay in this session.';
export const CREATOR_QUICK_STEPS=Object.freeze([
    {type:'plant',title:'1 / Place an Orb',instruction:'Choose Orb. Aim beside a plant, then confirm placement.'},
    {type:'note',title:'2 / Place a Note',instruction:'Choose Note. Aim where the observation belongs, then confirm placement.'},
    {type:'area_checkpoint',title:'3 / Place a Totem',instruction:'Choose Totem. Place the entrance or reference point for this area.'}
]);
export function createCreatorQuickStart(onChange=()=>{}){
    let index=-1;
    const api={start(){index=0;onChange(api.snapshot());},placed(type){if(CREATOR_QUICK_STEPS[index]?.type!==type)return false;index++;onChange(api.snapshot());return true;},
        close(){index=-1;onChange(api.snapshot());},snapshot:()=>({active:index>=0,complete:index===3,index,step:CREATOR_QUICK_STEPS[index]||null})};return api;
}
