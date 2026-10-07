import * as THREE from '../vendor/three.module.min.js';

// One small geometry palette feeds the flat Living Frame and native XR scene.
// All decoration is deterministic, baked once and outside the visitor routes.
export function createLivingMapDetailKit({geometry,mesh,material}) {
    const ball=geometry(new THREE.SphereGeometry(1,10,7));
    const branch=geometry(new THREE.CylinderGeometry(1,1,1,7));
    const leaf=geometry(new THREE.SphereGeometry(1,7,5));
    const patch=geometry(new THREE.CircleGeometry(1,18));
    const hex=geometry(new THREE.CylinderGeometry(1,1,1,6));
    const box=geometry(new THREE.BoxGeometry(1,1,1));
    const point=new THREE.Vector3(),end=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
    function stick(parent,a,b,r,color){
        point.set(...a);end.set(...b);const length=point.distanceTo(end);
        const node=mesh(branch,color,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r,length,r,parent);
        node.quaternion.setFromUnitVectors(up,end.sub(point).normalize());return node;
    }
    function ground(parent,x,z,sx,sz,color,y=.065){const node=mesh(patch,color,x,y,z,sx,sz,1,parent);node.rotation.x=-Math.PI/2;return node;}
    function tuft(parent,x,z,size=1,colour='#829b4e',phase=0){
        for(let k=0;k<5;k++){const angle=k*2.4+phase,r=.038*size;
            const blade=mesh(leaf,colour,x+Math.cos(angle)*r,.075+.12*size,z+Math.sin(angle)*r,.021*size,.16*size,.038*size,parent);
            blade.rotation.set(Math.sin(angle)*.34,angle,Math.cos(angle)*.34);}
    }
    function rosette(parent,x,z,size=1,phase=0){
        for(let k=0;k<5;k++){const a=k*Math.PI*2/5+phase;
            const node=mesh(leaf,k%2?'#699a68':'#85ae6f',x+Math.cos(a)*.08*size,.10,z+Math.sin(a)*.08*size,.058*size,.03*size,.14*size,parent);
            node.rotation.set(.25,a+Math.PI/2,0);}
    }
    function flowering(parent,x,z,size=1,phase=0){
        mesh(ball,'#54794f',x,.13*size,z,.15*size,.11*size,.13*size,parent);
        for(let k=0;k<3;k++){const a=k*2.4+phase,px=x+Math.cos(a)*.08*size,pz=z+Math.sin(a)*.08*size;
            stick(parent,[px,.09,pz],[px,.27*size,pz],.008*size,'#627a44');
            mesh(ball,k%2?'#e6b154':'#cf8688',px,.28*size,pz,.045*size,.022*size,.045*size,parent);
            mesh(ball,'#f7d47a',px,.298*size,pz,.018*size,.012*size,.018*size,parent);}
    }
    // Authored curved paddle/frond, with a soft arched midrib and broad tip.
    // Its inexpensive solid strip reads differently from a forest crown.
    const paddle=geometry((()=>{
        const points=[],indices=[];const segments=7;
        for(let layer=0;layer<2;layer++)for(let i=0;i<=segments;i++){const t=i/segments,w=.145*Math.pow(Math.sin(Math.PI*t),.65),y=.13*Math.sin(t*Math.PI)-.19*t*t-layer*.018;
            points.push(t*.73,y,-w,t*.73,y,w);}
        const count=(segments+1)*2;
        for(let i=0;i<segments;i++){const a=i*2,b=a+count;indices.push(a,a+1,a+2,a+1,a+3,a+2,b,b+2,b+1,b+1,b+2,b+3,a,a+2,b,a+2,b+2,b,a+1,b+1,a+3,a+3,b+1,b+3);}
        const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geo.setIndex(indices);geo.computeVertexNormals();return geo;
    })());
    const lobed=geometry((()=>{const shape=new THREE.Shape();for(let i=0;i<14;i++){const a=i*Math.PI/7,r=i%2?.12:.27;const x=Math.cos(a)*r,y=Math.sin(a)*r;if(i)shape.lineTo(x,y);else shape.moveTo(x,y)}shape.closePath();return new THREE.ShapeGeometry(shape)})());
    function swaleTree(parent,x,z,size,habit){
        ground(parent,x,z,.39*size,.32*size,'#7e8852',.062);
        if(habit==='paddle'){
            for(const [stem,[dx,dz,h]] of [[-.09,0,1.04],[.10,.08,.77]].entries()){
                stick(parent,[x+dx*size,.06,z+dz*size],[x+dx*size+.045*size,h*size,z+dz*size],.051*size,'#a6b17b');
                for(let k=0;k<6;k++){const a=k*1.047+stem*.55;
                    const frond=mesh(paddle,k%2?'#729b54':'#93b966',x+(dx+.045)*size,h*size,z+dz*size,size*(stem?.74:1),size,size,parent);frond.rotation.y=a;frond.rotation.z=(k%3-1)*.12;}
            }
            for(let k=0;k<4;k++)mesh(leaf,'#d7c276',x-.10*size,.83*size,z+.09*size,.037*size,.065*size,.03*size,parent);
        }else if(habit==='umbrella'){
            stick(parent,[x,.06,z],[x-.065*size,1.43*size,z],.043*size,'#b3b486');
            for(let k=0;k<7;k++){const a=k*2*Math.PI/7,px=x+Math.cos(a)*.37*size,pz=z+Math.sin(a)*.37*size;
                stick(parent,[x-.065*size,1.40*size,z],[px,1.47*size,pz],.012*size,'#819554');
                const blade=mesh(lobed,k%2?'#9eb871':'#799b61',px,1.47*size,pz,size,size,1,parent);blade.rotation.set(-Math.PI/2,0,a);
            }
            for(let k=0;k<5;k++){const a=k*2.4;mesh(leaf,k%2?'#c9b164':'#d8c37b',x+Math.cos(a)*.075*size,(1.06+k*.045)*size,z+Math.sin(a)*.075*size,.038*size,.069*size,.038*size,parent);}
        }else if(habit==='orchard'){
            stick(parent,[x,.07,z],[x+.10*size,.64*size,z-.035*size],.078*size,'#9c7851');
            const boughs=[[-.39,1.01,.02,.34,.26,.29],[.27,1.24,-.09,.31,.31,.28],[.48,1.07,.11,.27,.27,.24],[-.08,1.36,.12,.29,.31,.25]];
            for(const [k,[dx,y,dz,sx,sy,sz]] of boughs.entries()){
                stick(parent,[x+.1*size,.56*size,z],[x+dx*size,y*size,z+dz*size],.028*size,'#b49161');
                const crown=mesh(ball,['#7d944e','#a4b573','#8ea658','#c0c985'][k],x+dx*size,y*size,z+dz*size,sx*size,sy*size,sz*size,parent);crown.rotation.y=k*.63;
                const a=k*1.7;mesh(ball,'#d7a65b',x+dx*size+Math.cos(a)*.16*size,(y-.14)*size,z+dz*size+Math.sin(a)*.16*size,.050*size,.056*size,.049*size,parent);
            }
        }else if(habit==='coppice'){
            for(let k=0;k<4;k++){const a=k*2.4,dx=Math.cos(a)*.25,dz=Math.sin(a)*.22,h=.83+k*.10;
                stick(parent,[x+.03*k,.06,z],[x+dx*size,h*size,z+dz*size],.027*size,k%2?'#a29972':'#beb18a');
                for(let j=0;j<4;j++){const b=a+j*1.5;const px=x+(dx+Math.cos(b)*.18)*size,pz=z+(dz+Math.sin(b)*.15)*size;
                    stick(parent,[x+dx*size,(h-.22)*size,z+dz*size],[px,(h+j*.065)*size,pz],.011*size,'#a1a47a');
                    const spray=mesh(leaf,j%2?'#aabb85':'#829e65',px,(h+j*.065)*size,pz,.16*size,.19*size,.085*size,parent);spray.rotation.z=Math.cos(b)*.35;}
            }
        }else if(habit==='fronds'){
            stick(parent,[x,.065,z],[x+.11*size,1.46*size,z],.056*size,'#ae9470');
            for(let k=0;k<4;k++)mesh(branch,'#7f7956',x+.11*size*k/4,(.20+k*.27)*size,z,.060*size,.026*size,.060*size,parent);
            for(let k=0;k<7;k++){const a=k*Math.PI*2/7;
                for(let j=1;j<=5;j++){const t=j/6,dx=Math.cos(a)*t*.78,dz=Math.sin(a)*t*.78,y=1.46+.17*Math.sin(t*Math.PI)-.26*t*t;
                    stick(parent,[x+.11*size+(j-1)/6*.78*Math.cos(a)*size,(1.46+.17*Math.sin((j-1)/6*Math.PI)-.26*((j-1)/6)**2)*size,z+(j-1)/6*.78*Math.sin(a)*size],[x+(.11+dx)*size,y*size,z+dz*size],.013*size,'#819b59');
                    for(const s of [-1,1]){const blade=mesh(leaf,s>0?'#a0b577':'#809f61',x+(.11+dx+Math.cos(a+Math.PI/2)*s*.08)*size,y*size,z+(dz+Math.sin(a+Math.PI/2)*s*.08)*size,.15*size,.024*size,.045*size,parent);blade.rotation.y=-a+s*.65;}
                }
            }
        }
        for(let k=0;k<3;k++){const a=k*2.4;stick(parent,[x,.10,z],[x+Math.cos(a)*.17*size,.065,z+Math.sin(a)*.15*size],.028*size,'#96815b');}
    }
    function tree(parent,x,z,size,index=0,baseY=0,habit=null){
        if(habit){swaleTree(parent,x,z,size,habit);return;}
        const palettes=[['#375d43','#557b49','#709456'],['#547746','#759653','#90ad67'],['#356f62','#4b8b74','#6eaa83'],['#557443','#779153','#99aa65']];
        const colours=palettes[index%4],kind=index%4,lean=Math.sin(index*1.7)*.08*size;
        ground(parent,x,z,.40*size,.34*size,'#526540',.062+baseY);
        stick(parent,[x,baseY+.05,z],[x+lean,baseY+size*1.20,z],.055*size,'#87674b');
        for(let k=0;k<3;k++){const a=k*2.1+index*.6;
            stick(parent,[x,baseY+size*.62,z],[x+Math.cos(a)*size*.27,baseY+size*(1.10+k*.08),z+Math.sin(a)*size*.22],.023*size,'#977952');
            stick(parent,[x,baseY+.12,z],[x+Math.cos(a)*size*.15,baseY+.065,z+Math.sin(a)*size*.15],.028*size,'#785c44');}
        // Overlapping crowns form a single connected silhouette, with distinct
        // broad, upright, spreading and fruit-tree habits.
        const forms=[[[0,1.2,0,.42,.43,.39],[-.20,1.16,.10,.34,.30,.32],[.22,1.28,-.05,.32,.32,.31]],
            [[0,1.28,0,.29,.59,.28],[-.14,1.1,.05,.25,.36,.25],[.14,1.48,0,.22,.32,.23]],
            [[0,1.18,0,.47,.29,.41],[-.29,1.12,0,.30,.25,.29],[.28,1.24,.04,.30,.23,.29]],
            [[0,1.23,0,.40,.45,.35],[-.19,1.10,.04,.27,.30,.28],[.19,1.27,-.05,.29,.29,.29]]];
        for(const [k,f] of forms[kind].entries()){
            const [dx,y,dz,sx,sy,sz]=f;const crown=mesh(ball,colours[k],x+lean+dx*size,baseY+y*size,z+dz*size,sx*size,sy*size,sz*size,parent);crown.rotation.y=index*.73+k*.9;}
        if(kind===3)for(let k=0;k<5;k++){const a=k*2.4;mesh(ball,k%2?'#dc9e4c':'#e5b75c',x+Math.cos(a)*.27*size,baseY+size*(1.05+.09*(k%3)),z+Math.sin(a)*.25*size,.04*size,.044*size,.04*size,parent);}
    }
    function terrain(parent,model){
        // A few broad colour fields retain the simple toy-landscape language.
        for(const [x,z,sx,sz,c] of [[-3,-.4,2.35,2.05,'#758650'],[2.8,.25,2.38,2.07,'#708c59'],[0,2.6,.7,.45,'#8c9863']])ground(parent,x,z,sx,sz,c,.036);
        for(let i=0;i<22;i++){const a=i*2.39996,x=Math.cos(a)*(2.9+i%5*.5),z=Math.sin(a)*(1.6+i%4*.32);
            if(Math.abs(x)<1.0 || (x/6)**2+(z/3.85)**2>.94 || model.items.some(p=>Math.hypot(p.x-x,p.z-z)<.65))continue;
            ground(parent,x,z,.22+(i%3)*.08,.14+(i%2)*.07,['#82965b','#687e4a','#90a265'][i%3],.047);}
        for(let i=0;i<28;i++){const a=i*Math.PI/14,x=6.1*Math.cos(a),z=4.02*Math.sin(a);
            if(i%3===0)mesh(ball,'#a39471',x,-.02,z,.12,.055,.10,parent);}
    }
    function swales(parent,rows,soil=parent){
        rows.forEach((row,rowIndex)=>{
            const curveAt=(offset,y)=>new THREE.CatmullRomCurve3(row.map(({x,z})=>new THREE.Vector3(x,y,z+offset)));
            for(const offset of [-.105,.105])mesh(geometry(new THREE.TubeGeometry(curveAt(offset,.06),32,.095,5,false)),'#9e9367',0,0,0,1,1,1,soil);
            mesh(geometry(new THREE.TubeGeometry(curveAt(0,.052),32,.050,5,false)),rowIndex===1?'#71989a':'#798879',0,0,0,1,1,1,soil);
            row.filter((_,i)=>i%4===1).forEach(({x,z},i)=>{
                const variant=(i+rowIndex)%4,size=.75+(i%3)*.13;
                ground(soil,x,z+.30,.18,.15,'#69794a');
                if(variant===0)tuft(parent,x,z+.30,size,'#9bb16a',rowIndex);
                if(variant===1)rosette(parent,x,z+.30,size,i);
                if(variant===2)flowering(parent,x,z+.30,size,i);
                if(variant===3){mesh(ball,'#567644',x,.16,z+.30,.17,.14,.15,parent);mesh(ball,'#77955a',x+.06,.21,z+.30,.12,.10,.12,parent);}
                if(i%2===0)mesh(ball,'#c0b389',x+.12,.084,z-.20,.055,.025,.041,soil);
            });
        });
    }
    function plant(parent,index,{grass=false,tree:woody=false}={}){
        if(grass){tuft(parent,0,0,1.4,'#91ab60',index);return;}
        if(woody){tree(parent,0,0,.43,index+1);return;}
        stick(parent,[0,.06,0],[0,.55,0],.019,'#809354');
        for(let j=0;j<6;j++){const a=j*2.4;const node=mesh(leaf,j%2?'#8bb76c':'#5e955a',Math.cos(a)*.10,.17+j*.058,Math.sin(a)*.10,.13,.035,.065,parent);node.rotation.y=-a;}
        flowering(parent,0,0,.5,index);
    }
    function pimo(parent,index){
        const tones=['#d8c87a','#a8c58d','#89b7b5','#afafd4','#d0a18d','#7dab9d'];
        function cell(x,y,r,color){const n=mesh(hex,color,x,y,0,r,.036,r,parent);n.rotation.x=Math.PI/2;return n;}
        cell(0,0,.11,'#f1ead0');
        for(let i=0;i<6;i++){const a=i*Math.PI/3+Math.PI/6,x=Math.cos(a)*.25,y=Math.sin(a)*.25;
            stick(parent,[0,0,0],[x,y,0],.012,'#829d7c');cell(x,y,.073,tones[(i+index)%6]);
            for(let k=0;k<2;k++){const angle=a+(k?1:-1)*.22,cx=Math.cos(angle)*.40,cy=Math.sin(angle)*.40;
                stick(parent,[x,y,0],[cx,cy,0],.008,'#a7bea0');cell(cx,cy,.033,tones[(i+index)%6]);}
            cell(x,y,.030,'#e8f0d8');
        }
        const centreLeaf=mesh(leaf,'#5b865a',0,0,.03,.029,.063,.014,parent);centreLeaf.rotation.z=-.4;
    }
    // Assemble vertex-coloured reusable peon parts, still only two instanced
    // batches for all five visitors. Faces and sleeves add no per-frame nodes.
    function bakeParts(parts){
        const positions=[],normals=[],colours=[],v=new THREE.Vector3(),n=new THREE.Vector3(),normalMatrix=new THREE.Matrix3();
        for(const {geo,color,position=[0,0,0],scale=[1,1,1],rotation=[0,0,0]} of parts){
            const pose=new THREE.Matrix4().compose(new THREE.Vector3(...position),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(...scale));normalMatrix.getNormalMatrix(pose);
            const data=geo.index?geo.toNonIndexed():geo,c=new THREE.Color(color);
            for(let i=0;i<data.attributes.position.count;i++){v.fromBufferAttribute(data.attributes.position,i).applyMatrix4(pose);n.fromBufferAttribute(data.attributes.normal,i).applyMatrix3(normalMatrix).normalize();positions.push(v.x,v.y,v.z);normals.push(n.x,n.y,n.z);colours.push(c.r,c.g,c.b);}
            if(data!==geo)data.dispose();
        }
        const result=geometry(new THREE.BufferGeometry());result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));result.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));result.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));return result;
    }
    function peonGeometry(body){
        const bodyParts=[{geo:body,color:'#ffffff'},
            {geo:branch,color:'#65705e',position:[0,.043,0],scale:[.133,.03,.133]},
            ...[-1,1].map(s=>({geo:leaf,color:'#c1c9b4',position:[s*.115,.19,.005],scale:[.046,.095,.052],rotation:[0,0,s*.17]})),
            {geo:box,color:'#f4e8c6',position:[0,.22,.102],scale:[.043,.042,.012]}];
        const face=[{geo:ball,color:'#f2d0a4'},
            {geo:ball,color:'#745d45',position:[0,.64,-.09],scale:[1.015,.40,.96]},
            {geo:leaf,color:'#ecc299',position:[0,-.08,.97],scale:[.14,.17,.14]},
            ...[-1,1].map(s=>({geo:ball,color:'#3d4e41',position:[s*.28,.13,.91],scale:[.060,.086,.045]})),
            {geo:leaf,color:'#ab7654',position:[0,-.36,.90],scale:[.15,.024,.028]}];
        return [bakeParts(bodyParts),bakeParts(face)];
    }
    return {terrain,swales,tree,plant,pimo,peonGeometry};
}
