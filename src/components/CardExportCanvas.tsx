/**
 * Renders the digital card to Skia canvases for export as PNG.
 * Supports scaled export dimensions (print / high-res) via the `scale` prop.
 */
import React from "react";
import { Platform } from "react-native";
import type { Profile } from "../api/client";
import {
  backContentWidth,
  getMobileBackLayout,
  getMobileCardLayout,
  getMobileFrontLayout,
  getHomeAddress,
  getWorkAddress,
  formatAddressAtCommas,
  exportDetailLineHeight,
  maxCharsForField,
  MOBILE_THEME,
  type MobileCardField,
  type MobileCardLayout,
} from "../utils/mobile-card-layout";

const isWeb = Platform.OS === "web";

let Canvas: typeof import("@shopify/react-native-skia").Canvas;
let Fill: typeof import("@shopify/react-native-skia").Fill;
let RoundedRect: typeof import("@shopify/react-native-skia").RoundedRect;
let Rect: typeof import("@shopify/react-native-skia").Rect;
let Circle: typeof import("@shopify/react-native-skia").Circle;
let Text: typeof import("@shopify/react-native-skia").Text;
let Image: typeof import("@shopify/react-native-skia").Image;
let Group: typeof import("@shopify/react-native-skia").Group;
let useImage: typeof import("@shopify/react-native-skia").useImage;
let matchFont: typeof import("@shopify/react-native-skia").matchFont;

if (!isWeb) {
  try {
    const skia = require("@shopify/react-native-skia");
    Canvas = skia.Canvas;
    Fill = skia.Fill;
    RoundedRect = skia.RoundedRect;
    Rect = skia.Rect;
    Circle = skia.Circle;
    Text = skia.Text;
    Image = skia.Image;
    Group = skia.Group;
    useImage = skia.useImage;
    matchFont = skia.matchFont;
  } catch (e) {
    console.warn("[CardExportCanvas] Skia not available:", e);
  }
}

export type ThemeExport = {
  front: { backgroundColor: string };
  back: { backgroundColor: string };
  text: { color: string };
  textMuted: { color: string };
  backText?: { color: string };
  variant?: "default" | "mobile";
  nameColor?: string;
  companyColor?: string;
};

export type CardSnapshotRef = {
  makeImageSnapshotAsync: () => Promise<{ encodeToBase64: (format?: unknown, quality?: number) => string }>;
};

const CARD_R = 16;
const PAD = 20;
const PHOTO_SIZE = 70;
const LOGO_SIZE = 40;
const QR_SIZE = 120;

const fontFamily = Platform.select({ ios: "Helvetica Neue", default: "sans-serif-medium" });

function makeFonts(scale: number) {
  if (isWeb || !matchFont) {
    return { fontName: null, fontSub: null, fontBody: null, fontSmall: null, fontLabel: null };
  }
  return {
    fontName: matchFont({ fontFamily, fontSize: 20 * scale, fontWeight: "700" }),
    fontSub: matchFont({ fontFamily, fontSize: 13 * scale, fontStyle: "italic" }),
    fontBody: matchFont({ fontFamily, fontSize: 13 * scale, fontWeight: "500" }),
    fontSmall: matchFont({ fontFamily, fontSize: 11 * scale, fontWeight: "400" }),
    fontLabel: matchFont({ fontFamily, fontSize: 10 * scale, fontWeight: "500" }),
  };
}

function makeMobileFonts(layout: ReturnType<typeof getMobileCardLayout>) {
  if (isWeb || !matchFont) {
    return { fontName: null, fontSub: null, fontBody: null, fontSmall: null, fontLabel: null };
  }
  return {
    fontName: matchFont({ fontFamily, fontSize: layout.nameSize, fontWeight: "700" }),
    fontSub: matchFont({ fontFamily, fontSize: layout.titleSize, fontStyle: "italic" }),
    fontBody: matchFont({ fontFamily, fontSize: layout.companySize, fontWeight: "600" }),
    fontSmall: matchFont({ fontFamily, fontSize: layout.detailSize, fontWeight: "400" }),
    fontLabel: matchFont({ fontFamily, fontSize: layout.detailSize, fontWeight: "500" }),
  };
}

