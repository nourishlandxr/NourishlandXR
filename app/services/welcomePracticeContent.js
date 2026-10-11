// Stage 0.1 teaches input before the existing guided plant journey.
export const WELCOME_PRACTICE_LESSONS=Object.freeze([
    {id:'arrival',title:'Welcome to NourishlandXR',caption:'First, get comfortable with the controls. Learn by trying.',spoken:"Hi. Welcome to Nourishland XR. Before we explore, let's get comfortable with the controls. I'll show you one movement at a time. Try each one, and we'll move on together. There's no hurry."},
    {id:'point',title:'Point',caption:'Aim at the ball. Press the glowing trigger with your index finger.',spoken:"Look at your controller. The front trigger is highlighted. Rest your index finger there. Now point at the ball and press it. Using hands? Point and pinch your thumb and index finger together. I'll wait for you to try."},
    {id:'grab',title:'Reach · hold · release',caption:'Reach to the ball. Hold the glowing side grip. Lift, then release.',spoken:"The side grip is highlighted now. Press it with your middle finger as you reach to the ball. Hold it, lift the ball, then let go. Using hands? Pinch close to the ball, lift it, and open your fingers. Take your time."},
    {id:'fly',title:'Meet the dragonfly',caption:'Hold the glowing trigger. Move the thumbstick, then release.',spoken:"This one seems curious about you. Hold the front trigger with your index finger. With your thumb, gently move the highlighted stick to steer the dragonfly. Try moving it a little, then release the trigger and let it wander."},
    {id:'hands',title:'Try your hands',caption:'Set controllers down safely. Raise your hands in view.',spoken:"Want to try your hands? Set your controllers down safely and bring your hands into view. We'll try the same movements together. Or keep the controllers if that feels better."},
    {id:'fruit',title:'Pick up something familiar',caption:'Pinch near a fruit. Move it, release it, and place it again.',spoken:'Pick one that you like. Pinch close to a fruit to pick it up, then open your fingers to let go. See where it lands. With controllers, use the side grip.'},
    {id:'seed',title:'A little beginning',caption:'Pick up the seed. Release it just above the soil in the pot.',spoken:"Let's use what you've learned. Pick up the little seed with your side grip, or pinch close to it with your fingers. Bring it over the soil and let go. One small beginning."},
    {id:'water',title:'Give it some water',caption:'Grab the can. Hold its spout above the soil and tilt it down.',spoken:"Now pick up the watering can. Bring its spout over the soil and gently tilt it down. Keep it there for a moment as the water falls. You're helping something grow."},
    {id:'grow',title:'Watch it grow',caption:'A little care becomes new life. Growth is sped up for this practice.',spoken:"There it is. We're speeding up growth here so you can see what your care has made possible. In a real garden, that takes time. These simple movements can help you learn about the living world."},
    {id:'explore',title:'Make yourself at home',caption:'Play a little. Continue when you feel ready.',spoken:"Make yourself at home. Take as long as you like with the ball, fruit, and dragonfly. When you feel ready, we'll explore what you can do with Nourishland."}
]);

// Only acknowledge a first successful action, with room for silence afterwards.
export const WELCOME_PRACTICE_RESPONSES=Object.freeze([
    {id:'point-done',spoken:"That's it. Your pointer can reach things further away."},
    {id:'grab-done',spoken:'There you go. You can hold it, move it, and let it fall.'},
    {id:'fly-done',spoken:'There it goes. It can find its own way again.'},
    {id:'hands-ready',spoken:"There are your hands. Let's use them to try the fruit."},
    {id:'fruit-done',spoken:"That's it. These same movements will help you explore."},
    {id:'seed-done',spoken:"The seed is in its new home. Let's give it a little water."},
    {id:'water-done',spoken:"That's enough. Watch the soil."},
    {id:'grow-done',spoken:"A little plant, ready to begin."},
    {id:'fly-hands',spoken:'This one seems curious about you. Pinch close to the dragonfly and move your hand to guide it. Open your fingers, and it will find its own way again.'}
]);
