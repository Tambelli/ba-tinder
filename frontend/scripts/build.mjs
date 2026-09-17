// Compatibility entry point for older local build instructions.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
for (const [script, args] of [['typescript/bin/tsc', ['--noEmit']], ['vite/bin/vite.js', ['build']]]) {
  const result = spawnSync(process.execPath, [`${root}/node_modules/${script}`, ...args], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
