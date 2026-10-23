// The main site retains the complete original story; the independent XR preview
// keeps its existing portrait module and does not import this reader.
const story=document.querySelector('[data-complete-story]');
if(story){
 const tabs=[...story.querySelectorAll('[data-story-tab]')],chapters=[...story.querySelectorAll('[role=tabpanel]')],select=story.querySelector('[data-story-select]');
 let current=0;
 function fit(){
  if(story.hidden)return;
  const chapter=chapters[current],space=chapter.querySelector('.story-picture-space'),figure=space.querySelector('figure'),img=figure.querySelector('img');
  const ratio=img.naturalWidth?img.naturalWidth/img.naturalHeight:1;
  const width=Math.min(space.clientWidth,space.clientHeight*ratio);
  Object.assign(figure.style,{width:width+'px',height:width/ratio+'px'});
  const text=chapter.querySelector('.story-full-text');chapter.dataset.more=String(text.scrollHeight>text.clientHeight+4&&text.scrollTop+text.clientHeight<text.scrollHeight-8);
  chapter.dataset.quoteFits=String(text.clientHeight>=190);
  chapter.style.setProperty('--story-reading-top',text.offsetTop+'px');
 }
 function show(index,focus=false){
  current=Math.max(0,Math.min(index,chapters.length-1));
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
  const figure=chapter.querySelector('figure');figure.addEventListener('pointerenter',()=>chapter.dataset.ideaHighlighted='true');figure.addEventListener('pointerleave',()=>chapter.dataset.ideaHighlighted='false');
  const quote=chapter.querySelector('.story-original-quote');
  if(quote){
   const preview=document.createElement('aside');preview.className='story-hover-quote';preview.setAttribute('aria-hidden','true');preview.append(quote.cloneNode(true));chapter.querySelector('.story-chapter-copy').append(preview);
   figure.tabIndex=0;figure.title='Reveal the original quotation beside the portrait';
   figure.addEventListener('focusin',()=>chapter.dataset.ideaHighlighted='true');figure.addEventListener('focusout',()=>chapter.dataset.ideaHighlighted='false');
  }
 }
 new ResizeObserver(fit).observe(story.querySelector('.story-reader'));
 window.addEventListener('nourishland:route',event=>{if(event.detail.page==='food-forest-story')requestAnimationFrame(fit);});
 show(0);
}
