# HR · House port

Current demo data (2026-10-11): exactly 24 licensed Bitrock Center records remain. The 23 unchanged legacy synthetic documents were removed after explicit owner confirmation, using exact revision guards. Every remaining donor document was fully reread and matched its source; see `reports/donor-demo/room-verification.json`. Earlier retained/combined counts below are historical.

Current bridge migration: Master’s 2026-10-11 live go has been applied locally. The port pins the published MIT bridge `0.1.0-ce524f6608238` and uses the exact host-provided client from `connectHouseBridge().runtime`. Runtime imports/construction are removed. Earlier dated check counts and old bridge-gap findings below are historical; see the current migration result at the end. Publication still waits for Tasks and the remote schema replacement fix.

Local ordinary House App, preserving the MUI interface from [Refine HR Community](https://github.com/refinedev/refine/tree/2352eb5b6539e2f39ad9aef652279ad1dcf2c467/examples/refine-hr-ce), pinned at `2352eb5b6539e2f39ad9aef652279ad1dcf2c467`. The original MIT notice is retained verbatim.

## Interface

The donor's teal and indigo themes, sidebar, employee selector, time-off cards and lists, request list/modal, leave form and responsive layouts remain. Room writers can select fictional employee records, request or assign leave, inspect overlaps, approve/decline pending requests and cancel requests. Selection is explicitly a workforce record, not the signed-in House identity. No login, impersonation, outside backend, developer tools, Refine branding, external avatars, remote fonts or telemetry remains. Avatars use initials; Inter font files are bundled.

The donor declared `@mui/x-date-pickers-pro:^7.23.3`. Its separately commercial-licensed `DateRangeCalendar` is replaced with two community `DateCalendar` controls in the original bordered panel. This retains start/end selection, minimum-end constraints and range shading; it is not equivalent to Pro's single range interaction, drag selection or hover preview. No Pro grant or key is invented. Exact evidence and dependency notices are in `RELEASE_AUDIT.md` and `public/licenses`.

The form stores date-only strings and inclusive calendar-day durations, matching the donor's day-count semantics. Usage is counted within the displayed calendar year; annual remaining days are the employee allowance minus approved annual days. Synthetic allowance is not payroll, legal entitlement or medical information. No employee self-service authorization is inferred: current House member identity is not documented (core#3329); Room access governs this pass.

## Room model and persistence

`src/house.ts` is the sole House boundary. It pins `@agentshouse/app-bridge@0.1.0-ce524f6608238` and awaits the host-provided `bridge.runtime`, without a direct Runtime import or dependency.

Root `app.json` declares writable `hr` Room slot with `hr_team`, `hr_employee` and `hr_time_off`; `schema.yaml` defines typed fields. Each entity is one document. No local content fallback or runtime automatic seeding exists. Date ranges, statuses, unique IDs, foreign keys and all writable fields are validated. Request employee joins are resolved within the selected Room. Sorting, filtering, pagination and infinite-list reads are supported.

Every edit/delete carries its exact opened snapshot. Full-form updates compute the actual changed-field delta against that snapshot and validate it over current data, preserving unrelated concurrent changes. Same-field edits retain exact opened bases. Existing/conflicting drafts are kept. A queued response returns effective fields and a corresponding snapshot without pretending to know a synchronized Markdown revision; deletion requires reopening. Creation and changes are labelled queued; live sync, offline, queue states, returned drafts, write halt, storage loss, reset and refusal are displayed separately. Room switching gets a confirmation and a fresh query cache.

The original 23-record synthetic Room seed is historical and superseded for new seeding. `scripts/seed-data.mjs` now adapts a pinned MIT-licensed Bitrock Center mock fixture: 4 explicitly labelled role groups, all 5 source employees and all 15 linked leave requests. Source hashes, license, exact mappings and limitations are in [`fixtures/hr-demo/README.md`](fixtures/hr-demo/README.md) and its `provenance.json`. Refine’s checked-in donor has only six login profiles, with no complete HR seed; no relationship between unrelated sources is invented. The new fixture fits the unchanged schema. `node scripts/seed-data.mjs --room <verified-handle> --documents-only` prints proposed document creates only; it never writes them. The new document IDs and relationships use a donor- namespace. Additive population preserves the historical 23 records and any user edits; until separately archived or isolated, those legacy records remain visible and the combined Room is not exclusively source-derived. Independent readback is needed before considering the new demo populated.

## Build and checks

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run release:check`
- `node scripts/check-release.mjs --self-test`
- `node scripts/generate-notices.mjs --check`

The donor's declared core 5.2.0 and MUI adapter 8.0.3 were absent from the official registry during preparation. The port pins available compatible-major `@refinedev/core:5.0.12` and `@refinedev/mui:8.0.2`; full local compatibility checks are required. The lockfile records all actual versions. Installation warns about legacy transitive MUI Lab/notistack React/MUI peers and the known harmless House Node engine mismatch; neither warning is a hosted acceptance claim.

Final local checks pass: TypeScript, ESLint, 110 tests across 8 files, Vite build, strict release/asset audit, scanner self-tests and notice freshness. Artifact: 21 files / 1,699,760 bytes (1.621 MiB), 8 font files, 59 reachable production source files and 233 dependency notices. See `reports/verification-summary.json`. The non-failing large-chunk advisory remains.

`dist/` is the complete release, including root app/schema files, bundled assets and full license notices. See reports and `RELEASE_AUDIT.md` for exact checks, guarded dormant-feature transformations, file hashes and known licensing gap.

## Remaining gates

No App has been allocated, published, bound or pushed. There is no release branch and no browser ownership or browser acceptance. Desktop and 360px appearance, actual navigation, CRUD/reload, sync/conflict and hosted Runtime behavior still need the permitted live route. Unit/static checks are not the full upstream donor test suite.

The current House bridge’s original published MIT grant is bundled. The direct-Runtime migration is applied locally under Master’s live go. App publication still follows Tasks and the unresolved remote schema replacement defect.

## Local dependency hardening (2026-10-11)

React Router and the Refine consumer resolve exact 7.18.2. No react-router-dom copy is installed. The two upstream advisories are [external redirect hardening](https://github.com/remix-run/react-router/security/advisories/GHSA-wrjc-x8rr-h8h6) and [unstable RSC CSRF hardening](https://github.com/remix-run/react-router/security/advisories/GHSA-qwww-vcr4-c8h2). Local paths remain fixed/ID-validated and no RSC server is enabled; no exploit in this port was established. The exact loader AST is unchanged. The changed RSC handler was inspected, and its existing refusal remains with a newly reviewed exact version/module/hash. All drift/match-count guards and static network checks remain enforced. `reports/router-hardening-review.json` preserves the before/after review. Typecheck, lint, all 110 tests, build, release/source/network audits, scanner fixtures and notice freshness pass. Original licenses and the known bridge gate are preserved. No registry audit, graph upload, remote write or publication occurred.

## JSON Schema migration (2026-10-11)

All 3 types now use the Master-announced top-level JSON Schema properties and required lists, preserving every prior field and enum. Exact IDs/date strings/serialized values retain exact-match classification through unconstrained patterns; human-readable prose stays plain string. The development validator is pinned to @agentshouse/mdmodel 0.1.0-c68e2039f1ca8 independently of unchanged production runtime packages.

Typecheck, lint, 111 tests (including all 23 original fictional seed records), build and release audit pass. Existing conflict handling and queued outcomes are unchanged. Original seed/readback evidence was retained. Remote replacement is pending Porting issues/tasks-schema-replacement.md, the platform schema self-validation refusal; no migration write was attempted here. reports/schema-migration holds the current schema/base and prepared guarded replacement. Re-read before applying after Master resolves that issue. No App allocation or publication occurred, and browser/hosted acceptance remains unrun.

## Current bridge Runtime migration (2026-10-11)

Applied Master’s `20261011T0440Z-master-live-go.md` locally. The only application House dependency is exact `@agentshouse/app-bridge@0.1.0-ce524f6608238`. `src/house.ts` derives its client type from `connectHouseBridge()` and returns `bridge.runtime` unchanged. The existing retry-on-rejection and cached connection remain. No Runtime protocol or client is imported, constructed or copied into application source. The bridge still lists Runtime/model packages transitively for its declarations, so the conservative installed-production-closure notices include their original licenses.

The official package test host now checks missing-host failure, rejected-client failure, retry, deferred delivery, exact client identity, connection reuse and the tab title. All existing concurrency, exact bases, refused/queued save, editor and attachment tests are retained. Current results: typecheck, lint, 113 tests, build, static release/network checks and license checks pass. Release: 21 files / 1,696,589 bytes, 8 local font files. Full check results and immutable release hashes are under `reports/runtime-migration/`.

The newly installed bridge actually declares MIT and includes its own original LICENSE; that text is now distributed verbatim. The old installed bridge gap is closed locally, and license completeness reports no unresolved gap. Original donor, font and supplemental notices remain. Historical gap statements above describe earlier package versions and checks. This does not change a platform issue’s status or establish blanket legal clearance.

No remote schema or document write, App allocation, binding, release branch, push, browser or hosted acceptance was performed. Publication remains in Tasks-first order, with the schema replacement defect pending the platform fix. Existing identity and fidelity limitations are unchanged.

## Reused demo fixture (2026-10-11)

The source-only adapter checks vendored original bytes and parses selected literals without executing the upstream module. TypeScript is pinned by the existing lockfile to 5.8.3; the donor relative clock is frozen to October 2026. Existing initials remain, and no external runtime calls or new dependencies were added. The standalone dataset MIT notice and provenance are included under `public/licenses`. The fixture preserves the source’s 12 Approved, 2 Pending and 1 Rejected requests across all three leave types. Source-only checks do not establish Room population, hosted persistence, or browser acceptance.
