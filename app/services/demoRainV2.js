const clamp01=value=>Math.max(0,Math.min(1,value));
function unit(index,salt){const value=Math.sin((index+1)*12.9898+salt*78.233)*43758.5453;return value-Math.floor(value);}

export function demoRainV2Field(time,intensity=1,{mobile=false}={}){
    const strength=clamp01(Number(intensity)/1.65);
    if(strength<=0)return {layers:[],splashes:new Float32Array(),mistOpacity:0,dropCount:0};
    const budgets=mobile?[10,24,36]:[16,38,58];
    const definitions=[
        {id:'near',inner:.8,outer:2.1,length:.16,speed:.00105,alpha:.2,gust:.018},
        {id:'middle',inner:1.8,outer:4.6,length:.11,speed:.00082,alpha:.14,gust:.012},
        {id:'distant',inner:4.2,outer:8,length:.075,speed:.00058,alpha:.09,gust:.007}
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
