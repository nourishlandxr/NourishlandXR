import * as THREE from '../vendor/three.module.min.js';
import { createDemoLivingMapSchedule, demoLivingMapAreaProgress, demoLivingMapItemProgress, demoLivingMapProgress } from './demoLivingMapModel.js';

// A contained live scene. Its camera never changes the visitor's XR pose.
export function createDemoLivingMapScene(model, { width = 1000, height = 560 } = {}) {
    const schedule = createDemoLivingMapSchedule(model);
    const canvas = document.createElement('canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(1); renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(38, width / height, .1, 80);
    scene.add(new THREE.HemisphereLight(0xfff3d3, 0x30483a, 2.1));
    const light = new THREE.DirectionalLight(0xffead0, 2.2); light.position.set(-5, 9, 5); scene.add(light);
    const materials = new Map(), geometries = new Set();
    const material = color => { if (!materials.has(color)) materials.set(color, new THREE.MeshLambertMaterial({ color })); return materials.get(color); };
    const geometry = value => { geometries.add(value); return value; };
    const sphere = geometry(new THREE.SphereGeometry(1, 12, 8));
    const cylinder = geometry(new THREE.CylinderGeometry(1, 1, 1, 8));
    const mesh = (geo, color, x, y, z, sx, sy = sx, sz = sx, parent = scene) => {
        const node = new THREE.Mesh(geo, material(color)); node.position.set(x, y, z); node.scale.set(sx, sy, sz); parent.add(node); return node;
    };
    mesh(geometry(new THREE.CylinderGeometry(1, 1, 1, 64)), '#66573e', 0, -.23, 0, 6.3, .4, 4.2);
    mesh(geometry(new THREE.CylinderGeometry(1, 1, 1, 64)), '#61714a', 0, -.025, 0, 6.25, .05, 4.15);
    const scenery = new THREE.Group();scene.add(scenery);scenery.visible=false;
    // Shared geometry for small planting clusters and tree canopies.
    const shrub = new THREE.InstancedMesh(sphere, material('#455e3b'), 65);
    const transform = new THREE.Object3D(); let planted = 0;
    for (let i = 0; i < 110 && planted < 65; i++) {
        const angle = i * 2.39996, radius = 1.2 + (i % 13) * .36;
        const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius * .65;
        if (model.items.some(item => Math.hypot(item.x - x, item.z - z) < .6)) continue;
        transform.position.set(x, .12, z); transform.scale.set(.15 + (i % 4) * .035, .12 + (i % 3) * .04, .17);
        transform.updateMatrix(); shrub.setMatrixAt(planted++, transform.matrix);
    }
    shrub.count = planted; scenery.add(shrub);
    for (const [x, z, size] of [[-4.6,-2.6,1],[-2,-3,.85],[1.8,-2.9,1.2],[4.4,-2.2,.9],[4.8,1.7,.8]]) {
        if (model.items.some(item => Math.hypot(item.x - x, item.z - z) < .8)) continue;
        mesh(cylinder, '#756048', x, size * .55, z, .07, size * 1.1, .07, scenery);
        mesh(sphere, '#34533c', x, size * 1.25, z, size * .55, size * .65, size * .52, scenery);
        mesh(sphere, '#567249', x - .22, size * 1.5, z + .1, size * .42, size * .4, size * .4, scenery);
    }
    for (const [x,z,sx,sz] of [[-3.4,1.8,1.5,.65],[2.7,1.9,1.3,.6]]) {
        mesh(geometry(new THREE.BoxGeometry(1,1,1)), '#867254', x, .025, z, sx, .065, sz, scenery);
    }
    const routes = model.links.length ? model.links : [[{x:-5,z:2.4},{x:5,z:-1.6}]];
    const paths = routes.map(([a,b]) => {
        const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(a.x,.055,a.z), new THREE.Vector3((a.x+b.x)/2,.055,(a.z+b.z)/2+.65),new THREE.Vector3(b.x,.055,b.z)]);
        const path=mesh(geometry(new THREE.TubeGeometry(curve,32,.09,5,false)), '#c1ae85', 0,0,0,1);path.visible=false;return path;
    });
    const boundaries = model.areas.map((area,index) => {
        const {left:l,right:r,near:n,far:f} = area;
        const corners = [[l,f],[r,f],[r,n],[l,n],[l,f]];
        const points = Array.from({length:65},(_,i)=>{const edge=Math.min(3,Math.floor(i/16)),t=(i-edge*16)/16,a=corners[edge],b=corners[edge+1];return new THREE.Vector3(a[0]+(b[0]-a[0])*t,.075,a[1]+(b[1]-a[1])*t);});
        const lineMaterial = new THREE.LineBasicMaterial({color:index ? '#a6c9b3' : '#d0d99d'}); materials.set('boundary'+index,lineMaterial);
        const line = new THREE.Line(geometry(new THREE.BufferGeometry().setFromPoints(points)),lineMaterial); scene.add(line);
        const fillMaterial = new THREE.MeshBasicMaterial({color:index ? '#85b8a2' : '#b0c679',transparent:true,opacity:.065,depthWrite:false}); materials.set('fill'+index,fillMaterial);
        const fill = new THREE.Mesh(geometry(new THREE.PlaneGeometry(r-l,n-f)),fillMaterial); fill.rotation.x=-Math.PI/2;fill.position.set((l+r)/2,.06,(n+f)/2);scene.add(fill);
        line.visible=false;fill.visible=false;
        return {area,line,fill};
    });
    const markers = model.items.map((item,index) => {
        const group = new THREE.Group(); group.position.set(item.x,0,item.z);group.visible=false;scene.add(group);
        if (item.type === 'plant') {
            const grass = /vetiver/i.test(item.name), tree = /jackfruit|lychee|acacia/i.test(item.name);
            mesh(cylinder,'#7a7650',0,.28,0,.025,.56,.025,group);
            if(grass)for(let j=0;j<7;j++){const blade=mesh(sphere,'#7d9b55',(j-3)*.035,.26,0,.025,.3,.04,group);blade.rotation.z=(j-3)*.15;}
            else for(let j=0;j<(tree?8:6);j++){const angle=j*2.4;const leaf=mesh(sphere,index%2?'#70965a':'#8da55d',Math.cos(angle)*.14,.18+j*.07,Math.sin(angle)*.14,tree?.16:.115,.065,tree?.13:.08,group);leaf.rotation.z=Math.sin(angle)*.5;}
            const orbMaterial=new THREE.MeshPhongMaterial({color:'#bed8a3',transparent:true,opacity:.24,shininess:65,depthWrite:false});materials.set('orb'+index,orbMaterial);
            const orb=new THREE.Mesh(sphere,orbMaterial);orb.position.y=.4;orb.scale.setScalar(.38);group.add(orb);
        } else if(item.type === 'zone') {
            mesh(cylinder,'#795f41',0,.34,0,.1,.68,.1,group);
            mesh(sphere,'#d8cf9b',0,.7,0,.09,.065,.09,group);
        } else {
            const note=mesh(geometry(new THREE.BoxGeometry(1,1,1)),'#d5bd84',0,.24,0,.16,.2,.055,group);note.rotation.y=.35;
        }
        const ringMaterial=new THREE.MeshBasicMaterial({color:item.type==='note'?'#dec88e':'#c7e4ae',transparent:true,opacity:.8,depthWrite:false});materials.set('ring'+index,ringMaterial);
        const ring=new THREE.Mesh(geometry(new THREE.RingGeometry(.17,.195,32)),ringMaterial);ring.rotation.x=-Math.PI/2;ring.position.y=.095;group.add(ring);
        return {item,group,ring};
    });
    const cloudItems=model.areas.flatMap(area=>[area.totem,...area.members.filter(item=>item.id!==area.id)]);
    for(const item of model.items)if(!cloudItems.some(entry=>entry.id===item.id))cloudItems.push(item);
    let lastPaint=-Infinity, disposed=false, settledPaint=false, lastReduced=null;
    const projected = new THREE.Vector3();
    return {
        canvas,schedule,
        draw(ctx, elapsed, reducedMotion, rect) {
            if(disposed)return;
            const {x,y,width:w,height:h}=rect;
            const columns=w>=700?4:w>=440?3:2;
            const fontSize=w>=700?20:w>=440?14:12,tagHeight=fontSize+10;
            const cloudHeight=Math.ceil(cloudItems.length/columns)*(tagHeight+7)+18;
            const landY=y+cloudHeight,landHeight=Math.max(60,h-cloudHeight);
            const renderHeight=Math.round(width*landHeight/w);
            if(canvas.height!==renderHeight){
                renderer.setSize(width,renderHeight,false);
                camera.aspect=w/landHeight;camera.updateProjectionMatrix();settledPaint=false;lastPaint=-Infinity;
            }
            const progress=demoLivingMapProgress(elapsed,reducedMotion,schedule);
            if(elapsed<lastPaint || lastReduced!==reducedMotion)settledPaint=false;
            if(!settledPaint && (elapsed-lastPaint>=1000/24 || elapsed<lastPaint || lastReduced!==reducedMotion)){
                const rise=progress.camera, wide=progress.wide;
                camera.position.set(1.8*rise,2.1+5.8*rise+wide,8.5+.2*rise+1.1*wide);camera.lookAt(0,.15,0);
                camera.zoom=1;camera.updateProjectionMatrix();camera.updateMatrixWorld();
                let extentX=0,extentY=0;
                const fitPoint=(px,py,pz)=>{projected.set(px,py,pz).project(camera);extentX=Math.max(extentX,Math.abs(projected.x));extentY=Math.max(extentY,Math.abs(projected.y));};
                for(let i=0;i<32;i++){const angle=i*Math.PI/16;fitPoint(Math.cos(angle)*6.3,.05,Math.sin(angle)*4.2);fitPoint(Math.cos(angle)*6.3,-.43,Math.sin(angle)*4.2);}
                // Include the tallest context trees in the final composition.
                if(progress.scenery>0)for(const [px,pz,py] of [[-4.6,-2.6,1.9],[-2,-3,1.6],[1.8,-2.9,2.3],[4.4,-2.2,1.7],[4.8,1.7,1.5]])fitPoint(px,py*progress.scenery,pz);
                camera.zoom=Math.min(.92/extentX,.88/extentY);camera.updateProjectionMatrix();
                boundaries.forEach(({area,line,fill})=>{const boundary=demoLivingMapAreaProgress(schedule,area.id,elapsed,reducedMotion);line.visible=boundary>0;line.geometry.setDrawRange(0,Math.round(boundary*64)+1);fill.visible=boundary>=.99;});
                markers.forEach(({item,group,ring})=>{
                    const born=demoLivingMapItemProgress(schedule,item.id,elapsed,reducedMotion);
                    group.visible=born>0;group.scale.setScalar(Math.max(.001,born));
                    group.position.y=item.type==='zone'?-.68*(1-born):.12*(1-born);
                    const age=elapsed-schedule.items[item.id].startAt;
                    ring.material.opacity=born*(reducedMotion || age>1600?.65:.65+.25*Math.sin(age/180));
                });
                paths.forEach(path=>{path.visible=progress.path>0;path.geometry.setDrawRange(0,Math.floor(progress.path*32)*30);});
                scenery.visible=progress.scenery>0;scenery.scale.y=Math.max(.001,progress.scenery);shrub.count=Math.floor(planted*progress.scenery);
                renderer.render(scene,camera);lastPaint=elapsed;settledPaint=progress.settled;lastReduced=reducedMotion;
            }
            ctx.drawImage(canvas,x,landY,w,landHeight);
            ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
            // Tags occupy a separate cloud above the landscape. Stable slots
            // keep them apart while strings retain their spatial connection.
            const tags=[];
            cloudItems.forEach((item,index)=>{
                if(demoLivingMapItemProgress(schedule,item.id,elapsed,reducedMotion)<.85)return;
                const important=item.type==='zone';
                let text=important?item.name+' Totem':item.name;
                ctx.font=`${important?'600':'500'} ${fontSize}px system-ui`;
                const cellWidth=w/columns,maxTextWidth=cellWidth-24;
                if(ctx.measureText(text).width>maxTextWidth){
                    while(text.length && ctx.measureText(text+'…').width>maxTextWidth)text=text.slice(0,-1);
                    text+='…';
                }
                const tw=ctx.measureText(text).width+16;
                const tx=x+(index%columns+.5)*cellWidth;
                const ty=y+9+tagHeight/2+Math.floor(index/columns)*(tagHeight+7);
                projected.set(item.x,important?.7:.45,item.z).project(camera);
                const px=x+(projected.x+1)*w/2,py=landY+(1-projected.y)*landHeight/2;
                tags.push({text,tx,ty,tw,important,px,py});
            });
            // Draw strings first so every tag remains clean and readable.
            ctx.strokeStyle='rgba(218,235,195,.38)';ctx.fillStyle='#c7e4ae';ctx.lineWidth=1;
            for(const tag of tags){
                ctx.beginPath();ctx.moveTo(tag.tx,tag.ty+tagHeight/2);ctx.lineTo(tag.px,tag.py);ctx.stroke();
                ctx.beginPath();ctx.arc(tag.px,tag.py,2,0,Math.PI*2);ctx.fill();
            }
            for(const tag of tags){
                ctx.fillStyle='rgba(16,35,29,.96)';ctx.beginPath();ctx.roundRect(tag.tx-tag.tw/2,tag.ty-tagHeight/2,tag.tw,tagHeight,8);ctx.fill();
                ctx.font=`${tag.important?'600':'500'} ${fontSize}px system-ui`;ctx.fillStyle='#f4f2df';ctx.fillText(tag.text,tag.tx,tag.ty);
            }
            ctx.restore();
        },
        dispose(){if(disposed)return;disposed=true;geometries.forEach(value=>value.dispose());materials.forEach(value=>value.dispose());renderer.dispose();renderer.forceContextLoss();}
    };
}
