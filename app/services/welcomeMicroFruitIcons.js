import * as THREE from '../assets/fruit-window/vendor/three.module.js';

// The seven original icons remain as authored. The expanded reference sheet
// has individually split assets for the additional named choices.
export const WELCOME_MICRO_FRUIT_CELLS=Object.freeze({
    apple:[0,0],banana:[1,0],carambola:[2,0],fig:[3,0],
    mango:[0,1],peach:[1,1],pomegranate:[2,1]
});
export const WELCOME_MICRO_FRUIT_FILES=Object.freeze([
    'dragon-fruit','coconut','cherry','blueberry','grape','blackberry','banana','avocado','apricot','watermelon','mandarin',
    'strawberry','apple','raspberry','pomegranate','plum','pineapple','peach','pear','orange','papaya','cantaloupe','mango','lychee','lime','lemon','kiwi','grapefruit','fig'
]);
const atlas=new URL('../assets/welcome-practice/micro-fruits/zinnia-hand-fruit-atlas.png',import.meta.url);
const iconUrl=id=>new URL(`../assets/welcome-practice/micro-fruits/icons/${id}.png`,import.meta.url);

export async function createWelcomeMicroFruitIcon(id,{fetchImage=fetch,decode=createImageBitmap}={}){
    const cell=WELCOME_MICRO_FRUIT_CELLS[id],individual=WELCOME_MICRO_FRUIT_FILES.includes(id),useAtlas=Boolean(cell);
    if(!cell && !individual)return null;
    const response=await fetchImage(useAtlas?atlas:iconUrl(id),{signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw new Error('Micro-fruit icon unavailable');
    const bytes=await response.arrayBuffer(),blob=new Blob([bytes],{type:'image/png'});
    const full=await decode(blob);
    const texture=new THREE.Texture(full);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;
    const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.08,depthWrite:false,side:THREE.DoubleSide});
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.085,.085),material);
    if(useAtlas){const uv=mesh.geometry.attributes.uv,minU=cell[0]/4,maxU=(cell[0]+1)/4,minV=1-(cell[1]+1)/2,maxV=1-cell[1]/2;
        uv.setXY(0,minU,maxV);uv.setXY(1,maxU,maxV);uv.setXY(2,minU,minV);uv.setXY(3,maxU,minV);uv.needsUpdate=true;}
    mesh.name='Zinnia hand micro-fruit icon: '+id;mesh.renderOrder=24;
    const group=new THREE.Group();group.name=mesh.name;group.add(mesh);
    return group;
}
