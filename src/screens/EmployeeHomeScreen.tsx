import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Linking, Alert, ScrollView } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getProfile, type Profile } from "../api/client";
import { API_BASE, getWalletAppleUrl, getWalletGoogleUrl } from "../config";

type Props = {
  navigation?: any;
};

export default function EmployeeHomeScreen({ navigation }: Props) {
  const { token } = useAuth();
  const { colors } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("Not authenticated. Please sign in again.");
      setProfile(null);
      return;
    }
    
    let cancelled = false;
    setLoading(true);
    
    getProfile(token)
      .then((p) => {
        if (!cancelled) {
          setProfile(p);
        }
      })
      .catch((e) => {
        if (!cancelled) {
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

  if (error || !profile) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>{error || "Unable to load your profile."}</Text>
      </View>
    );
  }

  const name =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
    profile.name ||
    profile.userEmail ||
    "Employee";

  const isAdminCreated = Boolean(profile.createdByAdminId);
  const shorturl = profile.shorturl ?? null;
  const publicUrl = shorturl ? `${API_BASE.replace(/\/$/, "")}/publicprofile/${shorturl}` : null;
  const appleUrl = shorturl ? getWalletAppleUrl(shorturl) : null;
  const googleUrl = shorturl ? getWalletGoogleUrl(shorturl) : null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.welcomeTitle, { color: colors.text }]}>Welcome back</Text>
      <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
        {name}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        View and share your company-managed SmartWave profile.
      </Text>

      {isAdminCreated && (
        <View style={[styles.banner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.bannerText, { color: colors.textMuted }]}>
            Your profile is managed by your company admin. You can view and share your details; edits are done by admin.
          </Text>
        </View>
      )}

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Your profile link</Text>
        <Text style={[styles.cardDescription, { color: colors.textMuted }]}>
          Open your public digital profile or copy the link to share.
        </Text>

        {publicUrl ? (
          <>
            <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={() => openUrl(publicUrl)}>
              <Text style={styles.buttonText}>Open my profile</Text>
            </TouchableOpacity>
            <Text style={[styles.linkText, { color: colors.primary }]} selectable>
              {publicUrl}
            </Text>
          </>
        ) : (
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            Your shareable link is being set up. Please try again shortly.
          </Text>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Add to Wallet</Text>
        <Text style={[styles.cardDescription, { color: colors.textMuted }]}>
          Add your company-issued card to Apple Wallet or Google Wallet.
        </Text>

        {appleUrl && (
          <TouchableOpacity
            style={[styles.button, styles.appleButton]}
            onPress={() => openUrl(appleUrl)}
          >
            <Text style={styles.buttonText}>Add to Apple Wallet</Text>
          </TouchableOpacity>
        )}

        {googleUrl && (
          <TouchableOpacity
            style={[styles.button, styles.googleButton]}
            onPress={() => openUrl(googleUrl)}
          >
            <Text style={styles.buttonText}>Save to Google Wallet</Text>
          </TouchableOpacity>
        )}

        {!appleUrl && !googleUrl && (
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            Wallet links will appear once your profile is ready on the web.
          </Text>
        )}
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            if (__DEV__) {
              console.log("[EmployeeHomeScreen] Navigating to DigitalCard, navigation:", !!navigation);
            }
            if (navigation) {
              navigation.navigate("DigitalCard");
            } else {
              console.error("[EmployeeHomeScreen] Navigation not available!");
            }
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.actionButtonText}>View Digital Card</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton, { borderColor: colors.border }]}
          onPress={() => {
            if (__DEV__) {
              console.log("[EmployeeHomeScreen] Navigating to QRCode, navigation:", !!navigation);
            }
            if (navigation) {
              navigation.navigate("QRCode");
            } else {
              console.error("[EmployeeHomeScreen] Navigation not available!");
            }
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionButtonTextSecondary, { color: colors.text }]}>View QR Code</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Passes & Access</Text>
        <Text style={[styles.cardDescription, { color: colors.textMuted }]}>
          View corporate event passes and access passes. Request access and add approved passes to your wallet.
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary, marginTop: 12 }]}
          onPress={() => {
            if (navigation) {
              navigation.navigate("Passes");
            }
          }}
        >
          <Text style={styles.buttonText}>View Passes</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Notifications</Text>
        <Text style={[styles.cardDescription, { color: colors.textMuted }]}>
          Stay updated on pass approvals and company announcements.
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary, marginTop: 12 }]}
          onPress={() => {
            if (navigation) {
              navigation.navigate("Notifications");
            }
          }}
        >
          <Text style={styles.buttonText}>View Notifications</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  welcomeTitle: { fontSize: 16, fontWeight: "500", marginBottom: 4 },
  name: { fontSize: 24, fontWeight: "700", marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 20 },
  banner: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 20,
  },
  bannerText: { fontSize: 13, lineHeight: 18 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
  },
  cardTitle: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  cardDescription: { fontSize: 13, marginBottom: 12 },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  primaryButton: { backgroundColor: "#3b82f6" },
  appleButton: { backgroundColor: "#000" },
  googleButton: { backgroundColor: "#4285F4" },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  linkText: { fontSize: 12, marginTop: 4 },
  infoText: { fontSize: 13 },
  errorText: { textAlign: "center", padding: 24, fontSize: 15 },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  secondaryButton: {
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  actionButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  actionButtonTextSecondary: { fontSize: 15, fontWeight: "600" },
});

