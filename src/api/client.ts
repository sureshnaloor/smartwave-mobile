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

export async function getProfile(token: string): Promise<Profile> {
  const res = await fetchWithHint(`${API_BASE}/api/mobile/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseJsonResponse<Profile & { error?: string }>(res);
  if (!res.ok) throw new Error(data.error ?? "Failed to load profile");
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
