const finite = value => Number.isFinite(Number(value));
const ease = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
export const LIVING_MAP_DURATION_MS = 16700;

// The Utility view explains a concept, not the visitor's actual placements.
// Never rearrange scene records or reuse their plant names for this miniature.
export function createDemoLivingMapConcept({interactive=false}={}) {
    if(interactive){
        const landscape=createDemoLivingMapConcept().landscape;
        const zones=[
            {id:'map-entry',name:'Totem 1',type:'zone',x:0,z:2.65},
            {id:'map-forest',name:'Totem 2',type:'zone',x:2.85,z:0},
            {id:'map-swales',name:'Totem 3',type:'zone',x:-2.85,z:1.65}
        ];
        const plants=[[1.6,-1.7],[3.35,-1.8],[4.7,.65]].map(([x,z],i)=>({id:`map-orb-${i}`,type:'plant',name:'',x,z,tree:true,areaId:zones[1].id}));
        return {concept:true,interactive:true,items:[...zones,...plants],landscape,
            areas:zones.map((totem,i)=>({id:totem.id,name:totem.name,totem,members:[totem,...plants.filter(p=>p.areaId===totem.id)],
                left:i===0?-.9:i===1?.5:-5.2,right:i===0?.9:i===1?5.2:-.5,far:i===0?2:i===1?-2.5:-2.5,near:i===0?3.3:2.4})),
            links:[[zones[0],zones[1]],[zones[1],zones[2]]]};
    }
    const zone = (id, name, x) => ({ id, name, type: 'zone', x, z: 0, linked: true });
    const first = zone('map-area-1', 'Totem 1', -2.85), second = zone('map-area-2', 'Totem 2', 2.85);
    const plants = [
        [-4.45, -.85], [-3.1, -1.12], [-1.7, -.78],
        [1.6, -1.7], [3.35, -1.8], [4.7, .65]
    ].map(([x,z], index) => ({id:`map-tree-${index+1}`, type:'plant', name:'', x,z,
        areaId:index<3?first.id:second.id, tree:true}));
    const areas = [first, second].map((totem,index) => ({id:totem.id,name:`Area ${index+1}`,totem,
        members:[totem,...plants.filter(item=>item.areaId===totem.id)],
        left:index? .5:-5.2,right:index?5.2:-.5,far:-2.5,near:2.4}));
    const swales = [-.8,.25,1.3].map(z => Array.from({length:33},(_,i)=>{
        const x=-5.1+i*4.25/32;
        return {x,z:z+.34*Math.sin((x+5.1)/4.25*Math.PI)};
    }));
    const trees = [[1.5,-2],[2.7,-2.25],[4.2,-1.85],[5,-.8],[4.8,1.1],[3.6,2],[1.75,1.7]]
        .map(([x,z],index)=>({x,z,size:.85+(index%3)*.12}));
    return {concept:true,items:[first,second,...plants],areas,links:[[first,second]],landscape:{swales,trees}};
}

// Placement order is independent of rendering, controller input and motion
// preference. Reduced motion never automatically completes an interaction.
export function createDemoLivingMapPlacement(model=createDemoLivingMapConcept({interactive:true})){
    const ids=model.areas.map(area=>area.id);let placements=[];
    return {
        current:()=>model.items.find(item=>item.id===ids[placements.length]) || null,
        snapshot:()=>placements.map(entry=>({...entry})),
        place(id,at){
            if(id!==ids[placements.length] || !Number.isFinite(at) || at<0)return false;
            placements.push({id,at:Math.max(at,placements.at(-1)?.at || 0)});return true;
        },
        reset(){placements=[];}
    };
}
export function livingMapDropAccepted(point,target,radius=72){
    return Boolean(point && target && [point.x,point.y,target.x,target.y,radius].every(Number.isFinite)
        && radius>0 && Math.hypot(point.x-target.x,point.y-target.y)<=radius);
}

export function createDemoLivingMapPlayback(duration = LIVING_MAP_DURATION_MS) {
    let elapsed = 0, startedAt = null;
    const read = now => Math.min(duration, elapsed + (startedAt===null?0:Math.max(0,now-startedAt)));
    return {
        elapsed:read,
        playing:now=>startedAt!==null && read(now)<duration,
        play(now){if(read(now)>=duration)elapsed=0;else elapsed=read(now);startedAt=now;},
        pause(now){elapsed=read(now);startedAt=null;},
        reset(now, play=false){elapsed=0;startedAt=play?now:null;}
    };
}

