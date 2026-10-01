const clamp01=value=>Math.max(0,Math.min(1,value));

export function demoBeePose(elapsed,startedAt,index=0,{attention='screen'}={}){
    if(!Number.isFinite(startedAt))return null;
    const age=elapsed-startedAt-index*850;
    if(age<0)return null;
    const time=age/1000,phase=time*.34+index*2.7;
    const gather=attention==='control'?1-clamp01((age-3600)/2400):0;
    // The first bee makes one short viewer-facing pass, then rejoins the
    // ambient orbit. It does not repeat, so the close approach feels spatial
    // without becoming a persistent distraction.
    const flybyProgress=index===0?clamp01((age-1500)/2200):0;
    const flyby=index===0 && age>=1500 && age<=3700
        ? Math.sin(Math.PI*flybyProgress)**2
        : 0;
    const orbitX=(.5+Math.cos(phase)*.30)*(1-gather)+(.25+Math.cos(phase*2)*.055)*gather;
    const orbitY=(.5+Math.sin(phase)*.30)*(1-gather)+(.72+Math.sin(phase*2)*.055)*gather;
    const orbitDepth=Math.sin(phase-.9);
    return {
        x:orbitX*(1-flyby)+(.78-flybyProgress*.56)*flyby,
        y:orbitY*(1-flyby)+(.5-Math.sin(Math.PI*flybyProgress)*.055)*flyby,
        depth:orbitDepth*(1-flyby)+flyby,
        heading:(phase+Math.PI/2)*(1-flyby)+Math.PI/2*flyby,
        wing:Math.sin(time*27+index),
        opacity:clamp01(age/1700)*.92,
        flyby,
        flybyProgress
    };
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

export function drawDemoAmbientLife(ctx,width,height,{elapsed=0,beesStartedAt=NaN,reducedMotion=false,attention='screen'}={}){
    ctx.clearRect(0,0,width,height);
    if(reducedMotion||!Number.isFinite(beesStartedAt))return;
    for(let index=0;index<2;index++){
        const bee=demoBeePose(elapsed,beesStartedAt,index,{attention});
        if(bee)drawBee(ctx,bee.x*width,bee.y*height,Math.max(4,Math.min(width,height)*(.009+bee.depth*.003))*(1+bee.flyby*3.8),bee.wing,bee.opacity);
    }
}
