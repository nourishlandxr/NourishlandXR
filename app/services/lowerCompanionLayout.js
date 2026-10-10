// Independently opened lower panels share a row beneath the reader. Their top
// edges align; none replaces another panel or occupies another panel's slot.
export function lowerCompanionLayout(pose,{mainWidth,mainHeight,panels,gap=.035}){
 if(!pose)return [];
 const width=mainWidth*(panels.length>1?.72:1);
 return panels.map((panel,index)=>{
  const height=width*panel.height/1000,x=(index-(panels.length-1)/2)*(width+gap),y=-(mainHeight+height)/2-gap;
  return {...pose,width,height,id:panel.id,center:{x:pose.center.x+pose.right.x*x+pose.up.x*y,y:pose.center.y+pose.right.y*x+pose.up.y*y,z:pose.center.z+pose.right.z*x+pose.up.z*y}};
 });
}
