import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import type { Plugin } from 'vite';

export const reviewedTransforms = {
  telemetry: {
    package: '@refinedev/core', version: '5.0.12',
    file: 'node_modules/@refinedev/core/dist/index.mjs',
    sha256: '4c0da7315b346bb24d8808fe3901520dd8a34b9d62ae9aabddf7ca471c63b55a',
    nodeName: 'Telemetry', declaration: 'variable', replacement: 'Telemetry = () => null',
  },
  csvDownload: {
    package: 'papaparse', version: '5.7.0',
    file: 'node_modules/papaparse/papaparse.js',
    sha256: 'db25d22cb630cb79a7bccce73b2e36f3209ab17866ea7da9c23a73faac474163',
    nodeName: 'NetworkStreamer', declaration: 'function',
    replacement: 'function NetworkStreamer() { throw new Error("HR does not support external CSV downloads."); }',
  },
  csvWorker: {
    package: 'papaparse', version: '5.7.0',
    file: 'node_modules/papaparse/papaparse.js',
    sha256: '8ebec2ec4430d21ef19943d3397bac024cd918a6093a28d55fc85bf7e3635f58',
    nodeName: 'newWorker', declaration: 'function',
    replacement: 'function newWorker() { throw new Error("HR does not support CSV worker script creation."); }',
  },
  avatarImage: {
    package: '@mui/material', version: '6.5.0',
    file: 'node_modules/@mui/material/Avatar/Avatar.js',
    sha256: 'fc3a73016728d556398c2ec737fed55d8b613f0d8cfd39b9ef7f6bc46fb790a7',
    nodeName: 'useLoaded', declaration: 'function',
    replacement: 'function useLoaded() { return "error"; }',
  },
  serverRedirect: {
    package: 'react-router', version: '7.18.2',
    file: 'node_modules/react-router/dist/development/chunk-62JRHF6Z.mjs',
    sha256: '00014b781d9e49ba065a4d1f8e0748c4837d66c24bb2b93a78dc614ed933b3d6',
    nodeName: 'RSCErrorHandler', declaration: 'function',
    replacement: 'function RSCErrorHandler({ children, error }) { if (error && typeof error === "object" && "digest" in error) throw new Error("HR does not support server-component redirects."); return children; }',
  },
} as const;
export type ReviewedTransform = keyof typeof reviewedTransforms;

export function findReviewedFeature(kind: ReviewedTransform, parsed: ts.SourceFile): ts.Node[] {
  const matches: ts.Node[] = [];
  function visit(node: ts.Node) {
    const review = reviewedTransforms[kind];
    if (review.declaration === 'variable' && ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === review.nodeName)
      matches.push(node);
    if (review.declaration === 'function' && ts.isFunctionDeclaration(node) && node.name?.text === review.nodeName)
      matches.push(node);
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  return matches;
}

/** Disable only the reviewed unused optional feature; preserve all other source. */
export function stripExternalFeature(kind: ReviewedTransform, code: string, filename: string, version: string): string {
  const review = reviewedTransforms[kind];
  assert.equal(version, review.version, `Review ${review.package} version before building HR`);
  const parsed = ts.createSourceFile(filename, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const matches = findReviewedFeature(kind, parsed);
  assert.equal(matches.length, 1, `Expected exactly one reviewed ${kind} feature`);
  const node = matches[0];
  assert.equal(createHash('sha256').update(node.getText(parsed)).digest('hex'), review.sha256,
    `${review.package} ${kind} source changed; inspect before building`);
  // Every replacement disables an unused outside-capable feature. Normal HR
  // routes, initials avatars, data operations and local parsing remain intact.
  return code.slice(0, node.getStart(parsed)) + review.replacement + code.slice(node.end);
}

export function stripUnusedExternalFeatures(): Plugin {
  const root = path.resolve(import.meta.dirname, '..');
  const counts = new Map<ReviewedTransform, number>();
  const versions = new Map<ReviewedTransform, string>();
  const kinds = Object.keys(reviewedTransforms) as ReviewedTransform[];
  return {
    name: 'hr-strip-reviewed-external-features', apply: 'build', enforce: 'pre',
    buildStart() {
      counts.clear(); versions.clear();
      for (const kind of kinds) {
        const review = reviewedTransforms[kind];
        const version = JSON.parse(fs.readFileSync(path.join(root, 'node_modules', review.package, 'package.json'), 'utf8')).version;
        assert.equal(version, review.version, `Review ${review.package} version before building HR`);
        versions.set(kind, version);
      }
    },
    transform(code, id) {
      const normalized = id.split('?')[0];
      const matches = kinds.filter(key => normalized === path.join(root, reviewedTransforms[key].file));
      if (!matches.length) return null;
      let output = code;
      for (const kind of matches) {
        const count = (counts.get(kind) ?? 0) + 1;
        counts.set(kind, count);
        assert.equal(count, 1, `${kind} appeared in more than one transformed module`);
        output = stripExternalFeature(kind, output, id, versions.get(kind)!);
      }
      return { code: output, map: null };
    },
    buildEnd(error) {
      if (!error) for (const kind of kinds) assert.equal(counts.get(kind), 1, `Reviewed ${kind} feature was not transformed`);
    },
  };
}
