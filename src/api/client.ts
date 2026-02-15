import { API_BASE } from "../config";

const NETWORK_ERROR_HINT = `Check: (1) Server running at ${API_BASE}? (2) Same Wi‑Fi / network? (3) Firewall allowing the port?`;
const REQUEST_TIMEOUT = 15000; // 15 seconds

/** Create a timeout promise that rejects after specified milliseconds */
function timeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms);
  });
}

/** Wrap fetch with timeout and better error handling */
async function fetchWithHint(url: string, init?: RequestInit): Promise<Response> {
  try {
    // Race between fetch and timeout
    const fetchPromise = fetch(url, init);
    const timeoutPromiseInstance = timeoutPromise(REQUEST_TIMEOUT);
    
    const response = await Promise.race([fetchPromise, timeoutPromiseInstance]);
    return response as Response;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    
    // Handle timeout specifically
    if (msg.includes("timeout") || msg.includes("Timeout")) {
      throw new Error(`Network request timed out. ${NETWORK_ERROR_HINT}`);
    }
    
    // Handle network errors
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

// Passes API
export type PassType = "event" | "access";
export type PassStatus = "draft" | "active";
export type MembershipStatus = "pending" | "approved" | "rejected" | null;

export type Pass = {
  _id: string;
  name: string;
  description?: string;
  type: PassType;
  status: PassStatus;
  category?: string;
  location?: {
    name?: string;
    lat?: number;
    lng?: number;
    address?: string;
  };
  dateStart?: string;
  dateEnd?: string;
  createdByAdminId: string;
  createdAt?: string;
  updatedAt?: string;
  membershipStatus?: MembershipStatus;
  membershipId?: string | null;
  /** Only present for passes returned in myPasses (public admin's created passes). */
  pendingMembershipsCount?: number;
};

export type PassesResponse = {
  passes: Pass[];
  corporate: Pass[];
  isEmployee: boolean;
  isPublicAdmin: boolean;
  /** Passes created by the current user (public admin). Only set when isPublicAdmin is true. */
  myPasses?: Pass[];
  filters: {
    category: string;
    location: { lat: number; lng: number; radius: number } | null;
  };
};

export async function getPasses(token: string, category?: string): Promise<PassesResponse> {
  const url = new URL(`${API_BASE}/api/mobile/passes`);
  if (category && category !== "all") {
    url.searchParams.set("category", category);
  }
  const res = await fetchWithHint(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseJsonResponse<PassesResponse & { error?: string }>(res);
  if (!res.ok) throw new Error(data.error ?? "Failed to load passes");
  return data;
}

export async function getPass(token: string, passId: string): Promise<{ pass: Pass; isOwner: boolean }> {
  const res = await fetchWithHint(`${API_BASE}/api/mobile/passes/${passId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseJsonResponse<{ pass: Pass; isOwner: boolean; error?: string }>(res);
  if (!res.ok) throw new Error(data.error ?? "Failed to load pass");
  return { pass: data.pass, isOwner: data.isOwner };
}

export async function requestPassAccess(token: string, passId: string): Promise<{ success: boolean; membership: any }> {
  const res = await fetchWithHint(`${API_BASE}/api/mobile/passes/${passId}/join`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseJsonResponse<{ success: boolean; membership: any; error?: string }>(res);
  if (!res.ok) throw new Error(data.error ?? "Failed to request access");
  return data;
}

export async function getPassMembership(token: string, passId: string): Promise<{ membership: any | null }> {
  const res = await fetchWithHint(`${API_BASE}/api/mobile/passes/${passId}/join`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseJsonResponse<{ membership: any | null; error?: string }>(res);
  if (!res.ok) throw new Error(data.error ?? "Failed to check membership");
  return data;
}

// Notifications API
export type Notification = {
  _id: string;
  type: string;
  title: string;
  content: string;
  eventDate?: string;
  createdAt: string;
  isRead: boolean;
};

export async function getNotifications(token: string, includeRead: boolean = false): Promise<Notification[]> {
  const url = new URL(`${API_BASE}/api/mobile/notifications`);
  if (includeRead) {
    url.searchParams.set("includeRead", "true");
  }
  const res = await fetchWithHint(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseJsonResponse<{ notifications: Notification[]; error?: string }>(res);
  if (!res.ok) throw new Error(data.error ?? "Failed to load notifications");
  return data.notifications;
}

export async function markNotificationRead(token: string, notificationId: string): Promise<void> {
  const res = await fetchWithHint(`${API_BASE}/api/mobile/notifications/${notificationId}/read`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseJsonResponse<{ error?: string }>(res);
  if (!res.ok) throw new Error(data.error ?? "Failed to mark notification as read");
}
