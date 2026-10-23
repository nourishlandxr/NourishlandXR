import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {spawnSync} from 'node:child_process';
import {WEBSITE_ROUTES,LEGACY_WEBSITE_PAGES,LEGACY_ENTRY_FILES,resolveLegacyEntry,websiteUrl} from '../app/services/siteRoutes.js';
import {bridgeHtml,routingBlock,sitemapXml,releaseHtmlFiles} from '../root-site/tools/canonical-pages.mjs';
import {allowedFrontendFile} from '../root-site/tools/frontend-boundary.mjs';
test('old website bookmarks reach the current page without loading the old site',()=>{
 for(const prefix of ['/xr/v2/','/app/v2/','/v2/'])for(const [hash,target]of [['education','/education/'],['food-forest-story','/food-forests/story/'],['food-forest-guide','/food-forests/guide/'],['about','/about/'],['demos','/demos/'],['creator','/platform/']])assert.equal(resolveLegacyEntry({pathname:prefix,hash:'#'+hash,search:'?review=test'}),target+'?review=test');
 assert.equal(resolveLegacyEntry({pathname:'/xr/',search:'',hash:''}),'/platform/');
 for(const query of ['?workspace=desktop&project=garden','?editor=pimo','?tour=walk&project=garden','?mode=ar'])assert.equal(resolveLegacyEntry({pathname:'/xr/index.html',search:query,hash:''}),'/app/'+query);
 assert.equal(resolveLegacyEntry({pathname:'/app/',search:'?workspace=field&project=garden',hash:''}),'/app/?workspace=field&project=garden');
 assert.equal(resolveLegacyEntry({pathname:'/app/',search:'?section=creator',hash:''}),'/creator/?section=creator');
 for(const p of ['/creator/','/xr/services/siteRoutes.js','/xr-api/projects','/xr/v2/assets/hero-wheel.png'])assert.equal(resolveLegacyEntry({pathname:p,search:'',hash:''}),null);
});
test('each retired static website entry is a small standalone bridge',()=>{
 for(const file of Object.keys(LEGACY_ENTRY_FILES)){
  const html=bridgeHtml(file);assert(!html.includes('route-block'));assert(!html.includes('homepage-hero'));assert(html.includes('noindex,follow'));
  const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];let destination;
  vm.runInNewContext(script,{URL,URLSearchParams,location:{origin:'https://nourishland.org',pathname:'/xr/v2/',search:'?utm_source=bookmark',hash:'#education',replace:value=>destination=value}});
  assert.equal(destination,'https://nourishland.org/education/?utm_source=bookmark');assert(allowedFrontendFile(file,releaseHtmlFiles));
 }
});
test('canonical sitemap has public current pages only; runtime assets remain separate',()=>{
 const xml=sitemapXml();for(const path of Object.values(WEBSITE_ROUTES))assert(xml.includes('https://nourishland.org'+path+'</loc>'));
 for(const old of Object.keys(LEGACY_WEBSITE_PAGES))assert(!xml.includes(old+'</loc>'));
 assert(!xml.includes('/xr/'));assert(!xml.includes('/account/'));assert(!xml.includes('/admin/'));
 assert.equal(websiteUrl('education',{},'https://nourishland.org/xr/services/siteRoutes.js').href,'https://nourishland.org/education/');
 const rules=routingBlock();assert(rules.includes('THE_REQUEST'));assert(rules.includes('xr-api|api|app|wp-admin|wp-json'));assert(!rules.includes('^xr/(.*)'));
});
test('routing patch retains cPanel and WordPress bytes and rejects malformed ownership markers',()=>{
 const python=process.env.PYTHON||(process.platform==='win32'?'C:/Users/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe':'python3');
 const code=`import importlib.util\ns=importlib.util.spec_from_file_location('merge','root-site/tools/merge-route-config.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)\nold=b'# cPanel private settings\\r\\n# BEGIN Nourishland root release old\\r\\nold rules\\r\\n# END Nourishland root release\\r\\n# BEGIN WordPress\\r\\nexisting auth and API routing\\r\\n# END WordPress\\r\\n'\nblock=b'# BEGIN Nourishland canonical routes\\nnew reviewed rules\\n# END Nourishland canonical routes\\n'\nnew=m.merge(old,block)\nassert new.startswith(b'# cPanel private settings\\r\\n')\nassert new.endswith(b'# BEGIN WordPress\\r\\nexisting auth and API routing\\r\\n# END WordPress\\r\\n')\nassert b'old rules' not in new\nassert m.merge(new,block)==new\ntry: m.merge(old.replace(b'# END Nourishland root release',b'# missing end'),block);raise AssertionError('bad marker accepted')\nexcept ValueError: pass\nprint('routing merge verified')`;
 const result=spawnSync(python,['-B','-c',code],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert(result.stdout.includes('verified'));
});
