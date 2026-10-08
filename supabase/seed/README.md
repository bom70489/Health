# Supabase setup for synthetic data

The default app runs locally without Supabase. These steps enable real email/password authentication, database persistence and server-enforced authorization in a **dedicated synthetic-data project**. No real patient records or fixed public doctor passwords are included.

## Database and functions

Install the Supabase CLI using its supported installation method, sign in, and run from the application directory:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npx supabase functions deploy assistant
npx supabase functions deploy send-reminders
```

Alternatively execute both migration files in filename order in the Dashboard SQL Editor. They create all tables, RLS/grants, immutable creator metadata, revision snapshots, exact occurrence confirmations, current-version acknowledgment, and device-bound push claims. Do not just insert `profiles`: Supabase Auth users must also exist.

`assistant` manually verifies the bearer JWT with `auth.getUser`, requires the protected patient role, ignores requested patient IDs, and queries live own records through RLS. It returns deterministic Thai answers and persists only its assistant answer. No LLM is configured. No vetted medicine knowledge is bundled; side-effect questions explicitly direct users to a doctor/pharmacist. There are no clinical mutation tools.

## Create functioning Auth accounts

Create an ignored server-only environment file `.env.server` using your own chosen test emails and strong passwords. Never use an `EXPO_PUBLIC_` name for server secrets. Required variables:

```dotenv
GAN_ALLOW_SYNTHETIC_SEED=true
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GAN_DOCTOR_EMAIL=
GAN_DOCTOR_PASSWORD=
GAN_PATIENT_A_EMAIL=
GAN_PATIENT_A_PASSWORD=
GAN_PATIENT_B_EMAIL=
GAN_PATIENT_B_PASSWORD=
# Optional unrelated doctor for negative API tests:
GAN_UNRELATED_DOCTOR_EMAIL=
GAN_UNRELATED_DOCTOR_PASSWORD=
# Public key, used by the optional live API tests:
SUPABASE_ANON_KEY=
```

Populate the empty values privately, then use Node 22+:

```powershell
node --env-file=.env.server supabase/seed/create-demo-users.mjs
```

The admin script uses Supabase Auth `createUser` with confirmed synthetic test email, creates one doctor and two patient profiles, assigns both patients to that doctor, and inserts different fictional schedules. Optional unrelated doctor receives no assignments. Roles/assignments are admin controlled; there is no patient registration/role-edit UI. Existing passwords and order edits are preserved. The script never prints passwords or keys. Use the chosen credentials to log in normally.

For manual Dashboard setup: create each Auth user first; copy its UUID into a `profiles` row with administrator SQL; add `doctor_patients` links for authorized doctor/patient UUIDs. Public signup alone does not create a doctor profile. Adding user metadata such as `{role:'doctor'}` has no authorization effect.

Set the separate app `.env` to:

```dotenv
EXPO_PUBLIC_USE_DEMO_MODE=false
EXPO_PUBLIC_SUPABASE_URL=YOUR_PROJECT_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY
EXPO_PUBLIC_ENABLE_REMOTE_PUSH=false
```

Restart Expo after changing mode. Configured Supabase errors remain visible and never silently switch to local fixtures. `.env.server` must remain ignored and must never be imported by Expo.

## Optional Android remote push

Remote push needs an EAS project, an Android development build and FCM configuration. Expo Go and a successful HTTP ticket are not proof of real-device delivery. The server dispatch infrastructure is implemented; physical-device delivery and Cron have **not been tested in this workspace**.

1. Configure Expo/EAS/FCM, a valid `EXPO_PUBLIC_EAS_PROJECT_ID`, and set `EXPO_PUBLIC_ENABLE_REMOTE_PUSH=true` only for a supported native build. Enable notifications in patient Account. The app registers an installation-scoped Expo token.
2. Create an unpredictable `REMINDER_CRON_SECRET` in the Supabase Edge secrets manager. `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provided by Supabase's hosted runtime; privileged keys remain server side. Optional `EXPO_ACCESS_TOKEN` supports Expo's enhanced push security.
3. In Dashboard Vault create `gan_functions_url` (your `/functions/v1` URL) and `gan_reminder_cron_secret` (same cron secret). Execute `supabase/schedule-reminders.sql` once. It schedules a POST each minute through pg_cron/pg_net. Restrict Vault/Cron administration to operators.
4. The function checks its secret before reading data; considers a five-minute due window; checks current appointment/medication versions and status; skips confirmed doses; and atomically dedupes each event/version/occurrence/device. Lock-screen text is neutral. Notification routes reauthorize and load current records.
5. `notification_deliveries.status='sent'` means Expo accepted a ticket, not that a phone received/read it. Failed/claimed deliveries are kept for operator inspection and are not automatically retried, avoiding duplicate sends at this prototype stage. Cron outages beyond five minutes can miss a push; the in-app overdue list remains authoritative.
6. Logout removes only this installation's remote association when online, cancels local reminders, and clears its local session even if remote cleanup fails. Offline cleanup/revocation warnings remain visible. A neutral push can still arrive until server cleanup succeeds; it cannot grant access to a signed-out or different account. Other installations keep their reminders.

Do not enable both local and remote transport for the same device: the app selects remote when remote registration succeeds, local otherwise. A remote-registration failure is surfaced and local reminders continue. On schedule change, local reminders are replaced on sync; remote dispatch checks current database versions just before sending. A change racing an in-flight neutral push may still produce a stale notification, whose destination loads only current data.

## Tests

```powershell
npm test
# Requires your actual synthetic cloud project, credentials and deployed functions:
$env:GAN_TEST_EDGE='true'
node --env-file=.env.server tests/supabase-live.mjs
```

The default suite runs actual PostgreSQL migrations/RLS/RPCs using PGlite with a minimal Auth shim. It tests grant denial, own-patient reads, role/assignment protection, unrelated doctors, immutable creator/server versions, acknowledgment invalidation, precise dose keys, duplicate/future/stale confirmations, corrections, audit history, device binding, and service-only reminder claims. It skips only `create extension pgcrypto` in WASM because `gen_random_uuid` is built into PostgreSQL. This validates SQL behavior but does not validate a hosted Supabase Auth/PostgREST gateway, Edge deployment or Android/FCM delivery.

The optional live script needs no service key and logs checks rather than patient data. It creates clearly labeled test orders, verifies direct API denials and version behavior, then cancels/deactivates those orders, preserving audit history. It reports missing optional unrelated-doctor/Edge checks as untested. No cloud credentials were supplied here, so live API and hosted Edge tests remain untested.

Official sources used for implementation: [Supabase RLS and grants](https://supabase.com/docs/guides/database/postgres/row-level-security), [Edge Function authentication](https://supabase.com/docs/guides/functions/auth), [Auth admin createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser), and [Cron/pg_net/Vault scheduling](https://supabase.com/docs/guides/functions/schedule-functions).

Emergency routing copy directs callers in Thailand to 1669, verified against [Thailand's National Institute for Emergency Medicine](https://www2.niems.go.th/procurement/detail?id=1efea1c4-b86b-6d01-bd96-45d14ee1cade). Outside Thailand, it directs users to local emergency services. This is emergency routing information, not a vetted medicine-reference dataset.
