import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getPasses, Pass, PassesResponse } from "../api/client";

export type PassTab = "corporate" | "upcoming" | "available" | "requested" | "expired" | "draft" | "my-passes";

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
  const [activeTab, setActiveTab] = useState<PassTab>("upcoming");
  const hasAutoSwitchedCorporate = useRef(false);

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

  // Auto-switch to corporate tab for employees once on first load when they have corporate passes
  useEffect(() => {
    if (
      data &&
      !hasAutoSwitchedCorporate.current &&
      data.isEmployee &&
      (data.corporate?.length ?? 0) > 0
    ) {
      hasAutoSwitchedCorporate.current = true;
      setActiveTab("corporate");
    }
  }, [data]);

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
    if (status === "approved") return "#10B981";
    if (status === "pending") return "#F59E0B";
    if (status === "rejected") return colors.error;
    return colors.textMuted;
  };

  const getStatusText = (status: string | null | undefined) => {
    if (!status) return "Not requested";
    if (status === "approved") return "Approved";
    if (status === "pending") return "Pending";
    if (status === "rejected") return "Rejected";
    return "Unknown";
  };

  // Same filtering logic as web app
  const getFilteredPasses = (): Pass[] => {
    if (!data) return [];
    const now = new Date();
    const publicPasses = data.passes || [];
    const corporate = data.corporate || [];
    const myPasses = data.myPasses || [];

    switch (activeTab) {
      case "corporate":
        return corporate;
      case "my-passes":
        return myPasses;
      case "upcoming":
        return publicPasses.filter(
          (p) =>
            p.membershipStatus === "approved" &&
            (!p.dateEnd || new Date(p.dateEnd) > now)
        );
      case "available":
        return publicPasses.filter(
          (p) =>
            p.status === "active" &&
            !p.membershipStatus &&
            (!p.dateEnd || new Date(p.dateEnd) > now)
        );
      case "requested":
        return publicPasses.filter((p) => p.membershipStatus === "pending");
      case "expired":
        return publicPasses.filter(
          (p) =>
            p.membershipStatus === "approved" &&
            p.dateEnd &&
            new Date(p.dateEnd) <= now
        );
      case "draft":
        return publicPasses.filter((p) => p.status === "draft");
      default:
        return publicPasses;
    }
  };

  const filteredPasses = getFilteredPasses();
  const eventPasses = filteredPasses.filter((p) => p.type === "event");
  const accessPasses = filteredPasses.filter((p) => p.type === "access");

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
          <Text style={[styles.passName, { color: colors.text }]} numberOfLines={2}>
            {pass.name}
          </Text>
          <View style={styles.badgesRow}>
            {pass.membershipStatus && (
              <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
              </View>
            )}
            {pass.status === "draft" && (
              <View style={[styles.statusBadge, { backgroundColor: "#EF444420" }]}>
                <Text style={[styles.statusText, { color: "#EF4444" }]}>Draft</Text>
              </View>
            )}
            <View style={[styles.typeBadge, { borderColor: colors.primary }]}>
              <Text style={[styles.typeBadgeText, { color: colors.primary }]}>
                {pass.type === "event" ? "Event" : "Access"}
              </Text>
            </View>
          </View>
        </View>

        {pass.description ? (
          <Text style={[styles.passDescription, { color: colors.textMuted }]} numberOfLines={2}>
            {pass.description}
          </Text>
        ) : null}

        <View style={styles.passMeta}>
          {pass.dateStart ? (
            <Text style={[styles.passDate, { color: colors.textMuted }]}>
              {new Date(pass.dateStart).toLocaleDateString()}
            </Text>
          ) : (
            <Text style={[styles.passDate, { color: colors.textMuted }]}>—</Text>
          )}
        </View>

        {pass.location?.name ? (
          <Text style={[styles.passLocation, { color: colors.textMuted }]} numberOfLines={1}>
            📍 {pass.location.name}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  const tabLabels: { key: PassTab; label: string; showWhen?: (d: PassesResponse) => boolean }[] = [
    { key: "corporate", label: "Corporate", showWhen: (d) => !!d.isEmployee },
    { key: "upcoming", label: "Upcoming" },
    { key: "available", label: "Available" },
    { key: "requested", label: "Requested" },
    { key: "expired", label: "Expired" },
    { key: "draft", label: "Draft" },
    { key: "my-passes", label: "My Created", showWhen: (d) => !!d.isPublicAdmin },
  ];

  const visibleTabs = tabLabels.filter((t) => !t.showWhen || (data && t.showWhen(data)));

  const getEmptyMessage = () => {
    switch (activeTab) {
      case "corporate":
        return data?.isEmployee
          ? "No corporate passes available yet."
          : "Sign in as a corporate employee to see company passes.";
      case "my-passes":
        return "No passes created yet.";
      case "upcoming":
        return "No upcoming passes.";
      case "available":
        return "No available passes.";
      case "requested":
        return "No requested passes.";
      case "expired":
        return "No expired passes.";
      case "draft":
        return "No draft passes.";
      default:
        return "No passes found.";
    }
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabsScroll, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.tabsContent}
      >
        {visibleTabs.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.tab,
              activeTab === key && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            onPress={() => setActiveTab(key)}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === key ? colors.primary : colors.textMuted },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {error && data ? (
          <View style={[styles.errorBanner, { backgroundColor: colors.error + "20" }]}>
            <Text style={[styles.errorBannerText, { color: colors.error }]}>{error}</Text>
          </View>
        ) : null}

        {filteredPasses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>{getEmptyMessage()}</Text>
          </View>
        ) : (
          <>
            {eventPasses.length > 0 ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Events</Text>
                {eventPasses.map(renderPassCard)}
              </>
            ) : null}
            {accessPasses.length > 0 ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>
                  Access & Memberships
                </Text>
                {accessPasses.map(renderPassCard)}
              </>
            ) : null}
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
  tabsScroll: {
    maxHeight: 52,
    borderBottomWidth: 1,
  },
  tabsContent: {
    paddingHorizontal: 8,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  errorBanner: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
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
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
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
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
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
