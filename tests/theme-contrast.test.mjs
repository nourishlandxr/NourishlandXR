import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const css = fs.readFileSync(path.resolve(import.meta.dirname, '../app/style.css'), 'utf8');
const themes = ['forest-light', 'light', 'dark', 'forest-dark', 'cyber'];

function luminance(hex) {
    const channels = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255);
    const linear = channels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(first, second) {
    const values = [luminance(first), luminance(second)].sort((left, right) => right - left);
    return (values[0] + 0.05) / (values[1] + 0.05);
}

function themeVariables(theme) {
    const block = css.match(new RegExp(`body\\[data-project-theme="${theme}"\\]\\s*\\{([\\s\\S]*?)\\}`));
    assert.ok(block, `Missing ${theme} theme block`);
    return Object.fromEntries([...block[1].matchAll(/(--[a-z-]+):\s*([^;]+);/g)].map(match => [match[1], match[2].trim()]));
}

test('every theme gives normal, primary, quick-access and danger buttons readable contrast', () => {
    for (const theme of themes) {
        const variables = themeVariables(theme);
        const quickStops = variables['--theme-quick-access'].match(/#[0-9a-f]{6}/gi);
        const pairs = [
            ['normal button', variables['--theme-button-bg'], variables['--theme-button-text']],
            ['primary button', variables['--theme-accent'], variables['--theme-on-accent']],
            ['danger button', variables['--theme-danger-bg'], variables['--theme-danger-text']],
            ...quickStops.map(color => ['quick-access button', color, variables['--theme-quick-text']])
        ];

        for (const [role, background, foreground] of pairs) {
            assert.ok(contrast(background, foreground) >= 4.5, `${theme} ${role} contrast is below 4.5:1`);
        }
    }
});

test('theme rules protect nested labels, focus indicators and destructive actions', () => {
    assert.match(css, /button\.primary span/);
    assert.match(css, /button\.danger/);
    assert.match(css, /button:focus-visible/);
    assert.match(css, /experience-launch-card > span/);
    assert.match(css, /quick-access-icon/);
});
