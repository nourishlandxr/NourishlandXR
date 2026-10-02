// Shared destination selection for desktop, touch and XR Totem boards.
export function selectTotemSign(record,cardId,records=[]){
    const next=record.totemSelectedCard===cardId?'':cardId;
    if(next)for(const other of records)if(other!==record)other.totemSelectedCard='';
    record.totemSelectedCard=next;
    return next;
}

export function selectedTotemDestinationIds(records,cardsFor,isActive=()=>true){
    const targets=new Set();
    for(const record of records){
        if(!record.totemSelectedCard || !isActive(record))continue;
        const card=cardsFor(record).find(item=>item.id===record.totemSelectedCard);
        for(const id of card?.references || [])if(id)targets.add(id);
        if(card?.navigation?.destinationId)targets.add(card.navigation.destinationId);
    }
    return targets;
}

export const SIGN_DESTINATION_HIGHLIGHT=Object.freeze({color:Object.freeze([.98,.88,.61,.94]),inset:.95,padding:1.12});
const buffers=new WeakMap();
const unitShapes=Object.fromEntries(['ellipse','box'].map(shape=>{
    const points=[];
    for(let i=0;i<=32;i++){
        const a=i*Math.PI/16,c=Math.cos(a),s=Math.sin(a);
        points.push(shape==='box'?[Math.sign(c)*Math.pow(Math.abs(c),.35),Math.sign(s)*Math.pow(Math.abs(s),.35)]:[c,s]);
    }
    return [shape,points];
}));

// A local, steady outline: no added ray target, pulsing, or fullscreen effect.
export function drawSignDestinationHighlight(gl,renderer,view,center,{width,height,shape='ellipse'}={}){
    if(!renderer || !center || !width || !height || !view?.transform?.matrix)return;
    let vertices=buffers.get(renderer);
    if(!vertices){vertices=new Float32Array(32*6*3);buffers.set(renderer,vertices);}
    const m=view.transform.matrix,points=unitShapes[shape] || unitShapes.ellipse;
    const w=width*.5*SIGN_DESTINATION_HIGHLIGHT.padding,h=height*.5*SIGN_DESTINATION_HIGHLIGHT.padding;
    const centerX=center.x+m[8]*.012,centerY=center.y+m[9]*.012,centerZ=center.z+m[10]*.012;
    let offset=0;
    for(let i=0;i<32;i++)for(let vertex=0;vertex<6;vertex++){
        const point=points[i+(vertex===1 || vertex===4 || vertex===5?1:0)],inner=vertex===2 || vertex===3 || vertex===5;
        const scale=inner?SIGN_DESTINATION_HIGHLIGHT.inset:1,x=point[0]*w*scale,y=point[1]*h*scale;
        vertices[offset++]=centerX+m[0]*x+m[4]*y;
        vertices[offset++]=centerY+m[1]*x+m[5]*y;
        vertices[offset++]=centerZ+m[2]*x+m[6]*y;
    }
    gl.useProgram(renderer.program);gl.bindBuffer(gl.ARRAY_BUFFER,renderer.buffer);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(renderer.positionLocation);gl.vertexAttribPointer(renderer.positionLocation,3,gl.FLOAT,false,12,0);
    gl.uniformMatrix4fv(renderer.projectionLocation,false,view.projectionMatrix);gl.uniformMatrix4fv(renderer.viewLocation,false,view.transform.inverse.matrix);
    gl.uniform4fv(renderer.colorLocation,SIGN_DESTINATION_HIGHLIGHT.color);
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.CULL_FACE);
    gl.depthMask(false);gl.drawArrays(gl.TRIANGLES,0,vertices.length/3);gl.depthMask(true);
}
