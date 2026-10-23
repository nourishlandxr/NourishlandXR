import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const webDist = path.join(dist, 'xr');
const apiDist = path.join(dist, 'xr-api');
const frontendOnly = process.argv.includes('--frontend-only');
const includeIwsdkPreview = process.argv.includes('--with-iwsdk');
const iwsdkDist = path.join(root, 'iwsdk', 'dist');
const packageData = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const builtAt = new Date().toISOString();
const commit = String(process.env.GITHUB_SHA || 'local').slice(0, 12);
// Read the simplified version from app/services/buildInfo.js
let simpleVersion = packageData.version;
try {
    const buildInfoContent = fs.readFileSync(path.join(root, 'app', 'services', 'buildInfo.js'), 'utf8');
    const match = buildInfoContent.match(/const VERSION\s*=\s*'([^']+)'/);
    if (match) simpleVersion = match[1];
} catch {}
const buildVersion = simpleVersion;
const protectedDirectoryNames = new Set(['workspace', 'xr-api', 'nourishland-data']);

// Build the standalone SDK input bridge for the existing NLXR routes, including
// direct `node tools/build-hosted.mjs` callers. The test scene stays opt-in.
execFileSync(process.execPath, [path.join(root, 'iwsdk', 'node_modules', 'vite', 'bin', 'vite.js'),
    'build', '--config', 'vite.input.config.js'], { cwd: path.join(root, 'iwsdk'), stdio: 'inherit' });
const frontendEntries = [
    'index.html',
    'main.js',
    'entry.js',
    'platform.html',
    'platform.js',
    'platform.css',
    'access-portal.css',
    'account',
    'creator',
    'demos',
    'admin',
    'field',
    'creator-studio.css',
    'creator-hub.css',
    'creator-game-menu.css',
    'creator-workbench.css',
    'creator-xr-panel.css',
    'creator-project-tutorial.css',
    'creator-field-worker.js',
    'style.css',
    'pim.css',
    'pimo-editor.css',
    'pimo-reader-preview.css',
    'product-v2.css',
    'living-objects.css',
    'creator-workspace.css',
    'note-widgets.css',
    'assets',
    'components',
    'features',
    'managers',
    'models',
    'screens',
    'services',
    'templates',
    'vendor'
    ,'v2'
];

function recreateDirectory(directory) {
    fs.mkdirSync(directory, { recursive: true });
    for (const entry of fs.readdirSync(directory)) {
        fs.rmSync(path.join(directory, entry), { recursive: true, force: true });
    }
}

function assertSafeFrontendTree(sourcePath) {
    const stat = fs.lstatSync(sourcePath);
    if (stat.isSymbolicLink()) throw new Error(`Frontend source must not contain symbolic links: ${sourcePath}`);
    if (!stat.isDirectory()) return;
    if (protectedDirectoryNames.has(path.basename(sourcePath).toLowerCase())) {
        throw new Error(`Protected directory is not a frontend asset: ${sourcePath}`);
    }
    for (const entry of fs.readdirSync(sourcePath)) assertSafeFrontendTree(path.join(sourcePath, entry));
}

function copyFrontendAssets() {
    const appRoot = path.join(root, 'app');
    for (const entry of frontendEntries) {
        const sourcePath = path.join(appRoot, entry);
        if (!fs.existsSync(sourcePath)) throw new Error(`Required frontend entry is missing: app/${entry}`);
        assertSafeFrontendTree(sourcePath);
        fs.cpSync(sourcePath, path.join(webDist, entry), { recursive: true });
    }
}

if (includeIwsdkPreview) {
    if (!fs.existsSync(path.join(iwsdkDist, 'index.html'))) {
        throw new Error('IWSDK preview is not built. Run npm --prefix iwsdk run build first.');
    }
    assertSafeFrontendTree(iwsdkDist);
}
fs.mkdirSync(dist, { recursive: true });
recreateDirectory(webDist);
copyFrontendAssets();
if (includeIwsdkPreview) {
    fs.cpSync(iwsdkDist, path.join(webDist, 'iwsdk'), { recursive: true });
}
fs.copyFileSync(path.join(root, 'deploy', 'xr.htaccess'), path.join(webDist, '.htaccess'));
const indexPath = path.join(webDist, 'index.html');
const versionQuery = encodeURIComponent(buildVersion);
const versionedIndex = fs.readFileSync(indexPath, 'utf8')
    .replace(/href="(style|pim|product-v2|living-objects|creator-workspace|note-widgets)\.css(?:\?v=[^"]*)?"/g, (_match,name) => `href="${name}.css?v=${versionQuery}"`)
    .replace(/src="(?:main|entry)\.js(?:\?v=[^"]*)?"/, `src="entry.js?v=${versionQuery}"`);
