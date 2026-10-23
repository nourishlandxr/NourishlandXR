import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assembleWebsite} from '../root-site/tools/assemble-website.mjs';
import {WEBSITE_ALIASES,WEBSITE_ROUTES} from '../app/services/siteRoutes.js';
const root=new URL('../app/v2/',import.meta.url);
const read=file=>readFile(new URL(file,root),'utf8');
test('website offers a short introduction with a clean high-quality video hero',async()=>{
 const html=assembleWebsite(),hero=await read('homepage-hero.js');
 for(const route of ['education','food-forests','nature-learning','platform','collaborate'])assert.match(html,new RegExp(`data-route="${route}"`));
 assert.match(html,/data-biome-hero/);
 assert.doesNotMatch(html,/data-nl-hero/);
 assert.match(html,/hero-preview\.css/);
 assert.match(hero,/assets\/hero-clean-hq\//);
 assert.match(await readFile(new URL('../root-site/source/root-router.js',import.meta.url),'utf8'),/homepage-hero\.js/);
 assert.match(hero,/autoplay:true/);
 assert.doesNotMatch(hero,/data-hero-play|data-hero-replay|nl-hero-controls|poster\.decode\(/);
 assert.match(hero,/loop:true,playsInline:true/);
 assert.doesNotMatch(hero,/createElement\('iframe'\)|Nourishland-Hero-Living|heroNourishland|installBiomeDiscovery/);
 assert.match(html,/data-forest-wheel/);
 assert.match(html,/data-guide-scene/);
 assert.doesNotMatch(html,/Reserved capture|Replace with a genuine|Show an educator shaping|data-media-slot/);
 assert.match(html,/Create and explore plant knowledge/);
 assert.doesNotMatch(html,/>Food Forests &amp; Solarpunk<\/a>/);
 assert.match(html,/mailto:info@nourishland.org/);
 assert.doesNotMatch(html,/<script[^>]+pilot-application/);
 assert.doesNotMatch(html,/Review test application|founding cohort/);
 const activeHtml=html.replace(/<template[\s\S]*?<\/template>/g,'');
 const ids=[...activeHtml.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(ids.length,new Set(ids).size,'HTML ids must be unique');
});

test('legacy marketing entry no longer contains a separate website',async()=>{
 const bridge=await read('index.html');assert.match(bridge,/location.replace/);assert.match(bridge,/noindex,follow/);assert.doesNotMatch(bridge,/route-block|homepage-hero|<main>/);
 for(const alias of ['creator','explorer'])assert.equal(WEBSITE_ALIASES[alias],'platform');assert.equal(WEBSITE_ROUTES[WEBSITE_ALIASES.about]||WEBSITE_ROUTES.about,'/about/');
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
