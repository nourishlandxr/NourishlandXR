const clamp01=value=>Math.max(0,Math.min(1,value));
function unit(index,salt){const value=Math.sin((index+1)*12.9898+salt*78.233)*43758.5453;return value-Math.floor(value);}

export function demoRainV2Field(time,intensity=1,{mobile=false}={}){
    const strength=clamp01(Number(intensity)/1.65);
    if(strength<=0)return {layers:[],splashes:new Float32Array(),mistOpacity:0,dropCount:0};
    const budgets=mobile?[20,46,70]:[36,78,110];
    const definitions=[
        {id:'near',inner:.8,outer:2.1,length:.19,speed:.00105,alpha:.40,gust:.018},
        {id:'middle',inner:1.8,outer:4.6,length:.13,speed:.00082,alpha:.30,gust:.012},
        {id:'distant',inner:4.2,outer:8,length:.09,speed:.00058,alpha:.20,gust:.007}
    ];
    let dropCount=0;
    const layers=definitions.map((definition,layerIndex)=>{
        const count=Math.round(budgets[layerIndex]*(.3+.7*strength));dropCount+=count;
        const vertices=new Float32Array(count*6);
        for(let index=0;index<count;index++){
            const angle=unit(index,layerIndex+1)*Math.PI*2;
            const radius=definition.inner+unit(index,layerIndex+5)*(definition.outer-definition.inner);
            const phase=(time*definition.speed+unit(index,layerIndex+9))%1;
            const x=Math.cos(angle)*radius,z=Math.sin(angle)*radius,y=1.9-phase*3.2;
            const gust=Math.sin(time*.00014+layerIndex*1.7)*definition.gust;
            vertices.set([x,y,z,x+gust,y-definition.length*(.75+unit(index,18)*.5),z],index*6);
        }
        return {...definition,vertices,count,alpha:definition.alpha*(.45+.55*strength)};
    });
    const splashCount=Math.round((mobile?4:8)*strength),splashes=new Float32Array(splashCount*12);
    for(let index=0;index<splashCount;index++){
        const angle=unit(index,31)*Math.PI*2,radius=1+unit(index,32)*4,x=Math.cos(angle)*radius,z=Math.sin(angle)*radius,size=.018+unit(index,33)*.025;
        splashes.set([x-size,.012,z,x+size,.012,z,x,.012,z-size,x,.012,z+size],index*12);
    }
    return {layers,splashes,mistOpacity:.025+.055*strength,dropCount};
}

// Use the same deterministic three-layer field in the simulated preview.
// The immersive path draws these vertices in world space instead.
export function paintDemoRainV2Preview(ctx,width,height,field){
    if(!field?.dropCount)return 0;
    const project=(x,y,z)=>{
        const depth=-z;
        if(depth<.3)return null;
        return {x:width*.5+x/depth*width*.46,y:height*.48-y/depth*height*.25};
    };
    let strokes=0;
    for(const layer of field.layers){
        ctx.beginPath();
        for(let index=0;index<layer.vertices.length;index+=6){
            const from=project(layer.vertices[index],layer.vertices[index+1],layer.vertices[index+2]);
            const to=project(layer.vertices[index+3],layer.vertices[index+4],layer.vertices[index+5]);
            if(!from || !to || from.x<0 || from.x>width || from.y<0 || from.y>height)continue;
            ctx.moveTo(from.x,from.y);ctx.lineTo(to.x,to.y);strokes++;
        }
        ctx.strokeStyle=`rgba(215,243,238,${layer.alpha})`;
        ctx.lineWidth=layer.id==='near'?1.4:layer.id==='middle'?1:.7;
        ctx.stroke();
    }
    ctx.strokeStyle='rgba(202,233,222,.16)';ctx.lineWidth=.8;
    for(let index=0;index<field.splashes.length;index+=12){
        const x=field.splashes[index],z=field.splashes[index+2];
        if(z>=-.3)continue;
        const point=project(x,-1.25,z);
        if(!point || point.x<0 || point.x>width || point.y<height*.55 || point.y>height)continue;
        ctx.beginPath();ctx.ellipse(point.x,point.y,4,1.2,0,0,Math.PI*2);ctx.stroke();
    }
    const mist=ctx.createLinearGradient(0,height*.66,0,height);
    mist.addColorStop(0,'rgba(190,226,215,0)');
    mist.addColorStop(1,`rgba(190,226,215,${field.mistOpacity})`);
    ctx.fillStyle=mist;ctx.fillRect(0,height*.66,width,height*.34);
    return strokes;
}
