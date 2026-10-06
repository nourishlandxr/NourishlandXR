import * as THREE from '../vendor/three.module.min.js';
import {translateNxrText,localizedCanvasContext} from './i18n.js';
import { createDemoLivingMapSchedule, demoLivingMapAreaProgress, demoLivingMapItemProgress, demoLivingMapProgress, demoLivingMapStage, LIVING_MAP_ORB_SETTLE_MS } from './demoLivingMapModel.js';

// A contained live scene. Its camera never changes the visitor's XR pose.
export function createDemoLivingMapScene(model, { width = 1200, height = 560, placement=null } = {}) {
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
    for (let i = 0; !model.concept && i < 110 && planted < 65; i++) {
        const angle = i * 2.39996, radius = 1.2 + (i % 13) * .36;
        const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius * .65;
        if (model.items.some(item => Math.hypot(item.x - x, item.z - z) < .6)) continue;
        transform.position.set(x, .12, z); transform.scale.set(.15 + (i % 4) * .035, .12 + (i % 3) * .04, .17);
        transform.updateMatrix(); shrub.setMatrixAt(planted++, transform.matrix);
    }
    // Ordered planting follows the swales; the second garden stays open.
    for(const row of model.landscape?.swales || []){
        const points=row.map(({x,z})=>new THREE.Vector3(x,.055,z));
        const curve=new THREE.CatmullRomCurve3(points);
        mesh(geometry(new THREE.TubeGeometry(curve,32,.065,5,false)),'#8c805a',0,0,0,1,1,1,scenery);
        row.filter((_,i)=>i%3===0).forEach(({x,z},i)=>{
            transform.position.set(x,.13,z+.17);transform.scale.set(.16,.12+(i%3)*.035,.14);
            transform.updateMatrix();shrub.setMatrixAt(planted++,transform.matrix);
        });
    }
    shrub.count = planted; scenery.add(shrub);
    const contextTrees=model.landscape?.trees?.map(({x,z,size})=>[x,z,size]) || [[-4.6,-2.6,1],[-2,-3,.85],[1.8,-2.9,1.2],[4.4,-2.2,.9],[4.8,1.7,.8]];
    for (const [x, z, size] of contextTrees) {
        if (model.items.some(item => Math.hypot(item.x - x, item.z - z) < .8)) continue;
        mesh(cylinder, '#756048', x, size * .55, z, .07, size * 1.1, .07, scenery);
        mesh(sphere, '#34533c', x, size * 1.25, z, size * .55, size * .65, size * .52, scenery);
        mesh(sphere, '#567249', x - .22, size * 1.5, z + .1, size * .42, size * .4, size * .4, scenery);
    }
    for (const [x,z,sx,sz] of (model.concept?[]:[[-3.4,1.8,1.5,.65],[2.7,1.9,1.3,.6]])) {
        mesh(geometry(new THREE.BoxGeometry(1,1,1)), '#867254', x, .025, z, sx, .065, sz, scenery);
    }
    const routes = model.links.length ? model.links : [[{x:-5,z:2.4},{x:5,z:-1.6}]];
    const paths = routes.map(([a,b]) => {
        const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(a.x,.075,a.z), new THREE.Vector3((a.x+b.x)/2,.075,(a.z+b.z)/2+.65),new THREE.Vector3(b.x,.075,b.z)]);
        const path=mesh(geometry(new THREE.TubeGeometry(curve,32,.09,5,false)), '#c1ae85', 0,0,0,1);path.visible=false;return path;
    });
    const boundaries = model.areas.map((area,index) => {
        const {left:l,right:r,near:n,far:f} = area;
        const corners = [[l,f],[r,f],[r,n],[l,n],[l,f]];
        const points = Array.from({length:65},(_,i)=>{
            if(model.concept){const angle=i*Math.PI/32;return new THREE.Vector3((l+r)/2+(r-l)/2*Math.cos(angle),.075,(n+f)/2+(n-f)/2*Math.sin(angle));}
            const edge=Math.min(3,Math.floor(i/16)),t=(i-edge*16)/16,a=corners[edge],b=corners[edge+1];return new THREE.Vector3(a[0]+(b[0]-a[0])*t,.075,a[1]+(b[1]-a[1])*t);
        });
        const lineMaterial = new THREE.LineBasicMaterial({color:index ? '#a6c9b3' : '#d0d99d'}); materials.set('boundary'+index,lineMaterial);
        const line = new THREE.Line(geometry(new THREE.BufferGeometry().setFromPoints(points)),lineMaterial); scene.add(line);
        const fillMaterial = new THREE.MeshBasicMaterial({color:index ? '#85b8a2' : '#b0c679',transparent:true,opacity:.065,depthWrite:false}); materials.set('fill'+index,fillMaterial);
        const fill = new THREE.Mesh(geometry(model.concept?new THREE.CircleGeometry(1,48):new THREE.PlaneGeometry(r-l,n-f)),fillMaterial); fill.rotation.x=-Math.PI/2;fill.position.set((l+r)/2,.06,(n+f)/2);if(model.concept)fill.scale.set((r-l)/2,(n-f)/2,1);scene.add(fill);
        line.visible=false;fill.visible=false;
        return {area,line,fill};
    });
    const markers = model.items.map((item,index) => {
        const group = new THREE.Group(); group.position.set(item.x,0,item.z);group.visible=false;scene.add(group);
        let orb=null;
        if (item.type === 'plant') {
            const grass = /vetiver/i.test(item.name), tree = item.tree || /jackfruit|lychee|acacia/i.test(item.name);
            mesh(cylinder,'#7a7650',0,.28,0,.025,.56,.025,group);
            if(grass)for(let j=0;j<7;j++){const blade=mesh(sphere,'#7d9b55',(j-3)*.035,.26,0,.025,.3,.04,group);blade.rotation.z=(j-3)*.15;}
            else for(let j=0;j<(tree?8:6);j++){const angle=j*2.4;const leaf=mesh(sphere,index%2?'#70965a':'#8da55d',Math.cos(angle)*.14,.18+j*.07,Math.sin(angle)*.14,tree?.16:.115,.065,tree?.13:.08,group);leaf.rotation.z=Math.sin(angle)*.5;}
            const orbMaterial=new THREE.MeshPhongMaterial({color:'#bed8a3',transparent:true,opacity:.24,shininess:65,depthWrite:false});materials.set('orb'+index,orbMaterial);
            orb=new THREE.Mesh(sphere,orbMaterial);orb.position.y=.4;orb.scale.setScalar(.38);group.add(orb);
        } else if(item.type === 'zone') {
            mesh(cylinder,'#795f41',0,.34,0,.1,.68,.1,group);
            const glass=new THREE.MeshPhongMaterial({color:'#bfe0d6',transparent:true,opacity:.48,shininess:85,depthWrite:false});materials.set('totem-glass'+index,glass);
            const collar=new THREE.Mesh(cylinder,glass);collar.position.y=.54;collar.scale.set(.16,.25,.16);group.add(collar);
            const tip=new THREE.MeshPhongMaterial({color:'#fff2b7',emissive:'#b7a152',emissiveIntensity:.65,shininess:50});materials.set('totem-tip'+index,tip);
            const beacon=new THREE.Mesh(sphere,tip);beacon.position.y=.72;beacon.scale.set(.15,.14,.15);group.add(beacon);
        } else {
            const note=mesh(geometry(new THREE.BoxGeometry(1,1,1)),'#d5bd84',0,.24,0,.16,.2,.055,group);note.rotation.y=.35;
        }
        const ringMaterial=new THREE.MeshBasicMaterial({color:item.type==='note'?'#dec88e':'#c7e4ae',transparent:true,opacity:.8,depthWrite:false});materials.set('ring'+index,ringMaterial);
        const ring=new THREE.Mesh(geometry(new THREE.RingGeometry(.17,.195,32)),ringMaterial);ring.rotation.x=-Math.PI/2;ring.position.y=.095;group.add(ring);
        if(model.concept && item.type==='plant')ring.visible=false;
        return {item,group,ring,orb};
    });
    const targetMaterial=new THREE.MeshBasicMaterial({color:'#e5f6c6',transparent:true,opacity:.65,depthWrite:false});materials.set('placement-target',targetMaterial);
    const targetRing=new THREE.Mesh(geometry(new THREE.RingGeometry(.30,.35,40)),targetMaterial);targetRing.rotation.x=-Math.PI/2;targetRing.position.y=.1;targetRing.visible=false;scene.add(targetRing);
    let welcomeTexture=null,welcomeScreen=null;
    if(model.interactive){
        const label=document.createElement('canvas');label.width=256;label.height=256;
        const text=localizedCanvasContext(label.getContext('2d'));text.fillStyle='rgba(15,37,31,.88)';text.beginPath();text.arc(128,128,124,0,Math.PI*2);text.fill();text.strokeStyle='#e1f1cf';text.lineWidth=5;text.stroke();text.fillStyle='#fffdf0';text.font='600 32px system-ui';text.textAlign='center';text.fillText('Welcome',128,140,225);
        welcomeTexture=new THREE.CanvasTexture(label);
        const glass=new THREE.MeshBasicMaterial({map:welcomeTexture,transparent:true,side:THREE.DoubleSide,depthWrite:false});materials.set('entry-welcome',glass);
        welcomeScreen=new THREE.Mesh(geometry(new THREE.CircleGeometry(.44,32)),glass);welcomeScreen.visible=false;scene.add(welcomeScreen);
    }
    const cloudItems=model.concept?model.areas.map(area=>area.totem):model.areas.flatMap(area=>[area.totem,...area.members.filter(item=>item.id!==area.id)]);
    if(!model.concept)for(const item of model.items)if(!cloudItems.some(entry=>entry.id===item.id))cloudItems.push(item);
    let lastPaint=-Infinity, disposed=false, settledPaint=false, lastReduced=null;
    const projected = new THREE.Vector3();
    return {
        canvas,schedule,
        project(item,rect){
            const tagHeight=(rect.width>=700?20:rect.width>=440?14:12)+10,cloudHeight=tagHeight+18;
            projected.set(item.x,.095,item.z).project(camera);
            return {x:rect.x+(projected.x+1)*rect.width/2,y:rect.y+cloudHeight+(1-projected.y)*(rect.height-cloudHeight)/2};
        },
        draw(ctx, elapsed, reducedMotion, rect) {
            if(disposed)return;
            const {x,y,width:w,height:h}=rect;
            const columns=model.concept?2:w>=700?4:w>=440?3:2;
            const fontSize=w>=700?20:w>=440?14:12,tagHeight=fontSize+10;
            const cloudHeight=model.concept?tagHeight+18:Math.ceil(cloudItems.length/columns)*(tagHeight+7)+18;
            const landY=y+cloudHeight,landHeight=Math.max(60,h-cloudHeight);
            const renderHeight=Math.round(width*landHeight/w);
            if(canvas.height!==renderHeight){
                renderer.setSize(width,renderHeight,false);
                camera.aspect=w/landHeight;camera.updateProjectionMatrix();settledPaint=false;lastPaint=-Infinity;
            }
            const placed=placement?.snapshot() || [];
            if(model.interactive){
                model.items.forEach(item=>{
                    const owner=placed.find(entry=>entry.id===(item.areaId || item.id));
                    schedule.items[item.id]={startAt:owner?owner.at+(item.type==='plant'?400+model.items.filter(p=>p.type==='plant').indexOf(item)*220:0):Infinity,duration:item.type==='plant'?700:600};
                });
            }
            const bornFor=id=>model.interactive && !Number.isFinite(schedule.items[id]?.startAt)?0:demoLivingMapItemProgress(schedule,id,elapsed,reducedMotion);
            const progress=demoLivingMapProgress(elapsed,reducedMotion,schedule);
            if(model.interactive){progress.camera=1;progress.wide=1;progress.settled=!placement?.current() && elapsed>(placed.at(-1)?.at || 0)+2800;}
            if(elapsed<lastPaint || lastReduced!==reducedMotion)settledPaint=false;
            if(!settledPaint && (elapsed-lastPaint>=1000/24 || elapsed<lastPaint || lastReduced!==reducedMotion)){
                const rise=model.concept ? .85+.15*progress.camera : progress.camera, wide=progress.wide;
                camera.position.set(1.8*rise,2.1+5.8*rise+wide,8.5+.2*rise+1.1*wide);camera.lookAt(0,.15,0);
                camera.zoom=1;camera.updateProjectionMatrix();camera.updateMatrixWorld();
                let extentX=0,extentY=0;
                const fitPoint=(px,py,pz)=>{projected.set(px,py,pz).project(camera);extentX=Math.max(extentX,Math.abs(projected.x));extentY=Math.max(extentY,Math.abs(projected.y));};
                for(let i=0;i<32;i++){const angle=i*Math.PI/16;fitPoint(Math.cos(angle)*6.3,.05,Math.sin(angle)*4.2);fitPoint(Math.cos(angle)*6.3,-.43,Math.sin(angle)*4.2);}
                // Include the tallest context trees in the final composition.
                if(progress.scenery>0)for(const [px,pz,size] of contextTrees)fitPoint(px,size*1.9*progress.scenery,pz);
                camera.zoom=Math.min(.92/extentX,.88/extentY);camera.updateProjectionMatrix();
                boundaries.forEach(({area,line,fill})=>{const boundary=model.concept?1:demoLivingMapAreaProgress(schedule,area.id,elapsed,reducedMotion);line.visible=boundary>0;line.geometry.setDrawRange(0,Math.round(boundary*64)+1);fill.visible=boundary>=.99;});
                markers.forEach(({item,group,ring,orb})=>{
                    const born=bornFor(item.id);
                    const landscapePlant=model.concept && item.type==='plant';
                    group.visible=landscapePlant || born>0;group.scale.setScalar(landscapePlant?1:Math.max(.001,born));
                    group.position.y=landscapePlant?0:item.type==='zone'?-.68*(1-born):.12*(1-born);
                    if(landscapePlant){orb.visible=born>0;orb.scale.setScalar(.38*born);orb.material.opacity=.32*born;}
                    const age=elapsed-schedule.items[item.id].startAt;
                    ring.material.opacity=born*(reducedMotion || age>1600?.65:.65+.25*Math.sin(age/180));
                });
                paths.forEach((path,index)=>{const arrival=placed[index+1],t=model.interactive?arrival?(reducedMotion?1:Math.max(0,Math.min(1,(elapsed-arrival.at-200)/1500))):0:progress.path;path.visible=t>0;path.geometry.setDrawRange(0,Math.floor(t*32)*30);});
                const current=placement?.current(elapsed);targetRing.visible=Boolean(current);if(current){targetRing.position.set(current.x,.1,current.z);targetRing.scale.setScalar(reducedMotion?1:1+.09*Math.sin(elapsed/430));targetMaterial.opacity=reducedMotion?.65:.5+.18*Math.sin(elapsed/430);}
                if(welcomeScreen){welcomeScreen.visible=placed.length>0;welcomeScreen.position.set(model.areas[0].totem.x-.65,.62,model.areas[0].totem.z);welcomeScreen.quaternion.copy(camera.quaternion);welcomeScreen.scale.setScalar(Math.max(.001,bornFor(model.areas[0].id)));}
                scenery.visible=progress.scenery>0;scenery.scale.y=Math.max(.001,progress.scenery);shrub.count=Math.floor(planted*progress.scenery);
                renderer.render(scene,camera);lastPaint=elapsed;settledPaint=progress.settled;lastReduced=reducedMotion;
            }
            ctx.drawImage(canvas,x,landY,w,landHeight);
            ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
            if(model.concept){
                ctx.font=`500 ${fontSize}px system-ui`;ctx.fillStyle='#f4f2df';
                let interactiveLabel='';
                if(model.interactive){
                    if(placed.length===0)interactiveLabel='Place Totem 1 at the visitor entrance';
                    else if(placed.length===1)interactiveLabel='Place Totem 2 in the open forest';
                    else if(placed.length===2)interactiveLabel=elapsed<placed[1].at+LIVING_MAP_ORB_SETTLE_MS?'Three Orbs join the forest Totem':'Place Totem 3 at the swale entrance';
                    else interactiveLabel='Three Totems · one connected place';
                }
                ctx.fillText(model.interactive?translateNxrText(interactiveLabel):demoLivingMapStage(elapsed,reducedMotion),x+w/2,y+tagHeight/2,w-20);
                // Only the two Totems need labels; no plant-name tag cloud.
                for(const item of cloudItems){
                    if(bornFor(item.id)<.85)continue;
                    projected.set(item.x,.85,item.z).project(camera);
                    const px=x+(projected.x+1)*w/2,py=landY+(1-projected.y)*landHeight/2;
                    const labelWidth=ctx.measureText(item.name).width+16;
                    ctx.fillStyle='rgba(16,35,29,.9)';ctx.beginPath();ctx.roundRect(px-labelWidth/2,py-tagHeight,labelWidth,tagHeight,8);ctx.fill();
                    ctx.fillStyle='#f4f2df';ctx.fillText(item.name,px,py-tagHeight/2);
                }
                ctx.restore();return;
            }
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
        dispose(){if(disposed)return;disposed=true;welcomeTexture?.dispose();geometries.forEach(value=>value.dispose());materials.forEach(value=>value.dispose());renderer.dispose();renderer.forceContextLoss();}
    };
}
