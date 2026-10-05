import * as THREE from '../vendor/three.module.min.js';

export const KNOWLEDGE_REGION_DIRECTIONS = Object.freeze(['top','upper-right','lower-right','bottom','lower-left','upper-left']);
export const KNOWLEDGE_CONTEXT_REGION = 24;
export const KNOWLEDGE_ARCHITECTURE_STAGES = Object.freeze(['seed','activated','cluster','hub']);
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const t=clamp(value); return t*t*(3-2*t); };

export function architectureRegionAmount(region, time=globalThis.performance?.now?.() || 0, reducedMotion=false){
    const target=region?.opened ? Math.max(1, Number(region.level) || 1) : 0;
    if(reducedMotion || !region?.transition)return target;
    const transition=region.transition, progress=smooth((time-transition.startedAt)/720);
    return transition.from+(target-transition.from)*progress;
}

// One connected solid: a faceted seed with six edge-hinged pentagonal wings.
// Every region owns three fixed reading bays. Development changes the wing's
// span, hinge and ribs; it never adds another collection of little solids.
export function createKnowledgeArchitectureGeometry(radius=.16, regions=[], time=Infinity, reducedMotion=false){
    const positions=[], normals=[], uvs=[], triangleRegions=[], frames=[];
    const front=radius*.26, back=-radius*.30, capRadius=radius*.68;
    function triangle(a,b,c,region,uvA,uvB,uvC){
        const normal=b.clone().sub(a).cross(c.clone().sub(a)).normalize();
        triangleRegions.push(region);
        for(const [point,uv] of [[a,uvA],[b,uvB],[c,uvC]]){
            positions.push(...point.toArray()); normals.push(...normal.toArray());
            uvs.push((region%4+uv.x)/4,(Math.floor(region/4)+uv.y)/8);
        }
    }
    function polygon(points,region,blank=false,rightBasis=null){
        const centre=points.reduce((sum,p)=>sum.add(p),new THREE.Vector3()).divideScalar(points.length);
        const normal=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize();
        const right=rightBasis?.clone() || points[1].clone().sub(points[0]).normalize(), up=normal.clone().cross(right).normalize();
        const coords=points.map(p=>new THREE.Vector2(p.clone().sub(centre).dot(right),p.clone().sub(centre).dot(up)));
        const extentX=Math.max(...coords.map(p=>Math.abs(p.x))), extentY=Math.max(...coords.map(p=>Math.abs(p.y)));
        const uv=p=>blank ? new THREE.Vector2(.015,.015) : new THREE.Vector2(.5+p.x/(extentX*2.15),.5-p.y/(extentY*2.15));
        const inradius=Math.min(...points.map((p,i)=>centre.clone().sub(p).cross(points[(i+1)%points.length].clone().sub(p)).length()/p.distanceTo(points[(i+1)%points.length])));
        if(!blank)frames[region]={centre,normal,right,up,inradius,width:extentX*2,height:extentY*2};
        for(let i=0;i<points.length;i++)triangle(centre,points[i],points[(i+1)%points.length],region,blank?uv(coords[i]):new THREE.Vector2(.5,.5),uv(coords[i]),uv(coords[(i+1)%points.length]));
    }
    const cap=Array.from({length:6},(_,i)=>{
        const angle=Math.PI/3+i*Math.PI/3;
        return new THREE.Vector3(Math.cos(angle)*capRadius,Math.sin(angle)*capRadius,front);
    });
    polygon(cap,KNOWLEDGE_CONTEXT_REGION,false,new THREE.Vector3(1,0,0));
    const backCap=cap.map(p=>new THREE.Vector3(p.x*.92,p.y*.92,back));
    polygon([...backCap].reverse(),31,true);
    for(let edge=0;edge<6;edge++){
        const next=(edge+1)%6;
        polygon([cap[next],cap[edge],backCap[edge],backCap[next]],31,true);
    }
    for(let slot=0;slot<6;slot++){
        const angle=Math.PI/2-slot*Math.PI/3, radial=new THREE.Vector3(Math.cos(angle),Math.sin(angle),0), tangent=new THREE.Vector3(Math.sin(angle),-Math.cos(angle),0);
        const region=regions[slot], amount=architectureRegionAmount(region,time,reducedMotion), opened=clamp(amount), maturity=Math.max(0,amount-1);
        const hinge=radial.clone().multiplyScalar(capRadius*Math.cos(Math.PI/6)).setZ(front);
        const half=capRadius*.5, length=radius*(.72+opened*.92+maturity*.24);
        const pitch=THREE.MathUtils.degToRad(-68+(80+(slot%2)*14)*opened), outward=radial.clone().multiplyScalar(Math.cos(pitch)).add(new THREE.Vector3(0,0,Math.sin(pitch)));
        const point=(side,along,depth=0)=>hinge.clone().addScaledVector(tangent,side).addScaledVector(outward,along).add(new THREE.Vector3(0,0,depth));
        const tip=point(0,length), shoulder=length*.70;
        const outline=[point(-half,0),point(half,0),point(half*1.18,shoulder),tip,point(-half*1.18,shoulder)];
        // The tangent basis above gives an outward front normal for all wings.
        if(opened>.08){
            for(let bay=0;bay<3;bay++){
                const low=shoulder*bay/3, high=shoulder*(bay+1)/3, w0=half*(1+.18*low/shoulder), w1=half*(1+.18*high/shoulder);
                polygon([point(-w0,low),point(w0,low),point(w1,high),point(-w1,high)],6+slot*3+bay);
            }
            polygon([point(-half*1.18,shoulder),point(half*1.18,shoulder),tip],slot);
        }else polygon(outline,slot);
        const thickness=radius*(.16+maturity*.05);
        const underside=outline.map(p=>p.clone().add(new THREE.Vector3(0,0,-thickness)));
        polygon([...underside].reverse(),slot,true);
        for(let edge=0;edge<outline.length;edge++){
            const next=(edge+1)%outline.length;
            const ridge=outline[edge].clone().add(outline[next]).add(underside[edge]).add(underside[next]).multiplyScalar(.25);
            // Fixed facets make the richer state visibly architectural.
            ridge.addScaledVector(radial,maturity*radius*.045);
            for(const [a,b] of [[outline[edge],outline[next]],[outline[next],underside[next]],[underside[next],underside[edge]],[underside[edge],outline[edge]]])polygon([a,b,ridge],slot,true);
        }
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
    geometry.setAttribute('region',new THREE.Float32BufferAttribute(triangleRegions.flatMap(region=>[region,region,region]),1));
    geometry.userData.knowledgeRegions=triangleRegions; geometry.userData.knowledgeFrames=frames;
    geometry.computeBoundingSphere();
    return geometry;
}
