// Keep details in the same composition as the object that revealed them.
const education=document.querySelector('#education .education-experience'),summary=education?.querySelector('[data-education-summary]');
if(education)education.insertAdjacentHTML('afterbegin','<svg class="education-balloon-tether" aria-hidden="true"><path/></svg>');
let frame=0;
function placeEducation(){
 frame=0;if(!education||!summary)return;
 education.dataset.detail=String(!summary.hidden);const tether=education.querySelector('.education-balloon-tether');if(summary.hidden){tether?.querySelector('path').setAttribute('d','');return;}
 const box=education.getBoundingClientRect(),choice=education.querySelector('[data-education-choice][aria-expanded=true]');if(!choice||!box.width||!box.height)return;
 const target=choice.getBoundingClientRect(),cells=[...education.querySelectorAll('[data-education-choice]')].map(n=>n.getBoundingClientRect());
 const clamp=(v,a,b)=>Math.max(a,Math.min(v,Math.max(a,b)));
 const edgeLeft=Math.min(...cells.map(r=>r.left))-box.left,edgeRight=Math.max(...cells.map(r=>r.right))-box.left;
 const leftRoom=edgeLeft-28,rightRoom=box.width-edgeRight-28,wantsLeft=target.left+target.width/2<box.left+box.width/2;
 const side=leftRoom>=270&&(wantsLeft||rightRoom<270)?'left':rightRoom>=270?'right':'overlay',mobile=side==='overlay';
 summary.dataset.placement=side;
 summary.style.width=(mobile?Math.min(360,box.width-24):Math.min(350,side==='left'?leftRoom:rightRoom))+'px';
 summary.style.maxHeight=Math.max(180,box.height-20)+'px';
 const width=summary.offsetWidth,height=summary.offsetHeight;
 const left=mobile?(box.width-width)/2:side==='left'?edgeLeft-width-24:edgeRight+24;
 const top=mobile?(box.height-height)/2:target.top-box.top+target.height/2-height/2;
 Object.assign(summary.style,{left:clamp(left,10,box.width-width-10)+'px',right:'auto',top:clamp(top,6,box.height-height-6)+'px',margin:'0'});
 const copy=summary.querySelector('[data-summary-copy]');copy.tabIndex=copy.scrollHeight>copy.clientHeight+1?0:-1;
 summary.style.transformOrigin=mobile?'50% 50%':side==='left'?'100% 35%':'0 35%';
 if(tether){const panel=summary.getBoundingClientRect(),leftSide=side==='left',a={x:(leftSide?target.left:target.right)-box.left,y:target.top+target.height/2-box.top},b={x:(leftSide?panel.right:panel.left)-box.left,y:Math.max(panel.top+35,Math.min(target.top+target.height/2,panel.bottom-35))-box.top};tether.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);tether.querySelector('path').setAttribute('d',mobile?'':`M${a.x} ${a.y} Q${(a.x+b.x)/2} ${a.y} ${b.x} ${b.y}`);}
}
function schedule(){if(!frame)frame=requestAnimationFrame(placeEducation);}
if(education&&summary){new MutationObserver(schedule).observe(summary,{attributes:true,subtree:true,attributeFilter:['hidden','data-side','data-row']});const resize=new ResizeObserver(schedule);resize.observe(education);resize.observe(summary);window.addEventListener('nourishland:route',schedule);}

// The learning guide owns its four illustrated scenes.
import "./food-forest-guide.js?v=0.9799";
