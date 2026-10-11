# AIrOut mobile

Expo SDK 54 app (React 19.1, React Native 0.81) for AIrOut. Navigation is Expo Router. Guest data stays in AsyncStorage. Signed-in tokens use Expo SecureStore on iOS and Android, and AsyncStorage on web with a notice in Profile.

The original single-file prototype was `App.js`. Its on-device mood, chat, wall, journal, and nickname behavior now live in guest mode. If an older install still has the `airout-demo` key, the first launch copies it into the new store.

## Run

```bash
npm install
npx expo start
```

The shared API is optional. Set `EXPO_PUBLIC_API_URL` when it is not `http://localhost:4000`. See the repository `README.md` for the API, seed accounts, and the limits of this build.

```bash
npm test
npm run typecheck
```

## Model hooks

- `src/services/ai/LLMProvider.ts` — mock, future local, and optional remote providers. Signed-in chats go through the API so keys stay on the server.
- `src/services/ml/TeachableMachineService.ts` and `config/ml.config.ts` — image or audio models only, off by default.

Do not treat either one as a diagnosis or as the safety system. Crisis handling is separate and documented in `docs/SAFETY.md`.
