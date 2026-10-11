// Stage 0.1 teaches input before the existing guided plant journey.
export const WELCOME_PRACTICE_LESSONS=Object.freeze([
    {id:'frame',automatic:true,silent:true,title:'',caption:'',spoken:''},
    {id:'title',automatic:true,silent:true,hold:4,title:'Nourishland XR hands tutorial',caption:'',spoken:''},
    {id:'arrival',automatic:true,title:'Make yourself comfortable',caption:'Find a comfortable position. There is no hurry.',spoken:"Hi, my name is Zinnia. I'll be your guide here in Nourishland XR.\n\nBefore we begin, take a moment to get comfortable. Make sure you have a little clear space around you.\n\nWe can take this slowly. You don't need to do anything just yet."},
    {id:'table',automatic:true,title:'A place to practise',caption:'Let me bring a little table into our space.',spoken:"Let's make a little place for us to practise.\n\nI'll bring in a table. Just watch as it appears."},
    {id:'table-reveal',automatic:true,silent:true,hold:4.5,title:'A little table, just for us',caption:'',spoken:''},
    {id:'face',automatic:true,title:'A face to go with the voice',caption:'What if this voice had a face, and a little expression?',spoken:"Now we have somewhere to begin.\n\nYou've heard my voice. What if I had a face, and a little expression, too?\n\nLet me introduce myself properly."},
    {id:'zinnia-reveal',automatic:true,silent:true,hold:4.5,title:'Meet Zinnia',caption:'',spoken:''},
    {id:'zinnia',automatic:true,title:'Hello again',caption:'A little flower to keep you company.',spoken:"Here I am. A little flower to keep you company.\n\nI'll guide you one small step at a time."},
    {id:'comfort',automatic:true,title:'At your pace',caption:'Comfort options are beside you. Grip the panel to move it.',spoken:"Beside you is our comfort panel. You can pause, hear something again, adjust the sound, or skip this tutorial.\n\nHold the side grip while pointing at the panel to move it wherever feels comfortable. You can leave it to the side while we practise."},
    {id:'living-frame',automatic:true,title:'Our Living Frame',caption:'Instructions will appear here, in our Living Frame.',spoken:"And this is our Living Frame. It's where our instructions and little discoveries will appear.\n\nYou can look back here whenever you'd like a reminder."},
    {id:'practice-ready',automatic:true,title:'One small step at a time',caption:'We are here to practise using our hands.',spoken:"Today, we're simply practising how to use our hands in this space. First with the controllers, then with your own hands.\n\nThere's no rush, and you don't need to get everything right. Let's begin with something familiar."},
    {id:'grab',title:'Pick up and observe',caption:'Reach to the orange. Hold the side grip, lift it and look around it. Release when ready.',spoken:"Here is an orange. Reach towards it, then hold the side grip with your middle finger.\n\nLift it gently. Take a look around it, and turn it in your hand.\n\nWhen you're ready, release the grip to put it down. I'll wait for you."},
    {id:'gloves',title:'Your virtual gardening hands',caption:'Keep holding the controllers. Squeeze gently and watch your gloves move.',spoken:"Keep holding your controllers. Watch them become your gardening hands. Gently squeeze the grip. See how the fingers follow? These are virtual hands, moved by your controllers. Later, we'll put the controllers down and discover your own hands."},
    {id:'basket',automatic:true,title:'A home for our fruit',caption:'Let me bring in a basket.',spoken:"Let's bring in a basket for our fruit.\n\nIt will appear beside the orange."},
    {id:'basket-reveal',automatic:true,silent:true,hold:4.5,title:'A basket for our discoveries',caption:'',spoken:''},
    {id:'fruit',title:'Gather the fruit',caption:"Pick any fruit. Release it into the basket.",spoken:'Here are a few more fruits to explore. Pick up any fruit and place it in the basket.\n\nTake your time.'},
    {id:'fly',title:'A little flying companion',caption:"Pick up the remote, then release the grip. Trigger forward; grip back. Stick turns and changes height.",spoken:'Pick up the remote. Try flying through the glowing rings, then return to the table. The board shows the controls.'},
    {id:'hands',title:'Now try your real hands',caption:"Place both controllers somewhere safe. Raise your hands, look closely, then gently pinch.",spoken:'Put both controllers somewhere safe. Bring your hands into view. Gently touch your thumb and index finger together.'},
    {id:'packet',title:'A packet of possibilities',caption:'Pick up the strawberry packet. Pinch the seal with your other hand.',spoken:'Hold the strawberry packet in one hand. Pinch its seal with your other hand to open it.'},
    {id:'seed',title:'One tiny strawberry seed',caption:'Pinch the tiny seed inside its highlight. Lift it over the soil and release.',spoken:'Pinch a tiny seed, bring it over the soil, then let go.'},
    {id:'water',title:'Give it some water',caption:'Grab the can. Hold its spout above the soil and tilt it down.',spoken:"Now pick up the watering can. Bring its spout over the soil and gently tilt it down. Keep it there for a moment as the water falls. You're helping something grow."},
    {id:'grow',title:'A strawberry plant grows',caption:'Leaves, flowers, then fruit. This practice speeds up a much longer living cycle.',spoken:"Look closely. First come groups of three leaves, with little teeth along their edges. Then white flowers with yellow centres. And now, strawberries. We're speeding up a much longer living cycle so you can see it here. A real plant needs time, care, and pollination."},
    {id:'harvest',title:'Harvest what you grew',caption:'Pick the three ripe strawberries. Release each one into the basket.',spoken:"Your strawberries are ready. Gently pick each ripe berry from the plant. Bring it over the basket and let go. Try all three. You've planted, cared for, and grown something. Now you get to harvest it."},
    {id:'explore',title:'Make yourself at home',caption:'Play a little. Continue when you feel ready.',spoken:"Make yourself at home. Take as long as you like with the fruit and dragonfly. When you feel ready, we'll explore what you can do with Nourishland."}
]);

// Only acknowledge a first successful action, with room for silence afterwards.
export const WELCOME_PRACTICE_RESPONSES=Object.freeze([
    {id:'grab-done',spoken:'There you go. You can pick something up, look closely, and put it down.'},
    {id:'fly-done',spoken:"A lovely landing. Our dragonfly can rest here while we try your own hands."},
    {id:'hands-ready',spoken:"There they are. Your own hands can take part. Let's use them to grow strawberries."},
    {id:'fruit-done',spoken:"Everything is in the basket. Nicely done. Let's meet our flying companion."},
    {id:'packet-done',spoken:"There we go. Let's plant one of these tiny seeds."},
    {id:'seed-done',spoken:"The seed is in its new home. Let's give it a little water."},
    {id:'water-done',spoken:"That's enough. Watch the soil."},
    {id:'grow-done',spoken:"There are your ripe strawberries. Let's pick them."},
    {id:'harvest-done',spoken:"All three are in your basket. From a tiny seed to a harvest. You've completed a whole cycle."},
    {id:'fly-hands',spoken:'This one seems curious about you. Pinch close to the dragonfly and move your hand to guide it. Open your fingers, and it will find its own way again.'},
    {id:'practice-exit',spoken:'Of course. Let’s move into the main experience. You can return to the practice whenever you like.'}
]);
