// Each task starts with a fresh release; both controllers must participate.
export function createWelcomeControlWarmup({onPress=()=>{}}={}){
 let phase='',previous=new Map(),done=new Set(),turns=new Map();
 function reset(id){phase=id;previous.clear();done.clear();turns.clear();}
 function update(id,inputs){if(!['controls-trigger','controls-grip','controls-stick','controls-stick-click','controls-face-first','controls-face-second'].includes(id))return false;if(id!==phase)reset(id);if(id.startsWith('controls-face-') && inputs.some(i=>i.source.gamepad?.buttons?.[4]?.pressed && i.source.gamepad?.buttons?.[5]?.pressed)){for(const i of inputs)previous.set(i.source.handedness,Boolean(i.source.gamepad?.buttons?.[id==='controls-face-first'?4:5]?.pressed));return false;}for(const input of inputs){const source=input.source,side=source?.handedness;if(source?.hand || !['left','right'].includes(side))continue;
 const pressed=id==='controls-trigger'?Boolean(input.trigger):id==='controls-stick-click'?Boolean(source.gamepad?.buttons?.[3]?.pressed):id==='controls-face-first'?Boolean(source.gamepad?.buttons?.[4]?.pressed):id==='controls-face-second'?Boolean(source.gamepad?.buttons?.[5]?.pressed):Boolean(input.down),before=previous.get(side);
 if(id==='controls-stick'){if(side==='left' && !done.has('right'))continue;const axes=source.gamepad?.axes || [],offset=axes.length>=4?2:0,x=axes[offset] || 0,y=axes[offset+1] || 0;if(Math.hypot(x,y)>.45){const quadrant=(x>=0?1:0)+(y>=0?2:0);const old=turns.get(side)||0;turns.set(side,old|(1<<quadrant));if(!(old&(1<<quadrant)))onPress(source);const mask=turns.get(side);if(side==='right'?mask===15:(mask&3)===3 || (mask&12)===12)done.add(side);}}
 else if(before===false && pressed && !done.has(side)){done.add(side);onPress(source);}previous.set(side,pressed);
 }return done.has('left') && done.has('right');}
 return {update,reset,snapshot:()=>({phase,completed:[...done]})};
}
