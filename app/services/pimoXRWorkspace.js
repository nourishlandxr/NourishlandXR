import * as THREE from '../vendor/three.module.min.js';
import { pimoCellOutline, pimoConnectionPoints } from './pimoGraphGeometry.js';
import { pimoCellAppearance, PIMO_DESIGNS } from './pimoGraphDesigns.js';
import { PIMO_COLORS } from './pimoGraph.js';
import { PIMO_TEMPLATES } from './pimoGraphTemplates.js';
import { pimoIcon, pimoIconButton } from './pimoEditorIcons.js';
import { createPimoXRWorkbench, createPimoXRButtonLatch } from './pimoXRWorkbench.js';
import { createPimoXRPanel } from './pimoXRPanel.js';
import { createPimoGrabOwnership, pimoPlacement, pimoPointInCell } from './pimoXRInteraction.js';
import { createPimoXRFeedback } from './pimoXRFeedback.js';
import { creatorAccessCapabilities } from './creatorHub.js';
import { welcomeWristPose } from './welcomeWristMenu.js';

const modes = { select: ['select', 'Select / move cells'], grow: ['plus', 'Grow a child or plant an idea'], connect: ['link', 'Connect two cells'], draw: ['draw', 'Draw your own cell'] };
const fields = { title: 'Cell title', body: 'Notes', sourceUrl: 'Source link', attribution: 'Attribution', mapTitle: 'Map name', label: 'Relationship label' };

