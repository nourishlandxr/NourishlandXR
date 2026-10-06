// XRReferenceSpaceEvent.transform maps the new space into the old space.
// Callers pass its inverse so placed content keeps its physical location.
export function rebaseXrPoint(point,matrix,direction=false){
    if(!point || !matrix)return point;
    const {x,y,z}=point,w=direction?0:1;
    Object.assign(point,{x:matrix[0]*x+matrix[4]*y+matrix[8]*z+matrix[12]*w,y:matrix[1]*x+matrix[5]*y+matrix[9]*z+matrix[13]*w,z:matrix[2]*x+matrix[6]*y+matrix[10]*z+matrix[14]*w});return point;
}
export function rebaseXrPose(pose,matrix){
    if(!pose)return;rebaseXrPoint(pose.position || pose.center,matrix);
    for(const key of ['right','up','normal','front'])rebaseXrPoint(pose[key],matrix,true);
}
export function rebaseXrMatrix(target,delta){
    if(!target || target.length!==16 || !delta)return;
    const prior=Array.from(target);
    for(let column=0;column<4;column++)for(let row=0;row<4;row++)target[column*4+row]=delta[row]*prior[column*4]+delta[4+row]*prior[column*4+1]+delta[8+row]*prior[column*4+2]+delta[12+row]*prior[column*4+3];
}
export function rebaseDemoRecords(records,matrix){
    if(!matrix || matrix.length!==16)return false;
    const seen=new Set(),point=value=>{if(value && !seen.has(value)){seen.add(value);rebaseXrPoint(value,matrix);}},pose=value=>{if(!value || seen.has(value))return;seen.add(value);point(value.position || value.center);for(const key of ['right','up','normal','front']){if(value[key] && !seen.has(value[key])){seen.add(value[key]);rebaseXrPoint(value[key],matrix,true);}}};
    for(const record of records){point(record.position);point(record.informationPosition);pose(record.informationPose);pose(record.knowledgeExplorePose);pose(record.knowledgeObjectPose);pose(record.demoPimPose);if(Number.isFinite(record.groundBaseY))record.groundBaseY+=matrix[13];if(Number.isFinite(record.rotationY))record.rotationY+=Math.atan2(matrix[8],matrix[10]);}
    return true;
}
