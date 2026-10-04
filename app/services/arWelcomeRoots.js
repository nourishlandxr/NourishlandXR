import {drawLivingLeafArtwork} from './livingFrameArtwork.js';
import {GRAPHICS_PRESETS,currentGraphicsQuality} from './spatialVisualSettings.js';
import { WELCOME_SHAPE } from './arWelcomePanel.js';

// These values are raised only by real actions in the guided demo. Keeping the
// highest reached milestone makes the network cumulative when visitors go back.
export const WELCOME_ROOT_MILESTONES = Object.freeze({
    arrival: 0,
    firstPlantPlaced: 1,
    plantProfileOpened: 2,
    secondPlantPlaced: 3,
    notePlaced: 4,
    firstAreaShown: 5,
    secondAreaShown: 6,
    areasConnected: 7,
    knowledgeConnected: 8,
    demoClosing: 9
});
export const WELCOME_ROOT_MAX_MILESTONE = WELCOME_ROOT_MILESTONES.demoClosing;
export const WELCOME_ROOT_GROWTH_MS = 60000;
export const WELCOME_ROOT_REFRESH_MS = 1000;
export const WELCOME_ROOTS_SETTLED_MS = WELCOME_ROOT_GROWTH_MS;

const clamp = value => Math.max(0, Math.min(1, value));
const fract = value => value - Math.floor(value);
const hash = (value, salt = 0) => fract(Math.sin((value + salt) * 127.1 + 23.7) * 43758.5453);
const mix = (a, b, amount) => a + (b - a) * amount;
const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const stageEase = value => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
};

const ROOT_PALETTE = Object.freeze({
    copper: Object.freeze({ body: '#956a45', light: '#d1a16b', shade: '#4f392e' }),
    olive: Object.freeze({ body: '#7b8061', light: '#adb18a', shade: '#3c473e' }),
    bark: Object.freeze({ body: '#806148', light: '#b58c65', shade: '#43332c' })
});

const polarPoint = (angle, radius) => ({
    x: WELCOME_SHAPE.cx + Math.cos(angle) * radius,
    y: WELCOME_SHAPE.cy + Math.sin(angle) * radius
});
const rootAngle = point => Math.atan2(point.y - WELCOME_SHAPE.cy, point.x - WELCOME_SHAPE.cx);
const rootRadius = point => Math.hypot(point.x - WELCOME_SHAPE.cx, point.y - WELCOME_SHAPE.cy);
const readingRadius = () => 500;
function safeRootPoint(point) {
    const angle = rootAngle(point);
    const radius = Math.min(550, Math.max(readingRadius(angle) + 27, rootRadius(point)));
    return polarPoint(angle, radius);
}
const cubic = (a, b, c, d, t) => {
    const u = 1 - t;
    return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
};
function branchPoints(parent, attach, side, seed, fine = false) {
    const index = Math.round(attach * (parent.points.length - 1));
    const start = parent.points[index];
    const before = parent.points[Math.max(0, index - 2)];
    const after = parent.points[Math.min(parent.points.length - 1, index + 2)];
    const tangentLength = distance(before, after) || 1;
    const tangent = { x: (after.x - before.x) / tangentLength, y: (after.y - before.y) / tangentLength };
    const angle = rootAngle(start);
    const targetAngle = angle + side * (fine ? .13 : .27 + hash(seed, 7) * .17);
    const targetRadius = Math.max(readingRadius(targetAngle) + (fine ? 27 : 34), rootRadius(start) - (fine ? 55 : 125) - hash(seed, 11) * (fine ? 24 : 42));
    const end = safeRootPoint(polarPoint(targetAngle, targetRadius));
    const reach = fine ? 25 : 54;
    const inward = { x: -Math.cos(angle), y: -Math.sin(angle) };
    const control1 = { x: start.x + tangent.x * reach + inward.x * reach * .42,
        y: start.y + tangent.y * reach + inward.y * reach * .42 };
    const control2 = { x: end.x + Math.cos(targetAngle) * reach * .72 - tangent.x * reach * .25,
        y: end.y + Math.sin(targetAngle) * reach * .72 - tangent.y * reach * .25 };
    const samples = fine ? 24 : 42;
    return Array.from({ length: samples + 1 }, (_, index) => {
        const t = index / samples;
        return safeRootPoint({
            x: cubic(start.x, control1.x, control2.x, end.x, t),
            y: cubic(start.y, control1.y, control2.y, end.y, t)
        });
    });
}
function trunkPoints({ angle, sweep, direction, tipRadius, seed }) {
    const samples = 78;
    const phase = hash(seed, 19) * Math.PI * 2;
    return Array.from({ length: samples + 1 }, (_, index) => {
        const t = index / samples;
        const theta = angle + direction * sweep * t
            + Math.sin(Math.PI * t) * (.030 * Math.sin(phase + t * 5.2) + .014 * Math.sin(phase * .6 + t * 10));
        const radius = mix(526, tipRadius, t)
            + Math.sin(Math.PI * t) * (18 * Math.sin(phase + t * 7.1) + 7 * Math.sin(phase * .7 + t * 15));
        return safeRootPoint(polarPoint(theta, radius));
    });
}
function createRootNetwork() {
    const paths = [];
    let seed = 0;
    const add = ({ id, stage, kind, width, palette, points, parentId = '' }) => {
        const number = ++seed;
        const path = {
            id, stage, kind, width, palette, points, parentId, seed: number,
            delay: hash(number, 59) * 420,
            duration: WELCOME_ROOT_GROWTH_MS * (.82 + hash(number, 61) * .3)
        };
        paths.push(path);
        return path;
    };
    // Each trunk has a distinct origin, direction and length. The branches
    // inherit exact points on their parent so the network reads as growth.
    const trunks = [
        { angle: Math.PI / 2, sweep: 2.13, direction: 1, tipRadius: 464, width: 7, stage: 0, palette: 'bark' },
        { angle: Math.PI / 2, sweep: 1.70, direction: -1, tipRadius: 452, width: 5, stage: 0, palette: 'copper' }
    ];
    trunks.forEach((spec, trunkIndex) => {
        const trunk = add({
            id: `structural-${trunkIndex}`, stage: spec.stage, kind: 'structural',
            width: spec.width, palette: spec.palette, points: trunkPoints({ ...spec, seed: trunkIndex + 1 })
        });
        const attachments = trunkIndex === 0 ? [.16, .33, .49, .67, .82] : [.20, .49, .78];
        attachments.forEach((attach, branchIndex) => {
            const branchStage = Math.min(WELCOME_ROOT_MAX_MILESTONE - 1,
                1 + trunkIndex + branchIndex * 2);
            const side = branchIndex % 2 ? -1 : 1;
            const branch = add({
                id: `branch-${trunkIndex}-${branchIndex}`, stage: branchStage,
                kind: 'medium', width: 5.8 + hash(trunkIndex * 7 + branchIndex, 31) * 3,
                palette: spec.palette, parentId: trunk.id,
                points: branchPoints(trunk, attach, side, trunkIndex * 11 + branchIndex)
            });
            add({
                id: `feeder-${trunkIndex}-${branchIndex}`,
                stage: Math.min(WELCOME_ROOT_MAX_MILESTONE, branchStage + 1),
                kind: 'feeder', width: 2.1 + hash(trunkIndex * 13 + branchIndex, 41) * .85,
                palette: spec.palette, parentId: branch.id,
                points: branchPoints(branch, .58, -side, trunkIndex * 19 + branchIndex, true)
            });
        });
    });
    const kindOrder = { structural: 0, medium: 1, feeder: 2 };
    return paths.sort((a, b) => a.stage - b.stage || kindOrder[a.kind] - kindOrder[b.kind] || a.seed - b.seed);
}

