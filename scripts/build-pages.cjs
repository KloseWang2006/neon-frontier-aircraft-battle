const { cpSync, mkdirSync, rmSync } = require('node:fs');
const { join, resolve } = require('node:path');

const root = resolve(__dirname, '..');
const output = join(root, 'dist');
const runtimeFiles = [
  'index.html',
  'fighter-catalog.js',
  'game-rules.js',
  'game-storage.js',
  'run-session.js',
  'game-audio.js',
  'page-presentation.js',
];

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

for (const file of runtimeFiles) {
  cpSync(join(root, file), join(output, file));
}

cpSync(join(root, 'assets'), join(output, 'assets'), { recursive: true });

console.log(`Cloudflare Pages 产物已生成：${runtimeFiles.length} 个运行文件和 assets/`);