export async function openPimoSpatialCanvas(api) {
    if(creatorAccessCapabilities().kind==='phone')throw Error('Use the touch PIMO editor on this device.');
    const root = document.createElement('section'); root.className = 'pimo-spatial pimo-xr-workspace'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'PIMO XR editor');
    root.innerHTML = `<div class="spatial-heading"><h2>PIMO · XR Studio</h2><p>A living workspace for your knowledge.</p></div><div class="spatial-actions"><button class="pimo-primary" data-spatial="enter" disabled>${pimoIcon('xr')}Enter XR</button>${pimoIconButton('close', 'close', 'Close spatial canvas')}</div><div class="spatial-tools" role="toolbar" aria-label="Spatial tools">${Object.entries(modes).map(([id, [icon, name]]) => `<button class="pimo-icon" data-spatial="${id}" aria-label="${name}" title="${name}" aria-pressed="${id === 'select'}">${pimoIcon(icon)}</button>`).join('')}<button class="pimo-icon" data-spatial="undo" aria-label="Undo" title="Undo">${pimoIcon('undo')}</button><button class="pimo-icon" data-spatial="recenter" aria-label="Recenter workspace" title="Recenter workspace">${pimoIcon('fit')}</button></div><p class="spatial-notice" role="status" data-spatial-notice>Point and click the floating tools. Drag cells to move · drag empty space to turn · scroll to zoom.</p>`;
    const previousFocus = document.activeElement, editor = document.querySelector('[data-pimo-editor]'); if (editor) editor.inert = true; document.body.append(root);
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch (error) { root.remove(); if (editor) editor.inert = false; throw error; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setSize(innerWidth, innerHeight); renderer.xr.enabled = true; renderer.outputColorSpace = THREE.SRGBColorSpace; root.prepend(renderer.domElement);
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(43, innerWidth / innerHeight, .025, 30), board = new THREE.Group(), cellLayer = new THREE.Group(), linkLayer = new THREE.Group();
    camera.position.set(.35, 1.3, 3.1); camera.lookAt(.35, 1.3, 0); board.position.y = 1.3; scene.add(board); board.add(linkLayer, cellLayer);
    scene.add(new THREE.HemisphereLight(0xfffdf2, 0x748569, 2.1)); const sun = new THREE.DirectionalLight(0xfff7dd, 2.3); sun.position.set(-2, 4, 5); scene.add(sun);
    const work = createPimoXRWorkbench(api), latch = createPimoXRButtonLatch(), ownership = createPimoGrabOwnership(), cues = createPimoXRFeedback(), abort = new AbortController(), { signal } = abort;
    const raycaster = new THREE.Raycaster(), rotation = new THREE.Matrix4(), plane = new THREE.Plane(), intersection = new THREE.Vector3(), pointer = new THREE.Vector2();
    raycaster.params.Line.threshold = .012;
    const cells = new Map(), links = new Map(), controllers = [], gestures = new Map(), grips = new Map(), panels = new Map(), sourceHover = new Map(), hoveredCells = new Set(), graphTargets = [], hands = [];
    let session = null, supported = '', disposed = false, entering = false, pendingRecenter = false, pointerGesture = null, visualGraph, selectedSource = '', menuOpen = true, soundOn = true, speech, grabBase, hoverHint = '', snapEnabled = true;
    let centre = { x: 0, y: 0 }, scale = .0016, lastGraphId = '', panelPage = 0, deletePending = '', previewPoints = [], rebuildPending = false;
    const wristOpened={left:false,right:false};let pimoInputPreference='auto';
    const localPoint = p => new THREE.Vector3((p.x - centre.x) * scale, -(p.y - centre.y) * scale, .01);
    const strokeGeometry = new THREE.BufferGeometry(); strokeGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(220 * 3), 3));
    const preview = new THREE.Line(strokeGeometry, new THREE.LineBasicMaterial({ color: 0x416340 })); preview.visible = false; preview.frustumCulled = false; board.add(preview);
    const reticleGeometry = new THREE.RingGeometry(.004, .007, 16), reticleMaterial = new THREE.MeshBasicMaterial({ color: 0x466b48, side: THREE.DoubleSide, depthTest: false });
    const landingEffects = Array.from({ length: 8 }, () => {
        const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(256 * 3), 3));
        const mesh = new THREE.LineLoop(geometry, new THREE.LineBasicMaterial({ color: 0x668b59, transparent: true, opacity: 0, depthWrite: false })); mesh.visible = false; mesh.frustumCulled = false; board.add(mesh); return { mesh, started: 0 };
    });
    function landing(id, special = false) {
        const layout = api.getGraph().layout.nodes[id]; if (!layout) return;
        const effect = landingEffects.find(item => !item.mesh.visible) || landingEffects.reduce((a, b) => a.started < b.started ? a : b), points = pimoCellOutline(layout).slice(0, 256), buffer = effect.mesh.geometry.attributes.position;
        points.forEach((p, i) => buffer.setXYZ(i, p.x * layout.width * scale * .54, -p.y * layout.height * scale * .54, 0)); buffer.needsUpdate = true; effect.mesh.geometry.setDrawRange(0, points.length); effect.mesh.position.copy(localPoint(layout)).setZ(.045); effect.mesh.scale.setScalar(1); effect.mesh.material.color.set(special ? 0xb3905a : 0x668b59); effect.mesh.material.opacity = .8; effect.mesh.visible = true; effect.started = performance.now();
    }
    function makeGhost(id) {
        const layout = api.getGraph().layout.nodes[id], points = pimoCellOutline(layout).map(p => new THREE.Vector3(p.x * layout.width * scale * .53, -p.y * layout.height * scale * .53, 0));
        const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineDashedMaterial({ color: 0x527345, dashSize: .012, gapSize: .008, transparent: true, opacity: .65 })); line.computeLineDistances(); line.visible = false; board.add(line); return line;
    }
    function discardGhost(gesture) { if (gesture?.ghost) { gesture.ghost.removeFromParent(); gesture.ghost.geometry.dispose(); gesture.ghost.material.dispose(); } }
    function notice(text) { work.status(text); root.querySelector('[data-spatial-notice]').textContent = text; }
    function feedback(controller, kind = 'tap') { cues.play(kind === true ? 'grow' : kind, controller?.userData.source); }
    function clearLayer(layer) { layer.traverse(object => { object.geometry?.dispose(); for (const material of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) { material.map?.dispose(); material.dispose(); } }); layer.clear(); }
    function label(text, color = '#fffdf2', caption = '', wide = false) {
        const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = wide ? 90 : 260; const context = canvas.getContext('2d'); context.fillStyle = color; context.textAlign = 'center'; context.textBaseline = 'middle'; context.font = `600 ${wide ? 32 : 52}px system-ui`;
        const words = String(text).split(/\s+/), lines = ['']; for (const word of words) { const n = lines.length - 1, next = lines[n] + (lines[n] ? ' ' : '') + word; if (context.measureText(next).width > 475 && lines[n]) lines.push(word); else lines[n] = next; }
        const count = Math.min(wide ? 1 : 3, lines.length); lines.slice(0, count).forEach((line, i) => { if (i === count - 1 && lines.length > count) line += '…'; context.fillText(line, 256, canvas.height / 2 + (i - (count - 1) / 2) * 56, 480); });
        if (caption && !wide) { context.font = '500 20px system-ui'; context.fillText(caption.toUpperCase(), 256, 32, 470); }
        const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.minFilter = THREE.LinearFilter; return new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    }
    function fitMap() {
        const positions = Object.values(api.getGraph().layout.nodes); if (!positions.length) { centre = { x: 0, y: 0 }; scale = .0016; return; }
        const minX = Math.min(...positions.map(p => p.x - p.width / 2)), maxX = Math.max(...positions.map(p => p.x + p.width / 2)), minY = Math.min(...positions.map(p => p.y - p.height / 2)), maxY = Math.max(...positions.map(p => p.y + p.height / 2));
        centre = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }; scale = Math.min(.0024, 1.8 / Math.max(650, maxX - minX, (maxY - minY) * 1.65));
    }
    function updateLine(edge, graph) {
        const entry = links.get(edge.id); if (!entry) return;
        const points = pimoConnectionPoints(graph, edge).map(localPoint); if (points.length < 2) return;
        let values;
        if (points.length === 2 && (graph.layout.design || 'organic') === 'organic') { const [a, b] = points, dx = (b.x - a.x) * .4; values = new THREE.CubicBezierCurve3(a, new THREE.Vector3(a.x + dx, a.y, .01), new THREE.Vector3(b.x - dx, b.y, .01), b).getPoints(32); }
        else { const curve = new THREE.CurvePath(); points.slice(1).forEach((p, i) => curve.add(new THREE.LineCurve3(points[i], p))); values = curve.getSpacedPoints(32); }
        const buffer = entry.line.geometry.attributes.position; values.forEach((p, i) => buffer.setXYZ(i, p.x, p.y, p.z)); buffer.needsUpdate = true; entry.line.geometry.computeBoundingSphere(); if (edge.kind === 'relationship') entry.line.computeLineDistances();
        entry.label?.position.copy(values[16]).add(new THREE.Vector3(0, .027, .02));
    }
    // Reconcile only changed cells. Selection/movement reuse geometry and textures.
    function rebuild(refit = false) {
        if (disposed) return;
        if (gestures.size || pointerGesture?.type === 'move') { rebuildPending = true; refreshPanels(); return; }
        if (refit || lastGraphId !== api.getGraph().id) fitMap(); lastGraphId = api.getGraph().id; visualGraph = structuredClone(api.getGraph());
        graphTargets.length = 0; hoveredCells.clear();
        const nodeIds = new Set(visualGraph.nodes.map(node => node.id)), edgeIds = new Set(visualGraph.edges.map(edge => edge.id));
        for (const [id, entry] of cells) if (!nodeIds.has(id)) { clearLayer(entry.group); entry.group.removeFromParent(); cells.delete(id); }
        for (const [id, entry] of links) if (!edgeIds.has(id)) { entry.line.geometry.dispose(); entry.line.material.dispose(); entry.line.removeFromParent(); if (entry.label) { entry.label.material.map.dispose(); entry.label.material.dispose(); entry.label.removeFromParent(); } links.delete(id); }
        for (const node of visualGraph.nodes) {
            const layout = visualGraph.layout.nodes[node.id], appearance = pimoCellAppearance(visualGraph, layout);
            const signature = JSON.stringify([layout.width, layout.height, layout.shape, layout.hexOrientation, layout.outline, appearance.fill, appearance.text, node.title, node.informationType, scale]);
            let entry = cells.get(node.id);
            if (!entry || entry.signature !== signature) {
                if (entry) { clearLayer(entry.group); entry.group.removeFromParent(); }
                const points = pimoCellOutline(layout), shape = new THREE.Shape(); points.forEach((point, i) => shape[i ? 'lineTo' : 'moveTo'](point.x * layout.width * scale / 2, -point.y * layout.height * scale / 2)); shape.closePath();
                const group = new THREE.Group();
                const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .018, bevelEnabled: true, bevelSegments: 1, bevelSize: .004, bevelThickness: .003, curveSegments: 6 }), new THREE.MeshStandardMaterial({ color: appearance.fill, roughness: 1, metalness: 0 })); mesh.userData.cellId = node.id; group.add(mesh);
                const sprite = new THREE.Sprite(label(node.title, appearance.text, node.informationType || 'topic')); sprite.position.z = .04; sprite.scale.set(layout.width * scale * .94, layout.width * scale * .94 * 260 / 512, 1); group.add(sprite);
                const outlinePoints = points.map(p => new THREE.Vector3(p.x * layout.width * scale * .55, -p.y * layout.height * scale * .55, -.003));
                const outline = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(outlinePoints), new THREE.LineBasicMaterial({ color: 0x315438 })); group.add(outline);
                const growHandle = new THREE.Mesh(new THREE.CircleGeometry(.024, 20), new THREE.MeshBasicMaterial({ color: 0xfffdf2 })); growHandle.position.set(layout.width * scale / 2 + .026, layout.height * scale * .15, .06); growHandle.userData.growCellId = node.id; group.add(growHandle);
                const growLabel = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.011, 0, 0), new THREE.Vector3(.011, 0, 0), new THREE.Vector3(0, -.011, 0), new THREE.Vector3(0, .011, 0)]), new THREE.LineBasicMaterial({ color: 0x365e47 })); growLabel.position.copy(growHandle.position).add(new THREE.Vector3(0, 0, .002)); group.add(growLabel);
                cellLayer.add(group); entry = { group, mesh, outline, signature, growHandle, growLabel }; cells.set(node.id, entry);
            }
            entry.group.position.copy(localPoint(layout)); entry.group.scale.setScalar(1); entry.outline.visible = node.id === api.getSelected(); entry.growHandle.visible = entry.growLabel.visible = node.id === api.getSelected(); entry.mesh.material.emissive.set(0); graphTargets.push(entry.mesh); if (entry.growHandle.visible) graphTargets.push(entry.growHandle);
        }
        for (const edge of visualGraph.edges) {
            const signature = JSON.stringify([edge.kind, edge.label]); let entry = links.get(edge.id);
            if (!entry || entry.signature !== signature) {
                if (entry) { entry.line.geometry.dispose(); entry.line.material.dispose(); entry.line.removeFromParent(); if (entry.label) { entry.label.material.map.dispose(); entry.label.material.dispose(); entry.label.removeFromParent(); } }
                const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(99), 3));
                const line = new THREE.Line(geometry, edge.kind === 'relationship' ? new THREE.LineDashedMaterial({ color: 0xa08c6a, dashSize: .012, gapSize: .012 }) : new THREE.LineBasicMaterial({ color: 0x819974 })); line.userData.edgeId = edge.id; linkLayer.add(line);
                let sprite; if (edge.label) { sprite = new THREE.Sprite(label(edge.label, '#38523b', '', true)); sprite.scale.set(.36, .063, 1); linkLayer.add(sprite); }
                entry = { line, label: sprite, signature }; links.set(edge.id, entry);
            }
            entry.line.material.color.set(edge.id === api.getSelectedEdge() ? 0x854f36 : edge.kind === 'relationship' ? 0xa08c6a : 0x819974); graphTargets.push(entry.line); updateLine(edge, visualGraph);
        }
        rebuildPending = false; refreshPanels();
    }
    function panel(name, width, height, x, y, z = .07, pixels = 1000) { const result = createPimoXRPanel({ name, width, height, pixels }); result.mesh.position.set(x, y, z); board.add(result.mesh); panels.set(name, result); return result; }
    const dock = panel('tools', 2.45, .22, .34, -.77, .09, 1800), inspector = panel('inspector', .7, 1.04, 1.33, -.02, .06, 900), heading = panel('heading', 1.8, .16, 0, .72, .06, 1500), keyboard = panel('keyboard', 1.88, .64, .05, -.55, .35, 1600);
    keyboard.mesh.visible = false;
    const wristPanels={};
    for(const side of ['left','right']){
        const controls=createPimoXRPanel({name:'wrist-'+side,width:.18,height:.22,pixels:600,glass:true}),toggle=createPimoXRPanel({name:'wrist-toggle-'+side,width:.044,height:.044,pixels:240,glass:true});
        for(const p of [controls,toggle]){scene.add(p.mesh);panels.set(p.mesh.name,p);p.mesh.visible=false;p.mesh.userData.wristHand=side;}
        wristPanels[side]={controls,toggle};
    }
    function renderPimoWrists(){
        for(const side of ['left','right']){
            const {controls,toggle}=wristPanels[side];
            toggle.render(({button})=>button('wrist:'+side,'',12,12,216,216,{symbol:wristOpened[side]?'close':side==='left'?'settings':'tools',label:false}));
            controls.render(({text,button})=>{
                text(side==='left'?'General settings':'Current PIMO task',24,20,{size:29,width:550,weight:650});
                const history=api.getHistory(),node=work.selected();
                const entries=side==='left'?[{id:'fit',title:'Recenter',symbol:'fit'},{id:'sound',title:soundOn?'Audio on':'Audio off',symbol:soundOn?'volume':'mute'},
                    {id:'input:controllers',title:'Controllers',symbol:'controller',active:pimoInputPreference==='controllers'},{id:'input:hands',title:'Hands',symbol:'hand',active:pimoInputPreference==='hands'},
                    {id:'input:auto',title:'Auto input',symbol:'check',active:pimoInputPreference==='auto'},{id:'exit',title:'Exit XR',symbol:'close'}]
                    :work.state.edit?[{id:'save-edit',title:'Apply text',symbol:'check'},{id:'cancel-edit',title:'Cancel text',symbol:'close'}]
                    :[{id:'mode:select',title:'Move cell',symbol:'select',active:work.state.mode==='select'},{id:'grow-child',title:'Grow cell',symbol:'plus'},
                        {id:'connect-selected',title:'Connect',symbol:'link',disabled:!node},{id:'details',title:'Cell details',symbol:'panel'},
                        {id:'undo',title:'Undo',symbol:'undo',disabled:!history.undo},{id:'snap',title:snapEnabled?'Snap on':'Snap off',symbol:'arrange',active:snapEnabled}];
                entries.forEach((item,i)=>button(item.id,item.title,24+(i%2)*284,84+Math.floor(i/2)*146,266,128,{...item,small:true,label:!['fit','sound','exit','undo'].includes(item.id)}));
                text(side==='left'?'Left wrist · device and workspace':'Right wrist · selection and editing',24,570,{size:22,width:550,lines:2});
            });
        }
    }
    function updatePimoWrists(){
        const head=session?renderer.xr.getCamera(camera):camera;head.updateWorldMatrix(true,false);
        for(const side of ['left','right']){
            const source=controllers.find(c=>c.userData.source?.handedness===side),input=source?.userData.source;
            const anchor=input?.hand?source?.userData.hand?.joints?.wrist:source?.userData.grip;
            const visible=Boolean(session&&source?.visible&&anchor?.visible);
            const {controls,toggle}=wristPanels[side];toggle.mesh.visible=visible;controls.mesh.visible=visible&&wristOpened[side];if(!visible)continue;
            anchor.updateWorldMatrix(true,false);const pose=welcomeWristPose(anchor.matrixWorld.elements,{anchorHand:side,controllerMounted:!input.hand,width:.18,height:733,centerOffset:{x:0,y:0}},null,head.matrixWorld.elements);
            const basis=new THREE.Matrix4().makeBasis(pose.right,pose.up,pose.normal);
            toggle.mesh.position.copy(pose.center);toggle.mesh.quaternion.setFromRotationMatrix(basis);
            controls.mesh.position.copy(pose.center).addScaledVector(pose.up,-.145);controls.mesh.quaternion.copy(toggle.mesh.quaternion);controls.mesh.updateWorldMatrix(true,false);toggle.mesh.updateWorldMatrix(true,false);
        }
    }
    function renderHeading() {
        const graph = api.getGraph();
        heading.render(({ text, button }) => { text(graph.identity.title, 28, 18, { size: 34, width: 1230, weight: 650 }); text(hoverHint || `${graph.nodes.length} cells  /  ${graph.edges.length} connections  ·  ${api.isSaved() ? 'Saved on this device' : 'Storage unavailable — export in Desktop Studio'}`, 28, 69, { size: 22, width: 1360 }); button('edit:mapTitle', 'Rename map', 1378, 20, 88, 88, { symbol: 'draw' }); });
    }
    function refreshPanels() {
        if (disposed) return;
        const graph = api.getGraph(), node = work.selected(), edge = work.edge(), history = api.getHistory();
        inspector.mesh.visible = menuOpen; dock.mesh.visible = !work.state.edit; keyboard.mesh.visible = !!work.state.edit;
        renderHeading();renderPimoWrists();
        dock.render(({ text, button }) => {
            const items = [...Object.entries(modes).map(([id, [symbol, title]]) => ({ id: `mode:${id}`, symbol, title, active: work.state.mode === id })), { id: 'undo', symbol: 'undo', title: 'Undo', disabled: !history.undo }, { id: 'redo', symbol: 'redo', title: 'Redo', disabled: !history.redo }, { id: 'menu', symbol: 'panel', title: 'Show / hide details', active: menuOpen }, { id: 'fit', symbol: 'fit', title: 'Fit map and recenter' }, { id: 'smaller', symbol: 'minus', title: 'Smaller workspace' }, { id: 'larger', symbol: 'plus', title: 'Larger workspace' }, { id: 'snap', symbol: 'arrange', title: 'Gentle alignment on placement', active: snapEnabled }, { id: 'sound', symbol: soundOn ? 'volume' : 'mute', title: 'Creation sound', active: soundOn }, { id: 'exit', symbol: 'close', title: 'Exit XR editor' }];
            text(work.state.status, 25, 13, { size: 25, width: 1730 }); items.forEach((item, i) => button(item.id, item.title, 25 + i * 135, 57, 121, 86, item));
        });
        inspector.render(({ text, button, muted }) => {
            const tabs = [['cell', 'panel', 'Cell details'], ['style', 'flower', 'Design and templates'], ['library', 'library', 'Saved maps'], ['help', 'spark', 'XR controls']];
            tabs.forEach(([id, symbol, title], i) => button(`page:${id}`, title, 30 + i * 214, 26, 194, 76, { symbol, active: work.state.page === id }));
            let y = 133; const title = value => { text(value, 32, y, { size: 38, weight: 650, width: 830 }); y += 65; }; const row = (id, value, height = 75) => { button(id, value, 32, y, 836, height); y += height + 17; };
            if (work.state.page === 'style') {
                title('Shape your knowledge'); text('DESIGN', 32, y, { size: 23, color: muted }); y += 40;
                for (const design of PIMO_DESIGNS) { button(`design:${design.id}`, design.title, 32, y, 836, 70, { symbol: design.icon, label: true, active: (graph.layout.design || 'organic') === design.id }); y += 84; }
                text('NEW MAP FROM A TEMPLATE', 32, y + 12, { size: 23, color: muted }); y += 62;
                PIMO_TEMPLATES.forEach((template, i) => button(`template:${template.id}`, template.title, 32 + (i % 2) * 428, y + Math.floor(i / 2) * 105, 408, 90, { small: true }));
                text('Your current map stays in Saved maps.', 32, y + 337, { size: 24, color: muted, width: 820, lines: 2 });
                button('arrange', 'Arrange branches', 32, y + 420, 836, 82);
                return;
            }
            if (work.state.page === 'library') {
                title('Your knowledge gardens'); text('Saved in this browser · no account sync yet', 32, y, { size: 25, color: muted, width: 830 }); y += 65;
                const maps = api.getMaps(); panelPage = Math.min(panelPage, Math.max(0, Math.ceil(maps.length / 7) - 1));
                maps.slice(panelPage * 7, panelPage * 7 + 7).forEach(item => { button(`load:${item.id}`, `${item.title} · ${item.cells}`, 32, y, 836, 94, { active: item.id === graph.id }); y += 112; });
                button('maps:prev', 'Previous maps', 32, 1100, 120, 82, { symbol: 'arrow', disabled: !panelPage }); button('maps:next', 'Next maps', 180, 1100, 120, 82, { symbol: 'plus', disabled: (panelPage + 1) * 7 >= maps.length }); button('save', 'Save now', 340, 1100, 528, 82);
                return;
            }
            if (work.state.page === 'help') {
                title('Make room for ideas');
                for (const [a, b] of [['GRAB + PLACE', 'Point and hold trigger or grip. Reach in and pinch to pick up a nearby cell. Release to place.'], ['GROW / DRAW', 'Plant a child or sketch a custom cell.'], ['CONNECT', 'Choose two cells, or draw between them.'], ['GRIP EMPTY SPACE', 'Move the whole workspace. Use both grips to resize and turn.'], ['RIGHT STICK CLICK', 'Show or hide this panel.'], ['TEXT', 'Floating keyboard. Optional voice.'], ['YOUR MAP', 'Saved locally. Export in Desktop Studio to transfer devices.']]) { text(a, 32, y, { size: 24, color: muted, weight: 650 }); text(b, 32, y + 37, { size: 29, width: 825, lines: 3 }); y += a === 'GRAB + PLACE' || a === 'GRIP EMPTY SPACE' ? 165 : 125; }
                return;
            }
            if (edge) {
                title('A living connection');
                const from = graph.nodes.find(item => item.id === edge.from), to = graph.nodes.find(item => item.id === edge.to);
                text(`${from?.title} → ${to?.title}`, 32, y, { size: 30, width: 830, lines: 3 }); y += 135;
                row('edit:label', edge.label || 'Name this connection');
                button('kind:relationship', 'Relationship', 32, y, 407, 84, { active: edge.kind === 'relationship' }); button('kind:branch', 'Branch', 460, y, 408, 84, { active: edge.kind === 'branch' }); y += 112;
                text('Branches have one parent. Relationships can connect freely.', 32, y, { size: 27, color: muted, width: 820, lines: 3 }); y += 170;
                row('straighten', 'Reset drawn route'); row('remove', deletePending === edge.id ? 'Remove connection? Select again' : 'Remove connection'); return;
            }
            if (!node) { title('What will grow here?'); text('Select a cell or plant a new idea.', 32, y, { size: 31, width: 820, lines: 3 }); y += 140; row('new', 'Plant an idea'); row('page:style', 'Explore starter templates'); return; }
            title('Cell details'); row('edit:title', node.title, 94); row('edit:body', node.body ? node.body.replace(/\n/g, ' ') : 'Add a note…', 104);
            const layout = graph.layout.nodes[node.id];
            PIMO_COLORS.forEach((color, i) => button(`color:${color}`, ['Moss', 'Clay', 'Water', 'Ochre', 'Stone', 'Forest'][i], 32 + i * 141, y, 124, 66, { color, active: layout.color === color, small: true })); y += 88;
            [['hexagon', 'hexagon'], ['square', 'square'], ['organic', 'organic'], ['round', 'circle']].forEach(([id, symbol], i) => button(`shape:${id}`, `${id} cell`, 32 + i * 214, y, 194, 72, { symbol, active: layout.shape === id })); y += 94;
            row('grow-child', 'Grow a branch');
            const suggestions = work.suggestions().slice(0, 2); suggestions.forEach((value, i) => { button(`suggest:${i}`, value, 32, y, 836, 68, { small: true }); y += 80; });
            button('copy', 'Duplicate cell', 32, y, 180, 72, { symbol: 'copy' }); button('connect-selected', 'Connect this cell', 247, y, 180, 72, { symbol: 'link' }); button('details', 'Sources & content type', 462, y, 180, 72, { symbol: 'notes' }); button('remove', deletePending === node.id ? 'Confirm removal' : 'Remove cell', 677, y, 190, 72, { symbol: deletePending === node.id ? 'close' : 'delete', active: deletePending === node.id });
            if (deletePending === node.id) text('Select remove again. Undo restores it.', 32, y + 90, { size: 25, width: 820 });
        });
        if (work.state.page === 'details' && node) inspector.render(({ text, button, muted }) => {
            text('Sources & content type', 32, 35, { size: 35, weight: 650 }); button('page:cell', 'Back to cell', 748, 20, 110, 78, { symbol: 'arrow' });
            button('edit:sourceUrl', node.sourceUrl || 'Add source link', 32, 150, 836, 100); button('edit:attribution', node.attribution || 'Add attribution', 32, 274, 836, 100);
            text('CONTENT TYPE', 32, 430, { size: 23, color: muted }); ['topic', 'fact', 'local_observation', 'practice', 'story', 'question', 'guidance', 'traditional_knowledge'].forEach((type, i) => button(`type:${type}`, type.replaceAll('_', ' '), 32 + (i % 2) * 428, 488 + Math.floor(i / 2) * 98, 408, 82, { active: node.informationType === type, small: true }));
            text(`${node.sourceIds?.length || 0} existing source references. Imported provenance stays with this cell. New content remains a draft.`, 32, 940, { size: 27, width: 820, color: muted, lines: 5 });
        });
        renderKeyboard();
    }
    function renderKeyboard() {
        if (!work.state.edit) return;
        keyboard.render(({ text, button, width }) => {
            const edit = work.state.edit; if (!edit) return; text(fields[edit.field], 25, 14, { size: 25, weight: 650, width: 850 }); text(`${edit.value.length} / ${edit.limit}`, 1120, 17, { size: 22 });
            button('cancel-edit', 'Cancel edit', 1310, 10, 98, 62, { symbol: 'close' }); button('save-edit', 'Apply', 1430, 10, 145, 62, { active: true, small: true });
            const before = edit.value.slice(0, edit.caret), excerpt = `${before.slice(-85)}│${edit.value.slice(edit.caret, edit.caret + 50)}`;
            text(excerpt || '│', 28, 85, { size: 28, width: width - 56, lines: 2 });
            const rows = work.state.symbols ? ['1234567890', '@#£$%&*()=', ':/.-_?!,+;'] : ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
            rows.forEach((row, r) => { const keys = [...row], w = 142, start = (width - keys.length * 150 + 8) / 2; keys.forEach((key, i) => button(`key:${key}`, work.state.shift ? key.toUpperCase() : key, start + i * 150, 180 + r * 86, w, 74)); });
            const y = 446; button('key:symbols', work.state.symbols ? 'ABC' : '123 / #', 25, y, 150, 72, { small: true }); button('key:shift', 'Shift', 188, y, 150, 72, { active: work.state.shift, small: true }); button('key:left', '←', 351, y, 86, 72); button('key:space', 'Space', 450, y, 435, 72); button('key:right', '→', 898, y, 86, 72); button('key:backspace', '⌫', 997, y, 150, 72); button('voice', speech ? 'Listening…' : 'Dictate', 1160, y, 150, 72, { symbol: 'mic', active: !!speech }); button('key:newline', '↵', 1323, y, 110, 72); button('key:clear', 'Clear', 1446, y, 129, 72, { small: true });
        });
    }
    function setMode(mode) { work.state.mode = mode; selectedSource = ''; deletePending = ''; root.querySelectorAll('[data-spatial][aria-pressed]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.spatial === mode))); notice({ select: 'Select a cell to edit. Hold trigger / pinch to move it.', grow: 'Point at a cell to grow a child, or at empty space to plant an idea.', connect: 'Choose the first cell, then another. You can draw the connection.', draw: 'Hold trigger / pinch and draw a closed shape.' }[mode]); refreshPanels(); }
    async function voice() {
        if (speech) { speech.stop(); return; }
        const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Recognition) { notice('Voice unavailable here. The floating keyboard is ready.'); refreshPanels(); return; }
        if (!work.state.edit) work.beginEdit('title'); if (!work.state.edit) return;
        const draft = work.state.edit; speech = new Recognition(); speech.lang = 'en-AU'; speech.interimResults = false;
        speech.onresult = event => { if (work.state.edit === draft) work.key(event.results[0][0].transcript); renderKeyboard(); };
        speech.onerror = () => { notice('Voice did not connect. Continue with the floating keyboard.'); refreshPanels(); };
        speech.onend = () => { speech = null; renderKeyboard(); };
        try { speech.start(); } catch { speech = null; notice('Voice unavailable. Continue typing.'); } renderKeyboard();
    }
    function activate(id, controller) {
        if (!id) return; const [kind, ...parts] = id.split(':'), value = parts.join(':');
        if(kind==='wrist'){wristOpened[value]=!wristOpened[value];renderPimoWrists();updatePimoWrists();return;}
        if(kind==='input'){pimoInputPreference=value;notice(value==='hands'?'Hands selected. Put controllers down to use tracking.':value==='controllers'?'Standard controllers selected.':'Input switches with tracking.');renderPimoWrists();return;}
        if (kind === 'key') { work.key(value); renderKeyboard(); feedback(controller); return; }
        if ((gestures.size || grips.size) && !['sound', 'snap'].includes(id)) cancelGestures();
        if (work.state.edit && !['save-edit', 'cancel-edit', 'voice', 'undo', 'redo', 'exit'].includes(id)) { notice('Apply or cancel your text edit first.'); return; }
        const confirmation = work.edge()?.id || work.selected()?.id;
        if (id !== 'remove') deletePending = '';
        if (kind === 'mode') setMode(value);
        else if (kind === 'page') { work.state.page = value; menuOpen = true; }
        else if (kind === 'edit') { work.beginEdit(value); }
        else if (kind === 'design') { work.design(value); rebuild(true); }
        else if (kind === 'template') { work.template(value); selectedSource = ''; rebuild(true); }
        else if (kind === 'load') { api.onLoadMap(value); work.state.page = 'cell'; selectedSource = ''; notice('Map loaded. Saved on this device.'); rebuild(true); }
        else if (kind === 'color' || kind === 'shape' || kind === 'type' || kind === 'kind') work.update(kind === 'type' ? 'informationType' : kind, value);
        else if (kind === 'suggest') work.grow(work.suggestions()[+value]);
        else if (id === 'save-edit') { if (work.saveEdit()) { speech?.abort(); feedback(controller, true); } }
        else if (id === 'cancel-edit') { speech?.abort(); work.cancelEdit(); }
        else if (id === 'grow-child' || id === 'new') { const cell = work.grow('New idea', undefined, id === 'new' ? '' : api.getSelected()); if (cell) work.beginEdit('title'); menuOpen = true; }
        else if (id === 'copy') work.duplicate();
        else if (id === 'arrange') { work.arrange(); rebuild(true); }
        else if (id === 'connect-selected') { const from = api.getSelected(); setMode('connect'); selectedSource = from; notice('Choose another cell to connect.'); }
        else if (id === 'straighten') { const next = structuredClone(api.getGraph()); next.edges.find(item => item.id === api.getSelectedEdge()).waypoints = []; api.onCommit(next); }
        else if (id === 'details') work.state.page = 'details';
        else if (id === 'remove') { if (deletePending === confirmation) { work.remove(); deletePending = ''; } else { deletePending = confirmation; notice('Select remove again to confirm. Undo can restore it.'); } }
        else if (id === 'undo' || id === 'redo') { work.history(id); selectedSource = ''; }
        else if (id === 'menu') menuOpen = !menuOpen;
        else if (id === 'fit' || id === 'recenter') { cancelGestures(); rebuild(true); recenter(); }
        else if (id === 'smaller' || id === 'larger') board.scale.setScalar(THREE.MathUtils.clamp(board.scale.x * (id === 'larger' ? 1.12 : 1 / 1.12), .45, 1.7));
        else if (id === 'sound') { soundOn = !soundOn; cues.setEnabled(soundOn); }
        else if (id === 'snap') snapEnabled = !snapEnabled;
        else if (id === 'voice') void voice();
        else if (id === 'save') notice(api.onSave() ? 'Saved on this device.' : 'Storage unavailable. Exit to Desktop Studio and export JSON.');
        else if (id === 'maps') work.state.page = 'library';
        else if (kind === 'maps') panelPage += value === 'next' ? 1 : -1;
        else if (id === 'exit') { if (session) void session.end(); else void destroy(); return; }
        refreshPanels(); if (id !== 'save-edit') { const special = kind === 'template' || kind === 'suggest' || id === 'grow-child' || id === 'new'; feedback(controller, special ? 'grow' : 'tap'); if (special) landing(api.getSelected(), true); }
    }
    function projectRay() { board.updateMatrixWorld(true); const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(board.quaternion); plane.setFromNormalAndCoplanarPoint(normal, board.position); if (!raycaster.ray.intersectPlane(plane, intersection)) return null; const local = board.worldToLocal(intersection.clone()); return { x: local.x / scale + centre.x, y: -local.y / scale + centre.y }; }
    function controllerRay(controller) { controller.updateWorldMatrix(true, false); rotation.extractRotation(controller.matrixWorld); raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld); raycaster.ray.direction.set(0, 0, -1).applyMatrix4(rotation).normalize(); }
    function desktopRay(event) { const box = renderer.domElement.getBoundingClientRect(); pointer.set((event.clientX - box.left) / box.width * 2 - 1, -(event.clientY - box.top) / box.height * 2 + 1); raycaster.setFromCamera(pointer, camera); }
    function hit(excludeHand='') { board.updateMatrixWorld(true); const targets = [...panels.values()].filter(panel => panel.mesh.visible && (!excludeHand || panel.mesh.userData.wristHand!==excludeHand)).map(panel => panel.mesh).concat(graphTargets); return raycaster.intersectObjects(targets, false)[0] || null; }
    function handPosition(controller) {
        const hand = controller.userData.hand, index = hand?.joints?.['index-finger-tip'], thumb = hand?.joints?.['thumb-tip'];
        if (controller.userData.source?.hand && index?.visible && thumb?.visible) return index.getWorldPosition(new THREE.Vector3()).add(thumb.getWorldPosition(new THREE.Vector3())).multiplyScalar(.5);
        return gripPosition(controller);
    }
    function graphPosition(world) { const local = board.worldToLocal(world.clone()); return { x: local.x / scale + centre.x, y: -local.y / scale + centre.y, z: local.z }; }
    function inputHit(controller) {
        board.updateMatrixWorld(true); const world = handPosition(controller);
        // Pinch at the actual surface. Distant input continues to use the tracked ray.
        for (const panel of [...panels.values()].reverse()) {
            if (!panel.mesh.visible || panel.mesh.userData.wristHand===controller.userData.source?.handedness) continue;
            const local = panel.mesh.worldToLocal(world.clone()), dimensions = panel.mesh.geometry.parameters;
            if (Math.abs(local.z) * board.scale.x < .05 && Math.abs(local.x) < dimensions.width / 2 && Math.abs(local.y) < dimensions.height / 2) return { object: panel.mesh, uv: new THREE.Vector2(local.x / dimensions.width + .5, local.y / dimensions.height + .5), point: world, distance: .05, near: true };
        }
        const point = graphPosition(world);
        if (Math.abs(point.z - .03) * board.scale.x < .13) for (const node of [...api.getGraph().nodes].reverse()) {
            const layout = visualGraph.layout.nodes[node.id]; if (layout && pimoPointInCell(layout, point)) return { object: cells.get(node.id).mesh, point: world, graphPoint: point, distance: .05, near: true };
        }
        return hit(controller.userData.source?.handedness);
    }
    function gesturePoint(controller, gesture) { return gesture?.direct ? graphPosition(handPosition(controller)) : projectRay(); }
    function begin(intersect, point, controller) {
        if (intersect?.object.userData.panel) { const p = panels.get(intersect.object.userData.panel); activate(p.hit(intersect)?.id, controller); return null; }
        if (work.state.edit) return null;
        if (intersect?.object.userData.growCellId) { api.onSelect(intersect.object.userData.growCellId); activate('grow-child', controller); return null; }
        const id = intersect?.object.userData.cellId, edgeId = intersect?.object.userData.edgeId;
        if (edgeId && work.state.mode === 'select') { api.onSelect('', edgeId); work.state.page = 'cell'; menuOpen = true; deletePending = ''; refreshPanels(); feedback(controller); return null; }
        if (!point) return null;
        if (work.state.mode === 'grow') { const added = work.grow('New idea', id ? undefined : point, id || ''); setMode('select'); if (added) { work.beginEdit('title'); landing(added, true); } menuOpen = true; refreshPanels(); feedback(controller, added ? 'grow' : 'error'); return null; }
        if (work.state.mode === 'draw') { if ([...gestures.values()].some(g => g.type !== 'move')) return null; return { type: 'draw', points: [point] }; }
        if (work.state.mode === 'connect') {
            if (selectedSource && id && id !== selectedSource) { const from = selectedSource, connected = work.connect(from, id); selectedSource = ''; work.state.page = 'cell'; menuOpen = true; if (connected) { work.beginEdit('label'); landing(from, true); landing(id, true); } refreshPanels(); feedback(controller, connected ? 'connect' : 'error'); return null; }
            if (id) { selectedSource = id; api.onSelect(id); refreshPanels(); feedback(controller); return { type: 'connect', id, points: [point] }; } return null;
        }
        if (id) {
            const source = controller || 'pointer'; if (!ownership.acquire(id, source)) { feedback(controller, 'error'); return null; }
            const position = api.getGraph().layout.nodes[id]; api.onSelect(id); work.state.page = 'cell'; menuOpen = true; deletePending = ''; notice('Cell in hand · release to place.'); refreshPanels(); feedback(controller, 'grab');
            const entry = cells.get(id); if (entry) { entry.group.position.z = .075; entry.group.scale.setScalar(1.045); entry.mesh.material.emissive.set(0x142713); }
            return { type: 'move', id, start: point, offset: { x: point.x - position.x, y: point.y - position.y }, last: { x: position.x, y: position.y }, moved: false, ghost: makeGhost(id), controller, direct: !!intersect?.near, depthOffset: (point.z || 0) - .075, snapped: false, snapKey: '' };
        }
        return null;
    }
    function move(gesture, point) {
        if (!gesture || !point) return;
        if (gesture.type === 'move') {
            gesture.moved ||= Math.hypot(point.x - gesture.start.x, point.y - gesture.start.y) > 5;
            const raw = { x: point.x - gesture.offset.x, y: point.y - gesture.offset.y }, candidate = pimoPlacement(visualGraph, gesture.id, raw, { enabled: snapEnabled });
            gesture.last = { x: candidate.x, y: candidate.y }; gesture.snapped = candidate.snapped;
            const snapKey = candidate.snapKey || ''; if (snapKey && snapKey !== gesture.snapKey && performance.now() - (gesture.snapTime || 0) > 180) { feedback(gesture.controller, 'tap'); gesture.snapTime = performance.now(); } gesture.snapKey = snapKey;
            const layout = visualGraph.layout.nodes[gesture.id]; if (!layout) return; Object.assign(layout, gesture.last);
            const group = cells.get(gesture.id)?.group; group?.position.copy(localPoint(raw)).setZ(gesture.direct ? THREE.MathUtils.clamp(point.z - gesture.depthOffset, .05, .45) : .075);
            gesture.ghost.visible = gesture.moved; gesture.ghost.position.copy(localPoint(candidate)).setZ(.035); gesture.ghost.material.color.set(candidate.snapped ? 0x966f38 : 0x527345);
            visualGraph.edges.filter(edge => edge.from === gesture.id || edge.to === gesture.id).forEach(edge => updateLine(edge, visualGraph));
        }
        else if (gesture.points.length < 220 && Math.hypot(point.x - gesture.points.at(-1).x, point.y - gesture.points.at(-1).y) > 7) { gesture.points.push(point); previewPoints = gesture.points; const buffer = preview.geometry.attributes.position; previewPoints.forEach((p, i) => { const v = localPoint(p); buffer.setXYZ(i, v.x, v.y, .06); }); buffer.needsUpdate = true; preview.geometry.setDrawRange(0, previewPoints.length); preview.visible = true; }
    }
    function finish(gesture, intersect, controller) {
        preview.visible = false; if (!gesture) return; discardGhost(gesture); ownership.release(controller || 'pointer');
        if (gesture.type === 'move') {
            const entry = cells.get(gesture.id), layout = api.getGraph().layout.nodes[gesture.id];
            if (entry && layout) { entry.group.position.copy(localPoint(gesture.moved ? gesture.last : layout)); entry.group.scale.setScalar(1); entry.mesh.material.emissive.set(0); }
            if (gesture.moved) { const ok = api.onMove(gesture.id, gesture.last); feedback(controller, ok ? gesture.snapped ? 'snap' : 'place' : 'error'); if (ok) { landing(gesture.id, gesture.snapped); notice(gesture.snapped ? 'Placed and aligned. Saved.' : 'Placed. Saved.'); } }
            else notice('Ready to grow · choose a tool or grab another cell.');
            refreshPanels();
        }
        if (gesture.type === 'draw') { const id = gesture.points.length > 3 ? api.onDraw(gesture.points) : ''; if (id) { setMode('select'); work.beginEdit('title'); menuOpen = true; landing(id, true); } else notice('Draw a little larger, then release to create a cell.'); refreshPanels(); feedback(controller, id ? 'grow' : 'error'); }
        const to = intersect?.object.userData.cellId;
        if (gesture.type === 'connect' && to && to !== gesture.id) { const id = work.connect(gesture.id, to, gesture.points.length > 4 ? gesture.points.slice(1, -1) : []); selectedSource = ''; if (id) { work.beginEdit('label'); landing(gesture.id, true); landing(to, true); } menuOpen = true; refreshPanels(); feedback(controller, id ? 'connect' : 'error'); }
    }
    function cancelGestures() { for (const gesture of gestures.values()) discardGhost(gesture); discardGhost(pointerGesture); gestures.clear(); ownership.clear(); grips.clear(); grabBase = null; pointerGesture = null; selectedSource = ''; preview.visible = false; sourceHover.clear(); hoverHint = ''; latch.reset(); rebuildPending = false; rebuild(); }
    function recenter() {
        board.scale.setScalar(1);
        if (session) { const head = renderer.xr.getCamera(), position = new THREE.Vector3(), direction = new THREE.Vector3(); head.getWorldPosition(position); head.getWorldDirection(direction); direction.y = 0; direction.normalize(); board.position.copy(position).addScaledVector(direction, 1.65); board.position.y = position.y - .06; board.rotation.set(0, Math.atan2(-direction.x, -direction.z), 0); }
        else { board.position.set(0, 1.3, 0); board.rotation.set(0, 0, 0); camera.position.set(.35, 1.3, Math.max(3.1, 2.5 / camera.aspect)); camera.lookAt(.35, 1.3, 0); }
    }
    function gripPosition(controller) { return controller.userData.grip.getWorldPosition(new THREE.Vector3()); }
    function resetGrab() { const active = [...grips.keys()]; if (!active.length) { grabBase = null; return; } const a = gripPosition(active[0]), b = active[1] ? gripPosition(active[1]) : a; grabBase = { position: board.position.clone(), rotation: board.rotation.y, scale: board.scale.x, midpoint: a.clone().add(b).multiplyScalar(.5), distance: a.distanceTo(b), angle: Math.atan2(b.z - a.z, b.x - a.x) }; }
    function updateGrab() {
        if (!grabBase) return; const active = [...grips.keys()], a = gripPosition(active[0]), b = active[1] ? gripPosition(active[1]) : a, midpoint = a.clone().add(b).multiplyScalar(.5); let factor = 1, yaw = 0;
        if (active.length > 1 && grabBase.distance > .06) { factor = THREE.MathUtils.clamp(a.distanceTo(b) / grabBase.distance, .45 / grabBase.scale, 1.7 / grabBase.scale); yaw = grabBase.angle - Math.atan2(b.z - a.z, b.x - a.x); }
        board.position.copy(grabBase.position).sub(grabBase.midpoint).multiplyScalar(factor).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(midpoint); board.rotation.y = grabBase.rotation + yaw; board.scale.setScalar(grabBase.scale * factor);
    }
    function hover(intersect, source = 'pointer') {
        const next = intersect?.object.userData.cellId || '';
        const panelName = intersect?.object.userData.panel, button = panelName ? panels.get(panelName).hit(intersect) : null;
        sourceHover.set(source, { panelName, id: button?.id, title: button?.title, cellId: next });
        const activeCells = new Set([...sourceHover.values()].map(item => item.cellId).filter(Boolean));
        for (const id of hoveredCells) if (!activeCells.has(id)) cells.get(id)?.mesh.material.emissive.set(0);
        for (const id of activeCells) if (!hoveredCells.has(id)) cells.get(id)?.mesh.material.emissive.set(0x10220d);
        hoveredCells.clear(); for (const id of activeCells) hoveredCells.add(id);
        for (const [name, panel] of panels) panel.hover([...sourceHover.values()].find(item => item.panelName === name && item.id)?.id || '');
        const hint = button?.title || (intersect?.object.userData.growCellId ? 'Grow a branch' : next ? 'Hold trigger, grip or pinch · release to place' : '') || [...sourceHover.values()].find(item => item.title)?.title || ''; if (hint !== hoverHint) { hoverHint = hint; renderHeading(); }
        if (button) { root.querySelector('[data-spatial-notice]').textContent = button.title; root.setAttribute('aria-description', button.title); }
        renderer.domElement.style.cursor = next || button ? 'pointer' : 'default';
    }
    const inputAllowed=source=>!source || (pimoInputPreference==='controllers'?!source.hand:pimoInputPreference==='hands'&&!source.hand?!controllers.some(c=>c.visible&&c.userData.source?.hand):true);
    for (let i = 0; i < 2; i++) {
        const controller = renderer.xr.getController(i), grip = renderer.xr.getControllerGrip(i); scene.add(controller, grip); controllers.push(controller); controller.userData.grip = grip;
        const hand = renderer.xr.getHand(i), joints = new THREE.InstancedMesh(new THREE.SphereGeometry(.007, 6, 4), new THREE.MeshStandardMaterial({ color: 0x91a888, roughness: 1 }), 25); joints.visible = false; joints.frustumCulled = false; scene.add(hand, joints); controller.userData.hand = hand; hands.push({ hand, joints, transform: new THREE.Matrix4(), position: new THREE.Vector3(), quaternion: new THREE.Quaternion(), scale: new THREE.Vector3(1, 1, 1) });
        const ray = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0x789764, transparent: true, opacity: .65 })); ray.scale.z = 2; controller.add(ray); controller.userData.ray = ray;
        const reticle = new THREE.Mesh(reticleGeometry, reticleMaterial); reticle.visible = false; scene.add(reticle); controller.userData.reticle = reticle;
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(.014, .02, .065, 8), new THREE.MeshStandardMaterial({ color: 0x507869, roughness: 1 })); handle.rotation.x = Math.PI / 2; grip.add(handle);
        controller.addEventListener('connected', event => { controller.userData.source = event.data; handle.visible = !event.data.hand; latch.reset(); });
        controller.addEventListener('disconnected', () => { controller.userData.source = null; sourceHover.delete(controller); reticle.visible = false; cancelGestures(); });
        controller.addEventListener('selectstart', () => {
            if (!inputAllowed(controller.userData.source) || grips.size || gestures.has(controller)) return; controllerRay(controller); const target = inputHit(controller), gesture = begin(target, target?.graphPoint || projectRay(), controller); if (gesture) { gesture.button = 'trigger'; gestures.set(controller, gesture); }
        });
        function release(button) {
            const gesture = gestures.get(controller); if (gesture?.button !== button) return;
            controllerRay(controller); move(gesture, gesturePoint(controller, gesture)); const target = inputHit(controller); gestures.delete(controller); finish(gesture, target, controller); if (rebuildPending && !gestures.size) rebuild();
        }
        controller.addEventListener('selectend', () => release('trigger'));
        controller.addEventListener('squeezestart', () => {
            if (!inputAllowed(controller.userData.source) || controller.userData.source?.hand || work.state.edit || gestures.has(controller)) return;
            controllerRay(controller); const target = inputHit(controller);
            if (!grips.size && target?.object.userData.cellId) {
                const previous = work.state.mode; work.state.mode = 'select'; const gesture = begin(target, target.graphPoint || projectRay(), controller); work.state.mode = previous;
                if (gesture) { gesture.button = 'squeeze'; gestures.set(controller, gesture); } refreshPanels(); return;
            }
            if (gestures.size || target?.object.userData.panel) return;
            grips.set(controller, true); resetGrab(); feedback(controller, 'grab');
        });
        controller.addEventListener('squeezeend', () => { release('squeeze'); if (grips.has(controller)) { grips.delete(controller); resetGrab(); feedback(controller, 'place'); } });
    }
    renderer.domElement.addEventListener('pointerdown', event => { if (session || event.button > 0) return; desktopRay(event); const intersect = hit(); renderer.domElement.setPointerCapture(event.pointerId); pointerGesture = begin(intersect, projectRay()); if (!pointerGesture && !intersect && !work.state.edit) pointerGesture = { type: 'orbit', x: event.clientX, rotation: board.rotation.y }; }, { signal });
    renderer.domElement.addEventListener('pointermove', event => { if (session) return; desktopRay(event); if (pointerGesture?.type === 'orbit') { board.rotation.y = pointerGesture.rotation + (event.clientX - pointerGesture.x) * .003; return; } if (pointerGesture) move(pointerGesture, projectRay()); else hover(hit()); }, { signal });
    renderer.domElement.addEventListener('pointerup', event => { if (session) return; desktopRay(event); const gesture = pointerGesture; move(gesture?.type === 'orbit' ? null : gesture, projectRay()); pointerGesture = null; finish(gesture, hit()); if (rebuildPending) rebuild(); }, { signal });
    renderer.domElement.addEventListener('pointercancel', cancelGestures, { signal });
    renderer.domElement.addEventListener('wheel', event => { event.preventDefault(); if (!session) camera.position.z = THREE.MathUtils.clamp(camera.position.z + event.deltaY * .002, 1.4, 8); }, { signal, passive: false });
    root.addEventListener('click', event => { const button = event.target.closest('button'); if (!button) return; if (button.dataset.action === 'close') void destroy(); else if (button.dataset.spatial === 'enter') void enter(); else if (button.dataset.spatial in modes) setMode(button.dataset.spatial); else activate(button.dataset.spatial); }, { signal });
    window.addEventListener('keydown', event => {
        if (work.state.edit) { if (event.ctrlKey || event.metaKey || event.altKey) return; const keys = { Backspace: 'backspace', Delete: 'delete', ArrowLeft: 'left', ArrowRight: 'right', Home: 'home', End: 'end', Enter: 'newline' }; if (event.key === 'Escape') work.cancelEdit(); else if (event.key in keys || event.key.length === 1) { event.preventDefault(); work.key(keys[event.key] || event.key); } refreshPanels(); return; }
        if (event.key === 'Escape' && !session) void destroy();
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); work.history(event.shiftKey ? 'redo' : 'undo'); refreshPanels(); }
        if (event.key === 'Tab') { const buttons = [...root.querySelectorAll('button:not(:disabled)')]; if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1).focus(); } else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0].focus(); } }
    }, { signal });
    window.addEventListener('resize', () => { if (disposed) return; camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); if (!session) recenter(); }, { signal });
    window.addEventListener('blur', () => { cancelGestures(); speech?.abort(); }, { signal });
    rebuild(true); recenter();
    renderer.setAnimationLoop(() => {
        if (disposed) return;
        if (session && pendingRecenter) { pendingRecenter = false; recenter(); }
        if (session && session.visibilityState === 'visible') {
            updateGrab();updatePimoWrists();
            for (let i = 0; i < controllers.length; i++) {
                const controller = controllers[i], source = controller.userData.source; if (!source) continue;
                const directHandLost = gestures.get(controller)?.direct && source.hand && (!controller.userData.hand.joints?.['index-finger-tip']?.visible || !controller.userData.hand.joints?.['thumb-tip']?.visible);
                if (!controller.visible || directHandLost) { if (gestures.has(controller) || grips.has(controller)) cancelGestures(); sourceHover.delete(controller); controller.userData.reticle.visible = false; continue; }
                if (!source.hand && latch.poll(`${i}-stick`, source.gamepad?.buttons?.[3]?.pressed)) { if (!gestures.size && !grips.size) { wristOpened[source.handedness]=!wristOpened[source.handedness];renderPimoWrists();feedback(controller); } }
                if(pimoInputPreference==='controllers'&&source.hand || pimoInputPreference==='hands'&&!source.hand&&controllers.some(c=>c.visible&&c.userData.source?.hand))continue;
                controllerRay(controller); const intersect = inputHit(controller), gesture = gestures.get(controller); if (gesture && !grips.size) move(gesture, gesturePoint(controller, gesture)); else if (!grips.size) hover(intersect, controller);
                const ray = controller.userData.ray, reticle = controller.userData.reticle; ray.visible = !intersect?.near && !gesture?.direct; ray.scale.z = intersect ? intersect.distance : 2; reticle.visible = !!intersect && !intersect.near && !gesture;
                if (intersect) { reticle.position.copy(intersect.point); reticle.quaternion.copy(board.quaternion); }
            }
        }
        for (const entry of hands) {
            entry.joints.visible = !!session && entry.hand.visible && Object.values(entry.hand.joints || {}).some(joint => joint.visible); if (!entry.joints.visible) continue;
            let index = 0; for (const joint of Object.values(entry.hand.joints)) { if (!joint.visible || index >= 25) continue; joint.getWorldPosition(entry.position); entry.transform.compose(entry.position, entry.quaternion, entry.scale); entry.joints.setMatrixAt(index++, entry.transform); } entry.joints.count = index; entry.joints.instanceMatrix.needsUpdate = true;
        }
        const now = performance.now();
        for (const effect of landingEffects) if (effect.mesh.visible) { const progress = (now - effect.started) / 420; if (progress >= 1) effect.mesh.visible = false; else { effect.mesh.scale.setScalar(1 + progress * .28); effect.mesh.material.opacity = .8 * (1 - progress) ** 2; } }
        renderer.render(scene, camera);
    });
    // Capability discovery must not delay the editor API or revive a closed workspace.
    void (async () => {
        if (navigator.xr && window.isSecureContext) try { supported = await navigator.xr.isSessionSupported('immersive-ar') ? 'immersive-ar' : await navigator.xr.isSessionSupported('immersive-vr') ? 'immersive-vr' : ''; } catch { /* Desktop simulator remains usable. */ }
        if (!disposed) { root.querySelector('[data-spatial=enter]').disabled = !supported; if (!supported) root.querySelector('[data-spatial-notice]').textContent = '3D authoring preview · Open this page over HTTPS in a WebXR headset browser to enter XR.'; }
    })();
    async function enter() {
        if (!supported || session || disposed || entering) return; entering = true;
        try {
            const next = await navigator.xr.requestSession(supported, { optionalFeatures: ['local-floor', 'hand-tracking'] });
            if (disposed) { await next.end(); return; } session = next;
            session.addEventListener('end', () => { session = null; entering = false; root.classList.remove('is-immersive'); cancelGestures(); speech?.abort(); for (const controller of controllers) controller.userData.reticle.visible = false; recenter(); renderer.setClearColor(0x000000, 0); refreshPanels(); }, { once: true });
            session.addEventListener('visibilitychange', () => { if (session?.visibilityState !== 'visible') { cancelGestures(); speech?.abort(); } });
            renderer.xr.setReferenceSpaceType('local'); await renderer.xr.setSession(session); root.classList.add('is-immersive'); renderer.setClearColor(0x000000, supported === 'immersive-ar' ? 0 : 1); pendingRecenter = true; menuOpen = true; latch.reset(); feedback(null, 'grow'); refreshPanels();
        } catch (error) { if (session) await session.end().catch(() => {}); session = null; notice(`XR could not start. ${error.message}`); }
        finally { entering = false; }
    }
    root.querySelector('[data-spatial=select]').focus();
    async function destroy() {
        if (disposed) return; cancelGestures(); disposed = true; abort.abort(); speech?.abort(); if (session) await session.end().catch(() => {}); renderer.setAnimationLoop(null);
        for (const panel of panels.values()) { panel.mesh.removeFromParent(); panel.dispose(); } clearLayer(board); for (const controller of controllers) { clearLayer(controller); clearLayer(controller.userData.grip); scene.remove(controller.userData.reticle); } for (const entry of hands) { entry.joints.geometry.dispose(); entry.joints.material.dispose(); } reticleGeometry.dispose(); reticleMaterial.dispose(); renderer.dispose(); renderer.forceContextLoss(); cues.destroy(); root.remove(); if (editor) editor.inert = false; previousFocus?.focus(); api.onClose();
    }
    // Desktop simulation and accessibility tooling can discover actual world controls.
    // Screen positions are projected from the same meshes ray-tested in the headset.
    function getPreviewControls() {
        scene.updateMatrixWorld(true); camera.updateMatrixWorld(); const results = [];
        for (const panel of panels.values()) { if (!panel.mesh.visible) continue; const geometry = panel.mesh.geometry.parameters; for (const button of panel.buttons) { const position = new THREE.Vector3(((button.x + button.w / 2) / 1000 - .5), 0, 0); const pixels = panel.mesh.material.map.image; position.set(((button.x + button.w / 2) / pixels.width - .5) * geometry.width, (.5 - (button.y + button.h / 2) / pixels.height) * geometry.height, 0); panel.mesh.localToWorld(position); position.project(camera); results.push({ id: button.id, title: button.title, disabled: button.disabled, x: (position.x + 1) * innerWidth / 2, y: (1 - position.y) * innerHeight / 2 }); } }
        for (const [id, cell] of cells) {
            const position = cell.group.getWorldPosition(new THREE.Vector3()).project(camera); results.push({ id: `cell:${id}`, title: api.getGraph().nodes.find(node => node.id === id)?.title, x: (position.x + 1) * innerWidth / 2, y: (1 - position.y) * innerHeight / 2 });
            if (cell.growHandle.visible) { const at = cell.growHandle.getWorldPosition(new THREE.Vector3()).project(camera); results.push({ id: `grow:${id}`, title: 'Grow a branch', x: (at.x + 1) * innerWidth / 2, y: (1 - at.y) * innerHeight / 2 }); }
        }
        return results;
    }
    return { refresh: rebuild, destroy, enter, getPreviewControls, getState: () => ({ mode: work.state.mode, page: work.state.page, editing: work.state.edit?.field || '', status: work.state.status, immersive: !!session, feedback: cues.counts, snap: snapEnabled, sound: soundOn, held: [...gestures.values(), pointerGesture].filter(g => g?.type === 'move').map(g => g.id), geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures }) };
}
