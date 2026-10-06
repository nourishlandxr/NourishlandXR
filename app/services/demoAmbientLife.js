const clamp01=value=>Math.max(0,Math.min(1,value));
const smooth=value=>{const t=clamp01(value);return t*t*(3-2*t);};
export const BEE_COUNT=4;
export const BEE_WING_SPEED=58;
export const BEE_ENCOUNTER_DURATION_MS=14000;
export const BEE_FIRST_ENCOUNTER_MS=11000;
export function beeWingsAtRest({nectar=false,flyby=0,displacement=0,pointerContact=false}={}){
    return Boolean(nectar && flyby<.02 && displacement<=.012 && !pointerContact);
}

function seededUnit(index){let value=(index+1)*0x9e3779b1;value^=value>>>16;value=Math.imul(value,0x21f0aaad);value^=value>>>15;return (value>>>0)/4294967295;}
export function beeEntryDelay(index,seed=0){return index===0?0:index*1450+seededUnit(seed+index*31)*700;}
export function demoBeeEncounter(age,{enabled=true,seed=0}={}){
    if(!enabled || age<BEE_FIRST_ENCOUNTER_MS)return null;
    let start=BEE_FIRST_ENCOUNTER_MS,index=0;
    while(age>start+BEE_ENCOUNTER_DURATION_MS && index<1000){
        const easing=Math.min(index,5);
        start+=BEE_ENCOUNTER_DURATION_MS+(30000-easing*3000)+seededUnit(index+seed)*Math.max(8000,27000-easing*2500);
        index++;
    }
    if(age<start || age>start+BEE_ENCOUNTER_DURATION_MS)return null;
    const progress=clamp01((age-start)/BEE_ENCOUNTER_DURATION_MS);
    const phase=progress<.38?'approach':progress<.52?'inspect':progress<.8?'pass':'exit';
    const envelope=smooth(progress/.18)*(1-smooth((progress-.82)/.18));
    return {index,start,progress,phase,envelope};
}

export function demoBeePose(elapsed,startedAt,index=0,{encounters=true,encounterSeed=0}={}){
    if(!Number.isFinite(startedAt))return null;
    const age=elapsed-startedAt-beeEntryDelay(index,encounterSeed);
    if(age<0)return null;
    // Start in separate sectors of the Living Frame. The session seed varies
    // their sources and speeds while keeping each flight path continuous.
    const variation=seededUnit(encounterSeed+index*17);
    const time=age/1000,phase=time*(.30+variation*.08)
        +seededUnit(encounterSeed+101)*Math.PI*2+index*Math.PI*2/BEE_COUNT+(variation-.5)*.4;
    const candidate=demoBeeEncounter(elapsed-startedAt,{enabled:encounters,seed:encounterSeed});
    const lead=candidate ? (candidate.index+encounterSeed)%BEE_COUNT : -1;
    const waistVisit=Boolean(candidate && candidate.index%3===2);
    const encounter=candidate && (lead===index || waistVisit && (lead+1)%BEE_COUNT===index) ? candidate : null;
    const follower=encounter && waistVisit && lead!==index;
    const delay=follower?1100+variation*700:0;
    const flybyProgress=encounter?clamp01((encounter.progress*BEE_ENCOUNTER_DURATION_MS-delay)/(BEE_ENCOUNTER_DURATION_MS-delay)):0;
    const flyby=encounter?smooth(flybyProgress/.18)*(1-smooth((flybyProgress-.82)/.18)):0;
    const orbitX=.5+Math.cos(phase)*(.22+.07*Math.sin(time*.13+index));
    const orbitY=.5+Math.sin(phase*.83+index*.4)*(.20+.08*Math.cos(time*.17+index));
    const orbitDepth=Math.sin(phase*.71-.9)+Math.sin(time*.19+index)*.12;
    const wanderingX=Math.sin(phase*.63+index)*.045;
    const wanderingY=Math.sin(phase*1.37+index)*.035;
    return {
        entry:smooth(age/4200),
        animationOffset:index*.137+variation*.23,
        x:(orbitX+wanderingX)*(1-flyby)+(.82-flybyProgress*.64)*flyby,
        y:(orbitY+wanderingY)*(1-flyby)+(.48-Math.sin(Math.PI*flybyProgress)*.035)*flyby,
        depth:orbitDepth*(1-flyby)+(.5+.5*Math.sin(Math.PI*flybyProgress))*flyby,
        heading:(phase+Math.PI/2)*(1-flyby)+.12*flyby,
        bodyScale:.82+index*.045+Math.sin(phase*.41+index)*.045,
        headTurn:Math.sin(flybyProgress*Math.PI*4)*.24*flyby,
        bank:Math.sin(phase*.83)*.10*(1-flyby)+Math.sin(flybyProgress*Math.PI*3)*.10*flyby,
        pitch:Math.sin(phase*.61)*.08,
        wing:Math.sin(time*BEE_WING_SPEED+index),
        opacity:clamp01(age/1700)*.92,
        flyby,
        flybyProgress,
        encounterPhase:encounter?.phase || 'ambient',
        waistVisit:waistVisit && Boolean(encounter),
        encounterIndex:encounter?.index ?? -1,
        encounterEndAt:encounter ? encounter.start+BEE_ENCOUNTER_DURATION_MS : NaN
    };
}

