// Shared, bounded honeycomb disclosures for the demo and opt-in creator notes.
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function liveNoteTopics(text, previous = []) {
    return String(text || '').split(/\r?\n/).filter(line => line.trim()).slice(0, 12).map((line, index) => {
        const [title, ...body] = line.split('|');
        return {id: previous[index]?.id || `topic-${index + 1}`, title:title.trim().slice(0,80), body:body.join('|').trim().slice(0,4000)};
    });
}
export const liveNoteEnabled = marker => marker?.type === 'note' && marker?.appearance?.live_note?.enabled === true;
export function liveNoteTree(marker) {
    return {title:marker.name || 'Live Note', body:marker.description || marker.notes || '', children:marker.appearance?.live_note?.topics || []};
}
const leaf = (title, body, source) => ({title,body,source});
export const INTRO_GROVES = [
    {title:'Climate',body:'Explore climate, then discover possibilities. Cultivar, frost, water and local conditions always matter.',children:[
        {title:'Tropical',body:'Warm places open a different world of fruit.',children:[leaf('Mango','A tropical and subtropical fruit tree for places generally free of freezing temperatures.','https://ask.ifas.ufl.edu/publication/MG216'),leaf('Sugar apple','A warm-climate fruit featured in the UF/IFAS tropical and subtropical home-landscape guide.','https://ask.ifas.ufl.edu/publication/MG373')]},
        {title:'Subtropical',body:'Explore warmth, seasonal change and frost exposure.',children:[leaf('Citrus','Subtropical fruit: variety, site and cold protection influence success.','https://gardeningsolutions.ifas.ufl.edu/plants/edibles/fruits/citrus/'),leaf('Mango','Frost exposure is a key limit; a climate label alone does not establish suitability.','https://ask.ifas.ufl.edu/publication/MG216')]},
        {title:'Temperate',body:'Seasonal patterns and cultivar requirements shape the orchard.',children:[leaf('Apple','An example of temperate fruit. Match the cultivar to local conditions.','https://gardeningsolutions.ifas.ufl.edu/plants/edibles/fruits/'),leaf('Pear','A temperate pome fruit. Local cultivar advice and seasonal conditions matter.','https://irrec.ifas.ufl.edu/postharvest/HOS_5085C/Reading%20Assignments/2019-Postharvest_Technology-Yahia/2019-Ch._03_Classifications_of_Hort_Commodities-Yahia.pdf')]},
        leaf('Dry climates','Start with water availability, soil, heat and local experience before selecting fruit trees.'),
        leaf('Cold climates','Explore frost, growing-season length and sheltered microclimates. Seek locally proven cultivars.') ]},
    {title:'Food forest',body:'Discover how a planted landscape works as a living system.',children:[
        {title:'Layers',body:'Follow the space from canopy to soil.',children:[leaf('Canopy','Explore the trees shaping shade and space.'),leaf('Understorey','Discover plants growing beneath taller neighbours.'),leaf('Ground layer','Look closely at low-growing plants and soil cover.')]},
        {title:'Uses',body:'One place, many kinds of value.',children:[leaf('Food','Follow edible harvests and their documented preparation.'),leaf('Habitat','Record who visits, shelters and feeds here.'),leaf('Soil cover','Observe how the ground is protected through the seasons.')]},
        {title:'Tips',body:'Knowledge becomes useful when it meets a place.',children:[leaf('Observe first','Notice light, water and seasonal change.'),leaf('Record locally','Keep site observations distinct from general species knowledge.'),leaf('Share evidence','Attach sources and observations so others can follow your reasoning.')]}]},
    {title:'Landscape',body:'Every place has a story to explore.',children:[leaf('Native forest','Explore locally native communities and the relationships observed here.'),leaf('Food forest','Discover the design and knowledge behind a layered productive landscape.'),leaf('Backyard','Follow a small garden through its plants, experiments and seasons.'),leaf('Productive orchard','Explore tree records, management techniques and local observations.') ]}
];
export function mountLiveCells(root, tree, {automatic=false,automaticDelay=22000,onChange=()=>{}}={}) {
    let path=[], timer=null;
    const stop=()=>{clearTimeout(timer);timer=null;};
    root.addEventListener('pointerdown',stop);root.addEventListener('keydown',stop);
    const render=()=>{
        const node=path.reduce((parent,index)=>parent.children[index],tree);
        root.classList.add('live-cells'); root.classList.toggle('is-automatic',automatic && !path.length);root.classList.toggle('is-unfolding',automatic && Boolean(path.length));
        root.innerHTML=`<div class="live-cell-path">${path.length?'<button type="button" data-live-back>← Back</button>':''}<span>${escape(tree.title)}</span></div><button type="button" class="live-hex live-root" data-live-root aria-pressed="false">${escape(node.title)}</button><div class="live-cell-branches">${(node.children || []).map((child,index)=>`<button type="button" class="live-hex" style="--cell-order:${index}" data-live-child="${index}" aria-label="Explore ${escape(child.title)}">${escape(child.title)}</button>`).join('')}</div><div class="live-cell-reading"><p>${escape(node.body)}</p>${node.source && /^https:\/\//.test(node.source)?`<a href="${escape(node.source)}" target="_blank" rel="noopener noreferrer">Read the source ↗</a>`:''}</div>`;
        root.querySelector('[data-live-back]')?.addEventListener('click',()=>{path.pop();render();root.querySelector('[data-live-root]').focus();});
        root.querySelector('[data-live-root]').onclick=()=>{const active=root.querySelector('.live-cell-reading').classList.toggle('is-emphasized');root.querySelector('[data-live-root]').setAttribute('aria-pressed',String(active));onChange();};
        root.querySelectorAll('[data-live-child]').forEach(button=>button.onclick=()=>{path.push(Number(button.dataset.liveChild));render();root.querySelector('[data-live-root]').focus();});
        onChange();
    };
    render();
    if(automatic && tree.children?.[0]?.children?.length && !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) timer=setTimeout(()=>{path=[0];render();},automaticDelay);
    return {destroy(){stop();root.removeEventListener('pointerdown',stop);root.removeEventListener('keydown',stop);root.replaceChildren();}};
}
export function mountLiveNote(root, marker, {onClose=()=>{}}={}) {
    root.classList.add('creator-ar-knowledge-workspace','live-note-workspace');
    root.setAttribute('role','dialog'); root.setAttribute('aria-modal','true'); root.setAttribute('aria-label',marker.name || 'Live Note');
    root.innerHTML=`<header><small>LIVE NOTE · KNOWLEDGE IN PLACE</small><h2>${escape(marker.name)}</h2><button type="button" data-live-close>Back to AR</button></header><div data-live-tree></div>`;
    const cells=mountLiveCells(root.querySelector('[data-live-tree]'),liveNoteTree(marker));
    root.querySelector('[data-live-close]').onclick=onClose;
    root.addEventListener('keydown',event=>{
        if(event.key==='Escape'){event.preventDefault();onClose();}
        if(event.key==='Tab'){
            const items=[...root.querySelectorAll('button,a[href]')];const first=items[0],last=items.at(-1);
            if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
            else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
        }
    });
    root.querySelector('[data-live-close]').focus();
    return {close:onClose,destroy:()=>cells.destroy()};
}
