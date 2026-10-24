import {pimoIcon} from './pimoEditorIcons.js';
import {FOREST_LESSON_STEPS,forestSpaceKind,forestSupport,attachForestVine} from './foodForestV4Model.js';
import {FOOD_FOREST_LAYERS,FOOD_FOREST_VARIANTS} from './foodForestPieces.js';
import {forestRootOverlaps,forestRootBasisLabel} from './foodForestRootModel.js';
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(id,label,active=false)=>`<button data-v4="${id}" aria-pressed="${active}">${escape(label)}</button>`;
const icon=(id,symbol,label)=>`<button class="pimo-icon" data-v4="${id}" aria-label="${label}" title="${label}">${pimoIcon(symbol)}</button>`;
export function createFoodForestV4Workbench(api){
    function render(page){
        const s=api.state(),lesson=FOREST_LESSON_STEPS[s.learning.step],item=s.pieces.find(p=>p.id===api.selected());
        if(page==='pieces')return `<span class="ff-eyebrow">MAKE ROOM FOR POSSIBILITY</span><h2>What will you plant?</h2><div class="ff-plant-shelf">${FOOD_FOREST_LAYERS.map((layer,i)=>`<button data-layer="${layer.id}" aria-pressed="${api.layer()===layer.id}" style="--piece-color:${layer.color}">${pimoIcon(['grow','grow','leaf','flower','sprout','grow','link'][i])}<strong>${['Tall trees','Fruit trees','Bushes','Flowers & herbs','Groundcovers','Root crops','Vines'][i]}</strong></button>`).join('')}</div><details class="ff-form-options"><summary>Choose another shape</summary><div class="ff-variant-list">${FOOD_FOREST_VARIANTS[api.layer()].map((title,i)=>`<button data-variant="${i}" aria-pressed="${api.variant()===i}">${escape(title)}</button>`).join('')}</div></details>${button('plant','Plant this piece')}${button('page:collection','Use my plant collection')}${spaceEditor(item,s)}`;
        if(page==='learn'){
            if(!s.learning.active)return `<span class="ff-eyebrow">YOUR LITTLE WORLD</span><h2>Welcome back.</h2><p class="ff-muted">Your forest is right where you left it.</p><div class="ff-learning-art">${pimoIcon('grow')}</div>${button('page:pieces','Continue building')}${button('resume-lesson','Explore with Zinnia')}${button('new-lesson','Start a new forest')}${api.hasPrevious()?button('restore-forest','Restore previous forest'):''}<p class="ff-muted">${s.pieces.length} plants · keep growing at your own pace. A new forest keeps a backup of this one.</p>`;
            return `<div class="ff-lesson-top"><span class="ff-eyebrow">GROW WITH ZINNIA</span>${icon('speak','volume','Hear this invitation')}</div><ol class="ff-step-dots" aria-label="Your discoveries">${FOREST_LESSON_STEPS.map((step,i)=>`<li class="${i===s.learning.step?'current':i<s.learning.step?'complete':''}" aria-label="${escape(step.title)}${i===s.learning.step?', current step':''}">${i<s.learning.step?'✓':i+1}</li>`).join('')}</ol><h2>${lesson.title}</h2><p class="ff-lesson-prompt">${lesson.prompt}</p>${s.learning.step===0?`<div class="ff-learning-art">${pimoIcon('grow')}</div><p class="ff-muted">Grab the tree from the single golden station.</p>${button('plant','Plant my tree')}`:''}${s.learning.step===1?`<div class="ff-learning-art">${pimoIcon('grow')}</div><label class="ff-growth-control">Little → young → large<input data-v4-range="growth" aria-label="Watch the forest grow" type="range" min="0" max="2" step="1" value="${s.growth}"></label><p class="ff-muted">A playful size preview. Real plants grow at different speeds.</p>${button('grown','Find a neighbour')}`:''}${s.learning.step===2?`<div class="ff-neighbours">${[['shrub','A little bush','leaf'],['herb','Some flowers','flower'],['groundcover','A spreading patch','sprout']].map(([id,title,symbol])=>`<button data-v4="choose:${id}" aria-pressed="${api.layer()===id}">${pimoIcon(symbol)}<strong>${title}</strong></button>`).join('')}</div>${button('plant','Plant this neighbour')}`:''}${s.learning.step===3?`<div class="ff-learning-art">${pimoIcon('link')}</div><p class="ff-muted">Its trellis comes with it. Later, choose a tree as a support or let it trail.</p>${button('plant','Plant my vine')}`:''}${s.learning.step===4?`${button('wind',s.scenario==='wind'?'A windy day':'Try a windy day',s.scenario==='wind')}<p class="ff-muted">Move pieces and imagine where shelter might help.</p>`:''}${s.learning.step===5?`<div class="ff-learning-art">${pimoIcon('spark')}</div><p class="ff-muted">You explored plants, shared space, climbing and weather.</p>${button('finish','Keep building')}${button('walk','Step inside my forest')}`:''}<div class="ff-lesson-bottom">${s.learning.step<5?button('skip','Try the next discovery'):''}${button('free','Build freely')}</div>`;
        }
        if(page==='grow')return `<span class="ff-eyebrow">WATCH WHAT CHANGES</span><h2>Little to leafy.</h2><div class="ff-learning-art">${pimoIcon('grow')}</div><label class="ff-growth-control">Little → young → large<input data-v4-range="growth" aria-label="Watch the forest grow" type="range" min="0" max="2" step="1" value="${s.growth}"></label><p class="ff-muted">Illustrative growth, using your planning assumptions.</p>${button('walk','Step inside my forest')}${s.pieces.length?`<label>Look closer<select data-v4-select aria-label="Plant to explore">${s.pieces.map((p,i)=>`<option value="${escape(p.id)}" ${p.id===api.selected()?'selected':''}>${escape(p.label||p.layer.replaceAll('-',' ')+' '+(i+1))}</option>`).join('')}</select></label>`:''}${spaceEditor(item,s)}`;
        if(page==='roots')return `<span class="ff-eyebrow">ROOM BELOW THE GLASS</span><h2>Roots need room.</h2>${spaceEditor(item,s)}${button('page:grow','Back to Grow')}`;
        if(page==='try')return `<span class="ff-eyebrow">WHAT IF…?</span><h2>A little experiment.</h2><div class="ff-experiments">${[['calm','A calm day','leaf'],['wind','A windy day','spark'],['shade','Watch the shade','preview']].map(([id,label,symbol])=>`<button data-v4="scenario:${id}" aria-pressed="${s.scenario===id}">${pimoIcon(symbol)}<strong>${label}</strong></button>`).join('')}</div><p class="ff-muted">Change one thing. Move a plant. Look again.</p><div class="ff-v3-icons">${icon('save','plus','Save a forest study')}${icon('speak','volume','Ask Zinnia for an idea')}</div><p class="ff-muted">Weather and shade are illustrations to explore.</p>`;
        return null;
    }
    function spaceDetails(item,s){
        if(!item)return '<p class="ff-muted">Tap a planted piece to explore its space.</p>';
        const kind=forestSpaceKind(item);
        if(kind==='ground-patch')return `<section class="ff-piece-study"><h3>A spreading patch</h3><label>Patch width · ${item.groundWidthM} m<input data-v4-range="groundWidthM" aria-label="Groundcover patch width" type="range" min="0.5" max="8" step="0.5" value="${item.groundWidthM}"></label><label>Patch depth · ${item.groundDepthM} m<input data-v4-range="groundDepthM" aria-label="Groundcover patch depth" type="range" min="0.5" max="8" step="0.5" value="${item.groundDepthM}"></label><p class="ff-muted">Your patch can share ground beneath a taller plant. Check its light and water needs.</p></section>`;
        if(kind==='climbing-extent')return `<section class="ff-piece-study"><h3>Where will this vine grow?</h3><label>Choose a support<select data-v4-support aria-label="Vine support"><option value="trellis" ${item.supportKind==='trellis'?'selected':''}>Its own trellis</option><option value="trail" ${item.supportKind==='trail'?'selected':''}>Trail along the ground</option>${s.pieces.filter(p=>['canopy','small-tree'].includes(p.layer)).map(p=>`<option value="plant:${escape(p.id)}" ${forestSupport(s,item)?.id===p.id?'selected':''}>${escape(p.label||'Tree '+(s.pieces.indexOf(p)+1))}</option>`).join('')}</select></label><p class="ff-muted">A chosen support is a design idea. Check that the real vine and support suit each other.</p></section>`;
        return `<section class="ff-piece-study"><h3>${escape(item.label||'This '+item.layer.replaceAll('-',' '))}</h3><p class="ff-muted">${kind==='root-patch'?'Look through the glass to find the harvest underneath.':'A taller plant can share space with lower layers. Its canopy is separate from the ground beneath it.'}</p></section>`;
    }
    function spaceEditor(item,s){
        const content=spaceDetails(item,s);if(!item)return content;
        const overlaps=forestRootOverlaps(s).filter(pair=>pair.a===item.id||pair.b===item.id).length;
        return content+`<section class="ff-piece-study ff-root-study"><span class="ff-eyebrow">ROOT SPACE</span><h3>Room below the glass.</h3><label>Root spread · ${item.rootSpreadM} m across<input data-v4-range="rootSpreadM" aria-label="Root spread in metres" type="range" min="0" max="20" step="0.5" value="${item.rootSpreadM}"></label><label>Root depth · ${item.rootDepthM} m<input data-v4-range="rootDepthM" aria-label="Root depth in metres" type="range" min="0" max="3" step="0.1" value="${item.rootDepthM}"></label><p class="ff-root-basis">${escape(forestRootBasisLabel(item))}</p>${item.rootBasis==='reference'?`<a href="${escape(item.rootSourceUrl)}" target="_blank" rel="noopener">Root-size reference ↗</a><p class="ff-muted">${escape(item.rootEvidence)}</p>`:''}<p class="ff-muted">${overlaps?`Shares planned root space with ${overlaps} other plant${overlaps===1?'':'s'}. Investigate water, soil and plant needs together.`:'Roots use their own dimensions, separate from the canopy.'} This is a root-space plan, not a map of every root.</p></section>`;
    }
    async function command(id,value){
        const s=api.state();
        if(id.startsWith('page:')){api.page(id.slice(5));return;}
        if(id.startsWith('choose:')){api.choose(id.slice(7));return;}
        if(id.startsWith('growth:')){api.commit(()=>s.growth=+id.slice(7));return;}
        if(id.startsWith('root:')){const item=s.pieces.find(p=>p.id===api.selected());if(item){const field=id.includes('spread')?'rootSpreadM':'rootDepthM';await command('range',{field,number:item[field]+(id.endsWith('plus')?1:-1)*(field==='rootSpreadM'?.5:.1)});}return;}
        if(id==='shape-next'){api.chooseVariant((api.variant()+1)%4);return;}
        if(id.startsWith('patch:')){const item=s.pieces.find(p=>p.id===api.selected());if(item?.layer==='groundcover'){const field=id.includes('width')?'groundWidthM':'groundDepthM';await command('range',{field,number:item[field]+(id.endsWith('plus')?.5:-.5)});}return;}
        if(id==='support-next'){const item=s.pieces.find(p=>p.id===api.selected());if(item?.layer==='climber'){const options=['trellis','trail',...s.pieces.filter(p=>['canopy','small-tree'].includes(p.layer)).map(p=>'plant:'+p.id)],current=item.supportKind==='plant'?'plant:'+item.supportId:item.supportKind;await command('support',options[(options.indexOf(current)+1)%options.length]);}return;}
        if(id==='select'){api.select(value);return;}
        if(id==='select-next'){const i=s.pieces.findIndex(p=>p.id===api.selected());if(s.pieces.length)api.select(s.pieces[(i+1)%s.pieces.length].id);return;}
        if(id==='speak'){api.guide(s.learning.active?FOREST_LESSON_STEPS[s.learning.step].prompt:'Choose a plant. Move it, grow it, and explore what could share its space.');return;}
        if(id==='plant'){api.plant();return;}
        if(id==='free'||id==='finish'){api.commit(()=>s.learning.active=false);api.page('pieces');return;}
        if(id==='resume-lesson'){api.commit(()=>s.learning={active:true,step:s.pieces.length?1:0});api.page('learn');return;}
        if(id==='skip'||id==='grown'){api.commit(()=>{s.learning.step=Math.min(5,s.learning.step+1);if(id==='grown')s.growth=2;});api.suggest();return;}
        if(id==='wind'||id.startsWith('scenario:')){await api.experiment(id==='wind'?'wind':id.slice(9));return;}
        if(id==='walk'){api.walk();return;}
        if(id==='save'){await api.saveStudy();api.say('Forest study saved. Try changing one thing.');return;}
        if(id==='new-lesson'){api.newLesson();return;}
        if(id==='restore-forest'){api.restorePrevious();return;}
        if(id==='range'){
            const item=s.pieces.find(p=>p.id===api.selected()),n=Number(value.number);if(!Number.isFinite(n))return;
            if(value.field==='growth')api.commit(()=>s.growth=Math.max(0,Math.min(2,Math.round(n))));
            else if(item&&['rootSpreadM','rootDepthM'].includes(value.field))api.commit(()=>{item[value.field]=Math.round(Math.max(0,Math.min(value.field==='rootSpreadM'?60:8,n))*10)/10;item.rootBasis=item[value.field]?'user-assumption':'unknown';item.rootSourceUrl='';item.rootEvidence='';});
            else if(item?.layer==='groundcover'&&['groundWidthM','groundDepthM'].includes(value.field))api.commit(()=>item[value.field]=Math.max(.5,Math.min(8,n)));
        }
        if(id==='support'){
            const item=s.pieces.find(p=>p.id===api.selected());if(item?.layer!=='climber')return;
            api.commit(()=>{item.supportKind=value.startsWith('plant:')?'plant':value;item.supportId=value.startsWith('plant:')?value.slice(6):'';attachForestVine(s,item);});
        }
        api.refresh();
    }
    return {render,spaceEditor,command};
}
