export function demoTotemHeightForScreen(ground,screenCenterY){
 return Math.max(.46,Math.min(2,(screenCenterY-ground)/2));
}
// Preserve each Area object's relative height, including an already open PIM.
export function shiftDemoAreaToFloor(records,base){
 const deltas=new Map();
 for(const record of records){if(record.demoType!=='zone')continue;
  const old=Number.isFinite(record.groundBaseY)?record.groundBaseY:record.position.y-(record.demoHalfHeight || 1);
  deltas.set(record.id,base-old);record.groundBaseY=base;record.position.y+=base-old;record.totemCardsRefreshed=0;
 }
 for(const record of records){if(record.demoType==='zone' || !deltas.has(record.demoAreaId))continue;
  const delta=deltas.get(record.demoAreaId),positions=new Set([record.position,record.informationPosition,record.informationPose?.position,record.informationPose?.center]);
  for(const point of positions)if(point && Number.isFinite(point.y))point.y+=delta;
 }
}
