import fs from 'fs';
let c = fs.readFileSync('app/style.css', 'utf8');
// Remove white border from map pin dots - just show the colored dot
c = c.replace(
  '.site-map-pin::after { content: \'\'; width: 7px; height: 7px; border: 1px solid rgba(255,255,255,.95); border-radius: 50%; background: #d2942a; box-shadow: 0 1px 4px rgba(0,0,0,.42); }',
  '.site-map-pin::after { content: \'\'; width: 5px; height: 5px; border: 0; border-radius: 50%; background: #348a28; box-shadow: none; }'
);
fs.writeFileSync('app/style.css', c);
console.log('CSS patched');