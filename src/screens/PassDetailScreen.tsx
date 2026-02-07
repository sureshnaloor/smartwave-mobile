import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getPass, requestPassAccess, getPassMembership, Pass } from "../api/client";
import { getPassWalletAppleUrl, getPassWalletGoogleUrl } from "../config";

type Props = {
  route?: {
    params?: {
      passId: string;
    };
  };
  navigation?: any;
};

export default function PassDetailScreen({ route, navigation }: Props) {
  const { token } = useAuth();
  const { colors } = useTheme();
  const passId = route?.params?.passId;
  const [loading, setLoading] = useState(true);
  const [pass, setPass] = useState<Pass | null>(null);
  const [membershipStatus, setMembershipStatus] = useState<string | null>(null);
  const [membershipId, setMembershipId] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!passId || !token) {
      setError("Missing pass ID or authentication");
      setLoading(false);
      return;
    }

    loadPass();
  }, [passId, token]);

  const loadPass = async () => {
    if (!passId || !token) return;

    try {
      setError("");
      const [passData, membershipData] = await Promise.all([
        getPass(token, passId),
        getPassMembership(token, passId),
      ]);

      setPass(passData.pass);
      setMembershipStatus(membershipData.membership?.status || null);
      setMembershipId(membershipData.membership?._id || null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load pass";
      setError(msg);
      console.error("[PassDetailScreen] Error loading pass:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccess = async () => {
    if (!passId || !token || requesting) return;

    setRequesting(true);
    try {
      const result = await requestPassAccess(token, passId);
      setMembershipStatus("pending");
      setMembershipId(result.membership._id);
      Alert.alert(
        "Request Sent",
        "Your access request has been sent to the admin. You'll be notified when it's approved.",
        [{ text: "OK" }]
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to request access";
      Alert.alert("Error", msg);
      console.error("[PassDetailScreen] Error requesting access:", e);
    } finally {
      setRequesting(false);
    }
  };

  const handleAddToWallet = async (type: "apple" | "google") => {
    if (!passId || !token) return;

    try {
      // Append token as query parameter for Linking.openURL compatibility
      // The mobile wallet endpoint accepts token from either header or query param
      const baseUrl = type === "apple" ? getPassWalletAppleUrl(passId) : getPassWalletGoogleUrl(passId);
      const url = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", `Could not open ${type === "apple" ? "Apple Wallet" : "Google Wallet"}.`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to add pass to wallet";
      Alert.alert("Error", msg);
      console.error("[PassDetailScreen] Error adding to wallet:", e);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !pass) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          {error || "Pass not found"}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={loadPass}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isApproved = membershipStatus === "approved";
  const isPending = membershipStatus === "pending";
  const canRequest = !membershipStatus;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Header */}
        <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.passName, { color: colors.text }]}>{pass.name}</Text>
          <View style={styles.typeBadge}>
            <Text style={[styles.typeText, { color: colors.primary }]}>
              {pass.type === "event" ? "Event Pass" : "Access Pass"}
            </Text>
          </View>
        </View>

        {/* Description */}
        {pass.description && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
            <Text style={[styles.description, { color: colors.textMuted }]}>{pass.description}</Text>
          </View>
        )}

        {/* Details */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Details</Text>

          {pass.dateStart && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Start Date:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {new Date(pass.dateStart).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </View>
          )}

          {pass.dateEnd && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>End Date:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {new Date(pass.dateEnd).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </View>
          )}

          {pass.location?.name && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Location:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{pass.location.name}</Text>
            </View>
          )}

          {pass.category && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Category:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{pass.category}</Text>
            </View>
          )}
        </View>

        {/* Membership Status */}
        {membershipStatus && (
          <View
            style={[
              styles.statusCard,
              {
                backgroundColor:
                  membershipStatus === "approved"
                    ? "#10B98120"
                    : membershipStatus === "pending"
                    ? "#F59E0B20"
                    : colors.error + "20",
                borderColor:
                  membershipStatus === "approved"
                    ? "#10B981"
                    : membershipStatus === "pending"
                    ? "#F59E0B"
                    : colors.error,
              },
            ]}
          >
            <Text
              style={{
                color:
                  membershipStatus === "approved"
                    ? "#10B981"
                    : membershipStatus === "pending"
                    ? "#F59E0B"
                    : colors.error,
                fontWeight: "600",
                fontSize: 16,
              }}
            >
              {membershipStatus === "approved"
                ? "✓ Access Approved"
                : membershipStatus === "pending"
                ? "⏳ Pending Approval"
                : "✗ Access Rejected"}
            </Text>
            {membershipStatus === "pending" && (
              <Text style={[styles.statusHint, { color: colors.textMuted }]}>
                Your request is being reviewed by the admin.
              </Text>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {canRequest && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handleRequestAccess}
              disabled={requesting}
            >
              {requesting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.actionButtonText}>Request Access</Text>
              )}
            </TouchableOpacity>
          )}

          {isPending && (
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.infoText, { color: colors.textMuted }]}>
                Waiting for admin approval. You'll receive a notification when your request is processed.
              </Text>
            </View>
          )}

          {isApproved && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24, marginBottom: 12 }]}>
                Add to Wallet
              </Text>
              {Platform.OS === "ios" && (
                <TouchableOpacity
                  style={[styles.walletButton, { backgroundColor: "#000" }]}
                  onPress={() => handleAddToWallet("apple")}
                >
                  <Text style={styles.walletButtonText}>Add to Apple Wallet</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.walletButton,
                  { backgroundColor: "#4285F4", marginTop: Platform.OS === "ios" ? 12 : 0 },
                ]}
                onPress={() => handleAddToWallet("google")}
              >
                <Text style={styles.walletButtonText}>Save to Google Wallet</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  content: {
    padding: 16,
  },
  headerCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  passName: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  typeBadge: {
    alignSelf: "flex-start",
  },
  typeText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
    flex: 1,
    textAlign: "right",
  },
  statusCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
  },
  statusHint: {
    fontSize: 14,
    marginTop: 8,
  },
  actions: {
    marginBottom: 32,
  },
  actionButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  walletButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  walletButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
