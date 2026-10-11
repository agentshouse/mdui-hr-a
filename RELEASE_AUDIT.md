# HR release asset and license audit

This is a local static release audit. It does not establish browser acceptance,
runtime network interception, hosted publication, or end-to-end House behavior.

## Reproduce

From this directory, with the lockfile-pinned packages installed:

```sh
node scripts/check-release.mjs --self-test
npx vitest run tests/release-transform.test.ts tests/external-features-transform.test.ts tests/release-audit.test.ts
node scripts/prepare-release.mjs
npm run build
node scripts/check-release.mjs > reports/release-audit.json
node scripts/generate-notices.mjs --check
```

Preparation copies authoritative root `app.json` and `schema.yaml` into `public`
and generates full dependency notices. Vite packages those in `dist`. The report
includes file/byte counts, each distributed file's SHA-256, resolved local asset
references, checked source files and hashes, lockfile/build-transform hashes, and
licensing gaps. Generated reports are snapshots and must be refreshed after edits.

## Enforced checks

- Root `index.html` entry and byte-identical root manifests.
- At most 2,000 regular release files and 20 MiB total; no symlinks, source maps,
  TypeScript source files, service-worker files, or escaping asset references.
- Every emitted HTML/SVG, JavaScript, and CSS file is inspected. Module imports,
  static dynamic imports, local resource literals, stylesheet imports, CSS URLs,
  fonts, workers, and Vite preload references must resolve within the release.
- Embedded SVG is decoded and scanned; active SVG/event markup, embedded outside-
  capable documents, form actions, and meta refresh redirects are rejected.
- The reachable first-party source import graph is inspected for donor API/service
  dependencies, browser network APIs, external URLs, arbitrary dynamic imports,
  and unreviewed dynamic asset sinks, including Material UI's `image` prop.
- Direct and computed networking APIs, external navigation, image/audio network
  constructors, location assignments, and unverified document writes are rejected.
- Bundled fonts must be referenced locally. Inter is bundled from Fontsource;
  Google Fonts and remote donor assets are absent.
- The sole permitted browser `fetch` is the exact SHA-256-reviewed Vite 8.3.2 module
  preload polyfill. Its local modulepreload links are independently checked.
  A modified body or extra request fails. No arbitrary network target is allowed.
- Inert SVG/XML namespaces, license/schema documentation, React/MUI diagnostic
  URLs, and bounded React Router URL parsing bases are distinguished from loaded
  assets. These string classifications do not allow fetching those destinations:
  an otherwise harmless URL in a resource-loading sink still fails.

These are conservative AST/asset-closure checks, not a formal proof of arbitrary
JavaScript data flow. The self-tests exercise positive/negative cases for direct,
aliased and computed network APIs, concatenated property names, template URLs,
dynamic resources, embedded SVG, styles/scripts/fonts, traversal, and the exact
preload exception. No browser or runtime request interception is claimed.

## Reviewed framework adaptations

React Router 7.18.2's unused framework `loadRouteModule` helper can import arbitrary
remote route modules. HR uses explicit local hash routes, not its SSR/framework
manifest. `scripts/strip-framework-loader.ts` replaces only the exact reviewed
function with an unsupported-operation error. The package version, AST-node hash,
and single-match count must all match or the build fails.

Refine is configured with its documented `disableTelemetry: true` option. Its
otherwise dormant telemetry component is also removed narrowly at build time to
avoid retaining the external Image/fetch sink in the shipped artifact. The
transform is version/hash/match-count guarded and tested against source drift.
All source outside the reviewed AST node is preserved. Dependency upgrades require
source review and new checksums, never a broad endpoint allowlist. House bridge
and Runtime source are not transformed.

## Licensing and provenance

The donor is `refinedev/refine`, `examples/refine-hr-ce`, pinned at
`2352eb5b6539e2f39ad9aef652279ad1dcf2c467`. Its verbatim MIT grant is checked against
SHA-256 `ae616936d77df09838b97cb6d4a41921bcd47b676fe9ce623a5ee4cdbb1db91f`
and copied into the release as `LICENSE.txt` and in `THIRD_PARTY_NOTICES.txt`.

The commercial `@mui/x-date-pickers-pro` component is replaced by the community
`DateCalendar`, preserving donor layout/styling. Pro packages and license-check
code are not treated as MIT by association with the example.

