import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useProfilePermissions, ADMIN_CREATED_MESSAGE } from "../context/ProfilePermissionsContext";
import { getProfile, type Profile } from "../api/client";
import { useTheme } from "../context/ThemeContext";

type Props = {
  onEdit: () => void;
  navigation?: any;
};

function Row({
  label,
  value,
  colors,
}: {
  label: string;
  value?: string | null;
  colors: { textMuted: string; text: string };
}) {
  if (value == null || value === "") return null;
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

export default function HomeScreen({ onEdit, navigation }: Props) {
  const { token } = useAuth();
  const { colors } = useTheme();
  const { setCanEditProfile } = useProfilePermissions();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("Not authenticated. Please sign in.");
      return;
    }
    
    setLoading(true);
    setError("");
    
    getProfile(token)
      .then((p) => {
        setProfile(p);
        setCanEditProfile(!p?.createdByAdminId);
        setError("");
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : "Failed to load profile";
        setError(msg);
        // If unauthorized, clear profile to trigger sign-in
        if (msg.includes("Unauthorized") || msg.includes("invalid") || msg.includes("expired")) {
          setProfile(null);
        }
      })
      .finally(() => setLoading(false));
  }, [token, setCanEditProfile]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error && !profile) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        {(error.includes("timeout") || error.includes("Network request failed") || error.includes("Server running")) && (
          <Text style={[styles.errorHint, { color: colors.textMuted, marginTop: 12 }]}>
            Make sure your backend server is running and accessible.
          </Text>
        )}
      </View>
    );
  }

  const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || profile?.name || profile?.userEmail || "—";
  const isAdminCreated = Boolean(profile?.createdByAdminId);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {isAdminCreated && (
        <View style={[styles.adminBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.adminBannerText, { color: colors.textMuted }]}>{ADMIN_CREATED_MESSAGE}</Text>
        </View>
      )}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          {profile?.photo ? (
            <Image source={{ uri: profile.photo }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.nameBlock}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
              {name}
            </Text>
            {profile?.title ? (
              <Text style={[styles.title, { color: colors.textMuted }]} numberOfLines={1}>
                {profile.title}
              </Text>
            ) : null}
            {profile?.company ? (
              <Text style={[styles.company, { color: colors.textMuted }]} numberOfLines={1}>
                {profile.company}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Row label="Work email" value={profile?.workEmail || profile?.userEmail} colors={colors} />
        <Row label="Mobile" value={profile?.mobile} colors={colors} />
        <Row label="Work phone" value={profile?.workPhone} colors={colors} />
        <Row label="Website" value={profile?.website} colors={colors} />
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            if (__DEV__) {
              console.log("[HomeScreen] Navigating to DigitalCard, navigation:", !!navigation);
            }
            if (navigation) {
              navigation.navigate("DigitalCard");
            } else {
              console.error("[HomeScreen] Navigation not available!");
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
              console.log("[HomeScreen] Navigating to QRCode, navigation:", !!navigation);
            }
            if (navigation) {
              navigation.navigate("QRCode");
            } else {
              console.error("[HomeScreen] Navigation not available!");
            }
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionButtonTextSecondary, { color: colors.text }]}>View QR Code</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Passes & Access</Text>
        <Text style={[styles.cardDescription, { color: colors.textMuted }]}>
          View public event passes and access passes. Request access and add approved passes to your wallet.
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

      {!isAdminCreated && (
        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: colors.primary }]}
          onPress={onEdit}
          activeOpacity={0.8}
        >
          <Text style={styles.editButtonText}>Edit profile</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  adminBanner: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  adminBannerText: { fontSize: 13, lineHeight: 20 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 4 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 24, fontWeight: "700", color: "#fff" },
  nameBlock: { flex: 1, marginLeft: 16 },
  name: { fontSize: 20, fontWeight: "700", marginBottom: 2 },
  title: { fontSize: 14, marginBottom: 2 },
  company: { fontSize: 13, opacity: 0.9 },
  divider: { height: 1, marginVertical: 16 },
  row: { marginBottom: 12 },
  label: { fontSize: 12, marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  value: { fontSize: 15 },
  errorText: { textAlign: "center", padding: 24, fontSize: 16 },
  errorHint: { textAlign: "center", paddingHorizontal: 24, fontSize: 14 },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
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
  editButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  editButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  cardTitle: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  cardDescription: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  button: {
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