function LogoGradientFrame3D({
  x,
  y,
  size,
  s,
  children,
}: {
  x: number;
  y: number;
  size: number;
  s: number;
  children: React.ReactNode;
}) {
  const depth = 5 * s;
  const goldBand = 4 * s;
  const silverBand = 2 * s;
  const innerBand = 2 * s;
  const innerSize = size - 2 * (goldBand + silverBand + innerBand);

  return (
    <>
      <Rect x={x + depth} y={y + depth} width={size} height={size} color="rgba(0,0,0,0.5)" />
      <Rect x={x} y={y} width={size} height={size} color={MOBILE_THEME.logoBorderGold} />
      <Rect
        x={x + goldBand}
        y={y + goldBand}
        width={size - goldBand * 2}
        height={size - goldBand * 2}
        color={MOBILE_THEME.logoBorderSilver}
      />
      <Rect
        x={x + goldBand + silverBand}
        y={y + goldBand + silverBand}
        width={size - 2 * (goldBand + silverBand)}
        height={size - 2 * (goldBand + silverBand)}
        color={MOBILE_THEME.logoBorderMid}
      />
      <Rect
        x={x + goldBand + silverBand + innerBand}
        y={y + goldBand + silverBand + innerBand}
        width={innerSize}
        height={innerSize}
        color={MOBILE_THEME.frameFill}
      />
      {children}
    </>
  );
}

function CircularFrame3D({
  x,
  y,
  size,
  s,
  children,
}: {
  x: number;
  y: number;
  size: number;
  s: number;
  children: React.ReactNode;
}) {
  const r = size / 2;
  const cx = x + r;
  const cy = y + r;
  const depth = 5 * s;
  const inset = 3 * s;
  return (
    <>
      <Circle cx={cx + depth} cy={cy + depth} r={r} color="rgba(0,0,0,0.5)" />
      <Circle cx={cx} cy={cy} r={r} color={MOBILE_THEME.frameFill} />
      <Circle cx={cx - r * 0.2} cy={cy - r * 0.2} r={r - inset} color={MOBILE_THEME.bevelLight} opacity={0.35} />
      <Circle cx={cx + r * 0.15} cy={cy + r * 0.15} r={r - inset} color={MOBILE_THEME.bevelDark} opacity={0.4} />
      {children}
    </>
  );
}

function truncate(str: string, max: number) {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + "…";
}

function renderMobileFieldText(
  field: MobileCardField,
  layout: MobileCardLayout,
  contentWidth: number,
  textX: number,
  y: number,
  font: ReturnType<typeof makeMobileFonts>["fontSmall"],
  iconFont: ReturnType<typeof import("@shopify/react-native-skia").matchFont> | null,
  iconX: number
) {
  const lineHeight = exportDetailLineHeight(layout);
  const charsPerLine = Math.max(16, Math.floor(contentWidth / (layout.detailSize * 0.52)));
  const lines =
    field.maxLines > 1
      ? field.value.split("\n").filter(Boolean).slice(0, field.maxLines)
      : [truncate(field.value, maxCharsForField(field, layout, contentWidth))];

  return (
    <Group key={field.id}>
      <Text x={iconX} y={y} text={field.exportIcon} font={iconFont} color={field.color} />
      {lines.map((line, index) => (
        <Text
          key={`${field.id}-${index}`}
          x={textX}
          y={y + index * lineHeight}
          text={truncate(line, charsPerLine)}
          font={font}
          color={field.color}
        />
      ))}
    </Group>
  );
}

function skiaLineHeight(fontSize: number, scale: number): number {
  return fontSize + Math.max(6 * scale, Math.round(fontSize * 0.35));
}

