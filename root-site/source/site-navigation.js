const navigation=document.querySelector('#main-nav'),button=document.querySelector('.menu-toggle');
const regions=[...document.querySelectorAll('main,footer')],previousInert=new Map();let open=false;
function setOpen(next,{restore=false}={}){
 if(open===next)return;
 open=next;navigation.hidden=!next;button.setAttribute('aria-expanded',String(next));
 button.setAttribute('aria-label',next?'Close menu':'Open menu');button.title=next?'Close menu':'Open menu';
 button.querySelector('path').setAttribute('d',next?'M6 6l12 12M6 18L18 6':'M4 7h16M4 12h16M4 17h16');
 document.body.toggleAttribute('data-navigation-open',next);
 for(const region of regions){if(next){previousInert.set(region,region.inert);region.inert=true;}else region.inert=previousInert.get(region)??false;}
 if(!next)previousInert.clear();
 window.dispatchEvent(new CustomEvent('nourishland:navigation-state',{detail:{open:next}}));
 if(next)navigation.querySelector('a').focus({preventScroll:true});else if(restore)button.focus({preventScroll:true});
}
button.addEventListener('click',()=>setOpen(!open,{restore:true}));
navigation.addEventListener('click',event=>{if(event.target.closest('a'))setOpen(false);});
document.addEventListener('keydown',event=>{
 if(!open)return;
 if(event.key==='Escape'){event.preventDefault();setOpen(false,{restore:true});return;}
 if(event.key!=='Tab')return;
 const links=[button,...navigation.querySelectorAll('a')],index=links.indexOf(document.activeElement);
 if(event.shiftKey&&(index===0||index===-1)){event.preventDefault();links.at(-1).focus();}
 else if(!event.shiftKey&&(index===links.length-1||index===-1)){event.preventDefault();button.focus();}
});
document.addEventListener('pointerdown',event=>{if(open&&!navigation.contains(event.target)&&!button.contains(event.target))setOpen(false);});
window.addEventListener('hashchange',()=>setOpen(false));
window.addEventListener('nourishland:route',()=>{
 setOpen(false);
 for(const link of navigation.querySelectorAll('a')){
  if(new URL(link.href).pathname===location.pathname)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
 }
});
