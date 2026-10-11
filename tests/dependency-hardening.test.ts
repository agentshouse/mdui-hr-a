import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { expect, it } from 'vitest';

it('uses reviewed React Router 7.18.2 throughout the installed Refine consumer graph', () => {
  const root = path.resolve(import.meta.dirname, '..');
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  expect(lock.packages[''].dependencies['react-router']).toBe('7.18.2');
  for (const [name, entry] of Object.entries(lock.packages) as [string, { version: string }][]) {
    if (/node_modules\/react-router(?:-dom)?$/.test(name)) expect(entry.version).toBe('7.18.2');
  }
  const fromConsumer = createRequire(path.join(root, 'node_modules/@refinedev/react-router/package.json'));
  expect(fromConsumer('react-router/package.json').version).toBe('7.18.2');
  expect(JSON.parse(fs.readFileSync(path.join(root, 'node_modules/react-router/package.json'), 'utf8')).version).toBe('7.18.2');
});