function buildStandardFrontLayout(
  profile: Profile,
  scale: number,
  workAddress: string
) {
  const s = scale;
  const pad = PAD * s;
  const nameSize = 20 * s;
  const subSize = 13 * s;
  const smallSize = 11 * s;
  const smallLineHeight = skiaLineHeight(smallSize, s);
  const fieldGap = 10 * s;
  const identityGap = 8 * s;

  const formattedWorkAddress = workAddress ? formatAddressAtCommas(workAddress) : "";
  const addressLines = formattedWorkAddress ? formattedWorkAddress.split("\n").filter(Boolean) : [];

  let y = pad + nameSize;

  const yName = y;
  y += identityGap;

  let yTitle = 0;
  if (profile.title) {
    yTitle = y + subSize;
    y += subSize + identityGap;
  }

  let yCompany = 0;
  if (profile.company) {
    yCompany = y + subSize;
    y += subSize + fieldGap;
  }

  let yAddress = 0;
  if (addressLines.length > 0) {
    yAddress = y + smallSize;
    y += addressLines.length * smallLineHeight + fieldGap;
  }

  let yEmail = 0;
  if (profile.workEmail) {
    yEmail = y + smallSize;
    y += smallLineHeight + fieldGap;
  }

  let yWebsite = 0;
  if (profile.website) {
    yWebsite = y + smallSize;
  }

  return {
    pad,
    yName,
    yTitle,
    yCompany,
    yAddress,
    addressLines,
    yEmail,
    yWebsite,
    smallLineHeight,
    smallSize,
  };
}

function buildStandardBackLayout(
  profile: Profile,
  scale: number,
  hasLogo: boolean,
  homeAddress: string
) {
  const s = scale;
  const pad = PAD * s;
  const logoSize = LOGO_SIZE * s;
  const smallSize = 11 * s;
  const smallLineHeight = skiaLineHeight(smallSize, s);
  const fieldGap = 10 * s;
  const logoGap = 12 * s;

  const formattedHomeAddress = homeAddress ? formatAddressAtCommas(homeAddress) : "";
  const addressLines = formattedHomeAddress ? formattedHomeAddress.split("\n").filter(Boolean) : [];

  let y = pad;
  const logoY = hasLogo ? y : 0;
  if (hasLogo) {
    y += logoSize + logoGap;
  }

  let homeAddressY = 0;
  if (addressLines.length > 0) {
    homeAddressY = y + smallSize;
    y += addressLines.length * smallLineHeight + fieldGap;
  }

  let personalEmailY = 0;
  if (profile.personalEmail) {
    personalEmailY = y + smallSize;
    y += smallLineHeight + fieldGap;
  }

  let homePhoneY = 0;
  if (profile.homePhone) {
    homePhoneY = y + smallSize;
  }

  return {
    pad,
    logoY,
    logoSize,
    homeAddressY,
    addressLines,
    personalEmailY,
    homePhoneY,
    smallLineHeight,
  };
}

function renderAddressLines(
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
  font: ReturnType<typeof makeFonts>["fontSmall"],
  color: string,
  maxChars = 48
) {
  return lines.map((line, index) => (
    <Text
      key={`addr-${index}`}
      x={x}
      y={y + index * lineHeight}
      text={truncate(line, maxChars)}
      font={font}
      color={color}
    />
  ));
}

function useStubRef(ref: React.ForwardedRef<CardSnapshotRef>) {
  React.useImperativeHandle(ref, () => ({
    makeImageSnapshotAsync: async () => ({
      encodeToBase64: () => "",
    }),
  }));
}

type CardFrontCanvasProps = {
  width: number;
  height: number;
  profile: Profile;
  theme: ThemeExport;
  scale?: number;
};

