# AIrOut development roadmap

Audit date: 11 October 2026.

## What already existed

The prototype lived in `airout-mobile` as a single `App.js` file.

| Item | Finding |
| --- | --- |
| Expo | `~54.0.0` (SDK 54) |
| React | `19.1.0` |
| React Native | `0.81.4` |
| Navigation | Local `useState` tabs, not React Navigation or Expo Router |
| Persistence | `@react-native-async-storage/async-storage` key `airout-demo` |
| Backend | None |
| Language | JavaScript |

Working local features preserved:

- Home mood check-in
- Rule-based private listening chat, including a crisis-keyword reply
- Community posts, encouragement, comments, and a report notice
- Personal journal
- Community alias and clear-data action

Those flows now live in the on-device guest mode so the app still opens without a server. Shared community, accounts, and synced journal data require the API.

## Status

| Milestone | Scope | Status |
| --- | --- | --- |
| 1 | Audit, navigation, design system, project structure | Implemented in this pass |
| 2 | Authentication, MySQL/Sequelize, API client | Implemented in this pass |
| 3 | Community feed, comments, reactions, reports, circles, blocks | Implemented in this pass |
| 4 | Journal, mood, profile, privacy preferences | Implemented in this pass |
| 5 | Mock AI provider, remote LLM adapter, Teachable Machine scaffold | Implemented in this pass |
| 6 | Moderation, safety layer, notifications, tests | Implemented in this pass |

Update this table if a later change leaves a feature incomplete.

## Implemented

- Expo Router tabs: Home, AIrOut AI, Community, Journal, Profile
- Light and dark pastel theme with shared buttons, cards, fields, and empty/error states
- Guest mode that migrates the old `airout-demo` AsyncStorage payload
- Express API with JWT access tokens and rotating refresh tokens
- Sequelize models and an initial migration for the requested tables, plus verification tokens and appeals
- Community categories, supportive reactions, chronological feed, comments, saves, reports, blocks, and circles
- Private journal and daily mood check-ins
- Mock listening companion with three modes, plus an optional server-side remote LLM
- Teachable Machine loader that stays off until a model and runtime exist
- Keyword safety layer separate from the classifier, with published crisis directories
- Moderator queue, appeals, audit log, and aggregated counts
- In-app notifications with opt-in preferences and generic lock-screen-safe copy
- Web guest flows checked in a browser: mood check-in, Just Listen reply, guidelines before a first reply, journal save and search, and dark theme
- `metro.config.js` loads Zustand's CommonJS middleware on web so `import.meta` does not stop the bundle from starting

## Simulated or not operational

- Email delivery. Tokens are stored. In development and test, the raw token is returned once so the flow can be exercised. Production does not return it and does not send mail until `MAIL_PROVIDER` is implemented.
- Conversational model. Replies come from `MockConversationalProvider` unless `LLM_BASE_URL` and `LLM_API_KEY` are set on the server. The phone never receives that key.
- Teachable Machine inference. The service can validate metadata and then reports that no runtime is installed. It does not classify text, and it is not a safety decider.
- Voice input. The control explains that speech-to-text is not connected.
- Push notifications. Preferences are saved. This build only creates in-app notifications.
- Guest journal and chat storage. On-device data uses AsyncStorage, which is not encrypted. Account tokens use Expo SecureStore on iOS and Android. Web falls back to AsyncStorage and says so.
- Database encryption at rest depends on the MySQL host. This repository does not enable it.

## Planned before any real-world support launch

- A real mail provider and verified sending domain
- Human moderators, appeal staffing, and an on-call path for urgent reports
- Clinical and legal review of copy, age policy, and crisis flows
- Production secrets, TLS, backups, and a decision about encrypting journal rows
- A shared rate-limit store if more than one API process runs
- Device speech-to-text, only after a separate consent screen
- A Teachable Machine runtime chosen after the owner exports a real image or audio model

## Run

See the root `README.md`. Guest mode does not need MySQL. Accounts and the shared community do.
