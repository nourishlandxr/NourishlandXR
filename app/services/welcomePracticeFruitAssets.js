// Alternatives stay lazy: the welcome loads only its three chosen practice fruits.
export const WELCOME_FRUIT_ASSETS=Object.freeze({
    orange:{url:'../assets/welcome-practice/orange.glb',extent:.108,colour:'#deb067'},
    lime:{url:'../assets/welcome-practice/lime.glb',extent:.088,colour:'#b3bf73'},
    banana:{url:'../assets/welcome-practice/banana.glb',extent:.19,colour:'#e6d298'},
    'african-peach':{url:'../assets/fruit-window/mamey-african/african_peach_ripe.glb',extent:.085,colour:'#d6ad70'},
    carambola:{url:'../assets/fruit-window/carambola-bayberry/carambola_ripe.glb',extent:.12,colour:'#e8d785'},
    'mamey-sapote':{url:'../assets/fruit-window/mamey-african/mamey_sapote_ripe.glb',extent:.14,colour:'#b48a72'}
});
export const WELCOME_INITIAL_FRUITS=Object.freeze(['orange','lime','banana']);
export const WELCOME_TROPICAL_FRUITS=Object.freeze(['african-peach','carambola','mamey-sapote']);
