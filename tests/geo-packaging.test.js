'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const modules = [...server.matchAll(/require\('\.\/([^']+)'\)/g)].map(m => m[1] + '.js');
for (const script of ['deploy-azure.sh', 'install.sh']) {
  test(`packaging: ${script} ships every local server dependency`, () => {
    const source = fs.readFileSync(path.join(root, script), 'utf8');
    const copy = script === 'deploy-azure.sh'
      ? source.slice(source.indexOf('rsync -az'), source.indexOf('"$TARGET:/srv/bahlou/server/"'))
      : source.split('\n').find(line => line.trim().startsWith('cp -r '));
    assert.ok(copy, 'The source copy command must exist');
    for (const filename of modules) assert.ok(copy.includes(filename), `${script} must ship ${filename}`);
  });
}
