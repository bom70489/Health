# Project instructions for Codex

Continue this existing Expo SDK 57 / React Native / TypeScript app. Use the npm lockfile and `npm ci`. Read in order: `HANDOFF.md`, the entire authoritative `docs/GAN_CODEX_MASTER_BRIEF.md`, all three images in `ui-references/`, then `README.md`, `TEST_CHECKLIST.md` and relevant source.

## Critical product invariants

- One Thai-first portrait app, with only **กรร / ปฏิทิน / บัญชี** on the permanent left rail. Account stays at the bottom; doctor management stays under Account.
- Doctors author appointments and medication instructions only for assigned patients. Patients read their own orders, acknowledge the current appointment version, and self-report/correct individual doses.
- The assistant is read-only: no prescribing, diagnosis, order mutations, invented medicine references or other-patient disclosure.
- Keep persisted synthetic Demo Mode functional and explicitly labeled. Supabase failures must not silently become demo sessions. Real roles/assignments are server-owned and RLS/RPCs enforce authorization.
- Use `Asia/Bangkok`. Occurrence identity includes plan, version and instant. Passed time never means medicine taken or appointment attended. Preserve confirmations, corrections and order history; revisions invalidate obsolete acknowledgment/reminders.
- Maintain 48dp controls, legible Thai, large fonts and a visible composer on narrow screens. Use fictional data only. Never put privileged secrets in mobile code, public environment variables or git.
- Work on a branch and record actual checks. Do not claim native/cloud/push tests passed without evidence. See `HANDOFF.md` for the continuation prompt and current verification boundaries.

This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. This project's routes live in **`app/`**, not `src/app/`; `_layout.tsx` files define navigators. Keep non-route code in `src/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
