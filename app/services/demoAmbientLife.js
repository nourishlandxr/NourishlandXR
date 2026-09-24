const clamp01=value=>Math.max(0,Math.min(1,value));

export function advanceAmbientGrowth(state,elapsed,target,startedAt){
    if(!Number.isFinite(startedAt))return {progress:0,lastElapsed:elapsed};
    const previous=clamp01(Number(state?.progress)||0);
    const delta=Math.max(0,Math.min(250,elapsed-(Number.isFinite(state?.lastElapsed)?state.lastElapsed:elapsed)));
    const natural=clamp01((elapsed-startedAt)/22000);
    const destination=Math.max(clamp01(target),natural);
    return {progress:previous+(destination-previous)*(1-Math.exp(-delta/1800)),lastElapsed:elapsed};
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

export function seedlingGrowthStage(progress){
    const growth=clamp01(progress);
    return {height:.14+.86*growth,leaves:[.18,.36,.55,.72].map(start=>clamp01((growth-start)/.19)),fruit:clamp01((growth-.79)/.19)};
}

export function drawDemoAmbientLife(ctx,width,height,{growth=0,elapsed=0,beesStartedAt=NaN,reducedMotion=false,darkBackdrop=false}={}){
    ctx.clearRect(0,0,width,height);
    if(growth<=.002)return;
    const compact=width<700;
    const baseX=width*(compact?.77:.70),baseY=height*(compact?.77:.82);
    const stage=seedlingGrowthStage(growth),size=Math.min(height*.17,compact?78:122)*stage.height;
    const sway=reducedMotion?0:Math.sin(elapsed*.0012)*Math.min(2,growth*2);
    const stem=darkBackdrop?'#96b783':'#4f7651';
    ctx.save();
    ctx.fillStyle=darkBackdrop?'rgba(158,181,133,.14)':'rgba(55,84,52,.12)';
    ctx.beginPath();ctx.ellipse(baseX,baseY+2,size*.23,Math.max(2,size*.025),0,0,Math.PI*2);ctx.fill();
    ctx.lineCap='round';ctx.strokeStyle=stem;ctx.lineWidth=Math.max(1.5,size*.026);
    ctx.beginPath();ctx.moveTo(baseX,baseY);ctx.bezierCurveTo(baseX-sway,baseY-size*.35,baseX+sway,baseY-size*.75,baseX+sway,baseY-size);ctx.stroke();
    for(let index=0;index<stage.leaves.length;index++){
        const open=stage.leaves[index];if(open<=0)continue;
        const level=.34+index*.16,side=index%2?-1:1;
        const x=baseX+sway*level,y=baseY-size*level;
        const length=size*(.19+index*.015)*open;
        ctx.strokeStyle=stem;ctx.lineWidth=Math.max(.8,size*.009);
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+side*length*.72,y-length*.18);ctx.stroke();
        ctx.fillStyle=darkBackdrop?'rgba(153,200,126,.85)':'rgba(78,139,77,.85)';
        ctx.beginPath();ctx.ellipse(x+side*length*.64,y-length*.22,length*.45,length*.17,-side*.27,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle=darkBackdrop?'rgba(216,231,171,.52)':'rgba(207,226,162,.55)';
        ctx.beginPath();ctx.moveTo(x+side*length*.32,y-length*.13);ctx.lineTo(x+side*length*.95,y-length*.29);ctx.stroke();
    }
    if(stage.fruit>0){
        ctx.strokeStyle=stem;ctx.lineWidth=1;
        for(const [side,level] of [[-1,.83],[1,.9],[-1,.96]]){
            const x=baseX+sway*level+side*size*.09*stage.fruit,y=baseY-size*level;
            ctx.beginPath();ctx.moveTo(baseX+sway*level,baseY-size*(level+.025));ctx.lineTo(x,y);ctx.stroke();
            ctx.fillStyle='#b94f42';ctx.globalAlpha=.85*stage.fruit;
            ctx.beginPath();ctx.arc(x,y,Math.max(1.5,size*.028)*stage.fruit,0,Math.PI*2);ctx.fill();
        }
    }
    ctx.restore();
    if(reducedMotion)return;
    for(let index=0;index<2;index++){
        const bee=demoBeePose(elapsed,beesStartedAt,index);
        if(bee)drawBee(ctx,bee.x*width,(bee.y-(compact?.25:0))*height,Math.max(4,Math.min(width,height)*.009),bee.wing,bee.opacity);
    }
}