Notices cover the entire installed production dependency closure, a superset of
bundled modules. Full license, notice, copyright and copying files are preserved.
Missing grants fail preparation with no platform-package exemption. The current
`@agentshouse/app-bridge@0.1.0-ce524f6608238` declares MIT and ships its original
LICENSE, now preserved verbatim. This closes the old installed-package gap; it
is not a blanket legal-clearance claim or a platform issue status change.

The exact upstream `@cfworker/json-schema` MIT license text supplements that
package's omitted root notice, pinned by package version, source commit URL and
checksum in the generator. Inter's original SIL Open Font License is preserved
both in the combined notices and a separate notice. No new license permissions
are invented; this audit is not a legal opinion.

Dependency compatibility: donor ranges for Refine core 5.2.0 and MUI adapter 8.0.3
were unavailable in the registry during preparation. The port explicitly pins
available same-major versions 5.0.12 and 8.0.2. The lockfile and release report
record the actual graph; notices are generated from those installed packages.

### Additional retained optional dependency code

The strict scan also found dormant optional paths in dependencies retained by
Refine's module graph. `strip-external-features.ts` guards and disables only these
exact reviewed functions, preserving every other byte and all original notices:

- PapaParse 5.7.0: `NetworkStreamer` (remote XHR downloads) and `newWorker`
  (generated CSV worker scripts) become explicit unsupported-operation errors.
  Vite resolves PapaParse's own published unminified main entry instead of its
  browser-minified copy so the reviewed AST is legible. Local parsing/unparsing
  code is unchanged. HR exposes no CSV download/import workflow.
- MUI Material 6.5.0: `Avatar`'s `useLoaded` returns its existing error/fallback
  state, so avatars always use initials or their fallback instead of image URLs.
  Avatar layout and fallback rendering remain intact. No avatar image sink is
  allowed as a side effect of otherwise permitted inert diagnostic strings.
- React Router 7.18.2: `RSCErrorHandler` rejects server-component redirect digests,
  while returning normal children unchanged. HR is a local hash-routed client
  app without RSC/server redirects. This removes both location assignment and
  dynamically constructed meta-refresh output.

Every feature has tests for exact replacement/surrounding-source preservation,
version drift, source drift, missing match, and duplicate matches. The literal
react-markdown changelog URL is classified as inert diagnostic text; resources
and browser requests using that URL remain prohibited by independent sink checks.

### Donor commercial component and behavior difference

Registry metadata for exact donor-range baseline `@mui/x-date-pickers-pro@7.23.3`
is saved in `reports/donor-pro-license-metadata.json`. It declares `SEE LICENSE IN
LICENSE`. The package-specific upstream grant at
<https://github.com/mui/mui-x/blob/v7.23.3/packages/x-date-pickers-pro/LICENSE>
is retained as evidence in `reports/donor-pro-LICENSE.txt` and explicitly states
Commercial License and EULA/purchase or eligible trial requirements. These report
files are evidence only; the Pro package is absent from the production closure.

The community DateCalendar replacement provides start/end selection in the
retained donor-styled layout. It does not reproduce the Pro component's integrated
single-range/drag selection interaction; functional or visual equivalence to the
commercial component is not claimed.

### Dependency peer-warning caveat

The direct unused MUI Lab dependency was removed. However @refinedev/mui 8.0.2
still brings its own MUI Lab prerelease and notistack 2.0.8 dependency. npm reports
peer-range warnings (notistack expects MUI 5; the port uses MUI 6 and React 19).
`reports/peer-dependencies.json` records that actual nested graph. Type checks,
unit tests and static build checks do not settle browser compatibility; final
browser acceptance must cover the retained layout, menus, forms and notifications.
This report does not describe those peer warnings as resolved.

### Supplemental notices

In addition to cfworker's original MIT text, exact supplemental upstream texts
are retained for remark-parse 9.0.0 (its release tag) and inline-style-parser 0.1.1
(the reworkcss/css 2.2.4 grant explicitly linked by the installed README).
@mui/x-virtualizer 0.4.2 declares MIT but omits the notice. MUI's own fix
<https://github.com/mui/mui-x/pull/22164>, merged as
`a20b5b659300b6b5ebadd3555796ba76a521a8b6`, explicitly adds the package-specific MIT
grant and closes the missing-license issue. That exact file is included. All
source URLs and SHA-256 checks are in `scripts/generate-notices.mjs` and the report.

Toolchain floor caveat: the available executor is Node 24.19.0, while the pinned
@agentshouse/mdruntime package declares Node >=24.21.0. npm reports EBADENGINE.
Successful local tests/builds are evidence for this executor, not a claim that the
runtime publisher's supported Node floor has been met.
