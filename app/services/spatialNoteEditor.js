// Native Note editing: one bounded canvas, no page capture, layout polling or
// asset/font loading. The existing form remains the source of truth for saving.
export const NOTE_EDITOR_WIDTH=720, NOTE_EDITOR_HEIGHT=620;
export function noteKeyboardValue(value,key,upper=false){
    if(key==='⌫')return [...String(value)].slice(0,-1).join('');
    return String(value)+(key==='Space'?' ':key==='↵'?'\n':upper?key.toUpperCase():key);
}
export function noteEditorFields(root){
    return [...root.querySelectorAll('input,textarea,select,button,summary')].filter(node=>{
        if(node.hidden || node.type==='hidden' || node.closest('[hidden]'))return false;
        const closed=node.closest('details:not([open])');
        return !closed || node===closed.querySelector('summary');
    });
}
function fieldLabel(node){
    return node.getAttribute('aria-label') || node.labels?.[0]?.childNodes[0]?.textContent?.trim() || node.querySelector('strong')?.textContent?.trim() || node.textContent?.trim() || node.name || 'Edit';
}
export function createSpatialNoteEditor({gl,root,title='EDIT NOTE',onStatus=()=>{}}){
    const canvas=document.createElement('canvas');canvas.width=NOTE_EDITOR_WIDTH;canvas.height=NOTE_EDITOR_HEIGHT;
    const ctx=canvas.getContext('2d'),texture=gl.createTexture(),originalStyle=root.getAttribute('style');
    let destroyed=false,queued=false,page=0,active=null,upper=false,symbols=false,replace=false,regions=[],uploads=0;
    root.style.cssText+=';position:fixed!important;left:-20000px!important;top:0!important;pointer-events:none!important;';
    function button(label,x,y,width,height,action,disabled=false){
        ctx.fillStyle=disabled?'rgba(52,72,66,.55)':'rgba(38,63,57,.86)';ctx.beginPath();ctx.roundRect(x,y,width,height,14);ctx.fill();
        ctx.strokeStyle='rgba(217,242,228,.38)';ctx.lineWidth=1;ctx.stroke();
        ctx.fillStyle=disabled?'#a8b7ae':'#ffffff';ctx.font='600 23px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,x+width/2,y+height/2,width-18);
        regions.push({label,x,y,width,height,action,disabled});
    }
    function wrapped(text,y,limit=3){
        ctx.font='500 27px system-ui';ctx.textAlign='left';ctx.textBaseline='top';let line='',row=0;
        for(const word of String(text || '').split(/\s+/)){const next=line?line+' '+word:word;if(ctx.measureText(next).width>650 && line){ctx.fillText(line,34,y+row*34,650);line=word;if(++row>=limit)return;}else line=next;}
        if(row<limit)ctx.fillText(line || ' ',34,y+row*34,650);
    }
    function paint(){
        if(destroyed)return;queued=false;regions=[];ctx.clearRect(0,0,720,620);
        ctx.fillStyle='rgba(15,31,29,.80)';ctx.beginPath();ctx.roundRect(4,4,712,612,30);ctx.fill();ctx.strokeStyle='rgba(220,245,232,.4)';ctx.lineWidth=2;ctx.stroke();
        ctx.fillStyle='#ffffff';ctx.textAlign='left';ctx.textBaseline='middle';ctx.font='700 29px system-ui';ctx.fillText(active?fieldLabel(active):title,30,43,475);
        button(active?'Done typing':'Back to AR',520,18,168,48,()=>{if(active){active=null;paint();}else root.querySelector('[data-note-cancel],[data-note-close]')?.click();});
        if(active && !active.isConnected)active=null;
        if(active){
            ctx.fillStyle='#ffffff';wrapped(active.value,92,5);
            const rows=symbols?['1234567890','.,:;!?/\\@#','-_+=()[]','%&*"\'<>']:['1234567890','qwertyuiop','asdfghjkl','zxcvbnm'];
            rows.forEach((row,i)=>{const width=62,gap=5,left=(720-row.length*(width+gap)+gap)/2;[...row].forEach((key,j)=>button(upper?key.toUpperCase():key,left+j*(width+gap),282+i*54,width,48,()=>type(key)));});
            button('Shift',28,502,110,48,()=>{upper=!upper;paint();});button('Space',148,502,228,48,()=>type('Space'));button('⌫',386,502,124,48,()=>type('⌫'));button('↵',520,502,168,48,()=>type('↵'));
            button('Clear',28,560,110,40,()=>{active.value='';replace=false;active.dispatchEvent(new Event('input',{bubbles:true}));paint();});
            button(symbols?'ABC':'Symbols',148,560,170,40,()=>{symbols=!symbols;paint();});ctx.fillStyle='#d8e9df';ctx.font='500 19px system-ui';ctx.textAlign='left';ctx.fillText('Trigger types · Done typing to return',332,580,356);
        }else{
            const fields=noteEditorFields(root).filter(node=>!node.matches('[data-note-cancel],[data-note-close]')),pages=Math.max(1,Math.ceil(fields.length/6));page=Math.min(page,pages-1);
            fields.slice(page*6,page*6+6).forEach((node,i)=>{
                const label=fieldLabel(node),value=node.matches('input,textarea,select')?(node.tagName==='SELECT'?node.selectedOptions[0]?.textContent:node.value):'';
                button((node.matches('summary')?(node.parentElement.open?'− ':'+ '):'')+label+(value?' · '+String(value).replace(/\s+/g,' ').slice(0,46):''),28,86+i*74,660,64,()=>activate(node),node.disabled);
            });
            button('Previous',28,550,170,48,()=>{page--;paint();},page===0);button('Next',520,550,168,48,()=>{page++;paint();},page>=pages-1);
            ctx.fillStyle='#d8e9df';ctx.font='500 22px system-ui';ctx.textAlign='center';ctx.fillText('Edit · '+(page+1)+' / '+pages,360,574,295);
        }
        const binding=gl.getParameter(gl.TEXTURE_BINDING_2D),flip=gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL);
        gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
        if(uploads++)gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,canvas);else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,flip);gl.bindTexture(gl.TEXTURE_2D,binding);
    }
    function type(key){if(!active)return;if(replace && key!=='⌫'){active.value='';replace=false;}active.value=noteKeyboardValue(active.value,key,upper);replace=false;active.dispatchEvent(new Event('input',{bubbles:true}));paint();}
    function focusInput(node){if(destroyed || !node?.matches('input,textarea') || node.disabled)return false;active=node;replace=node.type==='number';paint();onStatus('Trigger types. Done typing returns to Note editing.');return true;}
    function activate(node){
        if(node.matches('input,textarea'))return focusInput(node);
        if(node.matches('select')){const choices=[...node.options].filter(option=>!option.disabled);node.value=choices[(choices.indexOf(node.selectedOptions[0])+1)%choices.length]?.value || '';node.dispatchEvent(new Event('change',{bubbles:true}));}
        else if(node.matches('summary'))node.parentElement.open=!node.parentElement.open;
        else node.click();
        paint();return true;
    }
    function refresh(){if(destroyed || queued)return;queued=true;queueMicrotask(()=>{if(queued)paint();});}
    const observer=new MutationObserver(refresh);observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['open','disabled','hidden','aria-pressed']});
    root.addEventListener('input',refresh);root.addEventListener('change',refresh);paint();
    return {texture,canvas,width:720,height:620,refresh,focusInput,get regions(){return regions;},get uploads(){return uploads;},
        activateAt(x,y){if(destroyed)return false;const hit=regions.find(item=>x>=item.x && x<=item.x+item.width && y>=item.y && y<=item.y+item.height);if(!hit || hit.disabled)return false;hit.action();return true;},
        scrollBy(delta){if(active || !delta)return false;const pages=Math.max(1,Math.ceil(noteEditorFields(root).length/6)),next=Math.max(0,Math.min(pages-1,page+Math.sign(delta)));if(next===page)return false;page=next;paint();return true;},
        destroy(){if(destroyed)return;destroyed=true;observer.disconnect();root.removeEventListener('input',refresh);root.removeEventListener('change',refresh);gl.deleteTexture(texture);if(originalStyle===null)root.removeAttribute('style');else root.setAttribute('style',originalStyle);active=null;regions=[];}
    };
}
