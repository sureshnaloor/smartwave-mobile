import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Share,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getProfile, type Profile } from "../api/client";
import { generateVCardData } from "../utils/vcard";
import QRCode from "react-native-qrcode-svg";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import { captureRef } from "react-native-view-shot";

type QRSize = "small" | "medium" | "large";

export default function QRCodeScreen() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [size, setSize] = useState<QRSize>("medium");
  const [saving, setSaving] = useState(false);
  const [qrError, setQrError] = useState("");
  const qrRef = React.useRef<View>(null);

  useEffect(() => {
    if (__DEV__) {
      console.log("[QRCodeScreen] Component mounted");
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("Not authenticated. Please sign in.");
      return;
    }
    if (__DEV__) {
      console.log("[QRCodeScreen] Loading profile...");
    }
    getProfile(token)
      .then((p) => {
        if (__DEV__) {
          console.log("[QRCodeScreen] Profile loaded:", p?.name);
        }
        setProfile(p);
      })
      .catch((e) => {
        console.error("[QRCodeScreen] Error loading profile:", e);
        setError(e instanceof Error ? e.message : "Failed to load profile");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const getQRSize = () => {
    switch (size) {
      case "small":
        return 200;
      case "medium":
        return 300;
      case "large":
        return 400;
    }
  };

  const downloadQRCode = async () => {
    if (!qrRef.current || !profile) return;

    try {
      setSaving(true);
      const uri = await captureRef(qrRef.current, {
        format: "png",
        quality: 1.0,
      });

      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Required",
            "Please grant photo library access in Settings to save the QR code to your photos."
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

      let uriToSave = uri;
      if (Platform.OS === "android") {
        const cacheDir = FileSystem.cacheDirectory ?? "";
        const path = `${cacheDir}smartwave_qr_${Date.now()}.png`;
        await FileSystem.copyAsync({ from: uri, to: path });
        uriToSave = path;
      }
      try {
        const asset = await MediaLibrary.createAssetAsync(uriToSave);
        await MediaLibrary.createAlbumAsync("SmartWave", asset, false);
        Alert.alert("Success", "QR code saved to your photos!");
      } catch (saveError) {
        console.error("Save to photos error:", saveError);
        Alert.alert(
          "Save Failed",
          "Could not save to photos. Try the Share button to save or share the image."
        );
      }
    } catch (e) {
      console.error("Error saving QR code:", e);
      Alert.alert("Error", "Failed to save QR code. Please try the Share button instead.");
    } finally {
      setSaving(false);
    }
  };

  const shareQRCode = async () => {
    if (!qrRef.current || !profile) return;

    try {
      setSaving(true);
      const uri = await captureRef(qrRef.current, {
        format: "png",
        quality: 1.0,
      });
      let shareUri = uri;
      if (Platform.OS === "android") {
        const cacheDir = FileSystem.cacheDirectory ?? "";
        const path = `${cacheDir}smartwave_qr_share_${Date.now()}.png`;
        await FileSystem.copyAsync({ from: uri, to: path });
        shareUri = path;
      }
      const message = `Scan this QR code to add ${profile.name || "contact"} to your contacts`;
      if (Platform.OS === "android") {
        await Share.share({ message, url: shareUri, type: "image/png" });
      } else {
        await Share.share({ url: shareUri, message });
      }
    } catch (e: any) {
      if (e?.message && !e.message.includes("User cancelled") && !e.message?.includes("canceled")) {
        console.error("Error sharing QR code:", e);
        Alert.alert("Error", "Failed to share QR code. Please try again.");
      }
      // User cancelled - no need to show error
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

  let vCardData = "";
  try {
    vCardData = generateVCardData(profile);
    if (__DEV__) {
      console.log("[QRCodeScreen] Generated vCard data length:", vCardData.length);
    }
  } catch (e) {
    console.error("[QRCodeScreen] Error generating vCard:", e);
    setQrError("Failed to generate contact data");
  }

  const qrSize = getQRSize();

  if (__DEV__) {
    console.log("[QRCodeScreen] Rendering with QR size:", qrSize);
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: colors.text }]}>Your QR Code</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Scan to add {profile.name || "contact"} to your contacts
      </Text>

      <View ref={qrRef} collapsable={false}>
        <View style={[styles.qrContainer, { backgroundColor: "#fff", borderColor: colors.border }]}>
          {qrError || !vCardData ? (
            <View style={styles.qrErrorContainer}>
              <Text style={[styles.qrErrorText, { color: colors.error }]}>
                {qrError || "Unable to generate QR code. Please ensure your profile has contact information."}
              </Text>
            </View>
          ) : (
            <QRCode
              value={vCardData}
              size={qrSize}
              color="#000000"
              backgroundColor="#FFFFFF"
              logo={profile.companyLogo ? { uri: profile.companyLogo } : undefined}
              logoSize={qrSize * 0.15}
              logoBackgroundColor="#FFFFFF"
              logoMargin={2}
              logoBorderRadius={4}
              errorCorrectionLevel="H"
              onError={(e) => {
                console.error("QR Code generation error:", e);
                setQrError("Failed to generate QR code. Please try again.");
              }}
            />
          )}
        </View>
      </View>

      <View style={styles.controls}>
        <Text style={[styles.label, { color: colors.text }]}>Size</Text>
        <View style={styles.sizeButtons}>
          {(["small", "medium", "large"] as QRSize[]).map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.sizeButton,
                size === s && { backgroundColor: colors.primary },
                { borderColor: colors.border },
              ]}
              onPress={() => setSize(s)}
            >
              <Text
                style={[
                  styles.sizeButtonText,
                  { color: size === s ? "#fff" : colors.text },
                ]}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={downloadQRCode}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Save to Photos</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, { borderColor: colors.border }]}
          onPress={shareQRCode}
          disabled={saving}
        >
          <Text style={[styles.buttonTextSecondary, { color: colors.text }]}>Share</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.infoText, { color: colors.textMuted }]}>
          This QR code contains your contact information in vCard format. When scanned, it will add
          your details directly to the contact list.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, alignItems: "center", paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 14, marginBottom: 32, textAlign: "center" },
  qrContainer: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 20,
    marginBottom: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  controls: { width: "100%", marginBottom: 24 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 12 },
  sizeButtons: { flexDirection: "row", gap: 12 },
  sizeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  sizeButtonText: { fontSize: 14, fontWeight: "600" },
  actions: { width: "100%", gap: 12, marginBottom: 24 },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButton: {},
  secondaryButton: {
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  buttonTextSecondary: { fontSize: 16, fontWeight: "600" },
  infoBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    width: "100%",
  },
  infoText: { fontSize: 13, lineHeight: 20, textAlign: "center" },
  errorText: { textAlign: "center", padding: 24, fontSize: 15 },
  qrErrorContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  qrErrorText: {
    textAlign: "center",
    fontSize: 14,
  },
});
