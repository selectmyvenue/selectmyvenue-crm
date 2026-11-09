# Two-partner authenticated browser test

The workflow `.github/workflows/partner-authenticated-isolation.yml` runs a read-only browser check against the Partner CRM. It does not create, update, delete or assign enquiries.

## Configure repository Actions secrets

In GitHub: repository Settings → Secrets and variables → Actions → New repository secret.

Create these secrets using the two dedicated test partner accounts and the exact venue names as displayed in the Partner CRM:

| Secret | Value |
|---|---|
| `SMV_TEST_PARTNER_A_EMAIL` | Partner A test login email |
| `SMV_TEST_PARTNER_A_PASSWORD` | Partner A test password |
| `SMV_TEST_PARTNER_A_VENUE_LABEL` | Exact name of Partner A's own venue |
| `SMV_TEST_PARTNER_B_EMAIL` | Partner B test login email |
| `SMV_TEST_PARTNER_B_PASSWORD` | Partner B test password |
| `SMV_TEST_PARTNER_B_VENUE_LABEL` | Exact name of Partner B's own venue |

Passwords must remain in GitHub Secrets and must never be committed or pasted into chat. Use dedicated test identities, not personal owner accounts.

## Run

After the workflow file is present on the branch selected in GitHub Actions, open Actions → Authenticated partner isolation smoke test → Run workflow. Select the development branch containing this workflow.

The test signs in as each partner separately, checks that its own venue is visible, and checks that the other test venue's exact label is absent from the rendered Partner CRM page. It also fails on browser JavaScript errors.

## Scope and limitations

- This is a read-only UI smoke test; it does not test availability/quote submission because that would require creating or changing a test assignment.
- A missing exact venue label may indicate the dashboard does not display that label on its initial view; inspect the run log and adjust the assertion only after verifying the UI.
- The database RLS simulation documented in `FULL_CRM_AUTHENTICATED_REGRESSION_PLAN.md` is a separate check.
- This workflow is manual and does not run on every pull request.
- No production deployment is performed by this workflow.
