// Session-relative reading layout. Never interpreted as saved site coordinates.
export function readingPositions(pose, count) {
    const matrix=pose.transform.matrix;
    const origin=pose.transform.position;
    return Array.from({length:Math.min(count,7)},(_,i)=>{
        const angle=(i-(Math.min(count,7)-1)/2)*.28;
        const x=Math.sin(angle)*1.65,z=-Math.cos(angle)*1.65;
        return {x:origin.x+matrix[0]*x+matrix[8]*z,y:origin.y-.15,z:origin.z+matrix[2]*x+matrix[10]*z};
    });
}
export function hitReadingPlant(matrix, positions, radius=.14) {
    const origin={x:matrix[12],y:matrix[13],z:matrix[14]};
    const direction={x:-matrix[8],y:-matrix[9],z:-matrix[10]};
    let nearest=-1,best=Infinity;
    positions.forEach((p,index)=>{
        const delta={x:p.x-origin.x,y:p.y-origin.y,z:p.z-origin.z};
        const distance=delta.x*direction.x+delta.y*direction.y+delta.z*direction.z;
        if(distance<=0)return;
        const perpendicular=Math.hypot(delta.x-distance*direction.x,delta.y-distance*direction.y,delta.z-distance*direction.z);
        if(perpendicular<=radius && distance<best){best=distance;nearest=index;}
    });
    return nearest;
}
export function visitorTrackingCopy(tracked, count) {
    return tracked ? `Tracking ready · ${count} plants in this reading space. Site positions are not aligned.` : 'Tracking paused. Hold still, then look around slowly.';
}
