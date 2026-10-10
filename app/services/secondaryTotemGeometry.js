// Static, compact meshes. UV y > 1 identifies the communication light inlay.
export const SECONDARY_TOTEM_IDS = Object.freeze(['sun','leaf','rock','moon']);
export function createSecondaryTotemGeometry(style, segments=24) {
    const vertices=[],indices=[];
    function triangle(a,b,c,light=false) {
        const u=b.map((v,i)=>v-a[i]),v=c.map((n,i)=>n-a[i]);
        const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],length=Math.hypot(...n)||1;
        const start=vertices.length/8;
        for(const p of [a,b,c])vertices.push(...p,...n.map(x=>x/length),.25+p[0]*.07,light?1.2:(p[1]+1)*.42);
        indices.push(start,start+1,start+2);
    }
    function quad(a,b,c,d,light=false){triangle(a,b,c,light);triangle(a,c,d,light);}
    function polygon(points,z,depth,light=false) {
        const center=points.reduce((sum,p)=>[sum[0]+p[0]/points.length,sum[1]+p[1]/points.length],[0,0]);
        for(let i=0;i<points.length;i++) {
            const a=points[i],b=points[(i+1)%points.length];
            triangle([...center,z+depth],[...a,z+depth],[...b,z+depth],light);
            triangle([...center,z],[...b,z],[...a,z],light);
            quad([...a,z],[...b,z],[...b,z+depth],[...a,z+depth],light);
        }
    }
    const box=(x,y,w,h,z,d,light=false)=>polygon([[x-w,y-h],[x+w,y-h],[x+w,y+h],[x-w,y+h]],z,d,light);
    const circle=(x,y,rx,ry,z,d,light=false)=>polygon(Array.from({length:segments},(_,i)=>{const a=i*2*Math.PI/segments;return [x+rx*Math.cos(a),y+ry*Math.sin(a)];}),z,d,light);
    function beam(a,b,width,z,light=true){const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy),nx=-dy/l*width,ny=dx/l*width;polygon([[a[0]-nx,a[1]-ny],[b[0]-nx,b[1]-ny],[b[0]+nx,b[1]+ny],[a[0]+nx,a[1]+ny]],z,.025,light);}
    if(style!=='rock') {
        polygon([[-.86,-1],[.86,-1],[.65,.60],[-.65,.60]],-.72,1.44);
        box(0,-.89,1.12,.11,-.92,1.84);
        box(0,-.12,.66,.10,.73,.045); // inset sign plaque
    }
    if(style==='sun') {
        for(let i=0;i<12;i++) {const a=i*Math.PI/6,c=Math.cos(a),s=Math.sin(a);polygon([[1.58*c-.16*s,.70+.225*s+.023*c],[2.10*c,.70+.30*s],[1.58*c+.16*s,.70+.225*s-.023*c]],-.28,.56);}
        circle(0,.70,1.60,.225,-.46,.92);
        circle(0,.70,1.22,.172,.475,.035,true);
    } else if(style==='leaf') {
        polygon([[0,.37],[1.24,.48],[1.56,.70],[.98,.89],[0,1],[-.98,.89],[-1.56,.70],[-1.24,.48]],-.28,.56);
        beam([0,.39],[0,.95],.052,.30);
        for(const side of [-1,1])for(let i=0;i<3;i++)beam([0,.49+i*.12],[side*(1.04-i*.22),.59+i*.12],.033,.30);
    } else if(style==='moon') {
        const outer=[],inner=[];
        for(let i=0;i<=segments;i++){const t=i/segments,a=Math.PI*.36+t*Math.PI*1.28;outer.push([1.90*Math.cos(a),.72+.28*Math.sin(a)]);inner.push([.80-1.61*Math.sin(Math.PI*t),.72+.28*Math.cos(Math.PI*t)*Math.sin(Math.PI*.36)]);}
        for(let i=0;i<segments;i++) {
            const a=outer[i],b=outer[i+1],c=inner[i+1],d=inner[i];
            quad([...a,.34],[...b,.34],[...c,.34],[...d,.34],true);
            quad([...d,-.34],[...c,-.34],[...b,-.34],[...a,-.34]);
            quad([...a,-.34],[...b,-.34],[...b,.34],[...a,.34]);
            quad([...c,-.34],[...d,-.34],[...d,.34],[...c,.34]);
        }
    } else if(style==='rock') {
        box(0,-.92,2.35,.08,-2,4);
        for(let k=0;k<4;k++) {
            const cy=-.68+k*.45,rx=2.6-k*.40,ry=k===3?.29:.26,rz=2.15-k*.30;
            const point=(j,i)=>{const lat=-Math.PI/2+j*Math.PI/10,a=i*Math.PI*2/segments,r=1+.06*Math.sin(a*3+k)+.035*Math.cos(lat*5+a*2);return [Math.cos(lat)*Math.cos(a)*rx*r+.13*Math.sin(k*2),cy+Math.sin(lat)*ry,Math.cos(lat)*Math.sin(a)*rz*r];};
            for(let j=0;j<10;j++)for(let i=0;i<segments;i++)quad(point(j,i),point(j+1,i),point(j+1,i+1),point(j,i+1));
        }
        // A narrow mineral light seam, rather than illuminating the whole stone.
        circle(0,-.01,1.30,.025,1.60,.03,true);
        box(0,-.63,.88,.075,2.09,.04);
    }
    if(style==='rock') {
        let low=Infinity,high=-Infinity;
        for(let i=1;i<vertices.length;i+=8){low=Math.min(low,vertices[i]);high=Math.max(high,vertices[i]);}
        for(let i=1;i<vertices.length;i+=8)vertices[i]=(vertices[i]-low)/(high-low)*2-1;
    }
    return {vertices:new Float32Array(vertices),indices:new Uint16Array(indices)};
}