function CardFrontCanvasInner(
  { width, height, profile, theme, scale = 1 }: CardFrontCanvasProps,
  ref: React.Ref<CardSnapshotRef>
) {
  if (isWeb || !Canvas) {
    useStubRef(ref);
    return null;
  }

  const s = scale;
  const pad = PAD * s;
  const photoSize = PHOTO_SIZE * s;
  const cardR = CARD_R * s;
  const fonts = makeFonts(s);
  const name =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.name || "";
  const workAddress = getWorkAddress(profile);
  const initial = name.charAt(0).toUpperCase();
  const photoImage = useImage(profile.photo || null);

  if (theme.variant === "mobile") {
    const layout = getMobileCardLayout(profile, s);
    const mobileFonts = makeMobileFonts(layout);
    const contentWidth = width - layout.pad * 2 - layout.photoSize - 16 * s;
    const frontLayout = getMobileFrontLayout(height, layout, profile);
    const { yName, yTitle, yCompany, textX, iconX, fields } = frontLayout;
    const nameColor = theme.nameColor ?? MOBILE_THEME.gold;
    const companyColor = theme.companyColor ?? MOBILE_THEME.silver;
    const photoX = width - layout.pad - layout.photoSize;
    const photoY = (height - layout.photoSize) / 2;
    const innerPad = 3 * s;
    const iconFont = matchFont
      ? matchFont({ fontFamily, fontSize: layout.iconSize, fontWeight: "700" })
      : null;

    return (
      <Canvas ref={ref} style={{ width, height }}>
        <Fill color={theme.front.backgroundColor} />
        <RoundedRect x={0} y={0} width={width} height={height} r={cardR} color={theme.front.backgroundColor} />
        <Text x={layout.pad} y={yName} text={truncate(name, 26)} font={mobileFonts.fontName} color={nameColor} />
        {profile.title ? (
          <Text
            x={layout.pad}
            y={yTitle}
            text={truncate(profile.title, 32)}
            font={mobileFonts.fontSub}
            color={theme.textMuted.color}
          />
        ) : null}
        {profile.company ? (
          <Text
            x={layout.pad}
            y={yCompany}
            text={truncate(profile.company, 32)}
            font={mobileFonts.fontBody}
            color={companyColor}
          />
        ) : null}
        {fields.map((field) => (
          <React.Fragment key={field.id}>
            {renderMobileFieldText(
              field,
              layout,
              contentWidth,
              textX,
              field.y,
              mobileFonts.fontSmall,
              iconFont,
              iconX
            )}
          </React.Fragment>
        ))}
        <CircularFrame3D x={photoX} y={photoY} size={layout.photoSize} s={s}>
          {photoImage ? (
            <Group
              clip={{
                x: photoX + innerPad + 1,
                y: photoY + innerPad + 1,
                width: layout.photoSize - (innerPad + 1) * 2,
                height: layout.photoSize - (innerPad + 1) * 2,
              }}
            >
              <Image
                image={photoImage}
                x={photoX + innerPad + 1}
                y={photoY + innerPad + 1}
                width={layout.photoSize - (innerPad + 1) * 2}
                height={layout.photoSize - (innerPad + 1) * 2}
                fit="contain"
              />
            </Group>
          ) : (
            <Text
              x={photoX + (layout.photoSize - layout.nameSize * 0.6) / 2}
              y={photoY + layout.photoSize / 2 + layout.nameSize * 0.2}
              text={initial}
              font={mobileFonts.fontName}
              color={nameColor}
            />
          )}
        </CircularFrame3D>
      </Canvas>
    );
  }

  const frontLayout = buildStandardFrontLayout(profile, s, workAddress);

  return (
    <Canvas ref={ref} style={{ width, height }}>
      <Fill color={theme.front.backgroundColor} />
      <RoundedRect x={0} y={0} width={width} height={height} r={cardR} color={theme.front.backgroundColor} />
      <Text x={frontLayout.pad} y={frontLayout.yName} text={truncate(name, 24)} font={fonts.fontName} color={theme.text.color} />
      {profile.title ? (
        <Text x={frontLayout.pad} y={frontLayout.yTitle} text={truncate(profile.title, 28)} font={fonts.fontSub} color={theme.textMuted.color} />
      ) : null}
      {profile.company ? (
        <Text x={frontLayout.pad} y={frontLayout.yCompany} text={truncate(profile.company, 28)} font={fonts.fontBody} color={theme.text.color} />
      ) : null}
      {frontLayout.addressLines.length > 0 ? (
        renderAddressLines(
          frontLayout.addressLines,
          frontLayout.pad,
          frontLayout.yAddress,
          frontLayout.smallLineHeight,
          fonts.fontSmall,
          theme.textMuted.color
        )
      ) : null}
      {profile.workEmail ? (
        <Text
          x={frontLayout.pad}
          y={frontLayout.yEmail}
          text={truncate(profile.workEmail, 36)}
          font={fonts.fontSmall}
          color={theme.textMuted.color}
        />
      ) : null}
      {profile.website ? (
        <Text
          x={frontLayout.pad}
          y={frontLayout.yWebsite}
          text={truncate(profile.website, 36)}
          font={fonts.fontSmall}
          color={theme.textMuted.color}
        />
      ) : null}
      <RoundedRect
        x={width - pad - photoSize}
        y={(height - photoSize) / 2}
        width={photoSize}
        height={photoSize}
        r={photoSize / 2}
        color="rgba(255,255,255,0.25)"
      />
      {photoImage ? (
        <Group
          clip={{
            x: width - pad - photoSize,
            y: (height - photoSize) / 2,
            width: photoSize,
            height: photoSize,
            r: photoSize / 2,
          }}
        >
          <Image
            image={photoImage}
            x={width - pad - photoSize}
            y={(height - photoSize) / 2}
            width={photoSize}
            height={photoSize}
            fit="contain"
          />
        </Group>
      ) : (
        <Text
          x={width - pad - photoSize + (photoSize - 20 * s) / 2}
          y={(height - photoSize) / 2 + (photoSize - 24 * s) / 2 + 20 * s}
          text={initial}
          font={fonts.fontName}
          color={theme.text.color}
        />
      )}
    </Canvas>
  );
}

