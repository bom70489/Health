# Continue กรร on another laptop

This repository contains the working Expo SDK 57 app, synthetic local demo, Supabase implementation, tests, authoritative brief and three reference images. Continue this codebase; do not recreate it.

## First run

```sh
git clone https://github.com/bom70489/Health.git gan-health-companion
cd gan-health-companion
npm ci
npx expo start
```

On Windows PowerShell, substitute `npm.cmd` / `npx.cmd` if script policy blocks the standard commands. To work on Ming's team branch, run `git switch --track origin/ming`. Open the cloned folder in Codex. No credentials are needed for Demo Mode: select the doctor, manage a patient through Account, then switch to patient A through Account settings. Changes persist locally. See `DEMO_SCRIPT.md`.

## Current state

Implemented: Thai navigation and role guards; calendar/next task/history; doctor patient search and appointment/medication CRUD forms; versioned orders, acknowledgments and dose confirmations; data-grounded read-only chat; preferences, notification planning and speech; persistent demo storage; Supabase adapter, migrations, RLS/RPCs, audit, seed tooling and Edge Functions.

Latest verification on the current source: `npm ci` passed previously; this rerun passed TypeScript, **66 tests**, lint with **0 warnings**, Expo diagnostics **21/21**, Expo compatibility check, Android/iOS/web exports and Playwright **1 passed** at 360×800. A browser viewport sweep found no page-level horizontal overflow on calendar/chat/account at 280, 320, 360, 390, 430 and 480px; doctor appointment and medication forms also fit at 280px. This is browser coverage, not proof of native layout on every phone. Android Expo Go skips importing the native notification module due an SDK/runtime import crash; use a development build to test device reminders. npm reported **29 dependency advisories**. The verification environment used Node 26.8.1/npm 12.1.0; README recommends Node 24 LTS. Physical Android/iOS, hosted Supabase and actual notification delivery remain untested. See `TEST_CHECKLIST.md` for details.

## Copy-paste Codex continuation prompt

```text
Continue this existing กรร React Native + Expo SDK 57 application.
Read AGENTS.md, HANDOFF.md and docs/GAN_CODEX_MASTER_BRIEF.md completely;
inspect every ui-references image, then read README.md and TEST_CHECKLIST.md.
Follow the master brief as authoritative. Do not scaffold a replacement app.

Install locked dependencies with npm ci. Re-run typecheck, tests, lint, Expo diagnostics,
Android/web exports and Playwright after source changes. The latest calendar helper and
pagination revision has passed those checks; device/cloud validations are still outstanding.

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

1. Install an Android development build. Test native pickers, keyboard/composer, large system fonts, navigation and Thai speech.
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