// One common transform preserves relative locations. Screen anchors are the
// placement coordinates of the flat demo; XR uses session-local ground x/z.
export function createDemoLivingMapModel(records, { simulated = false } = {}) {
    const placed = records.filter(record => ['plant', 'note', 'zone'].includes(record.demoType)).flatMap(record => {
        const anchor = simulated && record.simulatedAnchor;
        const x = anchor ? anchor.x : record.position?.x;
        const z = anchor ? anchor.y : record.position?.z;
        if (!finite(x) || !finite(z)) return [];
        return [{ id: record.id, type: record.demoType, areaId: record.demoAreaId,
            name: record.demoType === 'zone' ? record.demoZoneName : record.name,
            x: Number(x), z: Number(z), linked: Boolean(record.demoLinkVisible) }];
    });
    if (!placed.length) return { items: [], areas: [], links: [] };
    const xs = placed.map(item => item.x), zs = placed.map(item => item.z);
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centerZ = (Math.min(...zs) + Math.max(...zs)) / 2;
    const scale = Math.min(8 / Math.max(1, Math.max(...xs) - Math.min(...xs)), 4.8 / Math.max(1, Math.max(...zs) - Math.min(...zs)));
    const items = placed.map(item => ({ ...item, x: (item.x - centerX) * scale, z: (item.z - centerZ) * scale }));
    const areas = items.filter(item => item.type === 'zone').map(totem => {
        const members = items.filter(item => item.id === totem.id || item.areaId === totem.id);
        return { id: totem.id, name: totem.name, totem, members,
            left: Math.min(...members.map(item => item.x)) - .65, right: Math.max(...members.map(item => item.x)) + .65,
            near: Math.max(...members.map(item => item.z)) + .65, far: Math.min(...members.map(item => item.z)) - .65 };
    });
    const linked = areas.filter(area => area.totem.linked);
    return { items, areas, links: linked.length === 2 ? [[linked[0].totem, linked[1].totem]] : [] };
}

// Each Area starts with its own Totem. Its plants follow in order, then Notes
// and a boundary. Positions remain unchanged throughout the demonstration.
export function createDemoLivingMapSchedule(model) {
    if(model.concept){
        const items={},areas={};
        model.areas.forEach((area,index)=>{
            items[area.id]={startAt:index?8100:2700,duration:850};
            areas[area.id]={startAt:0,duration:1};
            area.members.filter(item=>item.type==='plant').forEach((item,i)=>{
                items[item.id]={startAt:(index?14000:5400)+i*220,duration:700};
            });
        });
        return {items,areas,pathStartedAt:10800,pathDuration:3200,sceneryStartedAt:0,
            boundaryStartedAt:0,duration:LIVING_MAP_DURATION_MS,concept:true};
    }
    const items = {}, areas = {};
    let cursor = 800;
    const add = (item, startAt, duration = 650) => { items[item.id] = { startAt, duration }; };
    for (const area of model.areas) {
        add(area.totem, cursor);
        cursor += 1050;
        const plants = area.members.filter(item => item.type === 'plant');
        plants.forEach((item, index) => add(item, cursor + index * 400));
        if (plants.length) cursor += (plants.length - 1) * 400 + 900;
        const notes = area.members.filter(item => item.type === 'note');
        notes.forEach((item, index) => add(item, cursor + index * 300, 450));
        if (notes.length) cursor += (notes.length - 1) * 300 + 700;
        areas[area.id] = { startAt: cursor, duration: 1000 };
        cursor += 1600;
    }
    // Incomplete samples can still show records without an Area assignment.
    for (const item of model.items) if (!items[item.id]) { add(item, cursor); cursor += 400; }
    const pathStartedAt = Math.max(800, cursor - 200);
    const sceneryStartedAt = pathStartedAt + 1000;
    return { items, areas, pathStartedAt, sceneryStartedAt,
        boundaryStartedAt: Math.max(0, ...Object.values(areas).map(area => area.startAt)),
        duration: sceneryStartedAt + 1300 };
}

export function demoLivingMapItemProgress(schedule, id, elapsed, reducedMotion = false) {
    const entry = schedule.items[id];
    return entry ? (reducedMotion ? 1 : ease((elapsed - entry.startAt) / entry.duration)) : 0;
}

export function demoLivingMapAreaProgress(schedule, id, elapsed, reducedMotion = false) {
    const entry = schedule.areas[id];
    return entry ? (reducedMotion ? 1 : ease((elapsed - entry.startAt) / entry.duration)) : 0;
}

export function demoLivingMapProgress(elapsed, reducedMotion = false, schedule = null) {
    const timing = schedule || { boundaryStartedAt: 9300, pathStartedAt: 10700, sceneryStartedAt: 11700, duration: LIVING_MAP_DURATION_MS };
    return { camera: reducedMotion ? 1 : ease((elapsed - 800) / 5000),
        markers: reducedMotion ? 1 : ease((elapsed - 1850) / 650),
        boundary: reducedMotion ? 1 : ease((elapsed - timing.boundaryStartedAt) / 1000),
        path: reducedMotion ? 1 : ease((elapsed - timing.pathStartedAt) / (timing.pathDuration || 1000)),
        scenery: reducedMotion || timing.concept ? 1 : ease((elapsed - timing.sceneryStartedAt) / 1200),
        wide: reducedMotion ? 1 : ease((elapsed - timing.pathStartedAt) / 1600),
        settled: reducedMotion || elapsed >= timing.duration };
}

export function demoLivingMapStage(elapsed, reducedMotion = false) {
    if(reducedMotion || elapsed>=LIVING_MAP_DURATION_MS)return 'Two connected areas';
    if(elapsed>=14000)return 'Three Orbs appear in Area 2';
    if(elapsed>=10800)return 'A gentle connection grows';
    if(elapsed>=8100)return 'Totem 2 arrives in Area 2';
    if(elapsed>=5400)return 'Three Orbs appear in Area 1';
    if(elapsed>=2700)return 'Totem 1 arrives in Area 1';
    return 'Swale garden and open tree garden';
}
