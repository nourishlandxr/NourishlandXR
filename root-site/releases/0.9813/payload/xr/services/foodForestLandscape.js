import * as THREE from "../vendor/three.module.min.js?v=0.9813";
import {boardPointInside} from "./foodForestBoardModel.js?v=0.9813";
import {TERRAIN_COLS,TERRAIN_ROWS,forestSurfaceY,forestConnections,forestDisplayDiameter,PLAN_HEIGHTS} from "./foodForestV3Model.js?v=0.9813";
export function createFoodForestLandscape(parent){
    const group=new THREE.Group();group.name='forest-landscape-v3';parent.add(group);let terrainMesh=null;
    const surface=new THREE.MeshStandardMaterial({vertexColors:true,transparent:true,opacity:.46,depthWrite:false,side:THREE.DoubleSide,roughness:1}),contour=new THREE.LineBasicMaterial({color:0xc4d7a1,transparent:true,opacity:.55}),pathMat=new THREE.MeshStandardMaterial({color:0xd7b275,roughness:1,side:THREE.DoubleSide}),water=new THREE.MeshStandardMaterial({color:0x62c2d1,emissive:0x123a40,emissiveIntensity:.2,roughness:.5,side:THREE.DoubleSide}),bank=new THREE.MeshStandardMaterial({color:0x558d7c,roughness:1,side:THREE.DoubleSide}),relationship=new THREE.LineDashedMaterial({color:0xe2bd79,dashSize:.06,gapSize:.04}),shadow=new THREE.MeshBasicMaterial({color:0x102b22,transparent:true,opacity:.2,depthWrite:false,side:THREE.DoubleSide});
    const materials=[surface,contour,pathMat,water,bank,relationship,shadow];
    function clear(){group.traverse(o=>o.geometry?.dispose());group.clear();terrainMesh=null;}
    function update(state,{selected='',database=null}={}){
        clear();
        const vertices=[],contours=[],points=[];
        for(let row=0;row<TERRAIN_ROWS;row++)for(let col=0;col<TERRAIN_COLS;col++){const x=-3+col/(TERRAIN_COLS-1)*6,z=-2+row/(TERRAIN_ROWS-1)*4;points.push(new THREE.Vector3(x,forestSurfaceY(state,x,z),z));}
        const changed=state.terrain.heights.some(h=>Math.abs(h)>.001);
        function triangle(a,b,c){
            if(![a,b,c].every(v=>boardPointInside(v,state.boundary)))return;
            vertices.push(...a.toArray(),...b.toArray(),...c.toArray());
            if(!changed)return;
            for(let metres=-2;metres<=5;metres++){const y=.16+metres*6/state.widthM,hits=[];for(const[v,w]of [[a,b],[b,c],[c,a]])if((v.y<y&&w.y>=y)||(w.y<y&&v.y>=y))hits.push(v.clone().lerp(w,(y-v.y)/(w.y-v.y)).add(new THREE.Vector3(0,.004,0)));if(hits.length===2)contours.push(...hits[0].toArray(),...hits[1].toArray());}
        }
        for(let row=0;row<TERRAIN_ROWS-1;row++)for(let col=0;col<TERRAIN_COLS-1;col++){const a=points[row*TERRAIN_COLS+col],b=points[row*TERRAIN_COLS+col+1],c=points[(row+1)*TERRAIN_COLS+col],d=points[(row+1)*TERRAIN_COLS+col+1];triangle(a,c,b);triangle(b,c,d);}
        const colors=[],low=new THREE.Color(state.scenario==='dry'?0x9f824f:0x3a806b),high=new THREE.Color(state.scenario==='dry'?0xd5b475:0xb3c58b);for(let i=0;i<vertices.length;i+=3){const variation=Math.sin(vertices[i]*2.3+vertices[i+2]*1.9)*.06,c=low.clone().lerp(high,THREE.MathUtils.clamp(.2+(vertices[i+1]-.16)*.8+variation,0,1));colors.push(c.r,c.g,c.b);}
        const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();terrainMesh=new THREE.Mesh(geometry,surface);terrainMesh.visible=changed||state.scenario==='dry';group.add(terrainMesh);
        if(contours.length){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(contours,3));group.add(new THREE.LineSegments(geo,contour));}
        for(const stroke of state.paths){
            const path=stroke.points.filter(p=>boardPointInside(p,state.boundary)).map(p=>new THREE.Vector3(p.x,0,p.z));if(path.length<2)continue;
            const curve=new THREE.CatmullRomCurve3(path,false,'centripetal'),steps=Math.min(128,Math.max(20,path.length*3));
            function ribbon(width,lift,material){const verts=[];for(let i=0;i<steps;i++){const ends=[];for(const t of[i/steps,(i+1)/steps]){const p=curve.getPoint(t),d=curve.getTangent(t),normal=new THREE.Vector3(-d.z,0,d.x).normalize().multiplyScalar(width);for(const sign of[-1,1]){const x=p.x+normal.x*sign,z=p.z+normal.z*sign;ends.push(new THREE.Vector3(x,forestSurfaceY(state,x,z)+lift,z));}}for(const j of[0,2,1,1,2,3])verts.push(...ends[j].toArray());}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.computeVertexNormals();group.add(new THREE.Mesh(geo,material));}
            if(stroke.kind==='water')ribbon(.085,.022,bank);
            ribbon(stroke.kind==='water'?.055:.045,.029,stroke.kind==='water'?water:pathMat);
        }
        for(const landmark of (state.mapImport?.original?.elements||[]).slice(0,160)){
            if(!['house','shed','shelter','pond','water-tank','garden-bed','compost','orb','totem','note','gate'].includes(landmark.type)||!Number.isFinite(landmark.x)||!Number.isFinite(landmark.z))continue;
            const x=landmark.x/6.3*3,z=landmark.z/6.3*2;if(!boardPointInside({x,z},state.boundary))continue;const y=forestSurfaceY(state,x,z);
            const wet=['pond','water-tank'].includes(landmark.type),geo=wet?new THREE.SphereGeometry(.15,10,6):new THREE.BoxGeometry(.22,.15,.18),symbol=new THREE.Mesh(geo,wet?water:pathMat);symbol.position.set(x,y+.075,z);if(wet)symbol.scale.y=landmark.type==='pond'?.15:1;group.add(symbol);
            if(['house','shed','shelter'].includes(landmark.type)){const roof=new THREE.Mesh(new THREE.ConeGeometry(.2,.13,4),pathMat);roof.position.set(x,y+.21,z);roof.rotation.y=Math.PI/4;group.add(roof);}
        }
        for(const connection of forestConnections(state,selected,database)){
            const a=state.pieces.find(p=>p.id===connection.from),b=state.pieces.find(p=>p.id===connection.to);if(!a||!b)continue;
            const start=new THREE.Vector3(a.x,forestSurfaceY(state,a.x,a.z)+.1,a.z),end=new THREE.Vector3(b.x,forestSurfaceY(state,b.x,b.z)+.1,b.z),middle=start.clone().lerp(end,.5);middle.y+=.22;
            const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(new THREE.QuadraticBezierCurve3(start,middle,end).getPoints(20)),relationship);line.computeLineDistances();group.add(line);
        }
        if(state.scenario==='shade')for(const item of state.pieces){const diameter=forestDisplayDiameter(state,item);if(!diameter)continue;const h=item.plannedHeightM||PLAN_HEIGHTS[item.layer],offset=Math.min(8,h/Math.tan(state.sunAngle*Math.PI/180))*6/state.widthM;const mesh=new THREE.Mesh(new THREE.CircleGeometry(.5,24),shadow);mesh.rotation.x=-Math.PI/2;mesh.scale.set(diameter*6/state.widthM,diameter*4/state.depthM,1);mesh.position.set(item.x+offset,forestSurfaceY(state,item.x,item.z)+.012,item.z);group.add(mesh);}
    }
    return {group,update,get terrainMesh(){return terrainMesh;},dispose(){clear();materials.forEach(m=>m.dispose());group.removeFromParent();}};
}
