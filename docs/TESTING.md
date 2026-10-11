# Testing

## API

From `airout-api`:

```bash
npm test
npm run typecheck
```

`npm test` runs three files in separate processes so each can choose its own database:

- `tests/safety.test.ts` — practice listener, crisis redirect, production token hiding
- `tests/api.test.ts` — SQLite in memory: auth, refresh reuse, journal privacy (including an admin token), mood validation, community post/comment/reaction order, circles, reports, moderator hide, blocks, AI consent, settings, account deletion
- `tests/migrate.test.ts` — initial migration creates the expected tables on SQLite

MySQL is not required for these tests. `npm run dev` still expects MySQL unless `DB_DIALECT=sqlite` is set.

## Mobile

From `airout-mobile`:

```bash
npm test
npm run typecheck
```

The mobile test covers the offline listener, the rule that crisis text is not sent to a remote model, and Teachable Machine failures: disabled config, text models refused, metadata fetch failure, and metadata without a runtime.

UI checks that need a device or browser are not in that command. Use Expo:

```bash
npx expo start
```

Guest mode should open without the API. Sign-in, shared posts, and synced journals need `airout-api` running and `EXPO_PUBLIC_API_URL` pointing at it.

## Not covered by automation

- Expo Go on a physical Android or iOS device
- A configured remote LLM
- A real Teachable Machine model file
- Email delivery
- Push notifications
- Multi-process rate limits
