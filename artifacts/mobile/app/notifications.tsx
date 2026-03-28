import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
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
  let icon: string;
  let bg: string;
  let color: string;
  if (type === "reply") {
    icon = "corner-down-right"; bg = colors.surface; color = colors.textSecondary;
  } else if (type === "report_action") {
    icon = "alert-triangle"; bg = "rgba(255,59,48,0.12)"; color = "#FF3B30";
  } else if (type === "appeal_response") {
    icon = "shield"; bg = "rgba(99,102,241,0.12)"; color = "#6366F1";
  } else {
    icon = "message-circle"; bg = colors.greenDim; color = colors.green;
  }
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
  onAppeal,
}: {
  item: ApiNotification;
  index: number;
  onRead: (id: number, postId: number | null) => void;
  onAppeal: (reportId: number, notifId: number) => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const isReportAction = item.type === "report_action";

  return (
    <AnimatedListItem index={index}>
      <TouchableOpacity
        style={[styles.card, !item.isRead && styles.cardUnread, isReportAction && styles.cardReport]}
        onPress={() => onRead(item.id, item.postId)}
        activeOpacity={0.75}
      >
        <NotifIcon type={item.type} />
        <View style={styles.cardBody}>
          <Text style={styles.cardMessage}>{item.message}</Text>
          <Text style={styles.cardTime}>{timeAgo(new Date(item.createdAt).getTime())}</Text>
          {isReportAction && item.commentId && (
            <TouchableOpacity
              style={styles.appealBtn}
              onPress={(e) => { e.stopPropagation?.(); onAppeal(item.commentId!, item.id); }}
              activeOpacity={0.8}
            >
              <Feather name="message-square" size={13} color={colors.green} />
              <Text style={styles.appealBtnText}>Respond / Appeal</Text>
            </TouchableOpacity>
          )}
        </View>
        {!item.isRead && <View style={styles.unreadDot} />}
        {!isReportAction && <Feather name="chevron-right" size={16} color={colors.textTertiary} />}
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
  const [loadError, setLoadError] = useState(false);
  const [appealReportId, setAppealReportId] = useState<number | null>(null);
  const [appealNotifId, setAppealNotifId] = useState<number | null>(null);
  const [appealText, setAppealText] = useState("");
  const [appealSending, setAppealSending] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    setLoadError(false);
    try {
      const data = await api.get<ApiNotification[]>("/notifications");
      setNotifications(data);
    } catch (_) {
      if (!refresh) setLoadError(true);
    } finally {
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

  const handleOpenAppeal = useCallback((reportId: number, notifId: number) => {
    setAppealReportId(reportId);
    setAppealNotifId(notifId);
    setAppealText("");
  }, []);

  const handleSubmitAppeal = useCallback(async () => {
    if (!appealReportId || appealSending) return;
    const trimmed = appealText.trim();
    if (trimmed.length < 5) {
      Alert.alert("Too short", "Please explain your situation in at least a few words.");
      return;
    }
    setAppealSending(true);
    try {
      await api.post(`/reports/${appealReportId}/respond`, { response: trimmed });
      if (appealNotifId) {
        setNotifications((prev) => prev.map((n) => n.id === appealNotifId ? { ...n, isRead: true } : n));
        api.patch(`/notifications/${appealNotifId}/read`, {}).catch(() => {});
      }
      setAppealReportId(null);
      Alert.alert("Response sent", "Your response has been submitted. We'll review it shortly.");
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to send response.");
    } finally {
      setAppealSending(false);
    }
  }, [appealReportId, appealNotifId, appealText, appealSending]);

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
        ) : loadError ? (
          <View style={styles.center}>
            <View style={styles.emptyIcon}>
              <Feather name="wifi-off" size={32} color={colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>Couldn't load</Text>
            <Text style={styles.emptySubtitle}>Pull down to try again.</Text>
            <TouchableOpacity onPress={() => load()} style={{ marginTop: 16 }}>
              <Text style={{ color: colors.green, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>Retry</Text>
            </TouchableOpacity>
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
              <NotifCard item={item} index={index} onRead={handleRead} onAppeal={handleOpenAppeal} />
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

        {/* Appeal Modal */}
        <Modal
          visible={appealReportId !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setAppealReportId(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.appealModal}>
              <Text style={styles.appealTitle}>Respond / Appeal</Text>
              <Text style={styles.appealSub}>
                Explain your side of the story. Our team will review your response.
              </Text>
              <TextInput
                style={styles.appealInput}
                value={appealText}
                onChangeText={setAppealText}
                multiline
                maxLength={500}
                textAlignVertical="top"
                autoFocus
                placeholder="Explain why this action was a mistake or provide more context..."
                placeholderTextColor={colors.textTertiary}
              />
              <Text style={styles.appealCount}>{appealText.length}/500</Text>
              <View style={styles.appealActions}>
                <TouchableOpacity style={styles.appealCancelBtn} onPress={() => setAppealReportId(null)}>
                  <Text style={styles.appealCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.appealSendBtn, appealSending && { opacity: 0.6 }]}
                  onPress={handleSubmitAppeal}
                  disabled={appealSending}
                >
                  {appealSending ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.appealSendText}>Send response</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScreenTransition>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    backBtn: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: colors.surface, justifyContent: "center", alignItems: "center",
    },
    headerTitle: {
      flex: 1, textAlign: "center",
      fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.text,
    },
    markAllBtn: { width: 80, alignItems: "flex-end" },
    markAllText: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.green },
    center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
    emptyIcon: {
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: colors.surface, justifyContent: "center", alignItems: "center", marginBottom: 20,
    },
    emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold", color: colors.text, marginBottom: 8 },
    emptySubtitle: {
      fontSize: 14, fontFamily: "Inter_400Regular",
      color: colors.textSecondary, textAlign: "center", lineHeight: 20,
    },
    card: {
      flexDirection: "row", alignItems: "flex-start",
      gap: 12, backgroundColor: colors.surface, borderRadius: 14, padding: 14,
    },
    cardUnread: { borderLeftWidth: 3, borderLeftColor: colors.green },
    cardReport: { borderLeftWidth: 3, borderLeftColor: "#FF3B30" },
    cardBody: { flex: 1, gap: 3 },
    cardMessage: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.text, lineHeight: 20 },
    cardTime: { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.textTertiary },
    unreadDot: {
      width: 8, height: 8, borderRadius: 4,
      backgroundColor: colors.green, marginTop: 6,
    },
    unreadBanner: {
      flexDirection: "row", alignItems: "center", gap: 6,
      backgroundColor: colors.greenDim, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12,
    },
    unreadBannerText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.green },
    appealBtn: {
      flexDirection: "row", alignItems: "center", gap: 5,
      marginTop: 8, backgroundColor: colors.greenDim,
      borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
      alignSelf: "flex-start",
    },
    appealBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.green },
    modalOverlay: {
      flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end",
    },
    appealModal: {
      backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20,
      padding: 20, gap: 12, paddingBottom: 34,
    },
    appealTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.text },
    appealSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.textSecondary, lineHeight: 19 },
    appealInput: {
      backgroundColor: colors.surface, borderRadius: 12,
      padding: 14, fontSize: 14, fontFamily: "Inter_400Regular",
      color: colors.text, minHeight: 110, textAlignVertical: "top",
    },
    appealCount: { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.textTertiary, textAlign: "right" },
    appealActions: { flexDirection: "row", gap: 10 },
    appealCancelBtn: {
      flex: 1, borderRadius: 14, paddingVertical: 14,
      backgroundColor: colors.surface, alignItems: "center",
    },
    appealCancelText: { fontSize: 15, fontFamily: "Inter_500Medium", color: colors.textSecondary },
    appealSendBtn: {
      flex: 2, borderRadius: 14, paddingVertical: 14,
      backgroundColor: colors.green, alignItems: "center",
    },
    appealSendText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#000" },
  });
}
