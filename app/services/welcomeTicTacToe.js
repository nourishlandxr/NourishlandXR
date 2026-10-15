import * as THREE from '../assets/fruit-window/vendor/three.module.js';

export const TIC_LINES=Object.freeze([[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]);
export const ticWinner=cells=>TIC_LINES.map(line=>line.map(i=>cells[i])).find(([a,b,c])=>a && a===b && b===c)?.[0] || null;
export function ticReplyMove(cells){
    for(const mark of ['O','X'])for(let i=0;i<9;i++)if(!cells[i]){const copy=cells.slice();copy[i]=mark;if(ticWinner(copy)===mark)return i;}
    return [4,0,2,6,8,1,3,5,7].find(i=>!cells[i]);
}

// Board-relative slots and real pieces share one pose, including while carried.
export function createWelcomeTicTacToe(root,{onFeedback=()=>{},onChange=()=>{}}={}){
    const board=new THREE.Group();board.name='Hand-tracked Tic-Tac-Toe board';board.position.set(0,.018,.10);root.add(board);
    const materials=['#9b7147','#68482f','#dce5d9','#b8d4d5','#d8eabb'].map(color=>new THREE.MeshStandardMaterial({color,roughness:.8}));
    const mesh=(geometry,material,parent=board)=>{const node=new THREE.Mesh(geometry,materials[material]);parent.add(node);return node;};
    mesh(new THREE.BoxGeometry(.64,.022,.64),0);
    for(const value of [-.105,.105]){const x=mesh(new THREE.BoxGeometry(.007,.006,.61),1);x.position.set(value,.015,0);const z=mesh(new THREE.BoxGeometry(.61,.006,.007),1);z.position.set(0,.015,value);}
    const handle=mesh(new THREE.TorusGeometry(.047,.007,8,24),4);handle.name='Carry or turn game board';handle.rotation.x=-Math.PI/2;handle.position.set(0,.025,.34);
    const pieces=[];let cells=Array(9).fill(null),turn='X',replyAt=null,time=0,finished=false,lastRejected=false;
    const holds=new Map(),previous=new Map(),inverse=new THREE.Matrix4();
    for(const mark of ['X','O'])for(let i=0;i<5;i++){
        const group=new THREE.Group();group.name='Tic piece '+mark+' '+i;root.add(group);
        if(mark==='X')for(const angle of [-Math.PI/4,Math.PI/4]){const bar=mesh(new THREE.BoxGeometry(.013,.012,.078),2,group);bar.rotation.y=angle;}
        else {const ring=mesh(new THREE.TorusGeometry(.029,.006,8,28),3,group);ring.rotation.x=-Math.PI/2;}
        const home=new THREE.Vector3(mark==='X'?-.46:.46,.025,-.27+i*.13);group.position.copy(home);pieces.push({id:mark+i,mark,mesh:group,home,cell:null});
    }
    const center=index=>new THREE.Vector3((index%3-1)*.21,.028,(Math.floor(index/3)-1)*.21);
    function place(index,piece,source){
        if(finished || turn!=='X' || !piece || piece.mark!=='X' || piece.cell!==null || !Number.isInteger(index) || index<0 || index>8 || cells[index])return false;
        cells[index]='X';piece.cell=index;board.attach(piece.mesh);piece.mesh.position.copy(center(index));piece.mesh.quaternion.identity();
        onFeedback('collect',source);finished=Boolean(ticWinner(cells) || cells.every(Boolean));turn=finished?'complete':'O';replyAt=finished?null:time+.65;lastRejected=false;onChange();return true;
    }
    function release(source,apply=true){
        const hold=holds.get(source);if(!hold)return;holds.delete(source);
        if(hold.kind==='board')return;
        const piece=hold.piece;board.updateWorldMatrix(true,false);const point=board.worldToLocal(piece.mesh.getWorldPosition(new THREE.Vector3()));
        const col=Math.round(point.x/.21)+1,row=Math.round(point.z/.21)+1,index=row*3+col;
        if(apply && col>=0 && col<3 && row>=0 && row<3 && point.y>-.035 && point.y<.15 && place(index,piece,source))return;
        root.attach(piece.mesh);piece.mesh.position.copy(piece.home);piece.mesh.quaternion.identity();lastRejected=apply;onFeedback('release',source);onChange();
    }
    function reset(){
        holds.clear();previous.clear();cells=Array(9).fill(null);turn='X';replyAt=null;finished=lastRejected=false;board.position.set(0,.018,.10);board.quaternion.identity();
        for(const piece of pieces){root.attach(piece.mesh);piece.cell=null;piece.mesh.position.copy(piece.home);piece.mesh.quaternion.identity();}onChange();
    }
    function update(dt,inputs=[]){
        time+=Math.min(.06,Math.max(0,dt));root.updateMatrixWorld(true);inverse.copy(root.matrixWorld).invert();
        const usable=inputs.filter(input=>input.matrix && !input.uiBlocked);
        for(const source of holds.keys())if(!usable.some(i=>i.source===source))release(source,false);
        for(const source of previous.keys())if(!usable.some(i=>i.source===source))previous.delete(source);
        if(dt<=0)return;
        for(const input of usable){const pose=new THREE.Matrix4().fromArray(input.matrix);if(input.source.hand && input.pinchPoint)pose.setPosition(input.pinchPoint.x,input.pinchPoint.y,input.pinchPoint.z);pose.premultiply(inverse);const point=new THREE.Vector3().setFromMatrixPosition(pose),down=Boolean(input.source.hand?input.trigger:input.down),before=previous.get(input.source);let hold=holds.get(input.source);
            if(hold && !down){release(input.source,true);hold=null;}
            if(!hold && down && before===false){
                const handlePoint=root.worldToLocal(handle.getWorldPosition(new THREE.Vector3()));
                if(point.distanceTo(handlePoint)<.065 && ![...holds.values()].some(h=>h.kind==='board'))hold={kind:'board',mesh:board};
                else if(turn==='X' && !finished){const occupied=new Set([...holds.values()].map(h=>h.piece));const piece=pieces.filter(p=>p.mark==='X' && p.cell===null && !occupied.has(p)).find(p=>point.distanceTo(root.worldToLocal(p.mesh.getWorldPosition(new THREE.Vector3())))<.055);if(piece)hold={kind:'piece',piece,mesh:piece.mesh};}
                if(hold){root.attach(hold.mesh);hold.offset=pose.clone().invert().multiply(hold.mesh.matrix);holds.set(input.source,hold);onFeedback('grab',input.source);}
            }
            if(hold){const next=pose.clone().multiply(hold.offset);next.decompose(hold.mesh.position,hold.mesh.quaternion,hold.mesh.scale);hold.mesh.updateMatrixWorld(true);}
            previous.set(input.source,down);
        }
        if(replyAt!==null && time>=replyAt){const index=ticReplyMove(cells),piece=pieces.find(p=>p.mark==='O' && p.cell===null);replyAt=null;
            if(index!==undefined && piece){cells[index]='O';piece.cell=index;board.attach(piece.mesh);piece.mesh.position.copy(center(index));piece.mesh.quaternion.identity();onFeedback('control');}
            finished=Boolean(ticWinner(cells) || cells.every(Boolean));turn=finished?'complete':'X';onChange();
        }
    }
    const hints=()=>finished?[ticWinner(cells)==='X'?'You got three in a row!':ticWinner(cells)==='O'?'Zinnia got three in a row!':'A lovely draw.','Would you like to play again?']:turn==='O'?['Zinnia’s turn.']: [lastRejected?'That square is occupied. Try another.':'Your turn. Pick up an X and place it in an empty square.','Pinch to hold; open your fingers to place.'];
    return {board,pieces,update,reset,hints,place,releaseAll(){for(const source of holds.keys())release(source,false);},isHolding:source=>holds.has(source),targets:()=>[],picked(){},moved(){},released(){},act(){},snapshot:()=>({asset:'ready',cells:cells.slice(),turn,winner:ticWinner(cells),draw:finished && !ticWinner(cells),finished,held:holds.size,lastRejected}),destroy(){board.removeFromParent();for(const piece of pieces)piece.mesh.removeFromParent();const geometry=new Set();board.traverse(n=>{if(n.geometry)geometry.add(n.geometry);});for(const piece of pieces)piece.mesh.traverse(n=>{if(n.geometry)geometry.add(n.geometry);});geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
