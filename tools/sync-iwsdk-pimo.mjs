import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'app', 'services', 'pigeonPeaPim.js');
const outputPath = path.join(root, 'iwsdk', 'src', 'pigeonPeaPim.data.json');
const { PIGEON_PEA_PIM } = await import(pathToFileURL(sourcePath).href);
const data = structuredClone(PIGEON_PEA_PIM);

data.identity.image = '';
data.nodes = data.nodes.map((node) => ({ ...node, media: [] }));
fs.writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Synced ${data.nodes.length} Pigeon Pea cells to ${path.relative(root, outputPath)} without image payloads.`);
