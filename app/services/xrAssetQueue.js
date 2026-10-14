// Bound concurrent model parsing and yield between fruits so the XR loop gets
// a chance to run. This does not make a single glTF parse preemptible.
export async function loadXRAssetBatch(items,load,{concurrency=2,cancelled=()=>false}={}){
    let next=0;
    await Promise.all(Array.from({length:Math.min(concurrency,items.length)},async()=>{
        while(next<items.length && !cancelled()){const index=next++;await load(items[index],index);await new Promise(resolve=>setTimeout(resolve,0));}
    }));
}
