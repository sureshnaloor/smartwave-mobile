# Google Sign-In – Redirect URI (fix "redirect_uri_mismatch")

If the app shows **"uri mismatch"** or **"redirect_uri_mismatch"** when using "Continue with Google", the redirect URI in **Google Cloud Console** must match **exactly** what the backend uses.

## Correct redirect URI

Use this **exact** value (no dot before `auth`, no trailing slash):

```
https://www.smartwave.name/api/mobile/auth/google/callback
```

**Wrong (will cause mismatch):**
- `https://www.smartwave.name/api/mobile/.auth/google/callback` (has `.auth` – wrong)
- `http://...` (must be `https` for production)
- Any typo like `https|` instead of `https:`

## Steps in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → your project.
2. **APIs & Services** → **Credentials**.
3. Open your **OAuth 2.0 Client ID** used for the web/mobile app (e.g. "Web client").
4. Under **Authorized redirect URIs**:
   - **Add** (if missing): `https://www.smartwave.name/api/mobile/auth/google/callback`
   - **Remove** any wrong entry such as: `.../api/mobile/.auth/google/callback`
5. **Save**.

## Backend (smartwave web app)

Ensure the backend uses the same base URL when building the callback:

- Either set **`MOBILE_GOOGLE_CALLBACK_BASE`** in the server env to `https://www.smartwave.name` (no trailing slash).
- Or leave it unset so the server uses the request origin (correct when the request hits `https://www.smartwave.name`).

After changing redirect URIs in Google Cloud, wait a few minutes and try sign-in again.

---

## App returns to sign-in after Google consent (404 on profile)

If Vercel logs show **GET /api/mobile/profile → 404** after a successful **GET /api/mobile/auth/google/callback → 307**, the backend was returning "Profile not found" because new Google users had a `users` record but no `profiles` record.

**Fix (backend, already applied):**

1. **Google callback** (`smartwave/app/api/mobile/auth/google/callback/route.ts`) now ensures a profile exists (via `generateAndUpdateShortUrl`) before redirecting with the token.
2. **GET /api/mobile/profile** creates a minimal profile on first request if missing, so valid tokens no longer get 404.

Redeploy the **smartwave** (Next.js) app to Vercel so these changes are live. No new mobile app build is required; version 3 will work once the backend is redeployed.
