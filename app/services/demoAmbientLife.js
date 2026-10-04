const clamp01=value=>Math.max(0,Math.min(1,value));
const smooth=value=>{const t=clamp01(value);return t*t*(3-2*t);};
export const BEE_COUNT=4;
export const BEE_WING_SPEED=58;
export const BEE_ENCOUNTER_DURATION_MS=7000;
export const BEE_FIRST_ENCOUNTER_MS=11000;

function seededUnit(index){let value=(index+1)*0x9e3779b1;value^=value>>>16;value=Math.imul(value,0x21f0aaad);value^=value>>>15;return (value>>>0)/4294967295;}
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

export function demoBeePose(elapsed,startedAt,index=0,{attention='screen',encounters=true,encounterSeed=0}={}){
    if(!Number.isFinite(startedAt))return null;
    const age=elapsed-startedAt-index*850;
    if(age<0)return null;
    const time=age/1000,phase=time*.34+index*2.7;
    const gather=attention==='control'?1-clamp01((age-3600)/2400):0;
    const candidate=demoBeeEncounter(elapsed-startedAt,{enabled:encounters,seed:encounterSeed});
    const encounter=candidate && (candidate.index+encounterSeed)%BEE_COUNT===index ? candidate : null;
    const flybyProgress=encounter?.progress || 0,flyby=encounter?.envelope || 0;
    const orbitX=(.5+Math.cos(phase)*.30)*(1-gather)+(.25+Math.cos(phase*2)*.055)*gather;
    const orbitY=(.5+Math.sin(phase)*.30)*(1-gather)+(.72+Math.sin(phase*2)*.055)*gather;
    const orbitDepth=Math.sin(phase-.9);
    const wanderingX=Math.sin(phase*.63+index)*.023*(1-gather);
    const wanderingY=Math.sin(phase*1.37+index)*.025*(1-gather);
    return {
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
        encounterIndex:encounter?.index ?? -1
    };
}

export function beePointerAvoidance(position,ray,clearance=.34){
    if(!position || !ray?.origin || !ray?.direction)return {x:0,y:0,z:0};
    const direction=ray.direction,origin=ray.origin;
    const lengthSquared=direction.x**2+direction.y**2+direction.z**2;
    if(lengthSquared<1e-8)return {x:0,y:0,z:0};
    const projection=Math.max(0,Math.min(4,((position.x-origin.x)*direction.x+(position.y-origin.y)*direction.y+(position.z-origin.z)*direction.z)/lengthSquared));
    const away={x:position.x-origin.x-direction.x*projection,y:position.y-origin.y-direction.y*projection,z:position.z-origin.z-direction.z*projection};
    const distance=Math.hypot(away.x,away.y,away.z);
    if(distance>=clearance)return {x:0,y:0,z:0};
    const strength=(1-distance/clearance)*.28;
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
