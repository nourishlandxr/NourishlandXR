// Keep details in the same composition as the object that revealed them.
const education=document.querySelector('#education .education-experience'),summary=education?.querySelector('[data-education-summary]');
if(education)education.insertAdjacentHTML('afterbegin','<svg class="education-balloon-tether" aria-hidden="true"><path/></svg>');
let frame=0;
function placeEducation(){
 frame=0;if(!education||!summary)return;
 education.dataset.detail=String(!summary.hidden);const tether=education.querySelector('.education-balloon-tether');if(summary.hidden){tether?.querySelector('path').setAttribute('d','');return;}
 const box=education.getBoundingClientRect(),choice=education.querySelector('[data-education-choice][aria-expanded=true]');if(!choice||!box.width||!box.height)return;
 const target=choice.getBoundingClientRect(),mobile=box.width<1050,width=summary.offsetWidth,height=summary.offsetHeight;
 const clamp=(v,a,b)=>Math.max(a,Math.min(v,Math.max(a,b)));
 const left=mobile?(box.width-width)/2:summary.dataset.side==='left'?target.left-box.left-width-20:target.right-box.left+20;
 const top=mobile?box.height-height-8:target.top-box.top+target.height*.45-height*.38;
 Object.assign(summary.style,{left:clamp(left,10,box.width-width-10)+'px',right:'auto',top:clamp(top,6,box.height-height-6)+'px',margin:'0'});
 summary.style.transformOrigin=mobile?'50% 0':summary.dataset.side==='left'?'100% 35%':'0 35%';
 if(tether){const panel=summary.getBoundingClientRect(),leftSide=summary.dataset.side==='left',a={x:(mobile?target.left+target.width/2:leftSide?target.left:target.right)-box.left,y:(mobile?target.bottom:target.top+target.height/2)-box.top},b={x:(mobile?panel.left+panel.width/2:leftSide?panel.right:panel.left)-box.left,y:(mobile?panel.top:Math.max(panel.top+35,Math.min(target.top+target.height/2,panel.bottom-35)))-box.top};tether.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);tether.querySelector('path').setAttribute('d',`M${a.x} ${a.y} Q${(a.x+b.x)/2} ${a.y} ${b.x} ${b.y}`);}
}
function schedule(){if(!frame)frame=requestAnimationFrame(placeEducation);}
if(education&&summary){new MutationObserver(schedule).observe(summary,{attributes:true,subtree:true,attributeFilter:['hidden','data-side','data-row']});const resize=new ResizeObserver(schedule);resize.observe(education);resize.observe(summary);window.addEventListener('nourishland:route',schedule);}

// The learning guide owns its four illustrated scenes.
import './food-forest-guide.js';
