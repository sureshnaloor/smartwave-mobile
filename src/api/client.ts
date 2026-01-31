import { API_BASE } from "../config";

const NETWORK_ERROR_HINT = `Check: (1) Server running at ${API_BASE}? (2) Same Wi‑Fi / network? (3) Firewall allowing the port?`;

/** Wrap fetch; turn "Network request failed" into a clearer error. */
async function fetchWithHint(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Network request failed") || msg.includes("Failed to fetch") || (e instanceof TypeError && msg === "Network request failed")) {
      throw new Error(`Network request failed. ${NETWORK_ERROR_HINT}`);
    }
    throw e;
  }
}

/** Parse response as JSON; avoid "unexpected end of input" when body is empty or invalid. */
async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text || !text.trim()) {
    throw new Error(
      res.ok
        ? "Server returned an empty response. Check that the API is running and /api/mobile/auth returns JSON."
        : `Request failed (${res.status}): empty response`
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `Invalid response from server (not JSON). Status: ${res.status}. Check API_BASE (${API_BASE}) and that the endpoint returns JSON.`
    );
  }
}

export type Profile = {
  _id?: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  name: string;
  userEmail: string;
  shorturl?: string;
  title?: string;
  company?: string;
  companyLogo?: string;
  photo?: string;
  workEmail?: string;
  personalEmail?: string;
  mobile?: string;
  workPhone?: string;
  workStreet?: string;
  workCity?: string;
  workState?: string;
  workZipcode?: string;
  workCountry?: string;
  website?: string;
  linkedin?: string;
  /** When set, profile was created by an admin; user cannot edit, only view/share. */
  createdByAdminId?: string;
  [key: string]: unknown;
};

export async function login(
  email: string,
  password: string
): Promise<{ token: string; user: { id: string; email: string; name: string | null; image: string | null } }> {
  const res = await fetchWithHint(`${API_BASE}/api/mobile/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
  const data = await parseJsonResponse<{ token: string; user: { id: string; email: string; name: string | null; image: string | null }; error?: string }>(res);
  if (!res.ok) throw new Error(data.error ?? "Login failed");
  return data;
}

export type LoginGooglePayload =
  | { idToken: string }
  | { code: string; redirectUri: string };

/** Backend redirect flow: get Google auth URL; after sign-in, backend redirects to returnUrl?token=JWT */
export async function getGoogleAuthStart(
  returnUrl: string,
  codeChallenge: string,
  codeVerifier: string
): Promise<{ authUrl: string }> {
  const res = await fetchWithHint(`${API_BASE}/api/mobile/auth/google/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      returnUrl,
      code_challenge: codeChallenge,
      code_verifier: codeVerifier,
    }),
  });
  const data = await parseJsonResponse<{ authUrl: string; error?: string }>(res);
  if (!res.ok) throw new Error(data.error ?? "Failed to get auth URL");
  return data;
}

export async function loginWithApple(identityToken: string): Promise<{
  token: string;
  user: { id: string; email: string; name: string | null; image: string | null };
}> {
  const res = await fetchWithHint(`${API_BASE}/api/mobile/auth/apple`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identityToken }),
  });
  const data = await parseJsonResponse<{
    token: string;
    user: { id: string; email: string; name: string | null; image: string | null };
    error?: string;
  }>(res);
  if (!res.ok) throw new Error(data.error ?? "Apple sign-in failed");
  return data;
}

export async function loginWithGoogle(
  payload: LoginGooglePayload
): Promise<{ token: string; user: { id: string; email: string; name: string | null; image: string | null } }> {
  const res = await fetchWithHint(`${API_BASE}/api/mobile/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJsonResponse<{
    token: string;
    user: { id: string; email: string; name: string | null; image: string | null };
    error?: string;
  }>(res);
  if (!res.ok) throw new Error(data.error ?? "Google sign-in failed");
  return data;
}

export async function getProfile(token: string): Promise<Profile> {
  if (__DEV__ && (!token || token.length < 50)) {
    console.warn("[getProfile] Token looks too short; may be truncated. Length:", token?.length ?? 0);
  }
  const res = await fetchWithHint(`${API_BASE}/api/mobile/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseJsonResponse<Profile & { error?: string }>(res);
  if (!res.ok) {
    if (res.status === 401) {
      const hint = data.error ?? "Unauthorized";
      if (__DEV__) {
        console.warn("[getProfile] 401 response body:", data);
        if (hint.includes("missing") || hint.includes("token")) {
          console.warn("Hint: ensure the app captures the JWT from the redirect URL and sends Authorization: Bearer <token>.");
        }
      }
      throw new Error(hint);
    }
    throw new Error(data.error ?? "Failed to load profile");
  }
  return data;
}

export async function updateProfile(
  token: string,
  updates: Partial<Profile>
): Promise<void> {
  const res = await fetchWithHint(`${API_BASE}/api/mobile/profile`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });
  const data = await parseJsonResponse<{ error?: string }>(res);
  if (!res.ok) throw new Error(data.error ?? "Failed to update profile");
}
