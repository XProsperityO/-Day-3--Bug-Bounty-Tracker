// Wrap common vitest globals to surface and log errors thrown during registration/execution
try {
  globalThis.__wrap_logged = true;
} catch (e) {}

function safeWrap(fn) {
  return function (nameOrFn, maybeFn) {
    try {
      if (typeof nameOrFn === 'function') {
        return fn.call(this, async () => {
          try { return await nameOrFn(); } catch (err) { console.error('[wrap-hooks] wrapped error:', err && (err.stack || String(err))); throw err; }
        });
      }
      if (typeof maybeFn === 'function') {
        return fn.call(this, nameOrFn, async () => {
          try { return await maybeFn(); } catch (err) { console.error('[wrap-hooks] wrapped error:', err && (err.stack || String(err))); throw err; }
        });
      }
      return fn.apply(this, arguments);
    } catch (err) {
      console.error('[wrap-hooks] registration error:', err && (err.stack || String(err)));
      throw err;
    }
  };
}

// Only apply wrappers if globals exist; vitest will populate them before tests run, but when required early they may be undefined.
const globals = ['beforeAll','afterAll','beforeEach','afterEach','it','test','describe'];
for (const g of globals) {
  try {
    if (typeof globalThis[g] === 'function') {
      globalThis[g] = safeWrap(globalThis[g]);
    } else {
      // define a placeholder that will wrap later when vitest sets the global
      Object.defineProperty(globalThis, `__wrap_${g}`, {
        configurable: true,
        enumerable: false,
        writable: true,
        value: function (orig) {
          globalThis[g] = safeWrap(orig);
          return globalThis[g];
        }
      });
    }
  } catch (e) {
    // ignore
  }
}

// If vitest later sets globals, try to wrap them on next tick
setImmediate(() => {
  for (const g of globals) {
    try {
      if (typeof globalThis[g] === 'function') {
        globalThis[g] = safeWrap(globalThis[g]);
      } else if (typeof globalThis[`__wrap_${g}`] === 'function') {
        // no-op
      }
    } catch (e) {}
  }
});
