import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getPasses, Pass, PassesResponse } from "../api/client";

type Props = {
  navigation?: any;
};

export default function PassesScreen({ navigation }: Props) {
  const { token } = useAuth();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<PassesResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"corporate" | "public">("public");

  const loadPasses = async () => {
    if (!token) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    try {
      setError("");
      const result = await getPasses(token);
      setData(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load passes";
      setError(msg);
      console.error("[PassesScreen] Error loading passes:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPasses();
  }, [token]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPasses();
  };

  const handlePassPress = (pass: Pass) => {
    if (navigation) {
      navigation.navigate("PassDetail", { passId: pass._id });
    }
  };

  const getStatusColor = (status: string | null | undefined) => {
    if (!status) return colors.textMuted;
    if (status === "approved") return "#10B981"; // green
    if (status === "pending") return "#F59E0B"; // amber
    if (status === "rejected") return colors.error;
    return colors.textMuted;
  };

  const getStatusText = (status: string | null | undefined) => {
    if (!status) return "Not requested";
    if (status === "approved") return "Approved";
    if (status === "pending") return "Pending approval";
    if (status === "rejected") return "Rejected";
    return "Unknown";
  };

  const renderPassCard = (pass: Pass) => {
    const statusColor = getStatusColor(pass.membershipStatus);
    const statusText = getStatusText(pass.membershipStatus);

    return (
      <TouchableOpacity
        key={pass._id}
        style={[styles.passCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => handlePassPress(pass)}
        activeOpacity={0.7}
      >
        <View style={styles.passCardHeader}>
          <Text style={[styles.passName, { color: colors.text }]}>{pass.name}</Text>
          {pass.membershipStatus && (
            <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
            </View>
          )}
        </View>

        {pass.description && (
          <Text style={[styles.passDescription, { color: colors.textMuted }]} numberOfLines={2}>
            {pass.description}
          </Text>
        )}

        <View style={styles.passMeta}>
          <Text style={[styles.passType, { color: colors.primary }]}>
            {pass.type === "event" ? "Event" : "Access"}
          </Text>
          {pass.dateStart && (
            <Text style={[styles.passDate, { color: colors.textMuted }]}>
              {new Date(pass.dateStart).toLocaleDateString()}
            </Text>
          )}
        </View>

        {pass.location?.name && (
          <Text style={[styles.passLocation, { color: colors.textMuted }]} numberOfLines={1}>
            📍 {pass.location.name}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={loadPasses}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const corporatePasses = data?.corporate || [];
  const publicPasses = data?.passes || [];
  const isEmployee = data?.isEmployee || false;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tabs: show for all users so retail (Google) users can view and opt for public passes */}
      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "corporate" && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab("corporate")}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "corporate" ? colors.primary : colors.textMuted },
            ]}
          >
            Corporate ({corporatePasses.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "public" && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab("public")}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "public" ? colors.primary : colors.textMuted },
            ]}
          >
            Public ({publicPasses.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {error && data && (
          <View style={[styles.errorBanner, { backgroundColor: colors.error + "20" }]}>
            <Text style={[styles.errorBannerText, { color: colors.error }]}>{error}</Text>
          </View>
        )}

        {activeTab === "corporate" && (
          <>
            {corporatePasses.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {isEmployee
                    ? "No corporate passes available yet."
                    : "Sign in as a corporate employee to see company passes."}
                </Text>
              </View>
            ) : (
              corporatePasses.map(renderPassCard)
            )}
          </>
        )}

        {activeTab === "public" && (
          <>
            {publicPasses.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No public passes available.
                </Text>
              </View>
            ) : (
              publicPasses.map(renderPassCard)
            )}
          </>
        )}
      </ScrollView>
    </View>
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
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  errorBanner: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 14,
  },
  passCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  passCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  passName: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  passDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  passMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  passType: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  passDate: {
    fontSize: 12,
  },
  passLocation: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyState: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
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
