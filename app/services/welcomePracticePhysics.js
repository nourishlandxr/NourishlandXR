// Four lightweight rigid bodies, with a circular support surface and floor.
// Fixed substeps and bounded throw speeds keep gravity stable in XR.
export const PRACTICE_TABLE_RADIUS=.9;
export const PRACTICE_TABLE_HALF_WIDTH=.78,PRACTICE_TABLE_HALF_DEPTH=.45;
export const onPracticeTable=(x,z,margin=0)=>Math.abs(x)<PRACTICE_TABLE_HALF_WIDTH-margin && Math.abs(z)<PRACTICE_TABLE_HALF_DEPTH-margin;
export function createPracticeBody(id,{x=0,z=0,radius=.055,halfSize=null,bounce=.2}={}){
    const half=halfSize || {x:radius,y:radius,z:radius};
    return {id,position:{x,y:half.y+.025,z},rotation:{x:0,y:0,z:0,w:1},velocity:{x:0,y:0,z:0},angular:{x:0,y:0,z:0},halfSize:{...half},radius,bounce,held:false,visible:id==='ball',floorTime:0,home:{x,z},support:half.y};
}
export function practiceSupport(body){
    if(body.id==='ball')return body.radius;
    const {x,y,z,w}=body.rotation,h=body.halfSize;
    // World y row of the orientation matrix; oriented box support distance.
    return Math.abs(2*(x*y+z*w))*h.x+Math.abs(1-2*(x*x+z*z))*h.y+Math.abs(2*(y*z-x*w))*h.z;
}
export function resetPracticeBody(body){Object.assign(body.position,{x:body.home.x,y:body.halfSize.y+.04,z:body.home.z});Object.assign(body.velocity,{x:0,y:0,z:0});Object.assign(body.angular,{x:0,y:0,z:0});Object.assign(body.rotation,{x:0,y:0,z:0,w:1});body.floorTime=0;body.held=false;}
function turn(body,dt){
    const a=body.angular,speed=Math.hypot(a.x,a.y,a.z);if(speed<.002)return;
    const angle=Math.min(10,speed)*dt*.5,s=Math.sin(angle)/speed,ax=a.x*s,ay=a.y*s,az=a.z*s,aw=Math.cos(angle),q=body.rotation;
    const x=aw*q.x+ax*q.w+ay*q.z-az*q.y,y=aw*q.y-ax*q.z+ay*q.w+az*q.x,z=aw*q.z+ax*q.y-ay*q.x+az*q.w,w=aw*q.w-ax*q.x-ay*q.y-az*q.z,l=Math.hypot(x,y,z,w);
    Object.assign(q,{x:x/l,y:y/l,z:z/l,w:w/l});
}
export function stepPracticeBodies(bodies,dt,{floor=-.8,onImpact=()=>{}}={}){
    let remaining=Math.max(0,Math.min(.08,dt));
    while(remaining>0){const s=Math.min(1/120,remaining);remaining-=s;
        for(const b of bodies){if(!b.visible || b.held || b.basketed || b.anchored)continue;const p=b.position,v=b.velocity;const previousY=p.y;
            v.y-=9.81*s;p.x+=v.x*s;p.y+=v.y*s;p.z+=v.z*s;turn(b,s);b.support=practiceSupport(b);
            const onTable=onPracticeTable(p.x,p.z,Math.min(.035,b.radius*.45)) && previousY-b.support>=-.012;
            const surface=onTable?0:floor;
            if(p.y-b.support<surface){p.y=surface+b.support;if(v.y<-.8)onImpact(b,-v.y);v.y=Math.abs(v.y)>.45?-v.y*b.bounce:0;
                const damping=Math.exp(-(onTable?4.5:6)*s);v.x*=damping;v.z*=damping;b.angular.x*=damping;b.angular.y*=damping;b.angular.z*=damping;
                if(Math.hypot(v.x,v.z)<.012){v.x=v.z=0;Object.assign(b.angular,{x:0,y:0,z:0});}
            }
            b.floorTime=surface===floor && p.y-b.support<=floor+.012?b.floorTime+s:0;
            // Bring lost objects back after a visible fall and a quiet pause.
            if(b.floorTime>5 || Math.hypot(p.x,p.z)>3.5 || p.y<floor-1)resetPracticeBody(b);
        }
        for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
            const a=bodies[i],b=bodies[j];if(!a.visible || !b.visible || a.held || b.held || a.basketed || b.basketed || a.anchored || b.anchored)continue;
            const dx=b.position.x-a.position.x,dy=b.position.y-a.position.y,dz=b.position.z-a.position.z,d=Math.hypot(dx,dy,dz),r=a.radius+b.radius;
            if(d>=r || d<.00001)continue;const nx=dx/d,ny=dy/d,nz=dz/d,penetration=(r-d)*.5;
            a.position.x-=nx*penetration;a.position.y-=ny*penetration;a.position.z-=nz*penetration;b.position.x+=nx*penetration;b.position.y+=ny*penetration;b.position.z+=nz*penetration;
            const speed=(b.velocity.x-a.velocity.x)*nx+(b.velocity.y-a.velocity.y)*ny+(b.velocity.z-a.velocity.z)*nz;
            if(speed<0){const impulse=-speed*.6;for(const [obj,sign] of [[a,-1],[b,1]]){obj.velocity.x+=sign*nx*impulse;obj.velocity.y+=sign*ny*impulse;obj.velocity.z+=sign*nz*impulse;}}
        }
    }
}
