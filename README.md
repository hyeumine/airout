# AIrOut — I Will Listen!

A privacy-conscious emotional support app: a private listening companion, a personal journal, and a peer community built around encouragement rather than popularity.

The phone app can be used **on this device** without an account. Shared community, accounts, and synced journals need the API and MySQL.

This is not a clinical service, not emergency help, and not a finished production deployment. See `docs/SAFETY.md` and `docs/PRIVACY.md`.

## What is real in this build

- Expo app with five tabs: Home, AIrOut AI, Community, Journal, Profile
- Light and dark themes
- On-device guest mode, including a migration from the original `airout-demo` storage
- Express API with JWT access tokens and rotating refresh tokens
- Community posts, comments, supportive reactions, saves, reports, blocks, and circles
- Private journal and daily mood check-ins
- Practice listening companion with three modes, plus an optional server-side remote model
- Teachable Machine loader that stays off until a model and runtime exist
- Moderator queue, appeals, and in-app notices

## What is simulated or not connected

- Email delivery. Development can show a one-time token. Production does not.
- Conversational model. Replies are the practice listener unless the server has `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL`.
- Teachable Machine inference. Metadata can be validated. No runtime ships with the app, and text classification is refused.
- Voice input and push notifications.
- Database disk encryption. Access control is implemented. Encryption at rest depends on how MySQL is hosted.

## Run the phone app by itself

From `airout-mobile`, with Node.js 20+ and Expo Go if you use a phone:

```bash
npm install
npx expo start
```

Open the project in Expo Go, an emulator, or the web bundler. Guest mode does not need the API.

A phone on the same network must use your computer’s LAN address, not `localhost`:

```bash
set EXPO_PUBLIC_API_URL=http://192.168.1.20:4000
npx expo start
```

Android emulators usually need `http://10.0.2.2:4000`.

React Native 0.81 warns that it prefers Node `>= 20.19.4`. This workspace was verified on Node `20.12.2`. The warning comes from the existing Expo SDK 54 baseline.

## Run the API

```bash
docker compose up -d
cd airout-api
npm install
npm run dev
```

Development defaults match `docker-compose.yml` (`airout` / `airout_dev_password` on port 3306). Copy `.env.example` to `.env` if you need different values. The server refuses to boot in production without real JWT secrets, and it refuses to load the development seed in production.

Development seed sign-in, local only:

| Email | Password | Role |
| --- | --- | --- |
| quiet@airout.local | DevOnly-Listen-2026! | member |
| gentle@airout.local | DevOnly-Listen-2026! | member |
| moderator@airout.local | DevOnly-Listen-2026! | admin |

## Tests

```bash
cd airout-api && npm test
cd airout-mobile && npm test
```

API tests use SQLite in memory so they do not need MySQL. See `docs/TESTING.md`.

## More detail

- `DEVELOPMENT.md` — audit and milestone status
- `docs/API.md` — HTTP routes
- `docs/SAFETY.md` — listening and crisis limits
- `docs/PRIVACY.md` — what is stored and deleted
