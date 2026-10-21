import './site-navigation.js';
import { BUILD_INFO } from '../services/buildInfo.js';
const aliases={main:'home',why:'education',what:'education',how:'education',pathways:'education',learn:'education',explore:'platform',grow:'food-forests',connect:'nature-learning',create:'platform',creator:'platform',explorer:'platform','creator-start':'platform','creator-steps':'platform',projects:'collaborate',pilot:'collaborate',about:'collaborate','project-hillyards':'collaborate','pilot-program':'collaborate','pilot-application':'collaborate',support:'collaborate',tools:'demos','library-guide':'education','webxr-guide':'demos','field-guide':'demos','studio-guide':'demos','imap-guide':'demos','native-xr-guide':'demos',solarpunk:'collaborate',contact:'collaborate'};
const titles={home:'Interactive plant learning',education:'Why, what and how','food-forests':'Food Forests','food-forest-story':'The story of a food forest','nature-learning':'Immersive Learning',platform:'Creator & Explorer',hillyards:'Hillyards immersive-walk prototype',demos:'Try the demo',collaborate:'Build with us','food-forest-guide':'Food-forest learning guide'};
function showRoute({focus=false}={}){
 const key=location.hash.slice(1)||'home';
 const route=aliases[key]||key;
 const page=titles[route]?route:'home';
 document.body.dataset.page=page;
 document.querySelectorAll('.route-block').forEach(block=>{block.hidden=block.dataset.route!==page;});
 document.title=`Nourishland — ${titles[page]}`;
 window.dispatchEvent(new CustomEvent('nourishland:route',{detail:{page,section:key}}));
 requestAnimationFrame(()=>{
  const destination=document.getElementById(key);
  const sectionTarget=destination&&key!==page&&destination.closest('.route-block')?.hidden===false;
  if(sectionTarget)destination.scrollIntoView({block:'start'});
  else window.scrollTo({top:0,behavior:'instant'});
  if(focus){const scope=sectionTarget?destination:document.querySelector('.route-block:not([hidden])');const heading=scope?.querySelector('h1,h2');heading?.setAttribute('tabindex','-1');heading?.focus({preventScroll:true});}
 });
}
window.addEventListener('hashchange',()=>showRoute({focus:true}));showRoute();
document.querySelectorAll('[data-site-version]').forEach(node=>node.textContent=`Preview ${BUILD_INFO.version}`);
