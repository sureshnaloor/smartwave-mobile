import React, { useState, useEffect, useRef } from "react";
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
  Share,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getProfile, type Profile } from "../api/client";
import { generateVCardData } from "../utils/vcard";
import { generateQRBase64 } from "../utils/qrExport";
import QRCode from "react-native-qrcode-svg";
import Constants from "expo-constants";
import { CardFrontCanvas, CardBackCanvas, CombinedCardCanvas, type ThemeExport } from "../components/CardExportCanvas";
import ViewShot from "react-native-view-shot";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 48;
const CARD_HEIGHT = (CARD_WIDTH * 600) / 1050; // Maintain 3.5:2 aspect ratio

type Theme = "smartwave" | "minimal" | "professional";

const themeStyles = {
  smartwave: {
    front: { backgroundColor: "#3b82f6" },
    back: { backgroundColor: "#1e40af" },
    text: { color: "#ffffff" },
    textMuted: { color: "#e0e7ff" },
  },
  minimal: {
    front: { backgroundColor: "#f5f1e8" },
    back: { backgroundColor: "#ede9e0" },
    text: { color: "#1f2937" },
    textMuted: { color: "#4b5563" },
  },
  professional: {
    front: { backgroundColor: "#ffffff", borderWidth: 3, borderColor: "#1e3a8a" },
    back: { backgroundColor: "#1e3a8a" },
    text: { color: "#1e3a8a" },
    textMuted: { color: "#3b82f6" },
  },
};

