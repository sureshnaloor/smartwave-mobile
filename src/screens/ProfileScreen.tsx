import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { ADMIN_CREATED_MESSAGE } from "../context/ProfilePermissionsContext";
import { getProfile, updateProfile, type Profile } from "../api/client";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { token } = useAuth();
  const { colors } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [workPhone, setWorkPhone] = useState("");

  useEffect(() => {
    if (!token) return;
    getProfile(token)
      .then((p) => {
        setProfile(p);
        setFirstName(p.firstName ?? "");
        setLastName(p.lastName ?? "");
        setTitle(p.title ?? "");
        setCompany(p.company ?? "");
        setWorkEmail(p.workEmail ?? "");
        setMobile(p.mobile ?? "");
        setWorkPhone(p.workPhone ?? "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [token]);

  const applyDirty = () => {
    setFirstName(profile?.firstName ?? "");
    setLastName(profile?.lastName ?? "");
    setTitle(profile?.title ?? "");
    setCompany(profile?.company ?? "");
    setWorkEmail(profile?.workEmail ?? "");
    setMobile(profile?.mobile ?? "");
    setWorkPhone(profile?.workPhone ?? "");
    setDirty(false);
  };

  const save = async () => {
    if (!token) return;
    setSaving(true);
    setError("");
    try {
      await updateProfile(token, {
        firstName,
        lastName,
        title,
        company,
        workEmail,
        mobile,
        workPhone,
      });
      setProfile((prev) => (prev ? { ...prev, firstName, lastName, title, company, workEmail, mobile, workPhone } : null));
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
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

  if (error && !profile) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      </View>
    );
  }

  if (profile?.createdByAdminId) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <View style={[styles.adminBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.adminBlockText, { color: colors.textMuted }]}>{ADMIN_CREATED_MESSAGE}</Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Edit and save. Same data as the web app.</Text>

        <Field label="First name" value={firstName} onChangeText={setFirstName} onBlur={() => setDirty(true)} colors={colors} />
        <Field label="Last name" value={lastName} onChangeText={setLastName} onBlur={() => setDirty(true)} colors={colors} />
        <Field label="Job title" value={title} onChangeText={setTitle} onBlur={() => setDirty(true)} colors={colors} />
        <Field label="Company" value={company} onChangeText={setCompany} onBlur={() => setDirty(true)} colors={colors} />
        <Field label="Work email" value={workEmail} onChangeText={setWorkEmail} onBlur={() => setDirty(true)} keyboardType="email-address" colors={colors} />
        <Field label="Mobile" value={mobile} onChangeText={setMobile} onBlur={() => setDirty(true)} keyboardType="phone-pad" colors={colors} />
        <Field label="Work phone" value={workPhone} onChangeText={setWorkPhone} onBlur={() => setDirty(true)} keyboardType="phone-pad" colors={colors} />

        {error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: Math.max(32, insets.bottom) }]}>
        {dirty ? (
          <TouchableOpacity style={styles.cancelButton} onPress={applyDirty}>
            <Text style={[styles.cancelButtonText, { color: colors.textMuted }]}>Cancel</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.cancelButton} />
        )}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }, saving && styles.buttonDisabled]}
          onPress={save}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.buttonText}>Save</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  onBlur,
  keyboardType,
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  onBlur?: () => void;
  keyboardType?: "email-address" | "phone-pad";
  colors: { textMuted: string; card: string; text: string };
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 24, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, marginBottom: 6 },
  input: { borderRadius: 12, padding: 14, fontSize: 16 },
  errorText: { marginBottom: 12 },
  footer: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    minHeight: 64,
  },
  cancelButton: { flex: 1, padding: 16, alignItems: "center", justifyContent: "center" },
  cancelButtonText: { fontSize: 16 },
  button: { flex: 1, borderRadius: 12, padding: 16, alignItems: "center", justifyContent: "center" },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  adminBlock: {
    margin: 24,
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: 400,
  },
  adminBlockText: { fontSize: 15, lineHeight: 22, marginBottom: 20, textAlign: "center" },
  backButton: { borderRadius: 12, padding: 16, alignItems: "center" },
  backButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
