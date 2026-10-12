// Each task starts with a fresh release; both controllers must participate.
export function createWelcomeControlWarmup(){
 let phase='',previous=new Map(),done=new Set(),turns=new Map();
 function reset(id){phase=id;previous.clear();done.clear();turns.clear();}
 function update(id,inputs){if(id!==phase)reset(id);for(const input of inputs){const source=input.source,side=source?.handedness;if(source?.hand || !['left','right'].includes(side))continue;
 const pressed=id==='controls-trigger'?Boolean(input.trigger):Boolean(input.down),before=previous.get(side);
 if(id==='controls-stick'){const axes=source.gamepad?.axes || [],offset=axes.length>=4?2:0,x=axes[offset] || 0,y=axes[offset+1] || 0;if(Math.hypot(x,y)>.45){const quadrant=(x>=0?1:0)+(y>=0?2:0);turns.set(side,(turns.get(side)||0)|(1<<quadrant));if(turns.get(side)===15)done.add(side);}}
 else if(before===false && pressed)done.add(side);previous.set(side,pressed);
 }return done.has('left') && done.has('right');}
 return {update,reset,snapshot:()=>({phase,completed:[...done]})};
}
