# Continue กรร on another laptop

This repository contains the working Expo SDK 57 app, synthetic local demo, Supabase implementation, tests, authoritative brief and three reference images. Continue this codebase; do not recreate it.

## First run

```sh
git clone https://github.com/SingleplayerGG/gan-health-companion.git gan-health-companion
cd gan-health-companion
npm ci
npx expo start
```

Use the actual GitHub URL. On Windows PowerShell, substitute `npm.cmd` / `npx.cmd` if script policy blocks the standard commands. Open the cloned folder in Codex. No credentials are needed for Demo Mode: select the doctor, manage a patient through Account, then switch to patient A through Account settings. Changes persist locally. See `DEMO_SCRIPT.md`.

## Current state

Implemented: Thai navigation and role guards; calendar/next task/history; doctor patient search and appointment/medication CRUD forms; versioned orders, acknowledgments and dose confirmations; data-grounded read-only chat; preferences, notification planning and speech; persistent demo storage; Supabase adapter, migrations, RLS/RPCs, audit, seed tooling and Edge Functions.

Latest recorded checks: **65 unit/local PostgreSQL tests passed**, including **17 backend tests**; TypeScript passed; lint **0 errors, 4 BOM warnings**; Expo diagnostics **21/21 passed**; Deno **2 passed**. Playwright: **1 passed in 33.2 seconds**, at 360×800 with large fonts.

The successful Playwright run and Android/web exports were **before the final calendar helper/pagination changes**. Rerun browser and exports on the cloned revision before treating them as verification of the latest files. Physical Android, hosted Supabase and actual notification delivery remain untested. See `TEST_CHECKLIST.md`.

## Copy-paste Codex continuation prompt

```text
Continue this existing กรร React Native + Expo SDK 57 application.
Read AGENTS.md, HANDOFF.md and docs/GAN_CODEX_MASTER_BRIEF.md completely;
inspect every ui-references image, then read README.md and TEST_CHECKLIST.md.
Follow the master brief as authoritative. Do not scaffold a replacement app.

Install locked dependencies with npm ci. Run typecheck, tests, lint, Expo diagnostics,
Android/web exports and Playwright. Previous browser/export results predate the
last calendar helper/pagination edits, so verify the current revision and fix failures.

Then prioritize Android native/device validation, Supabase migrations/Auth seed/RLS
and cross-device cloud validation, and real notification/speech tests. Preserve the
three-item left rail, doctor management under Account, patient-only confirmations,
version/audit history, Bangkok time and read-only assistant. Keep Demo Mode labeled
and functional. Use synthetic data; keep privileged keys/secrets out of mobile/git.
Do not claim unavailable device/cloud tests passed. Review SDK-compatible fixes for
the 29 recorded dependency advisories without blindly changing the Expo SDK.
Work on a new branch, implement changes, run appropriate checks, and update the
test record/handoff with actual results before committing.
```

Read order: `AGENTS.md` → this file → complete master brief → reference images → README/checklist → relevant source.

## Next priorities

1. Verify the latest source, then install an Android development build. Test native pickers, keyboard/composer, large system fonts, navigation and Thai speech.
2. Provision your own Supabase project and private synthetic Auth accounts. Apply all migrations in filename order and follow `supabase/seed/README.md`. Test cross-device updates and direct permissions with `tests/supabase-live.mjs`.
3. Test local reminders on Android, then configure EAS/FCM and server secrets for remote delivery. Verify changes/cancellations, duplicates, logout, background and lockscreen behavior on a real device.
4. Review **29 dependency advisories** against compatible patched releases. Assess proposed SDK changes before any force fix.

## Checks and Git workflow

```sh
git switch -c feature/android-cloud-validation
npm run typecheck
npm test
npm run lint
npx expo-doctor
npx expo install --check
npx expo export --platform android --output-dir dist-android
npx expo export --platform web --output-dir dist-web
npm run test:ui
git status
git add <changed-source-and-documentation-paths>
git commit -m "Validate Android and cloud health flows"
git push -u origin feature/android-cloud-validation
```

Open a pull request; your friend needs repository write access to push, or can use a fork. Playwright uses installed Edge on Windows when present; otherwise run `npx playwright install chromium`. For a static web bundle, run `node scripts/serve-web.mjs`, then set `PLAYWRIGHT_BASE_URL=http://127.0.0.1:8082` for the test command. PowerShell: `$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:8082'; npm.cmd run test:ui`.

Copy `.env.example` to an untracked `.env` only when configuring services; each laptop needs its own local setup. Do not commit passwords, service-role keys, real patient records, `node_modules` or build outputs.
