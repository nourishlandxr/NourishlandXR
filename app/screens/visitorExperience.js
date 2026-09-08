import { loadProjects, loadProjectSites, loadSitePlaces, loadPlantProfile } from '../services/persistence.js';
import { loadGuide } from './fieldGuide.js';
import { resolvePlantPim } from '../services/pimLegacyAdapter.js';
import { mountPlantInformationWeb } from '../components/plantInformationWeb.js';
import { html, key, safeImage, specimenKey, searchSpecimens, leafArtwork, productHeader, bindProductHeader, visitorNavigation, arReadiness } from '../services/productExperience.js';
import { detectWebXRSessionSupport } from '../services/webxrSession.js';
import { startArNote } from '../services/arNote.js';

let generation = 0;
let reader = null;
let activeGuide = null;
const guideState = new Map();
const route = (view, project = '', selection = '') => window.openVisitor(view,project,selection);
const areaKey = plant => JSON.stringify([plant.siteId,plant.placeId]);
const opening = () => `<div class="screen v2-screen">${productHeader()}<p class="v2-eyebrow">Nourishland XR</p><h1>Opening this place…</h1><p class="v2-status" role="status">Loading published knowledge</p></div>`;
const header = (project,active) => `${productHeader()}<div class="v2-context"><button data-all-places>All places</button><span> / ${html(project.name)}</span></div>${visitorNavigation(active)}`;
const card = plant => `<button class="v2-card" data-specimen="${html(specimenKey(plant))}">${safeImage(plant.image || plant.photo) ? `<img class="v2-card-image" src="${html(safeImage(plant.image || plant.photo))}" alt="" loading="lazy" />` : '<span class="v2-card-glyph" aria-hidden="true">↟</span>'}<strong>${html(plant.commonName || 'Plant')}</strong>${plant.scientificName ? `<em>${html(plant.scientificName)}</em>` : ''}<small>${html(plant.placeName || 'Location within this place not recorded')}${plant.layer ? ` · ${html(plant.layer)}` : ''}</small></button>`;