export default function DigitalCardScreen() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFront, setShowFront] = useState(true);
  const [currentTheme, setCurrentTheme] = useState<Theme>("smartwave");
  const [saving, setSaving] = useState(false);
  const [qrBase64ForExport, setQrBase64ForExport] = useState<string | null>(null);
  const [qrFileUriForExport, setQrFileUriForExport] = useState<string | null>(null);
  const [qrUriForViewShot, setQrUriForViewShot] = useState<string | null>(null);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const frontRef = useRef<View>(null);
  const backRef = useRef<View>(null);
  const qrSvgRef = useRef<{ toDataURL: (cb: (data: string) => void) => void } | null>(null);
  const frontCanvasRef = useRef<{ makeImageSnapshotAsync: () => Promise<{ encodeToBase64: () => string }> }>(null);
  const backCanvasRef = useRef<{ makeImageSnapshotAsync: () => Promise<{ encodeToBase64: () => string }> }>(null);
  const combinedCanvasRef = useRef<{ makeImageSnapshotAsync: () => Promise<{ encodeToBase64: () => string }> }>(null);
  const viewShotRef = useRef<ViewShot>(null);

  useEffect(() => {
    if (__DEV__) {
      console.log("[DigitalCardScreen] Component mounted");
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("Not authenticated. Please sign in.");
      setProfile(null);
      return;
    }
    
    let cancelled = false;
    setLoading(true);
    
    if (__DEV__) {
      console.log("[DigitalCardScreen] Loading profile...");
    }
    
    getProfile(token)
      .then((p) => {
        if (!cancelled) {
          if (__DEV__) {
            console.log("[DigitalCardScreen] Profile loaded:", p?.name);
          }
          setProfile(p);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          console.error("[DigitalCardScreen] Error loading profile:", e);
          setError(e instanceof Error ? e.message : "Failed to load profile");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
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
    const themes: Theme[] = ["smartwave", "minimal", "professional"];
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setCurrentTheme(themes[nextIndex]);
  };

  const ensureFileUri = (path: string): string => {
    if (Platform.OS === "android" && !path.startsWith("file://")) {
      return `file://${path}`;
    }
    return path;
  };

  const downloadCard = async () => {
    if (!profile || !frontCanvasRef.current || !backCanvasRef.current) return;

    if (Platform.OS === "android" && Constants.appOwnership === "expo") {
      Alert.alert(
        "Save in Expo Go",
        "Save to photos isn't available in Expo Go on Android. Use Share and choose \"Save image\" or your photos app.",
        [
          { text: "OK", style: "cancel" },
          { text: "Share instead", onPress: shareCard },
        ]
      );
      return;
    }

    try {
      setSaving(true);

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant photo library access to save the card to your photos.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

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

      const frontSnap = await frontCanvasRef.current?.makeImageSnapshotAsync();
      const backSnap = await backCanvasRef.current?.makeImageSnapshotAsync();
      if (!frontSnap || !backSnap) throw new Error("Could not generate card images");

      const frontBase64 = frontSnap.encodeToBase64();
      const backBase64 = backSnap.encodeToBase64();
      const cacheDir = FileSystem.cacheDirectory ?? "";
      const frontPath = `${cacheDir}smartwave_card_front_${Date.now()}.png`;
      const backPath = `${cacheDir}smartwave_card_back_${Date.now()}.png`;
      await FileSystem.writeAsStringAsync(frontPath, frontBase64, { encoding: "base64" });
      await FileSystem.writeAsStringAsync(backPath, backBase64, { encoding: "base64" });

      const frontAsset = await MediaLibrary.createAssetAsync(ensureFileUri(frontPath));
      const backAsset = await MediaLibrary.createAssetAsync(ensureFileUri(backPath));
      const album = await MediaLibrary.createAlbumAsync("SmartWave", frontAsset, true);
      await MediaLibrary.addAssetsToAlbumAsync([backAsset], album, true);
      Alert.alert("Success", "Card saved to your photos (Recent and SmartWave album).");
    } catch (e) {
      console.error("Error saving card:", e);
      Alert.alert("Error", "Failed to save card. Please try again.");
    } finally {
      setSaving(false);
      setQrBase64ForExport(null);
      setQrFileUriForExport(null);
    }
  };

  const shareCard = async () => {
    if (!profile || !combinedCanvasRef.current) return;

    try {
      setSaving(true);
      const vCardData = generateVCardData(profile);
      const qrBase64 = await generateQRBase64(vCardData, 200);
      setQrBase64ForExport(qrBase64);
      if (Platform.OS === "android") {
        const cacheDir = FileSystem.cacheDirectory ?? "";
        const qrPath = `${cacheDir}smartwave_qr_share_${Date.now()}.png`;
        await FileSystem.writeAsStringAsync(qrPath, qrBase64, { encoding: "base64" });
        setQrFileUriForExport(qrPath);
      }
      await new Promise((r) => setTimeout(r, 500));

      const combinedSnap = await combinedCanvasRef.current?.makeImageSnapshotAsync();
      if (!combinedSnap) throw new Error("Could not generate card image");

      const base64 = combinedSnap.encodeToBase64();
      const cacheDir = FileSystem.cacheDirectory ?? "";
      const path = `${cacheDir}smartwave_card_share_${Date.now()}.png`;
      await FileSystem.writeAsStringAsync(path, base64, { encoding: "base64" });
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(path, { mimeType: "image/png", dialogTitle: "Share card (front + back)" });
      } else {
        await Share.share({ url: path, message: `Check out ${profile.name || "my"} digital business card` });
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      if (err?.message && !err.message.includes("User cancelled") && !err.message?.includes("canceled")) {
        console.error("Error sharing card:", e);
        Alert.alert("Error", "Failed to share card. Please try again.");
      }
    } finally {
      setSaving(false);
      setQrBase64ForExport(null);
      setQrFileUriForExport(null);
    }
  };

  const saveWithViewShot = async () => {
    const hasRef = !!viewShotRef.current;
    if (__DEV__) {
      console.log("[ViewShot] saveWithViewShot called", {
        hasProfile: !!profile,
        hasViewShotRef: hasRef,
        platform: Platform.OS,
      });
    }
    if (!profile || !viewShotRef.current) return;

    if (Platform.OS === "android" && Constants.appOwnership === "expo") {
      Alert.alert(
        "Save in Expo Go",
        "Save to photos isn't available in Expo Go on Android. Use the other Save or Share buttons.",
        [{ text: "OK", style: "cancel" }]
      );
      return;
    }

    try {
      setSaving(true);
      if (__DEV__) console.log("[ViewShot] Requesting media permission…");
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
      if (__DEV__) console.log("[ViewShot] Permission granted, getting QR base64…");

      const vCardData = generateVCardData(profile);
      const qrBase64 = await generateQRBase64(vCardData, 200);
      if (__DEV__) console.log("[ViewShot] QR base64 length:", qrBase64?.length ?? 0);

      // Use data URI only (no file://) so ViewShot view has no remote/file images – improves snapshot success on Android
      setQrUriForViewShot(`data:image/png;base64,${qrBase64}`);
      if (__DEV__) console.log("[ViewShot] Set qrUriForViewShot (data-uri only)");

      const delayMs = 1200;
      if (__DEV__) console.log("[ViewShot] Waiting", delayMs, "ms for view/images to render…");
      await new Promise((r) => setTimeout(r, delayMs));

      if (!viewShotRef.current) {
        if (__DEV__) console.warn("[ViewShot] viewShotRef.current is null after delay");
        throw new Error("Capture view unavailable after delay");
      }
      if (__DEV__) console.log("[ViewShot] Calling capture()…");
      const uri = await (viewShotRef.current as { capture: () => Promise<string> }).capture();
      if (__DEV__) console.log("[ViewShot] Capture result uri:", uri ? `${uri.slice(0, 60)}…` : "null");
      if (!uri) throw new Error("Could not capture card image");
      const asset = await MediaLibrary.createAssetAsync(ensureFileUri(uri));
      await MediaLibrary.createAlbumAsync("SmartWave", asset, true);
      if (__DEV__) console.log("[ViewShot] Saved to gallery and SmartWave album");
      Alert.alert("Success", "Card saved to your photos (Recent and SmartWave album).");
    } catch (e) {
      const err = e as Error & { message?: string; stack?: string };
      const msg = err?.message ?? String(e);
      if (__DEV__) {
        console.error("[ViewShot] Error saving with view-shot:", msg);
        console.error("[ViewShot] Full error:", e);
        if (err?.stack) console.error("[ViewShot] Stack:", err.stack);
        if (msg.includes("snapshot view tag")) {
          console.warn(
            "[ViewShot] Snapshot failed: often caused by offscreen/opacity:0 view, remote Images, or Android New Architecture. Prefer \"Save Card\" (Skia) or \"Share\"."
          );
        }
      }
      Alert.alert("Error", "Failed to save card with view-shot. You can use \"Save Card\" or \"Share\" instead.");
    } finally {
      setSaving(false);
      setQrUriForViewShot(null);
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
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.name || "";
  const workAddress = [
    profile.workStreet,
    profile.workCity,
    profile.workState,
    profile.workZipcode,
    profile.workCountry,
  ]
    .filter(Boolean)
    .join(", ");

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
    if (__DEV__) {
      console.log("[DigitalCardScreen] Generated vCard data length:", vCardData.length);
    }
  } catch (e) {
    console.error("[DigitalCardScreen] Error generating vCard:", e);
  }

  if (__DEV__) {
    console.log("[DigitalCardScreen] Rendering card");
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: colors.text }]}>Your Digital Card</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Tap to flip • Swipe to change theme
      </Text>

      <View style={styles.cardWrapper}>
        <View style={styles.cardContainer}>
          <View ref={frontRef} collapsable={false} style={styles.cardCaptureWrapper}>
            <Animated.View
              style={[
                styles.card,
                theme.front,
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
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={flipCard}
                style={styles.cardTouchable}
              >
              <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <Text style={[styles.cardName, theme.text]}>{name}</Text>
                  {profile.title && (
                    <Text style={[styles.cardTitle, theme.textMuted]}>{profile.title}</Text>
                  )}
                  {profile.company && (
                    <Text style={[styles.cardCompany, theme.text]}>{profile.company}</Text>
                  )}
                  {workAddress ? (
                    <Text style={[styles.cardAddress, theme.textMuted]} numberOfLines={2}>
                      {workAddress}
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
                    <Image source={{ uri: profile.photo }} style={styles.cardPhoto} />
                  ) : (
                    <View style={[styles.cardPhotoPlaceholder, theme.text]}>
                      <Text style={[styles.cardPhotoText, theme.text]}>
                        {name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
            </Animated.View>
          </View>

          <View ref={backRef} collapsable={false} style={styles.cardCaptureWrapper}>
            <Animated.View
              style={[
                styles.card,
                styles.cardBack,
                theme.back,
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
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={flipCard}
                style={styles.cardTouchable}
              >
              <View style={styles.cardBackContent}>
                <View style={styles.cardBackLeft}>
                  <Text style={[styles.cardName, { color: "#fff" }]}>{name}</Text>
                  {profile.companyLogo && (
                    <Image source={{ uri: profile.companyLogo }} style={styles.cardLogo} />
                  )}
                </View>
                <View style={styles.cardBackRight}>
                  <View style={styles.qrWrapper}>
                    {vCardData ? (
                      <QRCode
                        getRef={(c) => {
                          qrSvgRef.current = c;
                        }}
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
                        onError={(e) => {
                          console.error("QR Code error in card:", e);
                        }}
                      />
                    ) : (
                      <View style={styles.qrPlaceholder}>
                        <Text style={{ color: "#666", fontSize: 12 }}>QR Code</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.qrLabel, { color: "#fff" }]}>Scan to save contact</Text>
                </View>
              </View>
            </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </View>

      {/* Offscreen Skia canvases for Save/Share – export card as PNG (photo, logo, QR, full info) */}
      <View style={{ position: "absolute", opacity: 0, left: 0, top: 0, width: CARD_WIDTH, height: CARD_HEIGHT * 4 }} pointerEvents="none">
        <View style={{ position: "absolute", left: 0, top: 0, width: CARD_WIDTH, height: CARD_HEIGHT }}>
          <CardFrontCanvas
            ref={frontCanvasRef}
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
            profile={profile}
            theme={theme as ThemeExport}
          />
        </View>
        <View style={{ position: "absolute", left: 0, top: CARD_HEIGHT, width: CARD_WIDTH, height: CARD_HEIGHT }}>
          <CardBackCanvas
            ref={backCanvasRef}
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
            profile={profile}
            theme={theme as ThemeExport}
            qrBase64={qrBase64ForExport}
            qrFileUri={qrFileUriForExport}
          />
        </View>
        <View style={{ position: "absolute", left: 0, top: CARD_HEIGHT * 2, width: CARD_WIDTH, height: CARD_HEIGHT * 2 }}>
          <CombinedCardCanvas
            ref={combinedCanvasRef}
            width={CARD_WIDTH}
            cardHeight={CARD_HEIGHT}
            profile={profile}
            theme={theme as ThemeExport}
            qrBase64={qrBase64ForExport}
            qrFileUri={qrFileUriForExport}
          />
        </View>
      </View>

      {/* Offscreen view for "Save with View Shot" – positioned off-screen (not opacity:0) so native snapshot may succeed on Android */}
      <View
        style={{
          position: "absolute",
          left: -9999,
          top: 0,
          width: CARD_WIDTH,
          height: CARD_HEIGHT * 2,
        }}
        pointerEvents="none"
        collapsable={false}
      >
        <ViewShot
          ref={viewShotRef}
          options={{ format: "png", result: "tmpfile" }}
          collapsable={false}
          style={{ width: CARD_WIDTH, height: CARD_HEIGHT * 2 }}
        >
          <View style={{ width: CARD_WIDTH, height: CARD_HEIGHT * 2 }}>
            <View style={[styles.card, theme.front, { width: CARD_WIDTH, height: CARD_HEIGHT }]}>
              <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <Text style={[styles.cardName, theme.text]}>{name}</Text>
                  {profile.title ? (
                    <Text style={[styles.cardTitle, theme.textMuted]}>{profile.title}</Text>
                  ) : null}
                  {profile.company ? (
                    <Text style={[styles.cardCompany, theme.text]}>{profile.company}</Text>
                  ) : null}
                  {workAddress ? (
                    <Text style={[styles.cardAddress, theme.textMuted]} numberOfLines={2}>
                      {workAddress}
                    </Text>
                  ) : null}
                  <View style={styles.cardContact}>
                    {profile.workEmail ? (
                      <Text style={[styles.cardContactText, theme.textMuted]} numberOfLines={1}>
                        {profile.workEmail}
                      </Text>
                    ) : null}
                    {profile.website ? (
                      <Text style={[styles.cardContactText, theme.textMuted]} numberOfLines={1}>
                        {profile.website}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.cardRight}>
                  {/* ViewShot fallback: initial only (no remote profile.photo) so snapshot can succeed */}
                  <View style={[styles.cardPhotoPlaceholder, theme.text]}>
                    <Text style={[styles.cardPhotoText, theme.text]}>{name.charAt(0).toUpperCase()}</Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={[styles.card, styles.cardBack, theme.back, { width: CARD_WIDTH, height: CARD_HEIGHT }]}>
              <View style={styles.cardBackContent}>
                <View style={styles.cardBackLeft}>
                  <Text style={[styles.cardName, { color: "#fff" }]}>{name}</Text>
                  {/* ViewShot fallback: no remote company logo – placeholder so snapshot can succeed */}
                  <View style={[styles.cardLogoPlaceholder]}>
                    <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 10 }}>{profile.company || "Logo"}</Text>
                  </View>
                </View>
                <View style={styles.cardBackRight}>
                  {qrUriForViewShot ? (
                    <View style={styles.qrWrapper}>
                      <Image source={{ uri: qrUriForViewShot }} style={styles.viewShotQrImage} />
                    </View>
                  ) : (
                    <View style={styles.qrWrapper}>
                      <Text style={{ color: "#666", fontSize: 12 }}>QR</Text>
                    </View>
                  )}
                  <Text style={[styles.qrLabel, { color: "#fff" }]}>Scan to save contact</Text>
                </View>
              </View>
            </View>
          </View>
        </ViewShot>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={flipCard}
        >
          <Text style={styles.actionButtonText}>Flip Card</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={cycleTheme}
        >
          <Text style={[styles.actionButtonTextSecondary, { color: colors.text }]}>Change Theme</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.downloadActions}>
        <TouchableOpacity
          style={[styles.downloadButton, { backgroundColor: colors.primary }]}
          onPress={downloadCard}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.downloadButtonText}>Save Card</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.downloadButton, styles.shareButton, { borderColor: colors.border }]}
          onPress={shareCard}
          disabled={saving}
        >
          <Text style={[styles.downloadButtonTextSecondary, { color: colors.text }]}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.downloadButton, styles.shareButton, { borderColor: colors.border }]}
          onPress={saveWithViewShot}
          disabled={saving}
        >
          <Text style={[styles.downloadButtonTextSecondary, { color: colors.text }]}>
            Save with View Shot
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, alignItems: "center", paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 14, marginBottom: 24, textAlign: "center" },
  cardWrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginBottom: 24,
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  cardCaptureWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  cardBack: {},
  cardTouchable: {
    flex: 1,
  },
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
  cardName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 12,
    fontStyle: "italic",
    marginBottom: 4,
  },
  cardCompany: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  cardAddress: {
    fontSize: 10,
    marginBottom: 8,
    lineHeight: 14,
  },
  cardContact: {
    gap: 4,
  },
  cardContactText: {
    fontSize: 10,
  },
  cardRight: {
    justifyContent: "center",
    alignItems: "center",
  },
  cardPhoto: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
  },
  cardPhotoPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardPhotoText: {
    fontSize: 28,
    fontWeight: "700",
  },
  cardBackContent: {
    flexDirection: "row",
    height: "100%",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardBackLeft: {
    flex: 1,
    paddingRight: 12,
  },
  cardLogo: {
    width: 40,
    height: 40,
    marginTop: 12,
    borderRadius: 4,
  },
  cardLogoPlaceholder: {
    width: 40,
    height: 40,
    marginTop: 12,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardBackRight: {
    alignItems: "center",
    justifyContent: "center",
  },
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
  qrLabel: {
    fontSize: 10,
    textAlign: "center",
  },
  viewShotQrImage: {
    width: 120,
    height: 120,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    width: "100%",
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  actionButtonTextSecondary: {
    fontSize: 15,
    fontWeight: "600",
  },
  downloadActions: {
    width: "100%",
    gap: 12,
  },
  downloadButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  shareButton: {
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  downloadButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  downloadButtonTextSecondary: {
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: { textAlign: "center", padding: 24, fontSize: 15 },
});
