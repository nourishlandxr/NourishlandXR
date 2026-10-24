export function boardPointInside(point, boundary) {
    let inside = false;
    for (let i = 0, j = boundary.length - 1; i < boundary.length; j = i++) {
        const a = boundary[i], b = boundary[j];
        const cross=(point.x-a.x)*(b.z-a.z)-(point.z-a.z)*(b.x-a.x);
        if(Math.abs(cross)<1e-8&&point.x>=Math.min(a.x,b.x)-1e-8&&point.x<=Math.max(a.x,b.x)+1e-8&&point.z>=Math.min(a.z,b.z)-1e-8&&point.z<=Math.max(a.z,b.z)+1e-8)return true;
        if ((a.z > point.z) !== (b.z > point.z) && point.x < (b.x - a.x) * (point.z - a.z) / (b.z - a.z) + a.x) inside = !inside;
    }
    return inside;
}
export function foodForestBoundary(shape = 'rectangle') {
    if (shape === 'round') return Array.from({ length: 48 }, (_, i) => ({ x: Math.cos(i / 48 * Math.PI * 2) * 3, z: Math.sin(i / 48 * Math.PI * 2) * 2 }));
    return [{ x: -3, z: -2 }, { x: 3, z: -2 }, { x: 3, z: 2 }, { x: -3, z: 2 }];
}
export function foodForestArea(boundary, widthM = 20, depthM = 12) {
    let twice = 0;
    boundary.forEach((p, i) => { const q = boundary[(i + 1) % boundary.length]; twice += p.x * q.z - q.x * p.z; });
    return Math.abs(twice) / 2 * widthM / 6 * depthM / 4;
}
// A declared design footprint is an assumption, never an automatic yield penalty.
export function foodForestFootprintOverlaps(pieces,widthM,depthM){
    const pairs=[];
    for(let i=0;i<pieces.length;i++)for(let j=i+1;j<pieces.length;j++){
        const a=pieces[i],b=pieces[j];if(!(a.canopyDiameterM>0&&b.canopyDiameterM>0))continue;
        const distance=Math.hypot((a.x-b.x)*widthM/6,(a.z-b.z)*depthM/4);
        if(distance<(a.canopyDiameterM+b.canopyDiameterM)/2)pairs.push({from:a.id,to:b.id,distanceM:distance});
    }
    return pairs;
}
export function validFoodForestBoundary(boundary) {
    if (!Array.isArray(boundary) || boundary.length < 3 || boundary.length > 64 || boundary.some(p => !Number.isFinite(p?.x) || !Number.isFinite(p?.z) || Math.abs(p.x) > 3.01 || Math.abs(p.z) > 2.01)) return false;
    const cross = (a, b, c) => (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
    if(boundary.some((p,i)=>boundary.some((q,j)=>i!==j&&Math.hypot(p.x-q.x,p.z-q.z)<1e-6)))return false;
    const onSegment=(a,b,c)=>Math.abs(cross(a,b,c))<1e-8&&c.x>=Math.min(a.x,b.x)-1e-8&&c.x<=Math.max(a.x,b.x)+1e-8&&c.z>=Math.min(a.z,b.z)-1e-8&&c.z<=Math.max(a.z,b.z)+1e-8;
    for (let i = 0; i < boundary.length; i++) for (let j = i + 1; j < boundary.length; j++) {
        if (j === i + 1 || i === 0 && j === boundary.length - 1) continue;
        const a = boundary[i], b = boundary[(i + 1) % boundary.length], c = boundary[j], d = boundary[(j + 1) % boundary.length];
        if (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0||onSegment(a,b,c)||onSegment(a,b,d)||onSegment(c,d,a)||onSegment(c,d,b)) return false;
    }
    return foodForestArea(boundary) > 2;
}
