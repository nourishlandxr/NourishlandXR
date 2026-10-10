// Stage 0.1 teaches input before the existing guided plant journey.
export const WELCOME_PRACTICE_LESSONS=Object.freeze([
    {id:'arrival',title:'Welcome to NourishlandXR',caption:'A little space to get familiar.',spoken:"Hi. Welcome to Nourishland XR. I'll be here with you while you get comfortable. There's no hurry. We'll explore real places and the life around us. First, let's try one thing together."},
    {id:'point',title:'Point',caption:'Aim at the ball. Press the trigger, or point and pinch.',spoken:"Let's start with the ball. Point at it and press the front trigger on your controller. Using hands? Point and pinch your thumb and index finger together."},
    {id:'grab',title:'Reach · hold · release',caption:'Reach to the ball. Hold the side grip, or pinch nearby.',spoken:"Bring your hand close to the ball. Hold the side grip, or pinch with your fingers. Try moving it, then let go. I'll wait here."},
    {id:'fly',title:'Meet the dragonfly',caption:'Hold the trigger and move the stick. Release to let it wander.',spoken:'This one seems curious about you. Hold the front trigger and gently move your thumb stick to guide the dragonfly. Let go whenever you want it to find its own way.'},
    {id:'hands',title:'Try your hands',caption:'Set controllers down safely. Raise your hands in view.',spoken:"Want to try your hands? Set your controllers down safely and bring your hands into view. We'll try the same movements together. Or keep the controllers if that feels better."},
    {id:'fruit',title:'Pick up something familiar',caption:'Pinch near a fruit. Move it, release it, and place it again.',spoken:'Pick one that you like. Pinch close to a fruit to pick it up, then open your fingers to let go. See where it lands. With controllers, use the side grip.'},
    {id:'explore',title:'Make yourself at home',caption:'Play a little. Continue when you feel ready.',spoken:"Make yourself at home. Take as long as you like with the ball, fruit, and dragonfly. When you feel ready, we'll explore what you can do with Nourishland."}
]);

// Only acknowledge a first successful action, with room for silence afterwards.
export const WELCOME_PRACTICE_RESPONSES=Object.freeze([
    {id:'point-done',spoken:"That's it. Your pointer can reach things further away."},
    {id:'grab-done',spoken:'There you go. You can hold it, move it, and let it fall.'},
    {id:'fly-done',spoken:'There it goes. It can find its own way again.'},
    {id:'hands-ready',spoken:"There are your hands. Let's use them to try the fruit."},
    {id:'fruit-done',spoken:"That's it. These same movements will help you explore."},
    {id:'fly-hands',spoken:'This one seems curious about you. Pinch close to the dragonfly and move your hand to guide it. Open your fingers, and it will find its own way again.'}
]);
