import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Animated,
  Dimensions,
  Alert,
  Linking,
  Platform,
  Modal,
  TextInput,
  Switch,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getProfile, type Profile } from "../api/client";
import { generateVCardData } from "../utils/vcard";
import { generateQRBase64 } from "../utils/qrExport";
import QRCode from "react-native-qrcode-svg";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { CardFrontCanvas, CardBackCanvas, type ThemeExport } from "../components/CardExportCanvas";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import {
  DEFAULT_CARD_EXPORT_HEIGHT,
  DEFAULT_CARD_EXPORT_WIDTH,
  dimensionsFromHeight,
  dimensionsFromWidth,
  getDisplayExportDimensions,
  safeCardFilename,
  scaleForExport,
} from "../utils/card-export";
import {
  hasRequiredProfileFields,
  REQUIRED_PROFILE_FIELDS_MESSAGE,
} from "../utils/profile-completeness";
import {
  getMobileBackFields,
  getMobileCardLayout,
  getMobileFrontFields,
  getHomeAddress,
  getWorkAddress,
  formatAddressAtCommas,
  MOBILE_ADDRESS_MAX_LINES,
  MOBILE_THEME,
  type MobileCardField,
  type MobileCardFieldId,
  type MobileCardLayout,
} from "../utils/mobile-card-layout";
import { getWalletAppleUrl, getWalletGoogleUrl } from "../config";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 48;
const CARD_HEIGHT = (CARD_WIDTH * 600) / 1050;

type Theme = "smartwave" | "minimal" | "onyx" | "modern" | "professional" | "creative" | "mobile";

const themeStyles: Record<Theme, ThemeExport> = {
  smartwave: {
    front: { backgroundColor: "#3b82f6" },
    back: { backgroundColor: "#1e40af" },
    text: { color: "#ffffff" },
    textMuted: { color: "#e0e7ff" },
    backText: { color: "#ffffff" },
  },
  minimal: {
    front: { backgroundColor: "#f5f1e8" },
    back: { backgroundColor: "#ede9e0" },
    text: { color: "#1f2937" },
    textMuted: { color: "#4b5563" },
    backText: { color: "#1f2937" },
  },
  onyx: {
    front: { backgroundColor: "#1f2937" },
    back: { backgroundColor: "#111827" },
    text: { color: "#ffffff" },
    textMuted: { color: "#d1d5db" },
    backText: { color: "#ffffff" },
  },
  modern: {
    front: { backgroundColor: "#ffffff" },
    back: { backgroundColor: "#0f172a" },
    text: { color: "#0f172a" },
    textMuted: { color: "#475569" },
    backText: { color: "#f8fafc" },
  },
  professional: {
    front: { backgroundColor: "#ffffff" },
    back: { backgroundColor: "#1e3a8a" },
    text: { color: "#1e3a8a" },
    textMuted: { color: "#3b82f6" },
    backText: { color: "#ffffff" },
  },
  creative: {
    front: { backgroundColor: "#7c3aed" },
    back: { backgroundColor: "#111827" },
    text: { color: "#ffffff" },
    textMuted: { color: "rgba(255,255,255,0.9)" },
    backText: { color: "#ffffff" },
  },
  mobile: {
    front: { backgroundColor: MOBILE_THEME.frontBg },
    back: { backgroundColor: MOBILE_THEME.backBg },
    text: { color: MOBILE_THEME.gold },
    textMuted: { color: MOBILE_THEME.muted },
    backText: { color: MOBILE_THEME.gold },
    variant: "mobile",
    nameColor: MOBILE_THEME.gold,
    companyColor: MOBILE_THEME.silver,
  },
};

const THEME_LABELS: Record<Theme, string> = {
  smartwave: "SmartWave",
  minimal: "Minimal",
  onyx: "Onyx",
  modern: "Modern",
  professional: "Professional",
  creative: "Creative",
  mobile: "Mobile",
};

const MOBILE_FIELD_ICONS: Record<MobileCardFieldId, keyof typeof Ionicons.glyphMap> = {
  workAddress: "location-sharp",
  homeAddress: "home-sharp",
  mobile: "phone-portrait-outline",
  workPhone: "call-outline",
  homePhone: "call-outline",
  workEmail: "mail",
  personalEmail: "mail-open-outline",
  website: "globe-outline",
  linkedin: "logo-linkedin",
  twitter: "logo-twitter",
  facebook: "logo-facebook",
  instagram: "logo-instagram",
  youtube: "logo-youtube",
};

