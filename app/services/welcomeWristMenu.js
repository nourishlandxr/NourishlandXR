import * as THREE from '../assets/fruit-window/vendor/three.module.js';

export function wristButtonAt(items,x,y){
    return items.find(item=>{
        if(!item.radial)return x>=item.x && x<=item.x+item.width && y>=item.y && y<=item.y+item.height;
        const r=item.radial,dx=x-r.x,dy=y-r.y,d=Math.hypot(dx,dy),angle=Math.atan2(dy,dx),center=(r.start+r.end)/2;
        const delta=Math.atan2(Math.sin(angle-center),Math.cos(angle-center));
        return d>=r.inner && d<=r.outer && Math.abs(delta)<=(r.end-r.start)/2;
    }) || null;
}

export function welcomeWristPose(matrix,context,forearmDirection=null){
    if(!matrix)return null;
    const wrist=new THREE.Matrix4().fromArray(matrix),rotation=new THREE.Quaternion().setFromRotationMatrix(wrist).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0)));
    const normal=new THREE.Vector3(0,0,1).applyQuaternion(rotation),up=new THREE.Vector3(0,1,0).applyQuaternion(rotation);
    if(forearmDirection){const along=forearmDirection.clone().negate().addScaledVector(normal,forearmDirection.dot(normal));if(along.lengthSq()>.001)up.copy(along.normalize());}
    const right=new THREE.Vector3().crossVectors(up,normal).normalize();up.crossVectors(normal,right).normalize();
    const center=new THREE.Vector3().setFromMatrixPosition(wrist).addScaledVector(up,-.065).addScaledVector(normal,.018).addScaledVector(right,context.expanded?.08:0);
    return {center,right,up,normal,anchorHeading:right,width:context.width || .12,height:(context.width || .12)*context.height/1000};
}

