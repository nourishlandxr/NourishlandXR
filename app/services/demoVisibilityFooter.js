const types=Object.freeze([{id:'plant',label:'ORB'},{id:'note',label:'NOTES'},{id:'control',label:'CONTROL PANEL'},{id:'zone',label:'TOTEMS'}]);
export function demoVisibilityFooter(seen,hidden=new Set()){
    return types.filter(item=>item.id==='control'||seen.has(item.id)).map(item=>({...item,selected:!hidden.has(item.id),description:(hidden.has(item.id)?'Open ':'Close ')+(item.id==='plant'?'all Orbs':item.id==='zone'?'all Totems':item.id==='note'?'all Notes':'Control panel')}));
}
