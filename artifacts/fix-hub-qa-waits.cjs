const fs=require('node:fs'),file='artifacts/creator-hub-browser-qa.mjs';let s=fs.readFileSync(file,'utf8');
s=s.replace("await page.locator('[data-hub-tool=content]').click();assert.equal", "await page.locator('[data-hub-tool=content]').click();await page.locator('.hub-tool-links a').first().waitFor();assert.equal");
s=s.replace("await mobile.locator('[data-hub-tool=content]').tap();assert.equal", "await mobile.locator('[data-hub-tool=content]').tap();await mobile.locator('.hub-tool-links a').first().waitFor();assert.equal");
s=s.replace("await xr.locator('[data-hub-tool=content]').click();assert.equal", "await xr.locator('[data-hub-tool=content]').click();await xr.locator('.hub-tool-links a').first().waitFor();assert.equal");
s=s.replace("await mobile.locator('[data-creator-hub-link]').tap();await mobile.locator('[data-hub-tool=records]').tap();", "await mobile.locator('[data-creator-hub-link]').tap();await mobile.locator('[data-hub-tool=records]').waitFor();await mobile.locator('[data-hub-tool=records]').tap();");
fs.writeFileSync(file,s);
