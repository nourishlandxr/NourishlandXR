import * as THREE from '../vendor/three.module.min.js';

// The intro and Explorer share the same 120-facet spherical construction.
export const HERO_DICE_STYLE = Object.freeze({radius:1.72, widthSegments:12, heightSegments:6, roughness:.78, metalness:.025, edgeColour:0x304534, edgeOpacity:.2});
export function createHeroDiceGeometry(radius=HERO_DICE_STYLE.radius){
    const indexed=new THREE.SphereGeometry(radius,HERO_DICE_STYLE.widthSegments,HERO_DICE_STYLE.heightSegments);
    const geometry=indexed.toNonIndexed();indexed.dispose();geometry.computeVertexNormals();return geometry;
}
export function diceRegionDirections(count=6){
    const directions=[[0,0,1],[1,0,0],[0,1,0],[-1,0,0],[0,-1,0],[0,0,-1]];
    if(count>6)directions.push([.577,.577,-.577]);
    if(count>7)directions.push([-.577,-.577,.577]);
    return directions.slice(0,Math.max(1,Math.min(8,count))).map(([x,y,z])=>new THREE.Vector3(x,y,z).normalize());
}
const regionCache=new WeakMap();
export function diceFacetRegions(geometry,count=6){
    let cache=regionCache.get(geometry);if(!cache){cache=new Map();regionCache.set(geometry,cache);}if(cache.has(count))return cache.get(count);
    const directions=diceRegionDirections(count),positions=geometry.attributes.position,regions=[];
    for(let i=0;i<positions.count;i+=3){
        const centre=new THREE.Vector3();for(let j=0;j<3;j++)centre.add(new THREE.Vector3().fromBufferAttribute(positions,i+j));centre.normalize();
        let best=0;directions.forEach((direction,index)=>{if(centre.dot(direction)>centre.dot(directions[best]))best=index;});regions.push(best);
    }
    cache.set(count,regions);return regions;
}
