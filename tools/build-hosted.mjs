import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const webDist = path.join(dist, 'xr');
const apiDist = path.join(dist, 'xr-api');
const frontendOnly = process.argv.includes('--frontend-only');
const packageData = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const builtAt = new Date().toISOString();
const commit = String(process.env.GITHUB_SHA || 'local').slice(0, 12);
const buildVersion = `${packageData.version}+${commit}.${builtAt.replace(/[-:.TZ]/g, '').slice(0, 14)}`;

function recreateDirectory(directory) {
    fs.mkdirSync(directory, { recursive: true });
    for (const entry of fs.readdirSync(directory)) {
        fs.rmSync(path.join(directory, entry), { recursive: true, force: true });
    }
}

fs.mkdirSync(dist, { recursive: true });
recreateDirectory(webDist);
fs.cpSync(path.join(root, 'app'), webDist, { recursive: true });
fs.copyFileSync(path.join(root, 'deploy', 'xr.htaccess'), path.join(webDist, '.htaccess'));
const indexPath = path.join(webDist, 'index.html');
const versionQuery = encodeURIComponent(buildVersion);
const versionedIndex = fs.readFileSync(indexPath, 'utf8')
    .replace('href="style.css"', `href="style.css?v=${versionQuery}"`)
    .replace('src="main.js"', `src="main.js?v=${versionQuery}"`);
fs.writeFileSync(indexPath, versionedIndex);
fs.writeFileSync(path.join(webDist, 'services', 'buildInfo.js'), `export const BUILD_INFO = Object.freeze(${JSON.stringify({
    version: buildVersion,
    commit,
    builtAt,
    target: 'production'
}, null, 4)});\n`);

console.log(`Frontend: ${webDist}`);
console.log(`Build: ${buildVersion}`);
if (!frontendOnly) {
    recreateDirectory(apiDist);
    fs.copyFileSync(path.join(root, 'tools', 'persistence-server.mjs'), path.join(apiDist, 'server.mjs'));
    fs.writeFileSync(path.join(apiDist, 'package.json'), JSON.stringify({
        name: 'nourishland-xr-api',
        private: true,
        version: packageData.version,
        type: 'module',
        scripts: { start: 'node server.mjs' }
    }, null, 2) + '\n');
    console.log(`API: ${apiDist}`);
}
console.log(frontendOnly ? 'Frontend-only build: API and workspace were untouched.' : 'Workspace data was not copied.');
