// The main site retains the complete original story; the independent XR preview
// keeps its existing portrait module and does not import this reader.
const story=document.querySelector('[data-complete-story]');
if(story){
 const tabs=[...story.querySelectorAll('[data-story-tab]')],chapters=[...story.querySelectorAll('[role=tabpanel]')],select=story.querySelector('[data-story-select]');
 let current=0;const resetQuotes=[];
 function fit(){
  if(story.hidden)return;
  const chapter=chapters[current],space=chapter.querySelector('.story-picture-space'),figure=space.querySelector('figure'),img=figure.querySelector('img');
  const ratio=img.naturalWidth?img.naturalWidth/img.naturalHeight:1;
  const width=Math.min(space.clientWidth,space.clientHeight*ratio);
  Object.assign(figure.style,{width:width+'px',height:width/ratio+'px'});
  const text=chapter.querySelector('.story-full-text');chapter.dataset.more=String(text.scrollHeight>text.clientHeight+4&&text.scrollTop+text.clientHeight<text.scrollHeight-8);
  const overlay=figure.querySelector('.story-photo-quote');
  if(overlay){
   const quote=overlay.querySelector('blockquote');let size=Math.min(27,Math.max(15,figure.clientWidth*.047));
   overlay.style.setProperty('--photo-quote-size',size+'px');
   while(quote.offsetHeight>overlay.clientHeight-28&&size>14){size-=.5;overlay.style.setProperty('--photo-quote-size',size+'px');}
  }
 }
 function show(index,focus=false){
  current=Math.max(0,Math.min(index,chapters.length-1));
  resetQuotes.forEach(reset=>reset());
  chapters.forEach((chapter,i)=>chapter.hidden=i!==current);
  tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===current));tab.tabIndex=i===current?0:-1;});
  select.value=String(current);story.querySelector('[data-story-count]').textContent=`${current+1} / ${chapters.length}`;
  for(const button of story.querySelectorAll('[data-story-step]'))button.disabled=current+(+button.dataset.storyStep)<0||current+(+button.dataset.storyStep)>=chapters.length;
  chapters[current].querySelector('.story-full-text').scrollTop=0;
  for(const index of [current,Math.min(current+1,chapters.length-1)]){const image=chapters[index].querySelector('img');image.loading='eager';image.decode().then(fit).catch(()=>{});}
  requestAnimationFrame(fit);if(focus)chapters[current].querySelector('h2').focus({preventScroll:true});
 }
 tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>show(i));tab.addEventListener('keydown',event=>{const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:event.key==='ArrowRight'?(i+1)%tabs.length:event.key==='ArrowLeft'?(i-1+tabs.length)%tabs.length:null;if(next===null)return;event.preventDefault();show(next);tabs[next].focus({preventScroll:true});});});
 select.addEventListener('change',()=>show(+select.value));
 story.querySelectorAll('[data-story-step]').forEach(button=>button.addEventListener('click',()=>show(current+(+button.dataset.storyStep),true)));
 for(const chapter of chapters){
  chapter.querySelector('.story-full-text').addEventListener('scroll',fit,{passive:true});
  const figure=chapter.querySelector('figure');
  const quote=chapter.querySelector('.story-original-quote');
  if(quote){
   const preview=document.createElement('figcaption');preview.className='story-photo-quote';preview.id=chapter.id+'-photo-quote';preview.setAttribute('aria-hidden','true');preview.append(quote.cloneNode(true));figure.append(preview);
   const name=chapter.querySelector('.story-person').textContent;
   figure.tabIndex=0;figure.setAttribute('role','button');figure.setAttribute('aria-label','Show quotation from '+name);figure.setAttribute('aria-controls',preview.id);figure.setAttribute('aria-expanded','false');figure.title='Hover, focus or tap for the quotation';
   let hover=false,focused=false,pinned=false,dismissed=false;
   const reveal=()=>{const open=pinned||(!dismissed&&(hover||focused));chapter.dataset.ideaHighlighted=String(open);figure.setAttribute('aria-expanded',String(open));figure.setAttribute('aria-label',(open?'Hide':'Show')+' quotation from '+name);preview.setAttribute('aria-hidden',String(!open));requestAnimationFrame(fit);};
   resetQuotes.push(()=>{hover=focused=pinned=dismissed=false;reveal();});
   figure.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){hover=true;dismissed=false;reveal();}});
   figure.addEventListener('pointerleave',()=>{hover=false;reveal();});
   figure.addEventListener('focusin',()=>{focused=true;dismissed=false;reveal();});
   figure.addEventListener('focusout',()=>{focused=pinned=false;reveal();});
   figure.addEventListener('click',()=>{pinned=!pinned;dismissed=!pinned;reveal();});
   figure.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();figure.click();}if(event.key==='Escape'){event.preventDefault();pinned=false;dismissed=true;reveal();}});
  }
 }
 new ResizeObserver(fit).observe(story.querySelector('.story-reader'));
 const pictures=new ResizeObserver(fit);chapters.forEach(chapter=>pictures.observe(chapter.querySelector('.story-picture-space')));
 window.addEventListener('nourishland:route',event=>{if(event.detail.page==='food-forest-story')requestAnimationFrame(fit);});
 show(0);
}
