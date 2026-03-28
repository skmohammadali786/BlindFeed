import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { api, ApiNotification } from "@/utils/api";
import { ScreenTransition, FadeSlide, AnimatedListItem } from "@/components/Animations";
import { timeAgo } from "@/utils/time";

function NotifIcon({ type }: { type: string }) {
  const { colors } = useTheme();
  const icon = type === "reply" ? "corner-down-right" : "message-circle";
  const bg = type === "reply" ? colors.surface : colors.greenDim;
  const color = type === "reply" ? colors.textSecondary : colors.green;
  return (
    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: bg, justifyContent: "center", alignItems: "center" }}>
      <Feather name={icon as any} size={18} color={color} />
    </View>
  );
}

function NotifCard({
  item,
  index,
  onRead,
}: {
  item: ApiNotification;
  index: number;
  onRead: (id: number, postId: number | null) => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <AnimatedListItem index={index}>
      <TouchableOpacity
        style={[styles.card, !item.isRead && styles.cardUnread]}
        onPress={() => onRead(item.id, item.postId)}
        activeOpacity={0.75}
      >
        <NotifIcon type={item.type} />
        <View style={styles.cardBody}>
          <Text style={styles.cardMessage}>{item.message}</Text>
          <Text style={styles.cardTime}>{timeAgo(new Date(item.createdAt).getTime())}</Text>
        </View>
        {!item.isRead && <View style={styles.unreadDot} />}
        <Feather name="chevron-right" size={16} color={colors.textTertiary} />
      </TouchableOpacity>
    </AnimatedListItem>
  );
}

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;

  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const data = await api.get<ApiNotification[]>("/notifications");
      setNotifications(data);
    } catch (_) {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRead = useCallback(async (notifId: number, postId: number | null) => {
    setNotifications((prev) => prev.map((n) => n.id === notifId ? { ...n, isRead: true } : n));
    api.patch(`/notifications/${notifId}/read`, {}).catch(() => {});
    if (postId) {
      router.push(`/post/${postId}` as any);
    }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    api.patch("/notifications/read-all", {}).catch(() => {});
  }, []);

  const styles = makeStyles(colors);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <ScreenTransition>
      <View style={[styles.container, { paddingTop: top }]}>
        <FadeSlide delay={0} from="top">
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Feather name="arrow-left" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Activity</Text>
            {unreadCount > 0 ? (
              <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
                <Text style={styles.markAllText}>Mark all read</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 80 }} />
            )}
          </View>
        </FadeSlide>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.green} />
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.center}>
            <View style={styles.emptyIcon}>
              <Feather name="bell-off" size={32} color={colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No activity yet</Text>
            <Text style={styles.emptySubtitle}>
              When someone comments on your post or replies to your comment, you'll see it here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item, index }) => (
              <NotifCard item={item} index={index} onRead={handleRead} />
            )}
            contentContainerStyle={{ padding: 16, gap: 8 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => load(true)}
                tintColor={colors.green}
              />
            }
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              unreadCount > 0 ? (
                <FadeSlide delay={0}>
                  <View style={styles.unreadBanner}>
                    <Feather name="bell" size={14} color={colors.green} />
                    <Text style={styles.unreadBannerText}>{unreadCount} unread</Text>
                  </View>
                </FadeSlide>
              ) : null
            }
          />
        )}
      </View>
    </ScreenTransition>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: 17,
      fontFamily: "Inter_600SemiBold",
      color: colors.text,
    },
    markAllBtn: {
      width: 80,
      alignItems: "flex-end",
    },
    markAllText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.green,
    },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 40,
    },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 20,
    },
    emptyTitle: {
      fontSize: 20,
      fontFamily: "Inter_600SemiBold",
      color: colors.text,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
    },
    cardUnread: {
      borderWidth: 1,
      borderColor: colors.greenDim,
    },
    cardBody: {
      flex: 1,
      gap: 4,
    },
    cardMessage: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.text,
      lineHeight: 20,
    },
    cardTime: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.textTertiary,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.green,
    },
    unreadBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.greenDim,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 12,
    },
    unreadBannerText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.green,
    },
  });
}
