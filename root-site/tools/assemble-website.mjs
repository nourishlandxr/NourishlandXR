import fs from 'node:fs';import path from 'node:path';
import {experiencePages} from '../source/experience-pages.mjs';
import {LEGACY_ENTRY_FILES,bridgeHtml,sitemapXml,robotsTxt,notFoundHtml} from './canonical-pages.mjs';
export const revision='0.9792';
export function replaceSection(html,id,replacement){
 const start=html.search(new RegExp(`<section\\b[^>]*\\bid="${id}"`));if(start<0)throw Error('Missing route '+id);
 const tags=/<\/?section\b[^>]*>/g;tags.lastIndex=start;let depth=0,match;
 while((match=tags.exec(html))){depth+=match[0].startsWith('</')?-1:1;if(depth===0)return html.slice(0,start)+replacement+html.slice(tags.lastIndex);}
 throw Error('Unbalanced route '+id);
}
export function assembleWebsite(){
 let html=fs.readFileSync('root-site/releases/0.9780/payload/index.html','utf8');
 html=html.replace('<html lang="en">','<html lang="en" data-experience-site>');
 html=html.replace(/<nav id="main-nav"[\s\S]*?<\/nav>/,fs.readFileSync('root-site/source/site-navigation.html','utf8'));
 let education=fs.readFileSync('root-site/source/education-flower.html','utf8');
 education=education.replace(/<header class="wrap education-intro">[\s\S]*?<\/header>/,`<header class="wrap education-intro"><h1 tabindex="-1">Learning begins with curiosity.</h1></header>`)
 .replace(/<\/section>\s*$/,`<p class="education-after-orb">Nourishland connects plant knowledge to real places. Observe, explore and learn through food forests, guided experiences and the people who care for them.</p></section>`);
 html=replaceSection(html,'education',education);
 html=replaceSection(html,'platform',fs.readFileSync('root-site/source/platform-totem.html','utf8'));
 html=replaceSection(html,'food-forest-guide',fs.readFileSync('root-site/source/food-forest-guide.html','utf8'));
 html=replaceSection(html,'food-forest-story',fs.readFileSync('root-site/source/food-forest-story.html','utf8'));
 for(const [key,markup]of Object.entries(experiencePages))html=replaceSection(html,key,markup);
 html=html.replace(/<h2 id="foodforest-title">([\s\S]*?)<\/h2>/,'<h1 id="foodforest-title" tabindex="-1">$1</h1>');
 html=html.replace(/<script type="module" src="\/site\/platform-totem.js[^>]*><\/script>/,'');
 html=html.replace(/<script type="module" src="\/site\/root-router.js[^>]*><\/script>/,`<script type="module" src="/site/root-router.js?v=${revision}"></script>`);
 html=html.replace('</head>',`<link rel="stylesheet" href="/site/experience.css?v=${revision}"><link rel="stylesheet" href="/site/living-surfaces.css?v=${revision}"><link rel="stylesheet" href="/site/food-forest-guide.css?v=${revision}"><link rel="stylesheet" href="/site/food-forest-story.css?v=${revision}"></head>`);
 html=html.replace(/hero-preview\.css\?[^" ]+/g,`hero-preview.css?v=${revision}`);
 html=html.replace(/<script[^>]*src="\/xr\/v2\/food-forest-story.js[^>]*><\/script>/,'');
 html=html.replace('</head>',`<link rel="stylesheet" href="/site/experience-refinements.css?v=${revision}"><script type="module" src="/site/story-reader.js?v=${revision}"></script></head>`);
 html=html.replace('</head>',`<link rel="stylesheet" href="/site/site-navigation.css?v=${revision}"></head>`);
 const platform=fs.readFileSync('root-site/source/platform-totem.html','utf8'),start=platform.indexOf('<section class="creator-system"');
 const tags=/<\/?section\b[^>]*>/g;tags.lastIndex=start;let depth=0,match,feature='';
 while((match=tags.exec(platform))){depth+=match[0].startsWith('</')?-1:1;if(depth===0){feature=platform.slice(start,tags.lastIndex);break;}}
 html=html.replace('</body>',`<template id="creator-showcase-template">${feature}</template></body>`);
 // Refresh shared styles and modules for visitors who already opened the site.
 html=html.replace(/((?:src|href)=")(\/site\/[^"?]+\.(?:js|mjs|css))(?:\?[^" ]*)?"/g,`$1$2?v=${revision}"`);
 return html;
}
if(process.argv.includes('--build')){
 const output=path.resolve('dist/website');fs.mkdirSync(output,{recursive:true});
 const html=assembleWebsite(),routes=JSON.parse(fs.readFileSync('root-site/routes.json'));
 for(const [key,route]of Object.entries(routes)){const dir=path.join(output,route.path);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'index.html'),html.replace('data-page="home"',`data-page="${key}"`));}
 fs.cpSync('root-site/source',path.join(output,'site'),{recursive:true});
 for(const file of Object.keys(LEGACY_ENTRY_FILES)){const target=path.join(output,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bridgeHtml(file));}
 fs.writeFileSync(path.join(output,'sitemap.xml'),sitemapXml());fs.writeFileSync(path.join(output,'robots.txt'),robotsTxt());fs.writeFileSync(path.join(output,'404.html'),notFoundHtml());
 console.log(`Assembled ${Object.keys(routes).length} routes at ${output}`);
}
