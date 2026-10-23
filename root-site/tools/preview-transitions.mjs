import {assembleWebsite} from './assemble-website.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {LEGACY_WEBSITE_PAGES,RETIRED_WEBSITE_PAGES,resolveLegacyEntry} from '../../app/services/siteRoutes.js';
import {notFoundHtml} from './canonical-pages.mjs';
const root=process.cwd(),release=path.join(root,'root-site/releases/0.9780/payload');
const routes=new Set(Object.values(JSON.parse(fs.readFileSync('root-site/routes.json'))).map(r=>r.path));
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.mp4':'video/mp4','.xml':'application/xml','.txt':'text/plain'};
export function shell(_bytes,route='/'){const key=Object.entries(JSON.parse(fs.readFileSync('root-site/routes.json'))).find(([,r])=>r.path===route)?.[0]||'home';return assembleWebsite().replace('data-page="home"',`data-page="${key}"`);}
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost'),name=decodeURIComponent(url.pathname);
  if(name.split('/').some(part=>part==='..'||part.startsWith('.')))throw Error('Unsafe path');
  const alias=LEGACY_WEBSITE_PAGES[name]||LEGACY_WEBSITE_PAGES[name+'/'];
  if(alias){res.writeHead(301,{Location:alias+url.search});res.end();return;}
  if(RETIRED_WEBSITE_PAGES.includes(name)){res.writeHead(410,{'Content-Type':'text/html'});res.end(notFoundHtml());return;}
  const canonical=resolveLegacyEntry(url);
  if(canonical&&canonical!==name+url.search){res.writeHead(301,{Location:canonical});res.end();return;}
  if(/^\/wp-sitemap.*\.xml$/.test(name)){res.writeHead(301,{Location:'/sitemap.xml'});res.end();return;}
  let file;
  if(routes.has(name))file=path.join(release,'index.html');
  else if(['/sitemap.xml','/robots.txt','/404.html'].includes(name))file=path.join(root,'dist/website',name);
  else if(name==='/site-config.js'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end("window.NOURISHLAND_CONFIG={hosted:true,apiBase:'/xr-api',portalBase:'/',appEntry:'/app/',websiteBase:'/'};");return;}
  else if(name.startsWith('/site/'))file=path.join(root,'root-site/source',name.slice(6));
  else file=path.join(root,'dist',name);
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()){
   const fallback=path.join(release,name);if(fs.existsSync(fallback)&&fs.statSync(fallback).isFile())file=fallback;
   else {if(!/^\/(?:xr|xr-api|api|app|site|creator|explorer|field|demos|account|admin|experience)(?:\/|$)/.test(name)){res.writeHead(404,{'Content-Type':'text/html'});res.end(notFoundHtml());return;}const remote=await fetch('https://nourishland.org'+name+url.search,{signal:AbortSignal.timeout(30000)});res.writeHead(remote.status,{'Content-Type':remote.headers.get('content-type')||'application/octet-stream'});res.end(Buffer.from(await remote.arrayBuffer()));return;}
  }
  let bytes=fs.readFileSync(file);if(routes.has(name))bytes=Buffer.from(shell(bytes,name));
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');
  const range=req.headers.range?.match(/bytes=(\d+)-(\d*)/);
  if(range){const start=Number(range[1]),end=Math.min(bytes.length-1,range[2]?Number(range[2]):bytes.length-1);res.writeHead(206,{'Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${bytes.length}`});res.end(bytes.subarray(start,end+1));}
  else res.end(bytes);
 }catch(error){res.writeHead(500);res.end(error.message);}
});
const port=Number(process.env.NL_PREVIEW_PORT||8010);
server.listen(port,'127.0.0.1',()=>console.log(`Local transition review: http://127.0.0.1:${port}/platform/`));
