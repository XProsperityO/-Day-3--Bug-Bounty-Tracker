// Lightweight setup to wrap global hook registrations and log errors during registration or hook execution.
// This file is loaded by Vitest before tests; keep it minimal and safe.
import fs from 'fs';

function write(msg: string) {
  try { fs.appendFileSync('vitest-setup-debug.log', msg + '\n'); } catch (e) { /* ignore */ }
}

['beforeAll','afterAll','beforeEach','afterEach','it','describe','test'].forEach((name) => {
  // if Vitest hasn't defined globals yet, we can't wrap them safely; attempt to attach wrappers on next tick
  try {
    // @ts-ignore
    const orig = globalThis[name];
    if (typeof orig === 'function') {
      // @ts-ignore
      globalThis[name] = function(...args: any[]) {
        try {
          return orig.apply(this, args);
        } catch (err) {
          write(`${name} wrapper caught: ${err && (err.stack || String(err))}`);
          throw err;
        }
      } as any;
    }
  } catch (e) {
    write(`setup-debug: failed to wrap ${name}: ${String(e)}`);
  }
});

write('setup-debug: loaded');
