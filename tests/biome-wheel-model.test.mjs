import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';import {gunzipSync} from 'node:zlib';
test('spatial miniature comes from the current repaired master with valid visible-instance transforms',()=>{
 const folder=new URL('../app/assets/biome-wheel/',import.meta.url),meta=JSON.parse(fs.readFileSync(new URL('current-landscape.json',folder))),compressed=fs.readFileSync(new URL(meta.file,folder));
 const sha=b=>crypto.createHash('sha256').update(b).digest('hex');assert.equal(sha(compressed),meta.sha256);assert.equal(sha(fs.readFileSync(new URL('../'+meta.source,import.meta.url))),meta.sourceSha256);assert.equal(meta.nlLayer,false);
 const bytes=gunzipSync(compressed);assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.length,meta.decodedBytes);const jsonBytes=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+jsonBytes)),binStart=20+jsonBytes+8;let instances=0;
 for(const node of doc.nodes){const attributes=node.extensions?.EXT_mesh_gpu_instancing?.attributes;if(!attributes)continue;for(const id of Object.values(attributes)){const a=doc.accessors[id],v=doc.bufferViews[a.bufferView];assert.equal(a.componentType,5126);const width={VEC3:3,VEC4:4}[a.type],offset=binStart+(v.byteOffset||0)+(a.byteOffset||0);for(let i=0;i<a.count;i++)for(let c=0;c<width;c++)assert(Number.isFinite(bytes.readFloatLE(offset+i*(v.byteStride||width*4)+c*4)),'Invalid instance transform');}instances+=doc.accessors[Object.values(attributes)[0]].count;}
 assert(instances>0);assert.equal(instances,meta.instances);
 assert.equal(new Set(doc.nodes.filter(node=>node.extras?.role==='terrain').map(node=>node.extras.piece_id)).size,25,'Keep all 25 repaired terrain pieces in the snapshot');
});
