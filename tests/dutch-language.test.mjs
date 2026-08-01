import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const i18n = fs.readFileSync(new URL('../app/services/i18n.js', import.meta.url), 'utf8');
const demo = fs.readFileSync(new URL('../app/screens/temporaryArDemo.js', import.meta.url), 'utf8');

test('Dutch is available across shared controls, Creator AR and the demo', () => {
    assert.match(i18n, /'nl-NL': 'Nederlands \(Nederland\)'/);
    assert.match(i18n, /document\.documentElement\.lang = language/);
    assert.match(i18n, /'QUEST CONTROLS': 'QUEST-BEDIENING'/);
    assert.match(i18n, /'OPEN AR': 'OPEN AR'/);
    assert.match(i18n, /'TRY IT NOW': 'PROBEER HET NU'/);
    assert.match(i18n, /export function translateNxrText/);
    assert.match(demo, /const demoIsDutch = \(\) => currentNxrLanguage\(\) === 'nl-NL'/);
    assert.match(demo, /const demoIntroLabel = \(\) =>/);
});
