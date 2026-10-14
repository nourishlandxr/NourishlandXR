// Trial progress is independent of the guided lesson and can be revisited.
export const WELCOME_TRIALS=Object.freeze([
    {id:'dragonfly',label:'Dragonfly Flight'},
    {id:'strawberry',label:'Strawberry Planting'},
    {id:'butterflies',label:'Butterfly cup'},
    {id:'garden',label:'Cloud + Living Disk'},
    {id:'painting',label:'Paint in space'},
    {id:'peek-frame',label:'Peek picture frame'},
    {id:'tic-tac-toe',label:'Tic-Tac-Toe with Zinnia'}
]);
export const TRIAL_INPUT_MODES=Object.freeze(['controllers','gloves','hands']);
export const TRIAL_PLANT_CARDS=Object.freeze([
    {id:'strawberry',label:'Strawberry',role:'Low fruit layer',colour:'#c76b79',tree:false},
    {id:'orchard',label:'Fruit tree',role:'Canopy layer',colour:'#e7b967',tree:true},
    {id:'flowers',label:'Flowers',role:'Flowering layer',colour:'#ab8acf',tree:false},
    {id:'groundcover',label:'Groundcover',role:'Ground layer',colour:'#80ac72',tree:false}
]);
export function createWelcomeTrialState(){
    let active=null,mode='controllers',cloudPieces=1,water=1,released=false,colour=0;
    const plants=[],strokes=[];
    return {
        open(id){if(!WELCOME_TRIALS.some(t=>t.id===id))return false;active=id;return true;},
        close(){active=null;},
        setMode(value){if(!TRIAL_INPUT_MODES.includes(value))return false;mode=value;return true;},
        merge(){if(cloudPieces>=7)return false;cloudPieces++;water=Math.min(10,water+1.5);return true;},
        rain(dt){const amount=Math.min(water,Math.max(0,dt)*.28);water-=amount;return amount;},
        releaseButterflies(){released=true;},
        plant(card,x,z){if(!TRIAL_PLANT_CARDS.some(c=>c.id===card) || plants.length>=16)return null;const plant={card,x,z,growth:.06,water:0};plants.push(plant);return plant;},
        waterPlant(plant,amount){plant.water+=Math.max(0,amount);plant.growth=Math.min(1,.06+plant.water*1.8);},
        addStroke(stroke){strokes.push(stroke);},undo(){return strokes.pop();},clearPaint(){strokes.length=0;},
        nextColour(){colour=(colour+1)%5;},
        reset(){if(active==='butterflies')released=false;if(active==='garden'){cloudPieces=1;water=1;plants.length=0;}if(active==='painting')strokes.length=0;},
        get active(){return active;},get mode(){return mode;},get plants(){return plants;},get strokes(){return strokes;},
        snapshot(){return {active,mode,cloudPieces,water,released,colour,plants:plants.map(p=>({...p})),strokes:strokes.length};}
    };
}