const ROOT_NETWORK = Object.freeze(createRootNetwork());

function rootProgress(path, { milestone, elapsed, milestoneStartedAt, reducedMotion }) {
    if (path.stage > milestone) return 0;
    if (reducedMotion || path.stage < milestone) return 1;
    return stageEase((elapsed - milestoneStartedAt - path.delay) / path.duration);
}

function visiblePath(points, progress) {
    if (progress <= 0 || points.length < 2) return [];
    if (progress >= 1) return points;
    let remaining = points.slice(1).reduce((sum, point, index) => sum + distance(points[index], point), 0) * progress;
    const visible = [points[0]];
    for (let index = 1; index < points.length; index++) {
        const segment = distance(points[index - 1], points[index]);
        if (remaining >= segment) {
            visible.push(points[index]);
            remaining -= segment;
            continue;
        }
        if (remaining > 0) {
            const ratio = remaining / segment;
            visible.push({ x: mix(points[index - 1].x, points[index].x, ratio), y: mix(points[index - 1].y, points[index].y, ratio) });
        }
        break;
    }
    return visible;
}

export function welcomeRootFrame({ milestone = 0, elapsed = 0, milestoneStartedAt = 0, reducedMotion = false } = {}) {
    const state = {
        milestone: Math.max(0, Math.min(WELCOME_ROOT_MAX_MILESTONE, Math.floor(Number(milestone) || 0))),
        elapsed: Math.max(0, Number(elapsed) || 0),
        milestoneStartedAt: Math.max(0, Number(milestoneStartedAt) || 0),
        reducedMotion: Boolean(reducedMotion)
    };
    return ROOT_NETWORK.map(path => {
        const progress = rootProgress(path, state);
        return { ...path, progress, points: visiblePath(path.points, progress) };
    });
}

export function advanceWelcomeRootProgress(current = {}, requestedMilestone = 0, elapsed = 0) {
    const milestone = Math.max(0, Math.min(WELCOME_ROOT_MAX_MILESTONE, Math.floor(Number(current.milestone) || 0)));
    const requested = Math.max(0, Math.min(WELCOME_ROOT_MAX_MILESTONE, Math.floor(Number(requestedMilestone) || 0)));
    const changed = requested > milestone;
    return {
        milestone: changed ? requested : milestone,
        milestoneStartedAt: changed ? Math.max(0, Number(elapsed) || 0) : Math.max(0, Number(current.milestoneStartedAt) || 0),
        changed
    };
}

function rootStageIsGrowing(state) {
    if (state.reducedMotion) return false;
    return ROOT_NETWORK.some(path => path.stage === state.milestone && rootProgress(path, state) < 1);
}

