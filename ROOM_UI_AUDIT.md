# Master 12:25 donor chrome audit

Instruction: Porting `messages/20261011T1225Z-master-crm-room-label.md`, 2026-10-11. Donor `refinedev/refine` at `2352eb5b6539e2f39ad9aef652279ad1dcf2c467`, `examples/refine-hr-ce/src/App.tsx` and its layout, has no generic Room/sync/queue strip. Removed that added header and Room-switch dialog. Employee business selection and unsaved-form confirmation remain.

Only a sole host-supplied Room is selected; multiple bindings show a configuration error and no employee app, rather than choosing the first. Errors/refusals, returned drafts, reset, storage-loss and write-halt warnings remain. No schema/manifest, data, identity, provider, permission or binding changes.

Typecheck, lint, all 118 tests in 11 files, build and release:check pass. Updated DOM tests verify ambiguous-binding refusal/recovery, absent sync/Room chrome, retained warning visibility and interrupted-save isolation. Isolated worktree builds required copying the installed node_modules tree locally because security transforms match exact dependency paths; no transform, package pin or security rule was changed. Hosted browser acceptance remains separate.
