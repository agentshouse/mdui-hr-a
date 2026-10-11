# Workforce UI adaptation

Donor: `refinedev/refine` at `2352eb5b6539e2f39ad9aef652279ad1dcf2c467`, `examples/refine-hr-ce`.

The original MIT license (Refine Development Inc., 2022) is retained in `LICENSE`. Original MUI layout, theme palettes, local outline icons, cards, list panels, request modal, and time-off form structure are retained.

## Required deviations

- Removed the donor's login, identity and access-control providers, login screen, role-switching impersonation, Refine branding and devtools. All Room writers can use Time Off and Requests. The employee picker selects an explicitly labelled synthetic employee record and never claims to represent the authenticated House identity.
- Replaced MUI X Pro `DateRangeCalendar` with two MIT community `DateCalendar` controls in the existing bordered date panel. No Pro import or license key is used. Start/end constraints and inclusive range shading remain. These separate community controls do not reproduce the Pro control’s drag-selection, hover range preview, or single coordinated range-selection interaction.
- Removed remote avatar image usage and remote service constants. Employee initials render locally. Self-hosted Inter Latin font files replace externally loaded Google Fonts, with a system-font fallback.
- Used hash routing for static House hosting. Refine's data provider comes from the selected Room context.
- An explicit Action selector offers Request review (Pending by default) or Assign approved leave (Approved) to every Room writer. Creation submits explicit employee ID, status and date strings without helper form fields. Approval, decline and cancellation carry the exact opened row snapshot for conflict checks. Creation disables Refine’s automatic redirect and only navigates for a successful result in the still-mounted, unchanged employee/Room form session. Failed saves retain the draft. Request modals remain explicitly dismissible while saving, but dismissed, reopened or unmounted sessions cannot trigger delayed navigation; reopening captures a fresh snapshot even for the same request ID. After the House gate confirms an employee switch, the keyed create form resets its draft to avoid assigning a previous employee’s dates or notes to the new selection.
- Corrected the donor's sick/casual leave cards to sum inclusive days instead of counting requests. Annual availability is the seeded allowance minus approved annual days in the relevant year; annual and usage cards use the current calendar year. Corrected duplicate scroll container IDs and date-only history boundaries.

These changes introduce no new authentication or permissions model. Room access and data persistence are supplied by House.
