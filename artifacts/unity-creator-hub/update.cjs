const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const unity = 'C:/FILES/Projects/NLXRunity';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const applied = JSON.parse(fs.readFileSync(path.join(__dirname, 'applied.json'), 'utf8'));
const changed = ['Assets/NLXR/Scripts/NativePanel.cs', 'Assets/NLXR/Scripts/NativeJourneyCreatorHub.cs', 'Assets/NLXR/Scripts/NativeJourneyCreatorHubChecks.cs'];
const nativePanelHash = process.argv[2];
if (!/^[a-f0-9]{64}$/i.test(nativePanelHash || '')) throw new Error('Expected original NativePanel hash');
for (const file of changed) {
  const expected = applied.find(item => item.file === file)?.sha256 || nativePanelHash.toLowerCase();
  if (hash(fs.readFileSync(path.join(unity,file))) !== expected) throw new Error('Source changed, preserve and review: '+file);
}
for (const file of changed) {
  const target = path.join(unity, file), backup = path.join(__dirname, 'before', file);
  if (!fs.existsSync(backup)) { fs.mkdirSync(path.dirname(backup), {recursive:true}); fs.copyFileSync(target,backup); }
  fs.copyFileSync(path.join(__dirname,file),target);
  const record = applied.find(item=>item.file===file);
  if (record) record.sha256=hash(fs.readFileSync(target)); else applied.push({file,sha256:hash(fs.readFileSync(target))});
}
fs.writeFileSync(path.join(__dirname,'applied.json'),JSON.stringify(applied,null,2));
console.log('Applied visual layout repair and containment checks.');
