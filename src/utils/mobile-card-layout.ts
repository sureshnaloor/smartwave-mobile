import type { Profile } from "../api/client";

export const MOBILE_THEME = {
  gold: "#D4AF37",
  silver: "#C0C0C0",
  muted: "#8B919A",
  workAddress: "#8ECAE6",
  homeAddress: "#7EC8A3",
  phone: "#D4A574",
  email: "#B4C7E7",
  personalEmail: "#9BB5D6",
  website: "#C9B896",
  social: "#B8A2D4",
  frontBg: "#0d0d14",
  backBg: "#08080e",
  bevelLight: "rgba(255,255,255,0.55)",
  bevelDark: "rgba(0,0,0,0.65)",
  frameFill: "#252530",
  logoBorderGold: "#D4AF37",
  logoBorderSilver: "#DCE2EA",
  logoBorderMid: "#B8A878",
} as const;

export const MOBILE_ADDRESS_MAX_LINES = 3;

/** Split a comma-separated address across up to `maxLines` lines at comma boundaries. */
export function formatAddressAtCommas(address: string, maxLines = MOBILE_ADDRESS_MAX_LINES): string {
  const trimmed = address.trim();
  if (!trimmed) return trimmed;
  const parts = trimmed.split(/,\s*/).filter(Boolean);
  if (parts.length <= 1) return trimmed;
  if (parts.length <= maxLines) return parts.join(",\n");

  const lines: string[] = [];
  let index = 0;
  for (let line = 0; line < maxLines; line++) {
    const linesLeft = maxLines - line;
    const partsLeft = parts.length - index;
    const count = Math.ceil(partsLeft / linesLeft);
    const chunk = parts.slice(index, index + count);
    if (chunk.length === 0) break;
    lines.push(chunk.join(", "));
    index += count;
  }
  return lines.join("\n");
}

export type MobileCardFieldId =
  | "workAddress"
  | "homeAddress"
  | "mobile"
  | "workPhone"
  | "homePhone"
  | "workEmail"
  | "personalEmail"
  | "website"
  | "linkedin"
  | "twitter"
  | "facebook"
  | "instagram"
  | "youtube";

export type MobileCardField = {
  id: MobileCardFieldId;
  value: string;
  color: string;
  maxLines: number;
  exportIcon: string;
};

export type MobileCardLayout = {
  pad: number;
  nameSize: number;
  titleSize: number;
  companySize: number;
  detailSize: number;
  lineGap: number;
  blockGap: number;
  contactGap: number;
  logoAfterGap: number;
  iconSize: number;
  photoSize: number;
  logoSize: number;
  qrSize: number;
  addressLines: number;
  fieldCount: number;
  frontCount: number;
  backCount: number;
  spreadVertically: boolean;
};

export type MobileProfileInput = Pick<
  Profile,
  | "title"
  | "company"
  | "workStreet"
  | "workCity"
  | "workState"
  | "workZipcode"
  | "workCountry"
  | "homeStreet"
  | "homeCity"
  | "homeState"
  | "homeZipcode"
  | "homeCountry"
  | "mobile"
  | "workPhone"
  | "homePhone"
  | "workEmail"
  | "personalEmail"
  | "website"
  | "linkedin"
  | "twitter"
  | "facebook"
  | "instagram"
  | "youtube"
