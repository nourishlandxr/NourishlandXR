const navigation=document.querySelector('#main-nav');
const button=document.querySelector('.menu-toggle');
const regions=[...document.querySelectorAll('main, footer')];
let open=false;
function setOpen(next,{restore=false}={}){
 open=next;navigation.hidden=!next;button.setAttribute('aria-expanded',String(next));
 button.setAttribute('aria-label',next?'Close menu':'Open menu');button.title=next?'Close menu':'Open menu';
 button.querySelector('path').setAttribute('d',next?'M6 6l12 12M6 18L18 6':'M4 7h16M4 12h16M4 17h16');
 document.body.toggleAttribute('data-navigation-open',next);
 regions.forEach(region=>region.inert=next);
 window.dispatchEvent(new CustomEvent('nourishland:navigation-state',{detail:{open:next}}));
 if(next)navigation.querySelector('a').focus();else if(restore)button.focus();
}
button.addEventListener('click',()=>setOpen(!open,{restore:true}));
navigation.addEventListener('click',event=>{if(event.target.closest('a'))setOpen(false,{restore:true});});
document.addEventListener('keydown',event=>{
 if(!open)return;
 if(event.key==='Escape'){event.preventDefault();setOpen(false,{restore:true});}
 if(event.key==='Tab'){
  const links=[button,...navigation.querySelectorAll('a')];
  const index=links.indexOf(document.activeElement);
  if(event.shiftKey&&(index===0||index===-1)){event.preventDefault();links.at(-1).focus();}
  else if(!event.shiftKey&&(index===links.length-1||index===-1)){event.preventDefault();button.focus();}
 }
});
document.addEventListener('pointerdown',event=>{if(open&&!navigation.contains(event.target)&&!button.contains(event.target))setOpen(false);});
window.addEventListener('hashchange',()=>{if(open)setOpen(false);});
window.addEventListener('nourishland:route',event=>{
 const page=event.detail.page;
 const group=page==='education'?(['why','what','how'].includes(event.detail.section)?event.detail.section:'why'):page;
 document.querySelectorAll('.header-pathways a, #main-nav a').forEach(link=>{
  const target=link.closest('.header-pathways')||page==='education'?group:page;
  const current=link.hash===`#${target}`;
  if(current)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
 });
});
