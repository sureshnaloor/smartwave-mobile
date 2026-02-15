# Local Testing Guide - Passes Feature

This guide walks you through testing the new passes functionality locally (on your laptop) and then on physical devices (iPhone and Android).

---

## Prerequisites

1. **Web app running** - The mobile app connects to your web backend API
2. **Same network** - Laptop and devices must be on the same Wi-Fi for local testing
3. **Expo CLI** - Already installed (`npm install -g expo-cli` if needed)

---

## Step 1: Ensure Web App is Running

The mobile app connects to your web backend. Make sure it's running:

```bash
cd /Users/sureshmenon/Desktop/nextjsapps/smartwave/smartwave
npm run dev
```

The web app should be running at `http://localhost:3000` (or your configured port).

---

## Step 2: Configure Mobile App API URL

For **local testing**, you need to point the mobile app to your laptop's IP address (not `localhost` or `https://www.smartwave.name`).

### Find Your Laptop's IP Address

**On macOS:**
```bash
ipconfig getifaddr en0
# or
ifconfig | grep "inet " | grep -v 127.0.0.1
```

You'll get something like `192.168.1.5` or `10.0.0.15`.

### Set Environment Variable

Create a `.env` file in `smartwave-mobile/` (or update existing):

```bash
cd /Users/sureshmenon/Desktop/nextjsapps/smartwave/smartwave-mobile
echo "EXPO_PUBLIC_API_URL=http://192.168.1.5:3000" > .env
```

**Replace `192.168.1.5` with your actual laptop IP address.**

---

## Step 3: Test Locally (Laptop)

### Option A: Web Browser (Fastest for quick checks)

```bash
cd /Users/sureshmenon/Desktop/nextjsapps/smartwave/smartwave-mobile
npm run web
```

This opens the app in your browser. You can:
- Test UI changes quickly
- Check navigation and tabs
- Verify API calls (check browser DevTools → Network tab)

**Note:** Some native features (camera, secure store) won't work in web, but passes UI/API will.

### Option B: Expo Go App (Recommended for mobile-like testing)

