// Static, compact meshes. UV y > 1 identifies the communication light inlay.
export const SECONDARY_TOTEM_IDS = Object.freeze(['sun','leaf','rock','moon']);
export function createSecondaryTotemGeometry(style, segments=24) {
    const vertices=[],indices=[];
    function triangle(a,b,c,light=false) {
        const u=b.map((v,i)=>v-a[i]),v=c.map((n,i)=>n-a[i]);
        const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],length=Math.hypot(...n);
        if(length<1e-10)return;
        const start=vertices.length/8;
        for(const p of [a,b,c])vertices.push(...p,...n.map(x=>x/length),.25+p[0]*.07,typeof light==='number'?light+.2:light?1.2:(p[1]+1)*.42);
        indices.push(start,start+1,start+2);
    }
    function quad(a,b,c,d,light=false){triangle(a,b,c,light);triangle(a,c,d,light);}
    function polygon(points,z,depth,light=false) {
        const center=points.reduce((sum,p)=>[sum[0]+p[0]/points.length,sum[1]+p[1]/points.length],[0,0]);
        const lip=Math.min(.045,depth*.26),rings=[[z,.96],[z+lip,1],[z+depth-lip,1],[z+depth,.96]];
        const p=(r,i)=>[center[0]+(points[i][0]-center[0])*rings[r][1],center[1]+(points[i][1]-center[1])*rings[r][1],rings[r][0]];
        for(let i=0;i<points.length;i++) {
            const j=(i+1)%points.length;
            triangle([...center,z+depth],p(3,i),p(3,j),light);
            triangle([...center,z],p(0,j),p(0,i),light);
            for(let r=0;r<3;r++)quad(p(r,i),p(r,j),p(r+1,j),p(r+1,i),light);
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
        // One standing stone carries the signs. A separate weathered footing
        // replaces the repeated pebble stack, with an asymmetrical broken top.
        const rockSegments=Math.max(18,Math.min(36,segments)),rows=16;
        const profile=[[0,1.95],[.12,1.84],[.29,1.49],[.47,1.44],[.68,1.18],[.88,1.03],[1,.77]];
        const radius=t=>{let i=1;while(i<profile.length-1&&profile[i][0]<t)i++;const [a,ra]=profile[i-1],[b,rb]=profile[i],u=(t-a)/(b-a);return ra+(rb-ra)*u;};
        const monolith=(t,a)=>{
            const r=radius(t)*(1+.07*Math.sin(a*3+.5)+.045*Math.cos(a*7+t*4));
            const x=Math.cos(a)*r+.16*Math.sin(t*2.8)-.12;
            const z=Math.min(Math.sin(a)*r*.76,r*.67)+.06*Math.sin(t*5);
            const y=-.90+1.80*t+Math.sin(a*3+.4)*.015*Math.sin(t*Math.PI)+(t>.94?(t-.94)/.06*(.11*Math.cos(a)+.055*Math.sin(a*3)):0);
            return [x,y,z];
        };
        for(let j=0;j<rows;j++)for(let i=0;i<rockSegments;i++){
            const a=i*Math.PI*2/rockSegments,b=(i+1)*Math.PI*2/rockSegments;
            quad(monolith(j/rows,a),monolith((j+1)/rows,a),monolith((j+1)/rows,b),monolith(j/rows,b));
        }
        for(let i=0;i<rockSegments;i++){
            const a=i*Math.PI*2/rockSegments,b=(i+1)*Math.PI*2/rockSegments;
            triangle([0,.90,0],monolith(1,b),monolith(1,a));
            const footing=(j,k)=>{const lat=-Math.PI/2+j*Math.PI/8,angle=k*Math.PI*2/rockSegments,r=1+.08*Math.sin(angle*5);return [Math.cos(lat)*Math.cos(angle)*2.55*r,-.90+Math.sin(lat)*.10,Math.cos(lat)*Math.sin(angle)*1.98*r];};
            for(let j=0;j<8;j++)quad(footing(j,i),footing(j+1,i),footing(j+1,i+1),footing(j,i+1));
        }
        const front=(x,t)=>{
            let z=-Infinity;
            for(let i=0;i<rockSegments;i++){
                const a=monolith(t,i*Math.PI*2/rockSegments),b=monolith(t,(i+1)*Math.PI*2/rockSegments),dx=b[0]-a[0];
                if(Math.abs(dx)<1e-8)continue;const u=(x-a[0])/dx;
                if(u>=0&&u<=1)z=Math.max(z,a[2]+u*(b[2]-a[2]));
            }
            return Number.isFinite(z)?z:0;
        };
        // Quartz and blue-green mineral seams are narrow raised inlays, with
        // branching fractures. They remain quiet enough to read as real stone.
        for(const branch of [0,1,2]){
            const start=branch===2?.48:.055,end=branch===2?.83:.965,count=32;
            const p=u=>{const t=start+(end-start)*u,x=branch===0?-.28+.27*Math.sin(t*8.3)+t*.30:branch===1?.56-.34*t+.11*Math.sin(t*13):-.28+(t-.48)*2.1,y=-.90+1.80*t;return [x,y,front(x,t)+.020];};
            for(let i=0;i<count;i++){
                const a=p(i/count),b=p((i+1)/count),w=branch===0?.033:branch===1?.014:.018;
                quad([a[0]-w,a[1],a[2]],[a[0]+w,a[1],a[2]],[b[0]+w,b[1],b[2]],[b[0]-w,b[1],b[2]],branch===1?true:6);
            }
        }
        // Small lichen islands at the foot, rather than a uniform green wash.
        for(let k=0;k<9;k++){
            const x=-1.0+k*.22,t=.04+.018*Math.sin(k*2.4),y=-.90+1.80*t,z=front(x,t)+.024;
            const points=Array.from({length:7},(_,i)=>{const a=i*Math.PI*2/7,r=.10+.028*Math.sin(i*3+k);return [x+Math.cos(a)*r,y+Math.sin(a)*r*.17];});
            polygon(points,z,.012,5);
        }
    }
    if(style==='rock') {
        let low=Infinity,high=-Infinity;
        for(let i=1;i<vertices.length;i+=8){low=Math.min(low,vertices[i]);high=Math.max(high,vertices[i]);}
        const scaleY=2/(high-low);
        for(let i=0;i<vertices.length;i+=8){
            vertices[i+1]=(vertices[i+1]-low)*scaleY-1;
            vertices[i+4]/=scaleY;
            const length=Math.hypot(vertices[i+3],vertices[i+4],vertices[i+5]);
            for(let k=3;k<6;k++)vertices[i+k]/=length;
        }
    }
    return {vertices:new Float32Array(vertices),indices:new Uint16Array(indices)};
}
