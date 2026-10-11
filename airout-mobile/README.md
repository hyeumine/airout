# AIrOut Mobile — Expo MVP

An offline-first **UI prototype** for AIrOut with a listening chat, local community wall, encouragement and replies, mood check-ins, personal journal, and profile. All content currently lives **only on the current device**. No public network, moderation backend, login, or real LLM is included.

## Run
1. Install Node.js 20+ and Expo Go on your phone.
2. In this directory run `npm install`.
3. Run `npx expo start` and scan the QR code in Expo Go.

## Teachable Machine integration
Teachable Machine models are **classifiers**, not generative LLMs. Train and export a model for image/audio/pose classification, then build a separate inference adapter (on-device runtime compatible with your chosen model format). Treat emotion predictions as uncertain cues, never a diagnosis. Do not upload voice or camera data without explicit opt-in. Connect an actual local or hosted LLM separately to produce conversational responses, subject to a safety policy.

## Before real-world deployment
- Replace `localReply()` with a reviewed AI adapter, safety checks, crisis response, and appropriate escalation.
- Implement authenticated backend, post/comment persistence, report review, blocking, rate limits, abuse detection, and trained human moderation.
- Add privacy notice, age policy, explicit consent, secure storage/encryption, deletion, and retention controls.
- Add vetted, location-appropriate crisis resources and emergency help flows.
- Review mental-health and privacy requirements with qualified professionals.

**Do not deploy this prototype as a live mental-health support service.**
