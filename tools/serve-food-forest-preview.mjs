import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),port=Number(process.env.FOOD_FOREST_PREVIEW_PORT||8093);
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.mp3':'audio/mpeg','.glb':'model/gltf-binary'};
http.createServer((req,res)=>{
    try{
        const url=new URL(req.url,'http://localhost'),pathname=decodeURIComponent(url.pathname);
        if(pathname==='/'){res.writeHead(302,{Location:'/tools/preview-food-forest-kit.html'});res.end();return;}
        if(!pathname.startsWith('/app/')&&pathname!=='/tools/preview-food-forest-kit.html'){res.writeHead(404);res.end();return;}
        let file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
        if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
        if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
        res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
    }catch{res.writeHead(400);res.end();}
}).listen(port,'127.0.0.1',()=>console.log(`Food Forest Table: http://127.0.0.1:${port}/tools/preview-food-forest-kit.html`));