function glimmerIsActive(elapsed) {
    const phase = ((elapsed % 22000) + 22000) % 22000;
    return phase < 1150;
}

export function welcomeRootsAreGrowing(options = {}) {
    return rootStageIsGrowing({
        milestone: Math.max(0, Math.floor(Number(options.milestone) || 0)),
        elapsed: Math.max(0, Number(options.elapsed) || 0),
        milestoneStartedAt: Math.max(0, Number(options.milestoneStartedAt) || 0),
        reducedMotion: Boolean(options.reducedMotion)
    });
}

export function welcomeRootsNeedRefresh(options = {}) {
    if (options.reducedMotion) return false;
    return Number(options.elapsed)<300000 || welcomeRootsAreGrowing(options);
}

function fillRootRibbon(ctx, points, width, offset = 0) {
    if (points.length < 2) return false;
    const sides = [[], []], last = points.length - 1;
    for (let index = 0; index <= last; index++) {
        const before = points[Math.max(0, index - 1)], after = points[Math.min(last, index + 1)];
        const dx = after.x - before.x, dy = after.y - before.y, length = Math.hypot(dx, dy) || 1;
        const fraction = index / last;
        const base = .72 + .28 * stageEase(fraction / .13);
        const tip = .025 + .975 * stageEase((1 - fraction) / .25);
        const radius = width * .5 * base * tip;
        const normalX = -dy / length, normalY = dx / length;
        const centerX = points[index].x + normalX * width * offset * tip;
        const centerY = points[index].y + normalY * width * offset * tip;
        sides[0].push({ x: centerX + normalX * radius, y: centerY + normalY * radius });
        sides[1].push({ x: centerX - normalX * radius, y: centerY - normalY * radius });
    }
    ctx.beginPath();
    ctx.moveTo(sides[0][0].x, sides[0][0].y);
    for (const point of sides[0].slice(1)) ctx.lineTo(point.x, point.y);
    for (const point of sides[1].reverse()) ctx.lineTo(point.x, point.y);
    ctx.closePath();
    ctx.fill();
    return true;
}

function strokeRoot(ctx, path, points, alpha, quality='medium') {
    const palette = ROOT_PALETTE[path.palette] || ROOT_PALETTE.copper;
    const inheritedAlpha = Number.isFinite(ctx.globalAlpha) ? ctx.globalAlpha : 1;
    ctx.globalAlpha = inheritedAlpha * alpha * .46;
    ctx.fillStyle = palette.shade;
    ctx.shadowColor = 'rgba(2, 9, 9, .55)';
    ctx.shadowBlur = path.kind === 'structural' ? 12 : 5;
    fillRootRibbon(ctx, points, path.width * 1.34);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = inheritedAlpha * alpha * (path.kind === 'structural' ? .94 : .86);
    ctx.fillStyle = palette.body;
    if(quality==='high' && typeof ctx.createLinearGradient==='function'){
        const start=points[0],end=points.at(-1),shade=ctx.createLinearGradient(start.x,start.y,end.x+path.width*2,end.y);
        shade.addColorStop(0,palette.shade);shade.addColorStop(.3,palette.body);shade.addColorStop(.58,palette.light);shade.addColorStop(.7,palette.body);shade.addColorStop(1,palette.shade);ctx.fillStyle=shade;
    }
    fillRootRibbon(ctx, points, path.width);
    if (path.kind !== 'feeder') {
        ctx.globalAlpha = inheritedAlpha * alpha * .36;
        ctx.fillStyle = palette.light;
        fillRootRibbon(ctx, points, path.width * .23, -.25);
    }
    if (path.kind === 'structural' && points.length > 25) {
        ctx.globalAlpha = inheritedAlpha * alpha * .27;
        ctx.strokeStyle = palette.shade;
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        for (let index = 7; index < points.length * .84; index += 8) {
            const point = points[index];
            const before = points[index - 2], after = points[index + 2];
            const length = distance(before, after) || 1;
            const tangentX = (after.x - before.x) / length, tangentY = (after.y - before.y) / length;
            const side = hash(path.seed * 17 + index, 73) > .5 ? 1 : -1;
            const normalX = -tangentY * side, normalY = tangentX * side;
            const offset = path.width * (.10 + hash(index, 79) * .18);
            const span = 4 + hash(index, 83) * 7;
            ctx.beginPath();
            ctx.moveTo(point.x + normalX * offset, point.y + normalY * offset);
            ctx.quadraticCurveTo(point.x + tangentX * span * .45,
                point.y + tangentY * span * .45,
                point.x + tangentX * span + normalX * offset * .5,
                point.y + tangentY * span + normalY * offset * .5);
            ctx.stroke();
        }
    }
}

