const finitePoint=p=>p && ['x','y','z'].every(k=>Number.isFinite(p[k]));
export function mappingGroundPoint(ray,groundY){
    if(!finitePoint(ray?.origin)||!finitePoint(ray?.direction)||!Number.isFinite(groundY)||ray.direction.y>=-.025)return null;
    const t=(groundY-ray.origin.y)/ray.direction.y;
    return t>.05 && t<=20?{x:ray.origin.x+t*ray.direction.x,y:groundY,z:ray.origin.z+t*ray.direction.z}:null;
}
export function createOrbMappingDraft(){
    let type='area',target=null,points=[];
    return {begin(record,kind='area'){if(!record?.marker?.id || !['plant','sub_checkpoint'].includes(record.marker.type))throw Error('Select an Orb first.');
            if(!['area','line'].includes(kind))throw Error('Choose Area or Line.');target=record;type=kind;points=[];},
        add(point){if(!target || !finitePoint(point))return false;if(points.length>=256)throw Error('A mapping can contain up to 256 points.');
            if(points.length && Math.hypot(point.x-points.at(-1).x,point.z-points.at(-1).z)<.03)return false;points.push({...point});return true;},
        undo(){points.pop();},cancel(){target=null;points=[];},
        snapshot:()=>({target,type,points:points.map(p=>({...p}))}),
        serialize(){if(!target)throw Error('Select an Orb first.');if(points.length<(type==='area'?3:2))throw Error(type==='area'?'Mark at least three corners.':'Mark at least two points.');
            if(type==='area'){
                const area=Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p.x*q.z-q.x*p.z;},0))/2;
                if(area<.005)throw Error('The area needs three distinct corners.');
            }
            // Orb-local offsets follow the same restored anchor as the Orb; no session-world coordinates leak into saved geometry.
            return {version:1,type,coordinate_space:'orb-local',units:'metres',points:points.map(p=>({x:p.x-target.position.x,y:p.y-target.position.y,z:p.z-target.position.z}))};
        }};
}
export function mappedOrbPoints(record){
    const map=record?.marker?.spatial_mapping;
    if(map?.version!==1 || map.coordinate_space!=='orb-local' || !['area','line'].includes(map.type) || !Array.isArray(map.points) || map.points.length>256 || !finitePoint(record.position))return [];
    return map.points.filter(finitePoint).map(p=>({x:p.x+record.position.x,y:p.y+record.position.y,z:p.z+record.position.z}));
}
