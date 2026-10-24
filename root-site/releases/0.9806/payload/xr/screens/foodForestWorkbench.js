import {createFoodForestRoots} from "../services/foodForestRoots.js?v=0.9806";
import * as THREE from "../vendor/three.module.min.js?v=0.9806";
import { FOOD_FOREST_LAYERS as layers, FOOD_FOREST_VARIANTS as variants, createFoodForestPiece } from "../services/foodForestPieces.js?v=0.9806";
import { foodForestBoundary, boardPointInside, foodForestArea, validFoodForestBoundary, foodForestFootprintOverlaps } from "../services/foodForestBoardModel.js?v=0.9806";
import { createPimoXRFeedback } from "../services/pimoXRFeedback.js?v=0.9806";
import { pimoIconButton as iconButton } from "../services/pimoEditorIcons.js?v=0.9806";
import { planningRecordMatches } from "../services/daleysPlanningTraits.js?v=0.9806";
import { BUILD_INFO } from "../services/buildInfo.js?v=0.9806";
import { createPimoXRPanel } from "../services/pimoXRPanel.js?v=0.9806";
import { createPimoXRButtonLatch } from "../services/pimoXRWorkbench.js?v=0.9806";

const html = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const storageKey = 'nourishland.food-forest-table.v1';
export async function mountFoodForestWorkbench(host,{backUrl=''}={}) {
    if (!document.querySelector('[data-food-forest-style]')) { const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = new URL('../food-forest-workbench.css', import.meta.url).href; link.dataset.foodForestStyle = ''; document.head.append(link); }
    host.innerHTML = `<main class="ff-workbench"><header><div class="ff-wordmark"><span>nourishland</span><small>FOOD FOREST TABLE · V${html(BUILD_INFO.version)}</small></div><div class="ff-toolbar">${backUrl?iconButton('back-to-demos','back','Back to demos'):''}${iconButton('undo','undo','Undo')}${iconButton('redo','redo','Redo')}${iconButton('fit','fit','Fit table')}${iconButton('grid','notes','Toggle optional grid','aria-pressed="false"')}${iconButton('labels','panel','Toggle piece labels','aria-pressed="true"')}${iconButton('sound','volume','Toggle sounds','aria-pressed="true"')}</div></header><div class="ff-layout"><section class="ff-stage" aria-label="Interactive food forest board"><div class="ff-intro"><span class="ff-eyebrow">A LITTLE WORLD TO GROW</span><h1>Plant a possibility.</h1><p>Pick a plant. Find its place. Watch its roots grow.</p></div><div class="ff-board-stats" data-stats></div><div class="ff-caption" data-caption role="status" aria-live="polite">Drag a piece from the loading bay onto the board.</div><div class="ff-view-tools">${iconButton('zoom-out','minus','Move farther from table')}${iconButton('zoom-in','plus','Move closer to table')}${iconButton('remove','delete','Remove selected piece')}</div><p class="ff-footnote">Look below the glass: roots grow as you plant. Root shapes are illustrative.</p></section><aside class="ff-panel"><nav class="ff-tabs" aria-label="Table tools"><button data-tab="pieces" aria-pressed="true">Pieces</button><button data-tab="plants" aria-pressed="false">Plant collection</button><button data-tab="board" aria-pressed="false">Board</button></nav><div data-panel></div><footer>Drag empty space to turn · scroll to zoom<br>Local design study · saved on this device</footer></aside></div></main>`;
    const root = host.firstElementChild, stage = root.querySelector('.ff-stage'), panel = root.querySelector('[data-panel]'), abort = new AbortController(), signal = abort.signal, cues = createPimoXRFeedback();
    let state = { shape: 'rectangle', boundary: foodForestBoundary(), widthM: 20, depthM: 12, goal:'diverse', pieces: [], wishlist: [] }, selected = '', layerId = 'canopy', variant = 0, tab = 'pieces', showGrid = false, showLabels = true, selectedPlant = null, challenge = '', drawing = null, drag = null, disposed = false, database = null;
    const history = [], future = [], objects = new Map(), bayPieces = [], labels = [], raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0,1,0), -.16), intersection = new THREE.Vector3();
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { root.querySelector('[data-caption]').textContent = 'The 3D table needs WebGL. Try another browser or enable graphics acceleration.'; return { destroy() { host.innerHTML=''; } }; }
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1; renderer.xr.enabled=true; stage.prepend(renderer.domElement);
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(39,1,.05,60), world = new THREE.Group(), boardLayer = new THREE.Group(), tokenLayer = new THREE.Group(), bay = new THREE.Group(), labelLayer = new THREE.Group(), grid = new THREE.Group(), effects = new THREE.Group();
    scene.add(world); world.add(boardLayer, tokenLayer, bay, labelLayer, grid, effects);
    scene.add(new THREE.HemisphereLight(0xfff7e5,0x829181,2.5)); const key = new THREE.DirectionalLight(0xfff1d6,3); key.position.set(-3,7,4); scene.add(key);
    let session=null,xrSupport='',pendingXRRecenter=false,xrPage='pieces',xrCollectionPage=0,actionSource=null,xrPending=false;
    const xrGestures=new Map(),xrControllers=[],xrLatch=createPimoXRButtonLatch(),xrPanel=createPimoXRPanel({name:'food-forest-controls',width:2.25,height:3.65,pixels:900});
    xrPanel.mesh.position.set(4.35,1.85,-.3);xrPanel.mesh.visible=false;world.add(xrPanel.mesh);
    const xrButton=document.createElement('button');xrButton.className='pimo-icon';xrButton.dataset.action='enter-xr';xrButton.title=xrButton.ariaLabel='Enter XR table';xrButton.innerHTML=iconButton('unused','xr','XR').match(/<svg[\s\S]*?<\/svg>/)[0];xrButton.disabled=true;root.querySelector('.ff-toolbar').append(xrButton);
    root.querySelector('.ff-toolbar').insertAdjacentHTML('beforeend',iconButton('spatial-panel','panel','Preview spatial controls','aria-pressed="false"'));
    const footprints=new THREE.Group();world.add(footprints);const footprintMaterial=new THREE.LineBasicMaterial({color:0x55775b});
    const rootLayer=new THREE.Group(),rootVisuals=new Map();world.add(rootLayer);
    const surfaces = [], mats = [], geoms = [];
    const mat = color => { const value = new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0, flatShading: true }); mats.push(value); return value; };
    function mesh(geometry, material, parent, x=0,y=0,z=0) { geoms.push(geometry); const object = new THREE.Mesh(geometry,material); object.position.set(x,y,z); parent.add(object); return object; }
    const boardMaterial=new THREE.MeshStandardMaterial({color:0xb4e2d8,transparent:true,opacity:.12,roughness:.35,metalness:0,depthWrite:false,side:THREE.DoubleSide}),rimMaterial=new THREE.MeshStandardMaterial({color:0x89c5ba,transparent:true,opacity:.2,roughness:.38,depthWrite:false,side:THREE.DoubleSide}),trayMaterial=mat('#ded3b5');mats.push(boardMaterial,rimMaterial);
    mesh(new THREE.BoxGeometry(6.3,.12,.8),trayMaterial,bay,0,.02,2.65);
    for(let i=0;i<4;i++) mesh(new THREE.TorusGeometry(.26,.008,3,32),rimMaterial,bay,(i-1.5)*1.15,.086,2.65).rotation.x=Math.PI/2;
    function caption(value) { root.querySelector('[data-caption]').textContent=value; }
    function save() { try { localStorage.setItem(storageKey,JSON.stringify(state)); } catch { caption('Browser storage is full. Export the board to keep this design.'); } }
    function snapshot() { return structuredClone(state); }
    function remember(before=snapshot()) { history.push(before); if(history.length>50)history.shift();future.length=0;save();update(); }
    function commit(change) { const before=snapshot();change();remember(before); }
    function disposeLabel(object) { object.material.map?.dispose();object.material.dispose();object.removeFromParent(); }
    function makeLabel(text,position,width=1.05) { const canvas=document.createElement('canvas');canvas.width=512;canvas.height=100;const c=canvas.getContext('2d');c.fillStyle='#f8f5e9';c.beginPath();c.roundRect(2,2,508,96,12);c.fill();c.fillStyle='#34543e';c.font='600 42px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(text.length>27?text.slice(0,26)+'…':text,256,50,484);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const material=new THREE.SpriteMaterial({map:texture,depthWrite:false});const sprite=new THREE.Sprite(material);sprite.scale.set(width,width*100/512,1);sprite.position.copy(position);labelLayer.add(sprite);labels.push(sprite);return sprite; }
    function paintBoard() {
        for(const item of surfaces){item.geometry.dispose();item.removeFromParent();}surfaces.length=0;
        const outline=new THREE.Shape();state.boundary.forEach((p,i)=>outline[i?'lineTo':'moveTo'](p.x,-p.z));outline.closePath();
        const bottom=new THREE.Mesh(new THREE.ExtrudeGeometry(outline,{depth:.13,bevelEnabled:true,bevelThickness:.035,bevelSize:.04,bevelSegments:2,steps:1}),rimMaterial);bottom.rotation.x=-Math.PI/2;bottom.position.y=-.03;boardLayer.add(bottom);surfaces.push(bottom);
        const top=new THREE.Mesh(new THREE.ShapeGeometry(outline),boardMaterial);top.rotation.x=-Math.PI/2;top.position.y=.16;boardLayer.add(top);surfaces.push(top);
        grid.children.slice().forEach(item=>{item.geometry.dispose();item.material.dispose();grid.remove(item);});
        const points=[];for(let x=-3;x<=3.01;x+=.5)for(let z=-2;z<2;z+=.06){const a={x,z},b={x,z:z+.055};if(boardPointInside(a,state.boundary)&&boardPointInside(b,state.boundary))points.push(new THREE.Vector3(x,.166,z),new THREE.Vector3(x,.166,z+.055));}for(let z=-2;z<=2.01;z+=.5)for(let x=-3;x<3;x+=.06){const a={x,z},b={x:x+.055,z};if(boardPointInside(a,state.boundary)&&boardPointInside(b,state.boundary))points.push(new THREE.Vector3(x,.166,z),new THREE.Vector3(x+.055,.166,z));}
        grid.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x71845e,transparent:true,opacity:.3})));grid.visible=showGrid;
    }
    function syncTokens() {
        const ids=new Set(state.pieces.map(item=>item.id));for(const[id,roots]of rootVisuals)if(!ids.has(id)){roots.dispose();rootVisuals.delete(id);}for(const[id,object]of objects)if(!ids.has(id)){object.dispose();objects.delete(id);}
        for(const item of state.pieces){if(!rootVisuals.has(item.id)){const roots=createFoodForestRoots(item.layer,item.variant);roots.born=null;rootLayer.add(roots.group);rootVisuals.set(item.id,roots);}let object=objects.get(item.id);if(!object){object=createFoodForestPiece(item.layer,{variant:item.variant,size:item.size||1,label:item.label,plantId:item.plantId});object.height=new THREE.Box3().setFromObject(object.group).max.y;object.group.userData.instanceId=item.id;tokenLayer.add(object.group);objects.set(item.id,object);}object.group.position.set(item.x,.16,item.z);object.group.rotation.set(0,item.rotation||0,0);object.group.scale.setScalar((item.size||1)*(item.id===selected?1.04:1));}
        for(const label of labels)disposeLabel(label);labels.length=0;
        if(showLabels)for(const item of state.pieces){const definition=layers.find(layer=>layer.id===item.layer);makeLabel(item.label||`${definition.name} ${item.variant+1}`,new THREE.Vector3(item.x,.28+(objects.get(item.id)?.height||definition.height*(item.size||1)),item.z));}
    }
    function updateBay() {
        for(const piece of bayPieces)piece.dispose();bayPieces.length=0;
        for(let i=0;i<4;i++){const piece=createFoodForestPiece(layerId,{variant:i,size:.86,plantId:selectedPlant?.id||'',label:selectedPlant?.commonName||''});piece.group.position.set((i-1.5)*1.15,.085,2.65);piece.group.userData.bayVariant=i;bay.add(piece.group);bayPieces.push(piece);}
    }
    function syncFootprints(){
        for(const ring of footprints.children.slice()){ring.geometry.dispose();footprints.remove(ring);}
        for(const item of state.pieces){if(!(item.canopyDiameterM>0))continue;const radius=item.canopyDiameterM/2,points=Array.from({length:48},(_,i)=>new THREE.Vector3(Math.cos(i/48*Math.PI*2)*radius*6/state.widthM,.178,Math.sin(i/48*Math.PI*2)*radius*4/state.depthM));const ring=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),footprintMaterial);ring.position.set(item.x,0,item.z);ring.userData.instanceId=item.id;footprints.add(ring);}
    }
    function selectedPiecePanel(){
        const item=state.pieces.find(p=>p.id===selected),overlaps=foodForestFootprintOverlaps(state.pieces,state.widthM,state.depthM);
        return `${item?`<article class="ff-piece-study"><h3>${html(item.label||layers.find(l=>l.id===item.layer).name)}</h3><label>Assumed mature canopy diameter (m)<input data-canopy type="number" min="0" max="60" step="0.5" value="${item.canopyDiameterM||0}"></label><p class="ff-muted">Your planning assumption. Zero leaves the spread unknown. This is not a supplier spacing recommendation.</p></article>`:'<p class="ff-muted">Select a placed piece to sketch its canopy footprint.</p>'}<p class="ff-muted">${state.pieces.filter(p=>p.canopyDiameterM>0).length} declared footprints · ${overlaps.length} overlapping pairs. Overlap does not predict crop loss or compatibility.</p>`;
    }
    function update(){syncTokens();syncFootprints();const area=foodForestArea(state.boundary,state.widthM,state.depthM);root.querySelector('[data-stats]').textContent=`${state.widthM} × ${state.depthM} m · ${area.toFixed(0)} m² · ${state.pieces.length} pieces · ${new Set(state.pieces.map(p=>p.layer)).size}/7 layers`;root.querySelector('[data-action=undo]').disabled=!history.length;root.querySelector('[data-action=redo]').disabled=!future.length;root.querySelector('[data-action=remove]').disabled=!selected;if(tab==='board')renderPanel();renderXRPanel();}
    function setTab(next){tab=next;root.querySelectorAll('[data-tab]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.tab===tab)));renderPanel();}
    function selectedRecordDetails(record){
        const exact=record.specifications?.values||{},height=exact['Max Height (when in the ground with good conditions)']||record.fields?.heightBand?.values.map(item=>item.label||`Code ${item.code}`).join(', ')||'Unknown';
        const climate=exact['Preferred Climate']||record.fields?.climate?.values.map(item=>item.label||item.code).join(', ')||'Unknown',pollination=exact['Plants required to Pollinate']||record.fields?.pollination?.values.map(item=>item.label||item.code).join(', ')||'Unknown';
        return `<article class="ff-selected-plant"><span class="ff-eyebrow">READY FOR THE LOADING BAY</span><h3>${html(record.commonName)}</h3><em>${html(record.scientificName)}</em><dl><dt>Height</dt><dd>${html(height)}</dd><dt>Climate</dt><dd>${html(climate)}</dd><dt>Pollination</dt><dd>${html(pollination)}</dd></dl><p class="ff-muted">Layer suggestion: ${html(record.layer?.value||'Unassigned')} · needs review</p><button data-load-plant>Use this plant</button><button data-wish="${html(record.id)}">${state.wishlist.includes(record.id)?'✓ In my collection':'Add to my collection'}</button><details><summary>Source & possible roles</summary><p>${html(record.sourceDescription)}</p>${record.functions?.map(item=>`<p><strong>${html(item.id)}</strong> · ${html(item.status)} · ${html(item.polarity||'source statement')}<br>${html(item.evidence)}</p>`).join('')||'<p>No role extracted yet.</p>'}${record.traitCandidates?.map(item=>`<p><strong>${html(item.id)}</strong> · ${html(item.status)}<br>${html(item.evidence)}</p>`).join('')||''}<a href="${html(/^https:\/\//.test(record.sourceUrl)?record.sourceUrl:'#')}" target="_blank" rel="noopener">Daleys source ↗</a></details></article>`;
    }
    function renderPanel(){
        if(tab==='pieces')panel.innerHTML=`<span class="ff-eyebrow">SEVEN LAYERS · FOUR VARIANTS EACH</span><h2>28 little possibilities.</h2><p class="ff-muted">Solid, sculpted pieces with their own silhouette. Choose a family for the loading bay.</p><div class="ff-layer-list">${layers.map(layer=>`<button data-layer="${layer.id}" aria-pressed="${layer.id===layerId}"><span class="ff-layer-chip" style="--piece-color:${layer.color}">${layer.mark}</span><span><strong>${layer.name}</strong><small>${layer.form}</small></span></button>`).join('')}</div><div class="ff-variant-list">${variants[layerId].map((name,i)=>`<button data-variant="${i}" aria-pressed="${variant===i}"><small>${i+1}</small>${name}</button>`).join('')}</div><p class="ff-muted">${selectedPlant?`Loading: ${html(selectedPlant.commonName)}`:'No species assigned. These are design pieces.'}</p><button class="ff-main-action" data-action="add">Place selected variant</button><button data-action="kit">View all 28 pieces</button>${selectedPlant?'<button data-action="abstract">Use unassigned pieces</button>':''}`;
        if(tab==='plants'){
            if(!database){panel.innerHTML='<h2>Plant collection</h2><p>Loading Daleys catalogue…</p>';return;}
            panel.innerHTML=`<span class="ff-eyebrow">DALEYS · REVIEWABLE STARTING DATA</span><h2>Your future forest.</h2><label>Find a plant<input type="search" data-filter="query" placeholder="Name, nitrogen, lemon scent…"></label><div class="ff-filter-pair"><label>Climate<select data-filter="climate"><option value="">Any climate</option>${['Subtropical','Tropical','Warm Temperate','Cool Temperate','Arid (Dry)'].map(x=>`<option>${x}</option>`).join('')}</select></label><label>Height band<select data-filter="heightCode"><option value="">Any height</option>${Object.entries(database.codebook.fields.Height).map(([code,v])=>`<option value="${code}">${html(v.label)}</option>`).join('')}</select></label></div><div class="ff-filter-pair"><label>Possible role<select data-filter="functionId"><option value="">Any role</option>${Object.keys(database.summary.functionCandidates).map(id=>`<option value="${id}">${html(id.replaceAll('-',' '))}</option>`).join('')}</select></label><label>Context<select data-filter="category"><option value="">Any context</option><option value="australian-native">Australian native</option><option value="rainforest">Rainforest</option><option value="regeneration">Regeneration / pioneer</option></select></label></div><label>Pollination<select data-filter="pollinationCode"><option value="">Any strategy</option>${Object.entries(database.codebook.fields.Pollination2).map(([code,v])=>`<option value="${code}">${html(v.label)}</option>`).join('')}</select></label><label class="ff-checkbox"><input type="checkbox" data-collection>Only my collection</label><p data-result-count class="ff-muted"></p><div data-results class="ff-results"></div><div data-plant-detail>${selectedPlant?selectedRecordDetails(selectedPlant):''}</div><p class="ff-muted">Descriptions and categories supply candidates for review. Unknown spacing stays unknown.</p>`;renderResults();
        }
        if(tab==='board')panel.innerHTML=`<span class="ff-eyebrow">MAKE SPACE FOR YOUR IDEAS</span><h2>Your planting table.</h2><p class="ff-muted">Design direction · a saved brief for future recommendations</p><div class="ff-goals">${[['diverse','Diverse harvest'],['fruit-focus','Primary fruit crop'],['lower-input','Lower external inputs']].map(([id,name])=>`<button data-goal="${id}" aria-pressed="${state.goal===id}">${name}</button>`).join('')}</div><p class="ff-muted">Layers placed: ${new Set(state.pieces.map(p=>p.layer)).size} / 7. A design checklist, not a requirement for every site.</p>${selectedPiecePanel()}<div class="ff-filter-pair"><label>Width (m)<input data-dimension="widthM" type="number" min="2" max="1000" value="${state.widthM}"></label><label>Depth (m)<input data-dimension="depthM" type="number" min="2" max="1000" value="${state.depthM}"></label></div><p class="ff-muted">The tabletop is a schematic plan. Models represent layers and forms; their bases are not spacing circles.</p><div class="ff-shapes"><button data-shape="rectangle" aria-pressed="${state.shape==='rectangle'}">Rectangle</button><button data-shape="round" aria-pressed="${state.shape==='round'}">Round</button><button data-action="boundary" aria-pressed="${!!drawing}">Draw boundary</button></div>${drawing?'<p>Click at least three corners on the table.</p><button data-action="finish-boundary">Use boundary</button><button data-action="cancel-boundary">Cancel boundary</button>':''}<div class="ff-line"></div><h3>Explore a challenge</h3><button data-challenge="wind" aria-pressed="${challenge==='wind'}">Wind lesson</button><button data-challenge="pests" aria-pressed="${challenge==='pests'}">Pest lesson</button><p class="ff-muted">Illustrative effects for lesson design. No wind protection, pest control or yield benefit is being calculated.</p><div class="ff-line"></div><button data-action="export">Export this board</button><button data-action="clear">Clear board</button>`;
    }
    function renderResults(){if(tab!=='plants'||!database)return;const filters=Object.fromEntries([...panel.querySelectorAll('[data-filter]')].map(input=>[input.dataset.filter,input.value])),only=panel.querySelector('[data-collection]').checked;const matches=database.records.filter(record=>(!only||state.wishlist.includes(record.id))&&planningRecordMatches(record,filters));panel.querySelector('[data-result-count]').textContent=`${matches.length.toLocaleString()} matches · showing first 24`;panel.querySelector('[data-results]').innerHTML=matches.slice(0,24).map(record=>`<button data-plant="${html(record.id)}"><strong>${html(record.commonName)}</strong><small>${html(record.scientificName||'Identity needs review')}</small></button>`).join('')||'<p>No plants match those filters.</p>';}
    function addPiece(layer,chosenVariant,x,z,plant=selectedPlant,inputSource){if(state.pieces.length>=160){caption('This study supports 160 pieces.');return '';}if(x===undefined){const positions=Array.from({length:100},(_,i)=>({x:-2.6+(i%10)*.57,z:-1.7+Math.floor(i/10)*.38}));const free=positions.find(p=>boardPointInside(p,state.boundary)&&!state.pieces.some(item=>Math.hypot(item.x-p.x,item.z-p.z)<.42))||positions.find(p=>boardPointInside(p,state.boundary));if(!free)return '';x=free.x;z=free.z;}const before=snapshot(),id=crypto.randomUUID();state.pieces.push({id,layer,variant:chosenVariant,x,z,size:1,plantId:plant?.id||'',label:plant?.commonName||'',sourceUrl:plant?.sourceUrl||''});selected=id;remember(before);cues.play('grow',inputSource);caption('Piece placed. Try another layer or move it to explore a different design.');return id;}
    function fit(){if(session){pendingXRRecenter=true;return;}camera.position.set(xrPanel.mesh.visible?7.8:6.4,7.6,xrPanel.mesh.visible?12:9.2);camera.lookAt(xrPanel.mesh.visible?1:0,0,.25);world.rotation.y=-.12;}
    function rayPoint(){const localRay=raycaster.ray.clone().applyMatrix4(new THREE.Matrix4().copy(world.matrixWorld).invert());const p=localRay.intersectPlane(plane,intersection);return p?{x:p.x,z:p.z}:null;}
    function ray(event){const box=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-box.left)/box.width*2-1,-(event.clientY-box.top)/box.height*2+1);scene.updateMatrixWorld(true);raycaster.setFromCamera(pointer,camera);return rayPoint();}
    function hitPiece(){const hits=raycaster.intersectObjects([...bayPieces.map(p=>p.group),...objects.values()].map(p=>p.group||p),true);for(const hit of hits){let object=hit.object;while(object&&object.parent!==bay&&object.parent!==tokenLayer)object=object.parent;if(object?.userData.instanceId||object?.userData.bayVariant!==undefined)return object;}return null;}
    function renderXRPanel(){
        xrPanel.render(({text,button,width,muted})=>{
            text('FOOD FOREST TABLE',34,30,{size:24});text('Pick a piece. Make a place.',34,76,{size:34,weight:650});
            text('Trigger / grip to grab · release to plant',34,128,{size:23,color:muted});
            ['pieces','collection','board'].forEach((page,i)=>button(`page:${page}`,page[0].toUpperCase()+page.slice(1),34+i*278,180,266,66,{active:xrPage===page}));
            if(xrPage==='pieces'){
                text('Seven layers',34,280,{size:26});
                layers.forEach((layer,i)=>button(`layer:${layer.id}`,`${layer.mark}  ${layer.name}`,34+(i%2)*418,332+Math.floor(i/2)*82,406,70,{active:layerId===layer.id,small:true}));
                text('Four sculpted forms',34,696,{size:26});
                variants[layerId].forEach((name,i)=>button(`variant:${i}`,`${i+1}  ${name}`,34+(i%2)*418,746+Math.floor(i/2)*82,406,70,{active:variant===i,small:true}));
                text(selectedPlant?.commonName||'Unassigned design piece',34,950,{size:26,width:width-68});
                button('add','Place selected form',34,1014,822,76);
            }else if(xrPage==='collection'){
                const collection=(database?.records||[]).filter(record=>state.wishlist.includes(record.id));
                xrCollectionPage=Math.min(xrCollectionPage,Math.max(0,Math.ceil(collection.length/7)-1));
                text(`${collection.length} plants in your collection`,34,286,{size:28});
                if(!collection.length)text('Collect plants in the desktop panel first. Your saved collection is shared with this XR table on this browser.',34,358,{size:29,lines:4});
                collection.slice(xrCollectionPage*7,xrCollectionPage*7+7).forEach((record,i)=>button(`plant:${record.id}`,record.commonName,34,352+i*88,822,76,{active:selectedPlant?.id===record.id,small:true}));
                button('collection:prev','Previous plants',34,1006,88,76,{symbol:'back',disabled:!xrCollectionPage});
                button('collection:next','Next plants',768,1006,88,76,{symbol:'plus',disabled:(xrCollectionPage+1)*7>=collection.length});
            }else{
                button('goal',`Direction: ${state.goal||'diverse'}`,34,274,822,58,{small:true});
                button('shape:rectangle','Rectangle',34,350,406,70,{active:state.shape==='rectangle'});button('shape:round','Round',452,350,406,70,{active:state.shape==='round'});
                button('boundary','Draw boundary',34,440,406,70,{active:!!drawing});button(drawing?'finish-boundary':'recenter',drawing?'Use boundary':'Bring table here',452,440,406,70);
                button('grid','Optional grid',34,530,406,70,{symbol:'notes',label:true,active:showGrid});button('labels','Labels',452,530,406,70,{symbol:'panel',label:true,active:showLabels});
                button('challenge:wind','Wind lesson',34,620,406,70,{active:challenge==='wind'});button('challenge:pests','Pest lesson',452,620,406,70,{active:challenge==='pests'});
                text('Illustrative lessons. No yields, protection or planting distances are calculated yet.',34,725,{size:26,lines:3,color:muted});
                button('width:minus','Reduce width',34,868,80,74,{symbol:'minus',disabled:state.widthM<=2});text(`Width ${state.widthM} m`,134,892,{size:24});button('width:plus','Increase width',354,868,80,74,{symbol:'plus',disabled:state.widthM>=1000});
                button('depth:minus','Reduce depth',452,868,80,74,{symbol:'minus',disabled:state.depthM<=2});text(`Depth ${state.depthM} m`,550,892,{size:24});button('depth:plus','Increase depth',776,868,80,74,{symbol:'plus',disabled:state.depthM>=1000});
                const selectedPiece=state.pieces.find(p=>p.id===selected),prefix=selectedPiece?'canopy':'scale';
                button(`${prefix}:minus`,selectedPiece?'Reduce planned canopy':'Smaller tabletop',34,986,90,76,{symbol:'minus'});text(selectedPiece?`Canopy plan: ${selectedPiece.canopyDiameterM||0} m`:'Physical table size',150,1008,{size:25});button(`${prefix}:plus`,selectedPiece?'Increase planned canopy':'Larger tabletop',766,986,90,76,{symbol:'plus'});
            }
            text(drawing?`${drawing.length} corners · point at the board to draw`:'Right stick click hides / shows this panel',34,1130,{size:23,color:muted});
            const controls=[['undo','undo','Undo',!history.length],['redo','redo','Redo',!future.length],['remove','delete','Remove selected piece',!selected],['sound','volume','Sound',false],['exit','close','Exit XR',!session]];
            controls.forEach(([id,symbol,title,disabled],i)=>button(id,title,34+i*166,1200,146,88,{symbol,disabled,active:id==='sound'&&cues.enabled}));
            text('Matte layer symbols · local study',34,1344,{size:23,color:muted});
        });
    }
    function xrCommand(id,source){
        actionSource=source;
        try{
            if(id==='goal'){const goals=['diverse','fruit-focus','lower-input'];commit(()=>state.goal=goals[(goals.indexOf(state.goal)+1)%3]);}
            else if(id.startsWith('page:'))xrPage=id.slice(5);
            else if(id.startsWith('layer:')){layerId=id.slice(6);variant=0;updateBay();renderPanel();}
            else if(id.startsWith('variant:')){variant=+id.slice(8);renderPanel();}
            else if(id.startsWith('plant:')){selectedPlant=database.records.find(record=>record.id===id.slice(6));if(layers.some(layer=>layer.id===selectedPlant.layer?.value))layerId=selectedPlant.layer.value;variant=0;updateBay();xrPage='pieces';renderPanel();cues.play('grow',source);}
            else if(id.startsWith('collection:'))xrCollectionPage+=id.endsWith('next')?1:-1;
            else if(id==='exit')void session?.end();
            else if(id==='recenter')pendingXRRecenter=true;
            else if(id.startsWith('scale:'))world.scale.setScalar(THREE.MathUtils.clamp(world.scale.x*(id.endsWith('plus')?1.15:1/1.15),.14,.34));
            else if(id.startsWith('canopy:')){const item=state.pieces.find(p=>p.id===selected);if(item)commit(()=>{item.canopyDiameterM=THREE.MathUtils.clamp((item.canopyDiameterM||0)+(id.endsWith('plus')?.5:-.5),0,60);item.footprintBasis='user-design-assumption';});}
            else if(id.startsWith('width:')||id.startsWith('depth:')){const field=id.startsWith('width')?'widthM':'depthM';commit(()=>state[field]=THREE.MathUtils.clamp(state[field]+(id.endsWith('plus')?2:-2),2,1000));}
            else if(id.startsWith('shape:')){commit(()=>{state.shape=id.slice(6);state.boundary=foodForestBoundary(state.shape);});paintBoard();}
            else if(id.startsWith('challenge:')){challenge=challenge===id.slice(10)?'':id.slice(10);if(tab==='board')renderPanel();}
            else{if(!root.querySelector(`[data-action="${id}"]`))setTab('board');root.querySelector(`[data-action="${id}"]`)?.click();return;}
            cues.play('tap',source);
        }finally{actionSource=null;renderXRPanel();}
    }
    function controllerRay(controller){scene.updateMatrixWorld(true);raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);raycaster.ray.direction.set(0,0,-1).transformDirection(controller.matrixWorld);}
    function panelHit(){return xrPanel.hit(raycaster.intersectObject(xrPanel.mesh)[0]);}
    function endXRGrab(controller,cancel=false,owner){
        const grab=xrGestures.get(controller);if(!grab||owner&&grab.owner!==owner)return;xrGestures.delete(controller);
        const item=state.pieces.find(piece=>piece.id===grab.id);
        if(cancel||!item||!boardPointInside(item,state.boundary)){state=grab.before;selected='';update();if(!cancel)cues.play('error',controller.userData.source);}
        else{remember(grab.before);cues.play(grab.isNew?'grow':'place',controller.userData.source);}
    }
    function startXRGrab(controller,allowPanel,owner){
        if(!session||!controller.visible||xrGestures.size)return;controllerRay(controller);
        const control=allowPanel&&panelHit();if(control){xrCommand(control.id,controller.userData.source);return;}
        const point=rayPoint();if(!point)return;
        if(drawing){if(Math.abs(point.x)<3&&Math.abs(point.z)<2){drawing.push(point);drawBoundaryPreview();renderXRPanel();cues.play('place',controller.userData.source);}return;}
        const hit=hitPiece();if(!hit)return;const before=snapshot();let item,isNew=false;
        if(hit.userData.bayVariant!==undefined){if(state.pieces.length>=160)return;isNew=true;item={id:crypto.randomUUID(),layer:layerId,variant:hit.userData.bayVariant,x:point.x,z:point.z,size:1,plantId:selectedPlant?.id||'',label:selectedPlant?.commonName||''};state.pieces.push(item);}
        else item=state.pieces.find(piece=>piece.id===hit.userData.instanceId);
        selected=item.id;xrGestures.set(controller,{id:item.id,before,isNew,owner,offset:{x:isNew?0:point.x-item.x,z:isNew?0:point.z-item.z}});syncTokens();cues.play('grab',controller.userData.source);renderXRPanel();
    }
    for(let i=0;i<2;i++){
        const controller=renderer.xr.getController(i);scene.add(controller);xrControllers.push(controller);
        const beam=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1)]),new THREE.LineBasicMaterial({color:0x759582}));beam.scale.z=3;controller.add(beam);
        controller.addEventListener('connected',event=>{controller.userData.source=event.data;xrLatch.reset();});
        controller.addEventListener('disconnected',()=>{endXRGrab(controller,true);controller.userData.source=null;xrLatch.reset();});
        controller.addEventListener('selectstart',()=>startXRGrab(controller,true,'select'));controller.addEventListener('selectend',()=>endXRGrab(controller,false,'select'));
        controller.addEventListener('squeezestart',()=>startXRGrab(controller,false,'squeeze'));controller.addEventListener('squeezeend',()=>endXRGrab(controller,false,'squeeze'));
    }
    function tickXR(frame){
        if(!session||!frame||session.visibilityState==='hidden')return;
        if(pendingXRRecenter){const pose=frame.getViewerPose(renderer.xr.getReferenceSpace());if(pose){const p=pose.transform.position,q=pose.transform.orientation,f=new THREE.Vector3(0,0,-1).applyQuaternion(new THREE.Quaternion(q.x,q.y,q.z,q.w));f.y=0;f.normalize();world.position.set(p.x+f.x*1.15,p.y-.55,p.z+f.z*1.15);world.rotation.set(0,Math.atan2(-f.x,-f.z),0);world.scale.setScalar(.22);pendingXRRecenter=false;}}
        let focus='';
        for(const controller of xrControllers){const source=controller.userData.source;
            if(source&&xrLatch.poll(source,source.gamepad?.buttons[3]?.pressed)){xrPanel.mesh.visible=!xrPanel.mesh.visible;cues.play('tap',source);}
            if(!controller.visible){endXRGrab(controller,true);continue;}
            controllerRay(controller);const grab=xrGestures.get(controller);
            if(grab){const point=rayPoint(),item=state.pieces.find(piece=>piece.id===grab.id);if(point&&item){item.x=point.x-grab.offset.x;item.z=point.z-grab.offset.z;objects.get(item.id).group.position.set(item.x,.32,item.z);}}
            else focus ||= panelHit()?.id||'';
        }
        xrPanel.hover(focus);
    }
    async function enterXR(){
        if(disposed||session||xrPending||!xrSupport)return;xrPending=true;xrButton.disabled=true;
        try{
            const next=await navigator.xr.requestSession(xrSupport,{optionalFeatures:['local-floor','hand-tracking']});
            if(disposed){await next.end();return;}cancelDrag();session=next;root.classList.add('is-xr');xrPanel.mesh.visible=true;pendingXRRecenter=true;xrLatch.reset();
            next.addEventListener('visibilitychange',()=>{if(next.visibilityState!=='visible')for(const controller of xrControllers)endXRGrab(controller,true);});
            next.addEventListener('end',()=>{for(const controller of xrControllers)endXRGrab(controller,true);session=null;xrPanel.mesh.visible=false;world.position.set(0,0,0);world.scale.setScalar(1);root.classList.remove('is-xr');fit();xrLatch.reset();xrButton.disabled=disposed;});
            await renderer.xr.setSession(next);renderXRPanel();cues.play('grow');
        }catch(error){if(session){try{await session.end();}catch{/* Already ended. */}}caption(`XR could not start: ${error.message}`);}
        finally{xrPending=false;xrButton.disabled=disposed||!!session||!xrSupport;}
    }
    if(navigator.xr){void(async()=>{try{xrSupport=await navigator.xr.isSessionSupported('immersive-ar')?'immersive-ar':await navigator.xr.isSessionSupported('immersive-vr')?'immersive-vr':'';}catch{/* Desktop preview still works. */}if(!disposed){xrButton.disabled=!xrSupport;xrButton.title=xrButton.ariaLabel=xrSupport?'Enter XR table':'XR unavailable on this browser';}})();}
    renderer.domElement.addEventListener('pointerdown',event=>{if(session||event.button!==0)return;const point=ray(event);const control=panelHit();if(control){xrCommand(control.id);return;}if(!point)return;renderer.domElement.setPointerCapture(event.pointerId);if(drawing){if(Math.abs(point.x)<3&&Math.abs(point.z)<2){drawing.push(point);caption(`${drawing.length} boundary corners. Choose Use boundary when ready.`);drawBoundaryPreview();}return;}const hit=hitPiece();if(hit?.userData.bayVariant!==undefined){if(state.pieces.length>=160)return;const before=snapshot(),id=crypto.randomUUID();state.pieces.push({id,layer:layerId,variant:hit.userData.bayVariant,x:point.x,z:point.z,size:1,plantId:selectedPlant?.id||'',label:selectedPlant?.commonName||''});selected=id;syncTokens();drag={type:'piece',id,before,isNew:true,offset:{x:0,z:0}};cues.play('grab');}
        else if(hit?.userData.instanceId){selected=hit.userData.instanceId;const item=state.pieces.find(p=>p.id===selected);drag={type:'piece',id:selected,before:snapshot(),offset:{x:point.x-item.x,z:point.z-item.z}};syncTokens();cues.play('grab');}
        else drag={type:'orbit',x:event.clientX,before:world.rotation.y};}, {signal});
    renderer.domElement.addEventListener('pointermove',event=>{if(!drag)return;const point=ray(event);if(drag.type==='orbit'){world.rotation.y=drag.before+(event.clientX-drag.x)*.005;return;}if(!point)return;const item=state.pieces.find(p=>p.id===drag.id);item.x=point.x-drag.offset.x;item.z=point.z-drag.offset.z;objects.get(item.id)?.group.position.set(item.x,.3,item.z);caption(boardPointInside(item,state.boundary)?'Release to place.':'Outside the planting area · move back onto the board.');},{signal});
    renderer.domElement.addEventListener('pointerup',()=>{if(!drag)return;const active=drag;drag=null;if(active.type==='piece'){const item=state.pieces.find(p=>p.id===active.id);if(!item||!boardPointInside(item,state.boundary)){state=active.before;selected='';update();caption('Placement cancelled. The piece stayed in the loading bay.');cues.play('error');}else{remember(active.before);cues.play(active.isNew?'grow':'place');caption('Placed. Saved on this device.');}}},{signal});
    function cancelDrag(){if(drag?.type==='piece'){state=drag.before;selected='';update();}drag=null;}
    renderer.domElement.addEventListener('pointercancel',cancelDrag,{signal});window.addEventListener('blur',cancelDrag,{signal});
    renderer.domElement.addEventListener('wheel',event=>{event.preventDefault();if(session)return;camera.position.multiplyScalar(THREE.MathUtils.clamp(1+event.deltaY*.0006,.85,1.15));camera.position.clampLength(5,22);camera.lookAt(0,0,.25);},{signal,passive:false});
    let boundaryLine;
    function drawBoundaryPreview(){if(boundaryLine){boundaryLine.geometry.dispose();boundaryLine.material.dispose();world.remove(boundaryLine);boundaryLine=null;}if(drawing?.length){boundaryLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints(drawing.map(p=>new THREE.Vector3(p.x,.2,p.z))),new THREE.LineBasicMaterial({color:0x875c40}));world.add(boundaryLine);}}
    root.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;
        if(button.dataset.tab){setTab(button.dataset.tab);cues.play('tap',actionSource);return;}
        if(button.dataset.layer){layerId=button.dataset.layer;variant=0;updateBay();renderPanel();cues.play('tap',actionSource);renderXRPanel();return;}
        if(button.dataset.variant!==undefined){variant=+button.dataset.variant;renderPanel();cues.play('tap',actionSource);renderXRPanel();return;}
        if(button.dataset.plant){selectedPlant=database.records.find(record=>record.id===button.dataset.plant);panel.querySelector('[data-plant-detail]').innerHTML=selectedRecordDetails(selectedPlant);cues.play('tap',actionSource);return;}
        if(button.hasAttribute('data-load-plant')){if(layers.some(layer=>layer.id===selectedPlant.layer?.value))layerId=selectedPlant.layer.value;variant=0;updateBay();setTab('pieces');caption(`${selectedPlant.commonName} is ready in the loading bay. Choose its form.`);cues.play('grow',actionSource);renderXRPanel();return;}
        if(button.dataset.wish){const id=button.dataset.wish;state.wishlist=state.wishlist.includes(id)?state.wishlist.filter(x=>x!==id):[...state.wishlist,id];save();panel.querySelector('[data-plant-detail]').innerHTML=selectedRecordDetails(selectedPlant);renderResults();cues.play('tap',actionSource);return;}
        if(button.dataset.goal){commit(()=>state.goal=button.dataset.goal);cues.play('tap',actionSource);return;}
        if(button.dataset.shape){commit(()=>{state.shape=button.dataset.shape;state.boundary=foodForestBoundary(state.shape);});paintBoard();return;}
        if(button.dataset.challenge){challenge=challenge===button.dataset.challenge?'':button.dataset.challenge;caption(challenge==='wind'?'A windy day. Where might you add shelter? This is an illustrative lesson.':challenge==='pests'?'Pest pressure. Which relationships would you investigate? This is an illustrative lesson.':'Challenge stopped.');renderPanel();cues.play('tap',actionSource);renderXRPanel();return;}
        const action=button.dataset.action;
        if(action==='abstract'){selectedPlant=null;updateBay();renderPanel();renderXRPanel();return;}
        if(action==='back-to-demos'&&backUrl){location.assign(backUrl);return;}
        if(action==='enter-xr'){void enterXR();return;}
        if(action==='add')addPiece(layerId,variant,undefined,undefined,selectedPlant,actionSource);
        if(action==='kit'){commit(()=>{state.shape='rectangle';state.boundary=foodForestBoundary();state.pieces=layers.flatMap((layer,row)=>variants[layer.id].map((_,v)=>({id:crypto.randomUUID(),layer:layer.id,variant:v,x:-2.25+v*1.5,z:-1.72+row*.57,size:.72,label:`${layer.mark}.${v+1} ${variants[layer.id][v]}`,plantId:''})));selected='';});paintBoard();fit();caption('All 28 original pieces. Undo returns to your planting design.');}
        if(action==='undo'||action==='redo'){const from=action==='undo'?history:future,to=action==='undo'?future:history;if(from.length){to.push(snapshot());const wishlist=state.wishlist;state=from.pop();state.wishlist=wishlist;selected='';save();paintBoard();update();}}
        if(action==='spatial-panel'){xrPanel.mesh.visible=!xrPanel.mesh.visible;button.setAttribute('aria-pressed',String(xrPanel.mesh.visible));fit();}if(action==='fit')fit();if(action==='zoom-in'||action==='zoom-out'){camera.position.multiplyScalar(action==='zoom-in'?.9:1.1);camera.position.clampLength(5,22);camera.lookAt(0,0,.25);}
        if(action==='grid'){showGrid=!showGrid;grid.visible=showGrid;button.setAttribute('aria-pressed',String(showGrid));}
        if(action==='labels'){showLabels=!showLabels;syncTokens();button.setAttribute('aria-pressed',String(showLabels));}
        if(action==='sound'){cues.setEnabled(!cues.enabled);button.setAttribute('aria-pressed',String(cues.enabled));}
        if(action==='remove'&&selected)commit(()=>{state.pieces=state.pieces.filter(item=>item.id!==selected);selected='';});
        if(action==='boundary'){drawing=[];renderPanel();caption('Click corners on the board, then choose Use boundary.');}
        if(action==='finish-boundary'){if(validFoodForestBoundary(drawing)){commit(()=>{state.boundary=drawing;state.shape='custom';});drawing=null;drawBoundaryPreview();paintBoard();renderPanel();}else caption('Choose at least three distinct corners, without crossing the outline.');}
        if(action==='cancel-boundary'){drawing=null;drawBoundaryPreview();renderPanel();}
        if(action==='clear'){commit(()=>{state.pieces=[];selected='';});caption('Board cleared. Undo restores your design.');}
        if(action==='export'){const url=URL.createObjectURL(new Blob([JSON.stringify({schemaVersion:1,kind:'food-forest-board-study',...state},null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='food-forest-board.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
        cues.play('tap',actionSource);renderXRPanel();
    },{signal});
    panel.addEventListener('input',event=>{if(event.target.dataset.filter||event.target.hasAttribute('data-collection'))renderResults();},{signal});
    panel.addEventListener('change',event=>{const spread=event.target.hasAttribute('data-canopy');if(spread&&selected){const n=Number(event.target.value);if(Number.isFinite(n)&&n>=0&&n<=60)commit(()=>{const item=state.pieces.find(p=>p.id===selected);item.canopyDiameterM=n;item.footprintBasis='user-design-assumption';});return;}const field=event.target.dataset.dimension;if(field){const number=Number(event.target.value);if(Number.isFinite(number)&&number>=2&&number<=1000)commit(()=>state[field]=number);else event.target.value=state[field];}},{signal});
    const resize=new ResizeObserver(()=>{const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();});resize.observe(stage);
    let restored=false;
    try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved&&validFoodForestBoundary(saved.boundary)&&Number.isFinite(saved.widthM)&&saved.widthM>=2&&saved.widthM<=1000&&Number.isFinite(saved.depthM)&&saved.depthM>=2&&saved.depthM<=1000&&Array.isArray(saved.pieces)&&saved.pieces.length<=160&&new Set(saved.pieces.map(item=>item.id)).size===saved.pieces.length&&saved.pieces.every(item=>layers.some(l=>l.id===item.layer)&&Number.isFinite(item.x)&&Number.isFinite(item.z)&&typeof item.id==='string'&&item.id.length<=100&&Math.abs(item.x)<=3&&Math.abs(item.z)<=2&&Number.isInteger(item.variant)&&item.variant>=0&&item.variant<=3&&Number.isFinite(item.size)&&item.size>=.4&&item.size<=1.8&&(item.canopyDiameterM===undefined||Number.isFinite(item.canopyDiameterM)&&item.canopyDiameterM>=0&&item.canopyDiameterM<=60)&&(item.rotation===undefined||Number.isFinite(item.rotation)))){state={...state,...saved};state.wishlist=Array.isArray(saved.wishlist)?[...new Set(saved.wishlist.filter(id=>typeof id==='string'&&id.length<100))].slice(0,2500):[];state.goal=['diverse','fruit-focus','lower-input'].includes(saved.goal)?saved.goal:'diverse';restored=true;}}catch{/* Invalid saved study starts fresh. */}
    if(!restored)state.pieces=layers.map((layer,i)=>({id:crypto.randomUUID(),layer:layer.id,variant:i%4,x:[-1.8,.1,1.8,-1,.8,-1.8,1.8][i],z:[-.9,-.6,-.8,.6,.8,1,.65][i],size:1,plantId:'',label:''}));
    paintBoard();updateBay();fit();update();renderPanel();
    const windLines=[];for(let i=0;i<15;i++){const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.3,0,0),new THREE.Vector3(.3,0,0)]),new THREE.LineBasicMaterial({color:0x5c8b9b,transparent:true,opacity:.6}));line.position.set(-3+i*.4,.3+(i%3)*.12,-1.7+(i%5)*.7);effects.add(line);windLines.push(line);}
    const pestChips=[];const pestMat=mat('#a77441');for(let i=0;i<8;i++)pestChips.push(mesh(new THREE.SphereGeometry(.038,6,4),pestMat,effects,-2+i*.55,.25,Math.sin(i)*1.2));
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    renderer.setAnimationLoop((time,frame)=>{if(disposed)return;tickXR(frame);for(const item of state.pieces){const roots=rootVisuals.get(item.id);if(!roots)continue;const held=drag?.id===item.id||[...xrGestures.values()].some(grab=>grab.id===item.id);roots.group.visible=!held&&boardPointInside(item,state.boundary);roots.group.position.set(item.x,.16,item.z);if(held){roots.born=null;continue;}roots.born??=time;const t=reduced?1:Math.min(1,Math.max(0,(time-roots.born)/800)),growth=1-Math.pow(1-t,3);roots.group.scale.set(item.size||1,Math.max(.001,growth)*(item.size||1),item.size||1);}windLines.forEach((line,i)=>{line.visible=challenge==='wind';if(!reduced)line.position.x=((time*.0014+i*.43)%6)-3;});pestChips.forEach((chip,i)=>{chip.visible=challenge==='pests';if(!reduced)chip.position.z=Math.sin(time*.0005+i)*1.2;});if(challenge==='wind'&&!reduced)for(const [id,piece]of objects)piece.group.rotation.z=Math.sin(time*.002+state.pieces.findIndex(p=>p.id===id))*.025;else for(const piece of objects.values())piece.group.rotation.z=0;renderer.render(scene,camera);});
    try{const response=await fetch(new URL('../assets/food-forest/plants.json',import.meta.url),{signal});if(!response.ok)throw Error(`HTTP ${response.status}`);database=await response.json();if(!disposed){if(tab==='plants')renderPanel();renderXRPanel();}}catch(error){if(!disposed)caption(`Plant collection could not load (${error.message}). The piece kit is ready.`);}
    function previewTargets(){scene.updateMatrixWorld(true);const box=renderer.domElement.getBoundingClientRect(),project=(object,id)=>{const p=object.getWorldPosition(new THREE.Vector3()).project(camera);return{id,x:box.x+(p.x+1)*box.width/2,y:box.y+(1-p.y)*box.height/2};};return [...state.boundary.map((p,i)=>project({getWorldPosition:v=>v.set(p.x,.16,p.z).applyMatrix4(world.matrixWorld)},`corner:${i}`)),project({getWorldPosition:v=>v.set(0,.16,0).applyMatrix4(world.matrixWorld)},'board:center'),...xrPanel.buttons.map(b=>project({getWorldPosition:v=>v.set((b.x+b.w/2)/900*2.25-1.125,1.825-(b.y+b.h/2)/(900*3.65/2.25)*3.65,0).applyMatrix4(xrPanel.mesh.matrixWorld)},`control:${b.id}`)),...bayPieces.map((p,i)=>project(p.group,`bay:${i}`)),...objects.entries()].map(item=>Array.isArray(item)?project(item[1].group,item[0]):item);}
    return {getState:()=>({...snapshot(),layer:layerId,variant,challenge,grid:showGrid,labels:showLabels,catalogReady:!!database,underground:{board:'transparent-glass',roots:rootVisuals.size},selected,feedback:cues.counts,xrControlsVisible:xrPanel.mesh.visible,immersive:!!session}),getPreviewTargets:previewTargets,destroy(){disposed=true;for(const controller of xrControllers)endXRGrab(controller,true);void session?.end().catch(()=>{});xrPanel.dispose();abort.abort();resize.disconnect();renderer.setAnimationLoop(null);for(const object of objects.values())object.dispose();for(const roots of rootVisuals.values())roots.dispose();for(const piece of bayPieces)piece.dispose();for(const label of labels)disposeLabel(label);scene.traverse(object=>{object.geometry?.dispose();if(object.material&&!Array.isArray(object.material))object.material.dispose();});for(const geometry of geoms)geometry.dispose();for(const material of mats)material.dispose();renderer.dispose();cues.destroy();host.innerHTML='';}};
}
