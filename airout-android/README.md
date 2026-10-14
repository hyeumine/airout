# AIrOut Android

Kotlin and Jetpack Compose client for the AIrOut API. It follows the same five places as the Expo app: Home, Community, Listen, Journal, and Profile.

Without an account, mood check-ins, the practice listener, the sample wall, and journal entries stay on the phone. Sign-in uses the API. The emulator reaches a server on this computer at `http://10.0.2.2:4000`. A physical phone needs that computer’s LAN address, which you can set under Profile.

Listening replies from the phone are the practice listener. They are marked as simulated and are not a clinical assessment. Crisis replies point to published helplines.

## Open and run

Open this folder in Android Studio, or from here:

```bash
gradlew.bat :app:assembleDebug
```

Install `app/build/outputs/apk/debug/app-debug.apk`, or use Android Studio’s Run button. Start the API first if you want sign-in and the shared community.
