/**
 * Renders the digital card to Skia canvases for export as PNG.
 * Includes photo, logo, QR, modern fonts, and full info. Share = one image (front+back stacked).
 */
import React from "react";
import { Platform } from "react-native";
import {
  Canvas,
  Fill,
  RoundedRect,
  Text,
  Image,
  Group,
  useImage,
  matchFont,
} from "@shopify/react-native-skia";
import type { Profile } from "../api/client";

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
const fontName = matchFont({ fontFamily, fontSize: 20, fontWeight: "700" });
const fontSub = matchFont({ fontFamily, fontSize: 13, fontStyle: "italic" });
const fontBody = matchFont({ fontFamily, fontSize: 13, fontWeight: "500" });
const fontSmall = matchFont({ fontFamily, fontSize: 11, fontWeight: "400" });
const fontLabel = matchFont({ fontFamily, fontSize: 10, fontWeight: "500" });

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
  const photoImage = useImage(profile.photo || null);
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
  const name =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.name || "";
  const qrSrc = qrFileUri || (qrBase64 ? `data:image/png;base64,${qrBase64}` : null);
  const qrImage = useImage(qrSrc);
  const logoImage = useImage(profile.companyLogo || null);
  const qrX = (width - QR_SIZE) / 2;
  const qrY = height / 2 - QR_SIZE / 2 - 8;

  return (
    <Canvas ref={ref} style={{ width, height }}>
      <Fill color={theme.back.backgroundColor} />
      <RoundedRect x={0} y={0} width={width} height={height} r={CARD_R} color={theme.back.backgroundColor} />
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
      {qrImage && (
        <RoundedRect
          x={qrX - 8}
          y={qrY - 8}
          width={QR_SIZE + 16}
          height={QR_SIZE + 16}
          r={10}
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
      <Text
        x={width / 2 - 58}
        y={height - PAD - 18}
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
  const photoImage = useImage(profile.photo || null);
  const logoImage = useImage(profile.companyLogo || null);
  const qrSrc = qrFileUri || (qrBase64 ? `data:image/png;base64,${qrBase64}` : null);
  const qrImage = useImage(qrSrc);
  const height = cardHeight * 2;
  const qrX = (width - QR_SIZE) / 2;
  const backQrY = cardHeight + cardHeight / 2 - QR_SIZE / 2 - 8;

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
          <RoundedRect x={qrX - 8} y={backQrY - 8} width={QR_SIZE + 16} height={QR_SIZE + 16} r={10} color="#fff" />
          <Image image={qrImage} x={qrX} y={backQrY} width={QR_SIZE} height={QR_SIZE} fit="contain" />
        </>
      )}
      <Text
        x={width / 2 - 58}
        y={height - PAD - 18}
        text="Scan to save contact"
        font={fontLabel}
        color="rgba(255,255,255,0.95)"
      />
    </Canvas>
  );
});