function MobileContactFields({
  fields,
  layout,
}: {
  fields: MobileCardField[];
  layout: MobileCardLayout;
}) {
  if (fields.length === 0) return null;
  return (
    <View style={{ gap: layout.contactGap }}>
      {fields.map((field) => (
        <View key={field.id} style={styles.mobileContactRow}>
          <Ionicons
            name={MOBILE_FIELD_ICONS[field.id]}
            size={layout.iconSize}
            color={field.color}
            style={styles.mobileContactIcon}
          />
          <Text
            style={[
              styles.mobileContactText,
              {
                fontSize: layout.detailSize,
                lineHeight: field.maxLines > 1 ? layout.detailSize + 3 : layout.detailSize + 2,
                color: field.color,
              },
              field.maxLines > 1 ? styles.mobileAddressMultiline : null,
            ]}
            numberOfLines={field.maxLines > 1 ? MOBILE_ADDRESS_MAX_LINES : 1}
          >
            {field.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function MobileCirclePhoto({
  size,
  uri,
  initial,
  initialColor,
  initialSize,
}: {
  size: number;
  uri?: string;
  initial: string;
  initialColor: string;
  initialSize: number;
}) {
  const inner = size - 8;
  return (
    <View style={{ width: size + 6, height: size + 6, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          position: "absolute",
          top: 5,
          left: 5,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: "rgba(0,0,0,0.55)",
        }}
      />
      <View style={[styles.mobilePhotoFrame3d, { width: size, height: size, borderRadius: size / 2 }]}>
        <View
          style={{
            width: inner,
            height: inner,
            borderRadius: inner / 2,
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.2)",
          }}
        >
          {uri ? (
            <Image source={{ uri }} style={{ width: inner, height: inner }} resizeMode="contain" />
          ) : (
            <View
              style={{
                width: inner,
                height: inner,
                borderRadius: inner / 2,
                backgroundColor: "rgba(255,255,255,0.06)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: initialSize, fontWeight: "700", color: initialColor }}>{initial}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function MobileLogoFrame({ size, uri, afterGap }: { size: number; uri: string; afterGap: number }) {
  const imageSize = Math.max(0, size - 14);
  return (
    <View style={[styles.mobileLogoFrameOuter, { marginBottom: afterGap }]}>
      <View style={[styles.mobileLogoFrameGold, { width: size, height: size }]}>
        <View style={styles.mobileLogoFrameSilver}>
          <View style={styles.mobileLogoFrameInner}>
            <Image
              source={{ uri }}
              style={{ width: imageSize, height: imageSize }}
              resizeMode="contain"
            />
          </View>
        </View>
      </View>
    </View>
  );
}

export default function DigitalCardScreen() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFront, setShowFront] = useState(true);
  const [currentTheme, setCurrentTheme] = useState<Theme>("smartwave");
  const [busy, setBusy] = useState(false);
  const [qrBase64ForExport, setQrBase64ForExport] = useState<string | null>(null);
  const [qrFileUriForExport, setQrFileUriForExport] = useState<string | null>(null);
  const [exportScale, setExportScale] = useState(1);
  const [captureWidth, setCaptureWidth] = useState(CARD_WIDTH);
  const [captureHeight, setCaptureHeight] = useState(CARD_HEIGHT);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [exportWidth, setExportWidth] = useState(DEFAULT_CARD_EXPORT_WIDTH);
  const [exportHeight, setExportHeight] = useState(DEFAULT_CARD_EXPORT_HEIGHT);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);

  const flipAnim = useRef(new Animated.Value(0)).current;
  const frontCanvasRef = useRef<{ makeImageSnapshotAsync: () => Promise<{ encodeToBase64: () => string }> }>(null);
  const backCanvasRef = useRef<{ makeImageSnapshotAsync: () => Promise<{ encodeToBase64: () => string }> }>(null);

  const actionDisabled = !hasRequiredProfileFields(profile);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("Not authenticated. Please sign in.");
      setProfile(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getProfile(token)
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load profile");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const flipCard = () => {
    const toValue = showFront ? 180 : 0;
    Animated.timing(flipAnim, {
      toValue,
      duration: 500,
      useNativeDriver: true,
    }).start();
    setShowFront(!showFront);
  };

  const cycleTheme = () => {
    const themes: Theme[] = ["smartwave", "minimal", "onyx", "modern", "professional", "creative", "mobile"];
    const nextIndex = (themes.indexOf(currentTheme) + 1) % themes.length;
    setCurrentTheme(themes[nextIndex]);
  };

  const showIncompleteAlert = () => {
    Alert.alert("Profile incomplete", REQUIRED_PROFILE_FIELDS_MESSAGE);
  };

  const ensureFileUri = (path: string): string => {
    if (Platform.OS === "android" && !path.startsWith("file://")) {
      return `file://${path}`;
    }
    return path;
  };

  const prepareQrForExport = useCallback(async () => {
    if (!profile) throw new Error("No profile");
    const vCardData = generateVCardData(profile);
    const qrBase64 = await generateQRBase64(vCardData, 200);
    setQrBase64ForExport(qrBase64);
    if (Platform.OS === "android") {
      const cacheDir = FileSystem.cacheDirectory ?? "";
      const qrPath = `${cacheDir}smartwave_qr_export_${Date.now()}.png`;
      await FileSystem.writeAsStringAsync(qrPath, qrBase64, { encoding: "base64" });
      setQrFileUriForExport(qrPath);
    }
    await new Promise((r) => setTimeout(r, 500));
  }, [profile]);

  const clearQrExport = () => {
    setQrBase64ForExport(null);
    setQrFileUriForExport(null);
    setExportScale(1);
    setCaptureWidth(CARD_WIDTH);
    setCaptureHeight(CARD_HEIGHT);
  };

  const captureSide = async (side: "front" | "back", width: number, height: number) => {
    setCaptureWidth(width);
    setCaptureHeight(height);
    setExportScale(scaleForExport(width, CARD_WIDTH));
    await new Promise((r) => setTimeout(r, 400));

    const ref = side === "front" ? frontCanvasRef : backCanvasRef;
    const snap = await ref.current?.makeImageSnapshotAsync();
    if (!snap) throw new Error("Could not generate card image");
    return snap.encodeToBase64();
  };

  const writePngToCache = async (base64: string, filename: string) => {
    const cacheDir = FileSystem.cacheDirectory ?? "";
    const path = `${cacheDir}${filename}`;
    await FileSystem.writeAsStringAsync(path, base64, { encoding: "base64" });
    return path;
  };

  const openDownloadDialog = () => {
    if (actionDisabled || busy) {
      if (actionDisabled) showIncompleteAlert();
      return;
    }
    const displaySize = getDisplayExportDimensions(CARD_WIDTH, CARD_HEIGHT);
    setExportWidth(displaySize.width);
    setExportHeight(displaySize.height);
    setDownloadDialogOpen(true);
  };

  const applyPreset = (width: number, height: number) => {
    setExportWidth(width);
    setExportHeight(height);
  };

  const downloadBusinessCard = async () => {
    if (actionDisabled || busy || !profile) return;

    if (Platform.OS === "android" && Constants.appOwnership === "expo") {
      Alert.alert(
        "Save in Expo Go",
        "Saving to photos isn't available in Expo Go on Android. Use Share and choose \"Save image\" or your photos app.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Share instead", onPress: shareBusinessCard },
        ]
      );
      return;
    }

    try {
      setBusy(true);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant photo library access to save the card.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      await prepareQrForExport();

      const width = Math.max(1, Math.round(exportWidth));
      const height = Math.max(1, Math.round(exportHeight));
      const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.name || "card";

      const frontBase64 = await captureSide("front", width, height);
      const backBase64 = await captureSide("back", width, height);

      const frontPath = await writePngToCache(
        frontBase64,
        `${safeCardFilename(name, "business_card_front")}.png`
      );
      const backPath = await writePngToCache(
        backBase64,
        `${safeCardFilename(name, "business_card_back")}.png`
      );

      const frontAsset = await MediaLibrary.createAssetAsync(ensureFileUri(frontPath));
      const backAsset = await MediaLibrary.createAssetAsync(ensureFileUri(backPath));
      const album = await MediaLibrary.createAlbumAsync("SmartWave", frontAsset, true);
      await MediaLibrary.addAssetsToAlbumAsync([backAsset], album, true);

      setDownloadDialogOpen(false);
      Alert.alert("Saved", "Front and back of your digital card were saved to Photos (SmartWave album).");
    } catch (e) {
      console.error("Error downloading card:", e);
      Alert.alert("Error", "Failed to save card. Please try again.");
    } finally {
      setBusy(false);
      clearQrExport();
    }
  };

  const shareBusinessCard = async () => {
    if (actionDisabled || busy || !profile) {
      if (actionDisabled) showIncompleteAlert();
      return;
    }

    try {
      setBusy(true);
      await prepareQrForExport();

      const displaySize = getDisplayExportDimensions(CARD_WIDTH, CARD_HEIGHT);
      const side = showFront ? "front" : "back";
      const base64 = await captureSide(side, displaySize.width, displaySize.height);

      const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.name || "card";
      const filename = `${safeCardFilename(name, `digital_card_${side}`)}.png`;
      const path = await writePngToCache(base64, filename);

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(path, {
          mimeType: "image/png",
          dialogTitle: `${name}'s Digital Business Card`,
        });
      } else {
        Alert.alert("Sharing unavailable", "Sharing is not available on this device.");
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      if (
        err?.message &&
        !err.message.includes("User cancelled") &&
        !err.message.includes("canceled")
      ) {
        console.error("Error sharing card:", e);
        Alert.alert("Error", "Failed to share card. Please try again.");
      }
    } finally {
      setBusy(false);
      clearQrExport();
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          {error || "Unable to load profile."}
        </Text>
      </View>
    );
  }

  const theme = themeStyles[currentTheme];
  const isMobileTheme = currentTheme === "mobile";
  const mobileLayout = isMobileTheme && profile ? getMobileCardLayout(profile, 1) : null;
  const mobileFrontFields = isMobileTheme && profile ? getMobileFrontFields(profile) : [];
  const mobileBackFields = isMobileTheme && profile ? getMobileBackFields(profile) : [];
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.name || "";
  const workAddress = getWorkAddress(profile);
  const homeAddress = getHomeAddress(profile);
  const formattedWorkAddress = workAddress ? formatAddressAtCommas(workAddress) : "";
  const formattedHomeAddress = homeAddress ? formatAddressAtCommas(homeAddress) : "";

  const frontRotateY = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["0deg", "180deg"],
  });

  const backRotateY = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["-180deg", "0deg"],
  });

  let vCardData = "";
  try {
    vCardData = generateVCardData(profile);
  } catch (e) {
    console.error("[DigitalCardScreen] Error generating vCard:", e);
  }

  const displayExport = getDisplayExportDimensions(CARD_WIDTH, CARD_HEIGHT);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: colors.text }]}>Your Digital Card</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Theme: {THEME_LABELS[currentTheme]} • Tap card to flip
      </Text>

      {actionDisabled && (
        <Text style={[styles.incompleteBanner, { color: colors.error, borderColor: colors.error }]}>
          {REQUIRED_PROFILE_FIELDS_MESSAGE}
        </Text>
      )}

      <View style={styles.cardWrapper}>
        <View style={styles.cardContainer}>
          <Animated.View
            style={[
              styles.card,
              theme.front,
              currentTheme === "professional" && styles.professionalBorder,
              isMobileTheme && { padding: mobileLayout?.pad ?? 12 },
              { width: CARD_WIDTH, height: CARD_HEIGHT },
              {
                transform: [{ rotateY: frontRotateY }],
                opacity: flipAnim.interpolate({
                  inputRange: [0, 90, 180],
                  outputRange: [1, 0, 0],
                }),
              },
            ]}
          >
            <TouchableOpacity activeOpacity={0.9} onPress={flipCard} style={styles.cardTouchable}>
              {isMobileTheme && mobileLayout ? (
                <View style={styles.cardContent}>
                  <View
                    style={[
                      styles.cardLeft,
                      mobileLayout.spreadVertically ? styles.mobileLeftColumn : styles.mobileLeftCompact,
                      { paddingRight: 8 },
                    ]}
                  >
                    <View>
                      <Text
                        style={[
                          styles.cardName,
                          {
                            fontSize: mobileLayout.nameSize,
                            marginBottom: mobileLayout.blockGap,
                            color: MOBILE_THEME.gold,
                            textShadowColor: "rgba(0,0,0,0.45)",
                            textShadowOffset: { width: 1, height: 1 },
                            textShadowRadius: 1,
                          },
                        ]}
                      >
                        {name}
                      </Text>
                      {profile.title ? (
                        <Text
                          style={[
                            styles.cardTitle,
                            {
                              fontSize: mobileLayout.titleSize,
                              marginBottom: mobileLayout.lineGap,
                              color: MOBILE_THEME.muted,
                            },
                          ]}
                        >
                          {profile.title}
                        </Text>
                      ) : null}
                      {profile.company ? (
                        <Text
                          style={[
                            styles.cardCompany,
                            {
                              fontSize: mobileLayout.companySize,
                              marginBottom: 0,
                              color: MOBILE_THEME.silver,
                              textShadowColor: "rgba(0,0,0,0.35)",
                              textShadowOffset: { width: 0.5, height: 0.5 },
                              textShadowRadius: 0.5,
                            },
                          ]}
                        >
                          {profile.company}
                        </Text>
                      ) : null}
                    </View>

                    {mobileFrontFields.length > 0 ? (
                      <View style={{ marginTop: mobileLayout.blockGap }}>
                        <MobileContactFields fields={mobileFrontFields} layout={mobileLayout} />
                      </View>
                    ) : null}
                  </View>
                  <View style={[styles.cardRight, { justifyContent: "center" }]}>
                    <MobileCirclePhoto
                      size={mobileLayout.photoSize}
                      uri={profile.photo}
                      initial={name.charAt(0).toUpperCase()}
                      initialColor={MOBILE_THEME.gold}
                      initialSize={mobileLayout.nameSize * 0.85}
                    />
                  </View>
                </View>
              ) : (
              <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <Text style={[styles.cardName, theme.text]}>{name}</Text>
                  {profile.title && (
                    <Text style={[styles.cardTitle, theme.textMuted]}>{profile.title}</Text>
                  )}
                  {profile.company && (
                    <Text style={[styles.cardCompany, theme.text]}>{profile.company}</Text>
                  )}
                  {formattedWorkAddress ? (
                    <Text style={[styles.cardAddress, theme.textMuted]} numberOfLines={MOBILE_ADDRESS_MAX_LINES}>
                      {formattedWorkAddress}
                    </Text>
                  ) : null}
                  <View style={styles.cardContact}>
                    {profile.workEmail && (
                      <Text style={[styles.cardContactText, theme.textMuted]} numberOfLines={1}>
                        {profile.workEmail}
                      </Text>
                    )}
                    {profile.website && (
                      <Text style={[styles.cardContactText, theme.textMuted]} numberOfLines={1}>
                        {profile.website}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.cardRight}>
                  {profile.photo ? (
                    <Image source={{ uri: profile.photo }} style={styles.cardPhoto} resizeMode="contain" />
                  ) : (
                    <View style={styles.cardPhotoPlaceholder}>
                      <Text style={[styles.cardPhotoText, theme.text]}>
                        {name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              )}
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            style={[
              styles.card,
              styles.cardBack,
              theme.back,
              isMobileTheme && { padding: mobileLayout?.pad ?? 12 },
              { width: CARD_WIDTH, height: CARD_HEIGHT },
              {
                transform: [{ rotateY: backRotateY }],
                opacity: flipAnim.interpolate({
                  inputRange: [0, 90, 180],
                  outputRange: [0, 0, 1],
                }),
              },
            ]}
          >
            <TouchableOpacity activeOpacity={0.9} onPress={flipCard} style={styles.cardTouchable}>
              {isMobileTheme && mobileLayout ? (
                <View style={styles.mobileBackContent}>
                  <View style={styles.mobileBackLeft}>
                    {profile.companyLogo ? (
                      <MobileLogoFrame
                        size={mobileLayout.logoSize}
                        uri={profile.companyLogo}
                        afterGap={mobileLayout.logoAfterGap}
                      />
                    ) : null}
                    {mobileBackFields.length > 0 ? (
                      <View
                        style={{
                          flex: 1,
                          justifyContent: mobileBackFields.length <= 4 ? "space-between" : "flex-start",
                          gap: mobileLayout.contactGap,
                        }}
                      >
                        <MobileContactFields fields={mobileBackFields} layout={mobileLayout} />
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.cardBackRight}>
                    <View
                      style={[
                        styles.mobileQrFrame,
                        {
                          width: mobileLayout.qrSize + 12,
                          height: mobileLayout.qrSize + 12,
                          padding: 6,
                        },
                      ]}
                    >
                      {vCardData ? (
                        <QRCode
                          value={vCardData}
                          size={mobileLayout.qrSize}
                          color="#000000"
                          backgroundColor="#FFFFFF"
                          logo={profile.companyLogo ? { uri: profile.companyLogo } : undefined}
                          logoSize={Math.max(14, mobileLayout.logoSize * 0.35)}
                          logoBackgroundColor="#FFFFFF"
                          logoMargin={2}
                          logoBorderRadius={0}
                          ecl="H"
                        />
                      ) : (
                        <View style={styles.qrPlaceholder}>
                          <Text style={{ color: "#666", fontSize: 12 }}>QR Code</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.qrLabel, { color: MOBILE_THEME.silver, fontSize: mobileLayout.detailSize }]}>
                      Scan to save contact
                    </Text>
                  </View>
                </View>
              ) : (
              <View style={styles.cardBackContent}>
                <View style={styles.cardBackLeft}>
                  {profile.companyLogo ? (
                    <Image source={{ uri: profile.companyLogo }} style={styles.cardLogo} />
                  ) : null}
                  <View style={styles.cardBackPersonal}>
                    {formattedHomeAddress ? (
                      <View style={styles.cardBackRow}>
                        <Ionicons name="home-outline" size={11} color={theme.backText?.color ?? "#fff"} style={styles.cardBackIcon} />
                        <Text style={[styles.cardBackDetail, { color: theme.backText?.color ?? "#fff" }]} numberOfLines={MOBILE_ADDRESS_MAX_LINES}>
                          {formattedHomeAddress}
                        </Text>
                      </View>
                    ) : null}
                    {profile.personalEmail ? (
                      <View style={styles.cardBackRow}>
                        <Ionicons name="mail-open-outline" size={11} color={theme.backText?.color ?? "#fff"} style={styles.cardBackIcon} />
                        <Text style={[styles.cardBackDetail, { color: theme.backText?.color ?? "#fff" }]} numberOfLines={1}>
                          {profile.personalEmail}
                        </Text>
                      </View>
                    ) : null}
                    {profile.homePhone ? (
                      <View style={styles.cardBackRow}>
                        <Ionicons name="call-outline" size={11} color={theme.backText?.color ?? "#fff"} style={styles.cardBackIcon} />
                        <Text style={[styles.cardBackDetail, { color: theme.backText?.color ?? "#fff" }]} numberOfLines={1}>
                          {profile.homePhone}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <View style={styles.cardBackRight}>
                  <View style={styles.qrWrapper}>
                    {vCardData ? (
                      <QRCode
                        value={vCardData}
                        size={120}
                        color="#000000"
                        backgroundColor="#FFFFFF"
                        logo={profile.companyLogo ? { uri: profile.companyLogo } : undefined}
                        logoSize={18}
                        logoBackgroundColor="#FFFFFF"
                        logoMargin={2}
                        logoBorderRadius={2}
                        ecl="H"
                      />
                    ) : (
                      <View style={styles.qrPlaceholder}>
                        <Text style={{ color: "#666", fontSize: 12 }}>QR Code</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.qrLabel, { color: theme.backText?.color ?? "#fff" }]}>
                    Scan to save contact
                  </Text>
                </View>
              </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>

      {/* Offscreen Skia canvases for export */}
      <View
        style={{
          position: "absolute",
          opacity: 0,
          left: -9999,
          top: 0,
          width: captureWidth,
          height: captureHeight * 2,
        }}
        pointerEvents="none"
      >
        <View style={{ position: "absolute", left: 0, top: 0, width: captureWidth, height: captureHeight }}>
          <CardFrontCanvas
            ref={frontCanvasRef}
            width={captureWidth}
            height={captureHeight}
            profile={profile}
            theme={theme}
            scale={exportScale}
          />
        </View>
        <View style={{ position: "absolute", left: 0, top: captureHeight, width: captureWidth, height: captureHeight }}>
          <CardBackCanvas
            ref={backCanvasRef}
            width={captureWidth}
            height={captureHeight}
            profile={profile}
            theme={theme}
            qrBase64={qrBase64ForExport}
            qrFileUri={qrFileUriForExport}
            scale={exportScale}
          />
        </View>
      </View>

      <View style={styles.actionGrid}>
        <TouchableOpacity
          style={[
            styles.gridButton,
            { backgroundColor: colors.card, borderColor: colors.border },
            (busy || actionDisabled) && styles.buttonDisabled,
          ]}
          onPress={openDownloadDialog}
          disabled={busy || actionDisabled}
        >
          <Text style={[styles.gridButtonText, { color: colors.text }]}>
            {busy ? "…" : "Download"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.gridButton,
            { backgroundColor: colors.card, borderColor: colors.border },
            (busy || actionDisabled) && styles.buttonDisabled,
          ]}
          onPress={shareBusinessCard}
          disabled={busy || actionDisabled}
        >
          <Text style={[styles.gridButtonText, { color: colors.text }]}>
            {busy ? "…" : "Share"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.gridButton,
            { backgroundColor: colors.card, borderColor: colors.border },
            busy && styles.buttonDisabled,
          ]}
          onPress={cycleTheme}
          disabled={busy}
        >
          <Text style={[styles.gridButtonText, { color: colors.text }]}>Theme</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.gridButton,
            { backgroundColor: colors.card, borderColor: colors.border },
            busy && styles.buttonDisabled,
          ]}
          onPress={flipCard}
          disabled={busy}
        >
          <Text style={[styles.gridButtonText, { color: colors.text }]}>Flip</Text>
        </TouchableOpacity>
      </View>

      {profile.shorturl && (
        <View style={styles.walletRow}>
          {(Platform.OS === "ios" || Platform.OS === "web") && (
            <TouchableOpacity
              style={[styles.walletButton, styles.appleWallet]}
              onPress={() => {
                if (actionDisabled) {
                  showIncompleteAlert();
                  return;
                }
                Linking.openURL(getWalletAppleUrl(profile.shorturl!));
              }}
              disabled={actionDisabled}
            >
              <Text style={styles.walletButtonSmall}>Add to</Text>
              <Text style={styles.walletButtonLarge}>Apple Wallet</Text>
            </TouchableOpacity>
          )}
          {(Platform.OS === "android" || Platform.OS === "web") && (
            <TouchableOpacity
              style={[styles.walletButton, styles.googleWallet]}
              onPress={() => {
                if (actionDisabled) {
                  showIncompleteAlert();
                  return;
                }
                Linking.openURL(getWalletGoogleUrl(profile.shorturl!));
              }}
              disabled={actionDisabled}
            >
              <Text style={styles.walletButtonSmall}>Save to</Text>
              <Text style={styles.walletButtonLarge}>Google Wallet</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <Modal
        visible={downloadDialogOpen}
        animationType="slide"
        transparent
        onRequestClose={() => !busy && setDownloadDialogOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Download Digital Card</Text>
            <Text style={[styles.modalDesc, { color: colors.textMuted }]}>
              Export matches the card and theme on screen. Choose output size in pixels.
            </Text>

            <View style={styles.presetRow}>
              <TouchableOpacity
                style={[styles.presetButton, { borderColor: colors.border }]}
                onPress={() => applyPreset(displayExport.width, displayExport.height)}
              >
                <Text style={[styles.presetText, { color: colors.text }]}>On-screen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.presetButton, { borderColor: colors.border }]}
                onPress={() => applyPreset(DEFAULT_CARD_EXPORT_WIDTH, DEFAULT_CARD_EXPORT_HEIGHT)}
              >
                <Text style={[styles.presetText, { color: colors.text }]}>Print</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.presetButton, { borderColor: colors.border }]}
                onPress={() => applyPreset(2100, 1200)}
              >
                <Text style={[styles.presetText, { color: colors.text }]}>High-res</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dimensionRow}>
              <View style={styles.dimensionField}>
                <Text style={[styles.dimensionLabel, { color: colors.textMuted }]}>Width (px)</Text>
                <TextInput
                  style={[styles.dimensionInput, { color: colors.text, borderColor: colors.border }]}
                  keyboardType="number-pad"
                  value={String(exportWidth)}
                  onChangeText={(text) => {
                    const nextWidth = Number(text) || 1;
                    const next = dimensionsFromWidth(nextWidth, lockAspectRatio, exportHeight);
                    setExportWidth(next.width);
                    setExportHeight(next.height);
                  }}
                />
              </View>
              <View style={styles.dimensionField}>
                <Text style={[styles.dimensionLabel, { color: colors.textMuted }]}>Height (px)</Text>
                <TextInput
                  style={[styles.dimensionInput, { color: colors.text, borderColor: colors.border }]}
                  keyboardType="number-pad"
                  value={String(exportHeight)}
                  onChangeText={(text) => {
                    const nextHeight = Number(text) || 1;
                    const next = dimensionsFromHeight(nextHeight, lockAspectRatio, exportWidth);
                    setExportWidth(next.width);
                    setExportHeight(next.height);
                  }}
                />
              </View>
            </View>

            <View style={styles.lockRow}>
              <Switch
                value={lockAspectRatio}
                onValueChange={(locked) => {
                  setLockAspectRatio(locked);
                  if (locked) {
                    const next = dimensionsFromWidth(exportWidth, true, exportHeight);
                    setExportWidth(next.width);
                    setExportHeight(next.height);
                  }
                }}
              />
              <Text style={[styles.lockLabel, { color: colors.textMuted }]}>
                Lock business card aspect ratio (3.5″ × 2″)
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancel, { borderColor: colors.border }]}
                onPress={() => setDownloadDialogOpen(false)}
                disabled={busy}
              >
                <Text style={{ color: colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: colors.primary }]}
                onPress={downloadBusinessCard}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Download front & back</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, alignItems: "center", paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 14, marginBottom: 16, textAlign: "center" },
  incompleteBanner: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    width: "100%",
  },
  cardWrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginBottom: 24,
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  card: {
    position: "absolute",
    top: 0,
    left: 0,
    borderRadius: 16,
    padding: 20,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  professionalBorder: {
    borderWidth: 3,
    borderColor: "#1e3a8a",
  },
  cardBack: {},
  cardTouchable: { flex: 1 },
  cardContent: {
    flexDirection: "row",
    height: "100%",
    justifyContent: "space-between",
  },
  cardLeft: {
    flex: 1,
    justifyContent: "center",
    paddingRight: 12,
  },
  mobileLeftColumn: {
    justifyContent: "space-between",
  },
  mobileLeftCompact: {
    justifyContent: "flex-start",
  },
  mobileContactRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  mobileContactIcon: {
    marginTop: 1,
  },
  mobileContactText: {
    flex: 1,
    flexShrink: 1,
  },
  cardName: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  cardTitle: { fontSize: 12, fontStyle: "italic", marginBottom: 4 },
  cardCompany: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  cardAddress: { fontSize: 10, marginBottom: 8, lineHeight: 14 },
  mobileAddressMultiline: { flexShrink: 1 },
  cardContact: { gap: 4 },
  cardContactText: { fontSize: 10 },
  cardRight: { justifyContent: "center", alignItems: "center" },
  cardPhoto: {
    width: 70,
    height: 70,
    borderRadius: 35,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  cardPhotoPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardPhotoText: { fontSize: 28, fontWeight: "700" },
  mobilePhotoFrame3d: {
    backgroundColor: MOBILE_THEME.frameFill,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderTopColor: MOBILE_THEME.bevelLight,
    borderLeftColor: MOBILE_THEME.bevelLight,
    borderBottomColor: MOBILE_THEME.bevelDark,
    borderRightColor: MOBILE_THEME.bevelDark,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  mobileLogoFrameOuter: {
    shadowColor: "#000",
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.55,
    shadowRadius: 4,
    elevation: 12,
  },
  mobileLogoFrameGold: {
    padding: 3,
    backgroundColor: MOBILE_THEME.logoBorderGold,
    borderWidth: 1,
    borderColor: MOBILE_THEME.logoBorderMid,
  },
  mobileLogoFrameSilver: {
    flex: 1,
    padding: 2,
    backgroundColor: MOBILE_THEME.logoBorderSilver,
    borderWidth: 1,
    borderColor: MOBILE_THEME.logoBorderGold,
  },
  mobileLogoFrameInner: {
    flex: 1,
    padding: 2,
    backgroundColor: MOBILE_THEME.frameFill,
    alignItems: "center",
    justifyContent: "center",
  },
  mobileFrame3d: {
    backgroundColor: MOBILE_THEME.frameFill,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderTopColor: MOBILE_THEME.bevelLight,
    borderLeftColor: MOBILE_THEME.bevelLight,
    borderBottomColor: MOBILE_THEME.bevelDark,
    borderRightColor: MOBILE_THEME.bevelDark,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 3,
    elevation: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  mobileFrameImage: {
    borderRadius: 0,
  },
  mobileFramePlaceholder: {
    borderRadius: 0,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  mobileQrFrame: {
    backgroundColor: "#fff",
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderTopColor: MOBILE_THEME.bevelLight,
    borderLeftColor: MOBILE_THEME.bevelLight,
    borderBottomColor: MOBILE_THEME.bevelDark,
    borderRightColor: MOBILE_THEME.bevelDark,
    marginBottom: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  mobileBackContent: {
    flexDirection: "row",
    height: "100%",
    justifyContent: "space-between",
    alignItems: "stretch",
  },
  mobileBackLeft: {
    flex: 1,
    paddingRight: 10,
    minWidth: 0,
  },
  cardBackContent: {
    flexDirection: "row",
    height: "100%",
    justifyContent: "space-between",
    alignItems: "stretch",
  },
  cardBackLeft: { flex: 1, paddingRight: 12, justifyContent: "flex-start" },
  cardBackPersonal: { marginTop: 8, gap: 6 },
  cardBackRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  cardBackIcon: { marginTop: 1, opacity: 0.85 },
  cardBackDetail: { flex: 1, fontSize: 10, lineHeight: 14 },
  cardLogo: { width: 40, height: 40, marginTop: 0, marginBottom: 0, borderRadius: 4, alignSelf: "flex-start" },
  cardBackRight: { alignItems: "center", justifyContent: "center", alignSelf: "center" },
  qrWrapper: {
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    width: 120,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  qrPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  qrLabel: { fontSize: 10, textAlign: "center" },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    width: "100%",
    marginBottom: 16,
  },
  gridButton: {
    width: "47%",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  gridButtonText: { fontSize: 14, fontWeight: "600" },
  buttonDisabled: { opacity: 0.5 },
  walletRow: { width: "100%", gap: 12 },
  walletButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  appleWallet: { backgroundColor: "#000" },
  googleWallet: { backgroundColor: "#1a73e8" },
  walletButtonSmall: { color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  walletButtonLarge: { color: "#fff", fontSize: 16, fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  modalDesc: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  presetButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  presetText: { fontSize: 13, fontWeight: "500" },
  dimensionRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  dimensionField: { flex: 1 },
  dimensionLabel: { fontSize: 12, marginBottom: 4 },
  dimensionInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  lockRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
  lockLabel: { flex: 1, fontSize: 13 },
  modalActions: { flexDirection: "row", gap: 12 },
  modalCancel: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalConfirm: {
    flex: 2,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalConfirmText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  errorText: { textAlign: "center", padding: 24, fontSize: 15 },
});
