import fs from 'node:fs';
import crypto from 'node:crypto';

const report = fs.readFileSync('XR_AUDIT_AND_IMPROVEMENT_PLAN.md', 'utf8');
const errors = [];
const paths = new Set();
for (const match of report.matchAll(/`((?:app|tests|tools|docs|artifacts)\/[A-Za-z0-9_./-]+\.(?:js|mjs|json|md|log))(?::([0-9]+)(?:-[0-9]+)?)?`/g)) {
  const [, file, line] = match;
  paths.add(file);
  if (!fs.existsSync(file)) errors.push(`Missing file: ${file}`);
  else if (line && Number(line) > fs.readFileSync(file, 'utf8').split('\n').length) errors.push(`Invalid line: ${file}:${line}`);
}
if ((report.match(/^```/gm) || []).length % 2) errors.push('Unclosed fenced block');
report.split('\n').forEach((line, index) => { if (/[\t ]+$/.test(line)) errors.push(`Trailing whitespace: ${index + 1}`); });
const snapshot = JSON.parse(fs.readFileSync('artifacts/xr-audit/source-and-asset-snapshot.json', 'utf8'));
const changedSinceSnapshot = snapshot.source.filter(item => crypto.createHash('sha256').update(fs.readFileSync(item.file)).digest('hex') !== item.sha256).map(item => item.file);
console.log(JSON.stringify({reportLines:report.split('\n').length, referencedFiles:paths.size, errors, changedSinceSnapshot}, null, 2));
if(errors.length) process.exitCode = 1;
