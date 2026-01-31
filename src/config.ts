/**
 * Backend URL – use your deployed web app.
 * For local testing with a device/simulator, use your machine's IP (e.g. http://192.168.1.x:3000).
 */
export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ?? "https://www.smartwave.name";

/** Google OAuth Web client ID (same as web app). Used for Google sign-in. */
export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";

export const getWalletAppleUrl = (shorturl: string) =>
  `${API_BASE}/api/wallet/apple?shorturl=${encodeURIComponent(shorturl)}`;

export const getWalletGoogleUrl = (shorturl: string) =>
  `${API_BASE}/api/wallet/google?shorturl=${encodeURIComponent(shorturl)}`;
