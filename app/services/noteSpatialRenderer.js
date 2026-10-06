import {createSpatialTotemCards} from './spatialTotemCards.js';
import {createSpatialTetherRenderer,drawSpatialTether,destroySpatialTetherRenderer} from './spatialTetherRenderer.js';
import {noteWidgetPlacement} from './spatialNotes.js';
// Spatial placement stays separate from widget behaviour. The DOM owns state,
// and the native cards forward their actions to the same visitor controls.
export function createNoteSpatialRenderer(gl,root,record,viewer,{onInput=()=>{}}={}){
    const tether=createSpatialTetherRenderer(gl),canvases=new Map(),pages=new Map();let revision=0,pose=null,layout=[],openingAt=performance.now(),closingAt=null,wasExpanded=false;
    const marker=record.marker || record;
    const observer=new MutationObserver(()=>revision++);observer.observe(root,{childList:true,subtree:true,characterData:true,attributes:true});
    const imageLoaded=()=>revision++;root.addEventListener('load',imageLoaded,true);
    const canvas=card=>{
        const c=document.createElement('canvas');c.width=1024;c.height=640;const ctx=c.getContext('2d');
        ctx.fillStyle='rgba(12,31,27,.42)';ctx.beginPath();ctx.roundRect(5,5,1014,630,36);ctx.fill();ctx.strokeStyle='rgba(215,237,219,.76)';ctx.lineWidth=3;ctx.stroke();
        const element=card.element,title=element.querySelector('h2,h3')?.textContent || marker.name;
        ctx.fillStyle='#fffdf1';ctx.font='700 48px "Trebuchet MS", system-ui';ctx.fillText(title,36,66,950);
        const paragraphs=[...element.querySelectorAll('p,li,figcaption,small')].map(item=>item.textContent).filter(Boolean);let y=116;
        ctx.font='500 29px "Trebuchet MS", system-ui';for(const paragraph of paragraphs){let line='';for(const word of paragraph.split(/\s+/)){if(ctx.measureText(line+' '+word).width>948){if(y<355)ctx.fillText(line,36,y);y+=35;line=word;}else line+=(line?' ':'')+word;}if(y<355)ctx.fillText(line,36,y);y+=42;}
        const image=element.querySelector('img');if(image?.complete && image.naturalWidth){const scale=Math.min(948/image.naturalWidth,230/image.naturalHeight);ctx.drawImage(image,38,108,image.naturalWidth*scale,image.naturalHeight*scale);}
        const actions=[...element.querySelectorAll('button,input'),...(card.id==='main'?[root.querySelector('[data-note-close]')].filter(Boolean):[])];
        const page=Math.min(pages.get(card.id)||0,Math.max(0,Math.ceil(actions.length/6)-1));pages.set(card.id,page);
        const visible=actions.length>8?actions.slice(page*6,page*6+6):actions;
        if(actions.length>8){for(const [label,delta,disabled] of [['Previous items',-1,page===0],['More items',1,(page+1)*6>=actions.length]]){const button=document.createElement('button');button.textContent=label;button.disabled=disabled;button.onclick=()=>{pages.set(card.id,page+delta);revision++;};visible.push(button);}}
        card.buttons=visible.map((button,index)=>({button,x:36+(index%2)*482,y:365+Math.floor(index/2)*62,width:460,height:54}));
        for(const item of card.buttons){ctx.fillStyle='rgba(204,234,213,.14)';ctx.beginPath();ctx.roundRect(item.x,item.y,item.width,item.height,16);ctx.fill();ctx.strokeStyle='rgba(238,248,230,.68)';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle=item.button.disabled?'#9aa99a':'#fffdf3';ctx.font='650 26px "Trebuchet MS", system-ui';ctx.fillText(item.button.textContent || item.button.getAttribute('aria-label') || 'Add plant / item',item.x+14,item.y+35,item.width-28);}
        canvases.set(card.id,card);return c;
    };
    const renderer=createSpatialTotemCards(gl,{canvas,surfaces:()=>layout,containedFeedback:true});
    const api={
        draw(view,currentViewer=viewer){
            if(!pose && currentViewer){const p=record.position || {x:0,y:1,z:-1};pose={center:{x:p.x,y:p.y+.25,z:p.z},right:{x:currentViewer[0],y:currentViewer[1],z:currentViewer[2]},up:{x:currentViewer[4],y:currentViewer[5],z:currentViewer[6]}};}
            if(!pose)return;
            const main=root.querySelector('.note-anchor');if(!main)return;
            const board=root.querySelector('.note-spatial-board'),expanded=Boolean(board?.classList.contains('is-expanded')),closing=Boolean(board?.classList.contains('is-collapsing'));
            if(expanded && !wasExpanded)openingAt=performance.now();wasExpanded=expanded;
            if(closing && closingAt===null)closingAt=performance.now();if(!closing)closingAt=null;
            const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,time=performance.now(),amount=reduced?1:closing?Math.max(0,1-(time-closingAt)/260):Math.min(1,(time-openingAt)/480);
            const widgets=expanded?[...root.querySelectorAll('[data-note-widget]')]:[],bays=noteWidgetPlacement(widgets.length);
            const card=(element,id,center,index=-1)=>({center,right:pose.right,up:pose.up,width:index<0?.60:.58,height:.38,opacity:index<0?1:amount,card:{id,element,revision,title:element.textContent,fadeDuration:reduced?1:350}});
            layout=[card(main,'main',pose.center),...widgets.map((element,index)=>{const bay=bays[index],spread=.85+.15*amount,center={x:pose.center.x+(pose.right.x*bay.x+pose.up.x*bay.y)*spread,y:pose.center.y+(pose.right.y*bay.x+pose.up.y*bay.y)*spread,z:pose.center.z+(pose.right.z*bay.x+pose.up.z*bay.y)*spread};return card(element,element.dataset.noteWidget,center,index);})];
            renderer.begin();renderer.draw(view,{id:'note-'+marker.id},pose.center,layout.map(surface=>surface.card),'');renderer.end();
            for(const surface of layout.slice(1))drawSpatialTether(gl,tether,view,pose.center,{x:pose.center.x+(surface.center.x-pose.center.x)*amount,y:pose.center.y+(surface.center.y-pose.center.y)*amount,z:pose.center.z+(surface.center.z-pose.center.z)*amount},{segments:8,width:.0015,curve:.015,lift:.018,color:[.69,.83,.70,.30*amount]});
        },
        hit:ray=>renderer.hit(ray),
        activate(ray){const hit=renderer.hit(ray);if(!hit)return false;const entry=canvases.get(hit.card.id),x=(hit.localX/hit.width+.5)*1024,y=(.5-hit.localY/hit.height)*640;
            const target=entry?.buttons?.find(item=>x>=item.x && x<=item.x+item.width && y>=item.y && y<=item.y+item.height);
            if(target?.button.tagName==='INPUT'){onInput(target.button);return true;}if(target && !target.button.disabled)target.button.click();return true;
        },
        destroy(){observer.disconnect();root.removeEventListener('load',imageLoaded,true);renderer.destroy();destroySpatialTetherRenderer(gl,tether);canvases.clear();}
    };return api;
}
