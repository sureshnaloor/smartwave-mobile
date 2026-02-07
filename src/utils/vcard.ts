import type { Profile } from "../api/client";

/**
 * Generate vCard format string from profile data
 */
export function generateVCardData(profile: Profile): string {
  const nameParts = (profile.name || "").split(" ");
  const firstName = profile.firstName || nameParts[0] || "";
  const lastName = profile.lastName || nameParts.slice(1).join(" ") || "";

  const vCardData = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${profile.name || ""}`,
    `N:${lastName};${firstName};${profile.middleName || ""};;`,
    profile.title ? `TITLE:${profile.title}` : "",
    profile.company ? `ORG:${profile.company}` : "",
    profile.workEmail || profile.userEmail ? `EMAIL;type=WORK:${profile.workEmail || profile.userEmail}` : "",
    profile.personalEmail ? `EMAIL;type=HOME:${profile.personalEmail}` : "",
    profile.workPhone ? `TEL;type=WORK:${profile.workPhone}` : "",
    profile.mobile ? `TEL;type=CELL:${profile.mobile}` : "",
    profile.homePhone ? `TEL;type=HOME:${profile.homePhone}` : "",
    profile.website ? `URL:${profile.website}` : "",
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\n");

  return vCardData;
}
