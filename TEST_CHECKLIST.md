# Validation record

Last updated: 8 October 2026. Tests use fictional data only.

## Completed checks

| Check                           | Recorded outcome                                                                             |
| ------------------------------- | -------------------------------------------------------------------------------------------- |
| Dependency installation         | Expo SDK 57 matched packages installed; lockfile present                                     |
| TypeScript                      | Latest recorded `tsc --noEmit`: **passed**                                                  |
| Unit and local PostgreSQL tests | Latest completed run: **65 passed**, including **17 backend tests**                         |
| Expo diagnostics                | **21/21 passed**, after adding required expo-font                                            |
| Expo compatibility              | `expo install --check`: dependencies up to date                                              |
| Android bundle                  | Export **passed** before final calendar helper/pagination edits; latest source needs rerun  |
| Web bundle                      | Export **passed** before final calendar helper/pagination edits; latest source needs rerun  |
| Lint                            | Latest recorded run: **0 errors, 4 BOM warnings**                                           |
| Browser end-to-end              | **1 passed in 33.2 seconds**, before final calendar helper/pagination edits; rerun latest    |
| Deno                            | Backend checks/tests recorded **2 passed**                                                 |

The completed browser journey verified doctor forms/validation, persisted orders, patient switch, confirmation of one dose only, next-task advancement, live chat answers, doctor deep-link denial, reload persistence and separation from patient B. Screens were inspected at 360×800 with 1.3 font size. Earlier failed preliminary runs are not counted as passed. Browser and export results predate the final calendar helper/pagination changes; rerun those checks on the latest revision. Native/cloud delivery is not implied by these results.

## Automated behavior covered

- Bangkok UTC+7 dates and day boundaries, selected weekdays, two daily dose slots, inactive/cancelled schedules, empty states, overdue pending doses and chronological next-task advancement.
- Dose self-report applies to one exact plan/version/instant; duplicate submission, correction audit, future/forged/stale occurrence rejection.
- Doctor edits persist across patient switch/restart; versions reset appointment acknowledgment and separate old dose confirmations.
- Patient A cannot see B, patients cannot change doctor orders, doctor assignment checks, storage failure rollback and concurrent serialized writes.
- Assistant answers update after doctor edits, use confirmation state, reject clinical mutations and cross-patient queries, and decline unsupported drug knowledge.
- Actual PostgreSQL RLS/grants/RPC tests via PGlite, including anonymous denial, server-controlled role/creator/version, narrow acknowledgment/confirmation, audit history, service-only reminder claims and installation-scoped tokens.
- Reminder planning, deduplication, changed-order cancellation, permissions/failure reporting, remote/local transport selection and offline logout behavior where implemented in the automated suite. Mocks verify service logic, not real delivery.

## Device and hosted checks still required

- [ ] Install on Android; inspect 360dp width, system font scaling, native date/time controls, back navigation and keyboard/composer behavior.
- [ ] Test Thai read-aloud with/without installed Thai voices and audio stop.
- [ ] Local notifications: permission granted/denied, due dose, one-day-before appointment, changed/cancelled orders, logout, background, lockscreen and reboot.
- [ ] Hosted Supabase: private synthetic Auth users, migrations, cross-device refresh, direct PostgREST permission checks via `tests/supabase-live.mjs`, deployed assistant JWT enforcement and current-record answers.
- [ ] Remote push: EAS development build + FCM, token registration/unlink, Cron/Vault secrets, current-version dedupe and actual physical-device receipt.
- [ ] Review with older Thai users and clinicians before any broader use. Confirmations are self-report, not verified ingestion or attendance.

## Dependency audit

`npm audit` reports **29 advisories: 19 high, 10 moderate**, inherited through the SDK toolchain/its dependency graph. Reported paths include node-forge, braces/micromatch, decode-uri-component/query-string and uuid/xcode. Suggested force fixes downgrade Expo/React Native or cross SDK major versions, so they were not applied. Do not treat this as a security-clean production release. Recheck patched compatible package releases before distribution.

## Reproduce

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run lint
npx.cmd expo-doctor
npx.cmd expo install --check
npx.cmd expo export --platform android --output-dir dist-android
npx.cmd expo export --platform web --output-dir dist-web
npm.cmd run test:ui
```

To verify the exported browser bundle without live reload: run `node scripts/serve-web.mjs` in one terminal, then set `$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:8082'` and run `npm.cmd run test:ui`. Playwright screenshots/traces live under ignored `test-results/`.