function drawAmberPoint(ctx, point, radius, alpha) {
    if (alpha <= .015) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = 'rgba(233, 163, 77, .9)';
    ctx.shadowColor = 'rgba(229, 145, 48, .62)';
    ctx.shadowBlur = 7;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawWelcomeRootsDirect(ctx, { milestone = 0, elapsed = 0, milestoneStartedAt = 0, reducedMotion = false, cellClearance = [], cellOpenedAt = {}, quality = currentGraphicsQuality() } = {}) {
    const frame = welcomeRootFrame({ milestone, elapsed, milestoneStartedAt, reducedMotion });
    ctx.save();
    // Clip each exclusion independently: overlapping cells must never cancel
    // each other's clearance as overlapping holes in one even-odd path would.
    for(const cell of cellClearance.filter(cell=>Number.isFinite(cellOpenedAt[cell.id]))){
        ctx.beginPath();ctx.roundRect(-200,-200,3000,2600,0);
        const radius=(cell.radius-LIVING_RIM.cellGap)*.52;
        ctx.moveTo(cell.x+radius,cell.y);ctx.arc(cell.x,cell.y,radius,0,Math.PI*2);
        ctx.clip('evenodd');
    }

    const currentMilestone = Math.max(0, Math.min(WELCOME_ROOT_MAX_MILESTONE, Math.floor(Number(milestone) || 0)));
    const glimmerPhase = ((Number(elapsed) % 22000) + 22000) % 22000;
    frame.forEach((path, index) => {
        if (path.points.length < 2) return;
        ctx.save();
        strokeRoot(ctx, path, path.points, path.stage === currentMilestone ? .9 : .76,quality);

        // A few new roots carry a tiny warm tip while their current phase grows.
        if (!reducedMotion && path.stage === currentMilestone && path.progress < 1 && index % 5 === 0) {
            drawAmberPoint(ctx, path.points.at(-1), path.kind === 'structural' ? 2.1 : 1.45, .28 + path.progress * .22);
        }

        ctx.restore();
    });
    drawLivingRim(ctx,{elapsed,reducedMotion,quality});
    ctx.restore();
    drawLowCellGroundcover(ctx,{cellClearance,cellOpenedAt,elapsed,quality});
    return frame;
}

// Opening a cell starts its own slow, shallow planting at the outer edge.
// Nothing appears on arrival; the centre remains reserved for readable text.
export function cellGroundcoverGrowth(elapsed,openedAt){
    return Number.isFinite(openedAt)?stageEase((elapsed-openedAt-1500)/60000):0;
}
function drawLowCellGroundcover(ctx,{cellClearance=[],cellOpenedAt={},elapsed=0,quality='medium'}){
    const cells=cellClearance.filter(cell=>cellGroundcoverGrowth(elapsed,cellOpenedAt[cell.id])>0);
    if(!cells.length)return;
    const count=quality==='high'?9:quality==='low'?4:6;
    // Rooted approach: a slender stem extends from the actual soil rim before
    // tiny leaves unfold on the cell's lower edge. Never erase its full disc.
    for(const cell of cells){
        const growth=cellGroundcoverGrowth(elapsed,cellOpenedAt[cell.id]);
        const angle=Math.atan2(cell.y-WELCOME_SHAPE.cy,cell.x-WELCOME_SHAPE.cx),start=polarPoint(angle,535);
        const edge=cell.radius-LIVING_RIM.cellGap;
        const tip={x:cell.x+Math.cos(angle)*edge,y:cell.y+Math.sin(angle)*edge};
        const reach=stageEase(growth*3),end={x:mix(start.x,tip.x,reach),y:mix(start.y,tip.y,reach)};
        ctx.save();ctx.globalAlpha=.55*growth;ctx.strokeStyle='#4e6644';ctx.lineWidth=1.6;
        ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.quadraticCurveTo((start.x+end.x)/2+8,(start.y+end.y)/2,end.x,end.y);ctx.stroke();ctx.restore();
    }
    ctx.save();ctx.beginPath();
    for(const cell of cells){ctx.moveTo(cell.x+cell.radius,cell.y);ctx.arc(cell.x,cell.y,cell.radius,0,Math.PI*2);}
    ctx.clip();
    cells.forEach((cell,index)=>{
        const growth=cellGroundcoverGrowth(elapsed,cellOpenedAt[cell.id]);
        for(let n=0;n<count;n++){
            const seed=index*97+n,angle=.35+hash(seed,701)*2.4;
            const g=Math.max(0,Math.min(1,(growth-.22-hash(seed,719)*.16)/.62));
            if(g<=0)continue;
            const edge=cell.radius-LIVING_RIM.cellGap-3,reach=(3+hash(seed,709)*5)*g;
            const x=cell.x+Math.cos(angle)*(edge-reach),y=cell.y+Math.sin(angle)*(edge-reach);
            ctx.globalAlpha=.65*g;ctx.strokeStyle='#435c3d';ctx.lineWidth=1.1;ctx.beginPath();
            ctx.moveTo(cell.x+Math.cos(angle)*edge,cell.y+Math.sin(angle)*edge);ctx.lineTo(x,y);ctx.stroke();
            const size=(3+hash(seed,727)*2)*g;
            for(let leaf=0;leaf<2;leaf++)drawRimLeaf(ctx,x,y,angle+leaf*1.6,size,['#344f35','#58744b','#738563'][n%3],'rgba(189,210,157,.28)',quality==='high'?2:1);
        }
    });ctx.restore();
}

// A deterministic, asymmetric garden. Time controls growth, never frame count.
// Decoration stays outside the reading window and does not create hit targets.
export const LIVING_RIM = Object.freeze({cellGap:22,stemGrowthMs:47000,groundcoverAt:60000,darkCoverAt:80000,silverCoverAt:90000,vinesAt:65000,berriesAt:150000,berryGrowthMs:45000,flowersAt:100000,flowerGrowthMs:35000,aerialAt:90000,growthMs:60000});
const RIM_PATCHES=Object.freeze(Array.from({length:13},(_,i)=>({
 angle:-Math.PI/2+i*Math.PI*2/13+hash(i,301)*.17,
 radius:532+hash(i,307)*17,seed:i,delay:hash(i,311)*13000,
 leaves:3+Math.floor(hash(i,313)*4)
})));
let flowerSiteTime=-1,flowerSiteCache=[];
export function livingFrameFlowerSites(elapsed=0){
 const tick=Math.floor(elapsed/1000);if(tick===flowerSiteTime)return flowerSiteCache;flowerSiteTime=tick;
 flowerSiteCache=RIM_PATCHES.filter(p=>p.seed%4!==1 && elapsed>LIVING_RIM.flowersAt+p.delay*.35+12000).map(p=>{
  const angle=p.angle+(p.seed%2?1:-1)*.02,branch=stageEase((elapsed-95000-p.delay)/LIVING_RIM.growthMs);
  const base=polarPoint(angle,p.radius),target=polarPoint(angle+.009,p.radius+15);
  return {x:mix(base.x,target.x,branch),y:mix(base.y,target.y,branch)};
 });return flowerSiteCache;
}
function drawRimLeaf(ctx,x,y,angle,size,colour,vein='rgba(201,214,149,.35)',detail=1){
 if(detail>1 && drawLivingLeafArtwork(ctx,x,y,angle,size,colour))return;
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle=colour;
 ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(size*.4,-size*.55,size,-size*.38,size,0);
 ctx.bezierCurveTo(size*.65,size*.38,size*.25,size*.35,0,0);ctx.fill();
 // Soft lamina shading and veins add depth without enlarging the leaf.
 ctx.fillStyle='rgba(211,224,165,.10)';ctx.beginPath();ctx.moveTo(0,0);
 ctx.bezierCurveTo(size*.4,-size*.55,size,-size*.38,size,0);ctx.quadraticCurveTo(size*.45,-size*.045,0,0);ctx.fill();
 ctx.strokeStyle=vein;ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(1,0);ctx.quadraticCurveTo(size*.42,-size*.035,size*.86,0);ctx.stroke();
 if(size>9 && detail>0)for(let n=1;n<=(detail>1?5:3);n++){
  const x=size*(.16+n*(detail>1?.12:.15));ctx.beginPath();ctx.moveTo(x,0);ctx.quadraticCurveTo(x+size*.04,-size*.12,x+size*.12,-size*.2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x,0);ctx.quadraticCurveTo(x+size*.02,size*.08,x+size*.09,size*.14);ctx.stroke();
 }
 if(detail>1 && size>6){
  ctx.strokeStyle='rgba(219,232,187,.24)';ctx.lineWidth=.42;ctx.beginPath();ctx.moveTo(size*.12,-size*.13);
  ctx.bezierCurveTo(size*.42,-size*.43,size*.77,-size*.28,size*.96,-size*.015);ctx.stroke();
  ctx.strokeStyle='rgba(9,32,19,.25)';ctx.beginPath();ctx.moveTo(size*.15,size*.10);ctx.quadraticCurveTo(size*.61,size*.27,size*.9,size*.035);ctx.stroke();
 }
 ctx.restore();
}
function growRimStem(ctx,angle,target,progress,colour='#637448'){
 if(progress<=0)return;
 const base=polarPoint(angle,WELCOME_SHAPE.radius+2);
 const bend=polarPoint(angle+.012,527);
 ctx.strokeStyle=colour;ctx.lineWidth=1.65;ctx.beginPath();ctx.moveTo(base.x,base.y);
 // Exact partial quadratic keeps the advancing stem smooth at any size.
 const t=progress,u=1-t;
 ctx.quadraticCurveTo(mix(base.x,bend.x,t),mix(base.y,bend.y,t),
  u*u*base.x+2*u*t*bend.x+t*t*target.x,u*u*base.y+2*u*t*bend.y+t*t*target.y);
 ctx.stroke();
}
function drawLivingRim(ctx,{elapsed=0,reducedMotion=false,quality=currentGraphicsQuality()}){
 const detail=quality==='high'?2:quality==='low'?0:1;
 const leaf=(context,x,y,angle,size,colour,vein)=>drawRimLeaf(context,x,y,angle,size,colour,vein,detail);

 const grow=(at,delay=0)=>reducedMotion?1:stageEase((elapsed-at-delay)/LIVING_RIM.growthMs);
 ctx.save();ctx.lineCap='round';
 // Relief follows the rim, outside the perfectly circular reading aperture.
 if(detail>0){
  const established=reducedMotion?1:stageEase(elapsed/60000);
  for(let i=0;i<(detail>1?180:72);i++){
   const angle=i*2.399963, r=525+hash(i,601)*26, p=polarPoint(angle,r);
   const size=(1.2+hash(i,607)*2.4)*established;
   ctx.fillStyle=i%3===0?'rgba(113,100,69,.38)':i%3===1?'rgba(23,30,19,.52)':'rgba(58,69,39,.42)';
   ctx.beginPath();ctx.ellipse(p.x,p.y,size*1.8,size*.55,angle,0,Math.PI*2);ctx.fill();
   if(detail>1){ctx.strokeStyle='rgba(154,135,87,.20)';ctx.lineWidth=.55;ctx.beginPath();ctx.arc(p.x,p.y,size,.1,2.4);ctx.stroke();}
  }
 }
 for(const patch of RIM_PATCHES){
  // Uneven patch density; cell clearance reserves the required open spaces.
  const stem=reducedMotion?1:stageEase((elapsed-patch.delay)/LIVING_RIM.stemGrowthMs);
  for(let n=0;n<patch.leaves;n++){
   const a=patch.angle+(n-2)*.018,r=patch.radius+hash(n+patch.seed*9,317)*17;
   growRimStem(ctx,patch.angle,polarPoint(a,r),stem);
  }
  growRimStem(ctx,patch.angle,polarPoint(patch.angle,patch.radius+Math.sin(patch.seed)*7),stem);
  if([0,4,7,10].includes(patch.seed))growRimStem(ctx,patch.angle,polarPoint(patch.angle,patch.radius+14),stem);
  // Small darker companion clusters establish between the larger leaves.
  // Paired leaves unfold along short stems, outside the circular inner edge.
  if(patch.seed%3!==1){
   growRimStem(ctx,patch.angle+.025,polarPoint(patch.angle+.055,patch.radius+9),stem,'#405c3b');
   const cluster=grow(LIVING_RIM.darkCoverAt,patch.delay+hash(patch.seed,373)*9000);
   if(cluster>0){
    const a=patch.angle+.055,r=patch.radius+9;
    const base=polarPoint(a,r),tip=polarPoint(a+.035*cluster,r+18*cluster);
    ctx.strokeStyle='#405c3b';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(base.x,base.y);ctx.lineTo(tip.x,tip.y);ctx.stroke();
    for(let n=0;n<3;n++){
     const unfold=grow(LIVING_RIM.darkCoverAt,patch.delay+hash(patch.seed,373)*9000+n*3400);
     const p=polarPoint(a+n*.012*cluster,r+n*6*cluster);
     for(const side of [-1,1]){
      const size=(8+hash(patch.seed*7+n,379)*5)*unfold;
      leaf(ctx,p.x,p.y,a+side*(.7+.35*unfold),size,side<0?'#345638':'#426344','rgba(143,171,119,.24)');
     }
    }
   }
  }
  const cover=grow(LIVING_RIM.groundcoverAt,patch.delay),vine=grow(LIVING_RIM.vinesAt,patch.delay);
  if(cover>0)for(let n=0;n<patch.leaves;n++){
   const a=patch.angle+(n-2)*.018,r=patch.radius+hash(n+patch.seed*9,317)*17;
   const p=polarPoint(a,r),size=(12+hash(n+patch.seed*5,319)*17)*cover;
   leaf(ctx,p.x,p.y,a+(n%2?1.1:-1.2),size,n%2?'#607a43':'#839655');
  }
  if(vine>0){
   const sweep=(.38+hash(patch.seed,331)*.42)*vine,direction=patch.seed%2?1:-1;
   ctx.strokeStyle='#74814c';ctx.lineWidth=2.8;ctx.beginPath();
   for(let j=0;j<=28;j++){const t=j/28,p=polarPoint(patch.angle+direction*sweep*t,patch.radius+Math.sin(t*5+patch.seed)*7);j?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);}
   ctx.stroke();
   for(let j=1;j<=3;j++){const p=polarPoint(patch.angle+direction*sweep*j/4,patch.radius);leaf(ctx,p.x,p.y,patch.angle+direction*.8,16*vine,'#647e46');}
   const berries=reducedMotion?1:stageEase((elapsed-LIVING_RIM.berriesAt-patch.delay)/LIVING_RIM.berryGrowthMs);
   if(berries>0 && [1,6,9].includes(patch.seed))for(let j=0;j<2;j++){
    const a=patch.angle+direction*sweep*(.58+j*.15),p=polarPoint(a,patch.radius+Math.sin((.58+j*.15)*5+patch.seed)*7);
    const fruit=polarPoint(a+.009,Math.hypot(p.x-WELCOME_SHAPE.cx,p.y-WELCOME_SHAPE.cy)+5);
    ctx.strokeStyle='#596543';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(fruit.x,fruit.y);ctx.stroke();
    ctx.fillStyle=j?'#8f3f39':'#a54c40';ctx.beginPath();ctx.arc(fruit.x,fruit.y,3.1*berries,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(227,171,133,.45)';ctx.beginPath();ctx.arc(fruit.x-.8,fruit.y-.9,.65*berries,0,Math.PI*2);ctx.fill();
   }
  }
  if(patch.seed%4!==1)for(let n=0;n<3;n++){
   const branch=grow(95000,patch.delay+n*2100);
   const flower=reducedMotion?1:stageEase((elapsed-LIVING_RIM.flowersAt-patch.delay*.35-n*2300)/LIVING_RIM.flowerGrowthMs);
   if(branch<=0)continue;
   const a=patch.angle+(patch.seed%2?1:-1)*(.02+n*.025);
   const base=polarPoint(a,patch.radius),target=polarPoint(a+.009,patch.radius+15+n*9);
   const tip={x:mix(base.x,target.x,branch),y:mix(base.y,target.y,branch)};
   ctx.strokeStyle=n%2?'#52714d':'#6d8051';ctx.lineWidth=1.2;
   ctx.beginPath();ctx.moveTo(base.x,base.y);ctx.quadraticCurveTo(base.x+Math.cos(a)*8,base.y+Math.sin(a)*8,tip.x,tip.y);ctx.stroke();
   if(flower<=0)continue;
   ctx.save();ctx.translate(tip.x,tip.y);ctx.rotate(patch.seed*.73+n);ctx.scale(flower,flower);
   ctx.fillStyle=['#b477ab','#d199c3','#a76998','#ede0d9'][(patch.seed+n)%4];
   for(let j=0;j<5;j++){
    ctx.save();ctx.rotate(j*Math.PI*2/5);ctx.beginPath();ctx.moveTo(0,0);
    ctx.quadraticCurveTo(-4,-4,-2.5,-8);ctx.lineTo(0,-6.8);ctx.lineTo(2.5,-8);
    ctx.quadraticCurveTo(4,-4,0,0);ctx.fill();
    ctx.fillStyle='rgba(244,218,232,.16)';ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(-2,-4,0,-6.8);ctx.quadraticCurveTo(2,-3,0,0);ctx.fill();
    ctx.strokeStyle='rgba(105,57,94,.26)';ctx.lineWidth=.55;ctx.beginPath();ctx.moveTo(0,-1);ctx.lineTo(0,-5.8);ctx.stroke();ctx.restore();
   }
   ctx.fillStyle='#dcc395';ctx.beginPath();ctx.arc(0,0,1.65,0,Math.PI*2);ctx.fill();ctx.restore();
  }
 }
 // Low silver-green carpet occupies the intervals between taller patches.
 // Narrow paired leaves and tiny ochre heads keep this layer subordinate.
 for(let i=0;i<11;i++){
  const a=-Math.PI/2+(i+.46)*Math.PI*2/11+hash(i,401)*.09;
  const r=534+hash(i,409)*13,delay=hash(i,419)*13000;
  const base=polarPoint(a,r),stem=reducedMotion?1:stageEase((elapsed-delay)/LIVING_RIM.stemGrowthMs);
  growRimStem(ctx,a,base,stem,'#697b68');
  const cover=grow(LIVING_RIM.silverCoverAt,delay);
  if(cover<=0)continue;
  for(let sprig=0;sprig<3;sprig++){
   const direction=a+(sprig-1)*.52,length=(13+hash(i*3+sprig,421)*9)*cover;
   const tip={x:base.x+Math.cos(direction)*length,y:base.y+Math.sin(direction)*length};
   ctx.strokeStyle='#7b8b78';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(base.x,base.y);ctx.lineTo(tip.x,tip.y);ctx.stroke();
   for(let pair=1;pair<=2;pair++)for(const side of [-1,1]){
    const x=mix(base.x,tip.x,pair/3),y=mix(base.y,tip.y,pair/3);
    ctx.save();ctx.translate(x,y);ctx.rotate(direction+side*.72);ctx.scale(1,.36);
    leaf(ctx,0,0,0,(9+hash(i+pair,431)*4)*cover,pair%2?'#96a18b':'#7e9281','rgba(206,213,183,.2)');ctx.restore();
   }
   const bloom=reducedMotion?1:stageEase((elapsed-120000-delay-sprig*2700)/45000);
   if(bloom>0){
    ctx.fillStyle=sprig%2?'#b5a14b':'#c8b25b';
    for(let head=0;head<3;head++){
     const turn=head*Math.PI*2/3;ctx.beginPath();
     ctx.arc(tip.x+Math.cos(turn)*1.9*bloom,tip.y+Math.sin(turn)*1.9*bloom,1.8*bloom,0,Math.PI*2);ctx.fill();
    }
   }
  }
 }
 // Fig-like aerial roots start along the lower arc, with varied ends and forks.
 for(let i=0;i<9;i++){
  const growth=grow(LIVING_RIM.aerialAt,i===0?0:hash(i,347)*20000);if(growth<=0)continue;
  const angle=.73+i*.20,start=polarPoint(angle,531),length=(105+hash(i,349)*145)*growth;
  const sway=0; // Established roots stay still; growth is the only motion.
  const end={x:start.x+(hash(i,353)-.5)*22+sway,y:start.y+length};
  if(detail>1 && typeof ctx.createLinearGradient==='function'){drawDetailedAerialRoot(ctx,start,end,length,growth,i,GRAPHICS_PRESETS[quality].frameRootSamples);continue;}
  ctx.strokeStyle=i%2?'#69513a':'#806449';ctx.lineWidth=1.8+hash(i,359)*3.5;ctx.beginPath();ctx.moveTo(start.x,start.y);
  ctx.bezierCurveTo(start.x-8,start.y+length*.3,end.x+9,end.y-length*.2,end.x,end.y);ctx.stroke();
  if(detail>0){
   ctx.strokeStyle='rgba(185,157,111,.34)';ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(start.x-.6,start.y);
   ctx.bezierCurveTo(start.x-8.6,start.y+length*.3,end.x+8.4,end.y-length*.2,end.x-.6,end.y);ctx.stroke();
   if(detail>1)for(let n=1;n<=4;n++){
    const t=n/5,x=start.x+(end.x-start.x)*t,y=start.y+length*t,side=n%2?1:-1;
    ctx.strokeStyle='rgba(104,82,55,.58)';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+side*6,y+5,x+side*(9+hash(i+n,619)*7),y+16*growth);ctx.stroke();
   }
  }
  if(growth>.65 && i%2===0){ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(end.x,end.y-length*.22);ctx.quadraticCurveTo(end.x+12,end.y-length*.1,end.x+15,end.y+12*growth);ctx.stroke();}
 }
 ctx.restore();
}