fs.writeFileSync(indexPath, versionedIndex);
const platformPath = path.join(webDist, 'platform.html');
fs.writeFileSync(platformPath, fs.readFileSync(platformPath, 'utf8')
    .replace('href="platform.css"', `href="platform.css?v=${versionQuery}"`)
    .replace('src="platform.js"', `src="platform.js?v=${versionQuery}"`));
const fieldPath = path.join(webDist, 'field', 'index.html');
fs.writeFileSync(fieldPath, fs.readFileSync(fieldPath, 'utf8')
    .replace('href="../platform.css"', `href="../platform.css?v=${versionQuery}"`)
    .replace('href="styles.css"', `href="styles.css?v=${versionQuery}"`)
    .replace('src="main.js"', `src="main.js?v=${versionQuery}"`));
fs.writeFileSync(path.join(webDist, 'services', 'buildInfo.js'), `export const BUILD_INFO = Object.freeze(${JSON.stringify({
    version: buildVersion,
    commit,
    builtAt,
    target: 'production'
}, null, 4)});\n`);

console.log(`Frontend: ${webDist}`);
console.log(`Build: ${buildVersion}`);
if (includeIwsdkPreview) console.log('IWSDK preview: /xr/iwsdk/ (opt-in; existing demo unchanged)');
if (!frontendOnly) {
    recreateDirectory(apiDist);
    const apiServer = fs.readFileSync(path.join(root, 'tools', 'persistence-server.mjs'), 'utf8')
        .replaceAll("../app/services/", './app/services/');
    fs.writeFileSync(path.join(apiDist, 'server.mjs'), apiServer);
    fs.copyFileSync(path.join(root, 'tools', 'zipArchive.mjs'), path.join(apiDist, 'zipArchive.mjs'));
    for(const file of ['zinniaVoiceServer.mjs','zinniaInterpretation.mjs','zinniaPreviewProxy.mjs','projectAccess.mjs'])fs.copyFileSync(path.join(root,'tools',file),path.join(apiDist,file));
    fs.writeFileSync(path.join(apiDist,'projectChecklists.mjs'), fs.readFileSync(path.join(root,'tools','projectChecklists.mjs'),'utf8').replaceAll('../app/services/', './app/services/'));
    fs.writeFileSync(path.join(apiDist,'projectTours.mjs'),fs.readFileSync(path.join(root,'tools','projectTours.mjs'),'utf8').replaceAll('../app/services/','./app/services/'));
    const apiServices = ['spatialDataModel.js', 'daleysPlant.js', 'pigeonPeaTemplate.js', 'pigeonPeaExample.js', 'pigeonPeaPim.js', 'plantTrialContent.js', 'pimCellIllustrations.js', 'pimModel.js', 'pimCompass.js'];
    apiServices.push('sharedProjectContract.js', 'checklistContract.js', 'projectListContract.js',
        'tourModel.js','siteFeature.js',
        'imapElevationSource.js', 'projectGeographicPersistence.js', 'creatorProjectGeography.js');
    const apiServiceDist = path.join(apiDist, 'app', 'services');
    fs.mkdirSync(apiServiceDist, { recursive: true });
    apiServices.forEach(fileName => fs.copyFileSync(path.join(root, 'app', 'services', fileName), path.join(apiServiceDist, fileName)));
    const daleysCatalogSource = path.join(root, 'data1', 'daleys_plant_catalog.json');
    if (fs.existsSync(daleysCatalogSource)) {
        const daleysCatalogDist = path.join(apiDist, 'data1');
        fs.mkdirSync(daleysCatalogDist, { recursive: true });
        fs.copyFileSync(daleysCatalogSource, path.join(daleysCatalogDist, 'daleys_plant_catalog.json'));
    }
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
