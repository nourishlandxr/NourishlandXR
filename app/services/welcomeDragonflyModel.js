import * as THREE from '../assets/fruit-window/vendor/three.module.js';

// The supplied dragonfly has four disconnected wing surfaces in Object_8.
// Build hinges from those surfaces once; only transforms change during flight.
export function prepareWelcomeDragonfly(model){
    const wings=[],surface=model.getObjectByName('Object_8');
    if(surface?.geometry?.index){const geometry=surface.geometry,indices=geometry.index.array,positions=geometry.attributes.position,parent=Array.from({length:positions.count},(_,i)=>i),find=i=>parent[i]===i?i:parent[i]=find(parent[i]);
        for(let i=0;i<indices.length;i+=3){parent[find(indices[i+1])]=find(indices[i]);parent[find(indices[i+2])]=find(indices[i]);}
        const components=new Map();for(let i=0;i<indices.length;i+=3){const key=find(indices[i]);if(!components.has(key))components.set(key,[]);components.get(key).push(indices[i],indices[i+1],indices[i+2]);}
        let order=0;for(const values of components.values()){
            const g=geometry.clone();g.setIndex(values);g.boundingBox=new THREE.Box3();for(const i of new Set(values))g.boundingBox.expandByPoint(new THREE.Vector3().fromBufferAttribute(positions,i));const bounds=g.boundingBox,hinge=new THREE.Vector3(),near=[...new Set(values)].filter(i=>positions.getZ(i)<bounds.min.z+(bounds.max.z-bounds.min.z)*.1);for(const i of near)hinge.add(new THREE.Vector3().fromBufferAttribute(positions,i));hinge.divideScalar(Math.max(1,near.length));g.translate(-hinge.x,-hinge.y,-hinge.z);
            const side=(bounds.min.x+bounds.max.x)>0?1:-1,pivot=new THREE.Group(),mesh=new THREE.Mesh(g,surface.material);pivot.position.copy(hinge);mesh.rotation.y=side*1.05;pivot.add(mesh);surface.parent.add(pivot);wings.push({pivot,side,front:order++%2?1:-1});
        }
        surface.parent.remove(surface);geometry.dispose();
    }
    model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),centre=box.getCenter(new THREE.Vector3()),factor=.22/Math.max(size.x,size.y,size.z),group=new THREE.Group();group.scale.setScalar(factor);group.position.copy(centre).multiplyScalar(-factor);group.add(model);return {model:group,wings};
}