// Rootlets attach to actual points on the growing cubic, then taper to a fine
// curved end. Sampling occurs only when the cached decoration refreshes.
export function livingAerialRootPoints(start,end,length,samples=36){
 return Array.from({length:samples+1},(_,n)=>{const t=n/samples;return {x:cubic(start.x,start.x-8,end.x+9,end.x,t),y:cubic(start.y,start.y+length*.3,end.y-length*.2,end.y,t)};});
}
function drawDetailedAerialRoot(ctx,start,end,length,growth,seed,samples){
 const points=livingAerialRootPoints(start,end,length,samples),width=1.8+hash(seed,359)*3.5;
 ctx.save();
 const shade=ctx.createLinearGradient(start.x-width,start.y,end.x+width,end.y);
 shade.addColorStop(0,'#403326');shade.addColorStop(.32,'#786349');shade.addColorStop(.57,'#8d7655');shade.addColorStop(.73,'#66503b');shade.addColorStop(1,'#483c2b');
 ctx.fillStyle=shade;fillRootRibbon(ctx,points,width);
 ctx.globalAlpha*=.29;ctx.fillStyle='#c2a87a';fillRootRibbon(ctx,points,width*.14,-.3);ctx.restore();
 for(let n=1;n<=4;n++){
  const origin=points[Math.round(samples*n/5)],side=n%2?1:-1,reach=(8+hash(seed+n,619)*8)*growth;
  const tip={x:origin.x+side*reach,y:origin.y+(14+hash(seed+n,627)*12)*growth};
  const branch=Array.from({length:15},(_,index)=>{const t=index/14;return {x:cubic(origin.x,origin.x+side*reach*.45,tip.x-side*2,tip.x,t),y:cubic(origin.y,origin.y+3,tip.y-8,tip.y,t)};});
  ctx.fillStyle=n%2?'#705b40':'#625039';fillRootRibbon(ctx,branch,.8*(1-n*.1));
 }
}

