// Small runner that deploys migrations unless PRISMA_MOCK=1, then runs vitest for integration tests.
const { spawnSync } = require('child_process');
const path = require('path');

const useMock = process.env.PRISMA_MOCK === '1' || process.argv.includes('--mock');
const cwd = process.cwd();

function run(cmd, args, opts = {}) {
  console.log('RUN:', cmd, args.join(' '));
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true, cwd, ...opts });
  if (r.status !== 0) process.exit(r.status);
}

if (!useMock) {
  run('npx', ['prisma', 'migrate', 'deploy']);
}

process.env.NODE_ENV = 'test';
run('node', ['-r', './scripts/use-test-db.cjs', './node_modules/vitest/vitest.mjs', 'run', '--dir', 'test/integration']);
