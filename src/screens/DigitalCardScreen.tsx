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
  Platform,
  Share,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getProfile, type Profile } from "../api/client";
import { generateVCardData } from "../utils/vcard";
import QRCode from "react-native-qrcode-svg";
import { captureRef } from "react-native-view-shot";
import * as MediaLibrary from "expo-media-library";

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
  const flipAnim = useRef(new Animated.Value(0)).current;
  const frontRef = useRef<View>(null);
  const backRef = useRef<View>(null);

  useEffect(() => {
    if (__DEV__) {
      console.log("[DigitalCardScreen] Component mounted");
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("Not authenticated. Please sign in.");
      return;
    }
    if (__DEV__) {
      console.log("[DigitalCardScreen] Loading profile...");
    }
    getProfile(token)
      .then((p) => {
        if (__DEV__) {
          console.log("[DigitalCardScreen] Profile loaded:", p?.name);
        }
        setProfile(p);
      })
      .catch((e) => {
        console.error("[DigitalCardScreen] Error loading profile:", e);
        setError(e instanceof Error ? e.message : "Failed to load profile");
      })
      .finally(() => setLoading(false));
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

  const downloadCard = async () => {
    if (!frontRef.current || !backRef.current || !profile) return;

    try {
      setSaving(true);

      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Required",
            "Please grant photo library access in Settings to save the card to your photos."
          );
          return;
        }
      } catch (permError) {
        Alert.alert(
          "Permission Error",
          "Unable to request photo library permission. Please enable storage/photos access in app Settings."
        );
        return;
      }

      const frontUri = await captureRef(frontRef.current, { format: "png", quality: 1.0 });
      const backUri = await captureRef(backRef.current, { format: "png", quality: 1.0 });

      try {
        const frontAsset = await MediaLibrary.createAssetAsync(frontUri);
        const backAsset = await MediaLibrary.createAssetAsync(backUri);

        await MediaLibrary.createAlbumAsync("SmartWave", frontAsset, false);
        await MediaLibrary.addAssetsToAlbumAsync([backAsset], "SmartWave", false);

        Alert.alert("Success", "Card saved to your photos!");
      } catch (saveError) {
        console.error("Save to photos error:", saveError);
        Alert.alert(
          "Save Failed",
          "Could not save to photos. Try the Share button to save or share the image."
        );
      }
    } catch (e) {
      console.error("Error saving card:", e);
      Alert.alert("Error", "Failed to save card. Please try the Share button instead.");
    } finally {
      setSaving(false);
    }
  };

  const shareCard = async () => {
    if (!frontRef.current || !profile) return;

    try {
      setSaving(true);
      const uri = await captureRef(frontRef.current, { format: "png", quality: 1.0 });
      const message = `Check out ${profile.name || "my"} digital business card`;
      if (Platform.OS === "android") {
        await Share.share({ message, url: uri, type: "image/png" });
      } else {
        await Share.share({ url: uri, message });
      }
    } catch (e: any) {
      if (e?.message && !e.message.includes("User cancelled") && !e.message?.includes("canceled")) {
        console.error("Error sharing card:", e);
        Alert.alert("Error", "Failed to share card. Please try again.");
      }
    } finally {
      setSaving(false);
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
                        value={vCardData}
                        size={120}
                        color="#000000"
                        backgroundColor="#FFFFFF"
                        logo={profile.companyLogo ? { uri: profile.companyLogo } : undefined}
                        logoSize={18}
                        logoBackgroundColor="#FFFFFF"
                        logoMargin={2}
                        logoBorderRadius={2}
                        errorCorrectionLevel="H"
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
