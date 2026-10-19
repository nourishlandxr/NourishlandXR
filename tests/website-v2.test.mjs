import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
const root=new URL('../app/v2/',import.meta.url);
const read=file=>readFile(new URL(file,root),'utf8');
test('website offers education and platform journeys with an honest collaboration path',async()=>{
 const html=await read('index.html');
 for(const route of ['education','platform','creator','explorer','pilot','collaborate','demos'])assert.match(html,new RegExp(`data-route="${route}"`));
 assert.match(html,/data-biome-hero/);
 assert.doesNotMatch(html,/data-nl-hero/);
 assert.match(html,/homepage-hero\.js\?v=natural-depth-01/);
 assert.match(html,/mailto:info@nourishland.org/);
 assert.doesNotMatch(html,/<script[^>]+pilot-application/);
 assert.doesNotMatch(html,/Review test application|founding cohort/);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(ids.length,new Set(ids).size,'HTML ids must be unique');
});
test('website v2 keeps local module and media references resolvable',async()=>{
 const html=await read('index.html');
 const files=new Set([...html.matchAll(/(?:href|src)="((?!https?:|mailto:|#)[^"]+)"/g)].map(x=>x[1].split('?')[0]));
 for(const file of files)await stat(new URL(file,root));
});
test('only the V17 viewer can be embedded by its own website',async()=>{
 const policy=await read('full-3d/.htaccess');
 assert.match(policy,/<Files "Nourishland-Hero-Living-v17\.html">/);
 assert.match(policy,/X-Frame-Options "SAMEORIGIN"/);
 assert.match(policy,/frame-ancestors 'self'/);
 assert.doesNotMatch(policy,/frame-ancestors \*/);
 const parent=await readFile(new URL('../deploy/xr.htaccess',import.meta.url),'utf8');
 assert.match(parent,/X-Frame-Options "DENY"/);
});