// Vector icons remain crisp in the XR canvas and do not depend on emoji fonts.
export function drawWristIcon(ctx,id,x,y,size){
    ctx.save();ctx.translate(x,y);ctx.scale(size/2,size/2);ctx.lineWidth=.12;ctx.lineCap=ctx.lineJoin='round';ctx.strokeStyle=ctx.fillStyle;ctx.beginPath();
    const line=(a,b,c,d)=>{ctx.moveTo(a,b);ctx.lineTo(c,d);};
    const circle=(x,y,r,fill=false)=>{ctx.moveTo(x+r,y);ctx.arc(x,y,r,0,Math.PI*2);if(fill)ctx.fill();};
    if(id==='brush'){ctx.moveTo(-.65,.65);ctx.lineTo(-.4,.05);ctx.lineTo(.45,-.75);ctx.lineTo(.75,-.45);ctx.lineTo(-.05,.4);ctx.closePath();line(-.4,.05,-.05,.4);}
    else if(id==='games'){ctx.roundRect(-.75,-.75,1.5,1.5,.2);for(const [x,y] of [[-.4,-.4],[.4,-.4],[0,0],[-.4,.4],[.4,.4]])circle(x,y,.07);}
    else if(id==='hand'){ctx.moveTo(-.5,.7);ctx.lineTo(-.8,-.1);ctx.quadraticCurveTo(-.8,-.35,-.5,-.15);ctx.lineTo(-.3,.08);ctx.lineTo(-.3,-.7);ctx.quadraticCurveTo(-.3,-.95,-.1,-.75);ctx.lineTo(-.1,-.1);ctx.lineTo(.05,-.85);ctx.quadraticCurveTo(.15,-1,.25,-.75);ctx.lineTo(.25,-.08);ctx.lineTo(.45,-.6);ctx.quadraticCurveTo(.7,-.7,.65,-.4);ctx.lineTo(.55,.5);ctx.quadraticCurveTo(.3,.9,-.5,.7);}
    else if(id==='controller'){ctx.ellipse(0,0,.48,.8,.2,0,Math.PI*2);circle(-.12,-.4,.12);circle(.22,-.2,.055);line(-.25,.15,.25,.15);}
    else if(id==='audio' || id==='mute'){ctx.moveTo(-.8,-.22);ctx.lineTo(-.4,-.22);ctx.lineTo(0,-.6);ctx.lineTo(0,.6);ctx.lineTo(-.4,.22);ctx.lineTo(-.8,.22);ctx.closePath();if(id==='mute'){line(.3,-.35,.8,.35);line(.3,.35,.8,-.35);}else{ctx.moveTo(.35,-.4);ctx.quadraticCurveTo(.8,0,.35,.4);}}
    else if(id==='settings'){for(let i=0;i<12;i++){const a=i*Math.PI/6,r=i%2?.6:.85;i?ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r):ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();circle(0,0,.28);}
    else if(id==='lesson'){ctx.roundRect(-.65,-.8,1.3,1.6,.12);line(-.35,-.35,.35,-.35);line(-.35,0,.35,0);line(-.35,.35,.15,.35);}
    else if(id==='close'){line(-.6,-.6,.6,.6);line(-.6,.6,.6,-.6);}
    else if(id==='play'){ctx.moveTo(-.4,-.7);ctx.lineTo(.7,0);ctx.lineTo(-.4,.7);ctx.closePath();}
    else if(id==='pause'){line(-.3,-.7,-.3,.7);line(.3,-.7,.3,.7);}
    else if(['repeat','undo','redo'].includes(id)){const sign=id==='redo'?-1:1;ctx.scale(sign,1);ctx.arc(0,0,.65,-1.3,3.4);line(-.64,-.16,-.75,-.58);line(-.64,-.16,-.24,-.3);}
    else if(id==='water'){ctx.moveTo(0,-.85);ctx.bezierCurveTo(-1,.15,-.65,.85,0,.85);ctx.bezierCurveTo(.65,.85,1,.15,0,-.85);}
    else if(id==='vine'){ctx.moveTo(-.65,.8);ctx.bezierCurveTo(-.4,-.1,.2,.25,.55,-.8);ctx.moveTo(-.15,.05);ctx.bezierCurveTo(-.85,-.5,-.5,-.8,-.15,.05);ctx.moveTo(.12,-.22);ctx.bezierCurveTo(.95,.15,.65,.5,.12,-.22);}
    else if(id==='firefly'){circle(0,0,.25);for(let i=0;i<8;i++){const a=i*Math.PI/4;line(Math.cos(a)*.5,Math.sin(a)*.5,Math.cos(a)*.8,Math.sin(a)*.8);}}
    else if(id==='earth'){line(-.7,.65,.7,.65);line(-.5,.15,.5,.15);line(-.3,-.4,.3,-.4);}
    else if(id==='spray'){ctx.roundRect(-.65,-.2,.45,1,.12);line(-.45,-.2,-.45,-.5);line(-.65,-.5,-.15,-.5);for(const [x,y] of [[.25,-.5],[.5,-.7],[.7,-.25],[.55,.1]])circle(x,y,.055);}
    else if(id==='colour'){ctx.arc(0,0,.75,0,Math.PI*2);for(const [x,y] of [[-.35,-.3],[.25,-.4],[.35,.25],[-.25,.4]])circle(x,y,.10);}
    else if(id==='clear'){ctx.roundRect(-.45,-.3,.9,1.1,.12);line(-.65,-.5,.65,-.5);line(-.2,-.75,.2,-.75);line(-.15,0,-.15,.5);line(.15,0,.15,.5);}
    else if(id==='motion'){ctx.moveTo(-.8,0);ctx.bezierCurveTo(-.3,-1,.3,1,.8,0);}
    else {const angle=id==='up'?-Math.PI/2:id==='down'?Math.PI/2:Math.PI;ctx.rotate(angle);line(-.7,0,.7,0);line(.2,-.5,.7,0);line(.2,.5,.7,0);}
    ctx.stroke();ctx.restore();
}

