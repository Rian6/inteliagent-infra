import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const canonical = readFileSync(new URL('../data/planning-catalog.json', import.meta.url), 'utf8');
for (const file of [
  '../inteliagent-app/src/data/planning-catalog.json',
  '../inteliagent-webapp/src/data/planning-catalog.json',
  '../inteliagent-main-server/src/main/resources/catalogos/planning-catalog.json',
  '../inteliagent-load-server/src/main/resources/catalogos/planning-catalog.json',
]) assert.equal(readFileSync(new URL(file, import.meta.url), 'utf8'), canonical, file);
console.log('Canonical planning catalog matches all four services.');
