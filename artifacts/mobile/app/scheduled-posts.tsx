import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { api } from "@/utils/api";
import { ScreenTransition, FadeSlide, AnimatedListItem } from "@/components/Animations";

interface ScheduledPost {
  id: number;
  content: string;
  imageUrl: string | null;
  videoUrl: string | null;
  scheduledAt: string;
  expiresAt: string;
  createdAt: string;
}

function formatSchedule(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (days === 0) return `Today at ${timeStr}`;
  if (days === 1) return `Tomorrow at ${timeStr}`;
  if (days === 2) return `Day after tomorrow at ${timeStr}`;
  if (days < 7) return `${date.toLocaleDateString([], { weekday: "long" })} at ${timeStr}`;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })} at ${timeStr}`;
}

function timeUntil(isoDate: string): string {
  const diff = new Date(isoDate).getTime() - Date.now();
  if (diff <= 0) return "Publishing soon…";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `In ${days} day${days !== 1 ? "s" : ""}`;
  }
  if (hours > 0) return `In ${hours}h ${minutes}m`;
  return `In ${minutes} minute${minutes !== 1 ? "s" : ""}`;
}

export default function ScheduledPostsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;

  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    setError(false);
    try {
      const data = await api.get<ScheduledPost[]>("/posts/scheduled");
      setPosts(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCancel = (postId: number) => {
    Alert.alert(
      "Cancel scheduled post",
      "This will permanently delete the scheduled post. You can write it again from the feed.",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/posts/${postId}`);
              setPosts((prev) => prev.filter((p) => p.id !== postId));
            } catch {
              Alert.alert("Error", "Failed to cancel post. Please try again.");
            }
          },
        },
      ],
    );
  };

  const styles = makeStyles(colors);

  const renderPost = ({ item, index }: { item: ScheduledPost; index: number }) => (
    <AnimatedListItem index={index}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.scheduleBadge}>
            <Feather name="clock" size={12} color={colors.green} />
            <Text style={[styles.scheduleBadgeText, { color: colors.green }]}>
              {formatSchedule(item.scheduledAt)}
            </Text>
          </View>
          <Text style={styles.countdown}>{timeUntil(item.scheduledAt)}</Text>
        </View>

        <Text style={styles.content} numberOfLines={4}>{item.content}</Text>

        {(item.imageUrl || item.videoUrl) && (
          <View style={styles.mediaRow}>
            {item.imageUrl && (
              <View style={styles.mediaBadge}>
                <Feather name="image" size={12} color={colors.textSecondary} />
                <Text style={styles.mediaBadgeText}>
                  {(() => {
                    try {
                      const parsed = JSON.parse(item.imageUrl!);
                      return Array.isArray(parsed) ? `${parsed.length} photos` : "1 photo";
                    } catch {
                      return "1 photo";
                    }
                  })()}
                </Text>
              </View>
            )}
            {item.videoUrl && (
              <View style={styles.mediaBadge}>
                <Feather name="video" size={12} color={colors.textSecondary} />
                <Text style={styles.mediaBadgeText}>Video</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.cardFooter}>
          <View style={styles.anonBadge}>
            <Feather name="eye-off" size={11} color={colors.textTertiary} />
            <Text style={styles.anonText}>Posted anonymously</Text>
          </View>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => handleCancel(item.id)}
          >
            <Feather name="trash-2" size={14} color="#FF3B30" />
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AnimatedListItem>
  );

  return (
    <ScreenTransition>
      <View style={[styles.container, { paddingTop: top }]}>
        <FadeSlide delay={0} from="top">
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Feather name="arrow-left" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scheduled posts</Text>
            <View style={{ width: 36 }} />
          </View>
        </FadeSlide>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.green} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Feather name="wifi-off" size={32} color={colors.textTertiary} />
            <Text style={styles.emptyText}>Failed to load</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.center}>
            <Feather name="clock" size={40} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No scheduled posts</Text>
            <Text style={styles.emptyText}>
              When you schedule a post, it'll appear here until it goes live.
            </Text>
            <TouchableOpacity style={styles.createBtn} onPress={() => router.replace("/feed")}>
              <Feather name="edit-2" size={15} color="#000" />
              <Text style={styles.createBtnText}>Create a post</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={posts}
            renderItem={renderPost}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => load(true)}
                tintColor={colors.green}
              />
            }
          />
        )}
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
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: { padding: 4 },
    headerTitle: {
      fontSize: 17,
      fontFamily: "JetBrainsMono_600SemiBold",
      color: colors.text,
    },
    list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, gap: 12 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      gap: 10,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    scheduleBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: colors.greenDim,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
    },
    scheduleBadgeText: {
      fontSize: 12,
      fontFamily: "JetBrainsMono_600SemiBold",
    },
    countdown: {
      fontSize: 12,
      fontFamily: "JetBrainsMono_400Regular",
      color: colors.textTertiary,
    },
    content: {
      fontSize: 15,
      fontFamily: "JetBrainsMono_400Regular",
      color: colors.text,
      lineHeight: 22,
    },
    mediaRow: {
      flexDirection: "row",
      gap: 8,
    },
    mediaBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.background,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    mediaBadgeText: {
      fontSize: 12,
      fontFamily: "JetBrainsMono_400Regular",
      color: colors.textSecondary,
    },
    cardFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    anonBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    anonText: {
      fontSize: 12,
      fontFamily: "JetBrainsMono_400Regular",
      color: colors.textTertiary,
    },
    cancelBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: "rgba(255,59,48,0.08)",
    },
    cancelBtnText: {
      fontSize: 13,
      fontFamily: "JetBrainsMono_500Medium",
      color: "#FF3B30",
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      gap: 12,
    },
    emptyTitle: {
      fontSize: 20,
      fontFamily: "JetBrainsMono_700Bold",
      color: colors.text,
    },
    emptyText: {
      fontSize: 15,
      fontFamily: "JetBrainsMono_400Regular",
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 22,
    },
    retryBtn: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      borderRadius: 12,
    },
    retryText: {
      fontSize: 15,
      fontFamily: "JetBrainsMono_500Medium",
      color: colors.text,
    },
    createBtn: {
      marginTop: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 24,
      paddingVertical: 13,
      backgroundColor: colors.green,
      borderRadius: 14,
    },
    createBtnText: {
      fontSize: 15,
      fontFamily: "JetBrainsMono_600SemiBold",
      color: "#000",
    },
  });
}
