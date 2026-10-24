import "./totem-journey.js?v=0.9813";
import {transitionPage} from "./page-transitions.js?v=0.9813";
import {prepareEntrance,enterPage} from "./experience.js?v=0.9813";
import {BUILD_INFO} from "/xr/services/buildInfo.js?v=0.9813";
import "./site-navigation.js?v=0.9813";
import {WEBSITE_ROUTES as routes,WEBSITE_ALIASES as aliases} from "/xr/services/siteRoutes.js?v=0.9813";
const reverse=Object.fromEntries(Object.entries(routes).map(([k,v])=>[v,k]));let heroStarted=false;
function render({focus=false,animate=true}={}){let key=reverse[location.pathname]||'home',section=location.hash.slice(1);if(section==='demos'){location.replace('/demos/'+location.search);return;}if(section&&(routes[section]||aliases[section])){key=routes[section]?section:aliases[section];const hash=section===key?'':'#'+section;if(location.pathname!==routes[key]||section===key)history.replaceState(null,'',routes[key]+location.search+hash);}
 document.body.dataset.page=key;document.querySelectorAll('[data-route]').forEach(n=>n.hidden=n.dataset.route!==key);const current=document.querySelector(`[data-route="${key}"]`);document.title=current?.dataset.title||'Nourishland';
 const canonical=document.querySelector('link[rel=canonical]');if(canonical)canonical.href='https://nourishland.org'+routes[key];
 for(const n of document.querySelectorAll('meta[property="og:url"]'))n.content='https://nourishland.org'+routes[key];
 window.dispatchEvent(new CustomEvent('nourishland:route',{detail:{page:key,section:section||key}}));
 prepareEntrance(key,{animate});
 document.querySelectorAll('.header-pathways a,#main-nav a').forEach(a=>{if(new URL(a.href).pathname===routes[key])a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 if(key==='home'&&!heroStarted){heroStarted=true;current?.querySelectorAll('[data-hero-src],[data-hero-srcset]').forEach(n=>{if(n.dataset.heroSrc)n.setAttribute('src',n.dataset.heroSrc);if(n.dataset.heroSrcset)n.setAttribute('srcset',n.dataset.heroSrcset);});import('/xr/v2/homepage-hero.js?v=autoplay-09783');}
 requestAnimationFrame(()=>{const target=section&&document.getElementById(section);if(target&&!target.closest('[hidden]'))target.scrollIntoView({block:'start'});else scrollTo({top:0,behavior:'instant'});if(focus){const h=current?.querySelector('h1');h?.setAttribute('tabindex','-1');h?.focus({preventScroll:true});}});
}
let firstRender=true;
function show(options={}){const from=document.body.dataset.page,to=reverse[location.pathname]||'home',animate=firstRender;firstRender=false;transitionPage(()=>render({...options,animate}),from,to,()=>enterPage(document.body.dataset.page,{animate}));}
const header=document.querySelector('#site-header');if(header)new ResizeObserver(()=>document.documentElement.style.setProperty('--site-header-height',header.getBoundingClientRect().height+'px')).observe(header);
document.addEventListener('click',e=>{const a=e.target.closest('a');if(!a||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||a.target||a.hasAttribute('download'))return;const u=new URL(a.href);if(u.origin!==location.origin||!reverse[u.pathname])return;e.preventDefault();history.pushState(null,'',u.pathname+u.search+u.hash);show({focus:true});});
addEventListener('popstate',()=>show({focus:true}));addEventListener('hashchange',()=>show({focus:true}));document.querySelectorAll('[data-site-version]').forEach(n=>n.textContent=BUILD_INFO.target==='production'?`V${BUILD_INFO.version} · Live`:`Preview ${BUILD_INFO.version}`);show();
