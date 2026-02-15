/**
 * Renders the digital card to Skia canvases for export as PNG.
 * Includes photo, logo, QR, modern fonts, and full info. Share = one image (front+back stacked).
 * 
 * NOTE: Skia is only available on native platforms. On web, these components are stubs.
 */
import React from "react";
import { Platform } from "react-native";
import type { Profile } from "../api/client";

// Skia is only available on native platforms
const isWeb = Platform.OS === "web";

// Conditional Skia imports - only on native
let Canvas: any;
let Fill: any;
let RoundedRect: any;
let Text: any;
let Image: any;
let Group: any;
let useImage: any;
let matchFont: any;

if (!isWeb) {
  try {
    const skia = require("@shopify/react-native-skia");
    Canvas = skia.Canvas;
    Fill = skia.Fill;
    RoundedRect = skia.RoundedRect;
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
};

const CARD_R = 16;
const PAD = 20;
const PHOTO_SIZE = 70;
const LOGO_SIZE = 40;
const QR_SIZE = 120;

const fontFamily = Platform.select({ ios: "Helvetica Neue", default: "sans-serif-medium" });
// Only create fonts on native (Skia available)
const fontName = !isWeb && matchFont ? matchFont({ fontFamily, fontSize: 20, fontWeight: "700" }) : null;
const fontSub = !isWeb && matchFont ? matchFont({ fontFamily, fontSize: 13, fontStyle: "italic" }) : null;
const fontBody = !isWeb && matchFont ? matchFont({ fontFamily, fontSize: 13, fontWeight: "500" }) : null;
const fontSmall = !isWeb && matchFont ? matchFont({ fontFamily, fontSize: 11, fontWeight: "400" }) : null;
const fontLabel = !isWeb && matchFont ? matchFont({ fontFamily, fontSize: 10, fontWeight: "500" }) : null;

function truncate(str: string, max: number) {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + "…";
}

type CardFrontCanvasProps = {
  width: number;
  height: number;
  profile: Profile;
  theme: ThemeExport;
};

export const CardFrontCanvas = React.forwardRef<
  { makeImageSnapshotAsync: () => Promise<{ encodeToBase64: () => string }> },
  CardFrontCanvasProps
>(function CardFrontCanvas({ width, height, profile, theme }, ref) {
  // Web fallback: return a stub component
  if (isWeb || !Canvas) {
    React.useImperativeHandle(ref, () => ({
      makeImageSnapshotAsync: async () => ({
        encodeToBase64: () => "",
      }),
    }));
    return null;
  }
  const name =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.name || "";
  const workAddress = [
    profile.workStreet,
    profile.workCity,
    profile.workState,
    profile.workZipcode,
    profile.workCountry,
  ]
    .filter(Boolean)
    .join(", ");
  const initial = name.charAt(0).toUpperCase();
  const photoImage = useImage ? useImage(profile.photo || null) : null;
  let yName = PAD + 22;
  let yTitle = yName + 26;
  let yCompany = yTitle + (profile.title ? 18 : 0);
  let yAddress = yCompany + (profile.company ? 18 : 0);
  let yEmail = height - PAD - 50;
  let yWebsite = height - PAD - 34;

  return (
    <Canvas ref={ref} style={{ width, height }}>
      <Fill color={theme.front.backgroundColor} />
      <RoundedRect x={0} y={0} width={width} height={height} r={CARD_R} color={theme.front.backgroundColor} />
      <Text x={PAD} y={yName} text={truncate(name, 24)} font={fontName} color={theme.text.color} />
      {profile.title ? (
        <Text x={PAD} y={yTitle} text={truncate(profile.title, 28)} font={fontSub} color={theme.textMuted.color} />
      ) : null}
      {profile.company ? (
        <Text x={PAD} y={yCompany} text={truncate(profile.company, 28)} font={fontBody} color={theme.text.color} />
      ) : null}
      {workAddress ? (
        <Text x={PAD} y={yAddress} text={truncate(workAddress, 42)} font={fontSmall} color={theme.textMuted.color} />
      ) : null}
      {profile.workEmail ? (
        <Text x={PAD} y={yEmail} text={truncate(profile.workEmail, 36)} font={fontSmall} color={theme.textMuted.color} />
      ) : null}
      {profile.website ? (
        <Text x={PAD} y={yWebsite} text={truncate(profile.website, 36)} font={fontSmall} color={theme.textMuted.color} />
      ) : null}
      {/* Photo or initial circle */}
      <RoundedRect
        x={width - PAD - PHOTO_SIZE}
        y={(height - PHOTO_SIZE) / 2}
        width={PHOTO_SIZE}
        height={PHOTO_SIZE}
        r={PHOTO_SIZE / 2}
        color="rgba(255,255,255,0.25)"
      />
      {photoImage ? (
        <Group
          clip={{
            x: width - PAD - PHOTO_SIZE,
            y: (height - PHOTO_SIZE) / 2,
            width: PHOTO_SIZE,
            height: PHOTO_SIZE,
            r: PHOTO_SIZE / 2,
          }}
        >
          <Image
            image={photoImage}
            x={width - PAD - PHOTO_SIZE}
            y={(height - PHOTO_SIZE) / 2}
            width={PHOTO_SIZE}
            height={PHOTO_SIZE}
            fit="cover"
          />
        </Group>
      ) : (
        <Text
          x={width - PAD - PHOTO_SIZE + (PHOTO_SIZE - 20) / 2}
          y={(height - PHOTO_SIZE) / 2 + (PHOTO_SIZE - 24) / 2 + 20}
          text={initial}
          font={fontName}
          color={theme.text.color}
        />
      )}
    </Canvas>
  );
});

type CardBackCanvasProps = {
  width: number;
  height: number;
  profile: Profile;
  theme: ThemeExport;
  qrBase64: string | null;
  qrFileUri?: string | null;
};

export const CardBackCanvas = React.forwardRef<
  { makeImageSnapshotAsync: () => Promise<{ encodeToBase64: () => string }> },
  CardBackCanvasProps
>(function CardBackCanvas({ width, height, profile, theme, qrBase64, qrFileUri }, ref) {
  // Web fallback: return a stub component
  if (isWeb || !Canvas) {
    React.useImperativeHandle(ref, () => ({
      makeImageSnapshotAsync: async () => ({
        encodeToBase64: () => "",
      }),
    }));
    return null;
  }
  const name =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.name || "";
  const qrSrc = qrFileUri || (qrBase64 ? `data:image/png;base64,${qrBase64}` : null);
  const qrImage = useImage ? useImage(qrSrc) : null;
  const logoImage = useImage ? useImage(profile.companyLogo || null) : null;
  
  // Match visible card layout: left side (name + logo), right side (QR centered vertically)
  // Visible card: cardBackLeft (flex: 1, paddingRight: 12), cardBackRight (QR wrapper 120x120)
  // QR wrapper has padding: 8, borderRadius: 8, width/height: 120
  // Position QR on right side, accounting for left section taking ~60% of width (flex: 1)
  const LEFT_SECTION_WIDTH = width * 0.6; // Approximate left section width (flex: 1)
  const QR_WRAPPER_SIZE = QR_SIZE + 16; // 120 + 16 (8px padding each side)
  const QR_WRAPPER_X = LEFT_SECTION_WIDTH + 12; // Start after left section + paddingRight (12px)
  const qrX = QR_WRAPPER_X + 8; // QR image inside wrapper (8px padding)
  const qrY = (height - QR_SIZE) / 2; // Vertically centered
  const qrLabelY = qrY + QR_SIZE + 8; // Label below QR (8px margin like visible card)

  return (
    <Canvas ref={ref} style={{ width, height }}>
      <Fill color={theme.back.backgroundColor} />
      <RoundedRect x={0} y={0} width={width} height={height} r={CARD_R} color={theme.back.backgroundColor} />
      {/* Left side: name + logo */}
      <Text x={PAD} y={PAD + 22} text={truncate(name, 24)} font={fontName} color="#fff" />
      {logoImage && (
        <RoundedRect
          x={PAD}
          y={PAD + 28}
          width={LOGO_SIZE}
          height={LOGO_SIZE}
          r={6}
          color="#fff"
        />
      )}
      {logoImage && (
        <Image
          image={logoImage}
          x={PAD}
          y={PAD + 28}
          width={LOGO_SIZE}
          height={LOGO_SIZE}
          fit="contain"
        />
      )}
      {/* Right side: QR code (white background wrapper + QR image) */}
      {qrImage && (
        <RoundedRect
          x={QR_WRAPPER_X}
          y={qrY - 8}
          width={QR_WRAPPER_SIZE}
          height={QR_WRAPPER_SIZE}
          r={8}
          color="#fff"
        />
      )}
      {qrImage && (
        <Image
          image={qrImage}
          x={qrX}
          y={qrY}
          width={QR_SIZE}
          height={QR_SIZE}
          fit="contain"
        />
      )}
      {/* Label below QR, centered under QR wrapper */}
      <Text
        x={QR_WRAPPER_X + QR_WRAPPER_SIZE / 2 - 58}
        y={qrLabelY}
        text="Scan to save contact"
        font={fontLabel}
        color="rgba(255,255,255,0.95)"
      />
    </Canvas>
  );
});

type CombinedCardCanvasProps = {
  width: number;
  cardHeight: number;
  profile: Profile;
  theme: ThemeExport;
  qrBase64: string | null;
  qrFileUri?: string | null;
};

export const CombinedCardCanvas = React.forwardRef<
  { makeImageSnapshotAsync: () => Promise<{ encodeToBase64: () => string }> },
  CombinedCardCanvasProps
>(function CombinedCardCanvas({ width, cardHeight, profile, theme, qrBase64, qrFileUri }, ref) {
  // Web fallback: return a stub component
  if (isWeb || !Canvas) {
    React.useImperativeHandle(ref, () => ({
      makeImageSnapshotAsync: async () => ({
        encodeToBase64: () => "",
      }),
    }));
    return null;
  }
  const name =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.name || "";
  const workAddress = [
    profile.workStreet,
    profile.workCity,
    profile.workState,
    profile.workZipcode,
    profile.workCountry,
  ]
    .filter(Boolean)
    .join(", ");
  const initial = name.charAt(0).toUpperCase();
  const photoImage = useImage ? useImage(profile.photo || null) : null;
  const logoImage = useImage ? useImage(profile.companyLogo || null) : null;
  const qrSrc = qrFileUri || (qrBase64 ? `data:image/png;base64,${qrBase64}` : null);
  const qrImage = useImage ? useImage(qrSrc) : null;
  const height = cardHeight * 2;
  // Match CardBackCanvas layout: QR on right side
  const LEFT_SECTION_WIDTH = width * 0.6;
  const QR_WRAPPER_SIZE = QR_SIZE + 16;
  const QR_WRAPPER_X = LEFT_SECTION_WIDTH + 12;
  const qrX = QR_WRAPPER_X + 8;
  const backQrY = cardHeight + (cardHeight - QR_SIZE) / 2;
  const backQrLabelY = backQrY + QR_SIZE + 8;

  return (
    <Canvas ref={ref} style={{ width, height }}>
      <Fill color={theme.front.backgroundColor} />
      <RoundedRect x={0} y={0} width={width} height={cardHeight} r={CARD_R} color={theme.front.backgroundColor} />
      <Text x={PAD} y={PAD + 22} text={truncate(name, 24)} font={fontName} color={theme.text.color} />
      {profile.title ? (
        <Text x={PAD} y={PAD + 48} text={truncate(profile.title, 28)} font={fontSub} color={theme.textMuted.color} />
      ) : null}
      {profile.company ? (
        <Text x={PAD} y={PAD + (profile.title ? 66 : 48)} text={truncate(profile.company, 28)} font={fontBody} color={theme.text.color} />
      ) : null}
      {workAddress ? (
        <Text x={PAD} y={PAD + (profile.company ? 84 : 66)} text={truncate(workAddress, 42)} font={fontSmall} color={theme.textMuted.color} />
      ) : null}
      {profile.workEmail ? (
        <Text x={PAD} y={cardHeight - PAD - 50} text={truncate(profile.workEmail, 36)} font={fontSmall} color={theme.textMuted.color} />
      ) : null}
      {profile.website ? (
        <Text x={PAD} y={cardHeight - PAD - 34} text={truncate(profile.website, 36)} font={fontSmall} color={theme.textMuted.color} />
      ) : null}
      <RoundedRect
        x={width - PAD - PHOTO_SIZE}
        y={(cardHeight - PHOTO_SIZE) / 2}
        width={PHOTO_SIZE}
        height={PHOTO_SIZE}
        r={PHOTO_SIZE / 2}
        color="rgba(255,255,255,0.25)"
      />
      {photoImage ? (
        <Group
          clip={{
            x: width - PAD - PHOTO_SIZE,
            y: (cardHeight - PHOTO_SIZE) / 2,
            width: PHOTO_SIZE,
            height: PHOTO_SIZE,
            r: PHOTO_SIZE / 2,
          }}
        >
          <Image
            image={photoImage}
            x={width - PAD - PHOTO_SIZE}
            y={(cardHeight - PHOTO_SIZE) / 2}
            width={PHOTO_SIZE}
            height={PHOTO_SIZE}
            fit="cover"
          />
        </Group>
      ) : (
        <Text
          x={width - PAD - PHOTO_SIZE + (PHOTO_SIZE - 20) / 2}
          y={(cardHeight - PHOTO_SIZE) / 2 + (PHOTO_SIZE - 24) / 2 + 20}
          text={initial}
          font={fontName}
          color={theme.text.color}
        />
      )}
      {/* Back half */}
      <RoundedRect x={0} y={cardHeight} width={width} height={cardHeight} r={CARD_R} color={theme.back.backgroundColor} />
      <Text x={PAD} y={cardHeight + PAD + 22} text={truncate(name, 24)} font={fontName} color="#fff" />
      {logoImage && (
        <>
          <RoundedRect x={PAD} y={cardHeight + PAD + 28} width={LOGO_SIZE} height={LOGO_SIZE} r={6} color="#fff" />
          <Image image={logoImage} x={PAD} y={cardHeight + PAD + 28} width={LOGO_SIZE} height={LOGO_SIZE} fit="contain" />
        </>
      )}
      {qrImage && (
        <>
          <RoundedRect x={QR_WRAPPER_X} y={backQrY - 8} width={QR_WRAPPER_SIZE} height={QR_WRAPPER_SIZE} r={8} color="#fff" />
          <Image image={qrImage} x={qrX} y={backQrY} width={QR_SIZE} height={QR_SIZE} fit="contain" />
        </>
      )}
      <Text
        x={QR_WRAPPER_X + QR_WRAPPER_SIZE / 2 - 58}
        y={backQrLabelY}
        text="Scan to save contact"
        font={fontLabel}
        color="rgba(255,255,255,0.95)"
      />
    </Canvas>
  );
});
