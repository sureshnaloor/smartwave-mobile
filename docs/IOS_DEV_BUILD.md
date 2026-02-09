# iOS Development Build – Step-by-Step (First Time)

This guide walks you through creating and installing an **iOS development build** of SmartWave so you can run the app on your iPhone with your laptop’s code (e.g. `npm start`).

---

## What you’ll get

- An **.ipa** file (or a link to install it) that you install on your iPhone.
- This build includes **native code** (Expo dev client, Skia, etc.). It **loads your JavaScript** from your laptop when you run `npm start` and connect the phone.

---

## Prerequisites

Before starting, have these ready:

| Requirement | Details |
|-------------|---------|
| **Apple Developer account** | [developer.apple.com](https://developer.apple.com) – enroll in the **Apple Developer Program** ($99/year). You need this to install development builds on a real device. |
| **Expo account** | Sign up at [expo.dev](https://expo.dev) (e.g. your account: **sureshnaloor**). |
| **EAS CLI** | We’ll install it in Step 1. |
| **Mac** | **Not** required for building (EAS builds in the cloud). You only need a Mac if you want to use Xcode or run the iOS Simulator. For a **real iPhone**, you can build from any machine. |

---

## Step 1: Install EAS CLI and log in

Open a terminal (e.g. in VS Code or Terminal.app) and run:

```bash
npm install -g eas-cli
```

Then log in with your Expo account:

```bash
eas login
```

Enter the email and password for your Expo account (e.g. sureshnaloor). You should see a success message.

---

## Step 2: Go to your project folder

```bash
cd /Users/sureshmenon/Desktop/nextjsapps/smartwave/smartwave-mobile
```

(Or wherever your `smartwave-mobile` folder lives.)

---

## Step 3: Configure Apple credentials (first time only)

EAS needs to sign your iOS app with your Apple identity. Run:

```bash
eas credentials
```

- When asked **Select platform**, choose **iOS**.
- Then choose **Set up a new Apple account** or **Use existing Apple account** (if you’ve already used EAS with Apple before).
- Sign in with your **Apple ID** (the one tied to your Apple Developer account).
- When asked for **Team**, select your **Apple Developer team** (e.g. your name or company).
- EAS may ask to create an **App Store Connect API Key** or use **Apple ID** for signing. For the first time, **Apple ID** is fine. You can switch to an API key later for TestFlight automation.

You don’t need to change anything in Xcode; EAS handles provisioning and certificates in the cloud.

### Apple ID password and “incorrect” sign-in

EAS asks for your **Apple ID** (Apple account) — the same email and password you use at [appleid.apple.com](https://appleid.apple.com), App Store, and iCloud. **Expo does not know or store this password;** Apple checks it. If you see “incorrect”:

1. **Confirm it’s the right account**  
   Use the Apple ID that is enrolled in the **Apple Developer Program** (the one you use at [developer.apple.com](https://developer.apple.com)).

2. **Reset your Apple ID password if you forgot it**  
   - Go to [appleid.apple.com](https://appleid.apple.com) → **Sign In** → **Forgot Apple ID or password?**  
   - Enter your Apple ID (email), then follow the steps to reset the password (email, SMS, or trusted device).  
   - After resetting, try `eas credentials` again with the new password.

3. **If you have two-factor authentication (2FA)**  
   Apple may require an **app-specific password** when signing in from a terminal or EAS:  
   - Go to [appleid.apple.com](https://appleid.apple.com) → sign in → **Sign-In and Security** → **App-Specific Passwords** → **Generate**.  
   - Use that **app-specific password** (not your main Apple ID password) when EAS asks for the password.

4. **Alternative: use an App Store Connect API Key (no Apple ID password in terminal)**  
   - In [App Store Connect](https://appstoreconnect.apple.com): **Users and Access** → **Keys** (under Integrations) → **+** to create a key with **App Manager** or **Admin** role. Download the **.p8** file once (you can’t download it again).  
   - In EAS: run `eas credentials` → iOS → when asked, choose **App Store Connect API Key** and provide the Key ID, Issuer ID, and path to the .p8 file.  
   Then EAS won’t ask for your Apple ID password for builds.

---

## Step 4: Start the iOS development build

From the project folder, run:

```bash
eas build --platform ios --profile development
```

- **First time:** EAS may ask to create the app in App Store Connect or link to an existing one. Follow the prompts; you can accept the defaults.
- The build runs on **Expo’s servers** (not on your machine). It usually takes **10–20 minutes**.
- When it finishes, you’ll see a **build URL** and a **QR code** in the terminal, and the same on the [Expo dashboard](https://expo.dev): **Builds** → your project → **smartwave-mobile**.

---

## Step 5: Install the build on your iPhone

You have two main options:

### Option A: Install via link (simplest)

1. On your **iPhone**, open the **build link** from the terminal or from [expo.dev](https://expo.dev) → your project → **Builds** → click the successful iOS build.
2. Tap **Install** (or the link that says to install the profile and then the app).
3. You may need to:
   - Go to **Settings → General → VPN & Device Management** and **Trust** the developer certificate for your Apple ID.
   - Then open the **SmartWave** app from the home screen.

### Option B: Download .ipa and use Apple Configurator / Xcode / TestFlight

- From the Expo build page, you can **download the .ipa**.
- To put it on your device you can use:
  - **Apple Configurator 2** (Mac), or
  - **Xcode** (Window → Devices and Simulators → drag .ipa to the device), or
  - Upload the same build to **TestFlight** (internal testing) and install from the TestFlight app.

For a first app, **Option A** (install via the build page link) is usually enough.

---

## Step 6: Run your app with your laptop’s code

1. On your **laptop**, in the project folder, start the dev server:
   ```bash
   npm start
   ```
2. Make sure your **iPhone** is on the **same Wi‑Fi** as your laptop.
3. In the terminal you’ll see a **QR code** and a URL like `exp://192.168.x.x:8081`.
4. Open the **SmartWave** app on your iPhone (the development build you just installed).
5. The app should prompt for a URL, or you can shake the device and choose **Enter URL manually**, then enter: `exp://YOUR_LAPTOP_IP:8081` (replace with the IP shown in the terminal, e.g. `exp://192.168.1.5:8081`).
6. The app loads the **JavaScript bundle** from your laptop. Any time you change code, **save the file** and **reload** the app on the phone (e.g. shake → **Reload**).

From now on, you only need a **new iOS build** when you change **native** things (e.g. new native modules, or changes in `app.json` that affect the native app). For normal JS/React changes, just save and reload.

---

## Quick reference

| Task | Command or action |
|------|-------------------|
| Log in to Expo | `eas login` |
| Configure Apple (first time) | `eas credentials` → iOS → Apple ID → Team |
| Build iOS dev app | `eas build --platform ios --profile development` |
| Start dev server | `npm start` |
| Connect phone | Same Wi‑Fi; open dev build → enter `exp://LAPTOP_IP:8081` |
| After code change | Save file → Reload app on device |

---

## Troubleshooting

- **“No builds found” / “Build failed”**  
  Check the build log on [expo.dev](https://expo.dev) → your project → Builds. Common causes: wrong Apple Team, expired certificate, or missing bundle ID. Your `app.json` already has `ios.bundleIdentifier: "com.smartwave.mobile"`.

- **“Untrusted developer” on iPhone**  
  Go to **Settings → General → VPN & Device Management** and trust the certificate for your Apple ID.

- **App won’t connect to laptop**  
  Ensure same Wi‑Fi, and that your laptop’s firewall allows port **8081**. Try entering the URL manually in the dev build (e.g. `exp://192.168.1.5:8081`).

- **Need to use a different Apple account or team**  
  Run `eas credentials` again and choose the correct account/team for iOS.

---

## Next steps

- For **TestFlight / App Store** distribution, use the **production** profile and see [DEPLOY_IOS_TESTFLIGHT.md](./DEPLOY_IOS_TESTFLIGHT.md).
- For **how the dev build loads your code**, see [DEV_BUILD_AND_CODE_SYNC.md](./DEV_BUILD_AND_CODE_SYNC.md).
