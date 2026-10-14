import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { hashProjectPassword, validateAccessRegistry } from './projectAccess.mjs';

// Server operator tool. Password arrives on stdin, never in command arguments or output.
const [file, id, projectId, role] = process.argv.slice(2);
if (!file || !id || !projectId || !['editor','admin'].includes(role)) throw new Error('Usage: node tools/provision-project-user.mjs PRIVATE_FILE USER_ID PROJECT_ID editor|admin (password on stdin)');
const target = path.resolve(file), root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (target === root || target.startsWith(root + path.sep)) throw new Error('Access registry must be outside the repository and web root.');
const password = fs.readFileSync(0, 'utf8').replace(/\r?\n$/, '');
const registry = fs.existsSync(target) ? validateAccessRegistry(JSON.parse(fs.readFileSync(target,'utf8'))) : { schemaVersion:1, users:[] };
const previous = registry.users.find(user => user.id === id);
const user = { id, passwordHash:await hashProjectPassword(password), sessionVersion:(previous?.sessionVersion || 0)+1,
    disabled:false, projects:{ ...previous?.projects, [projectId]:role } };
const next = validateAccessRegistry({ schemaVersion:1, users:[...registry.users.filter(item => item.id !== id),user] });
fs.mkdirSync(path.dirname(target),{recursive:true});
const temp = target + '.' + crypto.randomUUID() + '.tmp';
try { fs.writeFileSync(temp,JSON.stringify(next,null,2)+'\n',{mode:0o600,flag:'wx'}); fs.renameSync(temp,target); }
finally { if(fs.existsSync(temp))fs.unlinkSync(temp); }
console.log(`Project account ${id} updated for ${projectId} (${role}); previous sessions revoked.`);
