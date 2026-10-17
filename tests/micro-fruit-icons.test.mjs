import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WELCOME_MICRO_FRUIT_CELLS,WELCOME_MICRO_FRUIT_FILES,createWelcomeMicroFruitIcon} from '../app/services/welcomeMicroFruitIcons.js';

test('expanded fruit sheet is split into individually addressable transparent icons',async()=>{
    const manifest=JSON.parse(fs.readFileSync(new URL('../app/assets/welcome-practice/micro-fruits/icons-manifest.json',import.meta.url)));
    assert.equal(Object.keys(manifest.icons).length,29);
    assert.deepEqual([...WELCOME_MICRO_FRUIT_FILES].sort(),Object.keys(manifest.icons).sort());
    const requests=[];
    const fetchImage=async url=>{requests.push(String(url));const pathname=new URL(url).pathname,basename=pathname.split('/').at(-1),relative=basename==='zinnia-hand-fruit-atlas.png'?'zinnia-hand-fruit-atlas.png':manifest.icons[basename.replace(/\.png$/,'')].file;const image=fs.readFileSync(new URL('../app/assets/welcome-practice/micro-fruits/'+relative,import.meta.url));return {ok:true,arrayBuffer:async()=>image.buffer.slice(image.byteOffset,image.byteOffset+image.byteLength)};};
    const decode=async blob=>{const bytes=Buffer.from(await blob.arrayBuffer());return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),close(){}};};
    for(const [id,entry] of Object.entries(manifest.icons)){
        const icon=await createWelcomeMicroFruitIcon(id,{fetchImage,decode});
        assert.equal(icon.children[0].material.transparent,true);
        const legacyCell=WELCOME_MICRO_FRUIT_CELLS[id];
        assert.ok(requests.at(-1).endsWith(legacyCell?'zinnia-hand-fruit-atlas.png':entry.file));
        assert.equal(icon.children[0].geometry.attributes.uv.getX(0),legacyCell?legacyCell[0]/4:0);
        icon.children[0].geometry.dispose();icon.children[0].material.map.dispose();icon.children[0].material.dispose();
    }
    assert.equal(requests.length,29);
    const legacyImage=fs.readFileSync(new URL('../app/assets/welcome-practice/micro-fruits/zinnia-hand-fruit-atlas.png',import.meta.url));
    const atlasIcon=await createWelcomeMicroFruitIcon('carambola',{fetchImage:async()=>({ok:true,arrayBuffer:async()=>legacyImage.buffer.slice(legacyImage.byteOffset,legacyImage.byteOffset+legacyImage.byteLength)}),decode:async()=>({width:400,height:400,close(){}})});
    assert.equal(atlasIcon.children[0].geometry.attributes.uv.getX(0),.5);
    assert.equal(await createWelcomeMicroFruitIcon('unknown',{fetchImage,decode}),null);
});
