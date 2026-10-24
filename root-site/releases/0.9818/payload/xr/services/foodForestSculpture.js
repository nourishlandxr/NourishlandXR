import * as THREE from "../vendor/three.module.min.js?v=0.9818";

let grainTexture=null,grainUsers=0;
function organicGrain(){
    if(!grainTexture){const size=128,data=new Uint8Array(size*size*4),hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);},noise=(x,y)=>{const a=Math.floor(x),b=Math.floor(y),u=x-a,v=y-b,s=u*u*(3-2*u),t=v*v*(3-2*v);return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(a,b),hash(a+1,b),s),THREE.MathUtils.lerp(hash(a,b+1),hash(a+1,b+1),s),t);};
        for(let y=0;y<size;y++)for(let x=0;x<size;x++){const value=Math.round(255*(.48*noise(x/8,y/8)+.34*noise(x/3,y/3)+.18*hash(x,y))),i=(y*size+x)*4;data.set([value,value,value,255],i);}grainTexture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);grainTexture.wrapS=grainTexture.wrapT=THREE.RepeatWrapping;grainTexture.magFilter=THREE.LinearFilter;grainTexture.minFilter=THREE.LinearMipmapLinearFilter;grainTexture.generateMipmaps=true;grainTexture.needsUpdate=true;}
    grainUsers++;return grainTexture;
}
function releaseGrain(){if(--grainUsers===0){grainTexture?.dispose();grainTexture=null;}}

// Small closed leaf sculptures: a folded midrib, lifted edge and pointed tip.
// Geometry carries the finish, so no image, normal-map or transmission pass is needed.
export function sculptedLeafGeometry(heart=false,character=0){
    const rows=6,cols=2,positions=[],indices=[];
    for(let side=0;side<2;side++)for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++){
        const t=row/rows,u=col/cols*2-1,w=Math.pow(Math.sin(Math.PI*t),heart?.58:.8)*(heart?1.2-t*.45:1)*(1+Math.sin(t*7+character)*.05),fold=(1-Math.abs(u))*.12*Math.sin(Math.PI*t),curl=t*t*(.15+.04*Math.sin(character));
        positions.push(u*w*(u<0?.95:1.025)+Math.sin(Math.PI*t)*.035*Math.sin(character),t,fold+curl+(side?-.014:.014));
    }
    const stride=cols+1,sideSize=(rows+1)*stride;
    for(let side=0;side<2;side++)for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
        const a=side*sideSize+r*stride+c,b=a+1,d=a+stride,e=d+1;
        indices.push(...(side?[a,d,b,b,d,e]:[a,b,d,b,e,d]));
    }
    const edge=[];for(let c=0;c<=cols;c++)edge.push(c);for(let r=1;r<=rows;r++)edge.push(r*stride+cols);for(let c=cols-1;c>=0;c--)edge.push(rows*stride+c);for(let r=rows-1;r>0;r--)edge.push(r*stride);
    for(let i=0;i<edge.length;i++){const a=edge[i],b=edge[(i+1)%edge.length];indices.push(a,b,a+sideSize,b,b+sideSize,a+sideSize);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}

