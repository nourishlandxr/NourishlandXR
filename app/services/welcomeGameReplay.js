import {createZinniaVoice} from './zinniaVoice.js';
import {conversationConfirmation} from './zinniaConversationInput.js';

export function createWelcomeGameReplay({createVoice=createZinniaVoice,onSay=()=>{},onYes=()=>{},onNo=()=>{},onChange=()=>{}}={}){
    let active=false,listening=false,requested=false,age=0,voice=null;
    const ensureVoice=()=>voice ||= createVoice({onStatus:(_message,state={})=>{listening=Boolean(state.listening);onChange();},onText:text=>{if(!active)return;const answer=conversationConfirmation(text);if(answer===true || /\b(?:again|another round|play again)\b/i.test(text) && !/\b(?:no|not|don’t|don't)\b/i.test(text))answerWith(true);else if(answer===false || /\b(?:continue|finish|stop|done|no more)\b/i.test(text))answerWith(false);else {onSay({id:'game-replay-clarify',spoken:'Say yes for another round, or no to keep exploring.',spokenOverride:true});requested=true;}}});
    function answerWith(yes){if(!active)return false;active=false;voice?.cancel();listening=false;yes?onYes():onNo();onChange();return true;}
    return {begin(){if(active)return;active=true;listening=requested=false;age=0;onSay({id:'game-replay',spoken:'Would you like another round? Say yes to play again, or no to keep exploring.',spokenOverride:true});onChange();},
        update(dt,ready){if(!active || !ready)return;age+=dt;if(!requested && age>.2){requested=true;try{if(globalThis.sessionStorage?.getItem('nlxr.mic.ready')==='true')void ensureVoice().listen();}catch{}}if(age>20 && !listening)answerWith(false);},
        activate:id=>answerWith(id==='yes'),state:()=>({active,listening}),cancel(){active=false;voice?.cancel();listening=false;},destroy(){active=false;voice?.destroy();}};
}
