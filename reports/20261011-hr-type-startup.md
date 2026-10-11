# HR full-frontmatter startup repair

Master's 20261011T1745Z first-page check reported HR a_k.v release 6 failing with `Unsupported employees field: type.`. The other six checked ports rendered. This correction changes only the HR decoder; the existing HR App, Room data, closed schema, binding, manifest, UI and dependency pins are unchanged.

The official current Runtime 0.1.0-c2647c1a232dd `rows.js` keeps the parsed complete frontmatter in `document.fields`; `read-side.js` lines 235–243 returns it unchanged for `select.fields: 'all'`. That includes the document's frontmatter `type`, also exposed as the result's outer discriminator. The old tests manually omitted it.

`validateRow` now recognizes only an exact `type === definitions[resource].type` discriminator. It does not expose it as an editable business field. The original full fields and Markdown remain in `_house` snapshots for exact-base mutation guards. A mismatching discriminator, null/undefined/number, or other undeclared business field remains an error. No schema field was added, and no unknown-field filtering was introduced.

## Native regression capture

`tests/support/native-full-fields.json` was generated using the real official current Runtime `planOf`, `rowsOf`, `createReadSide` and matching mdmodel 0.1.0-c0bdbbc92d020, over the unchanged local schema and all 24 licensed donor fixture documents from `buildSeedChanges`. No Room or live data was read or written by this capture. Fixture SHA-256: `56c0816222e5ee97771ed5190c897b04670da8030a81a5baa87b3d541a38321b`.

Before the correction, the native fixture reproduced Master's exact `Unsupported employees field: type.` error. The committed regression asserts all 4 teams, 5 employees and 15 requests load; every complete snapshot is preserved; no discriminator becomes an editable value; mismatch and undeclared-field cases refuse; and a Save from the full snapshot uses the exact business-field base without writing `type`. The House gate regression renders the native projection instead of remaining on Loading data.

Local checks: 133 tests across 15 files, typecheck, lint, build, release audit, positive/negative audit fixtures and 233-package license check all passed. The complete rebuilt release has 23 files / 1,700,168 bytes. These are local checks; actual first-page acceptance requires Master's or root's post-publication dev recheck.
