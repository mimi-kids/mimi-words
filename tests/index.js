// Entry point for `node --test tests/` (Node 22 resolves the directory to this file).
// Loads every *.test.js here so all suites run in one process.
const fs = require('node:fs');
const path = require('node:path');
for (const f of fs.readdirSync(__dirname).filter((n) => n.endsWith('.test.js')).sort()) {
  require(path.join(__dirname, f));
}
