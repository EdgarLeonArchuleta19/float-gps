import { spawnSync } from 'node:child_process';

const builds = [
  { target: 'client', outputDir: 'dist' },
  { target: 'console', outputDir: 'dist-console' },
];

for (const { target, outputDir } of builds) {
  console.log(`
> Build web ${target} -> ${outputDir}`);
  const result = spawnSync('npx', ['expo', 'export', '-p', 'web', '--output-dir', outputDir, '--clear'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, FLOA_WEB_TARGET: target },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
