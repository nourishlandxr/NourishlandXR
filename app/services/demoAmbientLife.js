const clamp01=value=>Math.max(0,Math.min(1,value));

export function advanceAmbientGrowth(state,elapsed,target,startedAt){
    if(!Number.isFinite(startedAt))return {progress:0,lastElapsed:elapsed};
    const previous=clamp01(Number(state?.progress)||0);
    const delta=Math.max(0,Math.min(250,elapsed-(Number.isFinite(state?.lastElapsed)?state.lastElapsed:elapsed)));
    const natural=clamp01((elapsed-startedAt)/100000);
    const destination=Math.max(clamp01(target),natural);
    return {progress:previous+(destination-previous)*(1-Math.exp(-delta/6500)),lastElapsed:elapsed};
}

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

export function drawDemoAmbientLife(ctx,width,height,{growth=0,elapsed=0,beesStartedAt=NaN,reducedMotion=false}={}){
    ctx.clearRect(0,0,width,height);
    if(growth<=.002)return;
    const compact=width<700;
    const baseX=width*(compact?.85:.79),baseY=height*(compact?.67:.84);
    const size=Math.min(height*(compact?.18:.29),compact?130:260)*growth;
    const canopy=clamp01((growth-.24)/.54);
    ctx.save();
    ctx.lineCap='round';
    ctx.strokeStyle='rgba(49,67,39,.56)';ctx.lineWidth=1.6+growth*6;
    ctx.beginPath();ctx.moveTo(baseX,baseY);ctx.bezierCurveTo(baseX-4,baseY-size*.38,baseX+4,baseY-size*.76,baseX,baseY-size);ctx.stroke();
    const branchWidth=size*(.22+.08*canopy);
    for(const side of [-1,1]){
        ctx.lineWidth=1+growth*2.1;ctx.beginPath();ctx.moveTo(baseX,baseY-size*.47);
        ctx.quadraticCurveTo(baseX+side*branchWidth*.75,baseY-size*.67,baseX+side*branchWidth,baseY-size*.84);ctx.stroke();
    }
    if(canopy>0){
        ctx.fillStyle=`rgba(92,141,88,${.10+.12*canopy})`;
        const clusters=[[-.4,-.76,.36],[-.13,-.95,.42],[.22,-.88,.4],[.48,-.7,.31],[0,-.66,.43]];
        for(const [dx,dy,radius] of clusters){ctx.beginPath();ctx.ellipse(baseX+dx*size,baseY+dy*size,size*radius*canopy,size*radius*.72*canopy,0,0,Math.PI*2);ctx.fill();}
    }else{
        ctx.fillStyle='rgba(115,169,97,.54)';
        for(const side of [-1,1]){ctx.beginPath();ctx.ellipse(baseX+side*size*.23,baseY-size*.72,size*.24,size*.095,side*.4,0,Math.PI*2);ctx.fill();}
    }
    ctx.restore();
    if(reducedMotion)return;
    for(let index=0;index<2;index++){
        const bee=demoBeePose(elapsed,beesStartedAt,index);
        if(bee)drawBee(ctx,bee.x*width,(bee.y-(compact?.25:0))*height,Math.max(4,Math.min(width,height)*.009),bee.wing,bee.opacity);
    }
}
