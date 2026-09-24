// A shared, lightweight detail for visitor-facing pages. The artwork is a
// single cached image; a CSS light follows the chosen cell without a canvas.
const VARIANTS=new Set(['prep','about','settings','places']);

export function botanicalTextureMarkup(variant='places'){
    const style=VARIANTS.has(variant)?variant:'places';
    return `<div class="nl-botanical-texture nl-botanical-texture--${style}"><button class="nl-botanical-texture__cells" type="button" data-botanical-texture aria-label="Illuminate a botanical cell"></button></div>`;
}

export function bindBotanicalTexture(root){
    root?.querySelectorAll?.('[data-botanical-texture]').forEach(button=>{
        button.addEventListener('click',event=>{
            const rect=button.getBoundingClientRect();
            const index=(Number(button.dataset.glowIndex)||0)+1;
            button.dataset.glowIndex=String(index);
            const keyboard=event.detail===0;
            const x=keyboard?rect.width*[.23,.51,.76][index%3]:event.clientX-rect.left;
            const y=keyboard?rect.height*[.42,.63,.35][index%3]:event.clientY-rect.top;
            button.style.setProperty('--glow-x',`${Math.max(0,Math.min(rect.width,x))}px`);
            button.style.setProperty('--glow-y',`${Math.max(0,Math.min(rect.height,y))}px`);
            button.style.setProperty('--glow-radius',`${Math.max(24,Math.min(66,rect.width/12))}px`);
            button.classList.remove('is-lit');
            void button.offsetWidth;
            button.classList.add('is-lit');
        });
    });
}
