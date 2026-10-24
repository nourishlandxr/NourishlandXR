import {websiteUrl} from "./siteRoutes.js?v=0.9813";
export {websiteUrl} from "./siteRoutes.js?v=0.9813";
const config=globalThis.NOURISHLAND_CONFIG||{};
const root=new URL(config.portalBase||'../',import.meta.url);
export function portalUrl(section='home',query={}){
    const url=section==='home'&&config.websiteBase?websiteUrl('platform'):new URL(section==='home'?(config.appEntry||''):`${section}/`,root);
    for(const [key,value] of Object.entries(query))if(value!=='' && value!=null)url.searchParams.set(key,value);
    return url;
}
export function requestedPortalRoute(locationLike=globalThis.location){
    const params=new URLSearchParams(locationLike.search);
    if(['home','demos','creator','account','admin'].includes(params.get('section')))return params.get('section');
    const folder=locationLike.pathname.replace(/index\.html$/,'').replace(/\/$/,'').split('/').at(-1);
    if(['demos','creator','account','admin'].includes(folder))return folder;
    if(!params.size || params.get('creator')==='1')return params.get('creator')==='1'?'creator':'home';
    return '';
}
export function ensurePortalStyles(){
    if(document.querySelector('[data-portal-style]'))return;
    const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('../access-portal.css',import.meta.url).href;link.dataset.portalStyle='';document.head.append(link);
}
