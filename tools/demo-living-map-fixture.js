import {DEMO_RECORD_IDS as ids} from '../app/services/demoAreaOwnership.js';
import {PIGEON_PEA_PIM} from '../app/services/pigeonPeaPim.js';
import {MORINGA_PIM} from '../app/features/ar-demo/demoPlantContent.js';
import {demoNeighbourPim} from '../app/services/demoNeighbourPim.js';
import {pimToArKnowledge} from '../app/services/pimModel.js';
import {DEMO_CONTENT} from '../app/features/ar-demo/demoContent.js';

export function livingMapPreviewRecords(){
    const plant=(id,name,x,y,areaId,pim,preset)=>({id,name,demoType:'plant',type:'plant',demoAreaId:areaId,demoAmbientNeighbour:areaId===ids.rainforestWalk,demoPlantPreset:preset,demoAlive:true,demoInteractive:true,demoExpanded:false,demoKnowledgeProfile:{common_name:name,pim},demoKnowledgeProjection:pimToArKnowledge(pim),simulatedAnchor:{x,y},position:{x:(x-50)/10,y:.7,z:(y-60)/10},demoContent:DEMO_CONTENT.plant});
    const zone=(id,name,x,y,content)=>({id,name:'Totem',demoZoneName:name,demoType:'zone',type:'area_checkpoint',demoLinkVisible:true,demoInteractive:true,demoExpanded:true,demoTotemSignsVisible:true,demoHalfHeight:.6,groundBaseY:0,simulatedAnchor:{x,y},position:{x:(x-50)/10,y:.6,z:(y-60)/10},demoContent:content});
    const note=(id,name,x,y,areaId)=>({id,name,demoType:'note',type:'note',demoAreaId:areaId,demoInteractive:true,demoExpanded:true,simulatedAnchor:{x,y},position:{x:(x-50)/10,y:.4,z:(y-60)/10},demoContent:{title:name,accent:'#d5bd84',lines:['OBSERVATION  A prepared garden observation.']}});
    return [plant(ids.pigeonPea,'Pigeon Pea',64,46,ids.botanicalGarden,PIGEON_PEA_PIM,'pigeon-pea'),plant(ids.moringa,'Moringa',88,58,ids.botanicalGarden,MORINGA_PIM,'moringa'),note(ids.seasonalNote,'Note',69,68,ids.botanicalGarden),zone(ids.botanicalGarden,'My area',76,76,DEMO_CONTENT.zone),zone(ids.rainforestWalk,'Second Area',24,76,DEMO_CONTENT.zoneTwo),
        plant(ids.vetiver,'Vetiver grass',8,48,ids.rainforestWalk,demoNeighbourPim('vetiver')),plant(ids.acacia,'Acacia sp.',39,46,ids.rainforestWalk,demoNeighbourPim('acacia')),plant(ids.jackfruit,'Jackfruit',9,68,ids.rainforestWalk,demoNeighbourPim('jackfruit')),plant(ids.lychee,'Lychee',40,67,ids.rainforestWalk,demoNeighbourPim('lychee')),note(ids.rainforestNote,'Vetiver row',16,83,ids.rainforestWalk)];
}
