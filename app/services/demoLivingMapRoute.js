// Routes are built once from the toy landscape. Rendering and visitors share
// these points, so walking never takes a shortcut through a tree.
export function routeSegmentClear(a,b,obstacles){
    const dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
    return obstacles.every(o=>{
        const t=length?Math.max(0,Math.min(1,((o.x-a.x)*dx+(o.z-a.z)*dz)/length)):0;
        return Math.hypot(a.x+dx*t-o.x,a.z+dz*t-o.z)>=o.radius-1e-7;
    });
}
export function planLivingMapRoute(start,end,obstacles=[]){
    if(routeSegmentClear(start,end,obstacles))return [start,end];
    const nodes=[start,end];
    for(const o of obstacles)for(let i=0;i<12;i++){
        const angle=i*Math.PI/6,r=(o.radius+.025)/Math.cos(Math.PI/12);
        const p={x:o.x+Math.cos(angle)*r,z:o.z+Math.sin(angle)*r};
        if((p.x/6.1)**2+(p.z/4.0)**2<1 && obstacles.every(other=>Math.hypot(p.x-other.x,p.z-other.z)>=other.radius))nodes.push(p);
    }
    const distance=nodes.map(()=>Infinity),previous=nodes.map(()=>-1),visited=new Set();distance[0]=0;
    for(let iteration=0;iteration<nodes.length;iteration++){
        let current=-1;for(let i=0;i<nodes.length;i++)if(!visited.has(i) && (current<0 || distance[i]<distance[current]))current=i;
        if(current<0 || !Number.isFinite(distance[current]))break;
        if(current===1){const points=[];for(let i=1;i>=0;i=previous[i])points.unshift(nodes[i]);return points;}
        visited.add(current);
        for(let i=0;i<nodes.length;i++)if(!visited.has(i) && routeSegmentClear(nodes[current],nodes[i],obstacles)){
            const next=distance[current]+Math.hypot(nodes[i].x-nodes[current].x,nodes[i].z-nodes[current].z);
            if(next<distance[i]){distance[i]=next;previous[i]=current;}
        }
    }
    throw new Error('Living Map has no clear route between Totems');
}
export function livingMapObstacles(model){
    const trees=(model.landscape?.trees || []).filter(tree=>!model.items.some(item=>Math.hypot(item.x-tree.x,item.z-tree.z)<.8));
    return [...trees.map(tree=>({...tree,radius:tree.size*.55+.20})),...model.items.filter(item=>item.tree).map(item=>({...item,radius:.48}))];
}
export function livingMapRoutes(model){
    const obstacles=livingMapObstacles(model);
    return model.links.map(([a,b],index)=>{
        // The entrance route passes through the gap between the two large trees.
        const via=model.interactive && index===0?{x:2.65,z:1.4}:null;
        return via?[...planLivingMapRoute(a,via,obstacles),...planLivingMapRoute(via,b,obstacles).slice(1)]:planLivingMapRoute(a,b,obstacles);
    });
}
export function sampleLivingMapRoute(points,t,out={}){
    let length=0;for(let i=1;i<points.length;i++)length+=Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z);
    let distance=Math.max(0,Math.min(1,t))*length;
    for(let i=1;i<points.length;i++){
        const a=points[i-1],b=points[i],segment=Math.hypot(b.x-a.x,b.z-a.z);
        if(distance<=segment || i===points.length-1){const k=segment?Math.min(1,distance/segment):0;out.x=a.x+(b.x-a.x)*k;out.z=a.z+(b.z-a.z)*k;return out;}
        distance-=segment;
    }
    Object.assign(out,points[0]);return out;
}
