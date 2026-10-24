import * as THREE from '../vendor/three.module.min.js';

export const FOOD_FOREST_LAYERS = Object.freeze([
    { id: 'canopy', name: 'Canopy', mark: '01', color: '#355c48', height: .72, form: 'stacked crown' },
    { id: 'small-tree', name: 'Small tree', mark: '02', color: '#bb7958', height: .52, form: 'fruit-bearing dome' },
    { id: 'shrub', name: 'Shrub', mark: '03', color: '#7d8b57', height: .3, form: 'clustered pods' },
    { id: 'herb', name: 'Herbaceous', mark: '04', color: '#b5a05d', height: .29, form: 'leaf fan' },
    { id: 'groundcover', name: 'Groundcover', mark: '05', color: '#6c9790', height: .12, form: 'low rosette' },
    { id: 'root', name: 'Roots', mark: '06', color: '#a47868', height: .24, form: 'soil cross-section' },
    { id: 'climber', name: 'Climber', mark: '07', color: '#89839c', height: .58, form: 'spiral on an arch' }
]);

// Original solid tabletop tokens. Silhouette, height and base marks identify layers.
// Geometry is independent of botanical data; these are symbols, not exact tree models.
export const FOOD_FOREST_VARIANTS = Object.freeze({
    canopy: ['Compact crown', 'Spreading crown', 'Upright crown', 'Open crown'],
    'small-tree': ['Round fruit tree', 'Slender fruit tree', 'Trained fan', 'Multi-stem tree'],
    shrub: ['Low mound', 'Round shrub', 'Upright shrub', 'Open shrub'],
    herb: ['Leaf rosette', 'Soft tuft', 'Upright leaves', 'Flowering stems'],
    groundcover: ['Tight mat', 'Spreading leaves', 'Low cushions', 'Creeping strands'],
    root: ['Bulb', 'Taproot', 'Tuber cluster', 'Rhizome'],
    climber: ['Low arch', 'Tall spiral', 'Trained fan', 'Twining post']
});

