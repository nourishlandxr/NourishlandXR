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
const shiftActionDate=(timestamp,days)=>{const date=new Date(timestamp);date.setDate(date.getDate()+days);return date.getTime();};
export function timerActionDate(widget,state={},now=Date.now()){
    const days=Number(state.days ?? (Number(widget.configuration?.seconds ?? 864000)/86400));
    return Number(state.targetAt || state.endsAt) || shiftActionDate(now,Math.max(0,Math.min(3650,Number.isFinite(days)?days:10)));
}
function actionTimer(widget,state,now){
    const target=timerActionDate(widget,state,now),due=new Date(target),today=new Date(now),days=Math.max(0,Math.round((Date.UTC(due.getFullYear(),due.getMonth(),due.getDate())-Date.UTC(today.getFullYear(),today.getMonth(),today.getDate()))/86400000)),date=new Intl.DateTimeFormat('en-AU',{day:'numeric',month:'short',year:'numeric'}).format(target);
    const label=state.actionLabel || widget.configuration?.action || 'Fruit harvest';
    return `<div class="note-action-timer"><p class="note-action-tag">${escapeNote(label)}</p><p class="note-action-date" data-note-action-date>${escapeNote(date)}</p><small>${state.endsAt?'Planned · ':''}${days?`Return in ${days} ${days===1?'day':'days'}`:'Ready to check today'}</small><div class="note-date-spinner">${button('date:-7','−1 week')}${button('date:7','+1 week')}${button('date:-1','−1 day')}${button('date:1','+1 day')}</div><div class="note-action-presets">${button('plan:harvest','Harvest · 10 days')}${button('plan:scion','Scion · 2 weeks')}</div>${button(state.endsAt?'reset':'start',state.endsAt?'Reset date':'Set action date')}</div>`;
}
function actionTimerInteraction(widget,state,action,now){
    if(action==='start')return {...state,targetAt:timerActionDate(widget,state,now),endsAt:timerActionDate(widget,state,now)};
    if(action==='reset')return {...state,endsAt:null,targetAt:null};
    const plan=action==='plan:harvest'?{days:10,actionLabel:'Fruit harvest'}:action==='plan:scion'?{days:14,actionLabel:'Scion ready'}:null;
    if(plan){const targetAt=shiftActionDate(now,plan.days);return {...state,...plan,targetAt,endsAt:state.endsAt?targetAt:null};}
    if(/^date:(-7|-1|1|7)$/.test(action)){
        const targetAt=Math.max(now,shiftActionDate(timerActionDate(widget,state,now),Number(action.slice(5))));
        return {...state,targetAt,endsAt:state.endsAt?targetAt:null};
    }
    return state;
}
const reveal = (widget,state) => state.revealed ? text(widget) : button('reveal',widget.type==='clue'?'Reveal clue':'Show hint');
const revealAction = (_widget,state,action) => action==='reveal'?{...state,revealed:true}:state;
registerNoteWidget({type:'thick-box',label:'Thick Box',category:'Information',icon:'▤',description:'Important instructions, warnings, recipes or field observations.',defaults:{},render:text});
registerNoteWidget({type:'image',label:'Image',category:'Information',icon:'▧',description:'A reference photo with an optional caption.',defaults:{url:'',caption:''},render:widget=>{
    const url=String(widget.configuration?.url || '');
    return /^(https?:\/\/|(?:\.\.?\/)?assets\/|\/app\/assets\/)/i.test(url)?`<figure><img src="${escapeNote(url)}" alt="${escapeNote(widget.configuration?.caption || widget.title)}"><figcaption>${escapeNote(widget.configuration?.caption)}</figcaption></figure>`:'<p>Add a reference image in the Note editor.</p>';
}});
registerNoteWidget({type:'checklist',label:'Checklist',category:'Activity',icon:'☑',description:'Materials, maintenance, harvest or field steps.',render:(widget,state)=>lines(widget).map((item,index)=>`<button type="button" class="note-check" data-widget-action="check:${index}" aria-pressed="${Boolean(state.checked?.includes(index))}">${state.checked?.includes(index)?'☑':'☐'} ${escapeNote(item)}</button>`).join(''),interact:(_widget,state,action)=>{
    if(!action.startsWith('check:'))return state;
    const index=Number(action.slice(6)),checked=new Set(state.checked || []);checked.has(index)?checked.delete(index):checked.add(index);return {...state,checked:[...checked]};
}});
registerNoteWidget({type:'timer',label:'Timer',category:'Garden tools',icon:'◷',description:'Plan a return date for harvest, scion readiness or another garden action.',defaults:{seconds:864000,actionTag:true,action:'Fruit harvest'},render:(widget,state,now)=>{
    if(widget.configuration?.actionTag)return actionTimer(widget,state,now);
    const remaining=timerRemaining(widget,state,now),days=Math.floor(remaining/86400),hours=Math.floor(remaining%86400/3600),minutes=Math.floor(remaining%3600/60),seconds=remaining%60;
    return `<p role="timer">${state.endsAt && !remaining?'Timer complete':`${days?days+'d ':''}${hours?hours+'h ':''}${minutes}m ${seconds}s`}</p>${button(state.endsAt?'reset':'start',state.endsAt?'Reset timer':'Start timer')}`;
},interact:(widget,state,action,now)=>widget.configuration?.actionTag?actionTimerInteraction(widget,state,action,now):action==='start'?{...state,endsAt:now+Math.max(1,Number(widget.configuration?.seconds)||240)*1000}:action==='reset'?{...state,endsAt:null}:state});
registerNoteWidget({type:'plant-list',label:'Plant List',category:'Garden tools',icon:'♧',description:'Plants or items associated with this place.',render:(widget,state)=>`<ul>${[...lines(widget),...(state.items || [])].map(item=>`<li>${escapeNote(item)}</li>`).join('')}</ul><label>Plant / item<input data-widget-input maxlength="120" aria-label="Plant or item name"></label>${button('add','Add plant / item')}`,interact:(_widget,state,action,_now,value)=>action==='add' && value.trim()?{...state,items:[...(state.items || []),value.trim().slice(0,120)].slice(0,30)}:state});
registerNoteWidget({type:'task',label:'Task / Complete',category:'Activity',icon:'✓',description:'An action with a saved completion state.',render:(widget,state)=>`${text(widget)}${button('complete',state.complete?'✓ Completed':widget.configuration?.label || 'Complete task')}`,interact:(_widget,state,action)=>action==='complete'?{...state,complete:!state.complete}:state});
registerNoteWidget({type:'tip',label:'Tip / Hint',category:'Information',icon:'?',description:'Compact information revealed when requested.',render:reveal,interact:revealAction});
registerNoteWidget({type:'clue',label:'Clue',category:'Activity',icon:'◇',description:'A clue for a trail or learning activity.',render:reveal,interact:revealAction});