export function createForestSculpture({seed=0}={}){
    const parts=[],materials=[],geometries=[],textures=[],group=new THREE.Group();
    let state=2166136261;for(const c of String(seed))state=Math.imul(state^c.charCodeAt(0),16777619);const character=(state>>>0)/4294967296*30;
    function random(){state+=0x6D2B79F5;let n=state;n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);return((n^(n>>>14))>>>0)/4294967296;}
    function part(geometry,color,x=0,y=0,z=0,sx=1,sy=1,sz=1,unfold=false){
        const object=new THREE.Object3D();object.position.set(x,y,z);object.scale.set(sx,sy,sz);parts.push({geometry,color:new THREE.Color(color),object,unfold});return object;
    }
    function leaf(base,tip,width,color,heart=false){
        const start=new THREE.Vector3(...base),end=new THREE.Vector3(...tip),direction=end.clone().sub(start),o=part(sculptedLeafGeometry(heart,character+parts.length*.7),color,...base,width,direction.length(),width,true);
        o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());return o;
    }
    function leafCell(base,tip,width,color){
        const positions=[],indices=[],rows=9,radial=10,phase=character+parts.length;
        for(let r=0;r<=rows;r++){const t=r/rows,w=Math.max(.004,Math.pow(Math.sin(Math.PI*t),.58)*(1.1-t*.25));for(let c=0;c<=radial;c++){const a=c/radial*Math.PI*2,s=Math.sin(a),ridge=Math.pow(Math.max(0,s),12)*.025*w;positions.push(Math.cos(a)*w+Math.sin(Math.PI*t)*.06*Math.sin(t*4+phase),t,.40*s*w+.14*Math.sin(Math.PI*t)+.09*t*t+ridge);}}
        for(let r=0;r<rows;r++)for(let c=0;c<radial;c++){const a=r*(radial+1)+c,b=a+1,d=a+radial+1,e=d+1;indices.push(a,d,b,b,d,e);}
        const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
        const delta=new THREE.Vector3(...tip).sub(new THREE.Vector3(...base)),o=part(geo,color,...base,width,delta.length(),width,true);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return o;
    }
    function branch(points,radius,color,tipRadius=.24){
        const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),segments=Math.max(5,points.length*2),radial=5,geo=new THREE.TubeGeometry(curve,segments,radius,radial,false),p=geo.attributes.position;
        for(let r=0;r<=segments;r++){const center=curve.getPointAt(r/segments),scale=(1-(1-tipRadius)*r/segments)*(1+.045*Math.sin(r*1.7+character));for(let c=0;c<=radial;c++){const i=r*(radial+1)+c,v=new THREE.Vector3().fromBufferAttribute(p,i).sub(center).multiplyScalar(scale).add(center);p.setXYZ(i,v.x,v.y,v.z);}}
        geo.computeVertexNormals();return part(geo,color);
    }
    function fruit(x,y,z,rx,ry,rz,color,shape=0){
        const geo=new THREE.SphereGeometry(1,10,7),p=geo.attributes.position;
        for(let i=0;i<p.count;i++){const a=p.getX(i),b=p.getY(i),c=p.getZ(i),ridge=1+Math.cos(Math.atan2(c,a)*5)*.035*(1-b*b),waist=shape===1?1-b*.32:shape===2?1+.14*Math.sin(b*7):1;p.setXYZ(i,a*ridge*waist,b,c*ridge*waist);}
        geo.computeVertexNormals();return part(geo,color,x,y,z,rx,ry,rz,true);
    }
    function crown(x,y,z,rx,ry,rz,color,seed=0){
        const geo=new THREE.SphereGeometry(1,12,7),p=geo.attributes.position;
        for(let i=0;i<p.count;i++){const a=p.getX(i),b=p.getY(i),c=p.getZ(i),angle=Math.atan2(c,a),w=1+.065*Math.sin(angle*3+b*3+seed)+.035*Math.cos(angle*5-b*2);p.setXYZ(i,a*w,b+.045*Math.sin(a*3+seed)*Math.cos(c*3),c*w);}
        geo.computeVertexNormals();return part(geo,color,x,y,z,rx,ry,rz,true);
    }
    function blossom(center,radius,color,heartColor){
        for(let i=0;i<5;i++){const a=i/5*Math.PI*2;leaf(center,[center[0]+Math.sin(a)*radius,center[1]+radius*.15,center[2]+Math.cos(a)*radius],radius*.36,color);}
        fruit(center[0],center[1]+.012,center[2],radius*.2,radius*.15,radius*.2,heartColor);
    }
    function finish({planted=false,size=1}={}){
        const positions=[],normals=[],colors=[],closed=[],uvs=[];
        for(let n=0;n<parts.length;n++){
            const{geometry:source,color,object,unfold}=parts[n];object.updateMatrix();const geo=source.index?source.toNonIndexed():source,position=geo.attributes.position,normal=geo.attributes.normal,normalMatrix=new THREE.Matrix3().getNormalMatrix(object.matrix);
            for(let i=0;i<position.count;i++){
                const local=new THREE.Vector3().fromBufferAttribute(position,i),open=local.clone().applyMatrix4(object.matrix),bud=local.clone();if(unfold){bud.x*=.16;bud.z*=.16;bud.y*=.42;}bud.applyMatrix4(object.matrix);
                const vNormal=new THREE.Vector3().fromBufferAttribute(normal,i).applyMatrix3(normalMatrix).normalize(),grain=Math.sin(local.x*13+local.y*11+local.z*7+n*4.7+character)*.035,shade=.94+.06*Math.max(0,vNormal.y)+grain,c=color.clone().multiplyScalar(shade);
                positions.push(open.x,open.y,open.z);closed.push(bud.x,bud.y,bud.z);normals.push(vNormal.x,vNormal.y,vNormal.z);colors.push(c.r,c.g,c.b);
                const uv=geo.attributes.uv;uvs.push(uv?uv.getX(i):local.x+local.z*.4,uv?uv.getY(i):local.y+local.z*.25);
            }
            geo.dispose();if(geo!==source)source.dispose();
        }
        const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
        if(planted)geometry.morphAttributes.position=[new THREE.Float32BufferAttribute(closed,3)];geometry.computeBoundingSphere();geometries.push(geometry);
        const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.99,metalness:0,bumpMap:organicGrain(),bumpScale:.005});materials.push(material);const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);group.scale.setScalar(size);let disposed=false;
        return {group,materials,geometries,textures,reveal(amount){if(mesh.morphTargetInfluences)mesh.morphTargetInfluences[0]=1-THREE.MathUtils.clamp(amount,0,1);},dispose(){if(disposed)return;disposed=true;geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());releaseGrain();group.removeFromParent();}};
    }
    return {group,part,leaf,leafCell,branch,fruit,crown,blossom,finish,random};
}
