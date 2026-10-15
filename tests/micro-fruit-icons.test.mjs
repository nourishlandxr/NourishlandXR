import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WELCOME_MICRO_FRUIT_CELLS,createWelcomeMicroFruitIcon} from '../app/services/welcomeMicroFruitIcons.js';

test('Zinnia selects seven individual illustrated icons without loading table fruit models',async()=>{
    const image=fs.readFileSync(new URL('../app/assets/welcome-practice/micro-fruits/zinnia-hand-fruit-atlas.png',import.meta.url));
    const width=image.readUInt32BE(16),height=image.readUInt32BE(20),requests=[],regions=[];
    assert.equal(width/4,height/2,'each atlas cell is square');
    const fetchImage=async url=>{requests.push(String(url));return {ok:true,arrayBuffer:async()=>image.buffer.slice(image.byteOffset,image.byteOffset+image.byteLength)};};
    const decode=async(_blob,...region)=>{if(region.length)regions.push(region);return {width:region[2] || width,height:region[3] || height,close(){}};};
    for(const [id,[column,row]] of Object.entries(WELCOME_MICRO_FRUIT_CELLS)){
        const icon=await createWelcomeMicroFruitIcon(id,{fetchImage,decode});
        assert.equal(icon.children[0].material.transparent,true);
        const uv=icon.children[0].geometry.attributes.uv;
        assert.deepEqual([uv.getX(0),uv.getY(0),uv.getX(3),uv.getY(3)],[column/4,1-row/2,(column+1)/4,1-(row+1)/2]);
        icon.children[0].geometry.dispose();icon.children[0].material.map.dispose();icon.children[0].material.dispose();
    }
    assert.equal(regions.length,0,'Quest can sample each icon directly from the authored atlas');assert.ok(requests.every(url=>url.endsWith('zinnia-hand-fruit-atlas.png')));
    assert.equal(await createWelcomeMicroFruitIcon('unknown',{fetchImage,decode}),null);
});