> & {
  workAddress?: string;
  homeAddress?: string;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function getWorkAddress(profile: MobileProfileInput): string {
  const fromParts = [
    profile.workStreet,
    profile.workCity,
    profile.workState,
    profile.workZipcode,
    profile.workCountry,
  ]
    .map(asString)
    .filter(Boolean)
    .join(", ");
  return fromParts || asString(profile.workAddress);
}

export function getHomeAddress(profile: MobileProfileInput): string {
  const fromParts = [
    profile.homeStreet,
    profile.homeCity,
    profile.homeState,
    profile.homeZipcode,
    profile.homeCountry,
  ]
    .map(asString)
    .filter(Boolean)
    .join(", ");
  return fromParts || asString(profile.homeAddress);
}

function pushSocialFields(fields: MobileCardField[], profile: MobileProfileInput) {
  for (const [id, value] of [
    ["linkedin", profile.linkedin],
    ["twitter", profile.twitter],
    ["facebook", profile.facebook],
    ["instagram", profile.instagram],
    ["youtube", profile.youtube],
  ] as const) {
    const text = asString(value);
    if (text) {
      fields.push({
        id,
        value: text,
        color: MOBILE_THEME.social,
        maxLines: 1,
        exportIcon: "◦",
      });
    }
  }
}

/** Work / professional fields shown on the card front. */
export function getMobileFrontFields(profile: MobileProfileInput): MobileCardField[] {
  const fields: MobileCardField[] = [];
  const workAddress = getWorkAddress(profile);

  if (workAddress) {
    fields.push({
      id: "workAddress",
      value: formatAddressAtCommas(workAddress),
      color: MOBILE_THEME.workAddress,
      maxLines: MOBILE_ADDRESS_MAX_LINES,
      exportIcon: "⌖",
    });
  }
  if (asString(profile.mobile)) {
    fields.push({
      id: "mobile",
      value: asString(profile.mobile),
      color: MOBILE_THEME.phone,
      maxLines: 1,
      exportIcon: "☎",
    });
  }
  if (asString(profile.workPhone)) {
    fields.push({
      id: "workPhone",
      value: asString(profile.workPhone),
      color: MOBILE_THEME.phone,
      maxLines: 1,
      exportIcon: "☏",
    });
  }
  if (asString(profile.workEmail)) {
    fields.push({
      id: "workEmail",
      value: asString(profile.workEmail),
      color: MOBILE_THEME.email,
      maxLines: 1,
      exportIcon: "@",
    });
  }
  if (asString(profile.website)) {
    fields.push({
      id: "website",
      value: asString(profile.website),
      color: MOBILE_THEME.website,
      maxLines: 1,
      exportIcon: "◉",
    });
  }
  return fields;
}

/** Personal / home fields shown on the card back below the logo. */
export function getMobileBackFields(profile: MobileProfileInput): MobileCardField[] {
  const fields: MobileCardField[] = [];
  const homeAddress = getHomeAddress(profile);

  if (homeAddress) {
    fields.push({
      id: "homeAddress",
      value: formatAddressAtCommas(homeAddress),
      color: MOBILE_THEME.homeAddress,
      maxLines: MOBILE_ADDRESS_MAX_LINES,
      exportIcon: "⌂",
    });
  }
  if (asString(profile.personalEmail)) {
    fields.push({
      id: "personalEmail",
      value: asString(profile.personalEmail),
      color: MOBILE_THEME.personalEmail,
      maxLines: 1,
      exportIcon: "✉",
    });
  }
  if (asString(profile.homePhone)) {
    fields.push({
      id: "homePhone",
      value: asString(profile.homePhone),
      color: MOBILE_THEME.phone,
      maxLines: 1,
      exportIcon: "☏",
    });
  }
  pushSocialFields(fields, profile);
  return fields;
}

/** @deprecated Use getMobileFrontFields or getMobileBackFields */
export function getMobileCardFields(profile: MobileProfileInput): MobileCardField[] {
  return [...getMobileFrontFields(profile), ...getMobileBackFields(profile)];
}

/** Line height for Skia export — matches visual line spacing in the on-screen card. */
export function exportDetailLineHeight(layout: MobileCardLayout): number {
  return layout.detailSize + Math.max(4, layout.lineGap);
}

export function getFieldDisplayLines(field: MobileCardField): number {
  if (field.maxLines <= 1) return 1;
  return Math.max(1, field.value.split("\n").filter(Boolean).length);
}

function fieldRowHeight(layout: MobileCardLayout, field: MobileCardField): number {
  const lineH = exportDetailLineHeight(layout);
  if (field.maxLines > 1) {
    const lines = getFieldDisplayLines(field);
    return lines * lineH;
  }
  return lineH;
}

function contactGapForCount(count: number, scale: number): number {
  if (count <= 2) return 12 * scale;
  if (count <= 4) return 9 * scale;
  if (count <= 7) return 6 * scale;
  return 4 * scale;
}

/** Density is derived after counting fields on each side. */
export function getMobileCardLayout(profile: MobileProfileInput, scale = 1): MobileCardLayout {
  const frontFields = getMobileFrontFields(profile);
  const backFields = getMobileBackFields(profile);
  const frontCount = frontFields.length;
  const backCount = backFields.length;
  const detailCount = Math.max(frontCount, backCount);
  const identityCount = [profile.title, profile.company].filter((v) => asString(v)).length;
  const fieldCount = frontCount + backCount + identityCount + 1;
  const contactGap = contactGapForCount(detailCount, scale);

  if (detailCount <= 3) {
    return {
      pad: 14 * scale,
      nameSize: 22 * scale,
      titleSize: 13 * scale,
      companySize: 15 * scale,
      detailSize: 11 * scale,
      lineGap: 5 * scale,
      blockGap: 10 * scale,
      contactGap,
      logoAfterGap: 24 * scale,
      iconSize: 12 * scale,
      photoSize: 84 * scale,
      logoSize: 52 * scale,
      qrSize: 118 * scale,
      addressLines: MOBILE_ADDRESS_MAX_LINES,
      fieldCount,
      frontCount,
      backCount,
      spreadVertically: true,
    };
  }

  if (detailCount <= 5) {
    return {
      pad: 12 * scale,
      nameSize: 19 * scale,
      titleSize: 12 * scale,
      companySize: 14 * scale,
      detailSize: 10 * scale,
      lineGap: 4 * scale,
      blockGap: 8 * scale,
      contactGap,
      logoAfterGap: 22 * scale,
      iconSize: 11 * scale,
      photoSize: 76 * scale,
      logoSize: 46 * scale,
      qrSize: 110 * scale,
      addressLines: MOBILE_ADDRESS_MAX_LINES,
      fieldCount,
      frontCount,
      backCount,
      spreadVertically: true,
    };
  }

  if (detailCount <= 7) {
    return {
      pad: 11 * scale,
      nameSize: 17 * scale,
      titleSize: 11 * scale,
      companySize: 12 * scale,
      detailSize: 9 * scale,
      lineGap: 3 * scale,
      blockGap: 6 * scale,
      contactGap,
      logoAfterGap: 20 * scale,
      iconSize: 10 * scale,
      photoSize: 68 * scale,
      logoSize: 42 * scale,
      qrSize: 102 * scale,
      addressLines: MOBILE_ADDRESS_MAX_LINES,
      fieldCount,
      frontCount,
      backCount,
      spreadVertically: frontCount <= 4,
    };
  }

  return {
    pad: 10 * scale,
    nameSize: 15 * scale,
    titleSize: 10 * scale,
    companySize: 11 * scale,
    detailSize: 8 * scale,
    lineGap: 2 * scale,
    blockGap: 5 * scale,
    contactGap,
    logoAfterGap: 18 * scale,
    iconSize: 9 * scale,
    photoSize: 60 * scale,
    logoSize: 38 * scale,
    qrSize: 96 * scale,
    addressLines: MOBILE_ADDRESS_MAX_LINES,
    fieldCount,
    frontCount,
    backCount,
    spreadVertically: false,
  };
}

export type MobileFrontFieldPosition = MobileCardField & { y: number };

export type MobileFrontLayout = {
  yName: number;
  yTitle: number;
  yCompany: number;
  textX: number;
  iconX: number;
  fields: MobileFrontFieldPosition[];
};

export type MobileBackFieldPosition = MobileCardField & { y: number };

export type MobileBackLayout = {
  logoX: number;
  logoY: number;
  textX: number;
  iconX: number;
  fields: MobileBackFieldPosition[];
};

function layoutDetailFields(
  layout: MobileCardLayout,
  detailFields: MobileCardField[],
  startY: number
): MobileFrontFieldPosition[] {
  let cursor = startY;
  const fields: MobileFrontFieldPosition[] = [];
  for (let index = 0; index < detailFields.length; index++) {
    if (index > 0) cursor += layout.contactGap;
    fields.push({ ...detailFields[index], y: cursor });
    cursor += fieldRowHeight(layout, detailFields[index]);
  }
  return fields;
}

export function getMobileFrontLayout(
  height: number,
  layout: MobileCardLayout,
  profile: MobileProfileInput
): MobileFrontLayout {
  const detailFields = getMobileFrontFields(profile);
  const { pad, nameSize, blockGap } = layout;
  const textX = pad + layout.iconSize + 5 * (layout.iconSize / 11);
  const iconX = pad;

  const identitySections: { key: string; height: number; gapBefore: number }[] = [
    { key: "name", height: nameSize, gapBefore: 0 },
  ];
  if (asString(profile.title)) {
    identitySections.push({ key: "title", height: layout.titleSize, gapBefore: blockGap });
  }
  if (asString(profile.company)) {
    identitySections.push({ key: "company", height: layout.companySize, gapBefore: blockGap });
  }

  const identityHeight = identitySections.reduce(
    (sum, section, index) => sum + (index > 0 ? section.gapBefore : 0) + section.height,
    0
  );
  const contactHeight = detailFields.reduce((sum, field, index) => {
    const gap = index === 0 ? 0 : layout.contactGap;
    return sum + gap + fieldRowHeight(layout, field);
  }, 0);
  const totalHeight =
    identityHeight + (detailFields.length > 0 ? layout.blockGap : 0) + contactHeight;

  let cursor = Math.max(pad + nameSize * 0.85, (height - totalHeight) / 2 + nameSize * 0.85);

  const result: Record<string, number> = {};
  for (const section of identitySections) {
    cursor += section.gapBefore;
    result[section.key] = cursor;
    cursor += section.height;
  }

  const fields = layoutDetailFields(layout, detailFields, cursor + layout.blockGap);

  return {
    yName: result.name ?? pad + nameSize,
    yTitle: result.title ?? 0,
    yCompany: result.company ?? 0,
    textX,
    iconX,
    fields,
  };
}

export function getLogoFrameHeight(layout: MobileCardLayout): number {
  return layout.logoSize + 6;
}

export function getMobileBackLayout(
  height: number,
  width: number,
  layout: MobileCardLayout,
  profile: MobileProfileInput,
  hasLogo: boolean
): MobileBackLayout {
  const detailFields = getMobileBackFields(profile);
  const { pad, logoAfterGap } = layout;
  const textX = pad + layout.iconSize + 5 * (layout.iconSize / 11);
  const iconX = pad;
  const logoX = pad;
  const logoY = pad;

  let cursor = pad + (hasLogo ? getLogoFrameHeight(layout) + logoAfterGap : 0);
  const fields: MobileBackFieldPosition[] = [];

  for (let index = 0; index < detailFields.length; index++) {
    if (index > 0) cursor += layout.contactGap;
    fields.push({ ...detailFields[index], y: cursor });
    cursor += fieldRowHeight(layout, detailFields[index]);
  }

  return { logoX, logoY, textX, iconX, fields };
}

export function maxCharsForField(
  field: MobileCardField,
  layout: MobileCardLayout,
  contentWidth: number
): number {
  const charsPerLine = Math.max(16, Math.floor(contentWidth / (layout.detailSize * 0.52)));
  return charsPerLine * field.maxLines;
}

export function backContentWidth(width: number, layout: MobileCardLayout, scale = 1): number {
  return width * 0.58 - layout.pad - 8 * scale;
}
