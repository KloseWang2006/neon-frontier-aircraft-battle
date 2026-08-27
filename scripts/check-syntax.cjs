const { execFileSync } = require('node:child_process');
const path = require('node:path');

const sources = [
  'fighter-catalog.js',
  'game-rules.js',
  'game-storage.js',
  'run-session.js',
  'page-presentation.js',
];

for (const source of sources) {
  execFileSync(process.execPath, ['--check', path.resolve(process.cwd(), source)], {
    stdio: 'inherit',
  });
}

console.log(`Syntax check passed for ${sources.length} production JavaScript files.`);
