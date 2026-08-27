# Select My Venue database migrations

Run `20260826_final_security_and_public_venues.sql` in the Supabase SQL Editor
after deploying the matching website, Master CRM and Partner CRM releases.

The migration is idempotent and performs four production-critical tasks:

1. prevents venue-partner accounts from reading the full customer CRM table;
2. exposes a restricted, ownership-checked Partner CRM assignment RPC;
3. backfills and maintains partner activity summary timestamps; and
4. exposes only approved and verified venue fields to the public directory.

Do not publish the Partner CRM release as final until this migration has run.

The assignment-protection trigger permits trusted SQL Editor/service-role
maintenance where `auth.uid()` is null, while continuing to enforce venue
ownership and protected-field checks for every authenticated partner user.

## Growth & Insights

After the security migration above, run
`20260827_stage8_notifications_analytics_plans.sql`.

The Growth & Insights migration is also idempotent. It adds:

1. a separate `public_listing_enabled` control, so approved test/private venues
   can remain hidden from the website;
2. the Launch Trial, Partner, Growth and Premium plan catalogue and venue-level
   plan controls;
3. automatic Partner CRM notifications whenever staff creates a new venue
   assignment;
4. ownership-checked notification read functions; and
5. secure Partner and Master CRM analytics functions.

New and existing venues default to `public_listing_enabled = false`. Publishing
a venue therefore always remains a deliberate Master CRM action.
