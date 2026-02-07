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
import { getNotifications, markNotificationRead, Notification } from "../api/client";
import { stripHtml } from "../utils/html";

type Props = {
  navigation?: any;
};

export default function NotificationsScreen({ navigation }: Props) {
  const { token } = useAuth();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [markingRead, setMarkingRead] = useState<string | null>(null);

  const loadNotifications = async (includeRead: boolean = true) => {
    if (!token) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    try {
      setError("");
      const result = await getNotifications(token, includeRead);
      setNotifications(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load notifications";
      setError(msg);
      console.error("[NotificationsScreen] Error loading notifications:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [token]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleMarkAsRead = async (notificationId: string) => {
    if (!token || markingRead) return;

    setMarkingRead(notificationId);
    try {
      await markNotificationRead(token, notificationId);
      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to mark as read";
      Alert.alert("Error", msg);
      console.error("[NotificationsScreen] Error marking as read:", e);
    } finally {
      setMarkingRead(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "pass_approved":
        return "✓";
      case "pass_rejected":
        return "✗";
      case "access_request":
        return "🔔";
      case "pass_created":
        return "🎫";
      default:
        return "📢";
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error && notifications.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={() => loadNotifications()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {unreadCount > 0 && (
        <View style={[styles.header, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.headerText, { color: colors.text }]}>
            {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {error && notifications.length > 0 && (
          <View style={[styles.errorBanner, { backgroundColor: colors.error + "20" }]}>
            <Text style={[styles.errorBannerText, { color: colors.error }]}>{error}</Text>
          </View>
        )}

        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No notifications yet.
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
              You'll be notified about pass approvals and updates here.
            </Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <TouchableOpacity
              key={notification._id}
              style={[
                styles.notificationCard,
                {
                  backgroundColor: notification.isRead ? colors.card : colors.primary + "10",
                  borderColor: colors.border,
                  borderLeftWidth: notification.isRead ? 1 : 4,
                  borderLeftColor: notification.isRead ? colors.border : colors.primary,
                },
              ]}
              onPress={() => {
                if (!notification.isRead) {
                  handleMarkAsRead(notification._id);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={styles.notificationHeader}>
                <View style={styles.notificationIcon}>
                  <Text style={styles.iconText}>{getNotificationIcon(notification.type)}</Text>
                </View>
                <View style={styles.notificationContent}>
                  <Text style={[styles.notificationTitle, { color: colors.text }]}>
                    {notification.title}
                  </Text>
                  <Text style={[styles.notificationTime, { color: colors.textMuted }]}>
                    {formatDate(notification.createdAt)}
                  </Text>
                </View>
                {!notification.isRead && (
                  <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                )}
              </View>

              <Text style={[styles.notificationBody, { color: colors.textMuted }]} numberOfLines={3}>
                {stripHtml(notification.content)}
              </Text>

              {notification.eventDate && (
                <View style={styles.eventDateContainer}>
                  <Text style={[styles.eventDateLabel, { color: colors.textMuted }]}>Event Date:</Text>
                  <Text style={[styles.eventDate, { color: colors.text }]}>
                    {new Date(notification.eventDate).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </Text>
                </View>
              )}

              {!notification.isRead && (
                <TouchableOpacity
                  style={[styles.markReadButton, { backgroundColor: colors.primary }]}
                  onPress={() => handleMarkAsRead(notification._id)}
                  disabled={markingRead === notification._id}
                >
                  {markingRead === notification._id ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.markReadText}>Mark as Read</Text>
                  )}
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))
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
  header: {
    padding: 12,
    borderBottomWidth: 1,
  },
  headerText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
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
  notificationCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  notificationBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  eventDateContainer: {
    flexDirection: "row",
    marginTop: 8,
    marginBottom: 8,
  },
  eventDateLabel: {
    fontSize: 12,
    marginRight: 4,
  },
  eventDate: {
    fontSize: 12,
    fontWeight: "600",
  },
  markReadButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  markReadText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyState: {
    padding: 48,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
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
