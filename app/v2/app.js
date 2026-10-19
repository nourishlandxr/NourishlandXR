import './site-navigation.js';
import { BUILD_INFO } from '../services/buildInfo.js';
const aliases={main:'home',pathways:'education',learn:'education',explore:'platform',grow:'food-forests',connect:'nature-learning',create:'creator','creator-start':'creator','creator-steps':'creator',projects:'pilot','project-hillyards':'pilot','pilot-program':'pilot','pilot-application':'collaborate',support:'collaborate',tools:'demos','library-guide':'education','webxr-guide':'demos','field-guide':'demos','studio-guide':'demos','imap-guide':'demos','native-xr-guide':'demos',solarpunk:'about',contact:'collaborate'};
const titles={home:'Learning rooted in place',education:'Education','food-forests':'Food Forests','nature-learning':'Immersive Learning',platform:'Creator + Explorer',creator:'Creator',explorer:'Explorer',pilot:'The pilot',demos:'Demos & access',about:'About',collaborate:'Collaborate','food-forest-guide':'Food-forest learning guide'};
function showRoute({focus=false}={}){
 const key=location.hash.slice(1)||'home';
 const route=aliases[key]||key;
 const page=titles[route]?route:'home';
 document.body.dataset.page=page;
 document.querySelectorAll('.route-block').forEach(block=>{block.hidden=block.dataset.route!==page;});
 document.title=`Nourishland — ${titles[page]}`;
 window.dispatchEvent(new CustomEvent('nourishland:route',{detail:{page}}));
 requestAnimationFrame(()=>{
  const destination=document.getElementById(key);
  if(destination&&key!==page&&!destination.hidden)destination.scrollIntoView({block:'start'});
  else window.scrollTo({top:0,behavior:'instant'});
  if(focus){const heading=document.querySelector('.route-block:not([hidden]) h1, .route-block:not([hidden]) h2');heading?.setAttribute('tabindex','-1');heading?.focus({preventScroll:true});}
 });
}
window.addEventListener('hashchange',()=>showRoute({focus:true}));showRoute();
document.querySelectorAll('[data-site-version]').forEach(node=>node.textContent=`Preview ${BUILD_INFO.version}`);
