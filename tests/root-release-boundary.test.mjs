import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedFrontendFile} from '../root-site/tools/frontend-boundary.mjs';

const routes = new Set(['index.html', 'education/index.html', 'platform/index.html']);
test('root publisher accepts reviewed pages, hero media and static XR fixes', () => {
  for (const file of ['index.html', 'education/index.html', 'site/root-release.json',
    'xr/services/buildInfo.js', 'xr/features/ar-demo/demoJourneyContent.js', 'xr/main.js', 'xr/screens/temporaryArDemo.js', 'xr/living-objects.css',
    'xr/v2/assets/hero-clean-hq/desktop.mp4', 'xr/vendor/iwsdk-input/bridge.js',
    'xr/food-forest-workbench.css', 'xr/assets/food-forest/plants.json',
    'xr/features/food-forest/landscapeView.js']) {
    assert.equal(allowedFrontendFile(file, routes), true, file);
  }
});
test('root publisher rejects API, user data, routing, hidden and traversal paths', () => {
  for (const file of ['.htaccess', 'xr/.htaccess', 'xr/index.html', 'xr-api/server.mjs', 'xr/api/server.js',
    'workspace/project.json', 'nourishland-data/users.json', 'xr/workspace/project.json',
    'xr/v2/../../site-config.js', '/index.html', 'xr/v2/.env', 'xr/v2/.git/config',
    'xr/v2//index.html', 'xr/v2/config.php', 'other/index.html',
    'xr/assets/food-forest/private.json', 'xr/assets/other/plants.json',
    'xr/features/other/server.js', 'xr/features/food-forest/private.json']) {
    assert.equal(allowedFrontendFile(file, routes), false, file);
  }
});