export const CardFrontCanvas = React.forwardRef(CardFrontCanvasInner);

type CardBackCanvasProps = {
  width: number;
  height: number;
  profile: Profile;
  theme: ThemeExport;
  qrBase64: string | null;
  qrFileUri?: string | null;
  scale?: number;
};

function CardBackCanvasInner(
  { width, height, profile, theme, qrBase64, qrFileUri, scale = 1 }: CardBackCanvasProps,
  ref: React.Ref<CardSnapshotRef>
) {
  if (isWeb || !Canvas) {
    useStubRef(ref);
    return null;
  }

  const s = scale;
  const pad = PAD * s;
  const logoSize = LOGO_SIZE * s;
  const qrSize = QR_SIZE * s;
  const cardR = CARD_R * s;
  const fonts = makeFonts(s);
  const backTextColor = theme.backText?.color ?? "#ffffff";
  const name =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.name || "";
  const qrSrc = qrFileUri || (qrBase64 ? `data:image/png;base64,${qrBase64}` : null);
  const qrImage = useImage(qrSrc);
  const logoImage = useImage(profile.companyLogo || null);

  if (theme.variant === "mobile") {
    const layout = getMobileCardLayout(profile, s);
    const mobileFonts = makeMobileFonts(layout);
    const backLayout = getMobileBackLayout(height, width, layout, profile, !!logoImage);
    const backWidth = backContentWidth(width, layout, s);
    const qrSize = layout.qrSize;
    const qrPad = 6 * s;
    const qrWrapperSize = qrSize + qrPad * 2;
    const qrWrapperX = width - layout.pad - qrWrapperSize;
    const qrY = (height - qrSize) / 2;
    const iconFont = matchFont
      ? matchFont({ fontFamily, fontSize: layout.iconSize, fontWeight: "700" })
      : null;

    return (
      <Canvas ref={ref} style={{ width, height }}>
        <Fill color={theme.back.backgroundColor} />
        <RoundedRect x={0} y={0} width={width} height={height} r={cardR} color={theme.back.backgroundColor} />
        {logoImage ? (
          <LogoGradientFrame3D x={backLayout.logoX} y={backLayout.logoY} size={layout.logoSize} s={s}>
            <Image
              image={logoImage}
              x={backLayout.logoX + 8 * s}
              y={backLayout.logoY + 8 * s}
              width={layout.logoSize - 16 * s}
              height={layout.logoSize - 16 * s}
              fit="contain"
            />
          </LogoGradientFrame3D>
        ) : null}
        {backLayout.fields.map((field) => (
          <React.Fragment key={field.id}>
            {renderMobileFieldText(
              field,
              layout,
              backWidth,
              backLayout.textX,
              field.y,
              mobileFonts.fontSmall,
              iconFont,
              backLayout.iconX
            )}
          </React.Fragment>
        ))}
        {qrImage ? (
          <>
            <Rect
              x={qrWrapperX}
              y={qrY - qrPad}
              width={qrWrapperSize}
              height={qrWrapperSize}
              color="#ffffff"
            />
            <Rect
              x={qrWrapperX}
              y={qrY - qrPad}
              width={qrWrapperSize}
              height={3 * s}
              color={MOBILE_THEME.bevelLight}
            />
            <Rect
              x={qrWrapperX}
              y={qrY - qrPad}
              width={3 * s}
              height={qrWrapperSize}
              color={MOBILE_THEME.bevelLight}
            />
            <Rect
              x={qrWrapperX + qrWrapperSize - 3 * s}
              y={qrY - qrPad}
              width={3 * s}
              height={qrWrapperSize}
              color={MOBILE_THEME.bevelDark}
            />
            <Rect
              x={qrWrapperX}
              y={qrY + qrSize + qrPad - 3 * s}
              width={qrWrapperSize}
              height={3 * s}
              color={MOBILE_THEME.bevelDark}
            />
            <Image image={qrImage} x={qrWrapperX + qrPad} y={qrY} width={qrSize} height={qrSize} fit="contain" />
          </>
        ) : null}
        <Text
          x={qrWrapperX + qrWrapperSize / 2 - 62 * s}
          y={qrY + qrSize + qrPad + layout.detailSize}
          text="Scan to save contact"
          font={mobileFonts.fontLabel}
          color={MOBILE_THEME.silver}
        />
      </Canvas>
    );
  }

  const leftSectionWidth = width * 0.58;
  const qrWrapperSize = qrSize + 16 * s;
  const qrWrapperX = leftSectionWidth + 12 * s;
  const qrX = qrWrapperX + 8 * s;
  const qrY = (height - qrSize) / 2;
  const qrLabelY = qrY + qrSize + 8 * s;
  const homeAddress = getHomeAddress(profile);
  const backLayout = buildStandardBackLayout(profile, s, !!logoImage, homeAddress);

  return (
    <Canvas ref={ref} style={{ width, height }}>
      <Fill color={theme.back.backgroundColor} />
      <RoundedRect x={0} y={0} width={width} height={height} r={cardR} color={theme.back.backgroundColor} />
      {logoImage ? (
        <>
          <RoundedRect x={backLayout.pad} y={backLayout.logoY} width={backLayout.logoSize} height={backLayout.logoSize} r={6 * s} color="#fff" />
          <Image image={logoImage} x={backLayout.pad} y={backLayout.logoY} width={backLayout.logoSize} height={backLayout.logoSize} fit="contain" />
        </>
      ) : null}
      {backLayout.addressLines.length > 0
        ? renderAddressLines(
            backLayout.addressLines,
            backLayout.pad,
            backLayout.homeAddressY,
            backLayout.smallLineHeight,
            fonts.fontSmall,
            backTextColor
          )
        : null}
      {profile.personalEmail ? (
        <Text
          x={backLayout.pad}
          y={backLayout.personalEmailY}
          text={truncate(profile.personalEmail, 36)}
          font={fonts.fontSmall}
          color={backTextColor}
        />
      ) : null}
      {profile.homePhone ? (
        <Text
          x={backLayout.pad}
          y={backLayout.homePhoneY}
          text={truncate(profile.homePhone, 24)}
          font={fonts.fontSmall}
          color={backTextColor}
        />
      ) : null}
      {qrImage ? (
        <>
          <RoundedRect
            x={qrWrapperX}
            y={qrY - 8 * s}
            width={qrWrapperSize}
            height={qrWrapperSize}
            r={8 * s}
            color="#fff"
          />
          <Image image={qrImage} x={qrX} y={qrY} width={qrSize} height={qrSize} fit="contain" />
        </>
      ) : null}
      <Text
        x={qrWrapperX + qrWrapperSize / 2 - 58 * s}
        y={qrLabelY}
        text="Scan to save contact"
        font={fonts.fontLabel}
        color="rgba(255,255,255,0.95)"
      />
    </Canvas>
  );
}

export const CardBackCanvas = React.forwardRef(CardBackCanvasInner);
