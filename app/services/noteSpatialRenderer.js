import {createSpatialTotemCards} from './spatialTotemCards.js';
import {translateNxrText,localizedCanvasContext} from './i18n.js';
import {createSpatialTetherRenderer,drawSpatialTether,destroySpatialTetherRenderer} from './spatialTetherRenderer.js';
import {noteWidgetPlacement} from './spatialNotes.js';
export const NOTE_CARD_LAYOUT=Object.freeze({width:.86,height:.336,canvasWidth:1024,canvasHeight:400,buttonX:36,buttonY:240,columnStep:482,rowStep:40,buttonWidth:460,buttonHeight:36});
export function noteAnchorPose(record,viewer){
    const center={...(record.position || {x:0,y:1,z:-1})};
    if(!record.demoNotePose){const dx=viewer[12]-center.x,dz=viewer[14]-center.z,length=Math.hypot(dx,dz) || 1;record.demoNotePose={right:{x:dz/length,y:0,z:-dx/length},up:{x:0,y:1,z:0},normal:{x:dx/length,y:0,z:dz/length}};}
    return {center,right:{...record.demoNotePose.right},up:{...record.demoNotePose.up}};
}
export function noteCardActionOffset(index){
    const l=NOTE_CARD_LAYOUT;
    return {x:((l.buttonX+index%2*l.columnStep+l.buttonWidth/2)/l.canvasWidth-.5)*l.width,
        y:(.5-(l.buttonY+Math.floor(index/2)*l.rowStep+l.buttonHeight/2)/l.canvasHeight)*l.height};
}
export function resolveNoteCardButton(root,id,actionIndex,fallback){
    if(actionIndex<0)return fallback; // Synthetic page navigation is not DOM-backed.
    const element=id==='main'?root.querySelector('.note-anchor'):[...root.querySelectorAll('[data-note-widget]')].find(node=>node.dataset.noteWidget===id);
    const actions=element?[...element.querySelectorAll('button,input'),...(id==='main'?[root.querySelector('[data-note-close]')].filter(Boolean):[])]:[];
    return actions[actionIndex];
}
// Spatial placement stays separate from widget behaviour. The DOM owns state,
// and the native cards forward their actions to the same visitor controls.
export function createNoteSpatialRenderer(gl,root,record,viewer,{onInput=()=>{},widgetPlacement=noteWidgetPlacement}={}){
    const tether=createSpatialTetherRenderer(gl),canvases=new Map(),pages=new Map(),widgetBirths=new Map();let revision=0,pose=record.demoNotePose?{center:{...record.position},right:{...record.demoNotePose.right},up:{...record.demoNotePose.up}}:null,layout=[],openingAt=performance.now(),closingAt=null,wasExpanded=false;
    const marker=record.marker || record,positions=new Map(Object.entries(record.demoNoteWidgetPositions || {}));let held=null;
    const observer=new MutationObserver(()=>revision++);observer.observe(root,{childList:true,subtree:true,characterData:true,attributes:true});
    const imageLoaded=()=>revision++;root.addEventListener('load',imageLoaded,true);
    const canvas=card=>{
        const c=document.createElement('canvas');c.width=1024;c.height=400;const ctx=localizedCanvasContext(c.getContext('2d'));
        const glassColour=/^#[\da-f]{6}$/i.test(record.appearance?.color || '')?record.appearance.color:'#0c1f1b';ctx.fillStyle=glassColour+'66';ctx.beginPath();ctx.roundRect(5,5,1014,390,36);ctx.fill();ctx.strokeStyle='rgba(215,237,219,.76)';ctx.lineWidth=3;ctx.stroke();
        const element=card.element,title=element.querySelector('h2,h3')?.textContent || marker.name;
        ctx.fillStyle='#fffdf1';ctx.font='700 42px "Trebuchet MS", system-ui';ctx.fillText(title,36,58,950);
        const image=element.querySelector('img');
        const paragraphs=[...element.querySelectorAll('p,li,figcaption,small')].filter(item=>!image || item.tagName!=='FIGCAPTION');let y=102;
        for(const node of paragraphs){const paragraph=translateNxrText(node.textContent);if(!paragraph)continue;ctx.font='500 28px "Trebuchet MS", system-ui';
            if(node.hasAttribute('data-note-action-date')){ctx.fillStyle='rgba(188,220,151,.18)';ctx.beginPath();ctx.roundRect(30,y-29,Math.min(940,ctx.measureText(paragraph).width+44),39,12);ctx.fill();ctx.font='700 32px "Trebuchet MS", system-ui';}
            ctx.fillStyle='#fffdf1';let line='';for(const word of paragraph.split(/\s+/)){if(ctx.measureText(line+' '+word).width>948){if(y<222)ctx.fillText(line,36,y);y+=31;line=word;}else line+=(line?' ':'')+word;}if(y<222)ctx.fillText(line,36,y);y+=36;}
        if(image?.complete && image.naturalWidth){const scale=Math.min(948/image.naturalWidth,120/image.naturalHeight);ctx.drawImage(image,(1024-image.naturalWidth*scale)/2,84,image.naturalWidth*scale,image.naturalHeight*scale);ctx.fillStyle='#fffdf1';ctx.font='500 24px "Trebuchet MS", system-ui';ctx.fillText(element.querySelector('figcaption')?.textContent || '',36,229,948);}
        const actions=[...element.querySelectorAll('button,input'),...(card.id==='main'?[root.querySelector('[data-note-close]')].filter(Boolean):[])];
        const page=Math.min(pages.get(card.id)||0,Math.max(0,Math.ceil(actions.length/6)-1));pages.set(card.id,page);
        const visible=actions.length>8?actions.slice(page*6,page*6+6):actions;
        if(actions.length>8){for(const [label,delta,disabled] of [['Previous items',-1,page===0],['More items',1,(page+1)*6>=actions.length]]){const button=document.createElement('button');button.textContent=label;button.disabled=disabled;button.onclick=()=>{pages.set(card.id,page+delta);revision++;};visible.push(button);}}
        const l=NOTE_CARD_LAYOUT;card.buttons=visible.map((button,index)=>({button,actionIndex:actions.indexOf(button),x:l.buttonX+(index%2)*l.columnStep,y:l.buttonY+Math.floor(index/2)*l.rowStep,width:l.buttonWidth,height:l.buttonHeight}));
        for(const item of card.buttons){ctx.fillStyle='rgba(204,234,213,.14)';ctx.beginPath();ctx.roundRect(item.x,item.y,item.width,item.height,18);ctx.fill();ctx.strokeStyle='rgba(238,248,230,.68)';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle=item.button.disabled?'#9aa99a':'#fffdf3';ctx.font='650 24px "Trebuchet MS", system-ui';ctx.fillText(item.button.textContent || item.button.getAttribute('aria-label') || 'Add plant / item',item.x+14,item.y+26,item.width-28);}
        canvases.set(card.id,card);return c;
    };
    const renderer=createSpatialTotemCards(gl,{canvas,surfaces:()=>layout,containedFeedback:true});
    const api={
        draw(view,currentViewer=viewer){
            if(!pose && currentViewer)pose=noteAnchorPose(record,currentViewer);
            if(!pose)return;
            const main=root.querySelector('.note-anchor');if(!main)return;
            const board=root.querySelector('.note-spatial-board'),expanded=Boolean(board?.classList.contains('is-expanded')),closing=Boolean(board?.classList.contains('is-collapsing'));
            if(expanded && !wasExpanded)openingAt=performance.now();wasExpanded=expanded;
            if(closing && closingAt===null)closingAt=performance.now();if(!closing)closingAt=null;
            const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,time=performance.now(),amount=reduced?1:closing?Math.max(0,1-(time-closingAt)/260):Math.min(1,(time-openingAt)/480);
            const widgets=expanded?[...root.querySelectorAll('[data-note-widget]')]:[],hasAddPanel=widgets.some(element=>element.classList.contains('note-widget-picker')),bays=widgetPlacement(widgets.length,hasAddPanel);
            const card=(element,id,center,index=-1)=>({center,right:pose.right,up:pose.up,width:element?.classList.contains('note-widget-compact')?.58:.86,height:element?.classList.contains('note-widget-compact')?.178:.264,opacity:index<0?1:amount,card:{id,element,revision:element.innerHTML+':'+(pages.get(id)||0)+':'+record.appearance?.color+':'+(element.querySelector('img')?.complete ? element.querySelector('img').naturalWidth : 0),title:element.textContent,fadeDuration:index<0?0:reduced?1:350}});
            const ids=new Set(widgets.map(element=>element.dataset.noteWidget));for(const id of widgetBirths.keys())if(!ids.has(id))widgetBirths.delete(id);
            layout=[card(main,'main',pose.center),...widgets.map((element,index)=>{
                const id=element.dataset.noteWidget;if(!widgetBirths.has(id))widgetBirths.set(id,time);
                const progress=reduced?1:Math.min(1,(time-widgetBirths.get(id))/480),unfold=progress*progress*(3-2*progress),bay=bays[index],spread=.55+.45*unfold;
                const center={x:pose.center.x+(pose.right.x*bay.x+pose.up.x*bay.y)*spread,y:pose.center.y+(pose.right.y*bay.x+pose.up.y*bay.y)*spread,z:pose.center.z+(pose.right.z*bay.x+pose.up.z*bay.y)*spread};
                const offset=positions.get(id);if(offset){center.x=pose.center.x+offset.x;center.y=pose.center.y+offset.y;center.z=pose.center.z+offset.z;}
                return {...card(element,id,center,index),opacity:Math.min(amount,unfold)};
            })];
            renderer.begin();renderer.draw(view,{id:'note-'+marker.id},pose.center,layout.map(surface=>surface.card),'');renderer.end();
            const normal={x:pose.right.y*pose.up.z-pose.right.z*pose.up.y,y:pose.right.z*pose.up.x-pose.right.x*pose.up.z,z:pose.right.x*pose.up.y-pose.right.y*pose.up.x};
            for(const surface of layout.slice(1)){
                const delta={x:surface.center.x-pose.center.x,y:surface.center.y-pose.center.y,z:surface.center.z-pose.center.z},across=delta.x*pose.right.x+delta.y*pose.right.y+delta.z*pose.right.z,vertical=delta.x*pose.up.x+delta.y*pose.up.y+delta.z*pose.up.z;
                const lateral=Math.abs(across)>=Math.abs(vertical),axis=lateral?pose.right:pose.up,sign=Math.sign(lateral?across:vertical),mainEdge=lateral?.43:.132,widgetEdge=lateral?surface.width/2:surface.height/2;
                if(Math.abs(lateral?across:vertical)<mainEdge+widgetEdge+.02)continue;
                const start={x:pose.center.x+axis.x*sign*mainEdge+normal.x*.012,y:pose.center.y+axis.y*sign*mainEdge+normal.y*.012,z:pose.center.z+axis.z*sign*mainEdge+normal.z*.012};
                const end={x:surface.center.x-axis.x*sign*widgetEdge+normal.x*.012,y:surface.center.y-axis.y*sign*widgetEdge+normal.y*.012,z:surface.center.z-axis.z*sign*widgetEdge+normal.z*.012};
                drawSpatialTether(gl,tether,view,start,end,{segments:8,width:.0035,curve:.009,lift:.012,color:[.86,.94,.88,.72*surface.opacity]});
            }
        },
        hit:ray=>renderer.hit(ray),
        beginGrab(ray,source){const hit=renderer.hit(ray);if(!hit || !pose)return false;const surface=layout.find(item=>item.card.id===hit.card.id);if(!surface)return false;held={source,id:hit.card.id,distance:hit.distance,offset:{x:surface.center.x-ray.origin.x-ray.direction.x*hit.distance,y:surface.center.y-ray.origin.y-ray.direction.y*hit.distance,z:surface.center.z-ray.origin.z-ray.direction.z*hit.distance}};return true;},
        updateGrab(ray){if(!held || !pose || !ray)return;const center={x:ray.origin.x+ray.direction.x*held.distance+held.offset.x,y:ray.origin.y+ray.direction.y*held.distance+held.offset.y,z:ray.origin.z+ray.direction.z*held.distance+held.offset.z};if(held.id==='main'){pose.center=center;}else positions.set(held.id,{x:center.x-pose.center.x,y:center.y-pose.center.y,z:center.z-pose.center.z});},
        releaseGrab(source){if(held?.source!==source)return false;record.position={...pose.center};record.demoNoteWidgetPositions=Object.fromEntries(positions);held=null;return true;},
        get heldSource(){return held?.source;},
        activate(ray){const hit=renderer.hit(ray);if(!hit)return false;const entry=canvases.get(hit.card.id),x=(hit.localX/hit.width+.5)*1024,y=(.5-hit.localY/hit.height)*400;
            const target=entry?.buttons?.find(item=>x>=item.x && x<=item.x+item.width && y>=item.y && y<=item.y+item.height);
            // Timer renders replace DOM nodes even when a card's artwork is
            // unchanged. Resolve the current action, never a detached button.
            const button=target?resolveNoteCardButton(root,hit.card.id,target.actionIndex,target.button):null;
            if(button?.tagName==='INPUT'){onInput(button);return true;}if(button && !button.disabled)button.click();return true;
        },
        destroy(){observer.disconnect();root.removeEventListener('load',imageLoaded,true);renderer.destroy();destroySpatialTetherRenderer(gl,tether);canvases.clear();}
    };return api;
}
