import * as THREE from "./three.mjs?v=0.9812";

// A fixed spherical Voronoi shell: adjacent cells derive their corners from
// the same hull faces. Quality changes sampling, never cell identity or fit.
let topologyCache;
// A shared smooth warp bends the mating seams away from straight polygon
// edges. It is applied to the whole shell, so no cell gets a separate offset.
function organicDirection(point){
    const {x,y,z}=point;
    return new THREE.Vector3(x+.10*Math.sin(y*3.2+z*2.1),y+.08*Math.sin(z*3.1+x*1.9),z+.10*Math.sin(x*2.6+y*2.2)).normalize();
}
function organicTopology(){
    if(topologyCache)return topologyCache;
    const axes=[],faces=[],count=18,golden=Math.PI*(3-Math.sqrt(5));
    for(let i=0;i<count;i++){
        const y=1-2*(i+.5)/count,r=Math.sqrt(1-y*y),angle=i*golden+.18*Math.sin(i*1.71);
        axes.push(new THREE.Vector3(r*Math.cos(angle),y+.08*Math.sin(i*2.37),r*Math.sin(angle)).normalize());
    }
    for(let a=0;a<count-2;a++)for(let b=a+1;b<count-1;b++)for(let c=b+1;c<count;c++){
        const normal=new THREE.Vector3().subVectors(axes[b],axes[a]).cross(new THREE.Vector3().subVectors(axes[c],axes[a])).normalize();
        if(normal.dot(axes[a])<0)normal.negate();
        const height=normal.dot(axes[a]);
        if(axes.some(point=>normal.dot(point)>height+1e-7))continue;
        faces.push({ids:[a,b,c],corner:normal});
    }
    return topologyCache=axes.map((axis,id)=>{
        const reference=Math.abs(axis.y)<.9?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0);
        const right=new THREE.Vector3().crossVectors(reference,axis).normalize(),up=new THREE.Vector3().crossVectors(axis,right);
        const corners=faces.filter(face=>face.ids.includes(id)).map(face=>face.corner).sort((a,b)=>Math.atan2(a.dot(up),a.dot(right))-Math.atan2(b.dot(up),b.dot(right)));
        return {id,axis,corners};
    });
}

export function createOrganicOrbGeometry(quality='medium'){
    const rings=quality==='low'?5:quality==='high'?9:7,steps=quality==='low'?3:quality==='high'?5:4;
    const packed=[],indices=[],cells=[];
    for(const {id,axis,corners} of organicTopology()){
        const outline=[],count=corners.length;
        for(let i=0;i<count;i++){
            const corner=corners[i],previous=corners[(i+count-1)%count],next=corners[(i+1)%count];
            const a=corner.clone().lerp(previous,.16),b=corner.clone().lerp(next,.16),end=next.clone().lerp(corner,.16);
            for(let j=0;j<steps;j++){
                const t=j/steps;
                outline.push(a.clone().multiplyScalar((1-t)**2).addScaledVector(corner,2*t*(1-t)).addScaledVector(b,t*t).lerp(axis,.006).normalize());
            }
            for(let j=0;j<steps;j++)outline.push(b.clone().lerp(end,j/steps).lerp(axis,.006).normalize());
        }
        const fittedAxis=organicDirection(axis),positions=fittedAxis.clone().multiplyScalar(1.018).toArray(),localIndices=[],width=outline.length,base=packed.length/10;
        for(let ring=1;ring<=rings;ring++){
            const t=ring/rings;
            for(const edge of outline){
                const point=organicDirection(axis.clone().lerp(edge,t).normalize()).multiplyScalar(1+.018*(1-t*t)**1.4);
                positions.push(point.x,point.y,point.z);
            }
        }
        for(let j=0;j<width;j++)localIndices.push(0,1+j,1+(j+1)%width);
        for(let ring=0;ring<rings-1;ring++)for(let j=0;j<width;j++){
            const a=1+ring*width+j,b=1+ring*width+(j+1)%width,c=1+(ring+1)*width+j,d=1+(ring+1)*width+(j+1)%width;
            localIndices.push(a,c,b,b,c,d);
        }
        const geometry=new THREE.BufferGeometry();
        geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(localIndices);geometry.computeVertexNormals();
        const normals=geometry.attributes.normal.array;
        for(let i=0;i<positions.length;i+=3)packed.push(positions[i],positions[i+1],positions[i+2],normals[i],normals[i+1],normals[i+2],fittedAxis.x,fittedAxis.y,fittedAxis.z,id);
        indices.push(...localIndices.map(index=>index+base));
        cells.push({id,sides:count,axis:fittedAxis.toArray(),start:base,count:positions.length/3,corners:corners.map(corner=>organicDirection(corner).toArray())});
        geometry.dispose();
    }
    return {vertices:new Float32Array(packed),indices:new Uint16Array(indices),stride:10,cells};
}
