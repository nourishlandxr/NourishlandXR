const KEY='nlxr.welcome.experiences.v1';
export const WELCOME_EXPERIENCES=Object.freeze([
    {id:'controllers',label:'Controllers: Orb and dance',icon:'controller'},
    {id:'gloves',label:'Virtual hands: fruit and brush',icon:'virtual-hand'},
    {id:'hands',label:'Hand tracking: butterflies and tic-tac-toe',icon:'tracked-hand'}
]);
// Session-only progress survives the transition from the welcome into the demo.
export function welcomeExperiencesUnlocked(){try{return globalThis.sessionStorage?.getItem(KEY)==='true';}catch{return false;}}
export function unlockWelcomeExperiences(round){if(!round?.finished || !(round.winner || round.draw))return false;try{globalThis.sessionStorage?.setItem(KEY,'true');}catch{}return true;}
