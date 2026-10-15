import * as THREE from '../assets/fruit-window/vendor/three.module.js';

// Bake the current peeled pose and clip it at its midpoint in body space.
// The retained half and its collider are centred together, including its peel.
export function prepareBananaHalf(whole){
    whole.updateWorldMatrix(true,true);const inverse=whole.parent.matrixWorld.clone().invert(),parts=[],bounds=new THREE.Box3();
    whole.traverse(mesh=>{if(!mesh.isMesh)return;const geometry=mesh.geometry,index=geometry.index,p=geometry.attributes.position,uv=geometry.attributes.uv,vertices=[];
        for(let i=0;i<(index?.count || p.count);i++){const id=index?index.getX(i):i,point=mesh.getVertexPosition(id,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);bounds.expandByPoint(point);vertices.push({point,uv:uv?new THREE.Vector2().fromBufferAttribute(uv,id):new THREE.Vector2()});}parts.push({vertices,material:mesh.material});});
    const size=bounds.getSize(new THREE.Vector3()),axis=['x','y','z'].sort((a,b)=>size[b]-size[a])[0],cut=bounds.getCenter(new THREE.Vector3())[axis],group=new THREE.Group(),remaining=new THREE.Box3();
    for(const part of parts){const positions=[],uvs=[];for(let i=0;i<part.vertices.length;i+=3){const triangle=part.vertices.slice(i,i+3),polygon=[];
            for(let j=0;j<3;j++){const a=triangle[j],b=triangle[(j+1)%3],inside=a.point[axis]<=cut,next=b.point[axis]<=cut;if(inside)polygon.push(a);if(inside!==next){const t=(cut-a.point[axis])/(b.point[axis]-a.point[axis]);polygon.push({point:a.point.clone().lerp(b.point,t),uv:a.uv.clone().lerp(b.uv,t)});}}
            for(let j=1;j<polygon.length-1;j++)for(const vertex of [polygon[0],polygon[j],polygon[j+1]]){positions.push(...vertex.point.toArray());uvs.push(...vertex.uv.toArray());remaining.expandByPoint(vertex.point);}}
        const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.computeVertexNormals();group.add(new THREE.Mesh(geometry,part.material));}
    const center=remaining.getCenter(new THREE.Vector3());for(const mesh of group.children){mesh.geometry.translate(-center.x,-center.y,-center.z);mesh.geometry.computeBoundingBox();}
    const half=remaining.getSize(new THREE.Vector3()).multiplyScalar(.5);group.name='Banana remaining after a pretend bite';
    return {group,halfSize:{x:Math.max(.008,half.x),y:Math.max(.008,half.y),z:Math.max(.008,half.z)}};
}
export function tryBananaBite(variant,body,mouth,source,onFeedback){
    if(!variant || variant.peel<.98 || variant.eaten)return false;
    const distance=mouth.distanceTo(new THREE.Vector3().copy(body.position));if(distance>.20)variant.mouthArmed=true;if(!variant.mouthArmed || distance>.105)return false;
    const half=prepareBananaHalf(variant.whole);variant.eaten=half.group;variant.whole.parent.add(half.group);variant.whole.visible=false;variant.mouthArmed=false;variant.bitten=true;
    body.halfSize=half.halfSize;body.radius=Math.max(...Object.values(body.halfSize));onFeedback('bite',source);return true;
}
