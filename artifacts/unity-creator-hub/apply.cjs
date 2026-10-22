const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const targetRoot = path.resolve('C:/FILES/Projects/NLXRunity');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, 'baseline.json'), 'utf8'));
const added = ['Assets/NLXR/Scripts/NativeJourneyCreatorHub.cs', 'Assets/NLXR/Scripts/NativeJourneyCreatorHubChecks.cs', 'Documentation/creator-hub.md'];
for (const file of added.filter(file => file.endsWith('.cs'))) {
  const meta = path.join(__dirname, file + '.meta');
  if (!fs.existsSync(meta)) fs.writeFileSync(meta, 'fileFormatVersion: 2\nguid: ' + crypto.randomBytes(16).toString('hex') + '\n');
  added.push(file + '.meta');
}
const operations = [...baseline, ...added.map(file => ({file, hash:null}))];
for (const item of operations) {
  const target = path.resolve(targetRoot, item.file);
  if (!target.startsWith(targetRoot + path.sep)) throw new Error('Target outside Unity root');
  if (!fs.existsSync(path.join(__dirname, item.file))) throw new Error('Missing prepared source: ' + item.file);
  if (item.hash) {
    if (!fs.existsSync(target) || hash(fs.readFileSync(target)) !== item.hash) throw new Error('Source changed; preserve and review: ' + item.file);
  } else if (fs.existsSync(target)) throw new Error('New target already exists; preserve and review: ' + item.file);
}
for (const item of operations) {
  const target = path.join(targetRoot, item.file);
  if (item.hash) {
    const backup = path.join(__dirname, 'before', item.file);
    fs.mkdirSync(path.dirname(backup), {recursive:true}); fs.copyFileSync(target, backup);
  }
  fs.mkdirSync(path.dirname(target), {recursive:true});
  fs.copyFileSync(path.join(__dirname, item.file), target);
}
fs.writeFileSync(path.join(__dirname, 'applied.json'), JSON.stringify(operations.map(item => ({file:item.file, sha256:hash(fs.readFileSync(path.join(targetRoot,item.file)))})),null,2));
console.log('Applied ' + operations.length + ' scoped files to Unity, preserving originals and unrelated changes.');
