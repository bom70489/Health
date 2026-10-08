# Validation record

Last updated: 8 October 2026. Tests use fictional data only.

## Completed checks

| Check                           | Recorded outcome                                                                             |
| ------------------------------- | -------------------------------------------------------------------------------------------- |
| Dependency installation         | `npm ci`: **passed**, 858 packages installed; 29 advisories reported by npm                |
| TypeScript                      | `npm run typecheck`: **passed**                                                             |
| Unit and local PostgreSQL tests | `npm test`: **66 passed** across 8 files, including backend/PGlite tests                    |
| Expo diagnostics                | `npx expo-doctor`: **21/21 passed** on current source                                       |
| Expo compatibility              | `npx expo install --check`: **passed**, dependencies up to date                             |
| Android bundle                  | `npx expo export --platform android`: **passed** on current source                          |
| iOS bundle                       | `npx expo export --platform ios`: **passed** on current source                               |
| Web bundle                      | `npx expo export --platform web`: **passed** on current source                               |
| Lint                            | `npm run lint`: **passed, 0 errors, 0 warnings** on current source                          |
| Browser end-to-end              | `npm run test:ui`: **1 passed** against built web output, 360×800 viewport                  |
| Responsive browser sweep        | Calendar/chat/account at **280, 320, 360, 390, 430 and 480px**: no page-width overflow; doctor appointment/medication forms at **280px**: no overflow |
| Deno                            | Previous recorded backend checks/tests: **2 passed**; not rerun this session                |

Current verification ran on Node **26.8.1** and npm **12.1.0** (the README recommends Node 24 LTS). Android, iOS and web exports are bundle checks, not native device validation. The browser journey covered doctor order creation, patient confirmation/chat, route guarding and persistence; native/cloud delivery is not implied.

The notification service tests include a regression that verifies Android Expo Go never imports `expo-notifications` and displays the development-build requirement. The completed browser journey verified doctor forms/validation, persisted orders, patient switch, confirmation of one dose only, next-task advancement, live chat answers, doctor deep-link denial, reload persistence and separation from patient B. The current rerun used a 360×800 viewport and completed against the static web export. A separate responsive sweep used 280, 320, 360, 390, 430 and 480 CSS-pixel viewports for patient calendar, chat and account; doctor appointment and medication forms were inspected at 280px. No page-level horizontal overflow or browser errors were found. Earlier failed preliminary runs are not counted as passed. This browser check does not prove native layout behavior on every device.

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
- [ ] Verify the narrow-width layouts on physical Android/iOS phones; web viewport coverage is not native-device coverage.
- [ ] Test Thai read-aloud with/without installed Thai voices and audio stop.
- [ ] Local notifications in a development build: permission granted/denied, due dose, one-day-before appointment, changed/cancelled orders, logout, background, lockscreen and reboot. Android Expo Go deliberately skips the native notification module because its import crashes in this SDK/runtime combination; the app keeps its in-app reminder list available.
- [ ] Hosted Supabase: private synthetic Auth users, migrations, cross-device refresh, direct PostgREST permission checks via `tests/supabase-live.mjs`, deployed assistant JWT enforcement and current-record answers.
- [ ] Remote push: EAS development build + FCM, token registration/unlink, Cron/Vault secrets, current-version dedupe and actual physical-device receipt.
- [ ] Review with older Thai users and clinicians before any broader use. Confirmations are self-report, not verified ingestion or attendance.

## Dependency audit

`npm audit` reports **29 advisories: 19 high, 10 moderate** across four transitive dependency paths: Expo Metro → micromatch → `braces@3.0.3`; Expo Router → query-string → `decode-uri-component@0.2.2`; Expo CLI → `node-forge@1.4.0`; and Expo config plugins → xcode → `uuid@7.0.3`.

Reviewed the current upstream advisories on 8 October 2026. The braces and node-forge advisories list **no patched upstream release** yet. decode-uri-component has a fix in 0.5.0, but Expo Router currently depends on query-string 7.1.3 and 0.2.2; replacing that nested package needs compatibility testing. uuid's advisory fix is in 14.0.0+, while xcode 3.0.1 currently resolves uuid 7.0.3; changing its major version needs API/build validation. `npm audit` only proposes force fixes that move Expo to 44.0.6 or Expo Router to 58.0.16, so no automated or SDK-crossing upgrade was applied. These toolchain findings still need reassessment before distribution; do not treat the project as security-clean.

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
