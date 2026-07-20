import fs from 'fs';
let c = fs.readFileSync('app/style.css', 'utf8');

// Keep only the dot area, no container, no pseudo-element
c = c.replace(
  `.site-map-pin { position: absolute; left: var(--map-x); top: var(--map-y); z-index: 3; display: grid; place-items: center; width: 18px; height: 18px; padding: 0; transform: translate(-50%, -50%); border: 0; border-radius: 50%; background: transparent; box-shadow: none; }`,
  `.site-map-pin { position: absolute; left: var(--map-x); top: var(--map-y); z-index: 3; width: 4px; height: 4px; min-width: 0; min-height: 0; margin: 0; padding: 0; transform: translate(-50%, -50%); border: 0; border-radius: 50%; background: #348a28; box-shadow: none; overflow: hidden; }`
);
c = c.replace(
  `.site-map-pin::after { content: ''; width: 5px; height: 5px; border: 0; border-radius: 50%; background: #348a28; box-shadow: none; }`,
  `.site-map-pin::after { display: none; }`
);

fs.writeFileSync('app/style.css', c);
console.log('CSS patched: pins are now 4px green dots');