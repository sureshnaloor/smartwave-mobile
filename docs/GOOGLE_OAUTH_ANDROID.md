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
