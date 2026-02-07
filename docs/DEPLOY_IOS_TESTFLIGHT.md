# Deploy SmartWave Mobile to TestFlight (iOS)

TestFlight is Apple’s way to distribute beta builds to testers (like Google Play’s Internal testing). This guide gets you from build to TestFlight.

---

## Prerequisites

- **Apple Developer account** – [developer.apple.com](https://developer.apple.com) (**$99/year**). Enroll in the Apple Developer Program.
- **Expo account** – Same as for Android (e.g. sureshnaloor).
- **EAS CLI** – `npm install -g eas-cli` and `eas login`.
- **Mac** – Required for some steps (e.g. first-time Xcode setup, not for EAS build itself; EAS builds in the cloud).

---

## Step 1: First-time EAS + Apple setup

### 1.1 Connect EAS to Apple

From your project folder:

```bash
cd /path/to/smartwave-mobile
eas credentials
```

- Choose **iOS** → follow prompts.
- When asked, **sign in with your Apple ID** (the one tied to your Apple Developer account).
- EAS will create/use an **App Store Connect API Key** or use your Apple ID for signing. Prefer **App Store Connect API Key** for automation (App Store Connect → Users and Access → Keys).

### 1.2 Ensure bundle identifier is set

In **app.json**, iOS uses **slug** by default for the bundle ID, or you can set it explicitly. For a stable App Store identity, set:

- In **app.json** → `expo.ios` add:
  ```json
  "bundleIdentifier": "com.smartwave.mobile"
  ```
  (Use your own if you prefer, e.g. `com.yourcompany.smartwave`; once set, don’t change it.)

If you don’t set it, Expo derives it (e.g. from slug). Either way, note the bundle ID; you’ll use it in App Store Connect.

---

## Step 2: Build the iOS app

```bash
eas build --platform ios --profile production
```

- First time: EAS will ask for Apple ID / team / provisioning. Choose your **Team** (Apple Developer account) and let EAS create the app in App Store Connect if needed.
- Build runs on Expo’s servers. When it finishes, you get an **.ipa** (or a link to it in the Expo dashboard).

---

## Step 3: App Store Connect (first time only)

1. Go to [App Store Connect](https://appstoreconnect.apple.com) and sign in.
2. **My Apps** → **+** → **New App**.
3. Fill in:
   - **Platform:** iOS  
   - **Name:** e.g. SmartWave  
   - **Primary Language**  
   - **Bundle ID:** select the one from EAS (e.g. `com.smartwave.mobile`)  
   - **SKU:** e.g. `smartwave-mobile` (internal use)  
4. **Create**. You don’t need to fill the full store listing yet for TestFlight.

---

## Step 4: Submit the build to TestFlight

### Option A: EAS Submit (recommended)

After the build succeeds:

```bash
eas submit --platform ios --profile production
```

- When prompted, select the **latest iOS build** (or the build ID you want).
- EAS uploads the .ipa to App Store Connect. Wait until the build appears under **TestFlight** tab in App Store Connect (often 5–15 minutes; sometimes longer for “Processing”).

### Option B: Manual upload

1. Download the **.ipa** from [expo.dev](https://expo.dev) → your project → Builds → select the iOS build.
2. Use **Transporter** (Mac App Store) or **Xcode → Window → Organizer → Distribute App** to upload the .ipa to App Store Connect.
3. Wait for the build to show under **TestFlight** in App Store Connect.

---

## Step 5: Add testers and get the TestFlight link

1. In **App Store Connect** → your app → **TestFlight** tab.
2. Wait until the build status is **“Ready to test”** (processing can take a few minutes to an hour).
3. **Internal testing** (up to 100 testers, no review):
   - **Internal Testing** → **Create Group** (e.g. “Internal”) if needed.
   - Add testers by **email** (they must have an App Store Connect role, or you add them as internal testers).
   - Build is automatically available to that group; testers get an email or you share the link.
4. **External testing** (like closed beta, requires first “Beta App Review”):
   - **External Testing** → **Create Group** (e.g. “Beta testers”) → add the build.
   - Add **testers by email** (they get an invite; no App Store Connect account needed).
   - Submit for **Beta App Review** the first time; after approval, testers get the TestFlight link.

**TestFlight link:** In the group, use **Public Link** (external) or tell testers to open the **TestFlight** app on iPhone and accept the invite (internal testers see the build there).

---

## Step 6: Testers install the app

- Testers need the **TestFlight** app from the App Store (free).
- They open the **invite link** (email or the public link you created) or open TestFlight and accept the app invite.
- They tap **Install** for SmartWave. After install, they use it like a normal app; updates appear in TestFlight when you upload a new build.

---

## Checklist (quick reference)

| Step | Action |
|------|--------|
| 1 | Apple Developer account ($99/yr); EAS CLI + `eas login` |
| 2 | (Optional) Set `ios.bundleIdentifier` in app.json |
| 3 | `eas build --platform ios --profile production` |
| 4 | Create app in App Store Connect (if first time) |
| 5 | `eas submit --platform ios --profile production` (or upload .ipa manually) |
| 6 | In App Store Connect → TestFlight, add Internal (or External) testers |
| 7 | Share TestFlight link / invite; testers install via TestFlight app |

---

## iOS version and build number

- **CFBundleShortVersionString** (user-facing): from **app.json** → `expo.version` (e.g. `1.0.2`).
- **CFBundleVersion** (build number): EAS can auto-increment, or set **app.json** → `expo.ios.buildNumber` (e.g. `1`, `2`, `3`). Each TestFlight upload needs a **new build number** (and usually a new or same version).

If you don’t set `ios.buildNumber`, EAS often derives it. For clarity you can set it and bump for each upload (e.g. 3, 4, 5).

---

## Optional: EAS submit config for iOS

To avoid prompts when running `eas submit`, add an iOS block to **eas.json** under `submit.production`:

```json
"submit": {
  "production": {
    "android": { "serviceAccountKeyPath": "./google-play-service-account.json", "track": "internal" },
    "ios": {
      "appleId": "your-apple-id@email.com",
      "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID"
    }
  }
}
```

- **ascAppId**: In App Store Connect → your app → **App Information** → **Apple ID** (numeric).  
You can leave this out and let EAS prompt you each time.

---

## Useful links

- [Expo: Build for iOS](https://docs.expo.dev/build-reference/ios-builds/)
- [Expo: Submit to App Store / TestFlight](https://docs.expo.dev/submit/ios/)
- [Apple: TestFlight](https://developer.apple.com/testflight/)
