const clamp01=value=>Math.max(0,Math.min(1,value));

export function demoBeePose(elapsed,startedAt,index=0){
    if(!Number.isFinite(startedAt))return null;
    const age=elapsed-startedAt-index*850;
    if(age<0)return null;
    const time=age/1000;
    return {
        x:.79+Math.sin(time*(index? .53:.46)+index*2.3)*.085,
        y:.62+Math.sin(time*(index? .77:.64)+index*1.7)*.055,
        depth:Math.sin(time*.41+index*2.1)*.16,
        wing:Math.sin(time*27+index),
        opacity:clamp01(age/1700)*.83
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

export function drawDemoAmbientLife(ctx,width,height,{elapsed=0,beesStartedAt=NaN,reducedMotion=false}={}){
    ctx.clearRect(0,0,width,height);
    if(reducedMotion||!Number.isFinite(beesStartedAt))return;
    const compact=width<700;
    for(let index=0;index<2;index++){
        const bee=demoBeePose(elapsed,beesStartedAt,index);
        if(bee)drawBee(ctx,bee.x*width,(bee.y-(compact?.25:0))*height,Math.max(4,Math.min(width,height)*.009),bee.wing,bee.opacity);
    }
}
