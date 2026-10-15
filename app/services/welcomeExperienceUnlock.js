const KEY='nlxr.welcome.input-choice.v1';
export const WELCOME_INPUT_METHODS=Object.freeze([
    {id:'controllers',label:'Controllers',icon:'controller'},
    {id:'gloves',label:'Virtual hands',icon:'virtual-hand'},
    {id:'hands',label:'Hand tracking',icon:'tracked-hand'}
]);
// Session-only progress survives the transition from the welcome into the demo.
export function welcomeInputChoiceUnlocked(){try{return globalThis.sessionStorage?.getItem(KEY)==='true';}catch{return false;}}
export function unlockWelcomeInputChoice(round){if(!round?.finished || !(round.winner || round.draw))return false;try{globalThis.sessionStorage?.setItem(KEY,'true');}catch{}return true;}

const INPUT_KEY='nlxr.welcome.input-method.v1';
export function welcomeInputMethod(){try{const mode=globalThis.sessionStorage?.getItem(INPUT_KEY);return WELCOME_INPUT_METHODS.some(m=>m.id===mode)?mode:'controllers';}catch{return 'controllers';}}
export function setWelcomeInputMethod(mode){if(!WELCOME_INPUT_METHODS.some(m=>m.id===mode))return false;try{globalThis.sessionStorage?.setItem(INPUT_KEY,mode);}catch{}return true;}
