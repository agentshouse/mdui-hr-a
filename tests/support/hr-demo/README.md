# Reused HR demo data

This source-only fixture replaces the hand-authored 3-team/6-person/14-request
sample. It does not write a Room, change its schema, or seed the running App.

## Source selection

The UI donor, `refinedev/refine`, is pinned at
`2352eb5b6539e2f39ad9aef652279ad1dcf2c467`, example `examples/refine-hr-ce`.
Its checked-in login screen contains six profile choices, but no complete
employee records, teams, allowances or leave requests. Its provider points to
`api.hr.refine.dev`; there is no seed/generator in the example. A read-only search
of the official Refine organization found no reusable complete HR backend seed.
The exact login/constants evidence and original MIT notice are in `vendor/refine`.
No live API data or remote portrait was downloaded. The six login profiles are
not falsely attached to unrelated sample leave requests.

The fallback is the explicitly labelled mock dataset from
[Bitrock Center](https://github.com/bitrockteam/bitrock-center/blob/c23088d58a59adb07ac75ad38657abd701d1a0bf/lib/mock-data.ts),
commit `c23088d58a59adb07ac75ad38657abd701d1a0bf`, under its original
[MIT license](https://github.com/bitrockteam/bitrock-center/blob/c23088d58a59adb07ac75ad38657abd701d1a0bf/LICENSE).
Original source bytes, README and license are vendored, not remotely loaded.
The unmodified notice is distributed in `public/licenses/HR_DEMO_DATA_LICENSE.txt`.
This is a licensed fallback, not a claim of matching the Refine hosted demo data.

## Reproduce and verify

With the existing lockfile installed, run from the repository root:

```sh
node scripts/adapt-demo-data.mjs
node scripts/adapt-demo-data.mjs --check
node scripts/seed-data.mjs --room hr-port --documents-only
npm run typecheck
npm run lint
npm test
npm run build
npm run release:check
node scripts/check-release.mjs --self-test
node scripts/generate-notices.mjs --check
```

The adapter checks SHA-256 for every vendored input. A closed TypeScript 5.8.3 AST
literal interpreter reads four selected fixture initializers without executing
vendor code. No upstream dependency install, database setup, API, random seed,
network access, or wall-clock refresh is involved. The original currentYear and
zero-based currentMonth inputs are fixed to 2026 and 9 (October). Import metadata
is fixed to `2026-10-11T00:00:00.000Z`.

`records.json` is the complete mapped fixture. `provenance.json` includes input
hashes, exact source-to-target employee/request mappings and the output hash.
The data already fits unchanged `schema.yaml`; no extra fields or migration are
needed. The printing script defaults to including a schema create for a new Room;
`--documents-only` excludes it. Neither command contacts House.

## Coverage and adaptation

- 5 source users are retained, with exact names and roles. Email local-parts are
  preserved and domains changed to `example.test`.
- 4 teams are explicitly named `Role group: <source role>`. This is a schema
  grouping of the existing role field, not an invented department structure.
  Project memberships stay in provenance rather than being misrepresented as
  single-team membership.
- All 15 source leave requests are retained with exact user relationships and
  Italian reason text. 12 are Approved, 2 Pending and 1 Rejected; the three source
  types map as vacation → Annual, permission → Casual, sickness → Sick.
- 14 requests belong to the first user and one to the second; the other histories
  remain empty because the source contains no requests for those people.
- Source date relationships are preserved. Three source `days` values differ from
  inclusive calendar durations (5 versus 8, 5 versus 7, and 3 versus 6). Both
  values remain in provenance. HR continues its existing calendar-day semantics;
  no dates, statuses, extra rows or business-day rules were fabricated to change
  the result.
- The source's shared `getUserSummary()` supplies 25 total vacation days. This
  shared demo value is used for each employee, not presented as evidence of
  individual entitlements. HR recomputes remaining leave from its own approved
  calendar-day sum; it does not reproduce the separate mock summary's 15 days left.
- One source user is inactive. All five users are retained, but this HR schema has
  no active flag. The original status remains in provenance.
- Required createdAt/updatedAt fields are declared import metadata, not fabricated
  source employment/request history. No photos are needed: the existing initials
  remain. Source avatar placeholders and donor external portraits are omitted.

## Existing Room population

All 24 new records are namespaced: `donor-team-1` through `donor-team-4`,
`donor-employee-1` through `donor-employee-5`, and `donor-time-off-1` through
`donor-time-off-15`. All relationship IDs use the same namespace. The operator
must check these paths before creating them; a repeat run must read/compare
existing content and preserve user edits rather than blindly retrying creates.

The initial population retained 23 historical records. After explicit owner
confirmation, all 23 were checked against their original generated bytes and
removed using exact revision bases. The Room now contains only these 24 licensed
records. Every remaining document was fully read back after cleanup and matched
the source fixture; no edited or unrelated material was removed. See
`reports/donor-demo/room-verification.json` for the current proof and the preserved
initial-population report for the earlier 47-document checkpoint.

Historical seed/readback files elsewhere in the repository are evidence of the
old sample and must not be used for new seeding. Source-only checks do not prove
remote population, persistence, or hosted browser acceptance.
