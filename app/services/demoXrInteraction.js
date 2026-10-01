const TARGET_PRIORITY=Object.freeze({panel:0,'pim-cell':1,'lim-cell':2,'totem-card':3,record:4,control:5});

export function nearestDemoXrTarget(candidates=[]) {
    return candidates.filter(candidate=>candidate && Number.isFinite(Number(candidate.distance)) && Number(candidate.distance)>0)
        .sort((a,b)=>Number(a.distance)-Number(b.distance)
            || (TARGET_PRIORITY[a.kind] ?? 99)-(TARGET_PRIORITY[b.kind] ?? 99)
            || String(a.id || '').localeCompare(String(b.id || '')))[0] || null;
}

export function createDemoGestureRouter({activate=()=>{},cancel=()=>{}}={}){
    let owner=null;
    return {
        get owner(){return owner;},
        begin(inputSource,target){if(!inputSource || !target || owner)return false;owner={inputSource,kind:target.kind,id:target.id,target,activated:false};return true;},
        select(inputSource){if(!owner || owner.inputSource!==inputSource || owner.activated)return false;owner.activated=true;activate(owner.target);return true;},
        end(inputSource){if(!owner || owner.inputSource!==inputSource)return false;const ended=owner;owner=null;cancel(ended.target,'end');return true;},
        reset(reason='reset'){if(!owner)return false;const ended=owner;owner=null;cancel(ended.target,reason);return true;}
    };
}
