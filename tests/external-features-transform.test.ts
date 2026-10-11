import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { findReviewedFeature, reviewedTransforms, stripExternalFeature, type ReviewedTransform } from '../scripts/strip-external-features';

for (const kind of Object.keys(reviewedTransforms) as ReviewedTransform[]) {
  const review = reviewedTransforms[kind];
  const filename = path.resolve(import.meta.dirname, '..', review.file);
  const original = fs.readFileSync(filename, 'utf8');
  const parsed = ts.createSourceFile(filename, original, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const target = findReviewedFeature(kind, parsed)[0];
  describe(`reviewed ${kind} removal`, () => {
    it('preserves every byte outside the exact reviewed component', () => {
      const changed = stripExternalFeature(kind, original, filename, review.version);
      expect(changed).toBe(original.slice(0, target.getStart(parsed)) + review.replacement + original.slice(target.end));
      expect(review.replacement).not.toMatch(/new Image|XMLHttpRequest|new Worker|location\.href|fetch\(/);
      if (kind === 'avatarImage') expect(review.replacement).toContain('return "error"');
      if (kind === 'telemetry') expect(review.replacement).toBe('Telemetry = () => null');
    });
    it('fails closed on dependency version drift', () => {
      expect(() => stripExternalFeature(kind, original, filename, '0.0.0')).toThrow(/version/);
    });
    it('fails closed on reviewed source drift', () => {
      const mutation = original.slice(0, target.getStart(parsed)) + target.getText(parsed).replace('{', '{ /* changed */') + original.slice(target.end);
      expect(() => stripExternalFeature(kind, mutation, filename, review.version)).toThrow(/source changed/);
    });
    it('fails closed on missing and duplicate features', () => {
      expect(() => stripExternalFeature(kind, '', filename, review.version)).toThrow(/exactly one/);
      expect(() => stripExternalFeature(kind, original + '\n' + (review.declaration === 'variable' ? 'var ' : '') + target.getText(parsed) + ';', filename, review.version)).toThrow(/exactly one/);
    });
  });
}
