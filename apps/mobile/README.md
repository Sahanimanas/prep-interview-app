# PrepPilot mobile

The Expo (SDK 58) / React Native app for PrepPilot — AI interview prep plans, lessons, question banks,
quizzes and mock interviews. It talks to `apps/api` through the typed client in `@preppilot/shared`.

## Prerequisites

- Node 22.12+ and dependencies installed **from the repo root** (`npm install` at the root — this is an npm-workspaces monorepo).
- The API running (`npm run dev:api` and `npm run dev:worker` from the root), listening on port 4000.
- A phone with **Expo Go**, an Android emulator, or an iOS simulator.

## Configure the API URL

```bash
cp .env.example .env
```

Set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env`:

| Where the app runs            | Value                                       |
| ----------------------------- | ------------------------------------------- |
| Physical phone (same Wi-Fi)   | `http://<your-computer-LAN-IP>:4000/api/v1` |
| Android emulator              | `http://10.0.2.2:4000/api/v1`               |
| iOS simulator / web           | `http://localhost:4000/api/v1`              |

Find your LAN IP with `ipconfig` (Windows), `ipconfig getifaddr en0` (macOS) or `hostname -I` (Linux).
`localhost` on a phone means the phone itself, so it will not reach your computer. Make sure your firewall allows
inbound connections on port 4000. Restart `expo start` after changing `.env` (values are inlined at bundle time).

If the variable is unset the app guesses: `10.0.2.2` on the Android emulator, the Metro host IP on a physical device
in development, otherwise `localhost`. The URL in use is shown at the bottom of **Settings**.

## Run

```bash
# from the repo root
npm run dev:mobile
# or from apps/mobile
npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS), or press `a` / `i` for an emulator/simulator.
Everything in this app runs in Expo Go; a development build works too:

```bash
npx expo run:android      # local dev build (needs Android Studio)
npx expo run:ios          # local dev build (macOS + Xcode)
```

## Build with EAS

Profiles live in `eas.json` (`development`, `preview`, `production`). Update each profile's
`EXPO_PUBLIC_API_URL` to the matching backend first.

```bash
npx eas-cli@latest login
npx eas-cli@latest init                                   # links the project (first time only)
npx eas-cli@latest build --profile development --platform android   # dev client
npx eas-cli@latest build --profile preview --platform android       # installable APK for testers
npx eas-cli@latest build --profile production --platform all        # store builds
npx eas-cli@latest submit --profile production --platform ios
```

## Checks

```bash
npx tsc --noEmit
npx expo export --platform android --output-dir <tmp-dir>   # proves Metro resolves the workspace package
```

## Project layout

```
src/
  app/                    expo-router routes
    _layout.tsx           providers + auth-guarded root stack (Stack.Protected)
    (auth)/               welcome, login, register
    (app)/(tabs)/         Home, Saved (bookmarks), Settings — native tabs
    (app)/plan/new.tsx    3-step intake wizard
    (app)/plan/[planId]/  plan hub + revision-quiz & start-mock sheets
    (app)/topic/[topicId] lesson / questions / quiz for a topic
    (app)/quiz/[quizId]   one-question-at-a-time quiz + results
    (app)/mock/[mockId]   mock interview chat + scorecard
  components/ui/          design-system primitives (Button, Card, TextField, Chip, …)
  lib/                    API client, token storage (SecureStore), React Query hooks, errors
  providers/              auth provider
  constants/theme.ts      brand tokens (light + dark)
```
