import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { expect, it } from 'vitest';

it('passes the release scanner positive and negative security fixtures', () => {
  const result = JSON.parse(execFileSync(process.execPath,
    [path.resolve(import.meta.dirname, '../scripts/check-release.mjs'), '--self-test'],
    { encoding: 'utf8' }));
  expect(result.result).toBe('passed');
});
