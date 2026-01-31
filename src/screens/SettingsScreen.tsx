import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Switch } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

export default function SettingsScreen() {
  const { theme, setTheme, fontScaleKey, setFontScaleKey, colors } = useTheme();
  const { signOut } = useAuth();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Appearance</Text>
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.text }]}>Dark mode</Text>
          <Switch
            value={theme === "dark"}
            onValueChange={(v) => setTheme(v ? "dark" : "light")}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
          />
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Font size</Text>
        {(["small", "default", "large"] as const).map((key) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.fontOption,
              { borderColor: colors.border },
              fontScaleKey === key && { backgroundColor: colors.primary + "20", borderColor: colors.primary, borderWidth: 1 },
            ]}
            onPress={() => setFontScaleKey(key)}
          >
            <Text
              style={[
                styles.fontOptionText,
                { color: colors.text },
                key === "small" && styles.fontSmall,
                key === "large" && styles.fontLarge,
              ]}
            >
              {key === "small" ? "Small" : key === "default" ? "Default" : "Large"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Account</Text>
        <TouchableOpacity
          style={[styles.logoutButton, { borderColor: colors.error }]}
          onPress={() => signOut()}
        >
          <Text style={[styles.logoutButtonText, { color: colors.error }]}>Log out</Text>
        </TouchableOpacity>
        <Text style={[styles.logoutHint, { color: colors.textMuted }]}>
          Sign out to switch to another account.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: { fontSize: 16 },
  fontOption: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  fontOptionText: { fontSize: 16 },
  fontSmall: { fontSize: 14 },
  fontLarge: { fontSize: 18 },
  logoutButton: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  logoutButtonText: { fontSize: 16, fontWeight: "600" },
  logoutHint: { fontSize: 12, marginTop: 8 },
});
