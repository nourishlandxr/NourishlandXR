import {MARKING_BRUSHES} from './creatorMarkingBrushes.js';
import {createSpatialPaintV2,PAINT_V2_WIDTHS,PAINT_V2_COLOURS} from './spatialPaintV2.js';
import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {createLivingMapDetailKit} from './demoLivingMapDetail.js';
import {loadTrialButterflies} from './welcomeTrialButterflies.js';
import {createWelcomeTrialState,WELCOME_TRIALS,TRIAL_PLANT_CARDS} from './welcomeTrialState.js';
import {createWelcomeOptionalGame} from './welcomeOptionalGames.js';
import {createSpatialPaintTip} from './spatialPaintTip.js';

const colours=['#86e7d0','#e8a1d0','#ffd47c','#9eb8ff','#ffffff'];
const v=()=>new THREE.Vector3();
export function trialTerrainHeight(x,z){return .012+.10*Math.exp(-((x+.105)**2+(z+.11)**2)/.006)+.055*Math.exp(-((x-.13)**2+(z+.09)**2)/.004);}
export function createWelcomePracticeTrials(root,{onAssets=()=>{},onOpen=()=>{},onClose=()=>{},onFeedback=()=>{},getPanelPose=()=>null,getControllerTool=()=>'paint',wristControls=false}={}){
    const state=createWelcomeTrialState(),layer=new THREE.Group(),panel=new THREE.Group();root.add(layer,panel);layer.name='Optional welcome trials';layer.visible=false;panel.name='Welcome trial list';panel.visible=false;
    const canvas=document.createElement('canvas');canvas.width=900;canvas.height=900;
    const texture=new THREE.CanvasTexture(canvas),panelMesh=new THREE.Mesh(new THREE.PlaneGeometry(.24,.24),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide}));panel.add(panelMesh);panelMesh.renderOrder=25;panel.position.set(-.91,.49,-.12);
    const sphere=new THREE.SphereGeometry(1,12,8),cylinder=new THREE.CylinderGeometry(1,1,1,6),materials=new Map(),groups=new Map(),edges=new Map(),holds=new Map();
    let rows=[],signature='',disposed=false,time=0,cup=null,cloud=null,disk=null,deck=[],wisps=[],rain=[],insects=[],plantSlots=[],paint=null,paintTip=null,diskDocked=true,strokeBySource=new Map(),paintPage='brush',ticBoard=null,ticMarks=[],ticCells=Array(9).fill(null),ticStatus='Your turn. Choose a square.';
    const consumedSelects=new WeakSet(),paintNeedsRelease=new WeakSet(),games=new Map();let paintSource=null;
    const geometry=g=>g;
    const material=colour=>{if(!materials.has(colour))materials.set(colour,new THREE.MeshStandardMaterial({color:colour,roughness:.8}));return materials.get(colour);};
    const mesh=(geo,colour,x=0,y=0,z=0,sx=1,sy=sx,sz=sx,parent=layer)=>{const node=new THREE.Mesh(geo,material(colour));node.position.set(x,y,z);node.scale.set(sx,sy,sz);parent.add(node);return node;};
    const detail=createLivingMapDetailKit({geometry,mesh,material});
    function label(text,colour,width=.115,height=.16){
        const c=document.createElement('canvas');c.width=320;c.height=450;const ctx=c.getContext('2d');ctx.fillStyle='#f7f0dc';ctx.fillRect(0,0,320,450);ctx.strokeStyle=colour;ctx.lineWidth=17;ctx.strokeRect(10,10,300,430);ctx.fillStyle=colour;ctx.beginPath();ctx.arc(160,158,82,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#456549';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(160,235);ctx.lineTo(160,133);ctx.stroke();ctx.fillStyle='#4b794f';for(const [x,y] of [[131,176],[186,157],[133,139]]){ctx.beginPath();ctx.ellipse(x,y,28,12,x<160?.4:-.4,0,Math.PI*2);ctx.fill();}if(text==='Fruit tree'){ctx.beginPath();ctx.arc(160,126,46,0,Math.PI*2);ctx.fill();}if(text==='Flowers' || text==='Strawberry'){ctx.fillStyle=text==='Flowers'?'#f7e4f9':'#b84353';ctx.beginPath();ctx.arc(163,112,22,0,Math.PI*2);ctx.fill();}
        ctx.fillStyle='#314a35';ctx.textAlign='center';ctx.font='bold 32px system-ui';text.split(' ').forEach((word,i)=>ctx.fillText(word,160,300+i*40,290));ctx.font='20px system-ui';ctx.fillText('HOLD · TRANSFORM · PLANT',160,416,285);
        const map=new THREE.CanvasTexture(c);return new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide}));
    }
    function cloudShape(parent,radius,opacity){const group=new THREE.Group();parent.add(group);const mat=new THREE.MeshStandardMaterial({color:'#eaf4f7',roughness:1,transparent:true,opacity,depthWrite:false});for(const [x,y,z,s] of [[0,0,0,1],[-.65,-.1,0,.75],[.65,-.06,0,.8],[-.15,.45,-.16,.8],[.1,-.2,.35,.65]]){const n=new THREE.Mesh(sphere,mat);n.position.set(x*radius,y*radius,z*radius);n.scale.setScalar(s*radius);group.add(n);}return group;}
    function build(id){
        if(groups.has(id))return;const group=new THREE.Group();group.name='Trial '+id;layer.add(group);groups.set(id,group);
        if(['dragonfly','strawberry'].includes(id))games.set(id,createWelcomeOptionalGame(id,group,{onAssets,onFeedback}));
        if(id==='butterflies'){
            cup=new THREE.Group();cup.position.set(0,.068,.06);group.add(cup);
            const shell=new THREE.Mesh(new THREE.CylinderGeometry(.048,.068,.13,32,1,true),material('#c9e0d0'));cup.add(shell);mesh(new THREE.CylinderGeometry(.048,.048,.006,32),'#c9e0d0',0,.067,0,1,1,1,cup);
            const rim=mesh(new THREE.TorusGeometry(.068,.003,8,32),'#f5e4b8',0,-.065,0,1,1,1,cup);rim.rotation.x=Math.PI/2;
            void loadTrialButterflies().then(models=>{if(disposed){disposeModels(models);return;}insects=models;insects.forEach((insect,i)=>{insect.scale.setScalar(.042);insect.visible=false;group.add(insect);});onAssets();}).catch(error=>{console.warn('Trial butterflies:',error.stack || error.message);if(!disposed){group.userData.error='Butterfly model could not load. Reopen the preview to retry.';signature='';}});
        }
        if(id==='garden'){
            disk=new THREE.Group();disk.name='Trial empty Living Disk';disk.position.set(.08,.06,.02);group.add(disk);
            // The demo's round miniature, timber rim and plant geometry, with
            // its populated content removed and a new raised terrain surface.
            mesh(new THREE.CylinderGeometry(.28,.28,.035,64),'#68573e',0,-.016,0,1,1,1,disk);
            const terrain=new THREE.CircleGeometry(.276,64,12);terrain.rotateX(-Math.PI/2);
            // Concentric grid gives the mountain enough interior vertices.
            const positions=[],uv=[],indices=[],rings=18,steps=64;
            for(let r=0;r<=rings;r++)for(let a=0;a<=steps;a++){const angle=a*Math.PI*2/steps,x=.276*r/rings*Math.cos(angle),z=.276*r/rings*Math.sin(angle);positions.push(x,trialTerrainHeight(x,z),z);uv.push(x/.56+.5,z/.56+.5);if(r<rings && a<steps){const k=r*(steps+1)+a;indices.push(k,k+steps+1,k+1,k+1,k+steps+1,k+steps+2);}}
            terrain.dispose();const surface=new THREE.BufferGeometry();surface.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));surface.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));surface.setIndex(indices);surface.computeVertexNormals();
            const soilCanvas=document.createElement('canvas');soilCanvas.width=soilCanvas.height=256;const ctx=soilCanvas.getContext('2d');ctx.fillStyle='#819265';ctx.fillRect(0,0,256,256);for(let i=0;i<1800;i++){ctx.fillStyle=i%3?'#91a374':'#617b51';ctx.fillRect((i*73)%256,(i*131)%256,1+i%3,1+i%2);}const soilTexture=new THREE.CanvasTexture(soilCanvas);soilTexture.colorSpace=THREE.SRGBColorSpace;
            const land=new THREE.Mesh(surface,new THREE.MeshStandardMaterial({map:soilTexture,roughness:1,side:THREE.DoubleSide}));disk.add(land);disk.userData.surface=land;
            const rim=mesh(new THREE.TorusGeometry(.279,.003,6,64),'#c6c893',0,.005,0,1,1,1,disk);rim.rotation.x=Math.PI/2;
            cloud=cloudShape(group,.055,.38);cloud.position.set(-.04,.39,.06);
            wisps=Array.from({length:6},(_,i)=>{const w=cloudShape(group,.027,.26);w.position.set(-.30+(i%3)*.105,.22+Math.floor(i/3)*.12,.22);return {mesh:w,home:w.position.clone(),used:false};});
            deck=TRIAL_PLANT_CARDS.map((card,i)=>{const holder=new THREE.Group();holder.position.set(-.28+i*.14,.095,.36);holder.rotation.x=-.5;group.add(holder);const face=label(card.label,card.colour);holder.add(face);const seed=mesh(sphere,card.colour,0,0,0,.012,.018,.012,holder);seed.visible=false;return {mesh:holder,face,seed,card,home:holder.position.clone(),seeded:false};});
            plantSlots=Array.from({length:16},()=>{const p=new THREE.Group();disk.add(p);p.visible=false;const forms=TRIAL_PLANT_CARDS.map((card,i)=>{const form=new THREE.Group();p.add(form);detail.plant(form,i,{tree:card.tree,grass:card.id==='groundcover'});form.scale.setScalar(card.tree?.09:.055);form.visible=false;return form;});return {mesh:p,forms};});
            rain=Array.from({length:32},(_,i)=>{const drop=mesh(sphere,'#a7dcef',0,0,0,.0018,.008,.0018,group);drop.visible=false;return {mesh:drop,phase:i/32};});
        }
        if(id==='painting'){
            paint=createSpatialPaintV2({markings:true});paint.setBrush('earth');if(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)paint.setMotion(false);group.add(paint.root);
            paintTip=createSpatialPaintTip(group);
        }
        if(id==='tic-tac-toe'){
            ticBoard=new THREE.Group();ticBoard.name='Wooden Tic-Tac-Toe board';ticBoard.position.set(0,.13,.08);group.add(ticBoard);
            const plank=new THREE.Mesh(new THREE.BoxGeometry(.34,.018,.34),new THREE.MeshStandardMaterial({color:'#9b7147',roughness:.78}));ticBoard.add(plank);
            const edge=new THREE.MeshStandardMaterial({color:'#68482f',roughness:.86});
            for(const x of [-.113,0,.113]){const bar=new THREE.Mesh(new THREE.BoxGeometry(.008,.009,.31),edge);bar.position.set(x,.014,0);ticBoard.add(bar);}
            for(const z of [-.113,0,.113]){const bar=new THREE.Mesh(new THREE.BoxGeometry(.31,.009,.008),edge);bar.position.set(0,.014,z);ticBoard.add(bar);}
            for(let i=0;i<9;i++){const marker=new THREE.Group();marker.visible=false;marker.position.set((i%3-1)*.113,.022,(Math.floor(i/3)-1)*.113);ticBoard.add(marker);ticMarks.push(marker);}
            ticCells=Array(9).fill(null);ticStatus='Your turn. Choose a square.';group.userData.ticResponseAt=null;
        }
        onAssets();
    }
    function disposeModels(models){const geometries=new Set(),mats=new Set(),maps=new Set();for(const model of models)model.traverse(n=>{if(n.geometry)geometries.add(n.geometry);if(n.material){mats.add(n.material);if(n.material.map)maps.add(n.material.map);}});geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());maps.forEach(t=>t.dispose());}
    function open(id){if(!WELCOME_TRIALS.some(trial=>trial.id===id))return false;releaseAll();state.open(id);build(id);layer.visible=true;for(const [key,group] of groups)group.visible=key===id;onOpen();signature='';return true;}
    function close(){if(!state.active)return;releaseAll();state.close();layer.visible=false;onClose();signature='';}
    function command(id){
        if(id.startsWith('open:'))return open(id.slice(5));
        if(id.startsWith('cell:'))return playTicCell(Number(id.slice(5)));
        if(id.startsWith('page:')){paintPage=id.slice(5);signature='';return true;}
        if(id.startsWith('mode:')){releaseAll();state.setMode(id.slice(5));}
        else if(id==='close')close();else if(id==='reset'){releaseAll();state.reset();resetVisuals();}
        else if(id==='dock'){releaseAll();diskDocked=!diskDocked;}
        else if(id==='brush' || id.startsWith('brush:')){releaseAll();const ids=Object.keys(MARKING_BRUSHES);paint?.setBrush(id==='brush'?ids[(ids.indexOf(paint.snapshot().brush)+1)%ids.length]:id.slice(6));}else if(id==='motion'){paint?.setMotion(!paint.snapshot().motion);}else if(id.startsWith('colour:')){paint?.setColour(Number(id.slice(7)));}else if(id.startsWith('width:')){const width=Number(id.slice(6));if(Number.isFinite(width))paint?.setWidth(width);}else if(id==='colour'){paint?.setColour((paint.snapshot().colour+1)%PAINT_V2_COLOURS.length);}else if(id==='width'){const current=paint.snapshot().width;paint.setWidth(PAINT_V2_WIDTHS[(PAINT_V2_WIDTHS.indexOf(current)+1)%PAINT_V2_WIDTHS.length]);}else if(id==='undo'){paint?.undo();state.undo();strokeBySource.clear();}else if(id==='redo'){const stroke=paint?.redo();if(stroke)state.addStroke(stroke);}else if(id==='save'){try{localStorage.setItem('nlxr.paint.demo.v2',JSON.stringify(paint.serialize()));groups.get('painting').userData.error='Drawing saved on this device.';}catch{groups.get('painting').userData.error='Drawing could not be saved on this device.';}}else if(id==='load'){try{paint.restore(JSON.parse(localStorage.getItem('nlxr.paint.demo.v2')));groups.get('painting').userData.error='Saved drawing loaded.';}catch(error){groups.get('painting').userData.error=error.message;}}
        else if(id==='clear'){paint?.clear();state.clearPaint();strokeBySource.clear();}
        signature='';return true;
    }
    function playTicCell(index){
        if(state.active!=='tic-tac-toe'||groups.get('tic-tac-toe')?.userData.ticResponseAt!==null||!Number.isInteger(index)||index<0||index>8||ticCells[index]||ticWinner(ticCells)||ticCells.every(Boolean))return false;
        ticCells[index]='X';drawTicMark(index,'X');
        const winner= ticWinner(ticCells);if(winner){ticStatus=winner==='X'?'You got three in a row!':'Zinnia got three in a row!';onFeedback(winner==='X'?'success':'control');signature='';return true;}
        if(ticCells.every(Boolean)){ticStatus='A lovely draw. Play again?';signature='';return true;}
        ticStatus='Zinnia is thinking…';groups.get('tic-tac-toe').userData.ticResponseAt=time+.75;signature='';return true;
    }
    function drawTicMark(index,mark){
        const holder=ticMarks[index];if(!holder)return;holder.clear();holder.visible=true;
        const pigment=new THREE.MeshStandardMaterial({color:mark==='X'?'#dce5d9':'#dce8ea',roughness:.45,metalness:.08});
        if(mark==='X'){for(const angle of [-Math.PI/4,Math.PI/4]){const stroke=new THREE.Mesh(new THREE.BoxGeometry(.012,.006,.075),pigment);stroke.rotation.y=angle;holder.add(stroke);}}
        else {const ring=new THREE.Mesh(new THREE.TorusGeometry(.027,.006,8,28),pigment);ring.rotation.x=Math.PI/2;holder.add(ring);}
        holder.scale.setScalar(.001);holder.userData.growAt=time;
    }
    function ticWinner(cells){for(const [a,b,c] of [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]])if(cells[a]&&cells[a]===cells[b]&&cells[a]===cells[c])return cells[a];return null;}
    function nextTicMove(cells,mark){for(let i=0;i<9;i++)if(!cells[i]){const trial=cells.slice();trial[i]=mark;if(ticWinner(trial)===mark)return i;}return null;}
    function resetVisuals(){
        games.get(state.active)?.reset();
        if(state.active==='butterflies' && cup){cup.position.set(0,.068,.06);insects.forEach(insect=>{insect.visible=false;insect.userData.emerged=false;});}
        if(state.active==='garden'){cloud.position.set(-.04,.39,.06);wisps.forEach(w=>{w.used=false;w.mesh.visible=true;w.mesh.position.copy(w.home);});deck.forEach(c=>{c.mesh.position.copy(c.home);c.seeded=false;c.face.visible=true;c.seed.visible=false;});diskDocked=true;disk.position.set(.08,.06,.02);disk.quaternion.identity();plantSlots.forEach(p=>p.mesh.visible=false);}
        if(state.active==='painting'){paint?.clear();strokeBySource.clear();}
        if(state.active==='tic-tac-toe'){ticCells=Array(9).fill(null);ticMarks.forEach(mark=>{mark.clear();mark.visible=false;mark.scale.setScalar(1);});ticStatus='Your turn. Choose a square.';groups.get('tic-tac-toe').userData.ticResponseAt=null;}
    }
    function drawPaintWatch(snap,error){
        const ctx=canvas.getContext('2d');ctx.clearRect(0,0,900,900);ctx.fillStyle='rgba(17,35,32,.97)';ctx.beginPath();ctx.roundRect(0,0,900,900,90);ctx.fill();ctx.strokeStyle='#80d7c0';ctx.lineWidth=7;ctx.stroke();
        ctx.fillStyle='#eef8f1';ctx.font='bold 48px system-ui';ctx.textAlign='left';ctx.fillText('MARKING BRUSH',48,82);
        const tabs=[['brush','Brush'],['colour','Colour'],['options','Options']];tabs.forEach(([id,label],i)=>{const x=40+i*278;rows.push({id:'page:'+id,left:x,right:x+252,top:112,bottom:198});ctx.fillStyle=paintPage===id?'#79cdb6':'#284a43';ctx.beginPath();ctx.roundRect(x,112,252,86,24);ctx.fill();ctx.fillStyle='#f1f7ee';ctx.font='bold 32px system-ui';ctx.fillText(label,x+24,166);});
        const items=paintPage==='brush'?Object.entries(MARKING_BRUSHES).map(([id,b])=>({id:'brush:'+id,label:b.label})):paintPage==='colour'?PAINT_V2_COLOURS.map((colour,i)=>({id:'colour:'+i,label:['Mint','Rose','Gold','Blue','White','Charcoal','Coral','Lavender'][i],colour})): [{id:'width',label:`Width ${Math.round(snap.width*1000)} mm`,slider:true},{id:'motion',label:snap.motion?'Motion on':'Motion off'},{id:'undo',label:'Undo'},{id:'redo',label:'Redo'},{id:'save',label:'Save'},{id:'clear',label:'Clear'}];
        items.forEach((item,i)=>{const col=i%2,row=Math.floor(i/2),x=40+col*420,y=250+row*154,w=380,h=120;item.left=x;item.right=x+w;item.top=y;item.bottom=y+h;rows.push(item);ctx.fillStyle=item.colour || (item.id==='brush:'+snap.brush?'#427966':'#294841');ctx.beginPath();ctx.roundRect(x,y,w,h,24);ctx.fill();if(item.colour){ctx.beginPath();ctx.arc(x+54,y+60,28,0,Math.PI*2);ctx.fillStyle=item.colour;ctx.fill();ctx.strokeStyle='#dcebe4';ctx.lineWidth=4;ctx.stroke();}ctx.fillStyle='#eef6ec';ctx.font='bold 31px system-ui';ctx.fillText(item.label,x+(item.colour?104:24),y+72,250);if(item.slider){ctx.strokeStyle='#9ed8c5';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(x+22,y+98);ctx.lineTo(x+w-22,y+98);ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x+22+(w-44)*(snap.width-.001)/.019,y+98,12,0,Math.PI*2);ctx.fill();}});
        ctx.fillStyle='#bcd6ca';ctx.font='26px system-ui';ctx.fillText('Point or tap with your other hand · draw with trigger',40,824,820);ctx.fillStyle='#e5c9b5';if(error)ctx.fillText(error,40,870,820);texture.needsUpdate=true;
    }
    function drawPanel(){
        const snap={...state.snapshot(),...(paint?.snapshot() || {})},error=groups.get(state.active)?.userData.error || (state.active==='painting' && paint?.snapshot().limited ? 'Drawing budget reached. Save, then clear or undo.' : ''),next=[snap.active,snap.mode,snap.cloudPieces,Math.round(snap.water*10),snap.plants.length,snap.strokes,snap.colour,snap.width,snap.brush,snap.motion,snap.canRedo,snap.limited,diskDocked,error].join('|');if(signature===next)return;signature=next;
        if(snap.active==='painting'){rows=[];drawPaintWatch(snap,error);return;}
        rows=WELCOME_TRIALS.map(t=>({id:'open:'+t.id,label:(snap.active===t.id?'● ':'')+t.label}));
        if(snap.active){rows.push(...['controllers','gloves','hands'].map((mode,i)=>({id:'mode:'+mode,label:(snap.mode===mode?'● ':'')+['Controllers','Virtual hands','Hand tracking'][i]})));if(snap.active==='garden')rows.push({id:'dock',label:diskDocked?'Carry disk on right hand':'Set disk on table'});if(snap.active==='painting'){rows=[];rows.push(...Object.entries(MARKING_BRUSHES).map(([id,brush])=>({id:'brush:'+id,label:(snap.brush===id?'● ':'')+brush.label})),...PAINT_V2_COLOURS.map((colour,i)=>({id:'colour:'+i,colour,label:(snap.colour===i?'● ':'')+['Mint','Rose','Gold','Blue','White','Charcoal','Coral','Lavender'][i]})),{id:'width',slider:true,label:'Width '+Math.round(snap.width*1000)+' mm'},{id:'motion',label:snap.motion?'Motion: on':'Motion: off'},{id:'undo',label:'Undo'},{id:'redo',label:'Redo'},{id:'save',label:'Save'},{id:'load',label:'Load'},{id:'clear',label:'Clear drawing'},...['controllers','gloves','hands'].map((mode,i)=>({id:'mode:'+mode,label:(snap.mode===mode?'● ':'')+['Controllers','Virtual hands','Hand tracking'][i]})));};rows.push({id:'reset',label:'Reset this trial'},{id:'close',label:'Return to tutorial'});}
        const ctx=canvas.getContext('2d');ctx.clearRect(0,0,900,900);ctx.fillStyle='rgba(24,47,40,.96)';ctx.beginPath();ctx.roundRect(0,0,900,900,40);ctx.fill();ctx.fillStyle='#eef3dc';ctx.font='bold 42px system-ui';ctx.textAlign='left';ctx.fillText(snap.active==='painting'?'MARKING TOOLS':'ACTIVITY TOOLS',40,65);ctx.font='25px system-ui';ctx.fillText(snap.active?'Your lesson is waiting here.':'Load a trial whenever you like.',40,108);
        const rowHeight=Math.min(66,Math.floor(600/Math.ceil(rows.length/2)));rows.forEach((row,i)=>{row.left=24+(i%2)*438;row.right=row.left+414;row.top=140+Math.floor(i/2)*rowHeight;row.bottom=row.top+rowHeight-8;ctx.fillStyle=row.colour || (row.id==='close'?'#6a8660':'#355c4a');ctx.beginPath();ctx.roundRect(row.left,row.top,414,rowHeight-8,9);ctx.fill();ctx.fillStyle=row.colour && row.colour!=='#263b32'?'#152b23':'#e0e7d8';ctx.font='26px system-ui';ctx.fillText(row.label,row.left+16,row.top+30,382);if(row.slider){ctx.strokeStyle='#a7cab6';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(row.left+16,row.bottom-12);ctx.lineTo(row.right-16,row.bottom-12);ctx.stroke();ctx.fillStyle='#eef3dc';ctx.beginPath();ctx.arc(row.left+16+(row.right-row.left-32)*(snap.width-.001)/.019,row.bottom-12,7,0,Math.PI*2);ctx.fill();}});

        const hints=snap.active==='butterflies'?['Lift the cup to release butterflies.','Close both fists: invite them to land.','Open your hands to let them fly.']:snap.active==='garden'?['Grab wisps; bring them into the cloud.','Hold a card; trigger / pinch to make a seed.','Release seeds onto the disk.','Cloud: grip + trigger, or close your fist.','Squeeze above planted seeds to grow them.']:snap.active==='painting'?[MARKING_BRUSHES[snap.brush]?.purpose || 'Make a marking in space.','Trigger / pinch to draw; release to finish.','Water · Vine · Earth · Firefly']:snap.active==='tic-tac-toe'?[ticStatus,'Aim at a square and press trigger, or pinch.','You play X. Zinnia plays O.']:['Optional play and practice.','The guided tutorial stays unchanged.'];
        ctx.fillStyle='#d0dfc4';ctx.font='25px system-ui';hints.forEach((line,i)=>ctx.fillText(line,35,780+i*30,830));if(error){ctx.fillStyle='#ffc7a5';ctx.fillText(error,35,885,830);}texture.needsUpdate=true;
    }
    function panelPoint(point){if(!panel.visible)return null;panel.updateWorldMatrix(true,false);const p=point.clone().applyMatrix4(panel.matrixWorld.clone().invert());if(Math.abs(p.x)>.12 || Math.abs(p.y)>.12 || Math.abs(p.z)>.035)return null;const x=(.5+p.x/.24)*900,y=(.5-p.y/.24)*900;const row=rows.find(row=>x>=row.left && x<=row.right && y>=row.top && y<=row.bottom);return row?.slider?'width:'+(.001+.019*THREE.MathUtils.clamp((x-row.left-22)/(row.right-row.left-44),0,1)):row?.id || null;}
    function hit(ray){
        if(!state.active || !ray?.origin || !ray.direction)return null;root.updateMatrixWorld(true);const r=new THREE.Ray(v().copy(ray.origin),v().copy(ray.direction).normalize()),local=r.clone().applyMatrix4(root.matrixWorld.clone().invert());let best=null;
        const pick=(p,value)=>{if(!p)return;const worldPoint=p.clone().applyMatrix4(root.matrixWorld),distance=worldPoint.distanceTo(r.origin);if(!best || distance<best.distance)best={...value,point:p,worldPoint,distance};};
        const pr=r.clone().applyMatrix4(panel.matrixWorld.clone().invert()),p=pr.intersectPlane(new THREE.Plane(new THREE.Vector3(0,0,1),0),v());if(p){const world=p.clone().applyMatrix4(panel.matrixWorld),id=panelPoint(world);if(id)pick(world.applyMatrix4(root.matrixWorld.clone().invert()),{kind:'trial-control',id});}
        if(state.active)for(const target of targets()){if(!target.mesh.visible)continue;const radius=target.radius,p=local.intersectSphere(new THREE.Sphere(target.mesh.position,radius),v());pick(p,{kind:'trial-object',trialTarget:target});}
        if(state.active==='garden'){const cast=new THREE.Raycaster(r.origin,r.direction),p=cast.intersectObject(disk.userData.surface)[0];if(p)pick(p.point.clone().applyMatrix4(root.matrixWorld.clone().invert()),{kind:'trial-disk'});}
        if(state.active==='tic-tac-toe'&&ticBoard){const boardRay=r.clone().applyMatrix4(ticBoard.matrixWorld.clone().invert()),cellPoint=boardRay.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-.023),v());if(cellPoint&&Math.abs(cellPoint.x)<.17&&Math.abs(cellPoint.z)<.17){const col=Math.max(0,Math.min(2,Math.floor((cellPoint.x+.17)/(.34/3)))),row=Math.max(0,Math.min(2,Math.floor((cellPoint.z+.17)/(.34/3)))),rootPoint=cellPoint.clone().applyMatrix4(ticBoard.matrixWorld).applyMatrix4(root.matrixWorld.clone().invert());pick(rootPoint,{kind:'trial-control',id:'cell:'+(row*3+col)});}}
        return best;
    }
    function targets(){if(games.has(state.active))return games.get(state.active).targets();if(state.active==='butterflies')return [{id:'cup',mesh:cup,radius:.085}];if(state.active==='garden')return [{id:'cloud',mesh:cloud,radius:.11},...wisps.filter(w=>!w.used).map((w,i)=>({id:'wisp:'+i,mesh:w.mesh,radius:.055,wisp:w})),...deck.map(c=>({id:'card:'+c.card.id,mesh:c.mesh,radius:.09,card:c}))];return [];}
    function release(source,plantOnRelease=true){const held=holds.get(source);if(!held)return;holds.delete(source);games.get(state.active)?.released(held.target,plantOnRelease,source);if(held.target.card?.seeded){const card=held.target.card,diskPoint=disk.worldToLocal(root.localToWorld(card.mesh.position.clone()));if(plantOnRelease && Math.hypot(diskPoint.x,diskPoint.z)<.27 && diskPoint.y>-.04 && diskPoint.y<trialTerrainHeight(diskPoint.x,diskPoint.z)+.15){state.plant(card.card.id,diskPoint.x,diskPoint.z);onFeedback('plant',source);}card.mesh.position.copy(card.home);card.face.visible=true;card.seed.visible=false;card.seeded=false;}if(held.target.id==='cup')cup.position.y=Math.max(.068,cup.position.y);}
    function releaseAll(){for(const source of [...holds.keys()])release(source,false);edges.clear();strokeBySource.clear();paint?.endAll();}
    function update(dt,{inputs=[],visible=false,panelPose=null,paused=false}={}){
        panel.visible=visible && Boolean(state.active) && !games.has(state.active) && !wristControls;drawPanel();panel.scale.setScalar(state.active==='painting'?1:.46/.24);if(state.active!=='painting' && (panelPose || getPanelPose())){
            const pose=panelPose || getPanelPose();if(pose?.center && pose.right && pose.up && pose.normal){const center=v().copy(pose.center).addScaledVector(pose.right,-((pose.width || .60)/2+.28));const m=new THREE.Matrix4().makeBasis(v().copy(pose.right),v().copy(pose.up),v().copy(pose.normal));m.setPosition(center);m.premultiply(root.matrixWorld.clone().invert());m.decompose(panel.position,panel.quaternion,panel.scale);panel.scale.setScalar(.46/.24);}
        }
        if(!state.active)return;dt=paused?0:Math.min(.06,Math.max(0,dt));time+=dt;const inverse=root.matrixWorld.clone().invert();
        if(state.active==='tic-tac-toe'){
            const responseAt=groups.get('tic-tac-toe').userData.ticResponseAt;
            if(responseAt!==null&&time>=responseAt){const winMove=nextTicMove(ticCells,'O')??nextTicMove(ticCells,'X'),move=winMove??([4,0,2,6,8,1,3,5,7].find(i=>!ticCells[i]));if(move!==undefined){ticCells[move]='O';drawTicMark(move,'O');const winner=ticWinner(ticCells);ticStatus=winner?'Zinnia got three in a row!':ticCells.every(Boolean)?'A lovely draw. Play again?':'Your turn. Choose a square.';if(winner)onFeedback('success');else onFeedback('control');}groups.get('tic-tac-toe').userData.ticResponseAt=null;signature='';}
            for(const mark of ticMarks)if(mark.visible){const t=Math.min(1,(time-mark.userData.growAt)/.2);mark.scale.setScalar(THREE.MathUtils.smoothstep(t,0,1));}
        }
        const eligible=inputs.filter(input=>Boolean(input.source.hand)===(state.mode==='hands') && input.matrix);
        const right=eligible.find(input=>input.source.handedness==='right');if(right)paintSource=right.source;
        if(!paintSource)paintSource=eligible.find(input=>!input.uiBlocked && input.source.handedness!=='left')?.source || null;
        const tipInput=eligible.find(input=>input.source===paintSource);
        if(state.active==='painting'){const wrist=eligible.find(input=>input.source.handedness==='left') || eligible.find(input=>input.source!==tipInput) || eligible[0];if(wrist){const wristPose=new THREE.Matrix4().fromArray(wrist.matrix).premultiply(inverse);panel.position.setFromMatrixPosition(wristPose);panel.position.y+=.055;panel.quaternion.setFromRotationMatrix(wristPose).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0)));}}
        paintTip?.hide();
        if(state.active==='painting' && getControllerTool()==='paint' && tipInput){const pose=new THREE.Matrix4().fromArray(tipInput.matrix).premultiply(inverse);paintTip.root.position.copy(tipInput.tip?v().copy(tipInput.tip).applyMatrix4(inverse):v().set(0,0,-.095).applyMatrix4(pose));paintTip.root.quaternion.setFromRotationMatrix(pose);paintTip.update(paint.snapshot(),time);}
        for(const source of [...holds.keys()])if(!eligible.some(i=>i.source===source))release(source,false);
        for(const source of [...edges.keys()])if(!eligible.some(i=>i.source===source)){edges.delete(source);strokeBySource.delete(source);paint?.end(source);}
        if(paused){releaseAll();drawPanel();return;}
        for(const input of eligible){
            const {source}=input,pose=new THREE.Matrix4().fromArray(input.matrix).premultiply(inverse),point=v().setFromMatrixPosition(pose),previous=edges.get(source) || {down:false,trigger:false};let held=holds.get(source);
            if(input.uiBlocked){paintNeedsRelease.add(source);paint?.end(source);strokeBySource.delete(source);edges.set(source,{down:!!input.down,trigger:!!input.trigger});continue;}
            if(paintNeedsRelease.has(source)){if(!input.trigger)paintNeedsRelease.delete(source);else {edges.set(source,{down:!!input.down,trigger:true});continue;}}
            if(consumedSelects.has(source)){consumedSelects.delete(source);edges.set(source,{down:!!input.down,trigger:!!input.trigger});continue;}
            const tip=input.tip?v().copy(input.tip):root.localToWorld(point.clone()),poke=panelPoint(tip);
            const rayHit=input.ray?hit(input.ray):null,control=rayHit?.kind==='trial-control';
            if(poke && previous.poke!==poke && !input.down){command(poke);edges.set(source,{down:!!input.down,trigger:!!input.trigger,poke});continue;}
            if(control && input.trigger && (!previous.trigger || rayHit.id.startsWith('width:'))){command(rayHit.id);edges.set(source,{down:!!input.down,trigger:!!input.trigger,poke});continue;}
            if(!state.active)break;
            if(input.down && !previous.down && !held && state.active!=='painting'){
                const occupied=new Set([...holds.values()].map(h=>h.target.mesh));const candidate=targets().filter(t=>t.mesh.visible && !occupied.has(t.mesh)).map(t=>({target:t,d:point.distanceTo(t.mesh.position)})).filter(t=>t.d<t.target.radius+.045).sort((a,b)=>a.d-b.d)[0];
                const target=candidate?.target || (state.mode==='controllers' && rayHit?.kind==='trial-object' && !occupied.has(rayHit.trialTarget.mesh)?rayHit.trialTarget:null);
                if(target){const quaternion=new THREE.Quaternion().setFromRotationMatrix(pose),inverseQ=quaternion.clone().invert();held={target,offset:target.mesh.position.clone().sub(point),rotation:inverseQ.clone().multiply(target.mesh.quaternion),localOffset:target.mesh.position.clone().sub(point).applyQuaternion(inverseQ)};if(target.body?.gripPoint)held.localOffset.set(-target.body.gripPoint.x,-target.body.gripPoint.y,-target.body.gripPoint.z).applyQuaternion(held.rotation);holds.set(source,held);games.get(state.active)?.picked(target);onFeedback('grab',source);}
            }
            if(held && !input.down){release(source);held=null;}
            if(held){if(games.has(state.active)){const quaternion=new THREE.Quaternion().setFromRotationMatrix(pose),position=point.clone().add(held.localOffset.clone().applyQuaternion(quaternion));quaternion.multiply(held.rotation);games.get(state.active).moved(held.target,position,quaternion);}else held.target.mesh.position.copy(point).add(held.offset);if(held.target.id==='cup' && cup.position.y>.17)state.releaseButterflies();
                if(held.target.wisp && held.target.mesh.position.distanceTo(cloud.position)<.12){if(state.merge()){held.target.wisp.used=true;held.target.mesh.visible=false;holds.delete(source);onFeedback('collect',source);}}
                const card=held.target.card;if(card && !card.seeded && (source.hand?input.trigger && !previous.trigger || eligible.some(other=>other.source!==source && other.trigger && v().setFromMatrixPosition(new THREE.Matrix4().fromArray(other.matrix).premultiply(inverse)).distanceTo(card.mesh.position)<.12):input.trigger && !previous.trigger)){card.seeded=true;card.face.visible=false;card.seed.visible=true;onFeedback('open',source);}
            }
            games.get(state.active)?.act(input,held,previous,eligible,inverse);
            if(state.active==='painting'){
                const paintPoint=input.tip?v().copy(input.tip).applyMatrix4(inverse):v().set(0,0,-.095).applyMatrix4(pose);
                if(getControllerTool()==='paint' && input===tipInput && input.trigger && !control && !poke){
                    if(!paint.isDrawing(source)){const stroke=paint.begin(source,paintPoint);if(stroke){state.addStroke(stroke);strokeBySource.set(source,stroke);onFeedback('control',source);}}
                    else paint.add(source,paintPoint,dt);
                }else {paint.end(source);strokeBySource.delete(source);}

            }
            edges.set(source,{down:!!input.down,trigger:!!input.trigger,poke});
        }
        if(state.active==='butterflies'){
            const closed=eligible.filter(i=>i.source.hand?i.fist:i.down),both=closed.some(i=>i.source.handedness==='left') && closed.some(i=>i.source.handedness==='right'),snap=state.snapshot();
            insects.forEach((insect,i)=>{insect.visible=snap.released;if(!snap.released)return;let target;if(both){const input=closed[i%closed.length];target=v().setFromMatrixPosition(new THREE.Matrix4().fromArray(input.matrix).premultiply(inverse));target.y+=.045;target.x+=(i<2?-.014:.014);}else target=new THREE.Vector3(Math.sin(time*.65+i*1.57)*.26,.43+Math.sin(time*.9+i)*.065,.12+Math.cos(time*.6+i)*.14);if(!insect.userData.emerged){insect.position.copy(cup.position);insect.userData.emerged=true;}insect.position.lerp(target,1-Math.exp(-dt*(both?3:1.8)));insect.rotation.y=time*.5+i;insect.children.forEach(n=>{if(n.morphTargetInfluences)n.morphTargetInfluences[0]=both?.08:.5+.5*Math.sin(time*20+i);});});
        }
        if(state.active==='garden'){
            if(diskDocked){disk.position.set(.08,.06,.02);disk.quaternion.identity();}else{const right=eligible.find(i=>i.source.handedness==='right');if(right){disk.position.setFromMatrixPosition(new THREE.Matrix4().fromArray(right.matrix).premultiply(inverse));disk.position.y+=.06;disk.quaternion.identity();}}
            const snap=state.snapshot(),size=1+(snap.cloudPieces-1)*.16;const owner=[...holds].find(([,h])=>h.target.id==='cloud')?.[0],input=eligible.find(i=>i.source===owner),squeezing=Boolean(input && (input.source.hand?input.fist:input.trigger) && snap.water>0);cloud.scale.set(size*(squeezing?.86:1),size*(squeezing?.65:1),size);cloud.children.forEach(n=>n.material.opacity=.28+.055*snap.cloudPieces);
            const amount=squeezing?state.rain(dt):0;disk.updateWorldMatrix(true,true);const rainfall=disk.worldToLocal(root.localToWorld(cloud.position.clone()));
            for(const plant of state.plants)if(amount && rainfall.y>trialTerrainHeight(rainfall.x,rainfall.z) && Math.hypot(plant.x-rainfall.x,plant.z-rainfall.z)<.08*size)state.waterPlant(plant,amount);
            plantSlots.forEach((slot,i)=>{const plant=state.plants[i];slot.mesh.visible=Boolean(plant);if(!plant)return;slot.mesh.position.set(plant.x,trialTerrainHeight(plant.x,plant.z),plant.z);slot.mesh.scale.setScalar(plant.growth);slot.forms.forEach((f,j)=>f.visible=TRIAL_PLANT_CARDS[j].id===plant.card);});
            rain.forEach(({mesh:drop,phase},i)=>{drop.visible=squeezing;if(!squeezing)return;const fall=(time*1.8+phase)%1,angle=i*2.4,r=(.025+i%5*.008)*size;drop.position.set(cloud.position.x+Math.cos(angle)*r,cloud.position.y-fall*Math.max(.06,cloud.position.y-.035),cloud.position.z+Math.sin(angle)*r);});
        }
        games.get(state.active)?.update(dt,eligible,[...holds],getControllerTool());
        if(state.active==='painting')paint.update(time);
        drawPanel();
    }
    return {get paint(){return paint;},state,layer,panel,open,close,command,update,hit,releaseAll,consumeSelect(source){if(source)consumedSelects.add(source);},isHolding:source=>holds.has(source) || strokeBySource.has(source),get active(){return state.active;},get mode(){return state.mode;},snapshot:()=>({...state.snapshot(),butterflyAssets:insects.length?'ready':groups.get('butterflies')?.userData.error?'error':'loading',diskDocked,paintSegments:paint?.snapshot().segments || 0,strokes:paint?.snapshot().strokes || 0,paint:paint?.snapshot(),game:games.get(state.active)?.snapshot(),gameHint:games.get(state.active)?.hints()[0]}),destroy(){disposed=true;releaseAll();paint?.destroy();for(const game of games.values())game.destroy();}};
}
