import * as THREE from '../assets/fruit-window/vendor/three.module.js';

export const ORB_COIN_PHASE='controls-orb-finale';

const ROUTE=Object.freeze([
    [-.55,.09,.18],[-.58,.09,.04],[-.53,.09,-.11],[-.41,.09,-.23],
    [-.25,.09,-.29],[-.08,.09,-.25],[.08,.09,-.16],[.22,.09,-.27],
    [.39,.09,-.24],[.53,.09,-.13],[.59,.09,.02],[.55,.09,.18],
    [.43,.09,.29],[.25,.09,.32],[.07,.09,.27],[-.09,.09,.31],
    [-.26,.09,.28],[-.42,.09,.31]
]);

export function createWelcomeOrbCoinTrail(root,{onCollect=()=>{}}={}){
    const group=new THREE.Group();group.name='Orb finale yellow dot trail';root.add(group);
    const geometry=new THREE.IcosahedronGeometry(.008,1),material=new THREE.MeshStandardMaterial({color:'#f6ca42',emissive:'#e7a91d',emissiveIntensity:.62,roughness:.48,metalness:.08});
    const coins=ROUTE.map((point,index)=>{const mesh=new THREE.Mesh(geometry,material);mesh.name='Orb coin '+(index+1);mesh.position.fromArray(point);mesh.scale.setScalar(0);group.add(mesh);return {mesh,point:new THREE.Vector3(...point),collected:false};});
    let active=false,count=0,clock=0;
    function reset(){count=0;for(const coin of coins){coin.collected=false;coin.mesh.scale.setScalar(1);}}
    function update(dt,enabled,targets=[]){
        clock+=Math.max(0,dt);if(enabled && !active)reset();active=enabled;
        if(!enabled){for(const coin of coins)coin.mesh.scale.setScalar(0);return;}
        for(const coin of coins){
            if(coin.collected)continue;
            coin.mesh.rotation.y=clock*1.8;coin.mesh.rotation.x=clock*.8;
            const target=targets.find(value=>value?.position && coin.point.distanceTo(value.position)<.09);
            if(!target)continue;
            coin.collected=true;coin.mesh.scale.setScalar(0);count++;onCollect(target.source,count,coins.length);
        }
    }
    return {group,reset,update,get complete(){return count===coins.length;},snapshot:()=>({active,count,total:coins.length,remaining:coins.length-count}),destroy(){group.removeFromParent();geometry.dispose();material.dispose();}};
}