export function drawWelcomeWristMenu(ctx,card){
    const menu=card.comfort,height=menu.height;ctx.clearRect(0,0,1000,height);
    const expanded=menu.expanded,dockWidth=expanded?420:984;
    ctx.fillStyle='rgba(17,36,33,.96)';ctx.strokeStyle='#6cb8a7';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(8,height/2-(expanded?185:400),dockWidth,expanded?370:800,expanded?38:70);ctx.fill();ctx.stroke();
    if(expanded){ctx.fillStyle='rgba(17,36,33,.96)';ctx.beginPath();ctx.roundRect(454,8,538,height-16,28);ctx.fill();ctx.stroke();ctx.fillStyle='#c2e2d6';ctx.font='600 29px system-ui';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(menu.title,480,60,400);}
    for(const button of card.controls){
        ctx.globalAlpha=button.disabled?.32:1;const aimed=card.hoverAction===button.action;
        ctx.fillStyle=button.selected?'#376e60':aimed?'#385a51':'#203f37';ctx.strokeStyle=button.selected?'#d8e9bf':aimed?'#abe6d3':'#52766a';ctx.lineWidth=button.selected?5:aimed?4:2;
        ctx.beginPath();
        if(button.radial){const r=button.radial;ctx.arc(r.x,r.y,r.outer,r.start+.025,r.end-.025);ctx.arc(r.x,r.y,r.inner,r.end-.025,r.start+.025,true);ctx.closePath();}
        else ctx.roundRect(button.x,button.y,button.width,button.height,button.dock?22:16);
        ctx.fill();ctx.stroke();ctx.fillStyle='#e1f0e5';
        const x=button.x+button.width/2,y=button.y+button.height/2;
        if(button.kind==='slider'){
            ctx.font='500 24px system-ui';ctx.textAlign='left';ctx.fillText(button.label,button.x+12,button.y+27,button.width-24);
            const a=button.x+22,b=button.x+button.width-22,cy=button.y+76;ctx.strokeStyle='#75beaa';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(a,cy);ctx.lineTo(b,cy);ctx.stroke();ctx.beginPath();ctx.arc(a+(b-a)*(button.value-button.min)/(button.max-button.min),cy,10,0,Math.PI*2);ctx.fill();
        }else if(button.text){
            ctx.font='500 27px system-ui';ctx.textAlign='center';const words=button.label.split(' '),lines=[''];for(const word of words){const last=lines.length-1;if(ctx.measureText(lines[last]+word).width>button.width-28)lines.push(word+' ');else lines[last]+=word+' ';}lines.slice(0,3).forEach((line,i)=>ctx.fillText(line.trim(),x,y+(i-(lines.length-1)/2)*30,button.width-24));
        }else if(button.color){ctx.fillStyle=button.color;ctx.beginPath();ctx.roundRect(x-32,y-32,64,64,10);ctx.fill();ctx.strokeStyle='#c9dbd0';ctx.stroke();}
        else drawWristIcon(ctx,button.icon,x,y,Math.min(button.width,button.height)*(button.dock?.58:.55));
        if(button.selected){ctx.strokeStyle='#eff5dc';ctx.lineWidth=4;const cx=button.x+button.width-20,cy=button.y+19;ctx.beginPath();ctx.moveTo(cx-7,cy);ctx.lineTo(cx-2,cy+5);ctx.lineTo(cx+8,cy-7);ctx.stroke();}
    }
    ctx.globalAlpha=1;ctx.fillStyle='#c2ddd0';ctx.font='500 25px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
    const hint=card.hoverHint || menu.subtitle;
    if(hint){ctx.fillStyle='rgba(13,29,26,.96)';ctx.beginPath();ctx.roundRect(expanded?474:30,height-62,expanded?506:940,50,12);ctx.fill();ctx.fillStyle='#d4e8dc';ctx.fillText(hint,expanded?727:500,height-36,expanded?476:890);}
}
