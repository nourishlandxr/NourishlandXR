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

export function drawDemoLycheeClusters(ctx,x,y,width,height,opacity=1){
    if(opacity<=0)return;
    const clusters=[[.27,.45,3],[.7,.35,4],[.78,.57,3],[.37,.64,4],[.57,.27,3]];
    const radius=Math.max(1.5,height*.012);
    ctx.save();ctx.globalAlpha*=clamp01(opacity);
    for(const [cx,cy,count] of clusters){
        const stemX=x+width*cx,stemY=y+height*cy;
        ctx.strokeStyle='rgba(110,94,54,.78)';ctx.lineWidth=Math.max(.7,radius*.23);
        ctx.beginPath();ctx.moveTo(stemX,stemY-radius*1.4);ctx.lineTo(stemX,stemY+radius*.5);ctx.stroke();
        for(let index=0;index<count;index++){
            const px=stemX+(index-(count-1)/2)*radius*1.15;
            const py=stemY+radius*(.55+(index%2)*.66);
            ctx.fillStyle=index%2?'#b84742':'#ce6251';
            ctx.beginPath();ctx.arc(px,py,radius*.72,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='rgba(255,213,171,.48)';ctx.beginPath();ctx.arc(px-radius*.2,py-radius*.23,radius*.13,0,Math.PI*2);ctx.fill();
        }
    }
    ctx.restore();
}

export function drawDemoAmbientLife(ctx,width,height,{growth=0,elapsed=0,beesStartedAt=NaN,reducedMotion=false,darkBackdrop=false,treeImages=null}={}){
    ctx.clearRect(0,0,width,height);
    if(growth<=.002)return;
    const compact=width<700;
    const baseX=width*(compact?.85:.79),baseY=height*(compact?.67:.84);
    const size=Math.min(height*(compact?.18:.29),compact?130:260)*growth;
    const canopy=clamp01((growth-.24)/.54);
    const treeReady=treeImages?.bare?.naturalWidth && treeImages?.leafy?.naturalWidth;
    ctx.save();
    if(treeReady){
        const treeWidth=size*.96,treeX=baseX-treeWidth/2,treeY=baseY-size;
        ctx.globalAlpha=darkBackdrop?.78:.68;
        ctx.drawImage(treeImages.bare,treeX,treeY,treeWidth,size);
        if(canopy>0){ctx.globalAlpha=(darkBackdrop?.9:.78)*canopy;ctx.drawImage(treeImages.leafy,treeX,treeY,treeWidth,size);}
        if(growth>.78){ctx.globalAlpha=1;drawDemoLycheeClusters(ctx,treeX,treeY,treeWidth,size,(growth-.78)/.2);}
    }else{
        ctx.lineCap='round';
        ctx.strokeStyle=darkBackdrop?'rgba(162,190,139,.68)':'rgba(49,67,39,.56)';ctx.lineWidth=1.6+growth*6;
        ctx.beginPath();ctx.moveTo(baseX,baseY);ctx.bezierCurveTo(baseX-4,baseY-size*.38,baseX+4,baseY-size*.76,baseX,baseY-size);ctx.stroke();
        const branchWidth=size*(.22+.08*canopy);
        for(const side of [-1,1]){
            ctx.lineWidth=1+growth*2.1;ctx.beginPath();ctx.moveTo(baseX,baseY-size*.47);
            ctx.quadraticCurveTo(baseX+side*branchWidth*.75,baseY-size*.67,baseX+side*branchWidth,baseY-size*.84);ctx.stroke();
        }
        if(canopy>0){
            ctx.fillStyle=darkBackdrop?`rgba(141,194,123,${.16+.17*canopy})`:`rgba(92,141,88,${.10+.12*canopy})`;
            const clusters=[[-.4,-.76,.36],[-.13,-.95,.42],[.22,-.88,.4],[.48,-.7,.31],[0,-.66,.43]];
            for(const [dx,dy,radius] of clusters){ctx.beginPath();ctx.ellipse(baseX+dx*size,baseY+dy*size,size*radius*canopy,size*radius*.72*canopy,0,0,Math.PI*2);ctx.fill();}
        }else{
            ctx.fillStyle=darkBackdrop?'rgba(156,201,128,.6)':'rgba(115,169,97,.54)';
            for(const side of [-1,1]){ctx.beginPath();ctx.ellipse(baseX+side*size*.23,baseY-size*.72,size*.24,size*.095,side*.4,0,Math.PI*2);ctx.fill();}
        }
        if(growth>.78)drawDemoLycheeClusters(ctx,baseX-size*.48,baseY-size,size*.96,size,(growth-.78)/.2);
    }
    ctx.restore();
    if(reducedMotion)return;
    for(let index=0;index<2;index++){
        const bee=demoBeePose(elapsed,beesStartedAt,index);
        if(bee)drawBee(ctx,bee.x*width,(bee.y-(compact?.25:0))*height,Math.max(4,Math.min(width,height)*.009),bee.wing,bee.opacity);
    }
}
