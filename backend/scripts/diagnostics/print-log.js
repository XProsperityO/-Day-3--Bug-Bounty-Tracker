const fs = require('fs');
const p = './test-output.log';
if (!fs.existsSync(p)) { console.error('no log'); process.exit(2); }
const s = fs.readFileSync(p, 'utf8');
console.log(s);
