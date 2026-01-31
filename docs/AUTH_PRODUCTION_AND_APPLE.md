# Google Auth: Production vs Dev & Sign in with Apple

## Will the Google auth struggles recur in production?

**No.** The issues you hit in dev are mostly **dev-only**:

| Issue | In dev | In production |
|-------|--------|----------------|
| **auth.expo.io proxy** | We bypassed it (backend redirect). Same in prod – no proxy. |
| **Redirect URI** | ngrok URL, localhost, MOBILE_GOOGLE_CALLBACK_BASE | One stable URL: `https://yourdomain.com/api/mobile/auth/google/callback` |
| **NEXTAUTH_SECRET** | Must match in one process; ngrok/local can confuse which env is loaded | One server, one env (e.g. Vercel/host env) – one secret. |
| **Token capture** | Same flow; we fixed regex/trim/deep link | Same flow; no simulator quirks. |

**Production checklist:**

1. **Backend:** Set `NEXTAUTH_SECRET` in your host’s env (e.g. Vercel → Project → Settings → Environment Variables). Do **not** set `MOBILE_GOOGLE_CALLBACK_BASE` in production (or set it to your production URL) so the callback uses your real domain.
2. **Google Console:** Add **Authorized redirect URI**: `https://yourdomain.com/api/mobile/auth/google/callback`.
3. **App:** Set `EXPO_PUBLIC_API_URL=https://yourdomain.com` for production builds.

Once that’s done, production is typically **more stable** than dev (no ngrok, one backend URL, one secret).

---

## Apple Sign-In (App Store requirement)

If your app offers **Google** (or any other third‑party) sign-in, **Apple requires** you to also offer **Sign in with Apple** in the same flow ([App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/#sign-in-with-apple)).

The app now includes Sign in with Apple. You still need to:

1. **Apple Developer:** Enable “Sign in with Apple” for your App ID (Certificates, Identifiers & Profiles).
2. **Backend:** Set `APPLE_CLIENT_ID` to your iOS app’s **bundle ID** (e.g. `host.exp.Exponent` for Expo Go, or your own e.g. `com.yourcompany.smartwave` for production).
3. **Expo:** For production builds, add the `expo-apple-authentication` plugin and `ios.usesAppleSignIn: true` in app.json (already added if we implemented it).

Apple Sign-In uses the **native** flow (no redirect URL, no ngrok). The app gets an identity token from Apple and sends it to your backend; the backend verifies it and returns your JWT. So it’s simpler than Google for production.
