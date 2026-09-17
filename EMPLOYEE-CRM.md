# Employee CRM

Employee login: `/employee/`. Administrator controls: `/employees.html`, linked from the master CRM header.

Admins create an employee with name, email and an initial password (12–128 characters). No invitation email is sent. Share credentials privately; employees may change their password after signing in. Deactivation immediately removes database access, including from existing sessions. Reactivation restores access. Admin reset changes the password; deactivate first if an account is suspected of compromise.

Employees use the existing `agent` role and can read all leads. Saving uses `smv_employee_save_lead`, which validates an explicit field allowlist, locks the row, checks its previous `updated_at`, records the caller and changes, and optionally records a call attempt. Employees have no direct lead INSERT/UPDATE/DELETE policy, and cannot assign leads, change sources or edit admin notes. Roles cannot be set from a browser. Venue and partner administration uses the existing master helper, now restricted to active `admin` profiles. Partner invitation Edge Function independently checks `role = admin`.

The master CRM and employee workspace subscribe to lead changes. The master table defers refresh while its edit modal is open to avoid replacing unsaved input. A 30-second fallback refresh recovers missed updates. Employee follow-up inputs use India time. Both employee save and master modal/inline edits check the prior version. Employee activity is available under Employees in the master CRM.

## Deployment

1. Apply `supabase/migrations/20260917154446_employee_crm_permissions.sql` once. Existing historical SQL files predate the migration directory and are not intended as a fresh database bootstrap.
2. Deploy `manage-employees` with JWT verification and the updated `hyper-service` partner invitation function.
3. Publish this static repository via its existing GitHub Pages deployment.

Do not rerun the older security SQL after this migration; it replaces policies.

## Verification

`supabase/tests/employee_permissions.sql` exercises active/inactive employee, admin, anonymous website submission and partner isolation. Run in a transaction and roll back when used independently. Fixtures are also removed in the script. The deployment transaction ran these assertions before commit.

Run the UI DOM check with Node and jsdom 26: `node tests/employee-ui.cjs`. It verifies rendering, escaped customer text, India-time conversion, allowed save fields and the concurrency version.

The live service checks cover employee creation/login, role restrictions, saves, server audit attribution, realtime delivery, stale saves, deletion denial, deactivation and password reset. Temporary validation users/leads must be removed after these checks.

No customer data or credentials are stored in this repository. Public Supabase publishable keys are browser configuration; service keys stay in Edge Function secrets.