export function beePointerContact(position,ray,radius=.055){
    if(!position || !ray?.origin || !ray?.direction)return false;
    const {origin:o,direction:d}=ray,length=d.x*d.x+d.y*d.y+d.z*d.z;
    if(length<1e-8)return false;
    const t=((position.x-o.x)*d.x+(position.y-o.y)*d.y+(position.z-o.z)*d.z)/length;
    return t>=0 && t<=2.5 && Math.hypot(position.x-o.x-d.x*t,position.y-o.y-d.y*t,position.z-o.z-d.z*t)<=radius;
}
export function beePointerAvoidance(position,ray,clearance=.16){
    if(!position || !ray?.origin || !ray?.direction)return {x:0,y:0,z:0};
    const direction=ray.direction,origin=ray.origin;
    const lengthSquared=direction.x**2+direction.y**2+direction.z**2;
    if(lengthSquared<1e-8)return {x:0,y:0,z:0};
    const projection=Math.max(0,Math.min(4,((position.x-origin.x)*direction.x+(position.y-origin.y)*direction.y+(position.z-origin.z)*direction.z)/lengthSquared));
    const away={x:position.x-origin.x-direction.x*projection,y:position.y-origin.y-direction.y*projection,z:position.z-origin.z-direction.z*projection};
    const distance=Math.hypot(away.x,away.y,away.z);
    if(distance>=clearance)return {x:0,y:0,z:0};
    // Allow the laser through the body before a slow, small sidestep.
    const strength=(1-distance/clearance)*.025;
    const normal=distance>1e-5?{x:away.x/distance,y:away.y/distance,z:away.z/distance}:{x:0,y:1,z:0};
    return {x:normal.x*strength,y:normal.y*strength,z:normal.z*strength};
}

function drawBee(ctx,x,y,size,wing,opacity){
    ctx.save();ctx.translate(x,y);ctx.globalAlpha=opacity;
    ctx.fillStyle='rgba(245,251,241,.65)';
    ctx.beginPath();ctx.ellipse(-size*.14,-size*.7,size*.34,size*(.5+wing*.09),-.35,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(size*.22,-size*.68,size*.34,size*(.5-wing*.09),.35,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#d9ad56';ctx.beginPath();ctx.ellipse(0,0,size*.58,size*.38,-.18,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(39,43,31,.78)';ctx.lineWidth=Math.max(1,size*.13);
    for(const offset of [-.16,.16]){ctx.beginPath();ctx.moveTo(size*offset,-size*.33);ctx.lineTo(size*(offset+.08),size*.3);ctx.stroke();}
    ctx.restore();
}

export function drawDemoAmbientLife(ctx,width,height,{elapsed=0,beesStartedAt=NaN,reducedMotion=false,attention='screen',encounterSeed=0}={}){
    ctx.clearRect(0,0,width,height);
    if(!Number.isFinite(beesStartedAt))return;
    for(let index=0;index<BEE_COUNT;index++){
        const bee=demoBeePose(elapsed,beesStartedAt,index,{attention,encounters:!reducedMotion,encounterSeed});
        if(bee)drawBee(ctx,bee.x*width,bee.y*height,Math.max(4,Math.min(width,height)*(.009+bee.depth*.003))*(1+bee.flyby*.3),bee.wing,bee.opacity*(reducedMotion?.55:1));
    }
}
