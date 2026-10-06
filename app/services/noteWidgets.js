// Reusable widgets: data and behaviour are independent of Note placement.
const registry = new Map();
export const WIDGET_LIMIT = 5;
export const escapeNote = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function registerNoteWidget(definition) {
    if (!definition?.type || !definition.label || typeof definition.render !== 'function') throw new TypeError('A widget needs a type, label and renderer.');
    registry.set(definition.type, Object.freeze({...definition}));
}
export const noteWidgetLibrary = () => [...registry.values()];
export const noteWidgetDefinition = type => registry.get(type);
export function createNoteWidget(type, values = {}) {
    const definition = registry.get(type);
    if (!definition) throw new TypeError('Unknown widget type');
    return {id:globalThis.crypto?.randomUUID?.() || `widget-${Date.now()}-${Math.random().toString(36).slice(2)}`,type,title:definition.label,content:'',configuration:{...definition.defaults},...values};
}
const button = (action, label) => `<button type="button" data-widget-action="${escapeNote(action)}">${escapeNote(label)}</button>`;
const text = widget => `<p>${escapeNote(widget.content).replace(/\n/g,'<br>')}</p>`;
const lines = widget => String(widget.content || '').split(/\r?\n/).map(item=>item.trim()).filter(Boolean).slice(0,30);
export function widgetStateKey(marker, widget) { return `nlxr.note-state.v1:${marker.id}:${widget.id}`; }
export function loadNoteWidgetState(marker, widget, storage) {
    try {storage ??= globalThis.localStorage;const state=JSON.parse(storage?.getItem(widgetStateKey(marker,widget)) || '{}');return state && typeof state==='object' && !Array.isArray(state)?state:{};} catch {return {};}
}
export function saveNoteWidgetState(marker, widget, state, storage) {
    try {storage ??= globalThis.localStorage;storage?.setItem(widgetStateKey(marker,widget),JSON.stringify(state));} catch { /* Session state still works. */ }
}
export function interactNoteWidget(widget, state = {}, action, now = Date.now(), value = '') {
    return registry.get(widget.type)?.interact?.(widget,state,action,now,value) || state;
}
export function renderNoteWidget(widget, state = {}, now = Date.now()) {
    const definition = registry.get(widget.type);
    return definition ? `<h3>${escapeNote(widget.title || definition.label)}</h3>${definition.render(widget,state,now)}` : '<p>This widget is unavailable.</p>';
}
export function timerRemaining(widget, state, now = Date.now()) {
    return Math.max(0, Math.ceil(((state.endsAt || now+Math.max(1,Number(widget.configuration?.seconds) || 240)*1000)-now)/1000));
}
const reveal = (widget,state) => state.revealed ? text(widget) : button('reveal',widget.type==='clue'?'Reveal clue':'Show hint');
const revealAction = (_widget,state,action) => action==='reveal'?{...state,revealed:true}:state;
registerNoteWidget({type:'thick-box',label:'Thick Box',category:'Information',icon:'▤',description:'Important instructions, warnings, recipes or facts.',render:text});
registerNoteWidget({type:'image',label:'Image',category:'Information',icon:'▧',description:'A reference photo with an optional caption.',defaults:{url:'',caption:''},render:widget=>{
    const url=String(widget.configuration?.url || '');
    return /^(https?:\/\/|(?:\.\.?\/)?assets\/|\/app\/assets\/)/i.test(url)?`<figure><img src="${escapeNote(url)}" alt="${escapeNote(widget.configuration?.caption || widget.title)}"><figcaption>${escapeNote(widget.configuration?.caption)}</figcaption></figure>`:'<p>Add a reference image in the Note editor.</p>';
}});
registerNoteWidget({type:'checklist',label:'Checklist',category:'Activity',icon:'☑',description:'Materials, maintenance, harvest or field steps.',render:(widget,state)=>lines(widget).map((item,index)=>`<button type="button" class="note-check" data-widget-action="check:${index}" aria-pressed="${Boolean(state.checked?.includes(index))}">${state.checked?.includes(index)?'☑':'☐'} ${escapeNote(item)}</button>`).join(''),interact:(_widget,state,action)=>{
    if(!action.startsWith('check:'))return state;
    const index=Number(action.slice(6)),checked=new Set(state.checked || []);checked.has(index)?checked.delete(index):checked.add(index);return {...state,checked:[...checked]};
}});
registerNoteWidget({type:'timer',label:'Timer',category:'Garden tools',icon:'◷',description:'A simple countdown that survives a page reload.',defaults:{seconds:240},render:(widget,state,now)=>{
    const remaining=timerRemaining(widget,state,now),days=Math.floor(remaining/86400),hours=Math.floor(remaining%86400/3600),minutes=Math.floor(remaining%3600/60),seconds=remaining%60;
    return `<p role="timer">${state.endsAt && !remaining?'Timer complete':`${days?days+'d ':''}${hours?hours+'h ':''}${minutes}m ${seconds}s`}</p>${button(state.endsAt?'reset':'start',state.endsAt?'Reset timer':'Start timer')}`;
},interact:(widget,state,action,now)=>action==='start'?{...state,endsAt:now+Math.max(1,Number(widget.configuration?.seconds)||240)*1000}:action==='reset'?{...state,endsAt:null}:state});
registerNoteWidget({type:'plant-list',label:'Plant List',category:'Garden tools',icon:'♧',description:'Plants or items associated with this place.',render:(widget,state)=>`<ul>${[...lines(widget),...(state.items || [])].map(item=>`<li>${escapeNote(item)}</li>`).join('')}</ul><label>Plant / item<input data-widget-input maxlength="120" aria-label="Plant or item name"></label>${button('add','Add plant / item')}`,interact:(_widget,state,action,_now,value)=>action==='add' && value.trim()?{...state,items:[...(state.items || []),value.trim().slice(0,120)].slice(0,30)}:state});
registerNoteWidget({type:'task',label:'Task / Complete',category:'Activity',icon:'✓',description:'An action with a saved completion state.',render:(widget,state)=>`${text(widget)}${button('complete',state.complete?'✓ Completed':widget.configuration?.label || 'Complete task')}`,interact:(_widget,state,action)=>action==='complete'?{...state,complete:!state.complete}:state});
registerNoteWidget({type:'tip',label:'Tip / Hint',category:'Information',icon:'?',description:'Compact information revealed when requested.',render:reveal,interact:revealAction});
registerNoteWidget({type:'clue',label:'Clue',category:'Activity',icon:'◇',description:'A clue for a trail or learning activity.',render:reveal,interact:revealAction});