// Cache only decoration, keeping text and LIMO feedback on their own cadence.
const livingFrameCache=new WeakMap();
export function drawArWelcomeRoots(ctx,options={}){
 if(typeof document==='undefined' || typeof ctx.drawImage!=='function')return drawWelcomeRootsDirect(ctx,options);
 let entry=livingFrameCache.get(ctx);
 const quality=options.quality || currentGraphicsQuality(), scale=(GRAPHICS_PRESETS[quality] || GRAPHICS_PRESETS.medium).frameScale;
 if(!entry || entry.scale!==scale){const canvas=document.createElement('canvas');canvas.width=1400*scale;canvas.height=1500*scale;entry={scale,canvas,context:canvas.getContext('2d'),key:null,clearance:null,frame:null};livingFrameCache.set(ctx,entry);}
 const key=[quality,Math.floor((options.elapsed||0)/WELCOME_ROOT_REFRESH_MS),options.milestone||0,options.milestoneStartedAt||0,Boolean(options.reducedMotion),JSON.stringify(options.cellOpenedAt || {})].join(':');
 if(entry.key!==key || entry.clearance!==options.cellClearance){
  const paint=entry.context;paint.imageSmoothingEnabled=true;paint.imageSmoothingQuality='high';paint.setTransform?.(1,0,0,1,0,0);paint.clearRect(0,0,entry.canvas.width,entry.canvas.height);paint.setTransform?.(scale,0,0,scale,0,0);
  entry.frame=drawWelcomeRootsDirect(paint,{...options,quality,cellClearance:[]});
  // Subtract all cell discs in one operation. Their union stays excluded,
  // including overlaps, without a deep stack of expensive canvas clips.
  if(options.cellClearance?.length){paint.save();paint.globalCompositeOperation='destination-out';paint.beginPath();
   for(const cell of options.cellClearance.filter(cell=>Number.isFinite(options.cellOpenedAt?.[cell.id]))){const radius=(cell.radius-LIVING_RIM.cellGap)*.52;paint.moveTo(cell.x+radius,cell.y);paint.arc(cell.x,cell.y,radius,0,Math.PI*2);}
   paint.fill();paint.restore();
   drawLowCellGroundcover(paint,{...options,quality});
  }
  entry.key=key;entry.clearance=options.cellClearance;
 }
 ctx.drawImage(entry.canvas,0,0,1400,1500);return entry.frame;
}