1. **Install Expo Go** on your phone:
   - iOS: [App Store - Expo Go](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Play Store - Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Start Expo dev server:**
   ```bash
   cd /Users/sureshmenon/Desktop/nextjsapps/smartwave/smartwave-mobile
   npm start
   ```

3. **Connect:**
   - Scan the QR code with Expo Go (iOS: Camera app, Android: Expo Go app)
   - Or enter the URL manually: `exp://192.168.1.5:8081` (replace with your IP)

4. **Test passes:**
   - Sign in (use a test account)
   - Navigate to Passes screen
   - Test all tabs: Corporate, Upcoming, Available, Requested, Expired, Draft, My Created
   - Test pass detail screen
   - Test joining/requesting passes

**Limitations:** Expo Go doesn't support custom native modules. If you need full native features, use a development build (Step 4).

---

## Step 4: Test on Physical Devices (Development Build)

For full native features and production-like testing, use a development build.

### For iPhone

1. **Check if you have a recent iOS dev build:**
   ```bash
   cd /Users/sureshmenon/Desktop/nextjsapps/smartwave/smartwave-mobile
   eas build:list --platform ios --profile development --limit 1
   ```

2. **If you need a new build** (or want to rebuild with latest changes):
   ```bash
   eas build --platform ios --profile development
   ```
   Wait ~10-20 minutes for the build to complete.

3. **Install on iPhone:**
   - Go to [expo.dev](https://expo.dev) → your project → Builds
   - Click the latest iOS development build
   - Tap "Install" on your iPhone
   - Trust the developer certificate: Settings → General → VPN & Device Management → Trust

4. **Connect to your laptop:**
   - Ensure iPhone is on same Wi-Fi as laptop
   - Start dev server: `npm start`
   - Open the dev build app on iPhone
   - Enter URL: `exp://192.168.1.5:8081` (replace with your laptop IP)

### For Android

1. **Check existing Android dev build:**
   ```bash
   eas build:list --platform android --profile development --limit 1
   ```

2. **Build if needed:**
   ```bash
   eas build --platform android --profile development
   ```

3. **Install on Android:**
   - Download the `.apk` from Expo dashboard
   - Transfer to Android device
   - Enable "Install from unknown sources" in Android settings
   - Install the `.apk`

4. **Connect to laptop:**
   - Same Wi-Fi
   - `npm start` on laptop
   - Open dev build → enter `exp://192.168.1.5:8081`

---

## Step 5: Testing Checklist

### Passes Screen
- [ ] **Corporate tab** appears only for employees (`isEmployee === true`)
- [ ] **My Created tab** appears only for public admins (`isPublicAdmin === true`)
- [ ] **Upcoming tab** shows approved passes with future end dates
- [ ] **Available tab** shows active passes without membership
- [ ] **Requested tab** shows passes with `membershipStatus === "pending"`
- [ ] **Expired tab** shows approved passes with past end dates
- [ ] **Draft tab** shows passes with `status === "draft"`
- [ ] **Events** and **Access** sections display correctly
- [ ] **Status badges** (Approved, Pending, Rejected, Draft) show correctly
- [ ] **Pull to refresh** works

### Pass Detail Screen
- [ ] **DRAFT badge** shows when `pass.status === "draft"`
- [ ] **Request Access** button works for non-members
- [ ] **Pending/Approved/Rejected** status displays correctly
- [ ] **Add to Wallet** buttons disabled when pass is draft
- [ ] **Add to Apple Wallet** works (iOS only)
- [ ] **Add to Google Wallet** works (Android)

### API Testing
- [ ] Corporate passes only visible to employees of that company
- [ ] Retail users see all public passes (no location/date filtering)
- [ ] Approved passes appear even if expired
- [ ] `myPasses` array populated for public admins
- [ ] Membership requests create correctly

---

## Troubleshooting

### Mobile app can't connect to backend

**Symptoms:** API calls fail, "Network request failed" errors

**Solutions:**
1. **Check API URL:** Ensure `.env` has correct IP (not `localhost`)
2. **Check web app is running:** `curl http://192.168.1.5:3000/api/mobile/passes` (should return JSON)
3. **Check firewall:** macOS may block port 3000. Allow it in System Settings → Firewall
4. **Check Wi-Fi:** Laptop and device must be on same network

### Expo Go can't connect

**Symptoms:** "Unable to connect to Expo" or QR code doesn't work

**Solutions:**
1. **Use tunnel mode:**
   ```bash
   npm run start:tunnel
   ```
   This uses Expo's servers (slower but works across networks)

2. **Check port 8081:** Ensure it's not blocked by firewall

3. **Manual URL:** Enter `exp://YOUR_IP:8081` manually in Expo Go

### Development build won't load code

**Symptoms:** App opens but shows old code or errors

**Solutions:**
1. **Clear cache:** Shake device → "Reload"
2. **Check URL:** Ensure correct IP in dev build connection
3. **Restart dev server:** Stop `npm start`, then restart
4. **Rebuild:** If native changes, rebuild with `eas build`

---

## Quick Commands Reference

```bash
# Start web app (backend)
cd /Users/sureshmenon/Desktop/nextjsapps/smartwave/smartwave
npm run dev

# Start mobile app (frontend)
cd /Users/sureshmenon/Desktop/nextjsapps/smartwave/smartwave-mobile
npm start              # Normal mode
npm run start:tunnel   # Tunnel mode (works across networks)

# Check existing builds
eas build:list --platform ios --profile development
eas build:list --platform android --profile development

# Create new dev build
eas build --platform ios --profile development
eas build --platform android --profile development

# Find laptop IP
ipconfig getifaddr en0  # macOS
```

---

## Next Steps

After local testing passes:
1. **Commit changes** to `improve/ui` branch
2. **Test on physical devices** with development builds
3. **Merge to main** when ready
4. **Create production builds** for App Store / Play Store

---

## Notes

- **Development builds** are required for custom native modules (expo-dev-client, expo-apple-authentication, etc.)
- **Expo Go** is faster for quick UI testing but doesn't support all native features
- **Web browser** is fastest for quick checks but lacks native features
- **API URL** must be your laptop's IP (not `localhost`) for device testing
