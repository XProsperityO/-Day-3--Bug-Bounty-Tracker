const fs = require('fs');
const p = process.argv[2] || './test-output.log';
if (!fs.existsSync(p)) { console.error('no log at', p); process.exit(2); }
const s = fs.readFileSync(p, 'utf8');
console.log(s);
