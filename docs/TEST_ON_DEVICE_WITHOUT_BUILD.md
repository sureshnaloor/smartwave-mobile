# Test on Your Physical Device Without Using EAS Build Credits

You can test code changes on your Android phone **without** uploading a new build to Play Store. Use either **Expo Go** (no build at all) or a **development build** (one build, then unlimited JS updates from your dev server).

---

## Option 1: Expo Go (zero build credits)

Your app runs inside the **Expo Go** app. You change code on your computer and reload on the phone. No EAS build needed.

### Step 1: Install Expo Go on your Android phone

- Open **Play Store** and install **Expo Go**.

### Step 2: Use production API in local dev

So Google sign-in and API behave like production, set your **.env** to production values:

```env
EXPO_PUBLIC_API_URL=https://www.smartwave.name
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=698373238257-qpsus19n1bnf8rogjm8ot9tvnbouccau.apps.googleusercontent.com
```

(Remove or comment out any local IP URLs while testing this way.)

### Step 3: Start the dev server on your computer

```bash
cd /Users/sureshmenon/Desktop/nextjsapps/smartwave/smartwave-mobile
npm start
```

### Step 4: Connect the phone

- **Same Wi‑Fi as your computer:** In the terminal, press **`a`** to open on Android, or in Expo Go tap **“Enter URL manually”** and type the URL shown in the terminal (e.g. `exp://192.168.x.x:8081`).
- **Different network / more reliable:** Use a tunnel:
  ```bash
  npx expo start --tunnel
  ```
  Then scan the **QR code** with Expo Go (or type the `exp://...` URL). Tunnel uses ngrok so the phone can reach your computer from anywhere.

### Step 5: Test

- The app loads in Expo Go. Try **Google sign-in**, **Save**, and **Share**.
- Edit code on your computer and save; the app will reload (or shake device / Cmd+D for reload menu).

**Limitation:** Some native modules may not be available in Expo Go (e.g. certain native libraries). If something fails only in Expo Go, use Option 2.

---

## Option 2: Development build (one build, then no extra credits for JS)

Build a **development client** once (uses **1** EAS build). After that, you run `expo start` and this app loads the JS from your computer—so you can test Google sign-in, Save, Share, etc. without any more EAS builds.

### Step 1: Build the development client (one time only)

```bash
cd /Users/sureshmenon/Desktop/nextjsapps/smartwave/smartwave-mobile
eas build --platform android --profile development
```

- When the build finishes, download the **.apk** from the Expo dashboard.
- Install it on your phone (e.g. transfer the .apk and open it, or use “Internal testing” once to distribute it).

### Step 2: Add env for development build (optional)

To test against production API from the dev client, you can set in **eas.json** under `build.development`:

```json
"development": {
  "developmentClient": true,
  "distribution": "internal",
  "env": {
    "EXPO_PUBLIC_API_URL": "https://www.smartwave.name",
    "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID": "698373238257-qpsus19n1bnf8rogjm8ot9tvnbouccau.apps.googleusercontent.com"
  }
}
```

Or rely on **.env** when you run `expo start` (see Step 3).

### Step 3: Run dev server and open on the device

```bash
npm start
```

- On the **phone**, open the **development build** app (the one you installed from the .apk), not Expo Go.
- It should show a screen to enter a URL or scan a QR code. If it doesn’t, press **`a`** in the terminal (same Wi‑Fi) or run **`npx expo start --tunnel`** and scan the QR code with the dev client.
- The app will load your current JS from the dev server. From now on, **any code change + reload = testing without another EAS build**.

### Step 4: Use production API when testing

In **.env** (or in the `development` profile in eas.json as above):

```env
EXPO_PUBLIC_API_URL=https://www.smartwave.name
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=698373238257-qpsus19n1bnf8rogjm8ot9tvnbouccau.apps.googleusercontent.com
```

Restart `expo start` after changing .env.

---

## Summary

| Goal | Method | EAS builds |
|------|--------|------------|
| Test without any new build | **Expo Go** + `expo start` (+ tunnel if needed) | 0 |
| Test with full native code, no more builds after first | **Development build** once, then `expo start` | 1 |

**Recommended:** Try **Option 1 (Expo Go)** first. If everything (including Google sign-in and Save/Share) works there, you can iterate with zero credits. If something doesn’t work in Expo Go, use **Option 2** and spend one credit for the dev client; after that you can test over the air (JS from your dev server) without further EAS builds.
