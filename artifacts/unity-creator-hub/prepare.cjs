const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const unity = 'C:/FILES/Projects/NLXRunity';
const files = ['Assets/NLXR/Scripts/NativeJourneyCreate.cs', 'Assets/NLXR/Scripts/NativeJourneyPlatform.cs', 'Assets/NLXR/Scripts/NativeJourneyCreatorSetup.cs', 'Assets/NLXR/Scripts/NativeJourneyMainMenuChecks.cs', 'Assets/NLXR/Editor/ProjectSetup.cs', 'ProjectSettings/ProjectSettings.asset'];
const manifest = [];
for (const file of files) {
  const bytes = fs.readFileSync(path.join(unity, file));
  const local = path.join(__dirname, file);
  fs.mkdirSync(path.dirname(local), {recursive:true});
  fs.writeFileSync(local, bytes);
  manifest.push({file, hash:crypto.createHash('sha256').update(bytes).digest('hex')});
}
fs.writeFileSync(path.join(__dirname, 'baseline.json'), JSON.stringify(manifest, null, 2));
console.log('Prepared scoped Unity hub source copies.');
