# กรร | AI Health Companion

Thai-first Android-first prototype built from [the authoritative master brief](docs/GAN_CODEX_MASTER_BRIEF.md). One Expo + React Native + TypeScript app, with Expo Router and a permanent left rail: **กรร / ปฏิทิน / บัญชี**. It has JavaScript bundle exports for Android, iOS and web. Use fictional data only. See [HANDOFF.md](HANDOFF.md) to continue with Codex on another laptop.

## Completion status

The functional prototype work is complete: demo doctor-to-patient flows, persistent synthetic data, role guards, appointment and medication management, dose self-reporting, calendar tasks and read-only schedule chat are implemented. The latest checks are recorded in [TEST_CHECKLIST.md](TEST_CHECKLIST.md): 66 tests pass, typecheck/lint/Expo diagnostics pass, Android/iOS/web bundles export, and the browser journey passes at 360×800. A responsive browser sweep found no page-width overflow at 280, 320, 360, 390, 430 and 480px for the calendar, chat and account screens; doctor appointment and medication forms also fit at 280px.

This means the app builds and its tested demo journey works in the listed environments. It does **not** mean it has been verified on every device or is ready for clinical use. The width sweep used a web browser, so physical Android/iOS layouts, native reminders/speech, hosted Supabase authentication and remote push still need the device/cloud checks below.

## Clone and run on another laptop

Requires Git, Node.js 24 LTS and npm. Install the exact locked dependencies:

```sh
git clone https://github.com/bom70489/Health.git gan-health-companion
cd gan-health-companion
npm ci
npx expo start
```

If PowerShell blocks `npm.ps1` or `npx.ps1`, use `npm.cmd` / `npx.cmd`. Open this cloned folder as the Codex workspace; do not scaffold a new app. Demo Mode needs no `.env` or cloud credentials.

## Team branch for Ming

The `ming` branch is the team's starting branch for Ming's work. After cloning, switch to it with:

```sh
git switch --track origin/ming
```

Keep new work on `ming` or a feature branch based on it, then open a pull request to `main` when it's ready to review.

Scan the QR code using an Expo Go release compatible with SDK 57, or press `a` with an Android emulator installed. If a matching Expo Go runtime is unavailable, use the development build below. For the browser preview:

```powershell
npm.cmd run web
```

No `.env` is required for demo mode. Login buttons select the doctor or one of two fictional patients. Demo records persist using AsyncStorage, and switching accounts preserves doctor changes. Reset is an explicit action with confirmation under **บัญชี → การตั้งค่า**. The demonstration login grants no real security.

## Working flows

- Doctor: **บัญชี → จัดการผู้ป่วย → ค้นหาชื่อ/HN → เลือกผู้ป่วย**. Create/edit/cancel appointments; create/edit/deactivate medication plans with meal instructions, multiple daily times, selected weekdays, start/end dates and reminders.
- Patient: the first screen is the health calendar, with the next actionable task, an overdue count, date navigation, chronological doses and appointments, read-only clinician instructions, dose self-report and reversible corrections.
- Appointment acknowledgment applies to the current version and is distinct from attendance. Doctor edits invalidate it. Medication edits create new versions; historical confirmations remain separate.
- Assistant: suggested prompts and typed Thai questions retrieve the same saved schedules and confirmation state. It refuses to change orders, exposes no other patient's records, and honestly reports that verified drug side-effect references are absent.
- Account: read-only profile/contact details, notification permission, three font sizes, demo account switching, test clock and explicit reset. Doctor routes require the doctor role even when opened directly.
- Local reminders: neutral lockscreen text, medication occurrences and one-day-before appointments, cancellation/rescheduling on sync and account switch. Permission denial is explained. Notifications are separate from confirmation of medication ingestion. On Android Expo Go, the app skips the native notification module to avoid an Expo SDK 57 import crash; use an Android development build to test device reminders. The calendar and its in-app reminder list remain available in Expo Go.
- Thai read-aloud uses available device voices; missing Thai speech support is reported.

## Supabase mode

The adapter, migrations, narrow RPCs, RLS and Edge Functions are implemented. A hosted Supabase project is not preconfigured. Follow [supabase/seed/README.md](supabase/seed/README.md) for Auth accounts, migrations, relationships and seed instructions.

