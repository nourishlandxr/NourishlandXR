import * as THREE from '../vendor/three.module.min.js';

// Reference solid: eight large hexagonal information faces, six smaller
// square connector faces. A narrow faceted rim adds depth without subdivision.
export function createExplorerFacetGeometry(){
    const vertices=[];
    for(let zero=0;zero<3;zero++)for(const swap of [false,true])for(const a of [-1,1])for(const b of [-1,1]){
        const other=[0,1,2].filter(axis=>axis!==zero),p=[0,0,0];p[other[0]]=a*(swap?2:1);p[other[1]]=b*(swap?1:2);vertices.push(new THREE.Vector3(...p));
    }
    const faces=[];
    for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){const n=new THREE.Vector3();n.setComponent(axis,sign);faces.push({normal:n,limit:2,kind:'connector'});}
    for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])faces.push({normal:new THREE.Vector3(x,y,z).normalize(),limit:Math.sqrt(3),kind:'information'});
    const positions=[];
    for(const face of faces){
        const points=vertices.filter(p=>Math.abs(p.dot(face.normal)-face.limit)<1e-6),center=face.normal.clone().multiplyScalar(face.limit);
        const u=points[0].clone().sub(center).normalize(),v=face.normal.clone().cross(u);
        points.sort((a,b)=>Math.atan2(a.clone().sub(center).dot(v),a.clone().sub(center).dot(u))-Math.atan2(b.clone().sub(center).dot(v),b.clone().sub(center).dot(u)));
        const inset=points.map(p=>center.clone().lerp(p,.92).addScaledVector(face.normal,-.025));
        const triangle=(a,b,c)=>{for(const p of [a,b,c])positions.push(p.x/2,p.y/2,p.z/2);};
        for(let i=1;i<inset.length-1;i++)triangle(inset[0],inset[i],inset[i+1]);
        for(let i=0;i<points.length;i++){const j=(i+1)%points.length;triangle(points[i],points[j],inset[j]);triangle(points[i],inset[j],inset[i]);}
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.userData.faces=faces;
    return geometry;
}
