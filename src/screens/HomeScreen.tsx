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

export default function HomeScreen({ onEdit }: Props) {
  const { token } = useAuth();
  const { colors } = useTheme();
  const { setCanEditProfile } = useProfilePermissions();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    getProfile(token)
      .then((p) => {
        setProfile(p);
        setCanEditProfile(!p?.createdByAdminId);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
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
  errorText: { textAlign: "center", padding: 24 },
  editButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  editButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
