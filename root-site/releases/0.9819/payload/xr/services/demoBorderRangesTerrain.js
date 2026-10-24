import * as THREE from "../vendor/three.module.min.js?v=0.9819";
import {createImapV2TerrainGrid} from "./imapV2Terrain.js?v=0.9819";

// Build once. The saved authoring sample uses the same terrain edits as IMAP,
// with its schematic source coordinates retained (x/z, without a camera flip).
export function addDemoBorderRangesTerrain({model,parent,geometry,materials}){
    const seed=model.mapSeed,grid=createImapV2TerrainGrid(seed.terrainEdits,{segments:48});
    const height=(x,z)=>{
        const col=Math.max(0,Math.min(grid.segments-.0001,(x+grid.radius)/grid.step));
        const row=Math.max(0,Math.min(grid.segments-.0001,(z+grid.radius)/grid.step));
        const ix=Math.floor(col),iz=Math.floor(row),tx=col-ix,tz=row-iz;
        const at=(dx,dz)=>grid.heights[(iz+dz)*grid.size+ix+dx];
        return .75+(at(0,0)*(1-tx)*(1-tz)+at(1,0)*tx*(1-tz)+at(0,1)*(1-tx)*tz+at(1,1)*tx*tz)*.5;
    };
    const positions=[],colours=[],indices=[],tone=new THREE.Color(),rings=24,slices=72;
    for(let r=0;r<=rings;r++)for(let s=0;s<=slices;s++){
        const angle=s/slices*Math.PI*2,x=Math.cos(angle)*r/rings*6.25,z=Math.sin(angle)*r/rings*6.25,y=height(x,z);
        positions.push(x,y,z);tone.set(y>.95?'#a6a17b':y<.6?'#71948b':'#7c966c');colours.push(tone.r,tone.g,tone.b);
    }
    for(let r=0;r<rings;r++)for(let s=0;s<slices;s++){const a=r*(slices+1)+s,b=a+slices+1;indices.push(a,a+1,b,b,a+1,b+1);}
    const terrain=geometry(new THREE.BufferGeometry());terrain.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));terrain.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));terrain.setIndex(indices);terrain.computeVertexNormals();
    const surface=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});materials.set('border-ranges-terrain',surface);parent.add(new THREE.Mesh(terrain,surface));
    for(const item of seed.elements.filter(item=>item.points?.length>1)){
        const points=[];
        for(let i=1;i<item.points.length;i++){
            const a=item.points[i-1],b=item.points[i],count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.15));
            for(let n=0;n<=count;n++){const t=n/count,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;if(Math.hypot(x,z)<=6.2)points.push(new THREE.Vector3(x,height(x,z)+.025,z));}
        }
        if(points.length<2)continue;
        const ink=new THREE.LineBasicMaterial({color:item.type==='path'?'#efd3a0':'#b9d59e'});materials.set(item.id,ink);
        parent.add(new THREE.Line(geometry(new THREE.BufferGeometry().setFromPoints(points)),ink));
    }
    return height;
}