1. Create a Supabase project. Apply every SQL file in `supabase/migrations/` in filename order with the SQL editor or Supabase CLI.
2. Create one doctor and two synthetic patient Auth users with private passwords, then provision their protected profiles and doctor assignments using the seed tooling. A profile alone does not create an Auth login.
3. Copy `.env.example` to `.env`. Set `EXPO_PUBLIC_USE_DEMO_MODE=false`, your Supabase URL and anon/publishable key. Restart Metro with `npx.cmd expo start --clear`.
4. Deploy the `assistant` Edge Function. It verifies the user's JWT, retrieves only their records through RLS, and saves its trusted deterministic reply. The mobile client cannot forge an assistant message.
5. Optionally configure the `send-reminders` Edge Function, its dedicated server secret and scheduled invocation as documented in the Supabase instructions. Configure FCM/EAS and opt into remote registration only when testing a development build.

Roles come from server-owned profiles. There is no public signup or editable role. Patients cannot write appointments/prescriptions directly; confirmations and acknowledgments use authenticated, identity/version/recurrence-checked RPCs. Shared doctors can manage assigned patients while original creator provenance is retained. Audit records and versioned occurrence keys prevent old confirmations from completing a revised plan. Supabase failures are visible; the app does not fall back to demo mode.

Only public URL/key configuration belongs in `EXPO_PUBLIC_*`. Service-role credentials, reminder secrets and any future LLM credentials belong on the server. No LLM provider is needed: both modes currently use useful deterministic schedule retrieval. General medical knowledge is deliberately unavailable until reviewed references exist.

## Android development build

```powershell
npx.cmd expo run:android
```

This requires Android Studio/SDK, Java and a device/emulator. Alternatively, sign into your own Expo account and configure EAS:

```powershell
npx.cmd eas-cli@latest build:configure
npx.cmd eas-cli@latest build --platform android --profile development
npx.cmd expo start --dev-client
```

Set the EAS project ID in public configuration when enabling Expo remote tokens. Android remote push requires a development build and FCM; Expo Go is not a remote-push validation environment. Exact local alarm behavior depends on Android permissions and device settings. Test denied permission, background/lockscreen, reboot, edited schedules, account changes and duplicate delivery on a real device.

## Checks

```powershell
npm.cmd run typecheck
npm.cmd test
npx.cmd expo-doctor
npx.cmd expo install --check
npx.cmd expo export --platform android --output-dir dist-android
npx.cmd expo export --platform web --output-dir dist-web
npm.cmd run test:ui
```

Playwright uses installed Microsoft Edge in headless mode by default and starts/reuses Expo on port 8081. The end-to-end suite tests a narrow viewport, doctor writes, account switching, dose confirmation, chat, role guarding and reload persistence. To use bundled Chromium instead, see `playwright.config.ts` and install the matching browser.

Vitest covers pure scheduling, Bangkok boundaries, persistence, role separation, concurrency, storage failures, clinical version edits, assistant guardrails, and actual PostgreSQL migration/RLS/RPC behavior through PGlite. See [TEST_CHECKLIST.md](TEST_CHECKLIST.md) for actual outcomes and tests requiring external setup. Hosted Auth/PostgREST/Edge deployment must still be tested against your Supabase project; a local SQL test does not prove that cloud setup was completed.

## Main files

| Path                            | Responsibility                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| `app/`                          | Auth routes, persistent rail, patient calendar/details/chat, account and doctor forms |
| `src/domain/`                   | Typed records, Bangkok date conversion, recurrence, next task, validation             |
| `src/data/`                     | Shared repository interface, persistent DemoRepository, Supabase adapter              |
| `src/providers/AppProvider.tsx` | Auth, scoped data, refresh, mutations, clock and accessibility preferences            |
| `src/services/`                 | Guarded assistant retrieval, notification synchronization and speech                  |
| `supabase/`                     | SQL schema/RLS/RPCs/audit, authenticated Edge Functions, seed and cloud checks        |
| `tests/`                        | Logic, repository, assistant, PostgreSQL security and UI flow tests                   |

## Limits

This is a hackathon prototype, not a clinically validated service. Test data is synthetic. Local demo storage is not secure health-record storage. Confirmations are self-report. Physical Android behavior, accessibility with older Thai users, deployed cloud Auth/Edge Functions and remote notification delivery require real testing. OCR, speech recognition, hospital integration and a generative LLM provider are outside Phase 1. Dependency advisory details and unverified checks are recorded in the test checklist.

Technical references: [Expo Router](https://docs.expo.dev/router/introduction/), [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/), [Supabase React Native Auth](https://supabase.com/docs/guides/auth/quickstarts/react-native), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
