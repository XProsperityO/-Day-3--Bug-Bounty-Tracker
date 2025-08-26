const fs = require('fs');
function write(err) {
  try {
    const out = (err && (err.stack || String(err))) || 'unknown error';
    fs.writeFileSync('error-capture.log', out + '\n');
  } catch (e) {
    // ignore
  }
}
process.on('uncaughtException', (err) => {
  write(err);
  // rethrow after writing to ensure default behavior
  throw err;
});
process.on('unhandledRejection', (reason) => {
  write(reason instanceof Error ? reason : new Error(String(reason)));
});

// Also capture console.error to the same file for extra context
const origErr = console.error;
console.error = function (...args) {
  try { fs.appendFileSync('error-capture.log', args.map(a => (a && a.stack) || String(a)).join(' ') + '\n'); } catch (e) {}
  origErr.apply(console, args);
};
