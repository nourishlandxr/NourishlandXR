// Lightweight, illustrative terrain for the circular Interactive Map.
// These values are visual sculpt units, not surveyed elevations or metres.
export const IMAP_V2_TERRAIN_RADIUS=6.3;
export const IMAP_V2_TERRAIN_MAX_EDITS=48;
export const IMAP_V2_TERRAIN_HEIGHT_LIMIT=1.2;

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const round=value=>Math.round(value*1000)/1000;
const smoothstep=(a,b,value)=>{
    const t=clamp((value-a)/(b-a),0,1);
    return t*t*(3-2*t);
};
const terrainShape=shape=>shape==='square'?'square':'circular';
const inside=(x,z,radius,shape)=>shape==='square'?Math.max(Math.abs(x),Math.abs(z))<=radius:Math.hypot(x,z)<=radius;

export function normalizeImapV2TerrainEdits(input,{radius=IMAP_V2_TERRAIN_RADIUS,shape='circular'}={}){
    if(!Array.isArray(input))return [];
    const edge=Math.max(.2,Math.min(radius-.35,IMAP_V2_TERRAIN_RADIUS-.35));
    const edits=[];
    for(const raw of input.slice(0,IMAP_V2_TERRAIN_MAX_EDITS)){
        if(!['channel','hill','bank'].includes(raw?.kind)||!Array.isArray(raw.points))continue;
        const points=raw.points.slice(0,32).filter(point=>finite(point?.x)&&finite(point?.z)).map(point=>{
            if(terrainShape(shape)==='square')return {x:round(clamp(point.x,-edge,edge)),z:round(clamp(point.z,-edge,edge))};
            const length=Math.hypot(point.x,point.z),scale=length>edge?edge/length:1;
            return {x:round(point.x*scale),z:round(point.z*scale)};
        });
        if(points.length<(raw.kind==='hill'?1:2))continue;
        edits.push({kind:raw.kind,points:raw.kind==='hill'?points.slice(0,1):points,
            width:round(clamp(finite(raw.width)?raw.width:1,.25,2)),
            strength:round(clamp(finite(raw.strength)?raw.strength:.55,.1,1)),
            ...(raw.kind==='bank'?{side:raw.side==='right'?'right':'left'}:{})});
    }
    return edits;
}

function nearestPath(point,points){
    let nearest={distance:Infinity,signed:0};
    for(let i=1;i<points.length;i++){
        const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,lengthSq=dx*dx+dz*dz;
        if(lengthSq<.0001)continue;
        const t=clamp(((point.x-a.x)*dx+(point.z-a.z)*dz)/lengthSq,0,1);
        const vx=point.x-a.x-t*dx,vz=point.z-a.z-t*dz;
        const distance=Math.hypot(vx,vz);
        if(distance<nearest.distance)nearest={distance,signed:(dx*(point.z-a.z)-dz*(point.x-a.x))/Math.sqrt(lengthSq)};
    }
    return nearest;
}

function sampleNormalized(edits,x,z,radius,shape){
    if(!inside(x,z,radius,shape))return 0;
    let height=0;
    for(const edit of edits){
        if(edit.kind==='hill'){
            const distance=Math.hypot(x-edit.points[0].x,z-edit.points[0].z);
            height+=edit.strength*Math.exp(-.5*(distance/(edit.width*.52))**2);
            continue;
        }
        const {distance,signed}=nearestPath({x,z},edit.points);
        if(edit.kind==='channel'){
            height-=edit.strength*Math.exp(-.5*(distance/(edit.width*.48))**2);
        }else{
            // A steep face plus a short raised shoulder reads as a contour bank.
            // Its influence ends locally, so a short stroke cannot lift half the disc.
            const face=smoothstep(-edit.width*.12,edit.width*.12,signed*(edit.side==='right'?-1:1));
            const shoulder=1-smoothstep(edit.width*.9,edit.width*2.1,distance);
            height+=edit.strength*face*shoulder;
        }
    }
    return round(clamp(height,-IMAP_V2_TERRAIN_HEIGHT_LIMIT,IMAP_V2_TERRAIN_HEIGHT_LIMIT));
}

export function sampleImapV2TerrainHeight(input,x,z,{radius=IMAP_V2_TERRAIN_RADIUS,shape='circular'}={}){
    if(!finite(x)||!finite(z))return 0;
    const selectedShape=terrainShape(shape);
    // Keep corner edits intact while viewing a round map; they become visible
    // again if the Creator switches back to a square footprint.
    return sampleNormalized(normalizeImapV2TerrainEdits(input,{radius,shape:'square'}),x,z,radius,selectedShape);
}

// Build once when terrain edits change; renderers can reuse this grid as a
// low-cost disc mesh and should never resample it every XR frame.
export function createImapV2TerrainGrid(input,{radius=IMAP_V2_TERRAIN_RADIUS,segments=64,shape='circular'}={}){
    const count=clamp(Number.isInteger(segments)?segments:64,16,96);
    const selectedShape=terrainShape(shape),edits=normalizeImapV2TerrainEdits(input,{radius,shape:'square'});
    const size=count+1,step=radius*2/count,heights=new Float32Array(size*size);
    let min=0,max=0;
    for(let row=0;row<size;row++)for(let col=0;col<size;col++){
        const value=sampleNormalized(edits,-radius+col*step,-radius+row*step,radius,selectedShape);
        heights[row*size+col]=value;
        min=Math.min(min,value);max=Math.max(max,value);
    }
    return {radius,shape:selectedShape,segments:count,size,step,heights,min,max,edits};
}
