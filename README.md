# SmartWave Mobile (iOS + Android)

Expo (React Native) app with the same features as the web app: **sign in**, **profile form**, and **Add to Apple Wallet / Google Wallet**.

- **Backend:** The Next.js web app at `../smartwave` (or your deployed URL). It exposes:
  - `POST /api/mobile/auth` – login (email + password), returns JWT
  - `GET /api/mobile/profile` – get profile (Bearer token)
  - `PATCH /api/mobile/profile` – update profile (Bearer token)
  - `GET /api/wallet/apple?shorturl=XXX` – add to Apple Wallet
  - `GET /api/wallet/google?shorturl=XXX` – add to Google Wallet

- **Config:** Edit `src/config.ts` and set `API_BASE` (or `EXPO_PUBLIC_API_URL`) to your backend URL (e.g. `https://www.smartwave.name`). For local testing from a device/simulator, use your machine’s IP (e.g. `http://192.168.1.x:3000`).

## Run

```bash
npm install
npx expo start
```

Then press **`i`** for iOS simulator or **`a`** for Android emulator.

## First-time setup (iOS)

1. Install **Xcode** from the Mac App Store and run it once.
2. Install **Xcode Command Line Tools** if needed: `xcode-select --install`
3. Create an **Expo** account at [expo.dev](https://expo.dev) and log in with `npx expo login` (optional for simulator).

## Build for device / App Store

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios
```

Use your Apple Developer account when prompted. For full steps, see the web app’s **docs/MOBILE_APP_GUIDE.md**.

## Project layout

- `src/config.ts` – API base URL and wallet URLs
- `src/api/client.ts` – login, getProfile, updateProfile
- `src/context/AuthContext.tsx` – auth state and token storage (expo-secure-store)
- `src/screens/SignInScreen.tsx` – email/password sign in
- `src/screens/ProfileScreen.tsx` – view/edit profile
- `src/screens/WalletScreen.tsx` – Add to Apple Wallet / Google Wallet buttons
