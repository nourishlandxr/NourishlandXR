// Public pages have one address. /xr remains the shared application asset root.
export const WEBSITE_ROUTES=Object.freeze({home:'/',education:'/education/','food-forests':'/food-forests/','food-forest-story':'/food-forests/story/','food-forest-guide':'/food-forests/guide/','nature-learning':'/immersive-learning/',platform:'/platform/',hillyards:'/hillyards/',collaborate:'/collaborate/',about:'/about/',contact:'/contact/',places:'/places/'});
export const WEBSITE_ALIASES=Object.freeze({main:'home',why:'education',what:'education',how:'education',learn:'education',pathways:'education',explore:'platform',grow:'food-forests',connect:'nature-learning',create:'platform',creator:'platform',explorer:'platform','creator-start':'platform','creator-steps':'platform',projects:'hillyards','project-hillyards':'hillyards',pilot:'collaborate','pilot-program':'collaborate','pilot-application':'collaborate',support:'collaborate',tools:'platform','library-guide':'education','webxr-guide':'platform','field-guide':'platform','studio-guide':'platform','imap-guide':'platform','native-xr-guide':'platform',solarpunk:'about',contact:'contact'});
export const LEGACY_WEBSITE_PAGES=Object.freeze({
 '/vision/':'/about/','/vision-2/':'/about/','/what-is-nourish-land/':'/about/','/start-here/':'/education/',
 '/food-forests-2/':'/food-forests/','/a-food-forest-story/':'/food-forests/story/','/web-of-life/':'/food-forests/guide/','/food-forest-education/':'/education/',
 '/plant-literacy/':'/immersive-learning/','/plant-literacy-2/':'/immersive-learning/','/crops-of-the-future/':'/food-forests/guide/',
 '/hillyards-food-forest/':'/hillyards/','/demonstration-sites/hillyards-food-forest-gardens/':'/hillyards/',
 '/demonstration-sites/':'/places/','/demonstration-sites/daleys-fruit-tree-nursery-demonstration-landscapes/':'/places/',
 '/demonstration-sites/expanding-demonstration-network/':'/collaborate/','/food-forest-network/':'/collaborate/',
 '/workshops/':'/collaborate/','/programs/':'/collaborate/','/food-forest-propagation-programs/':'/collaborate/','/nourishland-foundation-program/':'/collaborate/',
 '/services/':'/platform/','/contact-us/':'/contact/'
});
export const RETIRED_WEBSITE_PAGES=Object.freeze(['/east-timor/','/2026/01/11/hello-world/']);
export const LEGACY_ENTRY_FILES=Object.freeze({
 'xr/index.html':'/platform/','xr/v2/index.html':'/','xr/v2/mobile-study/index.html':'/','xr/v2/full-3d/index.html':'/experience/'
});
export function websiteUrl(section='home',query={},moduleUrl=import.meta.url){
 const root=new URL(globalThis.NOURISHLAND_CONFIG?.websiteBase||'../../',moduleUrl);
 const url=new URL(WEBSITE_ROUTES[section]||section,root);
 for(const [key,value] of Object.entries(query))if(value!==''&&value!=null)url.searchParams.set(key,value);
 return url;
}
// Pure and embeddable in tiny bridge pages: no network request before redirecting.
export function resolveLegacyEntry(locationLike,routes=WEBSITE_ROUTES,aliases=WEBSITE_ALIASES){
 const path=locationLike.pathname.replace(/\/index\.html$/,'/').replace(/\/$/,'')||'/',query=new URLSearchParams(locationLike.search||''),hash=(locationLike.hash||'').slice(1);
 let target;
 if(/^\/(?:xr|app)$/.test(path)){
  const portal=query.get('creator')==='1'?'creator':query.get('section');
  if(['creator','account','admin','demos'].includes(portal))target='/'+portal+'/';
  else if([...query.keys()].some(key=>!['review','ref','gclid','fbclid','release'].includes(key)&&!key.startsWith('utm_')))target='/app/';
  else target='/platform/';
 }else if(/\/(?:xr|app)?\/?v2\/full-3d$/.test(path))target='/experience/';
 else if(/^\/(?:(?:xr|app)\/)?v2(?:\/mobile-study)?$/.test(path))target='/';
 else return null;
 let fragment=locationLike.hash||'';
 if(target!=='/app/'&&target!=='/experience/'&&hash){
  const page=routes[hash]?hash:aliases[hash];
  if(page){target=routes[page];fragment='';}
  else if(hash==='demos'){target='/demos/';fragment='';}
 }
 return target+(locationLike.search||'')+fragment;
}
