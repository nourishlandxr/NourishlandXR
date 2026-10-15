// Small, context-specific language helpers. Keep the user's actual names and
// dictated words; remove conversational wrappers rather than treating a whole
// sentence as the requested name, plant or Note.
export const ZINNIA_HEARS_YOU_LINE='Did you know that I can actually hear you?';
export const conversationText=value=>String(value || '').normalize('NFC').replace(/[’‘]/g,"'").trim();
const trim=value=>value.replace(/^[\s,.:;!?"“”]+|[\s,.:;!?"“”]+$/g,'').trim();
export function conversationConfirmation(value){
    const text=conversationText(value).toLowerCase();
    if(/\b(?:no|nope|not quite|not right|not correct|don't think|do not think|isn't right|is not right|that's wrong|that is wrong|change it|try again)\b/.test(text))return false;
    if(/\b(?:yes|yeah|yep|correct|that's right|that is right|that's me|that is me|sounds good|you got it|go ahead|save it|keep it|confirm)\b/.test(text))return true;
    return null;
}
export function conversationSkip(value){return /^(?:(?:please|actually|zinnia)[, ]+)*(?:skip(?: this| my name)?|continue(?: without (?:my|a) name)?|(?:i'd|i would) rather not(?: say| share)?|(?:i )?don't want to (?:say|share)(?: my name)?|never mind|cancel|stop)(?:[, ]+(?:please|thanks|thank you))?[.!?]*$/i.test(conversationText(value));}
export function spokenVisitorName(value){
    const text=conversationText(value),explicit=text.match(/\b(?:my name(?: is|'s)|(?:you can|you may|please) call me|(?:my friends|people|everyone|everybody|they|most people) (?:usually )?call me|call me|(?:i )?(?:prefer|like) to be called|(?:i am |i'm )?known as|i go by|i(?: am|'m) called|i(?: am|'m)|it(?: is|'s))\s+(.+)/i);
    let name=trim(explicit?explicit[1]:text.replace(/^(?:well[, ]+|actually[, ]+)+/i,'').replace(/^(?:hi|hello|hey)(?: there| zinnia)?[,! ]+/i,''));
    name=trim(name.split(/\s+(?:and|but|because|although|though|thanks|thank you|nice to meet you)\b|[.!?;,]/i)[0]);
    if(/\b(?:name|call|hello|hey|yes|no|thanks|thank|please|know|hear|listening|understand|fruit|favourite|favorite|sure|maybe|sorry|something|anything|nothing|feeling|doing|fine|happy|don't|not)\b/i.test(name))return '';
    return /^[\p{L}][\p{L}\p{M} '\-]{0,49}$/u.test(name) && name.split(/\s+/).length<=4?name:'';
}
const fruits=['passion fruit','star fruit','dragon fruit','pineapple','strawberry','pomegranate','carambola','passionfruit','dragonfruit','watermelon','blueberry','raspberry','blackberry','mango','peach','banana','apple','orange','papaya','avocado','fig','pear','grape','lychee','durian','jackfruit','guava','cherry','plum','apricot','kiwi','lemon','lime','mandarin','nectarine','persimmon'];
export function spokenFavouriteFruit(value){
    let text=conversationText(value).toLowerCase();if(/^(?:i (?:do not|don't) know|not sure|no idea|anything|nothing|no preference)[.!?]*$/.test(text))return '';
    const preference=text.match(/(?:i (?:really )?(?:prefer|love|like|enjoy)(?: eating)?|my favou?rite(?: fruit)?(?: (?:is|has to be|would be|would have to be))?)\s+(.+)/i);
    if(preference)text=preference[1];
    for(const fruit of fruits){const plural=fruit.endsWith('y')?fruit.slice(0,-1)+'ies':fruit==='mango'?'mango(?:es|s)?':fruit+'(?:s|es)?';if(new RegExp('\\b('+fruit+'|'+plural+')\\b','i').test(text))return fruit;}
    text=trim(text.replace(/^(?:well[, ]+|probably |definitely |a |an |the )+/i,'').split(/\s+(?:and|because|but|thanks|thank you)\b|[.!?;,]/i)[0]);
    return /^[\p{L}\p{M} '\-]{2,45}$/u.test(text) && text.split(/\s+/).length<=3?text:'';
}
export function spokenPlantQuery(value){
    let text=conversationText(value).replace(/^(?:(?:hey|hi|hello)\s+)?zinnia[,! ]*/i,'');
    text=text.replace(/^(?:(?:please|well|actually)[, ]+)*(?:(?:can|could|would) you\s+)?(?:(?:please|help me)\s+)?/i,'');
    text=text.replace(/^(?:(?:i'd|i would|i) (?:really )?(?:like|want)(?: to (?:explore|learn about|find|see))?|i'm curious about|tell me about|search for|look up|find|show|load|create(?: an? orb for)?|make an? orb for)\s+(?:me\s+)?(?:an? |the )?/i,'');
    return trim(text.replace(/\s+(?:please|thanks|thank you)(?:[, ].*)?$/i,'')).slice(0,120);
}
export function spokenNoteDraft(value){
    const text=conversationText(value);
    const match=text.match(/^(?:(?:hey\s+)?zinnia[, ]+)?(?:(?:can|could|would) you\s+)?(?:please\s+)?(?:write|save|create|make|add|leave|record)(?:\s+down)?(?:\s+(?:me\s+)?(?:a|this|the|my)\s+note)?(?:\s+(?:for me))?(?:\s+(?:that\s+)?(?:saying|reading|says?)|\s+(?:that|to say)|\s*:)\s*(.+)$/is);
    return (match?match[1]:text).trim().replace(/^["“]|["”]$/g,'');
}
