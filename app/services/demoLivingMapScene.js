import * as THREE from '../vendor/three.module.min.js';
import {translateNxrText,localizedCanvasContext} from './i18n.js';
import { createDemoLivingMapSchedule, demoLivingMapAreaProgress, demoLivingMapItemProgress, demoLivingMapProgress, demoLivingMapStage, LIVING_MAP_ORB_SETTLE_MS } from './demoLivingMapModel.js';
import {livingMapRoutes,sampleLivingMapRoute} from './demoLivingMapRoute.js';
import {createLivingMapVisitors,LIVING_MAP_VISITOR_COLOURS} from './demoLivingMapVisitors.js';
import {createTotemSculptureGeometry} from './spatialTotemSculpture.js';
import {livingMapGreeneryProgress} from './demoLivingMapReveal.js';

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
    const sphere = geometry(new THREE.SphereGeometry(1, 16, 10));
    const cylinder = geometry(new THREE.CylinderGeometry(1, 1, 1, 12));
    const mesh = (geo, color, x, y, z, sx, sy = sx, sz = sx, parent = scene) => {
        const node = new THREE.Mesh(geo, material(color)); node.position.set(x, y, z); node.scale.set(sx, sy, sz); parent.add(node); return node;
    };
    mesh(geometry(new THREE.CylinderGeometry(1, 1, 1, 64)), '#66573e', 0, -.23, 0, 6.3, .4, 4.2);
    mesh(geometry(new THREE.CylinderGeometry(1, 1, 1, 64)), '#61714a', 0, -.025, 0, 6.25, .05, 4.15);
    const edge=mesh(geometry(new THREE.TorusGeometry(1,.012,6,64)),'#bac894',0,-.01,0,6.2,4.12,1);edge.rotation.x=-Math.PI/2;
    if(model.interactive)for(const x of [-6,6]){
        const rim=mesh(geometry(new THREE.TorusGeometry(.22,.04,6,20)),'#b8d7a4',x,.06,0,1);rim.rotation.x=-Math.PI/2;
    }
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
    for (const [index, [x, z, size]] of contextTrees.entries()) {
        if (model.items.some(item => Math.hypot(item.x - x, item.z - z) < .8)) continue;
        mesh(cylinder, '#756048', x, size * .55, z, .07, size * 1.1, .07, scenery);
        // One continuous crown, with varied height, width, lean and colour.
        // Avoid the repeated satellite ball perched on every tree.
        const shapes=[[.58,.48,.50],[.39,.76,.42],[.65,.55,.43],[.48,.63,.58]];
        const [sx,sy,sz]=shapes[index%shapes.length];
        const crown=mesh(sphere,['#34533c','#4c6841','#3f6347','#567249'][index%4],x,size*(.95+sy*.55),z,size*sx,size*sy,size*sz,scenery);
        crown.rotation.set(.08*Math.sin(index*2.1),index*.73,.12*Math.cos(index*1.7));
    }
    for (const [x,z,sx,sz] of (model.concept?[]:[[-3.4,1.8,1.5,.65],[2.7,1.9,1.3,.6]])) {
        mesh(geometry(new THREE.BoxGeometry(1,1,1)), '#867254', x, .025, z, sx, .065, sz, scenery);
    }
    const routes = livingMapRoutes(model);
    const paths = routes.map(points => {
        // Piecewise routes preserve checked tree clearance; a spline could cut
        // back through the canopy when rounding a bend.
        const curve=new THREE.Curve();curve.getPoint=(t,target=new THREE.Vector3())=>{const p=sampleLivingMapRoute(points,t);return target.set(p.x,.075,p.z);};
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
    const plantGrowthIndices=new Map(model.items.filter(item=>item.type==='plant').map((item,index)=>[item.id,index]));
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
            const data=createTotemSculptureGeometry(24,16,'botanical'),shape=geometry(new THREE.BufferGeometry()),positions=[],normals=[];
            for(let i=0;i<data.vertices.length;i+=8){positions.push(...data.vertices.slice(i,i+3));normals.push(...data.vertices.slice(i+3,i+6));}
            shape.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));shape.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));shape.setIndex(new THREE.BufferAttribute(data.indices,1));
            mesh(shape,'#795f41',0,.34,0,.05,.34,.04,group);
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
    // Bake the solid toy scenery into a single coloured mesh per group. Tiny
    // leaves and trunks keep their detail without a draw call for every part.
    function mergeSolids(parent){
        const sources=parent.children.filter(node=>node.isMesh && !node.isInstancedMesh && !node.material.transparent && !Array.isArray(node.material));
        if(sources.length<2)return;
        const positions=[],normals=[],colours=[],point=new THREE.Vector3(),normal=new THREE.Vector3(),normalMatrix=new THREE.Matrix3();
        for(const node of sources){node.updateMatrix();normalMatrix.getNormalMatrix(node.matrix);const data=node.geometry.index?node.geometry.toNonIndexed():node.geometry;
            for(let i=0;i<data.attributes.position.count;i++){
                point.fromBufferAttribute(data.attributes.position,i).applyMatrix4(node.matrix);positions.push(point.x,point.y,point.z);
                normal.fromBufferAttribute(data.attributes.normal,i).applyMatrix3(normalMatrix).normalize();normals.push(normal.x,normal.y,normal.z);
                const c=node.material.color;colours.push(c.r,c.g,c.b);
            }
            if(data!==node.geometry)data.dispose();parent.remove(node);
        }
        const combined=geometry(new THREE.BufferGeometry());combined.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));combined.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));combined.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));
        const mat=new THREE.MeshLambertMaterial({color:'#ffffff',vertexColors:true});materials.set('merged-'+parent.uuid,mat);parent.add(new THREE.Mesh(combined,mat));
    }
    mergeSolids(scenery);markers.forEach(marker=>mergeSolids(marker.group));
    const visitors=model.interactive?createLivingMapVisitors(model,routes):null;
    const pegs=[];
    if(visitors){
        // A rounded foot and shoulder add a second visual layer within the
        // same body geometry: no additional meshes or draw calls per person.
        const profile=[[0,0],[.09,0],[.12,.012],[.13,.04],[.125,.07],[.115,.09],[.115,.19],[.10,.25],[.08,.29],[.065,.33],[0,.33]].map(([x,y])=>new THREE.Vector2(x,y));
        const bodyGeometry=geometry(new THREE.LatheGeometry(profile,12));
        const colours=[];for(let i=0;i<bodyGeometry.attributes.position.count;i++){const y=bodyGeometry.attributes.position.getY(i),shade=y<.08?.72:y>.26?1.12:1;colours.push(shade,shade,shade);}bodyGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));
        for(const geo of [bodyGeometry,sphere]){
            const mat=new THREE.MeshLambertMaterial({color:'#ffffff',vertexColors:geo===bodyGeometry});materials.set('peg-'+pegs.length,mat);
            const batch=new THREE.InstancedMesh(geo,mat,5);batch.visible=false;batch.userData.livingMapDynamic=true;
            LIVING_MAP_VISITOR_COLOURS.forEach((colour,i)=>batch.setColorAt(i,new THREE.Color(colour)));
            batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(batch);pegs.push(batch);
        }
    }
    const miniPimos=visitors?model.items.filter(item=>item.type==='plant').map(item=>{
        const group=new THREE.Group();group.position.set(item.x,.95,item.z);group.visible=false;scene.add(group);
        for(let i=0;i<7;i++){const angle=i*Math.PI/3;mesh(sphere,'#cce4ba',i?Math.cos(angle)*.22:0,i?Math.sin(angle)*.22:0,0,i?.07:.10,i?.07:.10,.05,group);}
        mergeSolids(group);return {item,group};
    }):[];
    const miniNotes=visitors?Array.from({length:3},(_,i)=>{
        const node=mesh(geometry(new THREE.BoxGeometry(1,1,1)),'#eed9a5',model.areas[2].totem.x+(i-1)*.43,1.0,model.areas[2].totem.z,.27,.20,.035);node.visible=false;
        // Simple ink dots make the miniature card read as a Note at toy scale.
        const group=new THREE.Group();group.position.copy(node.position);scene.remove(node);node.position.set(0,0,0);group.add(node);scene.add(group);
        for(let line=0;line<3;line++)mesh(geometry(new THREE.BoxGeometry(1,1,1)),'#907853',-.025,.045-line*.052,.025,.15,.011,.018,group);
        node.visible=true;mergeSolids(group);group.visible=false;return group;
    }):[];
    const visitorTotemTitles=visitors?model.areas.map(area=>{
        const item=area.totem,canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;
        const ctx=localizedCanvasContext(canvas.getContext('2d'));ctx.fillStyle='#f0f3e9';ctx.font='500 38px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(item.id==='map-entry'?'Visitor entrance':item.id==='map-forest'?'Open forest':'Swale entrance',256,48,490);
        const texture=new THREE.CanvasTexture(canvas),group=new THREE.Group();
        const titleMaterial=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false});materials.set('visitor-title-'+item.id,titleMaterial);
        const title=new THREE.Mesh(geometry(new THREE.PlaneGeometry(2,.375)),titleMaterial);
        title.position.set(item.x+.65,1.5,item.z);title.quaternion.copy(welcomeScreen.quaternion);group.add(title);
        const lineMaterial=new THREE.LineBasicMaterial({color:'#c4d5c5',transparent:true,opacity:.65});materials.set('visitor-leader-'+item.id,lineMaterial);
        const line=new THREE.Line(geometry(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(item.x,.65,item.z),new THREE.Vector3(item.x+.65,1.28,item.z)])),lineMaterial);group.add(line);group.visible=false;scene.add(group);
        return {item,group,texture};
    }):[];
    function animateVisitors(elapsed,placed,reduced){
        if(!visitors)return;
        const states=visitors.update(elapsed,placed,reduced);
        visitorTotemTitles.forEach(({item,group})=>{group.visible=states.some(s=>s.focus===item.id && !s.walking && s.scale>.9);});
        pegs.forEach((batch,kind)=>{
            batch.visible=placed.length>0;
            states.forEach((s,i)=>{transform.position.set(s.x,.085+s.bob+(kind?.405:0),s.z);transform.rotation.set(0,s.heading,0);
                const size=Math.max(.001,s.scale);transform.scale.set(kind?.12*size:size,kind?.12*size:size,kind?.12*size:size);
                transform.updateMatrix();batch.setMatrixAt(i,transform.matrix);});batch.instanceMatrix.needsUpdate=true;
        });
        miniPimos.forEach(({item,group})=>{const engaged=states.some(s=>s.focus===item.id && s.interaction==='orb');
            group.visible=engaged;group.scale.setScalar(reduced?1:.9+.08*Math.sin(elapsed/900));group.quaternion.copy(welcomeScreen.quaternion);});
        miniNotes.forEach((group,i)=>{group.visible=placed.length===3 && states.some(s=>s.interaction==='note');
            group.position.y=1.0+(reduced?0:Math.sin(elapsed/1200+i)*.035);group.quaternion.copy(welcomeScreen.quaternion);});
    }
    const cloudItems=model.concept?model.areas.map(area=>area.totem):model.areas.flatMap(area=>[area.totem,...area.members.filter(item=>item.id!==area.id)]);
    if(!model.concept)for(const item of model.items)if(!cloudItems.some(entry=>entry.id===item.id))cloudItems.push(item);
    let lastPaint=-Infinity, disposed=false, settledPaint=false, lastReduced=null;
    let cameraPrepared=false,canvasPainted=false,scheduledPlacements=null;
    const projected = new THREE.Vector3();
    const rotation=new THREE.Quaternion();
    function guidance(elapsed){
        const placed=placement?.snapshot() || [];
        if(placed.length===0)return 'Place a Totem at the visitor entrance';
        if(placed.length===1)return 'Place a Totem in the open forest';
        if(placed.length===2)return elapsed<placed[1].at+LIVING_MAP_ORB_SETTLE_MS?'Three Orbs join the forest Totem':'Place a Totem at the swale entrance';
        return 'Three Totems · one connected place';
    }
    function totemLabel(elapsed){
        const placed=placement?.snapshot() || [],current=placement?.current(elapsed),id=current?.id || placed.at(-1)?.id || 'map-entry';
        return id==='map-entry'?'Visitor entrance':id==='map-forest'?'Open forest':'Swale entrance';
    }
    function update(elapsed,reducedMotion,paint=true){
            const placed=placement?.snapshot() || [];
            if(model.interactive && (!scheduledPlacements || placed.length!==scheduledPlacements.length
                || placed.some((entry,index)=>entry.id!==scheduledPlacements[index].id || entry.at!==scheduledPlacements[index].at))){
                model.items.forEach(item=>{
                    const owner=placed.find(entry=>entry.id===(item.areaId || item.id));
                    schedule.items[item.id]={startAt:owner?owner.at+(item.type==='plant'?400+plantGrowthIndices.get(item.id)*220:0):Infinity,duration:item.type==='plant'?700:600};
                });
                scheduledPlacements=placed;settledPaint=false;lastPaint=-Infinity;
            }
            const bornFor=id=>model.interactive && !Number.isFinite(schedule.items[id]?.startAt)?0:demoLivingMapItemProgress(schedule,id,elapsed,reducedMotion);
            const progress=demoLivingMapProgress(elapsed,reducedMotion,schedule);
            if(model.interactive){progress.camera=1;progress.wide=1;progress.scenery=1;progress.settled=!placement?.current() && elapsed>(placed.at(-1)?.at || 0)+2800;}
            if(elapsed<lastPaint || lastReduced!==reducedMotion)settledPaint=false;
            if(paint && !canvasPainted || !settledPaint && (elapsed-lastPaint>=1000/24 || elapsed<lastPaint || lastReduced!==reducedMotion)){
                // Native XR uses the headset projection. Fit this separate
                // preview camera only for canvas paints or its initial pose.
                if(paint || !cameraPrepared){
                const rise=model.concept ? .85+.15*progress.camera : progress.camera, wide=progress.wide;
                const inverse=rotation.clone().invert();
                camera.position.set(1.8*rise,2.1+5.8*rise+wide,8.5+.2*rise+1.1*wide).applyQuaternion(inverse);camera.up.set(0,1,0).applyQuaternion(inverse);camera.lookAt(0,0,0);
                camera.zoom=1;camera.updateProjectionMatrix();camera.updateMatrixWorld();
                let extentX=0,extentY=0;
                const fitPoint=(px,py,pz)=>{projected.set(px,py,pz).project(camera);extentX=Math.max(extentX,Math.abs(projected.x));extentY=Math.max(extentY,Math.abs(projected.y));};
                for(let i=0;i<32;i++){const angle=i*Math.PI/16;fitPoint(Math.cos(angle)*6.3,.05,Math.sin(angle)*4.2);fitPoint(Math.cos(angle)*6.3,-.43,Math.sin(angle)*4.2);}
                // Include the tallest context trees in the final composition.
                if(progress.scenery>0)for(const [px,pz,size] of contextTrees)fitPoint(px,size*1.9*progress.scenery,pz);
                camera.zoom=Math.min(.97/extentX,.95/extentY);camera.updateProjectionMatrix();
                cameraPrepared=true;
                }
                boundaries.forEach(({area,line,fill})=>{const boundary=model.concept?1:demoLivingMapAreaProgress(schedule,area.id,elapsed,reducedMotion);line.visible=boundary>0;line.geometry.setDrawRange(0,Math.round(boundary*64)+1);fill.visible=boundary>=.99;});
                markers.forEach(({item,group,ring,orb})=>{
                    const born=bornFor(item.id);
                    const landscapePlant=model.concept && item.type==='plant';
                    const growth=landscapePlant?livingMapGreeneryProgress(elapsed,plantGrowthIndices.get(item.id),reducedMotion):born;
                    group.visible=landscapePlant || born>0;group.scale.setScalar(landscapePlant?Math.max(.001,growth):Math.max(.001,born));
                    group.position.y=landscapePlant?0:item.type==='zone'?-.68*(1-born):.12*(1-born);
                    if(landscapePlant){orb.visible=born>0;orb.scale.setScalar(.38*born);orb.material.opacity=.32*born;}
                    const age=elapsed-schedule.items[item.id].startAt;
                    ring.material.opacity=born*(reducedMotion || age>1600?.65:.65+.25*Math.sin(age/180));
                });
                paths.forEach((path,index)=>{const arrival=placed[index+1],t=model.interactive?arrival?(reducedMotion?1:Math.max(0,Math.min(1,(elapsed-arrival.at-200)/1500))):0:progress.path;path.visible=t>0;path.geometry.setDrawRange(0,Math.floor(t*32)*30);});
                const current=placement?.current(elapsed);targetRing.visible=Boolean(current);if(current){targetRing.position.set(current.x,.1,current.z);targetRing.scale.setScalar(reducedMotion?1:1+.09*Math.sin(elapsed/430));targetMaterial.opacity=reducedMotion?.65:.5+.18*Math.sin(elapsed/430);}
                if(welcomeScreen){welcomeScreen.visible=placed.length>0;welcomeScreen.position.set(model.areas[0].totem.x-.65,.62,model.areas[0].totem.z);welcomeScreen.quaternion.copy(camera.quaternion);welcomeScreen.scale.setScalar(Math.max(.001,bornFor(model.areas[0].id)));}
                const greenery=model.interactive?livingMapGreeneryProgress(elapsed,0,reducedMotion):progress.scenery;
                scenery.visible=progress.scenery>0;scenery.scale.y=Math.max(.001,greenery);shrub.count=planted;
                if(paint && !(visitors && placed.length>0)){renderer.render(scene,camera);canvasPainted=true;}lastPaint=elapsed;settledPaint=progress.settled;lastReduced=reducedMotion;
            }

        animateVisitors(elapsed,placed,reducedMotion);scene.updateMatrixWorld(true);
        if(paint && visitors && placed.length>0){renderer.render(scene,camera);canvasPainted=true;}
        return {placed,bornFor};
    }
    // Static greenery is ready before the first flat preview or spatial eye
    // draws. Only Orbs, Totems and visitors depend on placement progress.
    update(0,true,false);
    return {
        canvas,schedule,scene,guidance,totemLabel,routes,visitors,
        update:(elapsed,reduced)=>update(elapsed,reduced,false),
        rotate(delta){rotation.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-delta));settledPaint=false;lastPaint=-Infinity;},
        setRotation(value){if(rotation.angleTo(value)<1e-6)return;rotation.copy(value);settledPaint=false;lastPaint=-Infinity;},
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
            const cloudHeight=rect.hideGuidance?0:model.concept?tagHeight+18:Math.ceil(cloudItems.length/columns)*(tagHeight+7)+18;
            const landY=y+cloudHeight,landHeight=Math.max(60,h-cloudHeight);
            const renderHeight=Math.round(width*landHeight/w);
            if(canvas.height!==renderHeight){
                renderer.setSize(width,renderHeight,false);
                camera.aspect=w/landHeight;camera.updateProjectionMatrix();settledPaint=false;lastPaint=-Infinity;
            }
            const {placed,bornFor}=update(elapsed,reducedMotion);
            ctx.drawImage(canvas,x,landY,w,landHeight);
            ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
            if(model.concept && !rect.hideGuidance && (!model.interactive || placed.length)){
                ctx.font=`500 ${fontSize}px system-ui`;ctx.fillStyle='#f4f2df';
                const title=model.interactive?translateNxrText(placed.length?totemLabel(elapsed):'Pick up the highlighted Totem'):demoLivingMapStage(elapsed,reducedMotion);
                const cloudWidth=Math.min(w-12,ctx.measureText(title).width+28);
                ctx.fillStyle='rgba(19,48,37,.94)';ctx.beginPath();ctx.roundRect(x+(w-cloudWidth)/2,y,cloudWidth,tagHeight,tagHeight/2);ctx.fill();
                ctx.fillStyle='#f4f2df';ctx.fillText(title,x+w/2,y+tagHeight/2,w-28);
                // Labels stay beside the three placed Totems.
                for(const item of cloudItems){
                    if(model.interactive)continue;
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
        dispose(){if(disposed)return;disposed=true;visitorTotemTitles.forEach(entry=>entry.texture.dispose());welcomeTexture?.dispose();geometries.forEach(value=>value.dispose());materials.forEach(value=>value.dispose());renderer.dispose();renderer.forceContextLoss();}
    };
}