export function createFoodForestPiece(layerId, { size = 1, variant = 0, label = '', plantId = '', marks = true } = {}) {
    const definition = FOOD_FOREST_LAYERS.find(layer => layer.id === layerId) || FOOD_FOREST_LAYERS[1], group = new THREE.Group();
    variant = Math.max(0, Math.min(3, Math.floor(Number(variant) || 0)));
    group.name = definition.name; group.userData = { layer: definition.id, variant, plantId, label, symbol: true };
    const materials = [], geometries = [], textures = [];
    const material = color => { const value = new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0, flatShading: true }); materials.push(value); return value; };
    const leaf = material(definition.color), trunk = material('#887152'), base = material('#d4c7a6'), detail = material('#eee4c9');
    function mesh(geometry, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) { geometries.push(geometry); const object = new THREE.Mesh(geometry, mat); object.position.set(x, y, z); object.scale.set(sx, sy, sz); object.castShadow = object.receiveShadow = true; group.add(object); return object; }
    function stem(height, radius = .025, x = 0, z = 0) { return mesh(new THREE.CylinderGeometry(radius * .8, radius, height, 8), trunk, x, height / 2 + .045, z); }
    function pod(x, y, z, sx, sy, sz, mat = leaf) { return mesh(new THREE.IcosahedronGeometry(1, 1), mat, x, y, z, sx, sy, sz); }
    mesh(new THREE.CylinderGeometry(.17, .18, .045, 12), base, 0, .0225, 0);
    mesh(new THREE.TorusGeometry(.146, .008, 3, 24), trunk, 0, .047, 0).rotation.x = Math.PI / 2;
    if (definition.id === 'canopy') {
        stem([.4,.48,.65,.5][variant], .04);
        if (variant === 0) pod(0, .51, 0, .22, .16, .21);
        if (variant === 1) { pod(0, .61, 0, .33, .12, .27); pod(-.12, .49, .04, .23, .1, .19); pod(.14, .54, -.03, .22, .105, .19); }
        if (variant === 2) { pod(0, .66, 0, .15, .26, .14); pod(0, .49, 0, .19, .15, .16); }
        if (variant === 3) for (const [x,z,y] of [[-.21,0,.58],[.17,.05,.65],[0,-.17,.74]]) { const curve = new THREE.LineCurve3(new THREE.Vector3(0,.3,0),new THREE.Vector3(x,y,z)); mesh(new THREE.TubeGeometry(curve,1,.02,5,false),trunk); pod(x,y,z,.14,.09,.13); }
    }
    if (definition.id === 'small-tree') {
        stem(variant === 1 ? .4 : .3,.03);
        if (variant === 0) pod(0,.38,0,.19,.17,.18);
        if (variant === 1) pod(0,.46,0,.12,.23,.12);
        if (variant === 2) { pod(0,.39,0,.27,.16,.065); for(const x of [-.14,.14]) mesh(new THREE.CylinderGeometry(.012,.012,.29,5),trunk,x,.25,0).rotation.z=-x*3; }
        if (variant === 3) for(const [x,z,y] of [[-.11,0,.32],[.11,.04,.37],[0,-.1,.46]]) { stem(y-.05,.018,x,z); pod(x,y,z,.12,.13,.11); }
        for (const [x,y,z] of [[-.09,.36,.13],[.09,.43,.1],[.02,.31,.17]]) pod(x,y,z,.027,.027,.027,detail);
    }
    if (definition.id === 'shrub') { const spread=[.09,.06,.045,.14][variant], tall=[.09,.14,.23,.12][variant]; for(const [x,z,y] of [[-spread,.04,tall+.06],[spread,.03,tall+.04],[0,-.065,tall+.1]]) { if(variant===3) stem(y-.04,.012,x,z); pod(x,y,z,variant===2?.075:.12,tall,.11); } }
    if (definition.id === 'herb') for(let i=0;i<(variant===3?3:5);i++){const angle=i*Math.PI*2/5, y=variant===0?.1:variant===2?.23:.15; const object=pod(Math.sin(angle)*.075,y,Math.cos(angle)*.075,variant===2?.025:.04,variant===0?.065:.13,.025);object.rotation.set(Math.cos(angle)*.45,-angle,-Math.sin(angle)*.45);if(variant===3){stem(.3+i*.025,.009,Math.sin(angle)*.075,Math.cos(angle)*.075);pod(Math.sin(angle)*.075,.35+i*.025,Math.cos(angle)*.075,.035,.025,.035,detail);}}
    if (definition.id === 'groundcover') for(let i=0;i<(variant===3?10:7);i++){const angle=i*Math.PI*2/7, radius=variant===1?.15:variant===3?i*.018:.085;const object=pod(Math.sin(angle)*radius,variant===2?.1:.078,Math.cos(angle)*radius,variant===2?.07:.052,variant===2?.05:.028,variant===1?.13:.095);object.rotation.y=angle;}
    if (definition.id === 'root') {
        mesh(new THREE.BoxGeometry(.24,.12,.07),trunk,0,.11,0); const rootColor=material('#e7c592');
        if(variant===0)pod(0,.13,.055,.055,.055,.025,rootColor);
        if(variant===1)mesh(new THREE.ConeGeometry(.035,.16,6),rootColor,0,.14,.05).rotation.z=Math.PI;
        if(variant===2)for(const x of [-.06,0,.06])pod(x,.12+(x===0?.02:0),.05,.035,.055,.024,rootColor);
        if(variant===3)mesh(new THREE.CylinderGeometry(.018,.022,.2,6),rootColor,0,.13,.05).rotation.z=Math.PI/2;
        pod(0,.24,0,.07,.025,.04);
    }
    if (definition.id === 'climber') {
        const arch = new THREE.CatmullRomCurve3([new THREE.Vector3(-.1,.05,0),new THREE.Vector3(-.1,.45,0),new THREE.Vector3(0,.56,0),new THREE.Vector3(.1,.45,0),new THREE.Vector3(.1,.05,0)]); if(variant===0)mesh(new THREE.TubeGeometry(arch,24,.014,6,false),trunk);else stem(variant===1?.75:.55,.015);
        if(variant===2)for(const x of [-.18,.18])mesh(new THREE.CylinderGeometry(.012,.012,.5,5),trunk,x/2,.3,0).rotation.z=-x*2;
        const spiral=Array.from({length:40},(_,i)=>new THREE.Vector3((variant===0?-.09:0)+Math.sin(i*.49)*(variant===1?.055:.032),.08+i*(variant===1?.017:.011),Math.cos(i*.49)*.032));mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiral),40,.012,5,false),leaf);
        for (let i = 0; i < 4; i++) { const object = pod(-.04 + (i % 2 ? -.1 : 0), .14 + i * .09, .025, .05, .025, .021); object.rotation.z = i % 2 ? -.7 : .7; }
    }
    if (marks && typeof document !== 'undefined') {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128; const context = canvas.getContext('2d'); context.fillStyle = '#e6dcc4'; context.fillRect(0, 0, 128, 128); context.fillStyle = '#4a5b46'; context.font = '600 50px system-ui'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(`${definition.mark}.${variant+1}`, 64, 66);
        const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture); const mat = new THREE.MeshBasicMaterial({ map: texture }); materials.push(mat); const mark = mesh(new THREE.PlaneGeometry(.082, .082), mat, 0, .049, .105); mark.rotation.x = -Math.PI / 2;
    }
    group.scale.setScalar(size);
    return { group, definition, dispose() { for (const geometry of geometries) geometry.dispose(); for (const mat of materials) mat.dispose(); for (const texture of textures) texture.dispose(); group.removeFromParent(); } };
}
