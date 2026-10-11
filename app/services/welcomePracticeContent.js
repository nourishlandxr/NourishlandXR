// Stage 0.1 teaches input before the existing guided plant journey.
export const WELCOME_PRACTICE_LESSONS=Object.freeze([
    {id:'arrival',title:'Welcome to NourishlandXR',caption:'A living world of plants, people and place. First, get comfortable with XR.',spoken:"Hi. Welcome to Nourishland XR. This is a living world of learning, connecting plants, people, and the places we care for. Here, you can explore ideas and bring them into a real project. First, let's get comfortable with this technology and the controls. I'll guide you, one movement at a time. There's no hurry. When you're ready, a little table and an orange will appear in front of you."},
    {id:'point',title:'Point',caption:'Aim at the orange. Press the glowing trigger with your index finger.',spoken:"Here is your orange. Look at your controller. The front trigger is highlighted. Rest your index finger there. Now point at the orange and press it. Using hands? Point and pinch your thumb and index finger together. I'll wait for you to try."},
    {id:'grab',title:'Reach · hold · release',caption:'Reach to the orange. Hold the glowing side grip. Lift, then release.',spoken:"The side grip is highlighted now. Press it with your middle finger as you reach to the orange. Hold it, lift the orange, then let go. Using hands? Pinch close to the orange, lift it, and open your fingers. Take your time."},
    {id:'gloves',title:'Your virtual gardening hands',caption:'Keep holding the controllers. Squeeze gently and watch your gloves move.',spoken:"Keep holding your controllers for now. These are your virtual gardening hands. Gently squeeze the grip and watch the fingers move. The controllers are still doing the work. In a moment, we'll try your real hands too."},
    {id:'fruit',title:'Gather the fruit',caption:'Hold the side grip to pick up each fruit. Release it inside the basket.',spoken:"Let's gather the fruit. Pick up the orange, the lime, and the banana, one at a time. Use your side grip to hold each one. Bring it over the basket and let go. There's no rush. I'll wait while you try all three."},
    {id:'fly',title:'A little flying companion',caption:'Grab the remote with the side grip. Hold the trigger and move the thumbstick.',spoken:"Here comes a little flying companion. Pick up the small remote with your side grip and keep holding it. Now hold the front trigger and gently move the thumbstick. You're steering it, just like a remote control toy. Move it a little, then let go of the trigger."},
    {id:'hands',title:'Now try your real hands',caption:'Set controllers down safely. Raise your hands, pinch an orange, lift and release.',spoken:"Now let's try your real hands. Set both controllers down safely and bring your hands into view. There they are. Pinch close to the orange to pick it up. Lift it a little, then open your fingers. These hands follow you, without the controllers. Or choose Controllers if you'd prefer to keep using them."},
    {id:'seed',title:'A little beginning',caption:'Pick up the seed. Release it just above the soil in the pot.',spoken:"Let's use what you've learned. Pick up the little seed with your side grip, or pinch close to it with your fingers. Bring it over the soil and let go. One small beginning."},
    {id:'water',title:'Give it some water',caption:'Grab the can. Hold its spout above the soil and tilt it down.',spoken:"Now pick up the watering can. Bring its spout over the soil and gently tilt it down. Keep it there for a moment as the water falls. You're helping something grow."},
    {id:'grow',title:'Watch it grow',caption:'A little care becomes new life. Growth is sped up for this practice.',spoken:"There it is. We're speeding up growth here so you can see what your care has made possible. In a real garden, that takes time. These simple movements can help you learn about the living world."},
    {id:'explore',title:'Make yourself at home',caption:'Play a little. Continue when you feel ready.',spoken:"Make yourself at home. Take as long as you like with the fruit and dragonfly. When you feel ready, we'll explore what you can do with Nourishland."}
]);

// Only acknowledge a first successful action, with room for silence afterwards.
export const WELCOME_PRACTICE_RESPONSES=Object.freeze([
    {id:'point-done',spoken:"That's it. Your pointer can reach things further away."},
    {id:'grab-done',spoken:'There you go. You can hold it, move it, and let it fall.'},
    {id:'fly-done',spoken:'There it goes. It can find its own way again.'},
    {id:'hands-ready',spoken:"That's it. Your own hands can hold things too. Let's use them to plant something."},
    {id:'fruit-done',spoken:"All three are in the basket. Nicely done. Let's try something that flies."},
    {id:'seed-done',spoken:"The seed is in its new home. Let's give it a little water."},
    {id:'water-done',spoken:"That's enough. Watch the soil."},
    {id:'grow-done',spoken:"A little plant, ready to begin."},
    {id:'fly-hands',spoken:'This one seems curious about you. Pinch close to the dragonfly and move your hand to guide it. Open your fingers, and it will find its own way again.'}
]);
