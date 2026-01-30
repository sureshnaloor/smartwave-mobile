import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Alert, Platform } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getProfile } from "../api/client";
import { getWalletAppleUrl, getWalletGoogleUrl } from "../config";

export default function WalletScreen() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const [shorturl, setShorturl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    getProfile(token)
      .then((p) => setShorturl(p.shorturl ?? null))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load profile"))
      .finally(() => setLoading(false));
  }, [token]);

  const openUrl = (url: string) => {
    Linking.canOpenURL(url).then((can) => {
      if (can) Linking.openURL(url);
      else Alert.alert("Error", "Could not open link.");
    });
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !shorturl) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          {error || "No short URL yet. Save your profile on the web app first to get a shareable link."}
        </Text>
      </View>
    );
  }

  const appleUrl = getWalletAppleUrl(shorturl);
  const googleUrl = getWalletGoogleUrl(shorturl);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Add to Wallet</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Open the link to add your SmartWave digital card to Apple Wallet or Google Wallet.
      </Text>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#000" }]}
        onPress={() => openUrl(appleUrl)}
      >
        <Text style={styles.buttonText}>Add to Apple Wallet</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.buttonSecondary, { backgroundColor: colors.card }]}
        onPress={() => openUrl(googleUrl)}
      >
        <Text style={styles.buttonText}>Save to Google Wallet</Text>
      </TouchableOpacity>

      {Platform.OS === "ios" && (
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          On iPhone, Apple Wallet will open directly. For Google Wallet, the link opens in the browser.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 32 },
  button: { borderRadius: 12, padding: 18, alignItems: "center", marginBottom: 12 },
  buttonSecondary: {},
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  errorText: { textAlign: "center", padding: 24 },
  hint: { fontSize: 12, marginTop: 24 },
});
