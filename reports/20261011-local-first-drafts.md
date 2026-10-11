# HR local-first forms and navigation

Implements Master's 14:15, 14:20 local-first/overlap and 14:25 business-field draft instructions after the separately published readiness release.

The main request form stages its actual hr_time_off creation fields at the future document path in runtime Room Draft on every change. Incomplete dates and unvalidated notes stay local; only explicit Send Request or Assign Time Off validates and queues the exact draft revision. Runtime Presentation State holds only the active draft path for each Room/employee. It contains no copied form content, credentials, new schema type or buffer document.

Reopening restores business fields. A serialized CAS loop reads the latest shared draft, merges this input's changed fields, reapplies latest same-browser typing after stale answers, and redraws other tabs from observed Room Drafts. Disjoint changes are preserved. Provider-returned conflicts remain intact for normal Save conflict handling. Typing has no network call, navigation prompt, or automatic Save. Pending local writes survive form unmount.

Employee switching is immediate. Refine's unsaved-changes notifier is disabled only alongside durable form staging. The main gate observes the complete typed Room data once; donor lists, counts, detail views and local pagination render synchronously from that validated snapshot. Refine read queries are disabled whenever this snapshot is present, eliminating route loading states. All app pages were already eagerly imported into the initial bundle.

Local tests cover local typing without Save, reload hydration, typing followed by immediate navigation, cross-tab redraw and overlap/disjoint edits, explicit Save revision selection, provider-returned preservation, and synchronous observed-data list/detail rendering. Existing interrupted-save and exact-base provider tests remain in the full suite. Source, release and licence checks are required on the final exact commit before publication. Hosted browser acceptance is still pending the House activation fix and parent recheck.
