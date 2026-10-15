import {MARKING_BRUSHES,createMarkingEffects} from './creatorMarkingBrushes.js';
import * as THREE from '../assets/fruit-window/vendor/three.module.js';

export const PAINT_V2_COLOURS=['#86e7d0','#e8a1d0','#ffd47c','#9eb8ff','#ffffff','#263b32','#ed795c','#b39add'];
export const PAINT_V2_WIDTHS=[.002,.005,.01];
const finite=p=>p && [p.x,p.y,p.z].every(Number.isFinite);
// Shared by the demo and Creator. Rounded, resampled strokes use two GPU
// instance batches, regardless of colour or the number of finished strokes.
export function createSpatialPaintV2({capacity=8192,onChange=()=>{},markings=false}={}){
    const root=new THREE.Group();root.name='Spatial Paint V2';
    const material=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.65,metalness:0});
    const tubeGeometry=new THREE.CylinderGeometry(1,1,1,16,1,true),capGeometry=new THREE.SphereGeometry(1,12,6);
    const tubes=new THREE.InstancedMesh(tubeGeometry,material,capacity),caps=new THREE.InstancedMesh(capGeometry,material,capacity);
    for(const node of [tubes,caps]){node.count=0;node.frustumCulled=false;node.userData.livingMapDynamic=true;node.instanceMatrix.setUsage(THREE.DynamicDrawUsage);node.setColorAt(0,new THREE.Color('#ffffff'));root.add(node);}
    const strokes=[],redo=[],active=new Map(),up=new THREE.Vector3(0,1,0),matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3(),colourValue=new THREE.Color();
    const effects=createMarkingEffects(root,{eager:markings});
    let brush='plain',motion=true,colour=0,width=.005,pressure=1,limited=false,disposed=false;
    const snapshot=()=>({version:2,strokes:strokes.length,segments:tubes.count,points:caps.count,colour,width,brush,motion,effects:effects.snapshot(),canUndo:strokes.length>0,canRedo:redo.length>0,limited});
    function changed(){onChange(snapshot());}
    function emit(stroke,p,savedWidth){
        if(caps.count>=capacity || tubes.count>=capacity){if(!limited){limited=true;changed();}return false;}
        const previous=stroke.points.at(-1),point=new THREE.Vector3(p.x,p.y,p.z),pointWidth=savedWidth ?? stroke.width*pressure,radius=pointWidth/2;let particlePoint=point;
        if(stroke.brush==='spray'){
            const n=stroke.points.length+1,seed=n*12.9898+(Math.round(point.x*10000)*78.233)+(Math.round(point.z*10000)*37.719),random=k=>{const value=Math.sin(seed+k*19.19)*43758.5453;return value-Math.floor(value);};
            particlePoint=point.clone().add(new THREE.Vector3((random(1)-.5)*stroke.width*3.2,(random(2)-.5)*stroke.width*2.0,(random(3)-.5)*stroke.width*3.2));
        }else if(previous){const a=new THREE.Vector3(previous.x,previous.y,previous.z),d=point.clone().sub(a),length=d.length();if(length<.00001)return true;
            rotation.setFromUnitVectors(up,d.divideScalar(length));matrix.compose(a.add(point).multiplyScalar(.5),rotation,scale.set(radius,length,radius));tubes.setMatrixAt(tubes.count,matrix);tubes.setColorAt(tubes.count++,colourValue.set(stroke.colour));}
        matrix.compose(particlePoint,new THREE.Quaternion(),scale.setScalar(stroke.brush==='spray'?Math.max(.0007,radius*.55):radius));caps.setMatrixAt(caps.count,matrix);caps.setColorAt(caps.count++,colourValue.set(stroke.colour));
        stroke.points.push({x:point.x,y:point.y,z:point.z});(stroke.widths ||= []).push(pointWidth);for(const node of [tubes,caps]){node.instanceMatrix.needsUpdate=true;node.instanceColor.needsUpdate=true;}return true;
    }
    function sample(stroke,start,control,end){
        const length=start.distanceTo(control)+control.distanceTo(end),steps=Math.max(1,Math.ceil(length/Math.max(.0015,stroke.width*.75)));
        for(let i=1;i<=steps;i++){const t=i/steps,p=start.clone().multiplyScalar((1-t)**2).addScaledVector(control,2*(1-t)*t).addScaledVector(end,t*t);if(!emit(stroke,p))break;}
    }
    function begin(source,p){if(disposed || !finite(p) || active.has(source))return null;
        const stroke={brush,colour:PAINT_V2_COLOURS[colour],width,points:[],tubeStart:tubes.count,capStart:caps.count};if(!emit(stroke,p))return null;
        strokes.push(stroke);redo.length=0;active.set(source,{stroke,raw:new THREE.Vector3(p.x,p.y,p.z),filtered:new THREE.Vector3(p.x,p.y,p.z),mid:new THREE.Vector3(p.x,p.y,p.z)});changed();return stroke;
    }
    function end(source){const held=active.get(source);if(!held)return;sample(held.stroke,held.mid,held.filtered,held.raw);active.delete(source);effects.rebuild(strokes);changed();}
    function add(source,p,dt=1/60){if(!finite(p)){end(source);return;}let held=active.get(source);if(!held){begin(source,p);return;}
        const raw=new THREE.Vector3(p.x,p.y,p.z);if(raw.distanceTo(held.raw)>.18){end(source);begin(source,p);return;}held.raw.copy(raw);
        if(raw.distanceTo(held.filtered)<.00035)return;
        const next=held.filtered.clone().lerp(raw,1-Math.exp(-55*Math.max(.001,Math.min(.1,dt)))),mid=held.filtered.clone().add(next).multiplyScalar(.5);
        sample(held.stroke,held.mid,held.filtered,mid);held.filtered.copy(next);held.mid.copy(mid);
    }
    function endAll(){for(const source of [...active.keys()])end(source);}
    function rebuild(){tubes.count=caps.count=0;limited=false;for(const stroke of strokes){const points=stroke.points,widths=stroke.widths;stroke.points=[];stroke.widths=[];stroke.tubeStart=tubes.count;stroke.capStart=caps.count;for(let i=0;i<points.length;i++)emit(stroke,points[i],widths?.[i] ?? stroke.width);}effects.rebuild(strokes);changed();}
    function undo(){endAll();const stroke=strokes.pop();if(!stroke)return null;redo.push(stroke);rebuild();return stroke;}
    function redoStroke(){endAll();const stroke=redo.pop();if(!stroke)return null;strokes.push(stroke);rebuild();return stroke;}
    function clear(){active.clear();strokes.length=redo.length=0;tubes.count=caps.count=0;limited=false;effects.rebuild(strokes);changed();}
    function serialize(){endAll();return {version:2,units:'metres',motion,strokes:strokes.map(s=>({brush:s.brush || 'plain',colour:s.colour,width:s.width,widths:s.widths?.slice(),points:s.points.map(p=>({...p}))}))};}
    function restore(value){if(value?.version!==2 || !Array.isArray(value.strokes))throw Error('Choose a Paint V2 drawing.');let count=0;
        const validated=value.strokes.map(s=>{if(!/^#[0-9a-f]{6}$/i.test(s.colour) || !Number.isFinite(s.width) || s.width<.0005 || s.width>.05 || !Array.isArray(s.points) || !s.points.length || s.points.some(p=>!finite(p) || Math.max(Math.abs(p.x),Math.abs(p.y),Math.abs(p.z))>100) || (count+=s.points.length)>capacity)throw Error('Drawing has invalid strokes or exceeds the drawing budget.');if(s.brush && s.brush!=='plain' && !Object.hasOwn(MARKING_BRUSHES,s.brush))throw Error('Unknown marking brush.');if(s.widths && (!Array.isArray(s.widths) || s.widths.length!==s.points.length || s.widths.some(w=>!Number.isFinite(w) || w<.0005 || w>.1)))throw Error('Drawing has invalid pressure widths.');return {brush:s.brush || 'plain',colour:s.colour,width:s.width,widths:s.widths?.slice(),points:s.points.map(p=>({...p}))};});
        clear();motion=value.motion!==false;strokes.push(...validated);rebuild();return snapshot();
    }
    function pickStroke(ray,reach=.025){let best=null;for(const stroke of strokes)for(let i=0;i<stroke.points.length;i++){const p=new THREE.Vector3().copy(stroke.points[i]),q=ray.closestPointToPoint(p,new THREE.Vector3()),distance=p.distanceTo(q);if(distance<reach+stroke.width && (!best || ray.origin.distanceTo(q)<best.distance))best={stroke,distance:ray.origin.distanceTo(q)};}return best?.stroke || null;}
    function moveStroke(stroke,transform){if(!strokes.includes(stroke))return false;for(const p of stroke.points){const q=new THREE.Vector3().copy(p).applyMatrix4(transform);Object.assign(p,{x:q.x,y:q.y,z:q.z});}rebuild();return true;}
    function eraseBox(box){endAll();let count=0;for(let i=strokes.length-1;i>=0;i--){const stroke=strokes[i];let touch=stroke.points.some(p=>box.containsPoint(new THREE.Vector3().copy(p)));for(let j=1;!touch && j<stroke.points.length;j++){const a=new THREE.Vector3().copy(stroke.points[j-1]),d=new THREE.Vector3().copy(stroke.points[j]).sub(a),length=d.length();if(length>0){const hit=new THREE.Ray(a,d.divideScalar(length)).intersectBox(box,new THREE.Vector3());touch=Boolean(hit && hit.distanceTo(a)<=length);}}if(touch){redo.push(...strokes.splice(i,1));count++;}}if(count)rebuild();return count;}
    return {root,pickStroke,moveStroke,eraseBox,setPressure(value){pressure=THREE.MathUtils.clamp(Number(value)||1,1,4);},setBrush(value){if(value!=='plain' && !Object.hasOwn(MARKING_BRUSHES,value))return;endAll();brush=value;if(MARKING_BRUSHES[value])colour=MARKING_BRUSHES[value].colour;changed();},setMotion(value){motion=Boolean(value);changed();},update(time){effects.update(time,motion);},begin,add,end,endAll,undo,redo:redoStroke,clear,serialize,restore,snapshot,setColour(i){endAll();colour=Math.max(0,Math.min(PAINT_V2_COLOURS.length-1,Math.trunc(i)));changed();},setWidth(value){endAll();width=THREE.MathUtils.clamp(value,.001,.02);changed();},isDrawing:source=>active.has(source),destroy(){if(disposed)return;disposed=true;clear();effects.destroy();tubes.dispose();caps.dispose();tubeGeometry.dispose();capGeometry.dispose();material.dispose();root.removeFromParent();}};
}
