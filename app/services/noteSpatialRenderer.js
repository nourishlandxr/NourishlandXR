import {createSpatialTotemCards} from './spatialTotemCards.js';
import {translateNxrText,localizedCanvasContext} from './i18n.js';
import {createSpatialTetherRenderer,drawSpatialTether,destroySpatialTetherRenderer} from './spatialTetherRenderer.js';
import {noteWidgetPlacement} from './spatialNotes.js';
import {NOTE_WIDGET_FOOTPRINT_SCALE,NOTE_WIDGET_LAYOUT,wrapMeasuredText} from './demoTextWidgetLayout.js';
export const NOTE_CARD_LAYOUT=Object.freeze({width:.86,height:.336,canvasWidth:1024,canvasHeight:400,buttonX:36,buttonY:240,columnStep:482,rowStep:40,buttonWidth:460,buttonHeight:36});
export function noteAnchorPose(record,viewer){
    const center={...(record.position || {x:0,y:1,z:-1})};
    if(!record.demoNotePose){const dx=viewer[12]-center.x,dz=viewer[14]-center.z,length=Math.hypot(dx,dz) || 1;record.demoNotePose={right:{x:dz/length,y:0,z:-dx/length},up:{x:0,y:1,z:0},normal:{x:dx/length,y:0,z:dz/length}};}
    return {center,right:{...record.demoNotePose.right},up:{...record.demoNotePose.up}};
}
export function noteCardButtonLayout(count,hasBody=true){
    const top=hasBody?202:100,rows=Math.max(1,Math.ceil(count/2)),step=(390-top)/rows;
    return Array.from({length:count},(_,index)=>({x:36+(index%2)*482,y:top+Math.floor(index/2)*step,width:index===count-1 && count%2?942:460,height:step-8}));
}
export function noteCardActionOffset(index,count=8,hasBody=true){
    const l=NOTE_CARD_LAYOUT,b=noteCardButtonLayout(count,hasBody)[index];
    return {x:((b.x+b.width/2)/l.canvasWidth-.5)*l.width,y:(.5-(b.y+b.height/2)/l.canvasHeight)*l.height};
}
export function noteSurfaceFacing(center,viewer){
    const dx=viewer[12]-center.x,dz=viewer[14]-center.z,length=Math.hypot(dx,dz)||1;
    return {right:{x:dz/length,y:0,z:-dx/length},up:{x:0,y:1,z:0}};
}
export function noteConnectionEndpoint(surface,toward){
    const delta={x:toward.x-surface.center.x,y:toward.y-surface.center.y,z:toward.z-surface.center.z},dot=axis=>delta.x*axis.x+delta.y*axis.y+delta.z*axis.z;
    const x=dot(surface.right),y=dot(surface.up),scale=1/Math.max(Math.abs(x)/(surface.width/2),Math.abs(y)/(surface.height/2),1e-6);
    return {x:surface.center.x+surface.right.x*x*scale+surface.up.x*y*scale,y:surface.center.y+surface.right.y*x*scale+surface.up.y*y*scale,z:surface.center.z+surface.right.z*x*scale+surface.up.z*y*scale};
}
export function resolveNoteCardButton(root,id,actionIndex,fallback){
    if(actionIndex<0)return fallback; // Synthetic page navigation is not DOM-backed.
    const element=id==='main'?root.querySelector('.note-anchor'):[...root.querySelectorAll('[data-note-widget]')].find(node=>node.dataset.noteWidget===id);
    const actions=element?[...element.querySelectorAll('button,input'),...(id==='main'?[root.querySelector('[data-note-close]')].filter(Boolean):[])]:[];
    return actions[actionIndex];
}
// Spatial placement stays separate from widget behaviour. The DOM owns state,
// and the native cards forward their actions to the same visitor controls.
export function createNoteSpatialRenderer(gl,root,record,viewer,{onInput=()=>{},onHold=()=>{},onSelect=()=>{},widgetPlacement=noteWidgetPlacement}={}){
    const tether=createSpatialTetherRenderer(gl),canvases=new Map(),pages=new Map(),widgetBirths=new Map(),styledWidgets=new WeakSet();let revision=0,pose=record.demoNotePose?{center:{...record.position},right:{...record.demoNotePose.right},up:{...record.demoNotePose.up}}:null,layout=[],openingAt=performance.now(),closingAt=null,wasExpanded=false;
    root.style.setProperty('--note-spatial-widget-width',`${230*NOTE_WIDGET_FOOTPRINT_SCALE}px`);root.style.setProperty('--note-spatial-widget-max-height',`${210*NOTE_WIDGET_FOOTPRINT_SCALE}px`);root.style.setProperty('--note-spatial-picker-max-height',`${170*NOTE_WIDGET_FOOTPRINT_SCALE}px`);
    const marker=record.marker || record,positions=new Map(Object.entries(record.demoNoteWidgetPositions || {}));let held=null,selectionHold=null;
    const observer=new MutationObserver(()=>revision++);observer.observe(root,{childList:true,subtree:true,characterData:true,attributes:true});
    const imageLoaded=()=>revision++;root.addEventListener('load',imageLoaded,true);
    const canvas=card=>{
        const c=document.createElement('canvas');c.width=1024;c.height=card.element.querySelector('img') && !card.element.classList.contains('note-widget-picker')?1024:512;const ctx=localizedCanvasContext(c.getContext('2d'));ctx.scale(1,c.height/400);
        if(c.height===1024){ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#142e26';ctx.beginPath();ctx.roundRect(4,4,1016,1016,28);ctx.fill();ctx.strokeStyle='#a7c6a2';ctx.lineWidth=4;ctx.stroke();const image=card.element.querySelector('img');ctx.fillStyle='#fffdf0';ctx.font='750 48px Manrope,system-ui';ctx.textAlign='center';ctx.fillText(card.element.querySelector('h3')?.textContent || 'Observation image',512,66,944);if(image.complete && image.naturalWidth){const scale=Math.min(944/image.naturalWidth,808/image.naturalHeight),w=image.naturalWidth*scale,h=image.naturalHeight*scale;ctx.drawImage(image,(1024-w)/2,110+(808-h)/2,w,h);}ctx.font='650 34px Manrope,system-ui';ctx.fillText(card.element.querySelector('figcaption')?.textContent || '',512,976,944);card.buttons=[];canvases.set(card.id,card);return c;}
        if(card.collapsed){const button=card.element.querySelector('button');ctx.fillStyle='rgba(38,74,64,.9)';ctx.strokeStyle='#c9f3b5';ctx.lineWidth=10;ctx.beginPath();ctx.arc(512,200,165,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#eaffce';ctx.font='170px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('✦',512,204);card.buttons=[{button,actionIndex:0,x:0,y:0,width:1024,height:400}];canvases.set(card.id,card);return c;}
        const compact=card.id!=='main',glassColour=/^#[\da-f]{6}$/i.test(record.appearance?.color || '')?record.appearance.color:'#0c1f1b';ctx.fillStyle=compact?'rgba(24,74,96,.88)':glassColour+'66';ctx.beginPath();ctx.roundRect(5,5,1014,390,36);ctx.fill();ctx.strokeStyle=compact?'rgba(153,220,231,.92)':'rgba(215,237,219,.76)';ctx.lineWidth=3;ctx.stroke();
        for(const ring of card.attachments || []){ctx.fillStyle='#17392f';ctx.strokeStyle='#edfff5';ctx.lineWidth=3;ctx.beginPath();ctx.arc(Math.max(16,Math.min(1008,ring.x)),Math.max(16,Math.min(384,ring.y)),10,0,Math.PI*2);ctx.fill();ctx.stroke();}
        const element=card.element,title=element.querySelector('h2,h3')?.textContent || marker.name;
        ctx.fillStyle='#fffdf8';ctx.font='700 42px "Trebuchet MS", system-ui';const titleLines=wrapMeasuredText(title,950,text=>ctx.measureText(text).width,2);titleLines.forEach((line,index)=>ctx.fillText(line,36,48+index*42,950));
        const image=element.querySelector('img');
        const paragraphs=[...element.querySelectorAll('p,li,figcaption,small')].filter(item=>!image || item.tagName!=='FIGCAPTION');let y=titleLines.length>1?128:102;
        for(const node of paragraphs){const paragraph=translateNxrText(node.textContent);if(!paragraph)continue;ctx.font='500 28px "Trebuchet MS", system-ui';
            if(node.hasAttribute('data-note-action-date')){ctx.fillStyle='rgba(188,220,151,.18)';ctx.beginPath();ctx.roundRect(30,y-29,Math.min(940,ctx.measureText(paragraph).width+44),39,12);ctx.fill();ctx.font='700 32px "Trebuchet MS", system-ui';}
            ctx.fillStyle='#fffdf1';let line='';for(const word of paragraph.split(/\s+/)){if(ctx.measureText(line+' '+word).width>948){if(y<222)ctx.fillText(line,36,y);y+=31;line=word;}else line+=(line?' ':'')+word;}if(y<222)ctx.fillText(line,36,y);y+=36;}
        if(image?.complete && image.naturalWidth){const scale=Math.min(948/image.naturalWidth,106/image.naturalHeight);ctx.drawImage(image,(1024-image.naturalWidth*scale)/2,112,image.naturalWidth*scale,image.naturalHeight*scale);ctx.fillStyle='#fffdf8';ctx.font='500 24px "Trebuchet MS", system-ui';ctx.fillText(element.querySelector('figcaption')?.textContent || '',36,229,948);}
        const actions=[...element.querySelectorAll('button,input'),...(card.id==='main'?[root.querySelector('[data-note-close]')].filter(Boolean):[])];
        const page=Math.min(pages.get(card.id)||0,Math.max(0,Math.ceil(actions.length/6)-1));pages.set(card.id,page);
        const visible=actions.length>8?actions.slice(page*6,page*6+6):actions;
        if(actions.length>8){for(const [label,delta,disabled] of [['Previous items',-1,page===0],['More items',1,(page+1)*6>=actions.length]]){const button=document.createElement('button');button.textContent=label;button.disabled=disabled;button.onclick=()=>{pages.set(card.id,page+delta);revision++;};visible.push(button);}}
        const buttons=noteCardButtonLayout(visible.length,paragraphs.length>0 || Boolean(image));card.buttons=visible.map((button,index)=>({button,actionIndex:actions.indexOf(button),...(button.dataset.demoNote==='collapse'?{x:932,y:22,width:64,height:64}:buttons[index])}));
        for(const item of card.buttons){ctx.fillStyle=compact?'rgba(135,205,215,.20)':'rgba(204,234,213,.14)';ctx.beginPath();ctx.roundRect(item.x,item.y,item.width,item.height,item.button.dataset.demoNote==='collapse'?32:Math.min(22,item.height/2));ctx.fill();ctx.strokeStyle=compact?'rgba(194,235,240,.88)':'rgba(238,248,230,.68)';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle=item.button.disabled?'#aebdc2':'#fffdf8';ctx.font=`700 ${Math.min(40,item.height*.78)}px "Trebuchet MS", system-ui`;ctx.textBaseline='middle';const label=item.button.dataset.demoNote==='collapse'?'▁':item.button.getAttribute('aria-label') || item.button.textContent || item.button.getAttribute('aria-label') || 'Add plant / item';const lines=wrapMeasuredText(label,item.width-28,text=>ctx.measureText(text).width,1);ctx.fillText(lines[0] || '',item.x+14,item.y+item.height/2,item.width-28);}
        canvases.set(card.id,card);return c;
    };
    const renderer=createSpatialTotemCards(gl,{canvas,surfaces:()=>layout,containedFeedback:true});
    const api={
        draw(view,currentViewer=viewer){
            if(!pose && currentViewer)pose=noteAnchorPose(record,currentViewer);
            if(!pose)return;
            if(held && !held.notified && performance.now()-held.startedAt>=650){held.notified=true;onHold(held.id);}
            if(selectionHold && !selectionHold.notified && performance.now()-selectionHold.startedAt>=650){selectionHold.notified=true;onHold(selectionHold.id);}
            if(currentViewer && !record.demoNoteManualRotation){Object.assign(pose,noteSurfaceFacing(pose.center,currentViewer));record.demoNotePose={right:{...pose.right},up:{...pose.up}};}
            const main=root.querySelector('.note-anchor');if(!main)return;
            const board=root.querySelector('.note-spatial-board'),expanded=Boolean(board?.classList.contains('is-expanded')),closing=Boolean(board?.classList.contains('is-collapsing'));
            if(expanded && !wasExpanded)openingAt=performance.now();wasExpanded=expanded;
            if(closing && closingAt===null)closingAt=performance.now();if(!closing)closingAt=null;
            const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,time=performance.now(),amount=reduced?1:closing?Math.max(0,1-(time-closingAt)/260):Math.min(1,(time-openingAt)/480);
            const widgets=expanded?[...root.querySelectorAll('[data-note-widget]')]:[],hasAddPanel=widgets.some(element=>element.classList.contains('note-widget-picker')),bays=widgetPlacement(widgets.length,hasAddPanel);
            for(const element of widgets)if(!styledWidgets.has(element)){element.style.width='var(--note-spatial-widget-width)';element.style.maxHeight=element.classList.contains('note-widget-picker')?'var(--note-spatial-picker-max-height)':'var(--note-spatial-widget-max-height)';element.style.background='linear-gradient(135deg,rgba(42,111,133,.92),rgba(14,46,65,.96))';element.style.color='#f7fdff';element.style.borderColor='rgba(153,220,231,.92)';styledWidgets.add(element);}
            const collapsed=main.classList.contains('is-note-collapsed');
            const card=(element,id,center,index=-1)=>({center,right:pose.right,up:pose.up,...(id==='main'?(collapsed?{width:.12,height:.12}:NOTE_WIDGET_LAYOUT.main):element.querySelector('img') && !element.classList.contains('note-widget-picker')?{width:.52,height:.52}:NOTE_WIDGET_LAYOUT.compact),opacity:index<0?1:amount,card:{id,element,collapsed:id==='main' && collapsed,revision:element.innerHTML+':'+(pages.get(id)||0)+':'+record.appearance?.color+':'+(element.querySelector('img')?.complete ? element.querySelector('img').naturalWidth : 0),title:element.textContent,fadeDuration:index<0?0:reduced?1:350}});
            const ids=new Set(widgets.map(element=>element.dataset.noteWidget));for(const id of widgetBirths.keys())if(!ids.has(id))widgetBirths.delete(id);
            layout=[card(main,'main',pose.center),...widgets.map((element,index)=>{
                const id=element.dataset.noteWidget;if(!widgetBirths.has(id))widgetBirths.set(id,time);
                const progress=reduced?1:Math.min(1,(time-widgetBirths.get(id))/480),unfold=progress*progress*(3-2*progress),bay=bays[index],spread=.55+.45*unfold;
                const center={x:pose.center.x+(pose.right.x*bay.x+pose.up.x*bay.y)*spread,y:pose.center.y+(pose.right.y*bay.x+pose.up.y*bay.y)*spread,z:pose.center.z+(pose.right.z*bay.x+pose.up.z*bay.y)*spread};
                const offset=positions.get(id);if(offset){center.x=pose.center.x+offset.x;center.y=pose.center.y+offset.y;center.z=pose.center.z+offset.z;}
                return {...card(element,id,center,index),opacity:Math.min(amount,unfold)};
            })];
            for(const surface of layout)surface.card.attachments=[];
            const links=layout.slice(1).map(surface=>({surface,start:noteConnectionEndpoint(layout[0],surface.center),end:noteConnectionEndpoint(surface,pose.center)}));
            for(const {surface,start,end} of links)for(const [target,point] of [[layout[0],start],[surface,end]]){const d={x:point.x-target.center.x,y:point.y-target.center.y,z:point.z-target.center.z},dot=axis=>d.x*axis.x+d.y*axis.y+d.z*axis.z;target.card.attachments.push({x:(dot(target.right)/target.width+.5)*1024,y:(.5-dot(target.up)/target.height)*400});}
            for(const surface of layout)surface.card.revision+=':'+JSON.stringify(surface.card.attachments);
            renderer.begin();renderer.draw(view,{id:'note-'+marker.id},pose.center,layout.map(surface=>surface.card),'');renderer.end();
            const normal={x:pose.right.y*pose.up.z-pose.right.z*pose.up.y,y:pose.right.z*pose.up.x-pose.right.x*pose.up.z,z:pose.right.x*pose.up.y-pose.right.y*pose.up.x};
            for(const surface of layout.slice(1)){
                const delta={x:surface.center.x-pose.center.x,y:surface.center.y-pose.center.y,z:surface.center.z-pose.center.z},across=delta.x*pose.right.x+delta.y*pose.right.y+delta.z*pose.right.z,vertical=delta.x*pose.up.x+delta.y*pose.up.y+delta.z*pose.up.z;
                const mainSurface=layout[0],lateral=Math.abs(across)>=Math.abs(vertical),axis=lateral?pose.right:pose.up,sign=Math.sign(lateral?across:vertical),mainEdge=(lateral?mainSurface.width:mainSurface.height)/2,widgetEdge=lateral?surface.width/2:surface.height/2;
                if(Math.abs(lateral?across:vertical)<mainEdge+widgetEdge+.02)continue;
                const start=noteConnectionEndpoint(layout[0],surface.center),end=noteConnectionEndpoint(surface,pose.center);
                drawSpatialTether(gl,tether,view,start,end,{segments:8,width:.0035,curve:.009,lift:.012,color:[.86,.94,.88,.72*surface.opacity]});
            }
        },
        hit:ray=>renderer.hit(ray),
        beginGrab(ray,source){const hit=renderer.hit(ray);if(!hit || !pose)return false;const surface=layout.find(item=>item.card.id===hit.card.id);if(!surface)return false;held={source,id:hit.card.id,startedAt:performance.now(),distance:hit.distance,offset:{x:surface.center.x-ray.origin.x-ray.direction.x*hit.distance,y:surface.center.y-ray.origin.y-ray.direction.y*hit.distance,z:surface.center.z-ray.origin.z-ray.direction.z*hit.distance}};return true;},
        updateGrab(ray){if(!held || !pose || !ray)return;const center={x:ray.origin.x+ray.direction.x*held.distance+held.offset.x,y:ray.origin.y+ray.direction.y*held.distance+held.offset.y,z:ray.origin.z+ray.direction.z*held.distance+held.offset.z};if(held.id==='main'){pose.center=center;record.position={...center};}else {positions.set(held.id,{x:center.x-pose.center.x,y:center.y-pose.center.y,z:center.z-pose.center.z});record.demoNoteWidgetPositions=Object.fromEntries(positions);}},
        getPerchPose(id='main',side='right'){const surface=layout.find(item=>item.card.id===id) || layout[0];if(!surface)return null;const normal={x:surface.right.y*surface.up.z-surface.right.z*surface.up.y,y:surface.right.z*surface.up.x-surface.right.x*surface.up.z,z:surface.right.x*surface.up.y-surface.right.y*surface.up.x},offset=(side==='left'?-1:1)*surface.width*.35;return {...surface,normal,center:{x:surface.center.x+surface.right.x*offset+surface.up.x*surface.height/2+normal.x*.008,y:surface.center.y+surface.right.y*offset+surface.up.y*surface.height/2+normal.y*.008,z:surface.center.z+surface.right.z*offset+surface.up.z*surface.height/2+normal.z*.008}};},
        rotate(delta){if(!pose || !Number.isFinite(delta))return false;record.demoNoteRotationBase ||= {right:{...pose.right},up:{...pose.up}};record.demoNoteYaw=Math.max(-Math.PI*.42,Math.min(Math.PI*.42,(record.demoNoteYaw || 0)+delta));const c=Math.cos(record.demoNoteYaw),s=Math.sin(record.demoNoteYaw),r=record.demoNoteRotationBase.right;pose.right={x:r.x*c+r.z*s,y:r.y,z:-r.x*s+r.z*c};pose.up={...record.demoNoteRotationBase.up};record.demoNoteManualRotation=true;record.demoNotePose={right:{...pose.right},up:{...pose.up}};return true;},
        adjustDepth(delta){if(!held)return false;held.distance=Math.max(.4,Math.min(2.5,held.distance+delta));return true;},
        moveDepth(delta,currentViewer=viewer,id='main'){if(!pose || !currentViewer)return false;const offset=id==='main'?{x:0,y:0,z:0}:positions.get(id) || (()=>{const surface=layout.find(item=>item.card.id===id);return surface?{x:surface.center.x-pose.center.x,y:surface.center.y-pose.center.y,z:surface.center.z-pose.center.z}:null;})();if(!offset)return false;const center={x:pose.center.x+offset.x,y:pose.center.y+offset.y,z:pose.center.z+offset.z},direction={x:center.x-currentViewer[12],y:center.y-currentViewer[13],z:center.z-currentViewer[14]},distance=Math.hypot(direction.x,direction.y,direction.z);if(distance<.001)return false;const shift=(Math.max(.4,Math.min(2.5,distance+delta))-distance)/distance;for(const axis of ['x','y','z'])center[axis]+=direction[axis]*shift;if(id==='main'){pose.center=center;record.position={...center};}else{positions.set(id,{x:center.x-pose.center.x,y:center.y-pose.center.y,z:center.z-pose.center.z});record.demoNoteWidgetPositions=Object.fromEntries(positions);}return true;},
        releaseGrab(source){if(held?.source!==source)return false;record.position={...pose.center};record.demoNoteWidgetPositions=Object.fromEntries(positions);held=null;return true;},
        get heldSource(){return held?.source;},
        beginSelection(ray,source){const hit=renderer.hit(ray);if(!hit)return false;selectionHold={source,id:hit.card.id,startedAt:performance.now(),notified:false};return true;},
        endSelection(source){if(selectionHold?.source!==source)return false;const consumed=selectionHold.notified;selectionHold=null;return consumed;},
        activate(ray){const hit=renderer.hit(ray);if(!hit)return false;onSelect(hit.card.id);const entry=canvases.get(hit.card.id),x=(hit.localX/hit.width+.5)*1024,y=(.5-hit.localY/hit.height)*400;
            const target=entry?.buttons?.find(item=>x>=item.x && x<=item.x+item.width && y>=item.y && y<=item.y+item.height);
            // Timer renders replace DOM nodes even when a card's artwork is
            // unchanged. Resolve the current action, never a detached button.
            const button=target?resolveNoteCardButton(root,hit.card.id,target.actionIndex,target.button):null;
            if(button?.tagName==='INPUT'){onInput(button);return true;}if(button && !button.disabled)button.click();return true;
        },
        destroy(){observer.disconnect();root.removeEventListener('load',imageLoaded,true);renderer.destroy();destroySpatialTetherRenderer(gl,tether);canvases.clear();}
    };return api;
}
