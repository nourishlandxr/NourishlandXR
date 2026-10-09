// Authored investigations. A connection reveals a question, never a field finding.
const rule=(id,sources,title,question,explanation,example,lookFor,next,choices,accent='#d1c298')=>Object.freeze({id,version:1,sources:Object.freeze(sources),title,question,explanation,example,lookFor,next,choices:Object.freeze(choices),accent});
export const LIMO_CONNECTION_RULES=Object.freeze([
 rule('shade',['limo-place-sun','limo-life-layers'],'Who shades whom?','Which plant shades which neighbour, and when?',
  'Light and plant layers meet through the position of real neighbours. A taller plant can change the light reaching another; the relationship may differ with time of day and growth.',
  'Compare two neighbouring plants. Photograph the light at each plant in the morning and later in the day. Keep their identities and positions attached to the comparison.',
  'Canopy position, shadow direction, time and the lower plant’s light. A profile layer does not measure local shade.',
  'Attach both plants, record a dated light observation, then connect this discovery with First steps & later roles.',
  ['Shade observed at this time','Light relationship unclear','Return at another time'],'#c9d496'),
 rule('rain',['limo-place-water','limo-place-soil'],'Where does rain go?','Where does water arrive, pause and move through this patch?',
  'Ground cover and soil observations give context to a water observation. Comparing patches can reveal a pattern worth investigating; it does not establish the cause by itself.',
  'Observe a covered patch and an exposed patch after the same rain. Note pooling, surface movement and soil moisture without altering either patch.',
  'Rain date, slope, cover, surface condition and water paths. Open Soil conditions for a closer observation.',
  'Attach both patches or their Notes. Compare after rain, then connect with Try a technique to draft a small trial.',
  ['Water movement recorded','Pooling recorded','Pattern still uncertain'],'#8ac8d8'),
 rule('flower-visitors',['limo-life-flowering','limo-life-wildlife'],'Visitors around flowering','What do visitors do around these flowers?',
  'Flowering and wildlife records become more useful when they describe the same plant, time and behaviour. A flower visit alone does not establish pollination.',
  'Watch one flowering plant for five minutes. Record visits and behaviour, including a visit with no confirmed identity or no visitors during that interval.',
  'Flower stage, visit duration, contact with flowers, weather and observation time.',
  'Keep the flowering plant and visitor Note together. Connect with Habitat & shelter to explore the surrounding place.',
  ['Flower visit observed','Other behaviour observed','No visit during this watch'],'#d8b7cf'),
 rule('care-plan',['limo-vision-fit','limo-vision-care-capacity'],'A planting we can care for','Which proposal fits this place and the care people can give?',
  'A planting proposal needs both a suitable place and a realistic care commitment. Comparing candidates makes the trade-offs visible before inventory changes.',
  'Compare one small planting with improving an existing patch. List light, space, water and care tasks for both, then identify what is still unconfirmed.',
  'Intended purpose, actual site observations, future size, carer, access and task frequency.',
  'Attach the Area and candidate records. Save a small proposal and review date; connect it with trial results when those are available.',
  ['Small proposal with care agreed','Proposal needs adjustment','Care capacity uncertain'],'#c1b6dc'),
 rule('trial-results',['limo-action-trial','limo-change-repeat'],'Did the trial help?','What changed, compared with the starting observation?',
  'A trial becomes a learning experience when its intention, starting conditions, comparison and later observations stay together. Differences can have more than one explanation.',
  'Revisit a trial patch and a comparison patch using the same observation method. Record cover, visible change and care effort, including an unexpected result.',
  'Trial date, matching targets and method, weather differences, work performed and uncertainty.',
  'Attach the trial and return Notes. Record the result before deciding whether to repeat or expand.',
  ['Useful change observed','Unexpected change observed','Result still uncertain'],'#9fc4dd'),
 rule('fruit-use',['limo-life-ripening','limo-action-harvest'],'From fruit observation to use','How does this fruit observation inform the next question about use?',
  'Fruit appearance, structure and documented uses are different kinds of information. Connecting them helps ask about stage and preparation while retaining the plant’s actual guidance.',
  'Compare the current fruit photograph with its observation box. Notice the outer surface and internal parts, then inspect the matching plant’s uses and preparation information.',
  'Correct plant identity, observed fruit stage, structural details, documented method and remaining questions.',
  'Attach the plant and a dated fruit observation. Open its PIMO for plant-specific use guidance; do not infer edibility from appearance.',
  ['Stage differences recorded','Structure recorded','Use question remains open'],'#e5b28c'),
 rule('changing-shade',['@shade','limo-vision-phases'],'How shade changes as this place grows','How might this light relationship change as the plants grow?',
  'A shade relationship is a starting observation. Adding growth through time turns it into a question about changing canopy, spacing and later roles.',
  'Use the same two plants from Who shades whom? Compare today’s positions with a proposed later canopy sketch, clearly labelled as a possibility.',
  'Current height and canopy, available space, changing light, access and which future details are unconfirmed.',
  'Keep the original shade observation. Add a future sketch and choose a return date to revisit the same plants.',
  ['Later relationship sketched','Space needs checking','More observation needed'],'#b8cd8a'),
 rule('cover-trial',['@rain','limo-action-trial'],'A small ground-cover trial','What small comparison could investigate this water pattern?',
  'A recorded water pattern can guide a manageable trial question. Keep the comparison and the original observation visible so the trial has a clear purpose.',
  'Draft one ground-cover trial beside a comparison patch. Record starting cover, soil observations and water after comparable rain events before interpreting change.',
  'Patch boundaries, intended change, comparison conditions, rainfall timing and care effort.',
  'Save the proposed trial before acting. Mark it tried only after the work, then revisit both patches.',
  ['Comparison trial drafted','Starting observations missing','Observation-only comparison chosen'],'#8ec9bd'),
 rule('visitor-habitat',['@flower-visitors','limo-relationships-habitat'],'A place for flower visitors','What surrounding habitat should we investigate alongside these visits?',
  'Flower visits connect with the surrounding place through available flowers, shelter and movement. These features suggest questions to observe before proposing a habitat change.',
  'Map the existing flowering plant, nearby flowers and shelter. Compare visitor observations across dates before drawing a proposed small addition.',
  'Existing habitat, flowering times, shelter, recorded behaviour and gaps in the map.',
  'Attach habitat Notes alongside the original flowering observation. Keep any proposed change separate from observed conditions.',
  ['Existing habitat mapped','Small proposal drafted','Habitat needs observation'],'#b4cfa0'),
 rule('adjust-plan',['@care-plan','@trial-results'],'Adjust our planting plan','What do the recorded results and care effort suggest for this proposal?',
  'A care plan and a trial result can inform a decision when they refer to the same place and relevant targets. Evidence may support an adjustment, a further question or continuing at the current scale.',
  'Reopen the original proposal and the trial comparison. List what happened and what care it required, then compare continuing, adjusting and waiting.',
  'Matching Area and targets, original intention, observed results, available care and uncertainty.',
  'Record the decision and its reason. Keep both parent discoveries and choose the next review date.',
  ['Continue at current scale','Adjust the proposal','Pause and gather evidence'],'#c8b9dc')
]);
export const LIMO_CONNECTION_RULE_BY_ID=Object.freeze(Object.fromEntries(LIMO_CONNECTION_RULES.map(item=>[item.id,item])));
export const connectionToken=cell=>cell?.ruleId?'@'+cell.ruleId:cell?.id;
export function connectionRuleFor(cells){
 const tokens=cells.map(connectionToken).sort();return LIMO_CONNECTION_RULES.find(item=>item.sources.length===tokens.length && [...item.sources].sort().every((id,index)=>id===tokens[index])) || null;
}
export function connectionLearning(rule){return {ruleId:rule.id,ruleVersion:rule.version,generator:'limo-authored-connections',title:rule.title,summary:rule.explanation,learning:{question:rule.question,explanation:rule.explanation,example:rule.example,lookFor:rule.lookFor,next:rule.next,choices:[...rule.choices],accent:rule.accent,lens:'all',role:'observation'}};}
export function createLimoConnectionGenerator(){return {version:'limo-connections-v1',generate({sources}){
 const cells=sources.map(source=>({id:source.ref.nodeId,ruleId:source.derivedNode?.ruleId})),rule=connectionRuleFor(cells);
 if(!rule)throw new Error('This combination is not authored yet. Choose one of the highlighted connections.');return connectionLearning(rule);
}};}
// Local, code-native illustration: no external image or network dependency.
export function limoConnectionIllustration(ruleId){
 const rule=LIMO_CONNECTION_RULE_BY_ID[ruleId];if(!rule)return '';
 const labels={shade:['Light','Tall plant','Neighbour'],rain:['Rain','Ground cover','Soil'], 'flower-visitors':['Flowers','Visitor','Observation'], 'care-plan':['Site','Plant','Care'], 'trial-results':['Before','Comparison','After'], 'fruit-use':['Surface','Inside','Use question'], 'changing-shade':['Today','Growth','Later'], 'cover-trial':['Water pattern','Trial patch','Comparison'], 'visitor-habitat':['Flowers','Shelter','Visitors'], 'adjust-plan':['Proposal','Results','Next decision']}[ruleId];
 const escape=value=>value.replace(/[&<>]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[char]));
 const circles=labels.map((label,index)=>`<circle cx="${160+index*240}" cy="205" r="82" fill="#213d39" stroke="${rule.accent}" stroke-width="4"/><text x="${160+index*240}" y="215" text-anchor="middle" fill="#f4f0df" font-size="23" font-weight="700">${escape(label)}</text>`).join('');
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="420" viewBox="0 0 800 420"><rect width="800" height="420" rx="26" fill="#102724"/><text x="400" y="65" text-anchor="middle" fill="${rule.accent}" font-family="sans-serif" font-size="27" font-weight="700">${escape(rule.title)}</text><path d="M 160 205 Q 400 80 640 205" fill="none" stroke="${rule.accent}" stroke-width="3"/>${circles}<text x="400" y="365" text-anchor="middle" fill="#c4d8ce" font-family="sans-serif" font-size="21">Connect ideas. Observe this place.</text></svg>`);
}