function bind(root, projectId) {
    bindProductHeader(root);
    root.querySelector('[data-all-places]')?.addEventListener('click',()=>route('places'));
    root.querySelectorAll('[data-visitor-view]').forEach(button=>button.addEventListener('click',()=>route(button.dataset.visitorView,projectId)));
    root.querySelectorAll('[data-specimen]:not([data-search-bound])').forEach(button=>button.addEventListener('click',()=>route('plant',projectId,button.dataset.specimen)));
    root.querySelectorAll('[data-area-filter]').forEach(button=>button.addEventListener('click',()=>{
        guideState.set(projectId,{...guideState.get(projectId),area:button.dataset.areaFilter});
        route('plants',projectId);
    }));
}
export function cancelVisitorExperience() { generation++; reader?.destroy(); reader=null; }
export function clearVisitorCache() { activeGuide = null; }
async function guideFor(projectId) {
    if (activeGuide?.project.id === projectId) return activeGuide;
    const guide = await loadGuide(projectId);
    if (['hidden','under_construction'].includes(guide.project.projectStatus)) throw new Error('This place is not open to visitors yet.');
    activeGuide = guide;
    return guide;
}
function rememberPlace(project) {
    try { localStorage.setItem('nxr-v2-last-place',JSON.stringify({id:project.id,name:project.name})); } catch {}
}
export async function renderVisitorExperience(app, view='places', projectId='', selection='') {
    const request = ++generation;
    reader?.destroy(); reader = null;
    app.innerHTML = opening(); bindProductHeader(app);
    try {
        if (view === 'places') {
            const projects = (await loadProjects(true)).filter(p=>!['plant-library','Banyula'].includes(p.id) && p.projectStatus !== 'hidden');
            if (request !== generation) return;
            app.innerHTML = `<div class="screen v2-screen">${productHeader()}<p class="v2-eyebrow">Step into a living place</p><h1>Where will you explore?</h1><p class="v2-lead">Find food forests, gardens and the knowledge growing within them.</p><div class="v2-search"><label>Find a place<input type="search" data-place-search placeholder="Name or location" /></label></div><p class="v2-result-count" role="status" data-place-count>${projects.length} published places</p><div class="v2-grid" data-place-grid>${projects.map(p=>`<button class="v2-card" data-place="${html(p.id)}" data-search="${html([p.name,p.address].join(' ').toLowerCase())}"><span class="v2-eyebrow">${p.projectStatus === 'under_construction' ? 'Growing · not open yet' : 'Explore'}</span><strong>${html(p.name)}</strong><small>${html(p.description || 'Discover plants and stories in this place.')}</small><small>${html(p.address || '')}</small></button>`).join('')}</div><div class="v2-empty" data-no-places ${projects.length ? 'hidden' : ''}><h2>No places to show yet</h2><p>Published places will appear here when their creators are ready to share them.</p><button class="v2-secondary" data-v2-home>Return home</button></div></div>`;
            bind(app);
            app.querySelectorAll('[data-v2-home]').forEach(b=>b.addEventListener('click',()=>window.renderLaunchScreen()));
            app.querySelectorAll('[data-place]').forEach(b=>b.addEventListener('click',()=>route('place',b.dataset.place)));
            app.querySelector('[data-place-search]').addEventListener('input',event=>{
                let count=0;
                app.querySelectorAll('[data-place]').forEach(b=>{ b.hidden=!b.dataset.search.includes(event.target.value.trim().toLowerCase()); if(!b.hidden)count++; });
                app.querySelector('[data-place-count]').textContent=`${count} places`;
                app.querySelector('[data-no-places]').hidden=count>0;
            });
            return;
        }
        const guide = await guideFor(projectId);
        if (request !== generation) return;
        const {project,plants,siteGroups} = guide;
        rememberPlace(project);
        const places = siteGroups.flatMap(g=>g.placeGroups.map(p=>({...p.place,siteId:g.site.id,count:p.plants.length})));
        if (view === 'place') {
            app.innerHTML=`<div class="screen v2-screen">${header(project,'place')}<section class="v2-hero"><div><p class="v2-eyebrow">Welcome to</p><h1>${html(project.name)}</h1><p class="v2-lead">${html(project.description || 'Look closer. Every plant has a story, and every story belongs to a place.')}</p><div class="v2-actions"><button class="v2-primary" data-visitor-view="plants">Discover ${plants.length || ''} plants</button><button class="v2-secondary" data-visitor-view="ar">Explore in AR</button></div><p class="v2-reading-label">The field guide works without camera or location access.</p></div>${safeImage(project.coverImage)?`<img class="v2-map-image" src="${html(safeImage(project.coverImage))}" alt="${html(project.name)}"/>`:leafArtwork()}</section><section><p class="v2-eyebrow">Start with a plant</p><div class="v2-grid">${plants.slice(0,3).map(card).join('') || '<p class="v2-notice">Plant knowledge is still being prepared for this place.</p>'}</div></section></div>`;
        } else if (view === 'plants') {
            const state=guideState.get(projectId) || {query:'',area:'',layer:'',limit:36};
            app.innerHTML=`<div class="screen v2-screen">${header(project,'plants')}<p class="v2-eyebrow">${html(project.name)} · Field guide</p><h1>Meet the plants.</h1><p class="v2-lead">Find a name, a forest layer, or a use. Open a plant to follow its knowledge.</p><form class="v2-search" role="search"><label>Search plants in this place<input type="search" name="query" value="${html(state.query)}" placeholder="Common name, scientific name or use" /></label><label>Where<select name="area"><option value="">Everywhere</option>${places.map(p=>`<option value="${html(JSON.stringify([p.siteId,p.id]))}" ${state.area===JSON.stringify([p.siteId,p.id])?'selected':''}>${html(p.name)}</option>`).join('')}</select></label><label>Forest layer<select name="layer"><option value="">All layers</option>${[...new Set(plants.map(p=>p.layer).filter(Boolean))].sort().map(l=>`<option ${l===state.layer?'selected':''}>${html(l)}</option>`).join('')}</select></label></form><p class="v2-result-count" role="status" aria-live="polite" data-result-count></p><div class="v2-grid" data-plant-results></div><div class="v2-actions"><button class="v2-secondary" data-more-plants>Show more plants</button></div><div class="v2-empty" data-empty hidden><h2>No plants match yet</h2><p>Try a shorter name or widen your filters.</p><button class="v2-secondary" data-clear-filter>Clear filters</button></div></div>`;
            const form=app.querySelector('form');
            const results=app.querySelector('[data-plant-results]');
            const update=()=>{
                const matching=searchSpecimens(plants,state.query,state.area,state.layer);
                results.innerHTML=matching.slice(0,state.limit || 36).map(card).join('');
                results.querySelectorAll('[data-specimen]').forEach(b=>{b.dataset.searchBound='';b.addEventListener('click',()=>{state.scroll=window.scrollY;guideState.set(projectId,state);route('plant',projectId,b.dataset.specimen);});});
                app.querySelector('[data-result-count]').textContent=`${matching.length} ${matching.length===1?'plant':'plants'} in ${project.name}${state.query?` matching “${state.query}”`:''}`;
                app.querySelector('[data-empty]').hidden=matching.length>0;
                app.querySelector('[data-more-plants]').hidden=matching.length<=(state.limit || 36);
                guideState.set(projectId,state);
            };
            form.addEventListener('submit',e=>e.preventDefault());
            form.addEventListener('input',()=>{Object.assign(state,Object.fromEntries(new FormData(form)),{limit:36,scroll:0}); update();});
            app.querySelector('[data-more-plants]').addEventListener('click',()=>{state.limit=(state.limit||36)+36;update();});
            app.querySelector('[data-clear-filter]').addEventListener('click',()=>{form.reset(); form.elements.query.value='';form.elements.area.value='';form.elements.layer.value='';Object.assign(state,{query:'',area:'',layer:'',limit:36,scroll:0});update();form.elements.query.focus();});
            update();
            if(state.scroll) requestAnimationFrame(()=>window.scrollTo({top:state.scroll,behavior:'instant'}));
        } else if(view === 'plant') {
            const plant=plants.find(p=>specimenKey(p)===selection);
            if(!plant) throw new Error('This plant is no longer available in the published field guide.');
            const profile=plant.markerId ? await loadPlantProfile(project.id,plant.siteId,plant.placeId,plant.markerId,true) : plant;
            if(request!==generation)return;
            const pim=resolvePlantPim(profile,{commonName:plant.commonName,scientificName:plant.scientificName},{plantId:plant.plantId || plant.markerId,includeDraft:false});
            app.innerHTML=`<div class="screen v2-screen v2-profile">${header(project,'plants')}<div class="v2-context"><button data-visitor-view="plants">← Back to your plants</button><span>${html(plant.placeName)}</span></div><section class="v2-profile-intro"><div><p class="v2-eyebrow">A plant in ${html(project.name)}</p><h1>${html(plant.commonName)}</h1><p class="v2-lead"><em>${html(profile.scientific_name || plant.scientificName)}</em></p><p>${html(profile.overview || plant.summary || 'A growing body of knowledge, rooted in this place.')}</p></div>${safeImage(profile.image || profile.photo || plant.image)?`<img src="${html(safeImage(profile.image||profile.photo||plant.image))}" alt="${html(plant.commonName)}" />`:''}</section><aside class="v2-profile-context"><strong>This plant, in this place</strong><p>${html(plant.placeName || 'Location not yet described')}${plant.status ? ` · ${html(plant.status)}`:''}</p>${plant.localNotes && plant.localNotes !== plant.summary ? `<p><small>Record note · scope not yet reviewed</small><br>${html(plant.localNotes)}</p>` : '<p>Local observations can add to what is known about the species.</p>'}</aside><p class="v2-reading-label">Explore a topic below. Sources stay attached to the knowledge they support.</p><div data-visitor-pim></div></div>`;
            reader=mountPlantInformationWeb(app.querySelector('[data-visitor-pim]'),{document:pim,editable:false,embedded:true,initialState:{outlineBranchId:pim.nodes.find(n=>n.body && n.parentId)?.primaryCategory || 'food-forest'}});
        } else if(view === 'map') {
            const image=safeImage(project.siteMap?.image || project.site_map?.image || project.livingMap?.background?.assetUrl);
            app.innerHTML=`<div class="screen v2-screen">${header(project,'map')}<p class="v2-eyebrow">Find your way</p><h1>${html(project.name)}</h1><p class="v2-lead">Choose a part of this place to discover its plants.</p>${image?`<img class="v2-map-image" src="${html(image)}" alt="Map shared by ${html(project.name)}"/>`:'<p class="v2-notice">This is a directory of areas, not a scale map or your current position. A site map has not been shared yet.</p>'}<div class="v2-map-board">${places.map(p=>`<button class="v2-card" data-area-filter="${html(JSON.stringify([p.siteId,p.id]))}"><strong>${html(p.name)}</strong><small>${p.count} plants · Open field guide</small></button>`).join('') || '<p>No areas have been shared yet.</p>'}</div></div>`;
        } else if(view === 'ar') {
            let support={};
            try{support=await detectWebXRSessionSupport();}catch{}
            if(request!==generation)return;
            const readiness=arReadiness({secure:window.isSecureContext,xr:Boolean(navigator.xr),supported:Boolean(support['immersive-ar'] || support['immersive-vr'])});
            app.innerHTML=`<div class="screen v2-screen">${header(project,'place')}<p class="v2-eyebrow">Explore in the landscape</p><h1>Look up. Look closer.</h1><p class="v2-lead">${html(readiness.label)}</p><p>${html(readiness.detail)}</p><ol class="v2-ar-steps"><li>Stand somewhere safe and keep the path clear.</li><li>Move your device gently to establish tracking.</li><li>Select a plant to read; close it to look around again.</li></ol><p class="v2-notice">Plant positions have not been aligned to this visit. AR currently offers a spatial reading space; it does not identify the plant in front of you.</p><div class="v2-actions">${readiness.ready?'<button class="v2-primary" data-start-visitor-ar>Enter AR</button>':''}<button class="v2-secondary" data-visitor-view="plants">Open field guide</button></div><p role="status" data-ar-start-status></p></div>`;
            app.querySelector('[data-start-visitor-ar]')?.addEventListener('click',async e=>{
                e.currentTarget.disabled=true;
                const status=app.querySelector('[data-ar-start-status]');status.textContent='Starting AR…';
                try {await startArNote(null,null,{projectId:project.id,plants:plants.map(p=>({id:specimenKey(p),name:p.commonName,description:p.summary || '',type:'plant'})),onBrowse:()=>route('plants',project.id),onMap:()=>route('map',project.id),onRead:id=>route('plant',project.id,id)});}
                catch(error){status.textContent=`AR could not start: ${error.message}. You can continue in the field guide.`;}
                finally{if(app.contains(status)){const button=app.querySelector('[data-start-visitor-ar]');if(button)button.disabled=false;}}
            });
        } else throw new Error('This view is unavailable.');
        bind(app,projectId);
    } catch(error) {
        if(request!==generation)return;
        app.innerHTML=`<div class="screen v2-screen">${productHeader()}<p class="v2-eyebrow">A pause on the path</p><h1>We couldn’t open this.</h1><p role="alert">${html(error.message)}</p><div class="v2-actions"><button class="v2-primary" data-retry>Try again</button><button class="v2-secondary" data-all-places>Choose another place</button></div></div>`;
        bind(app,projectId);
        app.querySelector('[data-retry]').addEventListener('click',()=>{activeGuide=null;renderVisitorExperience(app,view,projectId,selection);});
    }
}
