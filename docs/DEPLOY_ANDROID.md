# Deploy SmartWave Mobile to Google Play

## Prerequisites

- [ ] **Google Play Developer account** – [Register](https://play.google.com/console/signup) ($25 one-time)
- [ ] **Expo account** – [expo.dev](https://expo.dev), same as used in the app
- [ ] **EAS CLI** – `npm install -g eas-cli` then `eas login`

## Android “TestFlight” – Testing Tracks

| Track | Who | Review | Use case |
|-------|-----|--------|----------|
| **Internal testing** | Up to 100 emails | None | Team / internal testing (fastest) |
| **Closed testing** | Invited testers | Optional | Beta testers, early users |
| **Open testing** | Anyone with link | Yes | Public beta |
| **Production** | Everyone | Yes | Live on Play Store |

Start with **Internal testing** (like TestFlight), then move to Closed → Production when ready.

## Step 1: Configure EAS and build

1. **Package name** (already set in `app.json`):
   - `android.package`: `com.smartwave.mobile`
   - Do not change this after publishing.

2. **First-time EAS setup** (if not done):
   ```bash
   cd /path/to/smartwave-mobile
   eas build:configure
   ```

3. **Build Android App Bundle (for Play Store)**:
   ```bash
   eas build --platform android --profile production
   ```
   - Build runs on Expo servers.
   - When prompted, choose **Let EAS manage your keystore** (recommended).
   - Output: a `.aab` file (Android App Bundle).

4. **Optional – APK for direct install (testing only)**:
   ```bash
   eas build --platform android --profile preview
   ```
   - Produces an `.apk` you can share for quick testing (not for Play Store upload).

## Step 2: Create app in Play Console

1. Go to [Google Play Console](https://play.google.com/console).
2. **Create app** – name, default language, app or game, free/paid.
3. Complete **App content** (required before first release):
   - **Privacy policy** – URL to your policy (required if you collect data).
   - **App access** – e.g. “All functionality available without special access”.
   - **Ads** – declare if the app contains ads.
   - **Content ratings** – complete questionnaire.
   - **Target audience** – age groups.
   - **News app** – No (unless it is).
   - **COVID-19 contact tracing** – No (unless it is).
   - **Data safety** – Declare what data you collect (e.g. email, name for account, sign-in).

## Step 3: Upload build to Internal testing

1. In Play Console: **Testing** → **Internal testing**.
2. **Create new release**.
3. **Upload** the `.aab` from EAS (or drag and drop).
4. Add **Release name** (e.g. `1.0.0 (1)`) and **Release notes**.
5. **Save** → **Review release** → **Start rollout to Internal testing**.
6. **Create email list** (Internal testing): add up to 100 testers.
7. Testers get the link to opt in and install (no review delay).

## Step 4: Store listing (for Production)

Under **Grow** → **Main store listing**:

- **App name**: e.g. SmartWave
- **Short description** (80 chars)
- **Full description** (4000 chars)
- **App icon** (512×512)
- **Feature graphic** (1024×500)
- **Screenshots** – at least 2 phone screenshots (e.g. 1080×1920 or similar)

## Step 5: Submit to Production

1. When ready: **Release** → **Production** → **Create new release**.
2. Reuse the same (or a newer) `.aab` from EAS.
3. Add version name/code and release notes.
4. **Review and roll out** → **Start rollout to Production**.
5. Google reviews (often 1–3 days). After approval, the app is live.

## Things to be careful about

- **Package name** (`com.smartwave.mobile`) – changing it creates a new app; existing users won’t get updates.
- **Signing** – Prefer “Google manage my key”; keep your **upload key** backed up if you manage it yourself.
- **Privacy policy** – Required if you collect any user data (including email for sign-in).
- **Data safety** – Fill accurately; mismatches can lead to rejection or removal.
- **Version code** – Must increase for each Play Store upload (EAS/Expo can auto-increment; keep `version` and versionCode in sync).

## Optional: EAS Submit (automated upload)

To upload builds from the command line:

1. Create a **service account** in Google Cloud with Play Console API access and download the JSON key.
2. Put the key in the project (e.g. `google-play-service-account.json`) and add to `.gitignore`.
3. In `eas.json`, the `submit.production.android` block already references this file.
4. After a build:
   ```bash
   eas submit --platform android --profile production
   ```

You can also always **download the .aab from EAS** and upload it manually in Play Console.

## Useful links

- [Expo: Build for Android](https://docs.expo.dev/build-reference/android-builds/)
- [Expo: Submit to Google Play](https://docs.expo.dev/submit/android/)
- [Play Console Help](https://support.google.com/googleplay/android-developer)
