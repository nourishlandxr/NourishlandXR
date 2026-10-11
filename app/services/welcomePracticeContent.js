// Stage 0.1 teaches input before the existing guided plant journey.
export const WELCOME_PRACTICE_LESSONS=Object.freeze([
    {id:'arrival',spokenOverride:true,title:'Welcome to NourishlandXR',caption:'We hope you are in a calm place with plenty of clear space. Get comfortable; there is no hurry.',spoken:'Welcome to Nourishland XR. Get comfortable. We will try controllers, gardening hands, then your own hands, at your pace. Comfort options let you adjust my voice, visual detail, or height. You can skip the practice whenever you like.'},
    {id:'point',title:'Point',caption:"Aim at the orange. Press the glowing trigger with your index finger.",spoken:"Here is your orange. Look at your controller. The front trigger is highlighted. Rest your index finger there. Now point at the orange and press it. I'll wait for you to try."},
    {id:'grab',title:'Reach · hold · release',caption:"Reach to the orange. Hold the glowing side grip. Lift, then release.",spoken:"The side grip is highlighted now. Press it with your middle finger as you reach to the orange. Hold it, lift the orange, then let go. Take your time."},
    {id:'gloves',title:'Your virtual gardening hands',caption:'Keep holding the controllers. Squeeze gently and watch your gloves move.',spoken:"Keep holding your controllers. Watch them become your gardening hands. Gently squeeze the grip. See how the fingers follow? These are virtual hands, moved by your controllers. Later, we'll put the controllers down and discover your own hands."},
    {id:'fruit',spokenOverride:true,title:'Gather the fruit',caption:"Pick any fruit. Release it into the basket.",spoken:'Pick up any fruit and place it in the basket. Take your time.'},
    {id:'fly',spokenOverride:true,title:'A little flying companion',caption:"Pick up the remote, then release the grip. Trigger forward; grip back. Stick turns and changes height.",spoken:'Pick up the remote. Try flying through the glowing rings, then return to the table. The board shows the controls.'},
    {id:'hands',spokenOverride:true,title:'Now try your real hands',caption:"Place both controllers somewhere safe. Raise your hands, look closely, then gently pinch.",spoken:'Put both controllers somewhere safe. Bring your hands into view. Gently touch your thumb and index finger together.'},
    {id:'packet',spokenOverride:true,title:'A packet of possibilities',caption:'Pick up the strawberry packet. Pinch the seal with your other hand.',spoken:'Hold the strawberry packet in one hand. Pinch its seal with your other hand to open it.'},
    {id:'seed',spokenOverride:true,title:'One tiny strawberry seed',caption:'Pinch the tiny seed inside its highlight. Lift it over the soil and release.',spoken:'Pinch a tiny seed, bring it over the soil, then let go.'},
    {id:'water',title:'Give it some water',caption:'Grab the can. Hold its spout above the soil and tilt it down.',spoken:"Now pick up the watering can. Bring its spout over the soil and gently tilt it down. Keep it there for a moment as the water falls. You're helping something grow."},
    {id:'grow',title:'A strawberry plant grows',caption:'Leaves, flowers, then fruit. This practice speeds up a much longer living cycle.',spoken:"Look closely. First come groups of three leaves, with little teeth along their edges. Then white flowers with yellow centres. And now, strawberries. We're speeding up a much longer living cycle so you can see it here. A real plant needs time, care, and pollination."},
    {id:'harvest',title:'Harvest what you grew',caption:'Pick the three ripe strawberries. Release each one into the basket.',spoken:"Your strawberries are ready. Gently pick each ripe berry from the plant. Bring it over the basket and let go. Try all three. You've planted, cared for, and grown something. Now you get to harvest it."},
    {id:'explore',title:'Make yourself at home',caption:'Play a little. Continue when you feel ready.',spoken:"Make yourself at home. Take as long as you like with the fruit and dragonfly. When you feel ready, we'll explore what you can do with Nourishland."}
]);

// Only acknowledge a first successful action, with room for silence afterwards.
export const WELCOME_PRACTICE_RESPONSES=Object.freeze([
    {id:'point-done',spoken:"That's it. Your pointer can reach things further away."},
    {id:'grab-done',spoken:'There you go. You can hold it, move it, and let it fall.'},
    {id:'fly-done',spoken:"A lovely landing. Our dragonfly can rest here while we try your own hands."},
    {id:'hands-ready',spoken:"There they are. Your own hands can take part. Let's use them to grow strawberries."},
    {id:'fruit-done',spoken:"Everything is in the basket. Nicely done. Let's meet our flying companion."},
    {id:'packet-done',spoken:"There we go. Let's plant one of these tiny seeds."},
    {id:'seed-done',spoken:"The seed is in its new home. Let's give it a little water."},
    {id:'water-done',spoken:"That's enough. Watch the soil."},
    {id:'grow-done',spoken:"There are your ripe strawberries. Let's pick them."},
    {id:'harvest-done',spoken:"All three are in your basket. From a tiny seed to a harvest. You've completed a whole cycle."},
    {id:'fly-hands',spoken:'This one seems curious about you. Pinch close to the dragonfly and move your hand to guide it. Open your fingers, and it will find its own way again.'}
]);
